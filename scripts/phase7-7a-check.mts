import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

async function main() {
  const { data: clients } = await db
    .from('clients')
    .select('*')
    .ilike('company_name', '%Esoteric%')
  console.log('--- esoteric clients ---')
  console.log(clients)

  const clientIds = (clients ?? []).map((c) => c.id)

  const { data: deals } = await db
    .from('deals')
    .select('id,title,value,stage,client_id,created_at')
    .in('client_id', clientIds)
    .order('created_at', { ascending: false })
    .limit(10)
  console.log('\n--- deals for esoteric client(s) ---')
  console.log(deals)

  const { data: actions } = await db
    .from('ai_actions')
    .select('tool_name,status,created_at,payload')
    .eq('conversation_id', '9cd5bfaf-6daa-4193-9bda-274b4ea12005')
    .order('created_at', { ascending: false })
    .limit(15)
  console.log('\n--- latest 15 ai_actions for this conversation ---')
  for (const a of actions ?? []) {
    console.log(`${a.created_at}  ${a.tool_name}  ${a.status}`)
  }

  const { data: msgs } = await db
    .from('messages')
    .select('role,content,created_at')
    .eq('conversation_id', '9cd5bfaf-6daa-4193-9bda-274b4ea12005')
    .order('created_at', { ascending: false })
    .limit(6)
  console.log('\n--- latest 6 messages ---')
  for (const m of (msgs ?? []).reverse()) {
    console.log(`[${m.created_at}] ${m.role}:`)
    console.log((m.content ?? '').slice(0, 400))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
