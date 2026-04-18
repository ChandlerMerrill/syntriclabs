/**
 * One-shot setup script. Creates the Anthropic environment + agent, wires
 * up the Supabase MCP server (via the vault from Phase 1), registers the
 * custom tool schemas from Phase 2, and prints the three env vars the
 * webhook bridge (Phase 4a) needs.
 *
 * Run once:  npm run setup-agent
 *
 * Iteration afterwards goes through `update-system-prompt.ts` — never
 * re-run this file.
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from '../../src/lib/ai/system-prompt'
import { buildAgentTools, MCP_SERVER_NAME } from './build-agent-tools'

const {
  ANTHROPIC_API_KEY,
  SUPABASE_PROJECT_REF,
  ANTHROPIC_SUPABASE_VAULT_ID,
  ANTHROPIC_AGENT_ID,
} = process.env

function fail(msg: string): never {
  console.error(`[setup-agent] ERROR: ${msg}`)
  process.exit(1)
}

if (!ANTHROPIC_API_KEY) fail('ANTHROPIC_API_KEY is not set')
if (!SUPABASE_PROJECT_REF) fail('SUPABASE_PROJECT_REF is not set')
if (!ANTHROPIC_SUPABASE_VAULT_ID) fail('ANTHROPIC_SUPABASE_VAULT_ID is not set (run Phase 1 first)')

// Idempotency guard. An existing agent id in env means the caller almost
// certainly meant to run `update-system-prompt.ts` instead — creating a
// second agent leaves orphan resources and duplicate IDs to manage.
if (ANTHROPIC_AGENT_ID) {
  fail(
    `ANTHROPIC_AGENT_ID is already set (${ANTHROPIC_AGENT_ID}). ` +
      `setup-agent is one-shot — use \`npm run update-system-prompt\` to change the prompt or tool schemas. ` +
      `If you truly want a fresh agent, unset ANTHROPIC_AGENT_ID in .env.local first.`,
  )
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
const MCP_URL = `https://mcp.supabase.com/mcp?project_ref=${SUPABASE_PROJECT_REF}`
const AGENT_MODEL = 'claude-sonnet-4-6'

async function main() {
  console.log('[setup-agent] creating environment + agent')
  console.log(`  vault:   ${ANTHROPIC_SUPABASE_VAULT_ID}`)
  console.log(`  project: ${SUPABASE_PROJECT_REF}`)
  console.log(`  mcp url: ${MCP_URL}`)
  console.log(`  model:   ${AGENT_MODEL}`)

  const env = await (client.beta.environments as unknown as {
    create: (p: unknown) => Promise<{ id: string }>
  }).create({
    name: 'syntric-crm-env',
    config: {
      type: 'cloud',
      networking: { type: 'unrestricted' },
    },
  })
  console.log(`[env] created ${env.id}`)

  const system = buildSystemPrompt({}, 'telegram')
  console.log(`[system] ${system.length} chars`)

  const tools = buildAgentTools()
  console.log(`[tools] ${tools.length} entries (1 mcp + 1 agent_toolset + ${tools.length - 2} custom)`)

  const agent = await (client.beta.agents as unknown as {
    create: (p: unknown) => Promise<{ id: string; version: number }>
  }).create({
    name: 'syntric-crm-telegram',
    model: AGENT_MODEL,
    system,
    mcp_servers: [{ type: 'url', name: MCP_SERVER_NAME, url: MCP_URL }],
    tools,
  })
  console.log(`[agent] created ${agent.id} version ${agent.version}`)

  console.log('\n════════ PASTE INTO .env.local ════════')
  console.log(`ANTHROPIC_ENV_ID=${env.id}`)
  console.log(`ANTHROPIC_AGENT_ID=${agent.id}`)
  console.log(`ANTHROPIC_AGENT_VERSION=${agent.version}`)
  console.log('═══════════════════════════════════════')
  console.log('\nAlso add these three to Vercel env vars')
  console.log('(Production + Preview + Development).')
  console.log('\nNext: verify in Console → then proceed to Phase 4a.')
}

main().catch(err => {
  console.error('[setup-agent] fatal:', err)
  process.exit(1)
})
