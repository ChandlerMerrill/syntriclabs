import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const conversationId = '9cd5bfaf-6daa-4193-9bda-274b4ea12005'
const sessionId = 'sesn_011CaAhr9cVrXYAiwofZJ2Q4'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )

  const { data: msgs } = await supabase
    .from('messages')
    .select('role,content,created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(2)

  console.log('--- latest 2 messages (full text) ---')
  for (const m of (msgs ?? []).reverse()) {
    console.log(`\n[${m.created_at}] ${m.role}:`)
    console.log(m.content)
  }

  const anthropic = new Anthropic()
  console.log('\n--- session ---')
  const session = await anthropic.beta.sessions.retrieve(sessionId)
  console.log(JSON.stringify(session, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
