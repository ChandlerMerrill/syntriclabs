# Proposal A — Local Agent SDK Bot

> **Status:** Proposed route, not yet approved. A second proposal (Proposal B) will be written separately for comparison before either is executed.

**Headline idea:** Rebuild the Telegram CRM bot as a standalone Node project (`syntric-bot`) outside this repo, running locally on the Mac via Claude Agent SDK. Goal is to shift from per-token API billing on `syntriclabs.com` to Claude Max subscription billing. The Vercel-hosted bot stays live as an instant fallback. Archive branch preserves the pre-migration state for rollback.

---

# Telegram CRM Bot → Claude Agent SDK (Local-Only)

## Context

Current Telegram CRM bot lives inside `syntric-labs` (Next.js, Vercel). Webhook at `src/app/api/telegram/webhook/route.ts`. It uses Vercel AI SDK + Anthropic API with per-token billing. Three concrete pains:

1. **Cost**: ~$0.10/turn for a simple batch delete; $0.20 for doc generation. API-billed on Chandler's Anthropic account even though he has a Max subscription sitting unused.
2. **Repeat/confusion bug**: `webhook/route.ts:77-81` loads last 12 messages but drops the `tool_calls` jsonb column, so the model sees its own narration ("I added the deal") without the structured tool_use/tool_result proving it happened. Next turn, it re-calls the tool.
3. **Debuggability**: Vercel logs truncate; no per-turn token/cost/cache telemetry.

**Goal**: rebuild the Telegram bot as a standalone Node project (`syntric-bot`) running locally on Chandler's Mac via Claude Agent SDK. When the Mac is awake and the dev server is running, the bot works. Subscription-billed. 41 tools ported as an in-process MCP server.

syntric-labs stays live as-is. It keeps hosting the website, admin UI (`/admin/ai-actions`), widget, and shares the same Supabase backend with the new bot. The Vercel-hosted Telegram route stays intact as an instant fallback — swapping between old and new bot is a one-curl operation changing the Telegram webhook URL.

---

## Risk framing (be honest about these up front)

### R1. Subscription auth is a documented gray area

**What the Agent SDK docs say (explicit):**
> "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK. Please use the API key authentication methods described in this document instead."

**What the community observes:** When `ANTHROPIC_API_KEY` is unset, the SDK falls back to stored Claude Code credentials in `~/.claude/`, using the Max subscription. This is how `claude` CLI works. Reddit threads confirm this pattern works for personal local use as of Apr 2026.

**How we handle it**: Phase 8 includes a billing smoke test — send 10 messages and check Anthropic Console → Usage. If API usage doesn't move, subscription auth is in effect. If it does, we know the SDK is falling back to API key (either a stray env var or the SDK changed) and can decide whether to accept the cost.

**Precedent for revocation**: OpenClaw users had OAuth tokens revoked in Nov 2025. If that happens to us, the Vercel fallback is live within 30 seconds.

### R2. Mac must be awake + dev server running

Bot only works when the Mac is on, the Node process is running, and the cloudflared tunnel is up. Acceptable per user preference — bot runs during working hours, not 24/7.

Palliative: `caffeinate -s npm run dev` prevents sleep during sessions. Stable subdomain via named Cloudflare tunnel (one-time 10-min setup) means Telegram webhook URL doesn't need re-updating each start.

### R3. Agent SDK is evolving

Option names and types may change between versions. Pin a specific version in `package.json` and verify every API reference during implementation against installed version's types — don't trust this plan's pseudocode verbatim.

---

## Architecture

```
                                  (archive branch preserved on GitHub)
                                                │
                                                ▼
┌───────────────────────────────┐     ┌─────────────────────────────┐
│  syntric-labs (Vercel)        │     │  syntric-bot (local Mac)    │
│                               │     │                             │
│  • Website, /admin, widget    │     │  • Hono HTTP server :3001   │
│  • Old Telegram webhook       │────►│  • Cloudflared tunnel       │
│    (fallback, unused)         │     │  • Agent SDK + MCP server   │
│                               │     │                             │
│  • Shares Supabase ───────────┼─────┼──► Shared Supabase project  │
│                               │     │    (messages, ai_actions,   │
│                               │     │     clients, deals, etc.)   │
└───────────────────────────────┘     └─────────────────────────────┘
         ▲                                     │
         │                                     │
         │  Telegram webhook URL points        │  Claude Agent SDK
         │  HERE or HERE (switchable)          │  (falls back to ~/.claude/
         │                                     │   credentials = Max sub)
         │                                     ▼
    ┌────┴──────────────────────────────────────────────┐
    │                  Telegram Bot API                  │
    └────────────────────────────────────────────────────┘
```

---

## Phase 0: Archive current state (5 minutes)

No code changes to syntric-labs main. Just create a snapshot branch for peace of mind.

```bash
cd "~/Desktop/Code Projects/syntric/Claude Workspaces/syntric-labs"
git checkout main
git pull origin main
git checkout -b archive/pre-agent-sdk-migration
git push -u origin archive/pre-agent-sdk-migration
git checkout main
```

**Do not delete this branch, ever.** It's the revert path when Phase 10 (clean up syntric-labs) happens later.

Verification: `git branch -r | grep archive` shows the pushed branch. Vercel doesn't auto-deploy new branches by default, so no accidental production changes.

---

## Phase 1: Project scaffold (1 hour)

Location: `~/Desktop/Code Projects/syntric/syntric-bot` (sibling to `Claude Workspaces/`, fully outside syntric-labs).

```bash
mkdir -p ~/Desktop/Code\ Projects/syntric/syntric-bot
cd ~/Desktop/Code\ Projects/syntric/syntric-bot
npm init -y
git init
```

**`package.json` (key fields):**

```json
{
  "name": "syntric-bot",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "tunnel": "cloudflared tunnel --url http://localhost:3001",
    "dev:full": "concurrently \"npm:dev\" \"npm:tunnel\"",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.2.0",
    "@supabase/supabase-js": "^2.45.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "hono": "^4.6.0",
    "@hono/node-server": "^1.12.0",
    "postgres": "^3.4.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "concurrently": "^9.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0"
  }
}
```

Pin Agent SDK to the version where `createSdkMcpServer` / `tool()` exist — confirm against `npm view @anthropic-ai/claude-agent-sdk versions` on day one.

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false
  },
  "include": ["src/**/*"]
}
```

**Directory layout:**
```
syntric-bot/
  src/
    index.ts                 # Hono app + route handlers
    bot.ts                   # runTurn(chatId, userText) — main agent invocation
    context.ts               # AsyncLocalStorage for audit context
    telegram.ts              # ported from syntric-labs/src/lib/telegram.ts
    messages.ts              # ported from syntric-labs/src/lib/services/messages.ts
    system-prompt.ts         # ported from syntric-labs/src/lib/ai/system-prompt.ts
    audit.ts                 # ported + adapted (AsyncLocalStorage instead of experimental_context)
    confirm-tokens.ts        # ported verbatim
    supabase.ts              # service client factory
    types.ts                 # shared types (Message, Conversation, MessageChannel)
    tools/
      mcp-server.ts          # createCrmServer() returning an SDK MCP server
      result-adapter.ts      # wrap existing return shapes → MCP {content: [...]}
      clients.ts             # createClient, updateClient, archiveClient, listClients, getClientInfo
      contacts.ts            # createContact, updateContact, hardDeleteContact
      deals.ts               # createDeal, updateDeal, updateDealStage, archiveDeal, listDeals, getDealInfo
      projects.ts            # createProject, updateProject, updateProjectStatus, listProjects, getProjectInfo
      leads.ts               # createLead, updateLead, convertLeadToClient, dismissLead, hardDeleteLead
      documents.ts           # generateDocument, generateCustomDocument, sendDocumentToClient, updateDocumentStatus
      email.ts               # sendEmail, searchEmails, getEmailThread
      activities.ts          # addActivity, logFollowUp, getClientActivities
      transcripts.ts         # searchTranscripts, getTranscriptDetail
      search.ts              # semanticSearch
      sql.ts                 # querySql, describeSchema, writeSql
      hard-delete.ts         # hardDeleteClient (the 2-step confirm flow)
  .env.example
  .gitignore
  package.json
  tsconfig.json
  README.md
```

**`.env.example`:**
```
# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_AUTHORIZED_USER_ID=

# Supabase (same project as syntric-labs)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Optional services
PERPLEXITY_API_KEY=
GMAIL_* (etc — check syntric-labs env for doc/email tool deps)

# Agent SDK auth
# Leave ANTHROPIC_API_KEY UNSET to use Claude Code credentials (Max sub).
# Set it only as an escape hatch if subscription fallback breaks.
# ANTHROPIC_API_KEY=
```

`.gitignore`: `node_modules/`, `dist/`, `.env`, `.env.local`.

Initial commit: `git commit -m "scaffold"`. Create private GitHub repo `syntric-bot`, push.

---

## Phase 2: Supabase client + shared types (30 min)

`src/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
```

**Note**: syntric-labs uses `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SECRET_KEY`. In the new repo, drop the `NEXT_PUBLIC_` prefix (not a client bundle). Either copy the .env values manually or use the same names — either works, just be consistent.

`src/types.ts`: copy `Conversation`, `Message`, `MessageChannel`, `MessageRole` type aliases from syntric-labs (likely in `src/lib/services/messages.ts` or a types file). If Supabase types were generated via CLI, regenerate here: `npx supabase gen types typescript --project-id <id> > src/database.types.ts`.

---

## Phase 3: Port utility layer (2–3 hours)

### 3a. `src/telegram.ts` — direct copy, no changes

Port from `syntric-labs/src/lib/telegram.ts`. All functions are plain `fetch()` — no Next.js deps. Exports: `sendTelegramMessage`, `sendLongTelegramMessage`, `sendTelegramDocument`, `sendTelegramChatAction`, `markdownToTelegramHTML`, `setTelegramWebhook`.

Only change: `process.env.TELEGRAM_BOT_TOKEN!` still reads the same env var.

### 3b. `src/messages.ts` — direct copy

Port `getOrCreateConversation`, `addMessage`, `getMessages` from `syntric-labs/src/lib/services/messages.ts`. Accepts a `SupabaseClient` as first arg; no internal Next.js dependency.

Important: `addMessage` already accepts a `toolCalls` param that maps to the `tool_calls` jsonb column. `getMessages` already returns it via `.select('*')`. **No changes needed to these functions** — the repeat-bug fix happens in `bot.ts` by consuming `tool_calls` from the returned messages.

### 3c. `src/system-prompt.ts` — direct copy

Port `buildSystemPrompt` from `syntric-labs/src/lib/ai/system-prompt.ts` (~2.7K tokens, lines 12–167). Takes `context` and `channel` params; returns string. Includes `FOUNDER_PROMPT_BLOCK` (port that too, it's a constant).

Channel awareness (line 15–18) still works — channel is still `'telegram'`.

### 3d. `src/context.ts` — NEW (replaces `experimental_context` plumbing)

The Vercel AI SDK passes context via `experimental_context` on `generateText()` and tool handlers receive it as `helpers.context`. The Agent SDK has no equivalent parameter. Solution: Node's `AsyncLocalStorage`.

```ts
import { AsyncLocalStorage } from 'node:async_hooks';

export type AuditContext = {
  conversationId: string | null;
  channel: 'telegram' | 'admin' | 'playground' | null;
};

export const auditContext = new AsyncLocalStorage<AuditContext>();

export function getAuditContext(): AuditContext {
  return auditContext.getStore() ?? { conversationId: null, channel: null };
}
```

In `bot.ts`, every `runTurn` call wraps the Agent SDK invocation in `auditContext.run({ conversationId, channel: 'telegram' }, async () => {...})`. Inside any tool handler, calling `getAuditContext()` returns the current values without needing them passed through the handler signature.

### 3e. `src/audit.ts` — ported + adapted

Port `withAIAudit` from `syntric-labs/src/lib/ai/audit.ts`. Replace `experimental_context` extraction (lines ~50–70 in original) with `getAuditContext()` call.

Original signature:
```ts
withAIAudit(toolName, opts, execute): (args, execOpts: {experimental_context?: unknown}) => Promise<R>
```

New signature (simplified — no execOpts):
```ts
withAIAudit(toolName, opts, execute): (args) => Promise<R>
```

Inside, `const ctx = getAuditContext()` replaces context extraction. Everything else — `ai_actions` row insert, `logActivity` path, `reversal_hint` capture — unchanged.

The `extractClientId` helper (lines 13–22 in original) copies verbatim.

### 3f. `src/confirm-tokens.ts` — direct copy

Port verbatim from `syntric-labs/src/lib/ai/confirm-tokens.ts`. Uses the shared `pending_actions` Supabase table — no in-memory state, no Next.js deps.

### 3g. `src/undo.ts` — DEFER

Undo is called from a separate HTTP endpoint (`/api/ai/undo` on syntric-labs) that the admin UI triggers. Bot doesn't need it. Skip porting for Phase 1 migration. If needed later, port as-is (uses `postgres` package for raw DELETE/UPDATE, which we already have in deps).

---

## Phase 4: Build MCP server for 41 tools (4–6 hours — the bulk of the work)

The Agent SDK uses `createSdkMcpServer({ name, version, tools: [...] })` to register an in-process MCP server. Each tool is defined via the `tool(name, description, schema, handler, annotations?)` helper.

### 4a. Shape conversion

**Vercel AI SDK shape (current):**
```ts
tool({
  description: '...',
  inputSchema: zodSchema(z.object({ id: z.string().uuid() })),
  execute: withAIAudit('getClientInfo', {}, async ({ id }) => {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
    if (error) return { error: error.message };
    return data;
  }),
});
```

**Agent SDK shape (target):**
```ts
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

tool(
  'getClientInfo',
  'Fetch a single client with contacts by ID',
  {
    id: z.string().uuid().describe('Client UUID'),
  },
  withMcpAdapter(withAIAudit('getClientInfo', {}, async ({ id }) => {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from('clients').select('*, client_contacts(*)').eq('id', id).single();
    if (error) return { error: error.message };
    return data;
  })),
  { readOnlyHint: true }   // annotation — allows parallel calls for read-only tools
);
```

Key shape changes:
1. `description` moves from a property to a positional arg.
2. `inputSchema: zodSchema(z.object({...}))` → pass the Zod shape **object** directly (not wrapped): `{ id: z.string().uuid() }`.
3. `execute: async (args) => result` → `async (args) => ({ content: [{ type: 'text', text: JSON.stringify(result) }] })`. This is the MCP return shape.
4. `readOnlyHint: true` on all query tools so Claude can batch them. `destructiveHint: true` on hard deletes.

### 4b. `src/tools/result-adapter.ts` — MCP return shape wrapper

Wraps an existing handler that returns raw data into the `{content: [...]}` shape MCP requires.

```ts
export function withMcpAdapter<Args, Result>(
  handler: (args: Args) => Promise<Result>
): (args: Args) => Promise<{ content: Array<{type: 'text', text: string}>, isError?: boolean }> {
  return async (args) => {
    try {
      const result = await handler(args);
      const isError = typeof result === 'object' && result !== null && 'error' in result;
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        ...(isError ? { isError: true } : {}),
      };
    } catch (e) {
      return {
        content: [{ type: 'text', text: `Tool error: ${e instanceof Error ? e.message : String(e)}` }],
        isError: true,
      };
    }
  };
}
```

### 4c. Tool-by-tool port (split across files by domain)

Full tool list from exploration, grouped:

**Clients (`src/tools/clients.ts`):** 5 tools
- getClientInfo (read) ✓ wrap with readOnlyHint
- listClients (read) ✓ readOnlyHint
- createClient (write, logActivity)
- updateClient (write, logActivity, captures prev for undo)
- archiveClient (write, logActivity, captures prev for undo)

**Contacts (`src/tools/contacts.ts`):** 3 tools
- createContact, updateContact, hardDeleteContact (2-step confirm)

**Deals (`src/tools/deals.ts`):** 6 tools
- getDealInfo, listDeals (read, readOnlyHint)
- createDeal, updateDeal, updateDealStage, archiveDeal (write, logActivity, stage history)

**Projects (`src/tools/projects.ts`):** 5 tools
- getProjectInfo, listProjects (read, readOnlyHint)
- createProject, updateProject, updateProjectStatus (write, logActivity)

**Leads (`src/tools/leads.ts`):** 5 tools
- createLead, updateLead, convertLeadToClient, dismissLead, hardDeleteLead

**Documents (`src/tools/documents.ts`):** 4 tools
- generateDocument, generateCustomDocument (write, logActivity on second), sendDocumentToClient, updateDocumentStatus
- **Important**: generateDocument calls the PDF renderer. The renderer is currently at `syntric-labs/src/app/api/documents/generate/route.ts` (Vercel-hosted). The new bot will need to either (a) hit this endpoint over HTTP (simplest — keeps PDF rendering on Vercel where Puppeteer works cleanly), or (b) port the renderer to the Node bot. **Recommendation: (a), call the Vercel endpoint.** The bot sends markdown + metadata to syntric-labs, gets back a document ID + storage path.

**Email (`src/tools/email.ts`):** 3 tools
- sendEmail, searchEmails, getEmailThread
- Gmail API creds — copy from syntric-labs env (`GMAIL_*`)

**Activities (`src/tools/activities.ts`):** 3 tools
- getClientActivities (read), addActivity, logFollowUp

**Transcripts (`src/tools/transcripts.ts`):** 2 tools
- searchTranscripts, getTranscriptDetail (both read)

**Search (`src/tools/search.ts`):** 1 tool
- semanticSearch — uses OpenAI embeddings (port env var)

**SQL (`src/tools/sql.ts`):** 3 tools
- querySql, describeSchema (read-ish but wrapped for audit)
- writeSql (mutation with pre-image capture)
- Import the sql-safety layer from syntric-labs (port `src/lib/ai/sql-safety.ts` and `sql-client.ts`)

**Hard delete (`src/tools/hard-delete.ts`):** 1 tool (hardDeleteClient is the big one)
- Uses `createPendingAction` / `consumeConfirmToken` from `confirm-tokens.ts`
- Two-step flow: first call returns `{pending: true, token, preview}`, second call with `confirmToken` executes
- `destructiveHint: true`

**Total: 41 tools.** Plan on 6–10 min per tool for the straightforward ones, 20 min for the complex ones (updateDealStage, hardDeleteClient, writeSql).

### 4d. `src/tools/mcp-server.ts` — assemble the server

```ts
import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { clientTools } from './clients.js';
import { dealTools } from './deals.js';
// ... etc

export function createCrmServer() {
  return createSdkMcpServer({
    name: 'crm',
    version: '1.0.0',
    tools: [
      ...clientTools,
      ...contactTools,
      ...dealTools,
      ...projectTools,
      ...leadTools,
      ...documentTools,
      ...emailTools,
      ...activityTools,
      ...transcriptTools,
      ...searchTools,
      ...sqlTools,
      ...hardDeleteTools,
    ],
  });
}
```

Each domain file exports its array of tools as a named const.

---

## Phase 5: Agent SDK wrapper (`src/bot.ts`, 2–3 hours)

This is the core runtime logic. Replaces `handleChatGenerate` from syntric-labs.

```ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import { createCrmServer } from './tools/mcp-server.js';
import { buildSystemPrompt } from './system-prompt.js';
import { auditContext } from './context.js';
import { getOrCreateConversation, addMessage, getMessages } from './messages.js';
import { createServiceClient } from './supabase.js';

const crmServer = createCrmServer();

export async function runTurn(chatId: string, userText: string): Promise<{
  text: string;
  toolCalls: Array<{ toolName: string; args: unknown; result: unknown }>;
}> {
  const supabase = createServiceClient();
  const conversation = await getOrCreateConversation(supabase, 'telegram', chatId);

  // Persist user message
  await addMessage(supabase, conversation.id, { role: 'user', content: userText });

  // Get prior session ID (if any) for multi-turn context
  const { data: convRow } = await supabase
    .from('conversations').select('metadata').eq('id', conversation.id).single();
  const sessionId = (convRow?.metadata as any)?.agent_session_id as string | undefined;

  return auditContext.run({ conversationId: conversation.id, channel: 'telegram' }, async () => {
    const systemPrompt = buildSystemPrompt({}, 'telegram');

    let finalText = '';
    let newSessionId: string | undefined;
    const toolCalls: Array<{ toolName: string; args: unknown; result: unknown }> = [];
    const pendingToolUses = new Map<string, { name: string; input: unknown }>();

    for await (const message of query({
      prompt: userText,
      options: {
        mcpServers: { crm: crmServer },
        allowedTools: ['mcp__crm__*'],
        systemPrompt: { type: 'custom', value: systemPrompt },
        permissionMode: 'acceptAll',
        model: 'claude-sonnet-4-5',  // CONFIRM latest ID during impl
        maxTurns: 10,                 // verify exact option name
        ...(sessionId ? { resume: sessionId } : {}),
        settingSources: [],           // don't load ~/.claude/CLAUDE.md into this bot
      },
    })) {
      if (message.type === 'system' && message.subtype === 'init') {
        newSessionId = message.session_id;
      }
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'text') finalText += block.text;
          if (block.type === 'tool_use') {
            pendingToolUses.set(block.id, { name: block.name, input: block.input });
          }
        }
      }
      if (message.type === 'user') {
        // tool_result messages come back as user-role with tool_result blocks
        for (const block of message.message.content) {
          if (block.type === 'tool_result') {
            const pending = pendingToolUses.get(block.tool_use_id);
            if (pending) {
              toolCalls.push({
                toolName: pending.name,
                args: pending.input,
                result: block.content,
              });
              pendingToolUses.delete(block.tool_use_id);
            }
          }
        }
      }
    }

    // Persist assistant message with tool_calls rehydrated into storage
    await addMessage(supabase, conversation.id, {
      role: 'assistant',
      content: finalText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    });

    // Save session ID for multi-turn resume
    if (newSessionId && newSessionId !== sessionId) {
      await supabase
        .from('conversations')
        .update({ metadata: { ...(convRow?.metadata ?? {}), agent_session_id: newSessionId } })
        .eq('id', conversation.id);
    }

    return { text: finalText, toolCalls };
  });
}
```

**Session strategy**: Rely on Agent SDK's `resume: sessionId` for multi-turn context. Store session ID in `conversations.metadata.agent_session_id`. SDK manages conversation history internally per session. **Verify during impl**: does `resume` survive across process restarts (sessions persisted to `~/.claude/sessions/` typically) or do we need to replay prior turns manually? If the latter, fall back to loading from `messages` table and passing them as a synthetic "history" prefix to the prompt.

**Repeat-bug fix check**: Because we now use SDK sessions, the model sees actual tool_use/tool_result pairs in its context, not just stripped text. The old bug (assistant narration without structured tool proof) dies with this architecture — the SDK can't drop tool-result blocks because they're its own internal state.

---

## Phase 6: HTTP server + Telegram webhook (`src/index.ts`, 1 hour)

```ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { runTurn } from './bot.js';
import {
  sendTelegramMessage,
  sendLongTelegramMessage,
  sendTelegramDocument,
  sendTelegramChatAction,
  markdownToTelegramHTML,
} from './telegram.js';
import { createServiceClient } from './supabase.js';
import { getOrCreateConversation } from './messages.js';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true }));

app.post('/webhook', async (c) => {
  const secret = c.req.header('x-telegram-bot-api-secret-token');
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const message = body.message;
  if (!message?.text) return c.json({ ok: true });

  const chatId = String(message.chat.id);
  const userId = String(message.from.id);
  const userText = message.text as string;

  if (userId !== process.env.TELEGRAM_AUTHORIZED_USER_ID) {
    await sendTelegramMessage(chatId, 'Unauthorized. This bot is private.');
    return c.json({ ok: true });
  }

  if (userText === '/start') {
    await sendTelegramMessage(chatId, "Hey Chandler! Syntric AI is ready. Ask me anything.");
    return c.json({ ok: true });
  }
  if (userText === '/reset') {
    const supabase = createServiceClient();
    const conversation = await getOrCreateConversation(supabase, 'telegram', chatId);
    await supabase.from('messages').delete().eq('conversation_id', conversation.id);
    // also clear session ID so SDK starts fresh
    await supabase.from('conversations').update({ metadata: {} }).eq('id', conversation.id);
    await sendTelegramMessage(chatId, "Context cleared. Starting fresh — what's up?");
    return c.json({ ok: true });
  }

  try {
    await sendTelegramChatAction(chatId, 'typing');
    const result = await runTurn(chatId, userText);

    // Handle document uploads (same pattern as Vercel webhook lines 110-138)
    for (const tc of result.toolCalls) {
      if (tc.toolName === 'generateDocument' || tc.toolName === 'generateCustomDocument') {
        const docResult = tc.result as any; // MCP result is wrapped — parse JSON first
        const parsed = typeof docResult === 'string' ? JSON.parse(docResult) : docResult;
        if (parsed?.document?.id) {
          const supabase = createServiceClient();
          const { data: doc } = await supabase
            .from('documents').select('storage_path, title').eq('id', parsed.document.id).single();
          if (doc?.storage_path) {
            const { data: signedData } = await supabase.storage
              .from('documents').createSignedUrl(doc.storage_path, 3600);
            if (signedData?.signedUrl) {
              await sendTelegramChatAction(chatId, 'upload_document');
              await sendTelegramDocument(chatId, signedData.signedUrl, doc.title);
            }
          }
        }
      }
    }

    if (result.text) {
      const html = markdownToTelegramHTML(result.text);
      await sendLongTelegramMessage(chatId, html);
    }
  } catch (e) {
    console.error('Bot error:', e);
    await sendTelegramMessage(chatId, 'Something went wrong. Please try again.');
  }

  return c.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
console.log(`Bot listening on :${port}`);
```

---

## Phase 7: Local tunnel + Telegram webhook setup (30 min)

### 7a. Install and run cloudflared

```bash
brew install cloudflared
```

**Ephemeral (try-first approach):**
```bash
cloudflared tunnel --url http://localhost:3001
# Outputs a URL like: https://brave-apple-1234.trycloudflare.com
```

URL changes every restart. Fine for initial testing.

**Named tunnel (once it works, do this for stability):**
```bash
cloudflared tunnel login                    # opens browser, one-time
cloudflared tunnel create syntric-bot
cloudflared tunnel route dns syntric-bot bot.yourdomain.com
# Add config to ~/.cloudflared/config.yml pointing at http://localhost:3001
cloudflared tunnel run syntric-bot
```

Gives `https://bot.yourdomain.com` — stable across restarts. ~10 min setup.

### 7b. Point Telegram at the new bot

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://bot.yourdomain.com/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
  -d "allowed_updates=[\"message\"]"
```

Verify: `curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"` should show the new URL.

---

## Phase 8: Validation (1 hour)

### 8a. Billing smoke test (THE MOST IMPORTANT TEST)

1. Open [Anthropic Console → Usage](https://console.anthropic.com/settings/usage). Note current day's API spend.
2. Ensure `ANTHROPIC_API_KEY` is NOT in the bot's .env.
3. Start the bot: `npm run dev:full`.
4. Send 10 varied Telegram messages, including at least 3 that use tools (list clients, create a test deal, query SQL).
5. Refresh Anthropic Console.

**Expected**: API spend does not move. SDK used Claude Code credentials. Max subscription was charged. Migration works.

**If API spend moved**: SDK fell back to API key OR subscription auth path is broken. Debug: check `echo $ANTHROPIC_API_KEY` in the shell that started the bot, check Claude Code is logged in (`claude --version`), confirm Max subscription is active. If it still uses API, either accept the cost (still cheaper than Vercel due to architecture wins) or pause and reassess.

### 8b. Repeat-bug regression test

```
You: "Create a test deal for Acme Corp at $5000 value."
Bot: "Created deal DEAL-123 for Acme Corp at $5000..."
You: "What deals did we just make?"
Bot: should reference DEAL-123 without re-calling createDeal.
```

Check Supabase `deals` table: should have **one** row for Acme Corp, not two.

### 8c. Batch delete cost comparison

Run the "remove all duplicate clients" scenario (the original pain case). Compare:
- Anthropic Console: should show near-zero delta
- `ai_actions` rows: all tool calls logged
- Admin UI on Vercel: loads the turn's actions correctly

### 8d. Document generation path

"Generate a proposal for Acme Corp for $5000 website project."

Expected:
- generateDocument tool fires (visible in `ai_actions`)
- PDF arrives in Telegram as a document upload
- syntric-labs /admin shows the document
- Anthropic Console: minimal delta

### 8e. Fallback test

```bash
# Swap back to Vercel
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://syntriclabs.com/api/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

Send Telegram message → Vercel bot responds. Swap back to cloudflared URL → new bot responds.

### 8f. Admin observability check

Open `/admin/ai-actions` on syntric-labs.com. Every tool call from the new bot should appear here within seconds — because the new bot writes to the same shared `ai_actions` table via the ported `withAIAudit` wrapper.

---

## Phase 9: Rollback procedure (when, not if)

If anything breaks after cutover:

1. Re-point Telegram webhook at Vercel (Phase 7b with syntric-labs URL) — **30 seconds.**
2. No code revert needed in syntric-labs — main was never touched.
3. Debug new bot offline at leisure.

**If OAuth gets revoked** (R1 realized):
- Option A: Set `ANTHROPIC_API_KEY` in `.env`, restart. Bot works, now on API billing. At least architecture improvements remain.
- Option B: Roll back to Vercel bot. The original plan's fix-in-place improvements (tool_calls rehydration, turn usage logging) are separately mergeable into syntric-labs main if you want them there.

---

## Phase 10: Cleanup syntric-labs (optional, after 2+ weeks stable)

Only after the new bot has been reliable for 2+ weeks:

1. Delete `syntric-labs/src/app/api/telegram/webhook/route.ts`
2. Consider deleting `syntric-labs/src/app/api/telegram/setup/route.ts` (was the webhook registration helper)
3. Audit if anything else imports from `src/lib/ai/tools.ts` besides the deleted webhook and `/admin/ai-chat` — if yes, leave it. If no, optionally move tools into a shared package (out of scope).
4. Commit to main: `refactor: remove legacy Telegram webhook, bot now runs locally`
5. **Do not delete `archive/pre-agent-sdk-migration`.** That branch is the true revert path.

---

## Critical files

### In syntric-labs (source of truth, archive via Phase 0)
- `src/app/api/telegram/webhook/route.ts` — reference flow to replicate
- `src/lib/ai/tools.ts` (82KB, 41 tools) — primary port source
- `src/lib/ai/handler.ts` — `handleChatGenerate` shape to replicate
- `src/lib/ai/audit.ts` — `withAIAudit`, `extractClientId`
- `src/lib/ai/system-prompt.ts` (~2.7K tokens)
- `src/lib/ai/confirm-tokens.ts` — `createPendingAction`, `consumeConfirmToken`
- `src/lib/ai/sql-safety.ts`, `sql-client.ts` — for SQL tools
- `src/lib/ai/embeddings.ts` — for semanticSearch
- `src/lib/telegram.ts` — direct port, no changes
- `src/lib/services/messages.ts` — direct port
- `src/app/api/documents/generate/route.ts` — **keep on Vercel**, call via HTTP from new bot

### In new syntric-bot (create in Phase 1–6)
- `src/index.ts` — Hono app (Phase 6)
- `src/bot.ts` — Agent SDK invocation (Phase 5)
- `src/context.ts` — AsyncLocalStorage (Phase 3d)
- `src/tools/mcp-server.ts` + 12 domain files (Phase 4)
- Ported utilities: telegram.ts, messages.ts, audit.ts, system-prompt.ts, confirm-tokens.ts, supabase.ts

### Supabase (no changes needed)
- `messages` table already has `tool_calls` jsonb column — no migration needed
- `conversations.metadata` jsonb accepts arbitrary data — session ID fits there
- `ai_actions` table unchanged — new bot writes same schema
- `pending_actions` table unchanged — confirm-token flow intact

---

## Open questions (verify during implementation)

1. **Agent SDK session persistence across process restart.** Docs show `resume: sessionId` works within a process. Need to test: kill the Node process, restart, call `query({resume: <id>, ...})`. If sessions persist (via `~/.claude/sessions/`), great — use them. If not, fall back to loading last N messages from Supabase and prepending them as manual context to the prompt. This is the only architectural hinge that could force a redesign.
2. **`maxTurns` vs `stopWhen` option name.** Current Vercel code uses `stepCountIs(10)`. Agent SDK option name to confirm — possibly `maxTurns`, `maxSteps`, `maxLoops`.
3. **`systemPrompt: {type: 'custom', value: ...}` completeness.** Does this fully replace Claude Code's default ~coding-focused prompt, or does it append? Docs suggest `{type: 'custom'}` is full override, but verify by generating a single turn and confirming Claude's self-identity in the response matches the Syntric CRM prompt, not Claude Code.
4. **`settingSources: []` excludes `~/.claude/CLAUDE.md`.** Important so the user's personal Claude Code instructions don't leak into the bot.
5. **Tool schema compat.** Agent SDK passes Zod object shape directly (`{id: z.string()}`), not `zodSchema(z.object({...}))`. Complex tool schemas (e.g. with discriminated unions or refinements) should be tested early — port 1 complex tool first (like `updateDealStage` with its conditional lostReason), verify it works, then port the rest.
6. **`createServiceClient()` should NOT be async in new bot.** Syntric-labs wraps it in Next.js's dynamic async cookies API. New bot uses a plain, synchronous factory. Adjust all tool bodies that `await createServiceClient()` to drop the await.
7. **Gmail auth.** syntric-labs likely has Google OAuth tokens stored. Port those env vars carefully. If tokens refresh via a Vercel cron job, either run the refresh locally or call the Vercel refresh endpoint from the bot.
8. **Document generation.** Call Vercel's existing `/api/documents/generate` endpoint via HTTP from the new bot — don't port Puppeteer to the local Node server.

---

## Timeline

- Phase 0: 5 min
- Phase 1: 1 hr
- Phase 2: 30 min
- Phase 3: 2–3 hr
- Phase 4: 4–6 hr (the bulk — 41 tools)
- Phase 5: 2–3 hr
- Phase 6: 1 hr
- Phase 7: 30 min
- Phase 8: 1 hr

**Total: 12–17 hours of focused work.** Realistically a long weekend or two evenings + a Saturday.

---

## Verification SQL (copy-paste snippets)

```sql
-- Confirm new bot is writing ai_actions (run after Phase 8c)
select tool_name, channel, created_at, status
from ai_actions
where channel = 'telegram'
  and created_at > now() - interval '1 hour'
order by created_at desc
limit 20;

-- Confirm tool_calls column is populated on assistant messages
select role, created_at,
       jsonb_array_length(coalesce(tool_calls, '[]'::jsonb)) as tool_call_count
from messages
where conversation_id = (
  select id from conversations where channel = 'telegram' order by created_at desc limit 1
)
order by created_at desc limit 10;

-- Session ID captured
select channel, external_id, metadata->'agent_session_id' as session_id
from conversations
where channel = 'telegram';
```
