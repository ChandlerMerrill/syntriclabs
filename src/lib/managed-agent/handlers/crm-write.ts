import type { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { withAIAudit } from '@/lib/ai/audit'
import { registerTool } from '../custom-tools'
import { execute_crm_write as executeCrmWriteSchema } from '../schemas'
import {
  createClient as createClientRow,
  updateClient as updateClientRow,
  getClient,
  addContact,
  updateContact as updateContactRow,
} from '@/lib/services/clients'
import {
  createLead as createLeadRow,
  updateLead as updateLeadRow,
  updateLeadStatus,
  convertToClient,
  getLead,
  type LeadInput,
} from '@/lib/services/leads'
import {
  createDeal as createDealRow,
  updateDeal as updateDealRow,
  getDeal,
} from '@/lib/services/deals'
import {
  createProject as createProjectRow,
  updateProject as updateProjectRow,
  getProject,
} from '@/lib/services/projects'
import { createActivity } from '@/lib/services/activities'
import {
  parseAndValidate,
  buildPreImageSelectForUpdate,
  ensureInsertReturning,
  getTargetTable,
} from '@/lib/ai/sql-safety'
import { executeQuery } from '@/lib/ai/sql-client'
import type { ClientInput, ClientContactInput, DealInput, ProjectInput } from '@/lib/types'

type CrmWriteInput = z.infer<typeof executeCrmWriteSchema>

// Whether each action should write a user-visible activity row in addition to
// the ai_actions audit row. Verified against src/lib/ai/tools.ts; wraps with
// logActivity: false for writes that either already log their own activity
// (e.g. emails) or where an activity timeline entry would be noise.
const LOG_ACTIVITY_BY_ACTION: Record<CrmWriteInput['action'], boolean> = {
  createClient: true,
  updateClient: true,
  archiveClient: true,
  createContact: true,
  updateContact: true,
  createLead: false,
  updateLead: false,
  convertLeadToClient: true,
  dismissLead: false,
  createDeal: true,
  updateDeal: true,
  updateDealStage: true,
  archiveDeal: true,
  createProject: true,
  updateProject: true,
  updateProjectStatus: true,
  addActivity: false,
  logFollowUp: false,
  writeSql: false,
  updateDocumentStatus: false,
}

// Bound reversal_hint size for bulk UPDATEs — everything above 100 rows is a
// "please be explicit" moment for the user.
const WRITE_SQL_PRE_IMAGE_CAP = 100

type ActionParams<K extends CrmWriteInput['action']> = Extract<CrmWriteInput, { action: K }>['params']

const actions: {
  [K in CrmWriteInput['action']]: (params: ActionParams<K>) => Promise<unknown>
} = {
  createClient: async (params) => {
    const supabase = await createServiceClient()
    const input: ClientInput = {
      company_name: params.company_name,
      industry: params.industry ?? null,
      website: params.website ?? null,
      status: params.status,
      source: params.source,
      tags: params.tags,
      notes: params.notes,
      address_street: params.address_street ?? null,
      address_city: params.address_city ?? null,
      address_state: params.address_state ?? null,
      address_zip: params.address_zip ?? null,
      created_from_submission: null,
    }
    const { data, error } = await createClientRow(supabase, input)
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to create client' }
    return { client: data, client_id: data.id, summary: `Created client ${data.company_name}` }
  },

  updateClient: async (params) => {
    const supabase = await createServiceClient()
    const { clientId } = params
    const { data: existing, error: fetchErr } = await getClient(supabase, clientId)
    if (fetchErr || !existing) return { error: 'Client not found' }

    const patch: Partial<ClientInput> = {}
    const prev: Partial<ClientInput> = {}
    const patchableKeys = [
      'company_name', 'industry', 'website', 'status', 'source',
      'tags', 'notes', 'address_street', 'address_city', 'address_state', 'address_zip',
    ] as const
    const p = params as Record<string, unknown>
    for (const key of patchableKeys) {
      if (p[key] !== undefined) {
        ;(patch as Record<string, unknown>)[key] = p[key]
        ;(prev as Record<string, unknown>)[key] = (existing as unknown as Record<string, unknown>)[key]
      }
    }

    const { data, error } = await updateClientRow(supabase, clientId, patch)
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update client' }
    return {
      client: data,
      client_id: data.id,
      summary: `Updated client ${data.company_name}`,
      reversalHint: { kind: 'updateClient', clientId, prev },
    }
  },

  archiveClient: async (params) => {
    const supabase = await createServiceClient()
    const { clientId, reason } = params
    const { data: existing, error: fetchErr } = await getClient(supabase, clientId)
    if (fetchErr || !existing) return { error: 'Client not found' }
    if (existing.status === 'inactive') return { error: 'Client is already archived' }

    const prevStatus = existing.status
    const { data, error } = await updateClientRow(supabase, clientId, { status: 'inactive' })
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to archive client' }
    return {
      client: data,
      client_id: data.id,
      summary: `Archived client ${data.company_name}: ${reason}`,
      reversalHint: { kind: 'archiveClient', clientId, prev: { status: prevStatus } },
    }
  },

  createContact: async (params) => {
    const supabase = await createServiceClient()
    const input: ClientContactInput = {
      client_id: params.client_id,
      name: params.name,
      email: params.email ?? null,
      phone: params.phone ?? null,
      role: params.role ?? null,
      is_primary: params.is_primary,
    }
    const { data, error } = (await addContact(supabase, input)) as unknown as {
      data: { id: string; name: string } | null
      error: unknown
    }
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to create contact' }
    return { contact: data, client_id: params.client_id, summary: `Added contact ${data.name}` }
  },

  updateContact: async (params) => {
    const supabase = await createServiceClient()
    const { contactId } = params
    const { data: existing } = (await supabase
      .from('client_contacts')
      .select('*')
      .eq('id', contactId)
      .single()) as unknown as { data: (Record<string, unknown> & { client_id: string }) | null }
    if (!existing) return { error: 'Contact not found' }

    const patch: Partial<ClientContactInput> = {}
    const prev: Partial<ClientContactInput> = {}
    const patchableKeys = ['name', 'email', 'phone', 'role', 'is_primary'] as const
    const p = params as Record<string, unknown>
    for (const key of patchableKeys) {
      if (p[key] !== undefined) {
        ;(patch as Record<string, unknown>)[key] = p[key]
        ;(prev as Record<string, unknown>)[key] = existing[key]
      }
    }

    const { data, error } = (await updateContactRow(supabase, contactId, patch)) as unknown as {
      data: { id: string; name: string; client_id: string } | null
      error: unknown
    }
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update contact' }
    return {
      contact: data,
      client_id: existing.client_id,
      summary: `Updated contact ${data.name}`,
      reversalHint: { kind: 'updateContact', contactId, prev },
    }
  },

  createLead: async (params) => {
    const supabase = await createServiceClient()
    const input: LeadInput = {
      session_id: `ai:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
      first_name: params.first_name ?? null,
      last_name: params.last_name ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      preferred_contact: params.preferred_contact ?? null,
      role: params.role ?? null,
      organization: params.organization ?? null,
      business_type: params.business_type ?? null,
      service_interest: params.service_interest ?? null,
      request: params.request ?? null,
      summary: params.summary ?? null,
      status: params.status,
      metadata: { source: params.source },
    }
    const { data, error } = await createLeadRow(supabase, input)
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to create lead' }
    const displayName =
      [data.first_name, data.last_name].filter(Boolean).join(' ') ||
      data.organization ||
      data.email ||
      'unknown'
    return { lead: data, summary: `Created lead ${displayName}` }
  },

  updateLead: async (params) => {
    const supabase = await createServiceClient()
    const { leadId } = params
    const { data: existing, error: fetchErr } = await getLead(supabase, leadId)
    if (fetchErr || !existing) return { error: 'Lead not found' }

    const patch: Partial<LeadInput> = {}
    const prev: Partial<LeadInput> = {}
    const patchableKeys = [
      'first_name', 'last_name', 'email', 'phone', 'preferred_contact',
      'role', 'organization', 'business_type', 'service_interest',
      'request', 'summary', 'status',
    ] as const
    const p = params as Record<string, unknown>
    for (const key of patchableKeys) {
      if (p[key] !== undefined) {
        ;(patch as Record<string, unknown>)[key] = p[key]
        ;(prev as Record<string, unknown>)[key] = (existing as unknown as Record<string, unknown>)[key]
      }
    }

    const { data, error } = await updateLeadRow(supabase, leadId, patch)
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update lead' }
    return {
      lead: data,
      summary: `Updated lead ${leadId}`,
      reversalHint: { kind: 'updateLead', leadId, prev },
    }
  },

  convertLeadToClient: async (params) => {
    const supabase = await createServiceClient()
    const { leadId } = params
    const { data: client, error } = await convertToClient(supabase, leadId)
    if (error || !client) {
      const errMsg = typeof error === 'string' ? error : error instanceof Error ? error.message : 'Failed to convert lead'
      return { error: errMsg }
    }
    return {
      client,
      client_id: client.id,
      leadId,
      summary: `Converted lead → client ${client.company_name}`,
    }
  },

  dismissLead: async (params) => {
    const supabase = await createServiceClient()
    const { leadId, reason } = params
    const { data: existing, error: fetchErr } = await getLead(supabase, leadId)
    if (fetchErr || !existing) return { error: 'Lead not found' }
    if (existing.status === 'dismissed') return { error: 'Lead is already dismissed' }

    const prevStatus = existing.status
    const { data, error } = await updateLeadStatus(supabase, leadId, 'dismissed')
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to dismiss lead' }
    return {
      lead: data,
      summary: `Dismissed lead: ${reason}`,
      reversalHint: { kind: 'dismissLead', leadId, prev: { status: prevStatus } },
    }
  },

  createDeal: async (params) => {
    const supabase = await createServiceClient()
    const input: DealInput = {
      client_id: params.client_id,
      project_id: params.project_id ?? null,
      title: params.title,
      stage: params.stage,
      value: params.value,
      probability: params.probability,
      expected_close_date: params.expected_close_date ?? null,
      actual_close_date: null,
      lost_reason: null,
      notes: params.notes,
      is_archived: false,
      archived_at: null,
      archive_reason: null,
    }
    const { data, error } = await createDealRow(supabase, input)
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to create deal' }
    return {
      deal: data,
      client_id: data.client_id,
      summary: `Created deal ${data.title} @ ${data.stage}`,
    }
  },

  updateDeal: async (params) => {
    const supabase = await createServiceClient()
    const { dealId } = params
    const { data: existing, error: fetchErr } = await getDeal(supabase, dealId)
    if (fetchErr || !existing) return { error: 'Deal not found' }

    const patch: Partial<DealInput> = {}
    const prev: Partial<DealInput> = {}
    const patchableKeys = ['title', 'value', 'probability', 'expected_close_date', 'project_id', 'notes'] as const
    const p = params as Record<string, unknown>
    for (const key of patchableKeys) {
      if (p[key] !== undefined) {
        ;(patch as Record<string, unknown>)[key] = p[key]
        ;(prev as Record<string, unknown>)[key] = (existing as unknown as Record<string, unknown>)[key]
      }
    }

    const { data, error } = await updateDealRow(supabase, dealId, patch)
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update deal' }
    return {
      deal: data,
      client_id: data.client_id,
      summary: `Updated deal ${data.title}`,
      reversalHint: { kind: 'updateDeal', dealId, prev },
    }
  },

  updateDealStage: async (params) => {
    const supabase = await createServiceClient()
    const { dealId, newStage, lostReason, note } = params
    const { data: existing, error: fetchErr } = await getDeal(supabase, dealId)
    if (fetchErr || !existing) return { error: 'Deal not found' }
    if (newStage === 'lost' && !lostReason) return { error: 'lostReason required when moving to "lost"' }
    if (existing.stage === newStage) return { error: `Deal is already at stage "${newStage}"` }

    const prevStage = existing.stage
    const prevHistory = existing.stage_history ?? []
    const prevCloseDate = existing.actual_close_date
    const prevLostReason = existing.lost_reason

    const historyEntry = {
      from: prevStage,
      to: newStage,
      timestamp: new Date().toISOString(),
      ...(note ? { note } : {}),
    }

    const update: Partial<DealInput> & { stage_history: typeof prevHistory } = {
      stage: newStage,
      stage_history: [...prevHistory, historyEntry],
      ...(newStage === 'won' || newStage === 'lost'
        ? { actual_close_date: new Date().toISOString().split('T')[0] }
        : {}),
      ...(newStage === 'lost' ? { lost_reason: lostReason! } : {}),
    }

    const { data, error } = (await supabase
      .from('deals')
      .update(update)
      .eq('id', dealId)
      .select()
      .single()) as unknown as { data: typeof existing | null; error: unknown }
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update deal stage' }
    return {
      deal: data,
      client_id: data.client_id,
      summary: `Moved deal ${data.title} ${prevStage} → ${newStage}${newStage === 'lost' ? ` (${lostReason})` : ''}`,
      reversalHint: {
        kind: 'updateDealStage',
        dealId,
        prev: {
          stage: prevStage,
          stage_history: prevHistory,
          actual_close_date: prevCloseDate,
          lost_reason: prevLostReason,
        },
      },
    }
  },

  archiveDeal: async (params) => {
    const supabase = await createServiceClient()
    const { dealId, reason } = params
    const { data: existing, error: fetchErr } = await getDeal(supabase, dealId)
    if (fetchErr || !existing) return { error: 'Deal not found' }
    if (existing.is_archived) return { error: 'Deal is already archived' }

    const { data, error } = (await supabase
      .from('deals')
      .update({
        is_archived: true,
        archived_at: new Date().toISOString(),
        archive_reason: reason,
      })
      .eq('id', dealId)
      .select()
      .single()) as unknown as { data: typeof existing | null; error: unknown }
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to archive deal' }
    return {
      deal: data,
      client_id: data.client_id,
      summary: `Archived deal ${data.title}: ${reason}`,
      reversalHint: {
        kind: 'archiveDeal',
        dealId,
        prev: { is_archived: false, archived_at: null, archive_reason: null },
      },
    }
  },

  createProject: async (params) => {
    const supabase = await createServiceClient()
    const input: ProjectInput = {
      client_id: params.client_id,
      name: params.name,
      description: params.description,
      scope: params.scope,
      status: params.status,
      tech_stack: params.tech_stack,
      budget_min: params.budget_min ?? null,
      budget_max: params.budget_max ?? null,
      start_date: params.start_date ?? null,
      target_end_date: params.target_end_date ?? null,
      actual_end_date: null,
      links: [],
    }
    const { data, error } = await createProjectRow(supabase, input)
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to create project' }
    return { project: data, client_id: data.client_id, summary: `Created project ${data.name}` }
  },

  updateProject: async (params) => {
    const supabase = await createServiceClient()
    const { projectId } = params
    const { data: existing, error: fetchErr } = await getProject(supabase, projectId)
    if (fetchErr || !existing) return { error: 'Project not found' }

    const patch: Partial<ProjectInput> = {}
    const prev: Partial<ProjectInput> = {}
    const patchableKeys = [
      'name', 'description', 'scope', 'tech_stack',
      'budget_min', 'budget_max', 'start_date', 'target_end_date', 'actual_end_date',
    ] as const
    const p = params as Record<string, unknown>
    for (const key of patchableKeys) {
      if (p[key] !== undefined) {
        ;(patch as Record<string, unknown>)[key] = p[key]
        ;(prev as Record<string, unknown>)[key] = (existing as unknown as Record<string, unknown>)[key]
      }
    }

    const { data, error } = await updateProjectRow(supabase, projectId, patch)
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update project' }
    return {
      project: data,
      client_id: data.client_id,
      summary: `Updated project ${data.name}`,
      reversalHint: { kind: 'updateProject', projectId, prev },
    }
  },

  updateProjectStatus: async (params) => {
    const supabase = await createServiceClient()
    const { projectId, status, reason } = params
    if ((status === 'paused' || status === 'cancelled') && !reason) {
      return { error: `reason required when moving to "${status}"` }
    }
    const { data: existing, error: fetchErr } = await getProject(supabase, projectId)
    if (fetchErr || !existing) return { error: 'Project not found' }
    if (existing.status === status) return { error: `Project is already at status "${status}"` }

    const prevStatus = existing.status
    const { data, error } = await updateProjectRow(supabase, projectId, { status })
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to update project status' }
    return {
      project: data,
      client_id: data.client_id,
      summary: `Moved project ${data.name}: ${prevStatus} → ${status}${reason ? ` (${reason})` : ''}`,
      reversalHint: { kind: 'updateProjectStatus', projectId, prev: { status: prevStatus } },
    }
  },

  addActivity: async (params) => {
    const supabase = await createServiceClient()
    const { data, error } = await createActivity(supabase, {
      client_id: params.client_id,
      deal_id: params.deal_id ?? null,
      project_id: params.project_id ?? null,
      type: params.type,
      title: params.title,
      description: params.description,
      metadata: params.metadata,
      is_auto_generated: false,
    })
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to log activity' }
    return { activity: data, client_id: params.client_id, summary: `Logged ${params.type}: ${params.title}` }
  },

  logFollowUp: async (params) => {
    const supabase = await createServiceClient()
    const { data, error } = await createActivity(supabase, {
      client_id: params.client_id,
      deal_id: params.deal_id ?? null,
      project_id: params.project_id ?? null,
      type: 'note',
      title: params.title,
      description: params.description,
      metadata: { follow_up_at: params.due_date },
      is_auto_generated: false,
    })
    if (error || !data) return { error: error instanceof Error ? error.message : 'Failed to log follow-up' }
    return {
      activity: data,
      client_id: params.client_id,
      summary: `Follow-up scheduled for ${params.due_date}: ${params.title}`,
    }
  },

  writeSql: async (params) => {
    const { query, reason } = params
    const validation = parseAndValidate(query, 'write')
    if (!validation.ok) return { error: validation.error }
    const targetTable = getTargetTable(validation.normalized)

    let preImage: Record<string, unknown>[] = []
    if (validation.statementType === 'update') {
      const pre = buildPreImageSelectForUpdate(validation.normalized)
      if (pre) {
        try {
          const preResult = await executeQuery(pre.sql)
          preImage = preResult.rows.slice(0, WRITE_SQL_PRE_IMAGE_CAP)
        } catch {
          preImage = []
        }
      }
    }

    const execQuery =
      validation.statementType === 'insert' ? ensureInsertReturning(validation.normalized) : validation.normalized

    try {
      const result = await executeQuery(execQuery)

      if (validation.statementType === 'insert') {
        const insertedIds = result.rows.map((r) => r.id).filter(Boolean)
        return {
          inserted: result.rows,
          rowCount: result.rowCount,
          targetTable,
          targetTables: validation.targetTables,
          summary: `writeSql INSERT → ${result.rowCount} row${result.rowCount === 1 ? '' : 's'} into ${targetTable} (${reason})`,
          reversalHint: {
            kind: 'writeSql-insert' as const,
            table: targetTable,
            insertedIds,
          },
        }
      }
      return {
        updated: result.rows,
        rowCount: result.rowCount,
        targetTable,
        targetTables: validation.targetTables,
        summary: `writeSql UPDATE → ${result.rowCount} row${result.rowCount === 1 ? '' : 's'} on ${targetTable} (${reason})`,
        reversalHint: {
          kind: 'writeSql-update' as const,
          table: targetTable,
          pre: preImage,
        },
      }
    } catch (err) {
      return { error: `Write failed: ${err instanceof Error ? err.message : String(err)}` }
    }
  },

  updateDocumentStatus: async (params) => {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('documents')
      .update({ status: params.status })
      .eq('id', params.documentId)
      .select()
      .single()
    if (error) return { error: error.message }
    return { document: { id: data.id, title: data.title, type: data.type, status: data.status } }
  },
}

export function register(): void {
  registerTool(
    'execute_crm_write',
    executeCrmWriteSchema,
    // withAIAudit wraps INSIDE, keyed off parsed.action, so ai_actions rows
    // record the specific action ('createDeal' / 'archiveClient' / …) instead
    // of a generic 'execute_crm_write' — preserves per-action observability.
    async (parsed) => {
      const audited = withAIAudit(
        parsed.action,
        { logActivity: LOG_ACTIVITY_BY_ACTION[parsed.action] },
        async (params: typeof parsed.params) =>
          (actions[parsed.action] as (p: typeof parsed.params) => Promise<unknown>)(params),
      )
      return audited(parsed.params)
    },
  )
}
