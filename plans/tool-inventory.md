# Tool inventory — managed agents migration

> Produced in Phase 2. Consumed by Phase 3 (custom tool schemas) and Phase 5b (handler port).
> Source: walkthrough of `src/lib/ai/tools.ts` on commit `523bb67` (feat/managed-agents).
> Phase 1 RLS verdict: **READABLE** — see `managed-agents-setup.md` §1.3.

## Summary

The `crmTools` object in `src/lib/ai/tools.ts` registers **42 entries**: 41 `tool()` definitions + 1 Anthropic provider tool (`web_search`). Plus one admin-only helper (`undo`) lives in `src/lib/ai/undo.ts` outside the registry.

| Category | `tool()` definitions | Custom tool schemas to register in Phase 3 | What happens to them |
|---|---|---|---|
| A — delete (Supabase MCP handles) | 13 | 0 | Removed from `tools.ts` in Phase 6; agent calls `execute_sql` via Supabase MCP |
| B — keep as custom tool | 28 | **9** (5 external + 3 confirm + 1 `execute_crm_write`) + **1 provider tool** (`web_search`, Anthropic-native) | Registered as `{ type: 'custom', ... }` on the agent in Phase 3; handlers ported in Phase 5b |
| C — defer (not called by agent) | 0 (in `crmTools`) | 0 | `undo` lives outside `crmTools`; admin-UI path unchanged |

**Two counts for Category B.** Counted per `tool()` in `tools.ts`, B = 28 (includes 20 CRM writes that will be rolled up under a single `execute_crm_write` dispatcher). Counted per custom tool schema registered on the agent, B = 9. The resume plan's "16–20" verification band did not anticipate the 20-write R-B4 roll-up; the explicit enumeration in the plan's A/B/C criteria is authoritative and matches this inventory.

**Total walked:** 42 entries in `crmTools` (13 A + 28 B + 1 provider) + 1 external helper (`undo`, C). Every entry is classified.

---

## Category A — delete (Supabase MCP `execute_sql` replaces)

Pure reads over allowlisted CRM tables or schema/SQL inspection. No external dependencies, no audit wrappers critical to behavior, no `pending_actions`. The agent reaches these via `execute_sql` against the tables directly in the new path.

- `getClientInfo` — Get detailed info about a specific client including their contacts. **Replaced by:** `execute_sql` over `clients`, `contacts`.
- `listClients` — List all clients, optionally filtered by status, industry, or search. **Replaced by:** `execute_sql` over `clients`.
- `getProjectInfo` — Get detailed info about a specific project. **Replaced by:** `execute_sql` over `projects`.
- `listProjects` — List all projects, optionally filtered by client, status, or search. **Replaced by:** `execute_sql` over `projects`.
- `getDealInfo` — Get detailed info about a specific deal including stage history. **Replaced by:** `execute_sql` over `deals`.
- `listDeals` — List all deals in the pipeline, optionally filtered. **Replaced by:** `execute_sql` over `deals`.
- `getClientActivities` — Get recent activity history for a client. **Replaced by:** `execute_sql` over `activities`.
- `searchEmails` — Search stored emails by query, client, or direction. **Replaced by:** `execute_sql` over `emails` (read-only; Gmail send path is Category B `sendEmail`).
- `getEmailThread` — Get all emails in a Gmail thread with body text. **Replaced by:** `execute_sql` over `emails`.
- `searchTranscripts` — Search meeting transcripts by query or client. **Replaced by:** `execute_sql` over `transcripts`.
- `getTranscriptDetail` — Get full transcript detail including action items and raw content. **Replaced by:** `execute_sql` over `transcripts`.
- `querySql` — Run an arbitrary SELECT against the allowlisted tables with row cap. **Replaced by:** MCP `execute_sql` directly — the whole reason this tool existed was to expose raw SELECT, which MCP now does.
- `describeSchema` — Inspect schema for allowlisted tables. **Replaced by:** MCP `list_tables` / `execute_sql` against `information_schema`.

---

## Category B — keep as custom tool

### B.1 External-dependency tools (5)
Need host-side secrets (Gmail OAuth, OpenAI API key) or host-side execution (Puppeteer) that the MCP server cannot provide.

- `generateDocument` — Generate a proposal/price-sheet/contract PDF for a client. **Reason:** Puppeteer (`generateDocumentService` in `src/lib/documents/`). Input: `type:enum, title:string, client_id:string, deal_id?:string, content_data:record`.
- `generateCustomDocument` — Generate a branded PDF from freeform markdown. **Reason:** Puppeteer. Input: `title:string, subtitle?:string, body:string, sections?:array, client_id?:string, deal_id?:string, project_id?:string`. Wraps with `withAIAudit`.
- `sendDocumentToClient` — Email a generated document with PDF attachment. **Reason:** Host-side HTTP POST to `/api/documents/send` + Gmail API underneath. Input: `documentId:string, recipientEmail?:string, message?:string`.
- `sendEmail` — Send a branded email via Gmail. **Reason:** Gmail API (`sendMessage`, `renderBrandedEmail`). Input: `to:string, subject:string, body:string, cc?:string, threadId?:string, inReplyTo?:string, references?:string`.
- `semanticSearch` — Cross-entity semantic search. **Reason:** OpenAI embeddings via `searchSimilar`. Input: `query:string, types?:array, limit?:number`.

### B.2 Two-step confirm flows (3)
Use `createPendingAction` + `consumeConfirmToken` against the `pending_actions` table. The confirm/commit pattern is tool-call-shaped — MCP cannot express "first call issues a token, second call consumes it" across two turns without host-side state.

- `hardDeleteClient` — Permanently delete one or many clients (cascades). Input: `ids:array, confirmToken?:string`. Max 25 IDs per call.
- `hardDeleteContact` — Permanently delete one or many contacts. Input: `ids:array, confirmToken?:string`.
- `hardDeleteLead` — Permanently delete one or many widget leads. Input: `ids:array, confirmToken?:string`. Prefer `dismissLead` for soft delete.

No separate `confirmPending` tool exists — each hardDelete\* tool accepts its own `confirmToken` argument and self-consumes via `consumeConfirmToken`.

### B.3 Provider tools (1)
- `web_search` — Anthropic-native server-side tool (`anthropic.tools.webSearch_20250305`). Registered in `crmTools` at `tools.ts:1282`, but executed by Anthropic's gateway, not by our code. Stays Anthropic-native in the new path — register on the agent as `{ type: 'web_search_20250305', max_uses: 5 }`, no custom handler needed. Provider tool calls are audited today via `logProviderToolCall` in `handler.ts:75–80` — Phase 5a needs to preserve that audit path in the managed-agent bridge's event loop.

### B.4 `execute_crm_write` coverage (R-B4 = wrap) (20 writes → 1 dispatcher)
Under R-B4 = **wrap** (Phase 1 RLS = READABLE), all CRM writes are dispatched through a single `execute_crm_write` custom tool that re-uses `withAIAudit`. The tool's `input_schema` takes `{ action: enum, params: record }` and internally delegates to MCP `execute_sql` for the actual mutation — the wrapper exists solely to capture `ai_actions` rows on every write. Writes covered:

| tool() name | Target row source | Audit-critical? |
|---|---|---|
| `createClient` | `clients` | yes |
| `updateClient` | `clients` | yes (pre-image needed for reversal) |
| `archiveClient` | `clients.status = 'inactive'` | yes |
| `createContact` | `contacts` | yes |
| `updateContact` | `contacts` | yes |
| `createLead` | `leads` | yes |
| `updateLead` | `leads` | yes |
| `convertLeadToClient` | `leads` → `clients` + `contacts` | yes (multi-row) |
| `dismissLead` | `leads.status = 'dismissed'` | yes |
| `createDeal` | `deals` (stage_history init) | yes |
| `updateDeal` | `deals` (non-stage fields) | yes |
| `updateDealStage` | `deals.stage` + stage_history append | yes (won/lost requires reason) |
| `archiveDeal` | `deals.is_archived = true` | yes |
| `createProject` | `projects` | yes |
| `updateProject` | `projects` (non-status fields) | yes |
| `updateProjectStatus` | `projects.status` | yes (paused/cancelled needs reason) |
| `addActivity` | `activities` | yes |
| `logFollowUp` | `activities` (note with due_date in metadata) | yes |
| `writeSql` | arbitrary INSERT/UPDATE with pre-image snapshot | yes (reversal_hint captured today) |
| `updateDocumentStatus` | `documents.status` | yes |

**Total under `execute_crm_write`:** 20 distinct semantic actions, all currently wrapped with `withAIAudit` and many carrying additional validation (e.g. stage change reason requirements, archive reason requirements, pre-image snapshot for `writeSql`). Phase 5b must preserve these constraints inside the dispatcher — they are not captured by MCP `execute_sql` alone.

---

## Category C — defer (not called by agent)

- `undo` — Reverses a prior `ai_actions` row using its `reversal_hint`. Lives in `src/lib/ai/undo.ts`, imported only by `src/app/api/ai/undo/route.ts`. Not present in `crmTools`, not reachable from the Telegram agent. Admin-UI trigger only. Left untouched by this migration.

---

## Observability decision (R-B4)

All CRM writes wrapped in an `execute_crm_write` custom tool that re-uses `withAIAudit` and issues MCP `execute_sql` internally. `ai_actions` audit trail preserved at the cost of one extra custom-tool hop per mutation. Chosen because Phase 1 RLS = READABLE; revisit once RLS is tightened.

### What `withAIAudit` captures today (source: `src/lib/ai/audit.ts`)
- `tool_name` — the tool being invoked.
- `args` — full input record as JSON.
- `result` — full return record as JSON.
- `status` — `'success'` or `'error'` (auto-flipped if `result.error` is a string).
- `error_message` — captured from thrown errors or `result.error`.
- `conversation_id`, `channel` — from `experimental_context` (Phase 5a moves this to `AsyncLocalStorage`).
- `client_id` — extracted from args or result via `extractClientId`.
- `reversal_hint` — pre-image snapshot when the tool surfaces one (used by `undo`).
- Plus an optional `activities` row via `logAutoActivity` when `opts.logActivity` is true.

### What we lose under wrap-mode

Nothing structurally — `execute_crm_write` re-enters `withAIAudit` exactly as the per-write `tool()` does today. The single concrete loss is **one extra hop per write**: the agent calls `execute_crm_write`, which calls MCP `execute_sql`, instead of the agent calling the write tool directly. That hop is cheap (no extra model turns — the wrapper is pure dispatch) and is the price of keeping `ai_actions` intact while RLS is broad.

### Observability gap surfaced during Phase 1 (Phase 4 risk)

During Phase 1 smoke testing against the Anthropic managed-agent event stream, the gateway translated Supabase MCP `isError: true` JSON-RPC responses into the opaque event `"Tool execution was interrupted by a crash. Please retry."`. The model retried verbatim, re-crashed, and the SDK's undici stream eventually hit a body timeout (~5 min). Direct HTTP calls to the Supabase MCP server (bypassing the managed-agent gateway) return the proper error payloads cleanly — the bug is in Anthropic's event translation, not in Supabase.

**Impact for Phase 4:** the bridge's event loop needs defensive handling around the crash-translation event — specifically a max-retry cap, or a heuristic to short-circuit the stream when the same MCP call errors twice in a row. Cleanup (agent archive, env delete) runs correctly after the timeout, so session state doesn't leak.

**Not a Phase 2 blocker** — Phase 2's artifact is this inventory and the R-B4 decision, both of which are independent of the gateway bug. Flagged here so a future Phase 4a session surfaces it before writing the event loop.

---

## Per-tool appendix (Category B port notes)

### B.1 external-dependency tools

- **`generateDocument` / `generateCustomDocument`** — current handler lives in `src/lib/documents/`. `generateCustomDocument` wraps with `withAIAudit`; `generateDocument` does not (inconsistent — Phase 5b should standardize). Both ultimately call `/api/documents/generate` via Puppeteer. No `experimental_context` read; they don't need Phase 5a adapter work.
- **`sendDocumentToClient`** — HTTP POST to `/api/documents/send`. No audit wrapper today. Consider whether to add `withAIAudit` during the port.
- **`sendEmail`** — direct Gmail API call via `sendMessage`. Creates an auto-logged activity; the activity logic stays in the underlying helper, not in the tool wrapper. Auto-log path will need the new `getAgentCtx()` if it currently reads `experimental_context`.
- **`semanticSearch`** — thin wrapper around `searchSimilar` in `src/lib/search/`. No audit, no context. Cleanest port.

### B.2 two-step confirm tools

All three `hardDelete*` tools:
- Call `createPendingAction` on the first invocation (without `confirmToken`) to mint a token and return confirmation details to the user.
- On second invocation (with `confirmToken`), call `consumeConfirmToken` to validate and redeem.
- Pre-image snapshot into `reversal_hint` before deletion (so `undo` can re-insert).
- Max 25 IDs per call — enforced in tool; Phase 5b must preserve this limit.

Phase 5b order-of-port (ascending risk): `semanticSearch` → `searchEmails`/`getEmailThread` are already Category A so skip → `sendEmail` → `generateDocument` + `generateCustomDocument` → `sendDocumentToClient` → `hardDeleteClient` / `hardDeleteContact` / `hardDeleteLead` last.

### B.4 `execute_crm_write` dispatcher (single custom tool)

Phase 5b will need to build a single `execute_crm_write` handler that:
1. Accepts `{ action: '<tool-name>', params: { ... } }`.
2. Dispatches to the 20 existing helpers (`createClientRow`, `updateClientRow`, `createDealRow`, …) inside `src/lib/services/`.
3. Wraps the whole dispatch in `withAIAudit('<action>', ...)` so the outer `ai_actions` row records the original tool name, not the generic `execute_crm_write`.
4. Preserves validation not expressible in pure SQL: required reasons for `archiveDeal` / `updateDealStage(lost)` / `updateProjectStatus(paused|cancelled)`; pre-image snapshot for `writeSql`.

Phase 3's tool schema for `execute_crm_write` should be a discriminated union over the 20 actions so Claude picks a specific shape. See Phase 3 for the exact schema.
