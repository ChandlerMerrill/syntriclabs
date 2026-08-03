import type { SupabaseClient } from '@supabase/supabase-js'
import { loadBrandProfile } from '../config/brand-profile'
import { getCampaign, getVariant } from '../services'
import { assertVariantSendable } from '../review/gate'
import { renderSend } from './render'
import { isSendTemplate, type SendTemplate } from './templates'
import { prospectSendGate } from './throttle'
import type { MarketingProspect } from '../types'

/**
 * Follow-ups.
 *
 * A sequence here is an ordered list of variants and the gap between them.
 * There is no branching and no per-prospect state machine, because there is
 * already a ledger that answers every question a state machine would hold: did
 * step N send, when, did they reply, are they suppressed. A second copy of that
 * state is a second thing that can be wrong.
 *
 * The rules for step N+1, all four of which must hold:
 *
 *   1. Step N is `sent` for this prospect.
 *   2. `sent_at <= now() - delay_days`, where the delay is on step N+1.
 *   3. No `replied` event on *any* send of this campaign to this prospect. A
 *      reply cancels the rest of the sequence — continuing to send scheduled
 *      copy at someone who answered is the single most obvious way an automated
 *      sequence announces itself.
 *   4. `prospectSendGate` passes: not suppressed, and not inside the
 *      cross-campaign cooldown.
 *
 * And the thing that does not change: every step lands in `pending_approval`.
 * A sequence multiplies how much a person has to read; it does not remove the
 * person.
 */

export interface CampaignStep {
  id: string
  campaign_id: string
  step_no: number
  delay_days: number
  variant_id: string
  created_at: string
  updated_at: string
}

export async function listCampaignSteps(
  supabase: SupabaseClient,
  campaignId: string
): Promise<CampaignStep[]> {
  const { data, error } = await supabase
    .from('marketing_campaign_steps')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('step_no')
  if (error) throw new Error(`Failed to list campaign steps: ${error.message}`)
  return (data ?? []) as CampaignStep[]
}

export async function upsertCampaignStep(
  supabase: SupabaseClient,
  step: { campaignId: string; stepNo: number; delayDays: number; variantId: string }
): Promise<CampaignStep> {
  const variant = await getVariant(supabase, step.variantId)
  if (!variant) throw new Error(`Variant ${step.variantId} not found`)
  if (variant.campaign_id !== step.campaignId) {
    throw new Error('That variant belongs to a different campaign')
  }

  // Refused at definition time rather than at queue time. A step whose variant
  // failed the brand checks would sit in the sequence looking scheduled and
  // silently produce nothing.
  const sendable = await assertVariantSendable(supabase, step.variantId)
  if (!sendable.ok) throw new Error(sendable.reason ?? 'Variant is not sendable')

  const { data: existing } = await supabase
    .from('marketing_campaign_steps')
    .select('id')
    .eq('campaign_id', step.campaignId)
    .eq('step_no', step.stepNo)
    .maybeSingle()

  const payload = {
    campaign_id: step.campaignId,
    step_no: step.stepNo,
    delay_days: step.delayDays,
    variant_id: step.variantId,
  }

  const { data, error } = existing
    ? await supabase
        .from('marketing_campaign_steps')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single()
    : await supabase.from('marketing_campaign_steps').insert(payload).select('*').single()

  if (error || !data) {
    // 23505 here is the (campaign_id, variant_id) unique — see 027 for why it
    // exists, because the message alone only names an index.
    if (error?.code === '23505') {
      throw new Error('That variant is already used by another step in this campaign')
    }
    throw new Error(`Failed to save step: ${error?.message ?? 'no row returned'}`)
  }
  return data as CampaignStep
}

export async function deleteCampaignStep(
  supabase: SupabaseClient,
  campaignId: string,
  stepNo: number
): Promise<void> {
  const { error } = await supabase
    .from('marketing_campaign_steps')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('step_no', stepNo)
  if (error) throw new Error(`Failed to delete step: ${error.message}`)
}

export interface DueFollowUp {
  prospectId: string
  step: CampaignStep
  /** The send that makes this due — step N, already sent. */
  afterSendId: string
  afterSentAt: string
}

export interface FollowUpScan {
  due: DueFollowUp[]
  /** Prospects considered and passed over, with the reason. */
  held: { prospectId: string; stepNo: number; reason: string }[]
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Which follow-ups are ready, and why the rest are not.
 *
 * `held` is not diagnostics decoration. A sequence that quietly produces nothing
 * looks identical to a sequence that is working and simply has nobody due, and
 * telling those apart after the fact is the expensive part.
 */
export async function dueFollowUps(
  supabase: SupabaseClient,
  campaignId: string,
  now = new Date()
): Promise<FollowUpScan> {
  const steps = await listCampaignSteps(supabase, campaignId)
  const scan: FollowUpScan = { due: [], held: [] }
  if (steps.length < 2) return scan

  const byStepNo = new Map(steps.map((s) => [s.step_no, s]))

  const { data: sendRows, error } = await supabase
    .from('marketing_sends')
    .select('id, prospect_id, step_no, variant_id, status, sent_at')
    .eq('campaign_id', campaignId)
  if (error) throw new Error(`Failed to load campaign sends: ${error.message}`)

  type Row = {
    id: string
    prospect_id: string
    step_no: number
    variant_id: string
    status: string
    sent_at: string | null
  }
  const rows = (sendRows ?? []) as Row[]
  if (rows.length === 0) return scan

  // Any reply anywhere in this campaign cancels the rest of the sequence for
  // that prospect — not just a reply to the immediately preceding step.
  const { data: replied, error: repliedError } = await supabase
    .from('marketing_events')
    .select('send_id')
    .eq('type', 'replied')
    .in(
      'send_id',
      rows.map((r) => r.id)
    )
  if (repliedError) throw new Error(`Failed to load reply events: ${repliedError.message}`)

  const repliedSendIds = new Set(((replied ?? []) as { send_id: string }[]).map((e) => e.send_id))

  const byProspect = new Map<string, Row[]>()
  for (const row of rows) {
    const list = byProspect.get(row.prospect_id) ?? []
    list.push(row)
    byProspect.set(row.prospect_id, list)
  }

  for (const [prospectId, prospectRows] of byProspect) {
    // Every step already in flight counts as occupied, whatever its status —
    // a step sitting in `pending_approval` must not be queued a second time
    // just because it has not sent yet.
    const occupied = new Set(prospectRows.map((r) => r.step_no))
    // And so does the variant, independently. A send predating the sequence can
    // carry a step's variant while filed as step 1, and `marketing_sends` is
    // unique on (campaign, prospect, variant) — so counting it here is the
    // difference between a truthful `due` and a due count that partly fails at
    // insert time.
    const usedVariants = new Set(prospectRows.map((r) => r.variant_id))

    const sent = prospectRows
      .filter((r) => r.status === 'sent' && r.sent_at)
      .sort((a, b) => b.step_no - a.step_no)
    if (sent.length === 0) continue

    const latest = sent[0]
    const nextStepNo = latest.step_no + 1
    const next = byStepNo.get(nextStepNo)
    if (!next) continue // end of the sequence

    if (occupied.has(nextStepNo)) continue // already queued or sent

    // Reply first. Several of these can be true at once, and "they answered" is
    // the one worth reading — a held row explained by a variant collision when
    // the person actually replied is a report that hides the interesting fact.
    if (prospectRows.some((r) => repliedSendIds.has(r.id))) {
      scan.held.push({ prospectId, stepNo: nextStepNo, reason: 'Replied — sequence stops here' })
      continue
    }

    if (usedVariants.has(next.variant_id)) {
      scan.held.push({
        prospectId,
        stepNo: nextStepNo,
        reason: 'Already had this variant on an earlier send',
      })
      continue
    }

    const readyAt = new Date(latest.sent_at!).getTime() + next.delay_days * DAY_MS
    if (readyAt > now.getTime()) {
      scan.held.push({
        prospectId,
        stepNo: nextStepNo,
        reason: `Due ${new Date(readyAt).toISOString().slice(0, 10)} — ${next.delay_days}-day gap`,
      })
      continue
    }

    const gate = await prospectSendGate(supabase, prospectId, { campaignId })
    if (!gate.ok) {
      scan.held.push({ prospectId, stepNo: nextStepNo, reason: gate.reason ?? 'Blocked' })
      continue
    }

    scan.due.push({
      prospectId,
      step: next,
      afterSendId: latest.id,
      afterSentAt: latest.sent_at!,
    })
  }

  return scan
}

export interface QueueFollowUpsResult {
  queued: number
  companies: string[]
  skipped: { prospect: string; reason: string }[]
  held: FollowUpScan['held']
}

export async function queueFollowUps(
  supabase: SupabaseClient,
  campaignId: string,
  opts?: { template?: string; limit?: number }
): Promise<QueueFollowUpsResult> {
  if (opts?.template !== undefined && !isSendTemplate(opts.template)) {
    throw new Error(`template must be one of: plain, branded`)
  }
  const template: SendTemplate = (opts?.template as SendTemplate) ?? 'plain'

  const campaign = await getCampaign(supabase, campaignId)
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`)

  const profile = await loadBrandProfile(supabase, { id: campaign.brand_profile_id })
  if (!profile) throw new Error('Brand profile not found')

  const scan = await dueFollowUps(supabase, campaignId)
  const due = opts?.limit ? scan.due.slice(0, opts.limit) : scan.due

  const result: QueueFollowUpsResult = {
    queued: 0,
    companies: [],
    skipped: [],
    held: scan.held,
  }
  if (due.length === 0) return result

  const { data: prospectRows, error: prospectError } = await supabase
    .from('marketing_prospects')
    .select('*')
    .in(
      'id',
      due.map((d) => d.prospectId)
    )
  if (prospectError) throw new Error(`Failed to load prospects: ${prospectError.message}`)
  const prospects = new Map(
    ((prospectRows ?? []) as MarketingProspect[]).map((p) => [p.id, p])
  )

  const variants = new Map<string, Awaited<ReturnType<typeof getVariant>>>()

  for (const item of due) {
    const prospect = prospects.get(item.prospectId)
    if (!prospect) {
      result.skipped.push({ prospect: item.prospectId, reason: 'Prospect not found' })
      continue
    }

    if (!variants.has(item.step.variant_id)) {
      variants.set(item.step.variant_id, await getVariant(supabase, item.step.variant_id))
    }
    const variant = variants.get(item.step.variant_id)
    if (!variant) {
      result.skipped.push({ prospect: prospect.company, reason: 'Step variant not found' })
      continue
    }

    // Re-checked at queue time, not only when the step was defined. A variant
    // can be edited back into failing between the two.
    const sendable = await assertVariantSendable(supabase, variant.id)
    if (!sendable.ok) {
      result.skipped.push({ prospect: prospect.company, reason: sendable.reason ?? 'Not sendable' })
      continue
    }

    const rendered = renderSend(variant, prospect, profile, template)
    if (rendered.missing.length > 0) {
      result.skipped.push({
        prospect: prospect.company,
        reason: `Missing ${rendered.missing.map((m) => `{{${m}}}`).join(', ')}`,
      })
      continue
    }

    const { error: insertError } = await supabase.from('marketing_sends').insert({
      campaign_id: campaignId,
      variant_id: variant.id,
      prospect_id: prospect.id,
      channel: campaign.channel,
      status: 'pending_approval',
      step_no: item.step.step_no,
      rendered_subject: rendered.subject,
      rendered_body: rendered.body,
      rendered_html: rendered.html,
      template: rendered.template,
    })

    if (insertError) {
      result.skipped.push({
        prospect: prospect.company,
        reason:
          insertError.code === '23505'
            ? 'Already queued or sent for this variant'
            : insertError.message,
      })
      continue
    }

    result.queued++
    result.companies.push(`${prospect.company} (step ${item.step.step_no})`)
  }

  return result
}
