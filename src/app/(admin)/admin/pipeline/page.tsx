import { createClient } from "@/lib/supabase/server"
import PipelineView from "./PipelineView"
import type { DealWithClient } from "@/lib/types"

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: deals } = await supabase
    .from("deals")
    .select("*, clients(id, company_name, industry)")
    .order("updated_at", { ascending: false })

  return <PipelineView deals={(deals ?? []) as DealWithClient[]} />
}
