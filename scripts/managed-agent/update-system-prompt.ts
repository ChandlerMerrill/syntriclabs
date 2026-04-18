/**
 * Iteration helper. Rebuilds the system prompt and the full tool array,
 * fetches the current agent version (required by the update API for
 * optimistic concurrency), and calls `client.beta.agents.update`.
 *
 * Prints the bumped version number; paste it into `.env.local` + Vercel.
 *
 * Flags:
 *   --dry-run   Print prompt length + tool count, skip the API call.
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()
import Anthropic from '@anthropic-ai/sdk'
import { buildSystemPrompt } from '../../src/lib/ai/system-prompt'
import { buildAgentTools } from './build-agent-tools'

const { ANTHROPIC_API_KEY, ANTHROPIC_AGENT_ID } = process.env
const dryRun = process.argv.includes('--dry-run')

function fail(msg: string): never {
  console.error(`[update-system-prompt] ERROR: ${msg}`)
  process.exit(1)
}

if (!ANTHROPIC_API_KEY) fail('ANTHROPIC_API_KEY is not set')
if (!ANTHROPIC_AGENT_ID) {
  fail(
    'ANTHROPIC_AGENT_ID is not set. Run `npm run setup-agent` first (one-shot), paste the three IDs into .env.local, then retry.',
  )
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

async function main() {
  const system = buildSystemPrompt({}, 'telegram')
  const tools = buildAgentTools()
  console.log(`[update-system-prompt] agent=${ANTHROPIC_AGENT_ID}`)
  console.log(`[system] ${system.length} chars`)
  console.log(`[tools]  ${tools.length} entries`)

  if (dryRun) {
    console.log('\n[dry-run] skipping API call. Preview of system prompt:\n')
    console.log(system.slice(0, 1200) + (system.length > 1200 ? '\n…(truncated)' : ''))
    return
  }

  const agents = client.beta.agents as unknown as {
    retrieve: (id: string) => Promise<{ version: number }>
    update: (id: string, p: { version: number; system: string; tools: unknown }) => Promise<{ version: number }>
  }

  const current = await agents.retrieve(ANTHROPIC_AGENT_ID!)
  console.log(`[current] version ${current.version}`)

  const updated = await agents.update(ANTHROPIC_AGENT_ID!, {
    version: current.version,
    system,
    tools,
  })
  console.log(`[updated] version ${updated.version}`)

  console.log('\n════════ PASTE INTO .env.local ════════')
  console.log(`ANTHROPIC_AGENT_VERSION=${updated.version}`)
  console.log('═══════════════════════════════════════')
  console.log('\nAlso update this in Vercel env vars')
  console.log('(Production + Preview + Development).')
}

main().catch(err => {
  console.error('[update-system-prompt] fatal:', err)
  process.exit(1)
})
