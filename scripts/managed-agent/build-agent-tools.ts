/**
 * Shared helper: builds the full `tools` array passed to
 * `client.beta.agents.create` and `client.beta.agents.update`.
 *
 * Keeps `setup-agent.ts` and `update-system-prompt.ts` byte-identical on
 * the tool configuration so the two scripts can't drift.
 *
 * The tools array contains three kinds of entries:
 *   1. `mcp_toolset` for the Supabase MCP server (all tools exposed).
 *   2. `agent_toolset_20260401` enabling the provider `web_search` tool.
 *   3. `custom` entries — one per Zod schema in `custom-tool-schemas.ts`.
 *
 * Top-level `input_schema` on custom tools accepts only { type, properties,
 * required } per the SDK's BetaManagedAgentsCustomToolInputSchema — extras
 * like `$schema`, `additionalProperties`, or `oneOf` are rejected by the
 * API (400 "Extra inputs are not permitted"). We strip them here.
 */
import { z } from 'zod'
import {
  customToolSchemas,
  descriptions,
  execute_crm_write,
} from './custom-tool-schemas'

export const MCP_SERVER_NAME = 'supabase'

type InputSchema = {
  type: 'object'
  properties?: Record<string, unknown>
  required?: string[]
}

type AgentTool =
  | { type: 'mcp_toolset'; mcp_server_name: string }
  | {
      type: 'agent_toolset_20260401'
      default_config: { enabled: boolean; permission_policy: { type: 'always_allow' } }
      configs: Array<{
        name: 'web_search'
        enabled: true
        permission_policy: { type: 'always_allow' }
      }>
    }
  | {
      type: 'custom'
      name: string
      description: string
      input_schema: InputSchema
    }

const CRM_WRITE_ACTIONS = [
  'createClient', 'updateClient', 'archiveClient',
  'createContact', 'updateContact',
  'createLead', 'updateLead', 'convertLeadToClient', 'dismissLead',
  'createDeal', 'updateDeal', 'updateDealStage', 'archiveDeal',
  'createProject', 'updateProject', 'updateProjectStatus',
  'addActivity', 'logFollowUp',
  'writeSql', 'updateDocumentStatus',
] as const

// Zod v4's `z.toJSONSchema` emits JSON Schema 2020-12 — includes `$schema`
// and `additionalProperties: false`. The Anthropic custom-tool input_schema
// only accepts { type, properties, required } at top level, so flatten to
// exactly those keys. Zod also emits ECMAScript-regex `pattern` strings for
// `.email()` / `.uuid()` / `.url()` that Anthropic's schema validator rejects
// as "pattern must be a valid regex" — strip `pattern` recursively and keep
// the simpler `format` hint, which Claude handles natively.
function sanitizeNested(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeNested)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'pattern' || k === '$schema') continue
      out[k] = sanitizeNested(v)
    }
    return out
  }
  return value
}

function toInputSchema(schema: z.ZodTypeAny): InputSchema {
  const raw = z.toJSONSchema(schema) as Record<string, unknown>
  if (raw.type !== 'object' || typeof raw.properties !== 'object') {
    throw new Error(
      `Custom-tool schemas must serialize to a top-level object. Got: ${JSON.stringify(raw).slice(0, 200)}`,
    )
  }
  return {
    type: 'object',
    properties: sanitizeNested(raw.properties) as Record<string, unknown>,
    required: Array.isArray(raw.required) ? (raw.required as string[]) : undefined,
  }
}

function buildExecuteCrmWriteSchema(): InputSchema {
  // Discriminated union at the top level isn't representable inside
  // Anthropic's input_schema (no `oneOf`). Flatten to { action, params }
  // and rely on Phase 5b's Zod validator + the description text to keep
  // Claude on-shape.
  return {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: CRM_WRITE_ACTIONS,
        description: 'Which write to dispatch. Determines the required shape of `params`.',
      },
      params: {
        type: 'object',
        description: 'Arguments for the chosen action. See tool description for per-action shapes.',
      },
    },
    required: ['action', 'params'],
  }
}

export function buildAgentTools(): AgentTool[] {
  const tools: AgentTool[] = []

  // 1. Supabase MCP — default config exposes every tool on the server.
  tools.push({ type: 'mcp_toolset', mcp_server_name: MCP_SERVER_NAME })

  // 2. Provider tool: web_search. The managed-agents tool union exposes
  // built-in provider tools through `agent_toolset_20260401`, not through
  // the old-style `web_search_20250305` message block.
  tools.push({
    type: 'agent_toolset_20260401',
    default_config: { enabled: false, permission_policy: { type: 'always_allow' } },
    configs: [
      { name: 'web_search', enabled: true, permission_policy: { type: 'always_allow' } },
    ],
  })

  // 3. Custom tools — one per Zod schema.
  for (const { name, schema } of customToolSchemas) {
    const baseDesc = descriptions[name]
    if (!baseDesc) throw new Error(`Missing description for tool: ${name}`)

    const input_schema: InputSchema =
      name === 'execute_crm_write' ? buildExecuteCrmWriteSchema() : toInputSchema(schema)

    tools.push({ type: 'custom', name, description: baseDesc, input_schema })
  }

  // Keep the unused `execute_crm_write` Zod import live — it's re-exported
  // from custom-tool-schemas for Phase 5b's runtime validator.
  void execute_crm_write

  return tools
}
