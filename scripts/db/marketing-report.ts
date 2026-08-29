/**
 * What the loop has actually learned so far.
 *
 *   tsx --env-file=.env.local scripts/db/marketing-report.ts
 *
 * Read this before writing a batch, not after. A batch composed without looking
 * at the last one is the loop running open-loop — it generates, it sends, and
 * nothing it learns ever reaches the next round.
 *
 * ── The honesty this file is trying to enforce ────────────────────────────
 *
 * Every rate is printed next to the count it was computed from, and a rate on a
 * sample too small to mean anything is printed with a verdict saying so rather
 * than left for the reader to notice. A reply rate is a fraction whose numerator
 * is usually 0 or 1 for the first several batches; shown alone it invites a
 * conclusion the data cannot support, and a wrong conclusion drawn early is
 * worse than no conclusion, because everything after it is built on top.
 *
 * `MIN_MEANINGFUL` is a judgement, not a statistic. At two sends an arm a single
 * reply is a 50-point swing. Thirty is roughly where one reply stops moving the
 * number more than the effect being measured.
 */
import { createServiceClient } from '@/lib/supabase/server'

/** Below this, an arm's rate is reported as "not yet" rather than as a number. */
const MIN_MEANINGFUL = 30

/** Above this share of a batch, a bounce rate is a stop-everything signal. */
const BOUNCE_ALARM = 0.02

function pct(rate: number | null): string {
  return rate === null || rate === undefined ? '—' : `${(Number(rate) * 100).toFixed(1)}%`
}

function rule(label: string) {
  console.log(`\n${label}\n${'─'.repeat(78)}`)
}

async function main() {
  const sb = await createServiceClient()

  // ── The experiment ──────────────────────────────────────────────────────
  rule('OPENING ARM — the standing experiment')

  const { data: arms, error: armErr } = await sb
    .from('marketing_opening_performance')
    .select('*')
    .order('sends', { ascending: false })
  if (armErr) throw new Error(armErr.message)

  if (!arms?.length) {
    console.log('  nothing sent yet')
  } else {
    console.log('  arm           sends  replies  bounces   reply rate   verdict')
    for (const a of arms) {
      const n = Number(a.sends)
      const verdict =
        n === 0
          ? 'nothing sent'
          : n < MIN_MEANINGFUL
            ? `not yet — need ~${MIN_MEANINGFUL - n} more`
            : 'readable'
      console.log(
        `  ${String(a.opening_style).padEnd(13)} ${String(a.sends).padStart(5)} ` +
          `${String(a.replies).padStart(8)} ${String(a.bounces).padStart(8)} ` +
          `${pct(a.reply_rate).padStart(12)}   ${verdict}`
      )
    }

    const readable = arms.filter((a) => Number(a.sends) >= MIN_MEANINGFUL)
    console.log(
      readable.length < 2
        ? '\n  → No comparison yet. Keep shipping both arms, balanced, and do not\n' +
            '    conclude anything from the rates above.'
        : '\n  → Both arms are readable. Compare only if the batches were otherwise\n' +
            '    matched — same angle, same subject, same middle.'
    )
  }

  // ── Bounces, which matter immediately at any n ──────────────────────────
  const { data: sends } = await sb.from('marketing_sends').select('id, status')
  const sentCount = (sends ?? []).filter((s) => s.status === 'sent').length
  const { count: bounceCount } = await sb
    .from('marketing_events')
    .select('id', { count: 'exact', head: true })
    .eq('type', 'bounced')

  rule('DELIVERABILITY — the one number that matters at any sample size')
  const bounceRate = sentCount > 0 ? (bounceCount ?? 0) / sentCount : 0
  console.log(`  ${bounceCount ?? 0} bounce(s) of ${sentCount} sent — ${pct(bounceRate)}`)
  if (bounceRate > BOUNCE_ALARM) {
    console.log(
      `\n  ⚠️  ABOVE ${BOUNCE_ALARM * 100}% — stop and re-verify the list before sending again.\n` +
        '      This is the number that takes a sending domain down.'
    )
  } else if (sentCount > 0) {
    console.log('  within tolerance')
  }

  // ── The other axis being varied on purpose ──────────────────────────────
  //
  // Style is a second, independent tag on the same sends. It is printed after
  // the arm and with the same "not yet" discipline, and with the *measured*
  // shape beside the result — a style that was never actually written as
  // specified has to be distinguishable from a style that was tried and lost.
  rule('WRITING STYLE — the second axis, independent of the arm above')

  const { data: styles, error: styleErr } = await sb
    .from('marketing_style_performance')
    .select('*')
    .order('sends', { ascending: false })
  if (styleErr) throw new Error(styleErr.message)

  const shipped = (styles ?? []).filter((s) => Number(s.sends) > 0)
  if (!shipped.length) {
    console.log('  nothing sent yet')
  } else {
    console.log('  style          sends  replies   reply rate   words  ¶  lone-¶   verdict')
    for (const s of shipped) {
      const n = Number(s.sends)
      const verdict =
        n < MIN_MEANINGFUL ? `not yet — need ~${MIN_MEANINGFUL - n} more` : 'readable'
      console.log(
        `  ${String(s.style).padEnd(13)} ${String(n).padStart(5)}  ${String(s.replies).padStart(7)}   ` +
          `${(n < MIN_MEANINGFUL ? '—' : pct(s.reply_rate)).padStart(10)}   ` +
          `${String(s.avg_words ?? '—').padStart(5)}  ${String(s.avg_paragraphs ?? '—').padStart(4)}  ` +
          `${String(s.avg_lone_sentence_paragraphs ?? '—').padStart(6)}   ${verdict}`
      )
    }
    console.log(
      '\n  → Style and arm partition the same sends and neither controls for the\n' +
        '    other, so a style difference here may be an arm difference wearing a\n' +
        '    different hat. Read one axis at a time, and only from batches that\n' +
        '    held the other one balanced.'
    )
  }

  // ── Per variant, so a losing arm is not blamed for one bad email ────────
  rule('BY VARIANT')
  const { data: variants } = await sb
    .from('marketing_variant_performance')
    .select('label, sends, replies, bounces, reply_rate')
    .gt('sends', 0)
    .order('sends', { ascending: false })

  if (!variants?.length) console.log('  nothing sent yet')
  for (const v of variants ?? []) {
    console.log(
      `  ${String(v.label).padEnd(46)} ${String(v.sends).padStart(4)} sent  ` +
        `${String(v.replies).padStart(3)} replies  ${pct(v.reply_rate)}`
    )
  }

  // ── What is still in flight ─────────────────────────────────────────────
  rule('IN FLIGHT')
  const byStatus = new Map<string, number>()
  for (const s of sends ?? []) byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1)
  for (const [status, n] of [...byStatus].sort()) console.log(`  ${status.padEnd(18)} ${n}`)

  const { count: prospects } = await sb
    .from('marketing_prospects')
    .select('id', { count: 'exact', head: true })
  const { count: qualified } = await sb
    .from('marketing_prospects')
    .select('id', { count: 'exact', head: true })
    .eq('qualified', true)
  const { count: unreviewed } = await sb
    .from('marketing_prospects')
    .select('id', { count: 'exact', head: true })
    .is('qualified', null)

  console.log(
    `\n  prospects: ${prospects ?? 0} total · ${qualified ?? 0} qualified · ` +
      `${unreviewed ?? 0} unreviewed`
  )

  // A preflight left on file counts toward whichever arm its variant belongs to
  // and never replies, which drags that arm down for no reason.
  const { data: preflight } = await sb
    .from('marketing_prospects')
    .select('id, company')
    .ilike('company', 'Preflight%')
  if (preflight?.length) {
    console.log(
      `\n  ⚠️  ${preflight.length} preflight row(s) still on file — they count toward an\n` +
        '      arm and can never reply. Clear with:\n' +
        '        scripts/db/clear-test-data.ts --preflight'
    )
  }

  console.log()
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
