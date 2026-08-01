/**
 * Renders a variant in both treatments, to files, without sending anything.
 *
 * The point of the plain/branded experiment is that the difference is visual,
 * so it has to be looked at rather than reasoned about. This writes exactly the
 * bytes `renderSend` would store on the send row.
 *
 *   tsx --env-file=.env.local scripts/db/preview-templates.ts <variantId> [outDir]
 */
import { writeFileSync } from 'node:fs'
import { createServiceClient } from '@/lib/supabase/server'
import { loadBrandProfile } from '@/lib/marketing/config/brand-profile'
import { getCampaign, getVariant } from '@/lib/marketing/services'
import { renderSend } from '@/lib/marketing/send/render'
import { SEND_TEMPLATES } from '@/lib/marketing/send/templates'

async function main() {
  const variantId = process.argv[2]
  const outDir = process.argv[3] || '.'
  if (!variantId) throw new Error('Usage: preview-templates.ts <variantId> [outDir]')

  const supabase = await createServiceClient()

  const variant = await getVariant(supabase, variantId)
  if (!variant) throw new Error(`Variant ${variantId} not found`)

  const campaign = await getCampaign(supabase, variant.campaign_id)
  if (!campaign) throw new Error('Campaign not found')

  const profile = await loadBrandProfile(supabase, { id: campaign.brand_profile_id })
  if (!profile) throw new Error('Brand profile not found')

  // A stand-in prospect so tokens resolve. Never written anywhere.
  const prospect = { company: 'Redrock Trail Company', contact_name: 'Dana Whitmore' }

  for (const template of SEND_TEMPLATES) {
    const rendered = renderSend(variant, prospect, profile, template)
    const path = `${outDir}/preview-${template}.html`
    writeFileSync(path, rendered.html, 'utf8')
    console.log(`${template.padEnd(8)} → ${path}  (${rendered.html.length} bytes html)`)
    console.log(`${''.padEnd(8)}   subject: ${rendered.subject}`)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
