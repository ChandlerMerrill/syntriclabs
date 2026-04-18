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

_(Populate when Phase 2 starts.)_

---

## Phase 3 — Agent creation script

_(Populate when Phase 3 starts. Will include: running `setup-agent.ts` once, persisting `ANTHROPIC_ENV_ID` / `ANTHROPIC_AGENT_ID` / `ANTHROPIC_AGENT_VERSION` to `.env.local` + Vercel.)_

---

## Phases 4–8

_(Populate as each phase begins.)_
