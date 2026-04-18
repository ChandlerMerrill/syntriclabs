# Managed Agents Migration — Manual Setup Checklist

> Companion to [`managed-agents-implementation.md`](./managed-agents-implementation.md). Every phase appends its out-of-band manual steps here (Console clicks, env vars to paste, external dashboards to touch). Claude can't do these; you do them between phases.

Work top-down. Check each box as you complete it. If a step blocks, leave it unchecked and drop a `→ blocked because …` note under it.

---

## Phase 1 — Supabase MCP vault + smoke test

Claude has already committed the scripts (`scripts/managed-agent/*`) and dependencies. The steps below are everything that has to happen outside the repo.

### 1.1 Create the Anthropic vault

Try Console UI first — it's the fastest path when supported.

- [ ] Sign in at [console.anthropic.com](https://console.anthropic.com) with the org that owns `ANTHROPIC_API_KEY`.
- [ ] Find Vaults / Credentials / Integrations in the sidebar or under Settings.
- [ ] Create vault:
  - **Name:** `syntric-supabase-mcp`
  - **Credential type:** MCP OAuth
  - **MCP server URL:** `https://mcp.supabase.com/mcp?project_ref=utixbzraliglhjxgfzrv`
- [ ] Approve the Supabase OAuth consent screen when Console redirects you.
- [ ] Copy the resulting `vault_...` ID somewhere safe.

**If the Console UI doesn't support MCP OAuth credentials**, use the scripted fallback:

- [ ] Run `npm run mint-supabase-tokens`
  - Opens a browser tab to Supabase's OAuth consent screen.
  - Prints five `SUPABASE_MCP_*` values to stdout.
- [ ] Paste those five values into `.env.local` (do not commit).
- [ ] Run `npm run setup-vault`
  - Creates the vault + credential via SDK.
  - Prints `ANTHROPIC_SUPABASE_VAULT_ID=vault_...`.

### 1.2 Persist env vars

- [ ] Add to `.env.local` (gitignored — stays local):
  ```
  SUPABASE_PROJECT_REF=utixbzraliglhjxgfzrv
  ANTHROPIC_SUPABASE_VAULT_ID=<id from 1.1>
  ```
- [ ] Add the same two vars to Vercel for **Production**, **Preview**, **Development** (dashboard → project → Settings → Environment Variables, or `vercel env add`).

### 1.3 Run the smoke test

- [x] `npm run smoke-test-mcp` — attempted 2026-04-18. Managed-agent event stream failed on Supabase `isError: true` translation (Anthropic gateway surfaces `"Tool execution was interrupted by a crash. Please retry."` instead of the actual SQL error; the model retries, recrashes, and the SDK times out ~5 min later). Captured as a Phase 4 risk in `plans/tool-inventory.md` §Observability; not a Phase 2 blocker.
- [x] RLS probe verdict captured via **direct MCP HTTP probe** (bypassing the managed-agent stream, which is buggy). Sent `tools/call execute_sql { query: "SELECT count(*) FROM auth.users" }` to `https://mcp.supabase.com/mcp?project_ref=utixbzraliglhjxgfzrv` with the Supabase PAT as bearer. Response: `[{"c":1}]`.
- [x] **Verdict: `auth.users READABLE`** — the PAT is broadly privileged, not project-scoped. Per R-B4 decision tree, Phase 2 wraps all CRM writes in an `execute_crm_write` custom tool to preserve `ai_actions` rows.

### Observed side effects (cleanup reference)

- **Anthropic vaults** — three were created during debugging. Only `vlt_011CaAX3QC7jKibTcX44ouZS` (PAT-backed) works and is referenced from `.env.local`. Two orphans are safe to delete from the Console:
  - `vlt_011CaAUKqVzKLqunBXJoXjZw` — created via Console UI; OAuth consent never issued a usable token.
  - `vlt_011CaAVfGEQxtJ1u6jmWBvfQ` — created by `setup-vault.ts` OAuth path; holds an opaque `sbp_oauth_*` token Supabase rejects as "JWT could not be decoded".
- **Supabase Dynamic Client Registrations** — two orphan DCRs (`5d64790e-…` and `bb2ae074-…`) were issued during OAuth debugging. Harmless; no action required.
- **Supabase PAT** — a PAT named `syntric-labs-managed-agents` exists on the account and backs the working vault. Keep it; rotating it will invalidate the vault credential.

### 1.4 Verify cleanup

- [ ] In the Anthropic Console, confirm the disposable agent (`phase1-smoke-agent-…`) and environment (`phase1-smoke-env-…`) were deleted/archived by the smoke test.
- [ ] The vault `syntric-supabase-mcp` should still exist (the smoke test never deletes it).

### 1.5 Hand back to Claude

Tell Claude the smoke test passed and what the RLS verdict was. Claude will:
- Flip Phase 1 `[ ]` → `[x]` in `managed-agents-implementation.md` with a one-line outcome note.
- If RLS came back `READABLE`, add the Phase 2 `execute_crm_write` constraint inline in the plan.
- Commit: `chore(managed-agents): phase 1 — provision supabase mcp vault and smoke test`.

### Stop criteria (abort and revisit Proposal B §R-B2)

- Console UI lacks MCP OAuth **and** `npm run mint-supabase-tokens` fails during DCR.
- `npm run setup-vault` returns 4xx after token submission (SDK / beta-header mismatch).
- Smoke test deals query returns empty despite deals existing in the DB (vault credential not reaching Supabase).

---

## Phase 2 — Tool inventory decision

Claude walked `src/lib/ai/tools.ts` (SHA `523bb67`) and produced `plans/tool-inventory.md`. R-B4 resolved to **wrap writes** given Phase 1 RLS = READABLE.

### 2.1 Phase 1 RLS verdict (historical record)
- [x] RLS verdict: **READABLE** (captured 2026-04-18 via direct MCP `tools/call execute_sql { query: "SELECT count(*) FROM auth.users" }` with the PAT bearer. Returned `[{"c":1}]`). See §1.3 above for full context, including the managed-agent gateway bug that kept the standard smoke test from passing.

### 2.2 Review the inventory (~10 min)
- [ ] Open `plans/tool-inventory.md`. Spot-check:
  - Category A list (13 tools): nothing touches Gmail, Puppeteer, OpenAI embeddings, or `pending_actions`.
  - Category B list: every tool names a clear reason (external dep / confirm flow / `execute_crm_write` coverage / provider tool).
  - R-B4 paragraph: cites RLS = READABLE, picks wrap branch.
  - Phase 4 risk note on the Anthropic managed-agent gateway error-translation bug is preserved.

### 2.3 Audit-preserving wrapper
- [x] `execute_crm_write` wrapper approach confirmed during Phase 2 classification — single custom tool covers the 20 CRM-write `tool()` definitions and re-uses `withAIAudit` so `ai_actions` rows continue to record the original action name.

### 2.4 Vercel env vars (long-term)
- [ ] Propagate these two to Vercel (Production + Preview + Development). The `SUPABASE_MCP_*` and `SUPABASE_MCP_PAT` entries stay local-only — they're script-time only, not runtime.
  - `SUPABASE_PROJECT_REF=utixbzraliglhjxgfzrv`
  - `ANTHROPIC_SUPABASE_VAULT_ID=vlt_011CaAX3QC7jKibTcX44ouZS`

### 2.5 Hand back to Claude
- [ ] Confirm inventory looks right. Claude has already flipped Phase 2 `[ ]` → `[x]` and committed `chore(managed-agents): phase 2 — tool inventory and observability decision`.

### Stop criteria
- A tool in `tools.ts` resists A/B/C classification → split or clarify before proceeding. (None did; all 42 entries + `undo` are categorized.)

---

## Phase 3 — Agent creation script

Claude has committed `scripts/managed-agent/{custom-tool-schemas,build-agent-tools,setup-agent,update-system-prompt}.ts` plus two new npm scripts. The work below is everything outside the repo.

### 3.1 Preflight

- [ ] Confirm `.env.local` has `ANTHROPIC_API_KEY`, `SUPABASE_PROJECT_REF`, `ANTHROPIC_SUPABASE_VAULT_ID` (Phase 1 artifact — should already be there). If not, re-run Phase 1 first.
- [ ] Confirm `.env.local` does **NOT** already have `ANTHROPIC_AGENT_ID`. The setup script aborts if it does (idempotency guard — we never want to accidentally create a second agent). If you need to redo this step for any reason, unset that var first.

### 3.2 Create the environment + agent (one-shot)

- [x] `npm run setup-agent` run 2026-04-17. Produced:
  - `ANTHROPIC_ENV_ID=env_01Vk6iyzeWm5v7881N33tZTE`
  - `ANTHROPIC_AGENT_ID=agent_011CaAaKRToubdNFCu7CERao`
  - `ANTHROPIC_AGENT_VERSION=1`
- [x] Three IDs appended to `.env.local` already.
- Two bugs surfaced + worked around in `build-agent-tools.ts` on first-run; script is correct going forward. See Phase 3 tracker entry for details.
- One orphan environment (`env_018R6bj9nPYW9LZNsviuxUpB`) was created during the initial failed attempt and has been deleted. The current live environment is the one above.

### 3.3 Propagate to Vercel

- [ ] Add all three vars (`ANTHROPIC_ENV_ID`, `ANTHROPIC_AGENT_ID`, `ANTHROPIC_AGENT_VERSION`) to Vercel for **Production**, **Preview**, **Development** (dashboard → Settings → Environment Variables, or `vercel env add`). Claude can't do this — it's a manual step before Phase 4a.

### 3.4 Verify in the Anthropic Console

- [ ] Open console.anthropic.com → Managed Agents.
- [ ] Find the `syntric-crm-env` environment.
- [ ] Find the `syntric-crm-telegram` agent. Confirm:
  - Model: `claude-sonnet-4-6`.
  - Tool count: **11 entries** (1 `mcp_toolset` for supabase + 1 `agent_toolset_20260401` enabling `web_search` + 9 `custom` tools — `generate_document`, `generate_custom_document`, `send_document_to_client`, `send_email`, `semantic_search`, `hard_delete_client`, `hard_delete_contact`, `hard_delete_lead`, `execute_crm_write`).
  - System prompt byte-matches `buildSystemPrompt({}, 'telegram')` output (copy + diff locally if curious).
  - MCP server bound to the PAT-backed vault from Phase 1 (`vlt_011CaAX3QC7jKibTcX44ouZS`).
- [ ] Running `npm run setup-agent` a second time should fail immediately with `ANTHROPIC_AGENT_ID is already set` — sanity check the idempotency guard.

### 3.5 Iteration going forward (reference, not a one-time step)

Whenever the system prompt changes (edit `src/lib/ai/system-prompt.ts`) or the tool schemas change (edit `scripts/managed-agent/custom-tool-schemas.ts`):

1. `npm run update-system-prompt -- --dry-run` to preview.
2. `npm run update-system-prompt` to apply — prints the new version.
3. Paste the new `ANTHROPIC_AGENT_VERSION` into `.env.local` + Vercel.

Never re-run `setup-agent` once `ANTHROPIC_AGENT_ID` is set.

### 3.6 Hand back to Claude

- [ ] Confirm the Console view matches expectations. Claude will have already flipped Phase 3 `[ ]` → `[x]` in the implementation plan and committed `chore(managed-agents): phase 3 — agent creation script`.

### Stop criteria (abort and debug)

- `setup-agent` throws `400` on `agents.create` with "Extra inputs are not permitted" → `input_schema` grew an extra top-level key somehow. The `toInputSchema` helper in `build-agent-tools.ts` must emit only `{type, properties, required}`.
- `setup-agent` throws `400` with "pattern must be a valid regex" → Zod added a regex-patterned field (`.email()`, `.uuid()`, `.url()`, `.regex()`) and the recursive `sanitizeNested` helper didn't strip `pattern`. Check that key isn't on the skip list.
- System prompt in the Console is empty / truncated → check that the relative import `../../src/lib/ai/system-prompt` resolved under `tsx`. The `@/` path alias is declared in `tsconfig.json` and `tsx` respects it, but the scripts use relative paths to be hermetic.
- Only 10 tools in the Console (missing one custom tool) → `buildAgentTools()` should return 11 entries (run `npx tsx -e "import {buildAgentTools} from './scripts/managed-agent/build-agent-tools'; console.log(buildAgentTools().length)"`).

---

## Phase 4a — Bridge scaffolding (session create/resume)

Claude has added `src/lib/managed-agent/{client,session}.ts` and wired a feature-flagged branch into `src/app/api/telegram/webhook/route.ts`. The new branch only fires when `USE_MANAGED_AGENT=1`; otherwise the existing `handleChatGenerate` path runs untouched. `/reset` has been renamed to `/clear` (Claude Code convention) and now also strips `metadata.agent_session_id` so the next turn mints a fresh session. The work below is everything outside the repo.

### 4a.1 Preflight (`.env.local`)

- [ ] Confirm `.env.local` has all five vars needed for the managed-agent path:
  - `ANTHROPIC_API_KEY`
  - `ANTHROPIC_AGENT_ID` (from Phase 3)
  - `ANTHROPIC_AGENT_VERSION` (from Phase 3)
  - `ANTHROPIC_ENV_ID` (from Phase 3)
  - `ANTHROPIC_SUPABASE_VAULT_ID` (from Phase 1)
- [ ] Do **NOT** add `USE_MANAGED_AGENT` to `.env.local` — the flag is intentionally opt-in per shell invocation so the existing path stays live during dev.
- [ ] Vercel propagation is deferred to Phase 8. No Vercel changes in this phase.

### 4a.2 Local dev server

- [ ] Start with the flag: `USE_MANAGED_AGENT=1 npm run dev`
- [ ] Expose the webhook to Telegram — either
  - `ngrok http 3000` and temporarily point the bot's webhook at `https://<ngrok>.ngrok-free.app/api/telegram/webhook`, **or**
  - construct a `curl` that mimics the Telegram POST body with `x-telegram-bot-api-secret-token: $TELEGRAM_WEBHOOK_SECRET` and `message.from.id = $TELEGRAM_AUTHORIZED_USER_ID`.

### 4a.3 Two-ping session-resume check

- [ ] **Ping 1:** send any non-command text to the bot. Expect reply: `[managed-agent wip] session sess_xxx`.
- [ ] **Ping 2:** send different text. Expect reply with the **same** `sess_xxx` ID — this confirms `getOrCreateSession` is reading the persisted ID rather than creating a new session each turn.

### 4a.4 Supabase spot-check

- [ ] Run in Supabase SQL editor (or `psql`):
  ```sql
  select id, metadata from conversations where external_id = '<your-chat-id>';
  ```
- [ ] Confirm `metadata` contains `{"agent_session_id": "sess_xxx"}` matching the ID echoed in Telegram.

### 4a.5 Anthropic Console spot-check

- [ ] Open console.anthropic.com → Managed Agents → `syntric-crm-telegram` → Sessions.
- [ ] Confirm one session exists with title `telegram-<chatId>` and the `conversation_id` + `channel=telegram` metadata keys are set.

### 4a.6 Regression check (flag off)

- [ ] Stop the dev server, restart without the flag: `npm run dev`.
- [ ] Ping the bot. Expect a real answer from `handleChatGenerate` (old path). This confirms the feature flag cleanly gates the new branch.

### 4a.7 `/clear` behavior check

- [ ] Send `/clear`. Expect `Context cleared. Starting fresh — what's up?`.
- [ ] Re-check Supabase: `metadata` should no longer contain `agent_session_id`; `messages` rows for that conversation should be gone.
- [ ] Restart with `USE_MANAGED_AGENT=1 npm run dev` and ping once — expect a **new** `sess_xxx` ID (different from the pre-`/clear` one).
- [ ] Send `/reset` (old name). Expect it to fall through to the normal message-handling path — i.e. treated as regular text, not the clear command.

### 4a.8 Hand back to Claude

- [ ] Confirm all checks above pass. Claude has already flipped Phase 4a `[ ]` → `[x]` and will commit `feat(managed-agents): phase 4a — session create/resume scaffolding` once you give the green light.

### Stop criteria (abort and debug)

- Ping 1 returns an error rather than `[managed-agent wip] session sess_xxx` → check that all five env vars from 4a.1 are set in the shell running `npm run dev` (not just `.env.local` — Next.js only auto-loads that file for dev; `USE_MANAGED_AGENT` must be exported in the invocation).
- Ping 2 returns a different `sess_xxx` than Ping 1 → the Supabase update after session creation failed; inspect server logs and confirm the service-role client has update permission on `conversations.metadata`.
- Flag-off ping fails with a managed-agent import-time error → `client.ts` was imported eagerly somewhere it shouldn't be. The lazy `AGENT_ID()` / `AGENT_VERSION()` getters are there precisely to keep the off-path clean.

---

## Phases 4b–8

_(Populate as each phase begins.)_
