import Anthropic from '@anthropic-ai/sdk'

const sessionId = 'sesn_011CaAhr9cVrXYAiwofZJ2Q4'

async function main() {
  const anthropic = new Anthropic()
  const events = await anthropic.beta.sessions.events.list(sessionId, { limit: 200 })

  const counts: Record<string, number> = {}
  const mcpTools: string[] = []
  let turn3Start = 0
  let turn3End = 0
  const turn3Cutoff = new Date('2026-04-18T18:10:40Z').getTime()

  for (const ev of events.data ?? []) {
    counts[ev.type] = (counts[ev.type] ?? 0) + 1
  }
  console.log('--- sample event keys ---')
  const sample = (events.data ?? [])[0]
  console.log(Object.keys(sample ?? {}))
  console.log(JSON.stringify(sample, null, 2).slice(0, 500))
  console.log('\n--- last 30 events (type + timestamp + short body) ---')
  const last = (events.data ?? []).slice(0, 30)
  for (const ev of last) {
    const anyEv = ev as Record<string, unknown>
    const ts = anyEv.created_at ?? anyEv.timestamp ?? ''
    console.log(`${ts}  ${ev.type}`)
  }

  console.log('--- event counts (whole session) ---')
  console.log(counts)
  console.log('\n--- turn 3 (7e) window ---')
  console.log('first event ts:', new Date(turn3Start).toISOString())
  console.log('last event ts: ', new Date(turn3End).toISOString())
  console.log('wall seconds:  ', Math.round((turn3End - turn3Start) / 1000))
  console.log('mcp tool calls in turn 3:', mcpTools.length)
  console.log('mcp tool names:', mcpTools)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
