import { createServiceClient } from '@/lib/supabase/server'
import { createPendingAction, consumeConfirmToken } from '@/lib/ai/confirm-tokens'
import { withAIAudit } from '@/lib/ai/audit'
import { registerTool } from '../custom-tools'
import { getAgentCtx } from '../context'
import {
  hardDeleteClient as hardDeleteClientSchema,
  hardDeleteContact as hardDeleteContactSchema,
  hardDeleteLead as hardDeleteLeadSchema,
} from '../schemas'

// createPendingAction / consumeConfirmToken match tool_name by exact string
// equality (see src/lib/ai/confirm-tokens.ts:89). The legacy AI-SDK path used
// camelCase literals ('hardDeleteClient', etc.); keep that exact spelling here
// so any in-flight tokens from before the managed-agent cutover still consume.
const TOOL_HARD_DELETE_CLIENT = 'hardDeleteClient'
const TOOL_HARD_DELETE_CONTACT = 'hardDeleteContact'
const TOOL_HARD_DELETE_LEAD = 'hardDeleteLead'

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const setA = new Set(a)
  if (setA.size !== b.length) return false
  for (const x of b) if (!setA.has(x)) return false
  return true
}

function mapConsumeError(
  err: 'not_found' | 'expired' | 'consumed' | 'wrong_tool' | 'wrong_conversation',
): string {
  switch (err) {
    case 'not_found':
      return 'confirmToken not found — ask the user to re-initiate the delete.'
    case 'expired':
      return 'confirmToken expired (>5 min) — ask the user to re-initiate the delete.'
    case 'consumed':
      return 'confirmToken already used — re-initiate if the user wants to delete again.'
    case 'wrong_tool':
      return 'confirmToken was issued for a different tool — re-initiate the delete.'
    case 'wrong_conversation':
      return 'confirmToken belongs to a different conversation — re-initiate here.'
  }
}

export function register(): void {
  registerTool(
    'hard_delete_client',
    hardDeleteClientSchema,
    withAIAudit('hard_delete_client', { logActivity: false }, async (args) => {
      const { conversationId } = getAgentCtx()
      const { ids, confirmToken } = args
      const supabase = await createServiceClient()
      const uniqueIds = Array.from(new Set(ids))

      if (!confirmToken) {
        const { data: clientRows } = (await supabase
          .from('clients')
          .select('id, company_name, status')
          .in('id', uniqueIds)) as unknown as {
          data: Array<{ id: string; company_name: string; status: string }> | null
        }
        const clients = clientRows ?? []
        if (clients.length < uniqueIds.length) {
          const found = new Set(clients.map((c) => c.id))
          const missing = uniqueIds.filter((id) => !found.has(id))
          return { error: `Client(s) not found: ${missing.join(', ')}` }
        }

        const [contactsRes, dealsRes, projectsRes, activitiesRes, documentsRes] = (await Promise.all([
          supabase.from('client_contacts').select('client_id').in('client_id', uniqueIds),
          supabase.from('deals').select('client_id').in('client_id', uniqueIds),
          supabase.from('projects').select('client_id').in('client_id', uniqueIds),
          supabase.from('activities').select('client_id').in('client_id', uniqueIds),
          supabase.from('documents').select('client_id').in('client_id', uniqueIds),
        ])) as unknown as Array<{ data: Array<{ client_id: string }> | null }>

        const bucket = (rows: Array<{ client_id: string }> | null) => {
          const m = new Map<string, number>()
          for (const r of rows ?? []) m.set(r.client_id, (m.get(r.client_id) ?? 0) + 1)
          return m
        }
        const cByClient = bucket(contactsRes.data)
        const dByClient = bucket(dealsRes.data)
        const pByClient = bucket(projectsRes.data)
        const aByClient = bucket(activitiesRes.data)
        const docByClient = bucket(documentsRes.data)

        const items = clients.map((c) => ({
          id: c.id,
          displayName: c.company_name,
          linkedContacts: cByClient.get(c.id) ?? 0,
          linkedDeals: dByClient.get(c.id) ?? 0,
          linkedProjects: pByClient.get(c.id) ?? 0,
          linkedActivities: aByClient.get(c.id) ?? 0,
          linkedDocuments: docByClient.get(c.id) ?? 0,
        }))
        const preview = {
          kind: 'client' as const,
          count: items.length,
          items,
          totals: {
            contacts: contactsRes.data?.length ?? 0,
            deals: dealsRes.data?.length ?? 0,
            projects: projectsRes.data?.length ?? 0,
            activities: activitiesRes.data?.length ?? 0,
            documents: documentsRes.data?.length ?? 0,
          },
        }
        const { token, expiresAt } = await createPendingAction(
          TOOL_HARD_DELETE_CLIENT,
          { ids: uniqueIds },
          preview,
          conversationId,
        )
        return {
          pending: true as const,
          token,
          preview,
          expiresAt,
          instruction: `Show this preview to the user (count, per-row names, cascaded totals). If they affirm on their next message, call hard_delete_client again with { ids: ${JSON.stringify(uniqueIds)}, confirmToken: "${token}" }. Do not call any other tool in this turn.`,
        }
      }

      const consume = await consumeConfirmToken(confirmToken, TOOL_HARD_DELETE_CLIENT, conversationId)
      if (!consume.ok) return { error: mapConsumeError(consume.error) }
      const storedIds = Array.isArray(consume.args.ids) ? (consume.args.ids as unknown[]).map(String) : []
      if (!sameIdSet(storedIds, uniqueIds)) {
        return { error: 'confirmToken does not match the set of client ids being deleted' }
      }

      // Snapshot before delete so reversal_hint carries the rows — but strip
      // client_contacts(*) from the snapshot downstream (it lives in
      // ai_actions.reversal_hint, never surfaced to the model).
      const { data: snapshotRows } = (await supabase
        .from('clients')
        .select('*, client_contacts(*)')
        .in('id', uniqueIds)) as unknown as { data: Array<Record<string, unknown>> | null }
      const snapshots = snapshotRows ?? []
      if (snapshots.length < uniqueIds.length) {
        const found = new Set(snapshots.map((s) => s.id as string))
        const missing = uniqueIds.filter((id) => !found.has(id))
        return { error: `Client(s) no longer exist (may have been deleted already): ${missing.join(', ')}` }
      }

      const { data: deletedRows, error: delErr } = (await supabase
        .from('clients')
        .delete()
        .in('id', uniqueIds)
        .select('id')) as unknown as { data: Array<{ id: string }> | null; error: unknown }
      if (delErr) return { error: delErr instanceof Error ? delErr.message : 'Failed to delete clients' }

      const deletedIdSet = new Set((deletedRows ?? []).map((r) => r.id))
      const missingDeletes = uniqueIds.filter((id) => !deletedIdSet.has(id))
      if (missingDeletes.length > 0) {
        return {
          error: `Deleted ${deletedIdSet.size} of ${uniqueIds.length} rows. Missing: ${missingDeletes.join(', ')}. The token has been consumed — ask the user to re-initiate for the missing rows.`,
        }
      }

      const deletedDisplayNames = snapshots.map((s) => (s.company_name as string) ?? (s.id as string))
      return {
        deleted: true as const,
        count: deletedIdSet.size,
        ids: uniqueIds,
        deletedDisplayNames,
        summary: `Permanently deleted ${deletedIdSet.size} client${deletedIdSet.size === 1 ? '' : 's'}: ${deletedDisplayNames.join(', ')}`,
        reversalHint: { kind: 'hardDeleteClient', rows: snapshots },
      }
    }),
  )

  registerTool(
    'hard_delete_contact',
    hardDeleteContactSchema,
    withAIAudit('hard_delete_contact', { logActivity: false }, async (args) => {
      const { conversationId } = getAgentCtx()
      const { ids, confirmToken } = args
      const supabase = await createServiceClient()
      const uniqueIds = Array.from(new Set(ids))

      if (!confirmToken) {
        const { data: contactRows } = (await supabase
          .from('client_contacts')
          .select('id, name, email, client_id, clients(company_name)')
          .in('id', uniqueIds)) as unknown as {
          data: Array<{
            id: string
            name: string
            email: string | null
            client_id: string
            clients: { company_name: string } | null
          }> | null
        }
        const contacts = contactRows ?? []
        if (contacts.length < uniqueIds.length) {
          const found = new Set(contacts.map((c) => c.id))
          const missing = uniqueIds.filter((id) => !found.has(id))
          return { error: `Contact(s) not found: ${missing.join(', ')}` }
        }

        const items = contacts.map((c) => ({
          id: c.id,
          displayName: `${c.name}${c.email ? ` <${c.email}>` : ''}`,
          clientCompany: c.clients?.company_name ?? null,
        }))
        const preview = {
          kind: 'contact' as const,
          count: items.length,
          items,
        }
        const { token, expiresAt } = await createPendingAction(
          TOOL_HARD_DELETE_CONTACT,
          { ids: uniqueIds },
          preview,
          conversationId,
        )
        return {
          pending: true as const,
          token,
          preview,
          expiresAt,
          instruction: `Show this preview to the user. If they affirm, re-call hard_delete_contact with { ids: ${JSON.stringify(uniqueIds)}, confirmToken: "${token}" }. Do not call any other tool in this turn.`,
        }
      }

      const consume = await consumeConfirmToken(confirmToken, TOOL_HARD_DELETE_CONTACT, conversationId)
      if (!consume.ok) return { error: mapConsumeError(consume.error) }
      const storedIds = Array.isArray(consume.args.ids) ? (consume.args.ids as unknown[]).map(String) : []
      if (!sameIdSet(storedIds, uniqueIds)) {
        return { error: 'confirmToken does not match the set of contact ids being deleted' }
      }

      const { data: snapshotRows } = (await supabase
        .from('client_contacts')
        .select('*')
        .in('id', uniqueIds)) as unknown as { data: Array<Record<string, unknown>> | null }
      const snapshots = snapshotRows ?? []
      if (snapshots.length < uniqueIds.length) {
        const found = new Set(snapshots.map((s) => s.id as string))
        const missing = uniqueIds.filter((id) => !found.has(id))
        return { error: `Contact(s) no longer exist (may have been deleted already): ${missing.join(', ')}` }
      }

      const { data: deletedRows, error: delErr } = (await supabase
        .from('client_contacts')
        .delete()
        .in('id', uniqueIds)
        .select('id')) as unknown as { data: Array<{ id: string }> | null; error: unknown }
      if (delErr) return { error: delErr instanceof Error ? delErr.message : 'Failed to delete contacts' }

      const deletedIdSet = new Set((deletedRows ?? []).map((r) => r.id))
      const missingDeletes = uniqueIds.filter((id) => !deletedIdSet.has(id))
      if (missingDeletes.length > 0) {
        return {
          error: `Deleted ${deletedIdSet.size} of ${uniqueIds.length} rows. Missing: ${missingDeletes.join(', ')}. The token has been consumed — ask the user to re-initiate for the missing rows.`,
        }
      }

      const deletedDisplayNames = snapshots.map((s) => (s.name as string) ?? (s.id as string))
      return {
        deleted: true as const,
        count: deletedIdSet.size,
        ids: uniqueIds,
        deletedDisplayNames,
        summary: `Permanently deleted ${deletedIdSet.size} contact${deletedIdSet.size === 1 ? '' : 's'}: ${deletedDisplayNames.join(', ')}`,
        reversalHint: { kind: 'hardDeleteContact', rows: snapshots },
      }
    }),
  )

  registerTool(
    'hard_delete_lead',
    hardDeleteLeadSchema,
    withAIAudit('hard_delete_lead', { logActivity: false }, async (args) => {
      const { conversationId } = getAgentCtx()
      const { ids, confirmToken } = args
      const supabase = await createServiceClient()
      const uniqueIds = Array.from(new Set(ids))

      if (!confirmToken) {
        const { data: leadRows } = (await supabase
          .from('widget_leads')
          .select('id, first_name, last_name, email, organization, status')
          .in('id', uniqueIds)) as unknown as {
          data: Array<{
            id: string
            first_name: string | null
            last_name: string | null
            email: string | null
            organization: string | null
            status: string
          }> | null
        }
        const leads = leadRows ?? []
        if (leads.length < uniqueIds.length) {
          const found = new Set(leads.map((l) => l.id))
          const missing = uniqueIds.filter((id) => !found.has(id))
          return { error: `Lead(s) not found: ${missing.join(', ')}` }
        }

        const { data: escRows } = (await supabase
          .from('widget_escalations')
          .select('lead_id')
          .in('lead_id', uniqueIds)) as unknown as { data: Array<{ lead_id: string }> | null }
        const escByLead = new Map<string, number>()
        for (const r of escRows ?? []) escByLead.set(r.lead_id, (escByLead.get(r.lead_id) ?? 0) + 1)

        const items = leads.map((l) => {
          const displayName =
            [l.first_name, l.last_name].filter(Boolean).join(' ') ||
            l.organization ||
            l.email ||
            l.id
          return {
            id: l.id,
            displayName,
            status: l.status,
            linkedEscalations: escByLead.get(l.id) ?? 0,
          }
        })
        const preview = {
          kind: 'lead' as const,
          count: items.length,
          items,
          totals: { escalations: escRows?.length ?? 0 },
        }
        const { token, expiresAt } = await createPendingAction(
          TOOL_HARD_DELETE_LEAD,
          { ids: uniqueIds },
          preview,
          conversationId,
        )
        return {
          pending: true as const,
          token,
          preview,
          expiresAt,
          instruction: `Show this preview to the user. If they affirm, re-call hard_delete_lead with { ids: ${JSON.stringify(uniqueIds)}, confirmToken: "${token}" }. Do not call any other tool in this turn.`,
        }
      }

      const consume = await consumeConfirmToken(confirmToken, TOOL_HARD_DELETE_LEAD, conversationId)
      if (!consume.ok) return { error: mapConsumeError(consume.error) }
      const storedIds = Array.isArray(consume.args.ids) ? (consume.args.ids as unknown[]).map(String) : []
      if (!sameIdSet(storedIds, uniqueIds)) {
        return { error: 'confirmToken does not match the set of lead ids being deleted' }
      }

      const { data: snapshotRows } = (await supabase
        .from('widget_leads')
        .select('*')
        .in('id', uniqueIds)) as unknown as { data: Array<Record<string, unknown>> | null }
      const snapshots = snapshotRows ?? []
      if (snapshots.length < uniqueIds.length) {
        const found = new Set(snapshots.map((s) => s.id as string))
        const missing = uniqueIds.filter((id) => !found.has(id))
        return { error: `Lead(s) no longer exist (may have been deleted already): ${missing.join(', ')}` }
      }

      const { data: deletedRows, error: delErr } = (await supabase
        .from('widget_leads')
        .delete()
        .in('id', uniqueIds)
        .select('id')) as unknown as { data: Array<{ id: string }> | null; error: unknown }
      if (delErr) return { error: delErr instanceof Error ? delErr.message : 'Failed to delete leads' }

      const deletedIdSet = new Set((deletedRows ?? []).map((r) => r.id))
      const missingDeletes = uniqueIds.filter((id) => !deletedIdSet.has(id))
      if (missingDeletes.length > 0) {
        return {
          error: `Deleted ${deletedIdSet.size} of ${uniqueIds.length} rows. Missing: ${missingDeletes.join(', ')}. The token has been consumed — ask the user to re-initiate for the missing rows.`,
        }
      }

      const deletedDisplayNames = snapshots.map(
        (s) =>
          [s.first_name, s.last_name].filter(Boolean).join(' ') ||
          (s.organization as string) ||
          (s.email as string) ||
          (s.id as string),
      )
      return {
        deleted: true as const,
        count: deletedIdSet.size,
        ids: uniqueIds,
        deletedDisplayNames,
        summary: `Permanently deleted ${deletedIdSet.size} lead${deletedIdSet.size === 1 ? '' : 's'}: ${deletedDisplayNames.join(', ')}`,
        reversalHint: { kind: 'hardDeleteLead', rows: snapshots },
      }
    }),
  )
}
