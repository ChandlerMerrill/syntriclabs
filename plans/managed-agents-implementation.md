# Managed Agents Migration — Execution Plan

> **Status:** Active. Source proposal: [`proposal-b-managed-agent-bridge.md`](./proposal-b-managed-agent-bridge.md).
> **Archive of pre-migration state:** `archive/v2-pre-managed-agents` branch.
> **Target:** Telegram CRM bot runs against Anthropic Managed Agents + Supabase Remote MCP instead of the current Vercel AI SDK + 41-tool path.

---

## How to resume this work in a new conversation

Each conversation picks up exactly one phase (or sub-phase). Cold-start workflow:

1. Open this file first.
2. Find the **Phase tracker** below — the first unchecked phase is the next one to run.
3. Jump to that phase's section.
4. Read its **Context to load** block and open only those files.
5. Read [`proposal-b-managed-agent-bridge.md`](./proposal-b-managed-agent-bridge.md) sections referenced by the phase (not the whole proposal).
6. Follow **Steps**, then **Verification**, then **Handoff**.
7. The Handoff step commits the work and updates the tracker below, so the next session starts clean.

**Do not read ahead past the current phase.** Each phase is scoped so that one phase of context + the proposal excerpts it references is enough.

---

## Phase tracker

- [x] **Phase 0** — Archive current state + set up working branch (~15 min) — done 2026-04-17, `archive/v2-pre-managed-agents` and `feat/managed-agents` pushed to origin
- [x] **Phase 1** — done 2026-04-18; RLS verdict READABLE via direct MCP probe. Managed-agent event stream failed on Supabase error-response translation (Anthropic gateway bug — Phase 4 risk, see `plans/tool-inventory.md` §Observability). Vault `vlt_011CaAX3QC7jKibTcX44ouZS` (PAT-backed) is the working credential.
- [x] **Phase 2** — done 2026-04-18; R-B4 = wrap writes in `execute_crm_write` (RLS READABLE forces wrap). Categorized 42 `crmTools` entries + `undo` helper: A=13, B=28 tool()s → 9 custom schemas + 1 provider tool, C=1. See `plans/tool-inventory.md`.
- [x] **Phase 3** — done 2026-04-17; agent live. `ANTHROPIC_ENV_ID=env_01Vk6iyzeWm5v7881N33tZTE`, `ANTHROPIC_AGENT_ID=agent_011CaAaKRToubdNFCu7CERao`, `ANTHROPIC_AGENT_VERSION=1` written to `.env.local` (still needs pasting into Vercel — see `managed-agents-setup.md` §3.3). Files: `scripts/managed-agent/{custom-tool-schemas,build-agent-tools,setup-agent,update-system-prompt}.ts`. Uses Zod v4's built-in `z.toJSONSchema` (no external dep). Two API quirks discovered + worked around in `build-agent-tools.ts`: (1) Anthropic `input_schema` top level accepts only `{type, properties, required}` — `$schema` / `additionalProperties` / `oneOf` all 400 with "Extra inputs are not permitted", so `execute_crm_write` is flattened to `{action: enum(20), params: object}` and Phase 5b's Zod discriminated union handles per-action validation; (2) Zod's `.email()` / `.uuid()` / `.url()` emit regex `pattern` strings that fail Anthropic's "pattern must be a valid regex" — `pattern` is stripped recursively, `format` hint retained. Model pinned to `claude-sonnet-4-6`. Idempotency guard + `--dry-run` verified.
- [x] **Phase 4a** — Bridge scaffolding (session create/resume) (~1 hr) — done 2026-04-17; `src/lib/managed-agent/{client,session}.ts` added, webhook feature-flagged on `USE_MANAGED_AGENT=1`, `/reset` renamed to `/clear` (also strips `metadata.agent_session_id`).
- [x] **Phase 4b** — Event streaming loop + custom_tool_use dispatch (~1 hr) — done 2026-04-17; `src/lib/managed-agent/custom-tools.ts` stub + real event loop (stream-before-send, `session.status_idle` `requires_action` gate, `is_error` contract, empty-reply safety net). User + assistant messages now persisted on the managed-agent path; tool-call persistence deferred to 5b.
- [x] **Phase 4c** — Document pickup + Telegram delivery (~30–60 min) — done 2026-04-17; `generatedDocs` capture on `generate_document` / `generate_custom_document` results, post-loop signed-URL fetch + `sendTelegramDocument` shipping before text. End-to-end deferred to Phase 5b (verified via fake-doc stub patch workflow).
- [ ] **Phase 5a** — Custom tool dispatcher scaffolding + audit adapter (~1 hr)
- [ ] **Phase 5b** — Port individual custom tools (~1–2 hr)
- [ ] **Phase 6** — Delete dead code (~30 min)
- [ ] **Phase 7** — Validation suite (7a–7g) (~1 hr)
- [ ] **Phase 8** — Production cutover + monitoring (~30 min)

**Total estimated time:** 9–13 hours across ~12 conversations.

When a phase is complete, flip its `[ ]` to `[x]` and append a short outcome note (1 line, e.g. `[x] Phase 0 — done 2026-04-17, branch pushed to origin`).

---

## Conventions used throughout

- **Commit message format:** `chore(managed-agents): phase <N> — <title>` for every phase. Makes progress visible via `git log --grep 'managed-agents'`.
- **Working branch:** `feat/managed-agents` (created in Phase 0, branched from current `main`).
- **Don't touch:** `archive/v2-pre-managed-agents` — read-only reference to pre-migration state.
- **Env vars** added over time get listed in the Handoff section of the phase that introduces them, and also collected in the **Environment reference** section at the bottom of this file.
- **Manual setup steps live in [`managed-agents-setup.md`](./managed-agents-setup.md).** At the end of every phase, before committing, Claude appends that phase's out-of-band manual steps (Console UI clicks, env vars to paste into Vercel, third-party dashboards to touch, one-off script runs that need a human) to the setup doc as a checklist section. The implementation plan describes the engineering work; the setup doc is the running list of things the human has to do. Keep them in sync — if a phase introduces a manual step and doesn't add it to the setup doc, the next session won't know to prompt for it.

---

## Environment reference (updated as phases add vars)

Vercel project env vars introduced by this migration:

| Var | Added in phase | Purpose |
|---|---|---|
| `SUPABASE_PROJECT_REF` | Phase 1 | Locks MCP connection to our Supabase project |
| `ANTHROPIC_SUPABASE_VAULT_ID` | Phase 1 | Vault holding Supabase OAuth credential |
| `ANTHROPIC_ENV_ID` | Phase 3 | Managed Agents environment ID (prod value: `env_01Vk6iyzeWm5v7881N33tZTE`) |
| `ANTHROPIC_AGENT_ID` | Phase 3 | Agent ID (prod value: `agent_011CaAaKRToubdNFCu7CERao`) |
| `ANTHROPIC_AGENT_VERSION` | Phase 3 | Pinned agent version for the webhook (currently `1`) |
| `USE_MANAGED_AGENT` | Phase 8 | Feature flag for production cutover |

---

# Phase 0 — Archive current state + set up working branch

**Status:** pending
**Estimated time:** 15 min

## Objective
Preserve the current production bot as `archive/v2-pre-managed-agents` (immutable reference for rollback) and create `feat/managed-agents` as the working branch for the rest of this migration.

## Prerequisites
- Working directory clean (no uncommitted changes).
- Have push access to `origin`.

## Context to load
- `git status` + `git log --oneline -10` (confirm clean, note current HEAD).
- No code files need to be read.

## Steps
1. Confirm `main` is checked out and clean.
2. Create archive branch from current `main`: `git branch archive/v2-pre-managed-agents`.
3. Push archive branch to origin and set no upstream tracking (it's a snapshot, not active).
4. Create working branch: `git checkout -b feat/managed-agents`.
5. Create this file at `plans/managed-agents-implementation.md` (done as part of this phase).
6. Commit: `chore(managed-agents): phase 0 — archive pre-migration state + add execution plan`.
7. Push `feat/managed-agents` to origin with upstream tracking.

## Verification
- `git branch -a` shows both `archive/v2-pre-managed-agents` and `feat/managed-agents` locally and on origin.
- `git log archive/v2-pre-managed-agents --oneline -1` matches the `main` HEAD from before this phase.
- `plans/managed-agents-implementation.md` exists on `feat/managed-agents`.

## Handoff
- Archive branch is permanent reference; never commit to it.
- All future work stays on `feat/managed-agents` until Phase 8 merges to `main`.
- Flip Phase 0 in the tracker to `[x]`.

---

# Phase 1 — Supabase MCP vault setup + smoke test

**Status:** pending
**Estimated time:** 45 min

## Objective
Mint OAuth credentials for Supabase's remote MCP server, store them in an Anthropic vault, and confirm a throwaway agent session can execute SQL against our Supabase project via the vault.

## Prerequisites
- Phase 0 complete.
- `ANTHROPIC_API_KEY` in local shell.
- Browser access for Supabase OAuth flow.
- `@anthropic-ai/sdk` available (already in `package.json`; if not, install it).

## Context to load
- `proposal-b-managed-agent-bridge.md` — **Phase 1** section (lines ~141–173) and **Risk R-B2**.
- `.env.local` to see existing Supabase env vars (we'll add `SUPABASE_PROJECT_REF`).

## Steps
1. Find Supabase project ref (dashboard URL or `supabase projects list` via CLI).
2. Go through Supabase MCP OAuth flow against `https://mcp.supabase.com/mcp?project_ref=<ref>` to get `access_token`, `refresh_token`, `expires_at`, and `client_id`. Record these locally; do not commit.
3. Create script `scripts/managed-agent/setup-vault.ts` that:
   - Instantiates the Anthropic client.
   - Creates a vault named `syntric-supabase-mcp`.
   - Creates one credential inside it with the OAuth values.
   - Logs `vault.id`.
4. Run the script once locally. Save `vault.id`.
5. Write `SUPABASE_PROJECT_REF` and `ANTHROPIC_SUPABASE_VAULT_ID` to Vercel env (Production + Preview + Development) and to `.env.local`.
6. Create a disposable smoke-test script `scripts/managed-agent/smoke-test-mcp.ts` that creates a one-off agent (with **only** the Supabase MCP, no custom tools), opens a session, sends `"list 5 most recent deals"`, and prints the `agent.mcp_tool_result` rows.
7. Run it. Confirm real rows come back.
8. **Important RLS check:** run the smoke test with a query that *should* fail under our expected RLS policy (e.g. `select count(*) from auth.users`). If it succeeds, the token has too much privilege and we need to lock it down before proceeding.
9. Delete the disposable smoke-test agent (not the vault). The setup script stays committed; smoke test script can be deleted or kept under `scripts/managed-agent/`.

## Verification
- Vercel env has `SUPABASE_PROJECT_REF` and `ANTHROPIC_SUPABASE_VAULT_ID`.
- Smoke test printed at least one real deal row.
- RLS check behaved as expected (restricted to our project's scope).

## Handoff
- Commit: `chore(managed-agents): phase 1 — provision supabase mcp vault`.
- Files added: `scripts/managed-agent/setup-vault.ts`, `scripts/managed-agent/smoke-test-mcp.ts`.
- Flip Phase 1 in tracker to `[x]`.
- **Stop criterion:** if smoke test fails or RLS check reveals dangerous privilege, stop and revisit Proposal B §R-B2 before continuing.

---

# Phase 2 — Tool inventory decision

**Status:** pending
**Estimated time:** 1 hr

## Objective
Walk through every tool in `src/lib/ai/tools.ts` and mark each as: **delete (MCP handles)**, **keep as custom tool**, or **defer**. Produce a `plans/tool-inventory.md` artifact that Phase 3 and Phase 5b will consume.

## Prerequisites
- Phase 1 complete (so we know MCP works).

## Context to load
- `src/lib/ai/tools.ts` (full file — this is the whole point of the phase).
- `proposal-b-managed-agent-bridge.md` — **Phase 2** section (~177–198) and **Risk R-B4**.
- `src/lib/ai/audit.ts` — to understand what `withAIAudit` captures for each tool.

## Steps
1. Read `src/lib/ai/tools.ts` and list every exported tool name.
2. For each tool, assign category A / B / C per Proposal B Phase 2:
   - **A (delete, MCP handles):** pure SQL CRUD over Supabase tables, no external secrets, no non-SQL logic.
   - **B (keep as custom tool):** needs Gmail/OpenAI/Puppeteer/host-side secret, or is a multi-step confirm flow.
   - **C (defer):** not called by the agent (e.g. `undo` is admin-UI only).
3. Make the R-B4 observability call: do we wrap MCP writes in an `execute_crm_write` custom tool to preserve `ai_actions` audit rows, or let MCP write directly?
   - **Default recommendation:** direct MCP writes. Accept partial observability loss.
   - Document the decision and why in the inventory file.
4. Write `plans/tool-inventory.md`:
   ```markdown
   # Tool inventory — managed agents migration

   ## Category A — delete (Supabase MCP replaces)
   - tool_name_1 — replaced by `execute_sql` against <table>
   - ...

   ## Category B — keep as custom tool
   - tool_name_N — reason (Gmail OAuth / OpenAI API / Puppeteer / 2-step confirm)
   - ...

   ## Category C — defer (not called by agent)
   - undo — admin-UI trigger only

   ## Observability decision
   Direct MCP writes chosen. `ai_actions` table will only capture Category B tool calls going forward. Trade-off accepted per Proposal B R-B4.
   ```

## Verification
- `plans/tool-inventory.md` exists and categorizes every tool in `src/lib/ai/tools.ts`.
- Category B count is 5–10 (matches proposal's ~8 estimate).
- No tool is uncategorized.

## Handoff
- Commit: `chore(managed-agents): phase 2 — tool inventory and observability decision`.
- Files added: `plans/tool-inventory.md`.
- Flip Phase 2 in tracker to `[x]`.
- **Consumed by:** Phase 3 (custom tool schemas) and Phase 5b (which tools to port).

---

# Phase 3 — Agent creation script

**Status:** pending
**Estimated time:** 1–1.5 hr

## Objective
Write and run `scripts/managed-agent/setup-agent.ts` once. It creates the Anthropic environment, the agent (with model, system prompt, Supabase MCP, and Category B custom tool schemas), and prints the IDs + version.

## Prerequisites
- Phase 1 complete (vault exists).
- Phase 2 complete (tool inventory identifies Category B tools and their schemas).

## Context to load
- `plans/tool-inventory.md` (from Phase 2).
- `src/lib/ai/system-prompt.ts` — `buildSystemPrompt()` — used as-is for the agent.
- `src/lib/ai/tools.ts` — to copy the `input_schema` for each Category B tool.
- `proposal-b-managed-agent-bridge.md` — **Phase 3** section (~202–277).

## Steps
1. Create `scripts/managed-agent/setup-agent.ts`.
2. In the script:
   - Create environment `syntric-crm-env` (cloud, unrestricted networking).
   - Call `buildSystemPrompt({}, 'telegram')` once at script runtime to get the system string.
   - Create agent `syntric-crm-telegram`:
     - `model`: start with `claude-sonnet-4-6` (per the cost recommendation). We can A/B against Opus during Phase 7.
     - `mcp_servers`: one entry for Supabase.
     - `tools`: `{ type: 'mcp_toolset', mcp_server_name: 'supabase' }` plus one `{ type: 'custom', ... }` entry per Category B tool (schemas pulled from `src/lib/ai/tools.ts`).
   - Log `ENV_ID`, `AGENT_ID`, `AGENT_VERSION`.
3. Run the script. Record the three IDs.
4. Write `ANTHROPIC_ENV_ID`, `ANTHROPIC_AGENT_ID`, `ANTHROPIC_AGENT_VERSION` to Vercel env (Prod/Preview/Dev) and to `.env.local`.
5. Create a convenience script `scripts/managed-agent/update-system-prompt.ts` that calls `client.beta.agents.update(AGENT_ID, { system: buildSystemPrompt({}, 'telegram') })` and logs the new version. We'll use this whenever the prompt or tool schemas change.

## Verification
- Anthropic Console shows the agent and its version.
- `.env.local` and Vercel env have all three IDs.
- System prompt inside the agent matches `buildSystemPrompt({}, 'telegram')` output byte-for-byte.

## Handoff
- Commit: `chore(managed-agents): phase 3 — create environment and agent`.
- Files added: `scripts/managed-agent/setup-agent.ts`, `scripts/managed-agent/update-system-prompt.ts`.
- Flip Phase 3 in tracker to `[x]`.
- **Iteration rule going forward:** never run `setup-agent.ts` again. Use `update-system-prompt.ts` for tweaks; each run bumps the version.

---

# Phase 4a — Bridge scaffolding (session create/resume)

**Status:** pending
**Estimated time:** 1 hr

## Objective
Add a new code path (feature-flagged `USE_MANAGED_AGENT=1` for dev) that creates or resumes a Managed Agent session per Telegram conversation. No streaming yet — just session management, stored against `conversations.metadata`.

## Prerequisites
- Phase 3 complete (agent exists).

## Context to load
- `src/app/api/telegram/webhook/route.ts` — full file.
- `src/lib/services/messages.ts` — `getOrCreateConversation`, `addMessage`.
- `proposal-b-managed-agent-bridge.md` — **Phase 4** section (~281–404) — read the session-create portion only.

## Steps
1. Create directory `src/lib/managed-agent/` and add `src/lib/managed-agent/client.ts`:
   - Exports a shared `Anthropic` client instance.
   - Exports `AGENT_ID`, `AGENT_VERSION`, `ENV_ID`, `VAULT_ID` from env with runtime guards.
2. Add `src/lib/managed-agent/session.ts`:
   - `getOrCreateSession(conversationId: string, chatId: number): Promise<string>`
   - Reads `conversations.metadata.agent_session_id`; if present, returns it.
   - Else calls `client.beta.sessions.create({ agent, environment_id, vault_ids, title, metadata })` and persists the new session ID back to `conversations.metadata`.
3. In `src/app/api/telegram/webhook/route.ts`, add a feature-flagged branch at the top of the message-handling block:
   ```ts
   if (process.env.USE_MANAGED_AGENT === '1') {
     // placeholder that will be filled in Phase 4b
     const sessionId = await getOrCreateSession(conversation.id, chatId)
     await sendTelegramMessage(chatId, `[managed-agent wip] session ${sessionId}`)
     return NextResponse.json({ ok: true })
   }
   // ...existing handleChatGenerate path stays intact...
   ```
4. Test locally with `USE_MANAGED_AGENT=1 npm run dev`. Ping the bot; confirm a session ID comes back. Ping again in the same conversation; confirm the same session ID.

## Verification
- Two consecutive pings in one Telegram chat return the same `sessionId`.
- `conversations.metadata` in Supabase has `{ agent_session_id: "..." }`.
- Anthropic Console shows the session under the agent.
- `USE_MANAGED_AGENT=0` (or unset) leaves existing behavior untouched.

## Handoff
- Commit: `feat(managed-agents): phase 4a — session create/resume scaffolding`.
- Files added: `src/lib/managed-agent/client.ts`, `src/lib/managed-agent/session.ts`.
- File modified: `src/app/api/telegram/webhook/route.ts` (feature-flagged branch only).
- Flip Phase 4a in tracker to `[x]`.

---

# Phase 4b — Event streaming loop + custom_tool_use dispatch

**Status:** pending
**Estimated time:** 1 hr

## Objective
Replace the Phase 4a placeholder with a real event-stream loop: send the user's message, accumulate agent text, dispatch `agent.custom_tool_use` events to a stub dispatcher, honor the session-idle break gate.

## Prerequisites
- Phase 4a complete.

## Context to load
- `src/app/api/telegram/webhook/route.ts` — the Phase 4a feature-flagged branch.
- `src/lib/managed-agent/session.ts` (Phase 4a).
- `proposal-b-managed-agent-bridge.md` — **Phase 4** section (~281–404), especially the event loop and the session-idle break gate.
- `proposal-b-managed-agent-bridge.md` — **Phase 5** header (~408–410) to understand the `runCustomTool` contract.

## Steps
1. Add `src/lib/managed-agent/custom-tools.ts` with a **stub** `runCustomTool`:
   ```ts
   export async function runCustomTool(name: string, input: unknown, ctx: Ctx) {
     return { error: `Tool ${name} not yet implemented (Phase 5b pending)` }
   }
   ```
   (Phase 5b will replace this body.)
2. In the feature-flagged branch of `webhook/route.ts`:
   - Open the event stream **before** sending `user.message` (stream-first, per Proposal B's Pattern 7 note).
   - Iterate events:
     - `agent.message` → accumulate `finalText`.
     - `agent.custom_tool_use` → call `runCustomTool`, then `sessions.events.send` a `user.custom_tool_result`.
     - `session.status_terminated` → break.
     - `session.status_idle` → break **only if** `stop_reason.type !== 'requires_action'`.
   - After the loop: persist assistant message via `addMessage(..., 'assistant', finalText)`, then `sendLongTelegramMessage(chatId, markdownToTelegramHTML(finalText))`.
3. Test locally with `USE_MANAGED_AGENT=1`:
   - Send `"list 5 most recent deals"` → should return real data (MCP path, no custom tools needed).
   - Send a message that would invoke a custom tool (e.g. `"generate a proposal"`) → should respond with the stub error message cleanly, not hang.

## Verification
- MCP-only queries produce coherent responses with real data in <60s.
- Custom-tool requests don't hang the stream; they propagate the stub error back to the user.
- `conversations.metadata.agent_session_id` is stable across multiple turns.

## Handoff
- Commit: `feat(managed-agents): phase 4b — event streaming loop with custom tool stub`.
- Files added: `src/lib/managed-agent/custom-tools.ts` (stub).
- File modified: `src/app/api/telegram/webhook/route.ts`.
- Flip Phase 4b in tracker to `[x]`.

---

# Phase 4c — Document pickup + Telegram delivery

**Status:** pending
**Estimated time:** 30–60 min

## Objective
Close the loop on document generation: when `generate_document` (still stubbed as of Phase 4b) eventually returns a real `document.id`, the bridge fetches `storage_path` from Supabase, creates a signed URL, and uploads the file to Telegram.

## Prerequisites
- Phase 4b complete.

## Context to load
- `src/app/api/telegram/webhook/route.ts` (Phase 4b state).
- `src/lib/telegram.ts` — `sendTelegramDocument`, `sendTelegramChatAction`.
- `proposal-b-managed-agent-bridge.md` — Phase 4 section, the `generatedDocs` array and `// Ship generated docs` block (~380–392).

## Steps
1. In `webhook/route.ts`, inside the event loop's `agent.custom_tool_use` branch, detect `event.name === 'generate_document'` and push `{ documentId: result.document.id }` onto a local `generatedDocs` array if the result is non-error.
2. After the event loop (and after the `addMessage` assistant-persist), iterate `generatedDocs`:
   - `supabase.from('documents').select('storage_path, title').eq('id', doc.documentId).single()`
   - `supabase.storage.from('documents').createSignedUrl(row.storage_path, 3600)`
   - `sendTelegramChatAction(chatId, 'upload_document')`
   - `sendTelegramDocument(chatId, signed.signedUrl, row.title)`
3. Can't fully end-to-end test until Phase 5b implements `generate_document`, but exercise the code path by forcing a fake `{ document: { id: '<real doc id from docs table>' } }` return from the stub in Phase 4b's `runCustomTool`.

## Verification
- With a fake-returned real document id, Telegram receives the PDF as an attachment.
- Response text still lands (delivery of doc doesn't clobber text).

## Handoff
- Commit: `feat(managed-agents): phase 4c — document delivery via telegram`.
- File modified: `src/app/api/telegram/webhook/route.ts`.
- Flip Phase 4c in tracker to `[x]`.

---

# Phase 5a — Custom tool dispatcher scaffolding + audit adapter

**Status:** pending
**Estimated time:** 1 hr

## Objective
Replace the stub `runCustomTool`. Build the dispatcher shape with the context-passing mechanism and refactor `withAIAudit` so it no longer relies on Vercel AI SDK's `experimental_context`. No specific tools ported yet — those come in 5b.

## Prerequisites
- Phase 4b complete (dispatcher stub exists).

## Context to load
- `src/lib/managed-agent/custom-tools.ts` (stub).
- `src/lib/ai/audit.ts` — `withAIAudit`, `extractClientId`, and how context currently flows.
- `src/lib/ai/handler.ts` — to see where `experimental_context` is threaded in today.
- `proposal-b-managed-agent-bridge.md` — **Phase 5** section (~408–446) — especially the "withAIAudit needs a small adapter" note.

## Steps
1. Introduce an `AsyncLocalStorage` context holder in `src/lib/managed-agent/context.ts`:
   ```ts
   import { AsyncLocalStorage } from 'async_hooks'
   export type AgentCtx = { conversationId: string; channel: 'telegram' | 'admin' | 'playground' }
   export const agentCtxStore = new AsyncLocalStorage<AgentCtx>()
   export function getAgentCtx(): AgentCtx {
     const c = agentCtxStore.getStore()
     if (!c) throw new Error('Agent context not set')
     return c
   }
   ```
2. Modify `src/lib/ai/audit.ts`:
   - `withAIAudit` currently reads context off the AI SDK tool-call signature. Add an overload (or change signature) so it can read context via `getAgentCtx()` instead.
   - Keep the existing behavior intact for any callers still on the Vercel AI SDK path (admin chat / widget).
3. Replace the stub in `src/lib/managed-agent/custom-tools.ts`:
   ```ts
   const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
     // empty for now — populated in Phase 5b
   }
   export async function runCustomTool(name: string, input: unknown, ctx: AgentCtx) {
     return agentCtxStore.run(ctx, async () => {
       const fn = handlers[name]
       if (!fn) return { error: `Unknown tool: ${name}` }
       try { return await fn(input) } catch (e) {
         return { error: e instanceof Error ? e.message : String(e) }
       }
     })
   }
   ```
4. Sanity-test by invoking the webhook with `USE_MANAGED_AGENT=1` and sending a message that does not trigger any custom tool — confirm nothing regressed from 4b.

## Verification
- Admin chat (`/admin/ai-chat`, still on old path) still works — no regression from the `withAIAudit` refactor.
- Managed-agent path (4b) still works with empty handlers map.
- Typecheck + build passes.

## Handoff
- Commit: `feat(managed-agents): phase 5a — dispatcher scaffolding and audit adapter`.
- Files added: `src/lib/managed-agent/context.ts`.
- Files modified: `src/lib/managed-agent/custom-tools.ts`, `src/lib/ai/audit.ts`.
- Flip Phase 5a in tracker to `[x]`.

---

# Phase 5b — Port individual custom tools

**Status:** pending
**Estimated time:** 1–2 hr (may split further per tool if needed)

## Objective
For each Category B tool from `plans/tool-inventory.md`, register a handler in the dispatcher. Each tool's business logic stays where it is (in `src/lib/documents`, `src/lib/email`, etc.); the dispatcher just maps names to functions.

## Prerequisites
- Phase 5a complete (dispatcher + audit adapter).
- `plans/tool-inventory.md` Category B list is final.

## Context to load
- `plans/tool-inventory.md` — the list driving this phase.
- For each tool being ported, open its current implementation (usually in `src/lib/documents`, `src/lib/email`, `src/lib/search`, `src/lib/hard-delete`).
- `src/lib/managed-agent/custom-tools.ts` (Phase 5a state).

## Steps
For each Category B tool (typically ~8 tools), do:
1. Locate the underlying function (e.g. `generateDocument` in `src/lib/documents/index.ts`).
2. If its signature takes input directly, add a handler entry:
   ```ts
   handlers.generate_document = withAIAudit('generate_document', {}, generateDocument)
   ```
3. If the underlying function previously pulled context from `experimental_context`, switch it to `getAgentCtx()`.
4. Run the webhook with `USE_MANAGED_AGENT=1` and send a Telegram prompt that would trigger that tool. Confirm:
   - Custom tool call succeeds.
   - `ai_actions` row appears in Supabase (confirming audit wrapper still works).
   - Response to the user is coherent.

**Order of porting (complexity ascending):**
1. `semantic_search` — pure read, least risky.
2. `search_emails`, `get_email_thread` — Gmail read paths.
3. `send_email` — Gmail write.
4. `generate_document`, `generate_custom_document` — Puppeteer path; exercises Phase 4c delivery.
5. `send_document_to_client`.
6. `hard_delete_client`, `hard_delete_contact`, `hard_delete_lead`, `confirm_pending` — 2-step confirm flow; highest risk, port last and test carefully.

**If any single tool becomes large (e.g. Gmail refresh-token issues during port), split it into its own Phase 5b-X sub-phase.**

## Verification
- Every Category B tool has a corresponding handler and is reachable via Telegram prompt.
- `ai_actions` table gains rows as each tool fires.
- No regressions in admin chat (which still uses the old path).

## Handoff
- Commit: `feat(managed-agents): phase 5b — port custom tool handlers` (or one commit per tool if that's cleaner).
- Files modified: `src/lib/managed-agent/custom-tools.ts`, and any underlying libs that needed context-access tweaks.
- Flip Phase 5b in tracker to `[x]`.

---

# Phase 6 — Delete dead code

**Status:** pending
**Estimated time:** 30 min

## Objective
With the managed-agent path working end-to-end behind the feature flag, remove everything the Vercel AI SDK path uniquely required for Telegram. Keep admin-chat / widget paths intact.

## Prerequisites
- Phase 5b complete.
- Phase 7 validation has passed on `USE_MANAGED_AGENT=1`.

## Context to load
- `proposal-b-managed-agent-bridge.md` — **Phase 6** section (~450–460).
- `src/lib/ai/handler.ts`, `src/lib/ai/tools.ts`, `src/lib/ai/sql-safety.ts`, `src/lib/ai/sql-client.ts`.
- `src/app/api/admin/**` — confirm which AI paths it imports.

## Steps
1. Confirm nothing outside Telegram imports from `src/lib/ai/handler.ts`. If admin chat does, decide whether to migrate admin too (out of current scope) or keep the handler for it — revisit in Phase 8 decisions.
2. For anything truly Telegram-only:
   - Delete `src/lib/ai/handler.ts` (if unused elsewhere).
   - Prune Category A tool definitions from `src/lib/ai/tools.ts`. Keep Category B entries only, and refactor them to plain async functions (no `tool()` wrapper).
   - Delete `src/lib/ai/sql-safety.ts`, `src/lib/ai/sql-client.ts` if no admin/widget path uses them.
3. Keep: `src/lib/ai/audit.ts`, `src/lib/ai/confirm-tokens.ts`, `src/lib/ai/system-prompt.ts`, `src/lib/ai/embeddings.ts`, `src/lib/ai/undo.ts`, `src/lib/ai/widget-tools.ts`, `src/lib/ai/widget-system-prompt.ts`.
4. Build + typecheck. Fix any broken imports.

## Verification
- Build passes.
- Admin chat still works (`/admin/ai-chat`).
- Widget still works.
- Telegram still works with `USE_MANAGED_AGENT=1`.

## Handoff
- Commit: `refactor(managed-agents): phase 6 — delete Vercel AI SDK path for telegram`.
- Flip Phase 6 in tracker to `[x]`.

---

# Phase 7 — Validation suite

**Status:** pending
**Estimated time:** 1 hr

## Objective
Execute all seven validation tests from Proposal B Phase 7 against the `feat/managed-agents` branch. Record outcomes inline in the tracker.

## Prerequisites
- Phase 6 complete.

## Context to load
- `proposal-b-managed-agent-bridge.md` — **Phase 7** section (~464–513).

## Steps
Run each test and record pass/fail inline:
- **7a** Repeat-bug regression — create test deal, ask "what deals did we just make?", confirm no duplicate row.
- **7b** Batch-delete cost comparison — "remove all duplicate clients"; inspect Anthropic Console + `ai_actions`.
- **7c** Document generation path — "generate a proposal for Acme Corp, $5000"; confirm PDF delivered to Telegram.
- **7d** Session persistence — 3 messages across 10 min, same session ID.
- **7e** Rate-limit + long turn — 15+ MCP calls, no 429s, under 60s.
- **7f** Context compaction — force ~80K tokens of history, confirm `agent.thread_context_compacted` fires.
- **7g** Vault refresh — after 1 hr, MCP calls still work (confirming auto-refresh).

## Verification
- All 7a–7g pass. If anything fails, open a blocker note in the tracker and resolve before Phase 8.

## Handoff
- Commit: `test(managed-agents): phase 7 — validation results` with a summary in the commit body.
- Flip Phase 7 in tracker to `[x]`.

---

# Phase 8 — Production cutover + monitoring

**Status:** pending
**Estimated time:** 30 min

## Objective
Flip the flag for production traffic, merge to `main`, and set up a 72-hour observation window.

## Prerequisites
- Phase 7 complete and all tests green.

## Context to load
- `proposal-b-managed-agent-bridge.md` — **Phase 8** section (rollback).

## Steps
1. Set `USE_MANAGED_AGENT=1` on Vercel Production.
2. Merge `feat/managed-agents` → `main` via PR (squash or merge commit — your call; proposal suggests merge so phase commits remain legible).
3. Watch Anthropic Console + `ai_actions` + Telegram for 72 hours.
4. If stable after 72 hours, remove the feature flag entirely (delete the `if (USE_MANAGED_AGENT)` branch; managed-agents becomes the only path).
5. **Rollback trigger:** if the managed-agent path breaks, set `USE_MANAGED_AGENT=0` on Vercel and redeploy. Old path is still in-tree until the flag is removed in step 4.

## Verification
- Production Telegram bot responds via managed-agent path (verified by checking `conversations.metadata.agent_session_id` on real user rows).
- No error spike in Vercel logs or Anthropic Console.

## Handoff
- Commit (step 4): `refactor(managed-agents): phase 8 — remove feature flag, managed-agent is default`.
- Flip Phase 8 in tracker to `[x]`.
- **Migration complete.**

---

## Rollback references

- Hard rollback (break emergency): check out `archive/v2-pre-managed-agents`, redeploy. Permanent reference, never deleted.
- Soft rollback (mid-migration): `USE_MANAGED_AGENT=0` in Vercel env reverts Telegram to the old path (until Phase 6 deletes it; before then the flag is live).
- MCP-specific rollback: re-add deleted CRUD tools as custom tools via `client.beta.agents.update(AGENT_ID, { tools: [...] })` — existing sessions pick them up on next turn.

## Open questions to resolve during execution

See `proposal-b-managed-agent-bridge.md` **Open questions** section — seven items to verify in-flight, especially RLS behavior (Phase 1), agent version pinning (Phase 3), and custom tool result size limits (Phase 5b).
