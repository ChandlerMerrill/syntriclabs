# Proposal B — Managed Agent Bridge

> **Status:** Proposed route, not yet approved. Counterpart to Proposal A (local Agent SDK bot). After Chandler reviews both, pick one.

**Headline idea:** Keep the Telegram webhook on Vercel. Replace `handleChatGenerate` (Vercel AI SDK + Messages API + 41 in-repo tools) with a thin client that drives an Anthropic **Managed Agent** session. The agent is a persisted, versioned config on Anthropic's side — model, system prompt, tools, and MCP servers all live there. Supabase's **remote MCP server** (`https://mcp.supabase.com/mcp`) replaces the CRUD tool layer. Remaining specialist tools (document generation, Gmail send, the 2-step hard-delete confirm flow) stay in syntric-labs as **custom tools** — the agent emits `agent.custom_tool_use`, the bridge executes, and returns `user.custom_tool_result`.

Billing stays on the Anthropic API (same account as today). This proposal is not about cost — it's about architecture.

**File path for final proposal:** `plans/proposal-b-managed-agent-bridge.md` (adjacent to `proposal-a-local-agent-sdk-bot.md`).

---

# Telegram CRM Bot → Managed Agent Bridge (Vercel-hosted)

## Context

Current bot lives at `syntric-labs/src/app/api/telegram/webhook/route.ts` and runs through `src/lib/ai/handler.ts` → Vercel AI SDK → Anthropic Messages API with 41 in-repo tool definitions in `src/lib/ai/tools.ts`. Same three pains Proposal A enumerates:

1. **Repeat/confusion bug** (`webhook/route.ts:77-81`): history loads last 12 messages, drops the `tool_calls` jsonb column, model sees its own narration without structured tool_use/tool_result, re-calls tools.
2. **30K/min input rate limit**: 41 tool schemas + system prompt + 12-turn history against a tier-1 rate limit. Current mitigations (cache_control on system, 4K output cap, 12-turn window) work but are fragile.
3. **Debuggability**: Vercel logs truncate; no per-turn token/cost/cache telemetry.

Proposal A solves these by rebuilding the bot outside the repo on the Claude Agent SDK, getting Max-subscription billing as a side effect. Proposal B solves them a different way: **offload the agent runtime to Anthropic's managed agents service** and **replace most of the CRUD tool layer with Supabase's hosted MCP server**.

Goal: cleaner architecture, smaller tool surface, dramatically less code in syntric-labs, first-class session state managed by Anthropic (no tool_calls rehydration), built-in compaction (no 30K/min fragility), versioned agent config (iterate on prompts without breaking live sessions), vault-backed OAuth auto-refresh (solves the Gmail token concern).

What it does **not** solve: API billing continues. The Max subscription sits unused. If the #1 motivation is dollars, do Proposal A.

---

## Why this shape, not Proposal A

| Concern                                  | Proposal A (Local Agent SDK)                            | Proposal B (Managed Agent Bridge)                         |
| ---------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| Billing                                  | **Max subscription** (documented gray area, R1)         | Anthropic API (same as today)                             |
| Availability                             | Mac must be awake + `caffeinate` + cloudflared tunnel   | Vercel (always-on, same as today)                         |
| Where the agent loop runs                | Your Mac (Node process)                                 | Anthropic orchestration layer (hosted)                    |
| Tool definitions                         | 41 ported tool functions in new `syntric-bot` repo       | 5–8 custom tools in syntric-labs + Supabase MCP           |
| CRM CRUD (clients/deals/etc)             | Ported verbatim, wrapped with `withMcpAdapter`          | **Removed.** Supabase MCP server exposes SQL + table ops  |
| Session/history bug fix                  | SDK `resume: sessionId` (unverified across restarts)    | Server-managed sessions (Anthropic's state)               |
| Rate-limit fragility                     | Node process controls prompt; still tunable             | Built-in context compaction on 4.7 — fragility goes away  |
| Observability                            | Build your own turn-usage logger                        | `span.model_request_end` events carry `model_usage`       |
| OAuth token revocation risk              | R1: possible for `~/.claude/` creds                     | None (API key)                                            |
| Gmail token refresh                      | Run refresh yourself / call Vercel endpoint             | Put OAuth in a vault — Anthropic auto-refreshes           |
| SDK-version churn risk                   | R3: Agent SDK option names evolve                       | Managed Agents is beta — same risk (see R-B3 below)       |
| Roll-forward plan if it fails            | 30-sec webhook swap back to Vercel                      | Revert one git commit on Vercel                           |
| Code footprint in syntric-labs           | Largely removed                                         | Shrinks (tools.ts, handler.ts, webhook mostly gone)       |
| Time investment                          | 12–17 hours                                             | 8–12 hours (estimate — see Timeline)                      |

**Pick Proposal A if:** the Max-subscription economics are the whole point.
**Pick Proposal B if:** better architecture matters more than dollars and you want to stop paying the 41-schema tax forever.

---

## Risk framing

### R-B1. Managed Agents is beta

Header: `managed-agents-2026-04-01`. The SDK sets it automatically. API surfaces may change before GA — agent/session create shapes, event types, vault credential format. Mitigation: pin `@anthropic-ai/sdk` to the version verified during implementation; the Vercel route is one file and easy to update.

### R-B2. Supabase MCP is OAuth-based

Dynamic client registration. First-time setup requires a browser flow to mint an access + refresh token. Once in a vault, Anthropic handles refresh. But if Supabase rotates their OAuth config or the refresh fails, the agent loses DB access until the vault credential is re-minted. Mitigation: document the re-mint runbook; the fallback SQL path (custom tool on Vercel) can be re-enabled in one deploy.

### R-B3. Custom tool secrets stay host-side

Vaults currently hold **MCP credentials only** — they're not exposed to the container's shell and there's no way to set container env vars. Any API call needing a non-MCP secret (Gmail API, Perplexity for search, OpenAI for embeddings) must run as a **custom tool on Vercel**, where the secret already lives in `process.env`. This is fine and intentional — it's the recommended pattern (`managed-agents-client-patterns.md` Pattern 9). Just budget for it: ~5–8 tools stay as Vercel functions.

### R-B4. Scope creep: Supabase MCP surface ≠ exactly the 41 current tools

Supabase MCP exposes table operations (`list_tables`, `execute_sql`, `apply_migration`, branch management, logs) — a superset of what our CRUD tools do, but the shape is different. The agent will issue `execute_sql` calls instead of `createDeal`/`updateDealStage`/etc. This means:

- No more per-tool validation (e.g. `updateDealStage` currently validates the stage enum). The agent writes SQL; trust Postgres constraints + RLS.
- No more tool-level audit (`ai_actions` rows). We lose that for MCP-executed calls unless we add DB triggers.
- The existing `withAIAudit` wrapper, `reversal_hint` capture, and admin `/admin/ai-actions` view only cover custom tools that stay on Vercel.

**This is a real tradeoff.** If observability of every single CRM mutation matters more than simplicity, keep more tools as custom tools (route writes through Vercel) and use Supabase MCP only for reads. Decision point in Phase 2.

### R-B5. Session state cost

Each Telegram message opens/resumes a Managed Agent session. Sessions are billed as normal API token usage — no extra flat fee — but the container exists for the session's life and model inference draws from org TPM limits. Document turns stream through `sessions.events.stream()`, a long-lived SSE connection — fine on Vercel with the current `maxDuration = 60`, but if agent turns regularly exceed 60s, bump `maxDuration` (Pro plan allows up to 300s) or move the bridge to a background worker pattern.

---

## Architecture

```
┌───────────────────────────────┐           ┌──────────────────────────────────────┐
│  Telegram                     │──HTTPS───▶│  syntric-labs on Vercel              │
│  (user sends message)         │           │                                      │
└───────────────────────────────┘           │  /api/telegram/webhook               │
                                            │    • auth + dedupe                   │
                                            │    • open SSE to managed session     │
                                            │    • relay custom_tool_use events    │
                                            │    • send finalized text to Telegram │
                                            │                                      │
                                            │  /api/tools/* (custom tools)         │
                                            │    • generateDocument (Puppeteer)    │
                                            │    • sendEmail (Gmail API)           │
                                            │    • semanticSearch (OpenAI)         │
                                            │    • hardDeleteClient (2-step)       │
                                            │    • confirmPending                  │
                                            └──────────────┬───────────────────────┘
                                                           │
                        ┌──────────────────────────────────┼───────────────────────┐
                        │                                  │                       │
             ┌──────────▼─────────────┐  ┌────────────────▼─────────┐  ┌──────────▼──────────┐
             │  Anthropic Managed     │  │  Supabase Remote MCP     │  │  Shared Supabase    │
             │  Agents orchestration  │  │  https://mcp.supabase.com│  │  (data plane)       │
             │                        │  │    /mcp?project_ref=...  │  │                     │
             │  • Agent:              │  │                          │  │  • clients,         │
             │    syntric-crm-telegram│◀─┤  • OAuth (vault)         │◀─┤    deals, contacts, │
             │  • Container per       │  │  • execute_sql, list_*   │  │    messages,        │
             │    session             │  │  • RLS enforced          │  │    ai_actions, ...  │
             │  • Auto-compaction     │  │                          │  │                     │
             └────────────────────────┘  └──────────────────────────┘  └─────────────────────┘
```

Runtime flow (one Telegram turn):

1. Telegram POSTs to `/api/telegram/webhook`.
2. Bridge auth-checks, loads or creates a conversation row, looks up `agent_session_id` in `conversations.metadata`.
3. If no session exists: `sessions.create({ agent, environment_id, vault_ids })` — stores new session ID.
4. Bridge opens SSE stream and concurrently sends `user.message`.
5. For each event:
   - `agent.message` → accumulate text.
   - `agent.custom_tool_use` → execute locally against `/api/tools/<name>`, send `user.custom_tool_result`.
   - `agent.mcp_tool_use` / `agent.mcp_tool_result` → log to `ai_actions` (if observability desired).
   - `session.status_idle` with `stop_reason.type !== 'requires_action'` → break.
6. Bridge sends accumulated text to Telegram via `sendLongTelegramMessage`.
7. Returns 200 to Telegram.

---

## Phase 0: Archive current state (5 min)

Same as Proposal A — create `archive/pre-managed-agents-migration` and push. Vercel doesn't auto-deploy non-production branches, so no accidental prod changes.

---

## Phase 1: Create Supabase MCP vault + test access (30 min)

One-time setup, done before any code changes.

1. Go through Supabase's MCP OAuth flow to mint an access + refresh token scoped to the syntric-labs project. Use the `project_ref` query param to lock the MCP to that one project: `https://mcp.supabase.com/mcp?project_ref=<project-ref>`.
2. Create a vault:
   ```ts
   const vault = await client.beta.vaults.create({ name: 'syntric-supabase-mcp' })
   ```
3. Create a credential inside it:
   ```ts
   await client.beta.vaults.credentials.create(vault.id, {
     display_name: 'Supabase MCP',
     auth: {
       type: 'mcp_oauth',
       mcp_server_url: 'https://mcp.supabase.com/mcp?project_ref=<ref>',
       access_token: '<from OAuth flow>',
       expires_at: '<ISO>',
       refresh: {
         refresh_token: '<from OAuth flow>',
         client_id: '<our OAuth client_id>',
         token_endpoint: '<Supabase refresh endpoint>',
         token_endpoint_auth: { type: 'none' },
       },
     },
   })
   ```
4. Persist `vault.id` in Vercel env as `ANTHROPIC_SUPABASE_VAULT_ID`.
5. Smoke test: create a throwaway agent + session with only the Supabase MCP, send `"list 5 recent deals"`, verify `agent.mcp_tool_result` comes back with real rows.

**If this step fails**, the whole proposal is unworkable — stop here and revisit.

**Observation**: vault credential creation happens through the Anthropic SDK, not a UI. Script it once, commit the script (minus secrets) to `scripts/setup-managed-agent.ts`.

---

## Phase 2: Decide the custom-tool surface (1 hr)

Walk through the current 41 tools in `src/lib/ai/tools.ts` and categorize:

**A. Delete entirely — Supabase MCP does it.**
- `getClientInfo`, `listClients`, `listDeals`, `getDealInfo`, `listProjects`, `getProjectInfo`, `getClientActivities` → all become `execute_sql` or `list_tables` calls through MCP.
- `createClient`, `updateClient`, `archiveClient`, `createDeal`, `updateDeal`, `updateDealStage`, `archiveDeal`, `createContact`, `updateContact`, `createProject`, `updateProject`, `updateProjectStatus`, `createLead`, `updateLead`, `convertLeadToClient`, `dismissLead`, `addActivity`, `logFollowUp` → all MCP `execute_sql`.
- `querySql`, `describeSchema`, `writeSql` → redundant; MCP exposes these natively.

**B. Keep as custom tools on Vercel — need host-side secrets or non-SQL logic.**
- `generateDocument`, `generateCustomDocument`, `sendDocumentToClient`, `updateDocumentStatus` — Puppeteer renderer lives in `src/app/api/documents/generate/route.ts`. Stay local.
- `sendEmail`, `searchEmails`, `getEmailThread` — Gmail OAuth. Stay local.
- `semanticSearch` — OpenAI embeddings API. Stay local.
- `searchTranscripts`, `getTranscriptDetail` — involve custom join + embeddings logic beyond simple SQL. Stay local (or port to pure SQL later).
- `hardDeleteClient`, `hardDeleteContact`, `hardDeleteLead` — 2-step confirm flow via `pending_actions` table. Stay local; MCP shouldn't expose destructive hard-delete directly.

**C. Deferred (already deferred in Proposal A).**
- `undo` — still triggered from `/admin` UI, not through the agent.

**Net result**: from ~41 tools to **~5–8 custom tools** + Supabase MCP. Most of `src/lib/ai/tools.ts` can be deleted.

**Decision point (R-B4 tradeoff)**: if observability of every CRM write matters, route CRM writes through a thin `execute_crm_write` custom tool that wraps `withAIAudit` and then calls MCP internally — you keep `ai_actions` rows. If simplicity wins, let MCP execute writes directly and lose that audit trail. Default: direct MCP writes, backstopped by Supabase's own `audit_log_entries` table if needed.

---

## Phase 3: Create the agent (one-time setup script, 1 hr)

`scripts/setup-managed-agent.ts` — run once locally, persists the IDs.

```ts
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from '../src/lib/ai/system-prompt'

const client = new Anthropic()

// 1. Environment (reusable across agents)
const env = await client.beta.environments.create({
  name: 'syntric-crm-env',
  config: {
    type: 'cloud',
    networking: { type: 'unrestricted' },
  },
})

// 2. Agent — model, system, tools, MCP all live here
const agent = await client.beta.agents.create({
  name: 'syntric-crm-telegram',
  model: 'claude-opus-4-7',               // or 'claude-sonnet-4-6' — A/B during Phase 5
  system: buildSystemPrompt({}, 'telegram'),
  mcp_servers: [
    {
      type: 'url',
      name: 'supabase',
      url: `https://mcp.supabase.com/mcp?project_ref=${process.env.SUPABASE_PROJECT_REF}`,
    },
  ],
  tools: [
    { type: 'mcp_toolset', mcp_server_name: 'supabase' },
    // Custom tools (their Vercel handlers live in /api/tools/*)
    {
      type: 'custom',
      name: 'generate_document',
      description: 'Generate a PDF proposal, SOW, or invoice from markdown + metadata. Returns storage_path + signed URL.',
      input_schema: { /* schema from existing generateDocument */ },
    },
    {
      type: 'custom',
      name: 'generate_custom_document',
      description: '...',
      input_schema: { /* ... */ },
    },
    {
      type: 'custom',
      name: 'send_email',
      description: 'Send an email via the user\'s connected Gmail account.',
      input_schema: { /* ... */ },
    },
    {
      type: 'custom',
      name: 'semantic_search',
      description: 'Vector search across messages, transcripts, and documents.',
      input_schema: { /* ... */ },
    },
    {
      type: 'custom',
      name: 'hard_delete_client',
      description: 'Permanently delete a client. Two-step confirm.',
      input_schema: { /* ... */ },
    },
    // ... ~3 more
  ],
})

console.log('ENV_ID:', env.id)
console.log('AGENT_ID:', agent.id)
console.log('AGENT_VERSION:', agent.version)
```

Store `ANTHROPIC_ENV_ID`, `ANTHROPIC_AGENT_ID`, and `ANTHROPIC_AGENT_VERSION` in Vercel env.

**Iteration**: every time you tweak the system prompt or tool schema, re-run a *narrow* update script: `client.beta.agents.update(agentId, { system: newPrompt })`. Each update bumps the version. Sessions pin to whatever version they reference — existing chats keep their old prompt, new chats get the new one. Never call `agents.create()` again.

---

## Phase 4: Rewrite `/api/telegram/webhook/route.ts` (2–3 hrs)

Replaces the current 150-line webhook + `handleChatGenerate` call. Target shape:

```ts
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateConversation, addMessage } from '@/lib/services/messages'
import { runCustomTool } from '@/lib/managed-agent/custom-tools'
import {
  sendLongTelegramMessage,
  sendTelegramMessage,
  sendTelegramChatAction,
  sendTelegramDocument,
  markdownToTelegramHTML,
} from '@/lib/telegram'

export const maxDuration = 60          // bump to 300 if turns regularly exceed 60s (Pro plan)

const client = new Anthropic()
const AGENT_ID = process.env.ANTHROPIC_AGENT_ID!
const AGENT_VERSION = Number(process.env.ANTHROPIC_AGENT_VERSION!)
const ENV_ID = process.env.ANTHROPIC_ENV_ID!
const VAULT_ID = process.env.ANTHROPIC_SUPABASE_VAULT_ID!

export async function POST(req: Request) {
  // (auth checks, /start, /reset — unchanged from current webhook)

  const supabase = await createServiceClient()
  const conversation = await getOrCreateConversation(supabase, 'telegram', chatId)
  await addMessage(supabase, conversation.id, { role: 'user', content: userText })

  // Resume or create session
  const { data: convRow } = await supabase
    .from('conversations').select('metadata').eq('id', conversation.id).single()
  let sessionId = (convRow?.metadata as any)?.agent_session_id as string | undefined

  if (!sessionId) {
    const session = await client.beta.sessions.create({
      agent: { type: 'agent', id: AGENT_ID, version: AGENT_VERSION },
      environment_id: ENV_ID,
      vault_ids: [VAULT_ID],
      title: `telegram-${chatId}`,
      metadata: { conversation_id: conversation.id, channel: 'telegram' },
    })
    sessionId = session.id
    await supabase
      .from('conversations')
      .update({ metadata: { ...(convRow?.metadata ?? {}), agent_session_id: sessionId } })
      .eq('id', conversation.id)
  }

  await sendTelegramChatAction(chatId, 'typing')

  // Stream-first: open stream before sending event (managed-agents-events.md Pattern 7)
  const stream = await client.beta.sessions.events.stream(sessionId!)
  await client.beta.sessions.events.send(sessionId!, {
    events: [{ type: 'user.message', content: [{ type: 'text', text: userText }] }],
  })

  let finalText = ''
  const generatedDocs: Array<{ documentId: string }> = []

  for await (const event of stream) {
    if (event.type === 'agent.message') {
      for (const block of event.content) {
        if (block.type === 'text') finalText += block.text
      }
    }

    if (event.type === 'agent.custom_tool_use') {
      const result = await runCustomTool(event.name, event.input, {
        conversationId: conversation.id,
        channel: 'telegram',
      })
      if (event.name === 'generate_document' && (result as any)?.document?.id) {
        generatedDocs.push({ documentId: (result as any).document.id })
      }
      await client.beta.sessions.events.send(sessionId!, {
        events: [{
          type: 'user.custom_tool_result',
          custom_tool_use_id: event.id,
          content: [{ type: 'text', text: JSON.stringify(result) }],
          is_error: typeof result === 'object' && result !== null && 'error' in result,
        }],
      })
    }

    if (event.type === 'session.status_terminated') break
    if (event.type === 'session.status_idle') {
      if (event.stop_reason.type === 'requires_action') continue   // waiting on us — handled above
      break
    }
  }

  // Persist assistant message for admin view / local history
  await addMessage(supabase, conversation.id, { role: 'assistant', content: finalText })

  // Ship generated docs
  for (const doc of generatedDocs) {
    const { data: row } = await supabase
      .from('documents').select('storage_path, title').eq('id', doc.documentId).single()
    if (row?.storage_path) {
      const { data: signed } = await supabase.storage
        .from('documents').createSignedUrl(row.storage_path, 3600)
      if (signed?.signedUrl) {
        await sendTelegramChatAction(chatId, 'upload_document')
        await sendTelegramDocument(chatId, signed.signedUrl, row.title)
      }
    }
  }

  if (finalText) {
    await sendLongTelegramMessage(chatId, markdownToTelegramHTML(finalText))
  }

  return NextResponse.json({ ok: true })
}
```

**Session-idle break gate** (`managed-agents-client-patterns.md` Pattern 5) is critical — don't break on bare `session.status_idle`; that fires transiently when the agent is waiting on a custom tool result.

**Stream-first ordering** (Pattern 7) matters — opening the stream before sending guarantees you catch the first `session.status_running` transition.

---

## Phase 5: Custom tool dispatcher (`src/lib/managed-agent/custom-tools.ts`, 2–3 hrs)

Thin dispatch layer. Existing per-tool logic ports over mostly unchanged — you already have the implementations; the shape changes from "Vercel AI SDK tool" to "function called by name".

```ts
import { withAIAudit } from '@/lib/ai/audit'
import { generateDocument, generateCustomDocument, sendDocumentToClient } from '@/lib/documents'
import { sendEmail, searchEmails, getEmailThread } from '@/lib/email'
import { semanticSearch } from '@/lib/search'
import { hardDeleteClient, hardDeleteContact, hardDeleteLead, confirmPending } from '@/lib/hard-delete'

type Ctx = { conversationId: string; channel: 'telegram' | 'admin' | 'playground' }

const handlers: Record<string, (input: unknown, ctx: Ctx) => Promise<unknown>> = {
  generate_document:        withAIAudit('generate_document',       {}, generateDocument),
  generate_custom_document: withAIAudit('generate_custom_document', {}, generateCustomDocument),
  send_document_to_client:  withAIAudit('send_document_to_client', {}, sendDocumentToClient),
  send_email:               withAIAudit('send_email',              {}, sendEmail),
  search_emails:            withAIAudit('search_emails',           {}, searchEmails),
  get_email_thread:         withAIAudit('get_email_thread',        {}, getEmailThread),
  semantic_search:          withAIAudit('semantic_search',         {}, semanticSearch),
  hard_delete_client:       withAIAudit('hard_delete_client',      {}, hardDeleteClient),
  hard_delete_contact:      withAIAudit('hard_delete_contact',     {}, hardDeleteContact),
  hard_delete_lead:         withAIAudit('hard_delete_lead',        {}, hardDeleteLead),
  confirm_pending:          withAIAudit('confirm_pending',         {}, confirmPending),
}

export async function runCustomTool(name: string, input: unknown, ctx: Ctx): Promise<unknown> {
  const fn = handlers[name]
  if (!fn) return { error: `Unknown tool: ${name}` }
  try {
    return await fn(input as never, ctx as never)
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}
```

**`withAIAudit` needs a small adapter** since it currently pulls `experimental_context` off the AI SDK — factor out an `AsyncLocalStorage` context (same idea as Proposal A §3d) or pass context as an explicit second arg. Same fix, smaller blast radius.

---

## Phase 6: Delete dead code (30 min)

After Phase 4 is deployed and Phase 7 verifies it works:

- Delete `src/lib/ai/handler.ts` (Vercel AI SDK call path — fully replaced).
- Delete the tool definitions in `src/lib/ai/tools.ts` that are now covered by MCP (category A from Phase 2). Keep only the ~8 that stayed as custom tools, and refactor them into plain async functions (no AI SDK `tool()` wrapper).
- Delete `src/lib/ai/sql-safety.ts` and `src/lib/ai/sql-client.ts` — MCP handles SQL.
- Keep `src/lib/ai/audit.ts`, `src/lib/ai/confirm-tokens.ts`, `src/lib/ai/system-prompt.ts`, `src/lib/ai/embeddings.ts`, `src/lib/ai/undo.ts` (still used by `/admin/ai-chat`).
- Keep `src/lib/ai/widget-tools.ts` + `widget-system-prompt.ts` if the widget still runs through the current Messages API path. Migrating the widget is out of scope for this proposal — revisit after Telegram is stable.

Target: ~70% line reduction in `src/lib/ai/`.

---

## Phase 7: Validation (1 hr)

### 7a. Repeat-bug regression test (THE SAME test as Proposal A, 8b)

```
You: "Create a test deal for Acme Corp at $5000 value."
Bot: "Created deal DEAL-123..."
You: "What deals did we just make?"
Bot: references DEAL-123 without re-calling createDeal.
```

Supabase `deals` table shows **one** row, not two. This should pass automatically — Managed Agent sessions track tool_use/tool_result pairs internally, no history-dropping bug to manufacture.

### 7b. Batch delete cost comparison

Run "remove all duplicate clients". Check:
- Anthropic Console: tokens consumed, cache hit rate.
- `ai_actions` rows: custom tools logged; MCP calls not logged by default (acceptable per Phase 2 decision).
- Admin `/admin/ai-actions`: custom tool calls appear; MCP calls show as gaps.

### 7c. Document generation path

"Generate a proposal for Acme Corp for $5000 website project."

Expected:
- `agent.custom_tool_use` for `generate_document` fires.
- Bridge executes `generateDocument` against Vercel storage, sends `user.custom_tool_result` with document ID + title.
- Bridge polls Supabase for `storage_path`, signs URL, uploads to Telegram as a document.

### 7d. Session-persistence test

Send 3 Telegram messages across 10 minutes. Verify:
- `conversations.metadata.agent_session_id` is stable.
- Second and third turns reference the same session ID.
- Agent remembers context from turn 1 without any message-rehydration code on our side.

### 7e. Session rate-limit + long-turn test

Send a message that triggers 15+ MCP tool calls (e.g. "summarize every deal under $10K"). Verify:
- No 429s.
- Response under 60s (or bump `maxDuration`).
- `span.model_request_end` events show cache hits on the system prompt.

### 7f. Context compaction smoke test

Let a single session accumulate ~80K tokens of history. Verify an `agent.thread_context_compacted` event fires and the next turn still responds coherently.

### 7g. Vault refresh sanity

After 1 hr, verify the agent still executes MCP calls — this confirms Anthropic auto-refreshed the Supabase access token via the vault's `refresh_token`.

---

## Phase 8: Rollback procedure

If the Managed Agents path breaks after cutover:

1. Revert the single commit that replaced `webhook/route.ts`. Vercel redeploys in ~30 seconds.
2. Archive the managed-agents code under a feature flag if the break is recoverable (`USE_MANAGED_AGENT=0`).
3. Debug offline. Vault + agent ID + env ID all persist untouched.

If the Supabase MCP specifically is the problem (e.g. OAuth revocation):
- Re-add the deleted Supabase CRUD tools as custom tools **on the agent**. `agents.update()` to add them. Existing sessions migrate on their next turn.
- Or cut back to the Vercel AI SDK path entirely via the commit revert.

---

## Critical files

### In syntric-labs — primary changes
- `src/app/api/telegram/webhook/route.ts` — **rewritten** (Phase 4)
- `src/lib/managed-agent/custom-tools.ts` — **new** (Phase 5)
- `src/lib/ai/handler.ts` — **deleted** (Phase 6)
- `src/lib/ai/tools.ts` — **heavily reduced** (Phase 6)
- `src/lib/ai/sql-safety.ts`, `sql-client.ts` — **deleted** (Phase 6)

### In syntric-labs — unchanged but reused
- `src/lib/telegram.ts` — webhook uses all its helpers
- `src/lib/services/messages.ts` — still persists user/assistant messages for local history
- `src/lib/ai/audit.ts` — `withAIAudit` wraps custom tools; `extractClientId` still used
- `src/lib/ai/confirm-tokens.ts` — `hardDeleteClient` 2-step flow unchanged
- `src/lib/ai/system-prompt.ts` — rendered once into `agents.create()` at setup
- `src/lib/ai/embeddings.ts` — consumed by `semantic_search` custom tool
- `src/app/api/documents/generate/route.ts` — still where Puppeteer lives

### New scripts (one-time)
- `scripts/setup-managed-agent.ts` — Phase 1 + 3 one-shot setup
- `scripts/update-agent-system-prompt.ts` — convenience for prompt iteration (bumps version)

### Supabase (no schema changes needed)
- `conversations.metadata` jsonb — stores `agent_session_id`
- `messages` table — still written by the bridge for local history and admin view
- `ai_actions` table — populated only by custom tools, not MCP calls (per Phase 2 decision)
- `pending_actions` table — unchanged (hard-delete confirm flow intact)

### Environment vars (new)
- `ANTHROPIC_AGENT_ID`
- `ANTHROPIC_AGENT_VERSION`
- `ANTHROPIC_ENV_ID`
- `ANTHROPIC_SUPABASE_VAULT_ID`
- `SUPABASE_PROJECT_REF` (for the MCP URL query param)

---

## Open questions (verify during implementation)

1. **Does the Supabase remote MCP enforce RLS for us automatically, or does the OAuth token map to a specific role?** The credential likely runs as a specific Postgres role — confirm it has write access to exactly what we need and nothing more. Bad answer: a root/service-role token that could `truncate messages`. If that's the only option, wrap writes behind a custom tool instead.
2. **Agent version update flow in practice.** Every `agents.update()` bumps the version — but the webhook reads the version from env. If we update the agent, do we also need to redeploy Vercel with the new version? Or can we pin at "latest" by passing the string shorthand `agent: AGENT_ID`? The docs say yes — confirm the exact behavior during testing. Likely answer: use string shorthand so new sessions always pick up the latest, and let existing sessions drift with their pinned version.
3. **Custom tool result size limits.** Some tools return large payloads (e.g. `searchEmails` across 30 threads). Is there a practical cap on `user.custom_tool_result` content bytes? If yes, paginate or return IDs + a separate "fetch" tool.
4. **`system` prompt length.** Our current prompt is ~2.7K tokens. Agents accept up to 100K chars in `system` — no issue, but worth confirming the prompt caches across sessions (it should — it's part of the versioned agent config).
5. **MCP tool naming in the stream.** Events for MCP calls come as `agent.mcp_tool_use` with the MCP server name; the specific tool name is in the event. Confirm whether we can log these to `ai_actions` by subscribing to `agent.mcp_tool_result` — if so, observability tradeoff in R-B4 shrinks.
6. **Rate-limit pool.** Token usage during a managed agent session still draws from the org's normal Messages API TPM/ITPM — *not* a separate Managed Agents pool. Confirm whether tier-1 limits are still the bottleneck for heavy sessions.
7. **Widget path coexistence.** `/admin/ai-chat` and the RelevanceAI widget still use the existing handler + tools. Leaving them alone is fine; the widget is a separate surface. But re-examine in a follow-up after Telegram proves out.

---

## Timeline

- Phase 0: 5 min
- Phase 1: 30 min (one-time Supabase OAuth + vault seed)
- Phase 2: 1 hr (tool categorization)
- Phase 3: 1 hr (setup script + run)
- Phase 4: 2–3 hr (webhook rewrite)
- Phase 5: 2–3 hr (custom tool dispatcher + audit adapter)
- Phase 6: 30 min (delete dead code)
- Phase 7: 1 hr (validation)

**Total: 8–12 hours.** ~30% faster than Proposal A because there's no new repo, no tunnel, no 41-tool port, no session-persistence uncertainty — only a thin bridge + custom-tool dispatcher.

---

## Summary matrix (Proposal A vs B, one more time)

| Dimension                      | Proposal A         | Proposal B                          |
| ------------------------------ | ------------------ | ----------------------------------- |
| Billing                        | Max sub (gray)     | API (same as today)                 |
| Availability                   | Mac-dependent      | Always-on (Vercel)                  |
| Code surface                   | New repo + 41 port | Single route + 8 custom tools       |
| Session state                  | Client-managed     | Server-managed                      |
| MCP                            | In-process SDK MCP | Hosted Supabase MCP                 |
| OAuth revocation risk          | Yes (R1)           | No                                  |
| Time to implement              | 12–17 hr           | 8–12 hr                             |
| Post-build ops burden          | Daemon on Mac      | Zero (standard Vercel deploy)       |
| Replaces repeat-bug            | ✓                  | ✓                                   |
| Addresses 30K/min fragility    | Partial            | Full (built-in compaction)          |
| Preserves admin `/ai-actions`  | ✓ (every tool)     | Partial (custom only, MCP opaque)   |
| Net: why would you pick it?    | Dollars / control  | Simplicity / alignment with API     |

Sources:
- [Announcing the Supabase Remote MCP Server](https://supabase.com/blog/remote-mcp-server)
- [Model context protocol (MCP) | Supabase Docs](https://supabase.com/docs/guides/getting-started/mcp)
