import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SECRET_KEY!
const db = createClient(url, key)

const { data: convs } = await db
  .from('conversations')
  .select('id, external_id, channel, metadata, updated_at')
  .eq('channel', 'telegram')
  .order('updated_at', { ascending: false })
  .limit(3)

console.log('--- recent telegram conversations ---')
console.log(JSON.stringify(convs, null, 2))

if (convs?.[0]) {
  const convId = convs[0].id
  const { data: msgs } = await db
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(6)
  console.log('\n--- last 6 messages ---')
  for (const m of (msgs ?? []).reverse()) {
    console.log(`[${m.created_at}] ${m.role}: ${(m.content ?? '').slice(0, 160)}`)
  }

  const { data: actions } = await db
    .from('ai_actions')
    .select('tool_name, status, created_at, conversation_id')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: false })
    .limit(10)
  console.log('\n--- recent ai_actions ---')
  console.log(JSON.stringify(actions, null, 2))
}
