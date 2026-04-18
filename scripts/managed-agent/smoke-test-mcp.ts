import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv() // fall through to .env if present
import Anthropic from '@anthropic-ai/sdk'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const VAULT_ID = process.env.ANTHROPIC_SUPABASE_VAULT_ID
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF

if (!ANTHROPIC_API_KEY) fail('ANTHROPIC_API_KEY is not set')
if (!VAULT_ID) fail('ANTHROPIC_SUPABASE_VAULT_ID is not set (run Phase 1 Step 1 first)')
if (!PROJECT_REF) fail('SUPABASE_PROJECT_REF is not set')

function fail(msg: string): never {
  console.error(`[smoke-test-mcp] ERROR: ${msg}`)
  process.exit(1)
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
const MCP_URL = `https://mcp.supabase.com/mcp?project_ref=${PROJECT_REF}`
const MCP_SERVER_NAME = 'supabase'

type QueryOutcome = {
  finalText: string
  toolUses: Array<{ name: string; input: unknown }>
  toolResults: Array<{ preview: string; isError: boolean }>
  timedOut: boolean
}

async function runQuery(sessionId: string, prompt: string, label: string): Promise<QueryOutcome> {
  console.log(`\n─── ${label} ───`)
  console.log(`> ${prompt}`)

  const stream = await client.beta.sessions.events.stream(sessionId)

  await client.beta.sessions.events.send(sessionId, {
    events: [
      { type: 'user.message', content: [{ type: 'text', text: prompt }] },
    ],
  })

  const outcome: QueryOutcome = { finalText: '', toolUses: [], toolResults: [], timedOut: false }

  for await (const event of stream as AsyncIterable<any>) {
    switch (event.type) {
      case 'agent.mcp_tool_use': {
        const name = event.tool_name ?? event.name ?? '<unknown>'
        const input = event.input ?? {}
        outcome.toolUses.push({ name, input })
        console.log(`  [mcp_tool_use] ${name}  input=${truncate(JSON.stringify(input), 300)}`)
        break
      }
      case 'agent.mcp_tool_result': {
        const isError = Boolean(event.is_error)
        const content = Array.isArray(event.content)
          ? event.content.map((c: any) => (typeof c === 'string' ? c : c?.text ?? JSON.stringify(c))).join('\n')
          : typeof event.content === 'string'
            ? event.content
            : JSON.stringify(event.content ?? {})
        const preview = truncate(content, 500)
        outcome.toolResults.push({ preview, isError })
        console.log(`  [mcp_tool_result${isError ? ' ERROR' : ''}] ${preview}`)
        break
      }
      case 'agent.message': {
        const blocks = Array.isArray(event.content) ? event.content : []
        for (const block of blocks) {
          if (block?.type === 'text' && typeof block.text === 'string') {
            outcome.finalText += block.text
          }
        }
        break
      }
      case 'session.status_terminated':
        console.log('  [session.status_terminated]')
        return outcome
      case 'session.status_idle': {
        const stopType = event.stop_reason?.type
        console.log(`  [session.status_idle] stop_reason=${stopType ?? '<none>'}`)
        if (stopType !== 'requires_action') {
          return outcome
        }
        break
      }
      case 'session.error':
      case 'agent.error': {
        console.log(`  [${event.type}] ${truncate(JSON.stringify(event), 300)}`)
        break
      }
    }
  }

  return outcome
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return `${s.slice(0, n)}…(${s.length - n} more chars)`
}

async function main() {
  console.log('[smoke-test-mcp] Phase 1 smoke test starting')
  console.log(`  vault:   ${VAULT_ID}`)
  console.log(`  project: ${PROJECT_REF}`)
  console.log(`  mcp url: ${MCP_URL}`)

  const env = await client.beta.environments.create({
    name: `phase1-smoke-env-${Date.now()}`,
    config: {
      type: 'cloud',
      networking: { type: 'unrestricted' },
    },
  } as any)
  console.log(`[env] created ${env.id}`)

  const agent = await client.beta.agents.create({
    name: `phase1-smoke-agent-${Date.now()}`,
    model: 'claude-haiku-4-5',
    system:
      'You are a smoke-test agent. When asked a question, use the supabase MCP tools to answer it. Return a concise summary of what the MCP returned.',
    mcp_servers: [
      { type: 'url', name: MCP_SERVER_NAME, url: MCP_URL },
    ],
    tools: [
      { type: 'mcp_toolset', mcp_server_name: MCP_SERVER_NAME },
    ],
  } as any)
  console.log(`[agent] created ${agent.id} (version ${(agent as any).version ?? '?'})`)

  let exitCode = 0
  let rlsProbeReadable = false

  try {
    const session = await client.beta.sessions.create({
      agent: agent.id,
      environment_id: env.id,
      vault_ids: [VAULT_ID!],
      title: 'phase1-smoke-session',
    } as any)
    console.log(`[session] created ${session.id}`)

    // Query 1 — happy path
    const q1 = await runQuery(
      session.id,
      'List the 5 most recent rows from the deals table with their id, name, and created_at. Return the rows as a short bullet list.',
      'Q1 — deals happy path',
    )

    const q1HasRows = q1.toolResults.some(r => !r.isError && /\b(id|created_at|name)\b/i.test(r.preview))
    console.log(`\n[q1] mcp_tool_uses=${q1.toolUses.length} mcp_tool_results=${q1.toolResults.length} hasRows=${q1HasRows}`)
    console.log(`[q1] final text:\n${q1.finalText || '<empty>'}`)

    if (q1.toolUses.length === 0) {
      console.error('[q1] FAIL: agent did not invoke any MCP tools')
      exitCode = 2
    } else if (!q1HasRows) {
      console.warn('[q1] WARN: no tool_result appeared to contain deal rows — verify manually from logs above')
      // not fatal — may still be a valid MCP round-trip with empty result
    }

    // Query 2 — RLS probe
    const q2 = await runQuery(
      session.id,
      'Run this SQL using the supabase MCP and tell me whether it succeeded or was denied: "select count(*) from auth.users". Report the exact error message if denied.',
      'Q2 — RLS probe (auth.users)',
    )

    const q2AnyError = q2.toolResults.some(r => r.isError) ||
      /permission denied|not authorized|insufficient_privilege|42501/i.test(q2.finalText + q2.toolResults.map(r => r.preview).join('\n'))
    const q2LooksReadable = q2.toolResults.some(r => !r.isError && /\d+\s*(rows?|count)|\b"?count"?\s*[:=]/i.test(r.preview))
      && !q2AnyError

    rlsProbeReadable = q2LooksReadable
    console.log(`\n[q2] mcp_tool_uses=${q2.toolUses.length} mcp_tool_results=${q2.toolResults.length}`)
    console.log(`[q2] anyError=${q2AnyError} looksReadable=${q2LooksReadable}`)
    console.log(`[q2] final text:\n${q2.finalText || '<empty>'}`)

    console.log('\n════════ RLS PROBE VERDICT ════════')
    if (rlsProbeReadable) {
      console.log('⚠  auth.users was READABLE — MCP token has broad privilege.')
      console.log('   Phase 2: Observability call FORCED to execute_crm_write wrapper.')
      console.log('   Record this in plans/managed-agents-implementation.md Phase 2.')
    } else if (q2AnyError) {
      console.log('✓  auth.users was DENIED — MCP token is properly scoped.')
      console.log('   Phase 2: direct MCP writes acceptable; default recommendation stands.')
    } else {
      console.log('?  Inconclusive — inspect tool_result payloads above and decide manually.')
    }
    console.log('═══════════════════════════════════')
  } catch (err) {
    console.error('[smoke-test-mcp] unexpected error:', err)
    exitCode = 3
  } finally {
    // Cleanup — do NOT delete the vault.
    try {
      await (client.beta.agents as any).archive(agent.id)
      console.log(`[cleanup] archived agent ${agent.id}`)
    } catch (e) {
      console.warn(`[cleanup] failed to archive agent ${agent.id}:`, e)
    }
    try {
      await client.beta.environments.delete(env.id)
      console.log(`[cleanup] deleted environment ${env.id}`)
    } catch (e) {
      console.warn(`[cleanup] failed to delete environment ${env.id}:`, e)
    }
  }

  process.exit(exitCode)
}

main().catch(err => {
  console.error('[smoke-test-mcp] fatal:', err)
  process.exit(4)
})
