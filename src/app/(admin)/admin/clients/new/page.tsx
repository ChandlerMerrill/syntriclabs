import { createClient } from "@/lib/supabase/server"
import ClientForm from "@/components/admin/clients/ClientForm"
import PageHeader from "@/components/admin/shared/PageHeader"

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ from_submission?: string }>
}) {
  const { from_submission } = await searchParams
  let defaultValues: { company_name?: string; contacts?: { name: string; email: string; phone: string }[]; created_from_submission?: string } | undefined

  if (from_submission) {
    const supabase = await createClient()
    const { data: submission } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", from_submission)
      .single()

    if (submission) {
      defaultValues = {
        company_name: submission.company ?? "",
        contacts: [{
          name: submission.name,
          email: submission.email,
          phone: submission.phone ?? "",
        }],
        created_from_submission: submission.id,
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Add Client" description="Create a new client record" />
      <ClientForm defaultValues={defaultValues} />
    </div>
  )
}
