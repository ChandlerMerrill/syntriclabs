import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

async function main() {
  const { data: all } = await db
    .from('ai_actions')
    .select('id,tool_name,status,conversation_id,created_at,payload')
    .order('created_at', { ascending: false })
    .limit(15)
  console.log('--- latest 15 ai_actions across all conversations ---')
  for (const a of all ?? []) {
    console.log(`${a.created_at}  conv=${a.conversation_id?.slice(0, 8) ?? 'null'}  ${a.tool_name}  ${a.status}`)
  }

  console.log('\n--- latest 5 ai_actions (full payload) ---')
  for (const a of (all ?? []).slice(0, 5)) {
    console.log(JSON.stringify(a, null, 2))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
