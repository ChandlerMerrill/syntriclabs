/**
 * Sends what a human already approved, without the cron route's HTTP hop.
 *
 *   tsx --env-file=.env.local scripts/db/dispatch-sends.ts [limit]
 *
 * Same call the cron route makes, and the same authority — none.
 * `dispatchApprovedSends` selects on `status = 'approved'`, which the schema
 * will not let a row hold without `approved_by` and `approved_at`. This script
 * cannot approve, cannot generate, and cannot reach a row nobody signed off on.
 * It changes throughput, never permission.
 *
 * It exists because the cron route needs `CRON_SECRET` pulled out of
 * `.env.local` and pasted into a curl, which is a worse thing to have in shell
 * history than this is to have in the repo. The throttle
 * (`sendAllowance`) applies either way — 5 a run, 8 an hour, 20 a day — so a
 * mistyped limit cannot empty the queue.
 *
 * `limit` defaults to 1. Deliberately: the common case is dispatching a single
 * preflight and reading it before the rest of a batch goes anywhere.
 */
import { dispatchApprovedSends } from '@/lib/marketing/send/dispatch'

async function main() {
  const raw = process.argv[2]
  const limit = raw === undefined ? 1 : Number(raw)
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`limit must be a positive integer, got "${raw}"`)
  }

  const r = await dispatchApprovedSends({ limit })

  console.log(
    `\nclaimed ${r.claimed} · sent ${r.sent} · failed ${r.failed} · ` +
      `skipped ${r.skipped} · requeued ${r.requeued}`
  )
  console.log(`allowance ${r.allowance}${r.throttleReason ? ` — ${r.throttleReason}` : ''}\n`)

  for (const outcome of r.outcomes) console.log('  ' + JSON.stringify(outcome))

  if (r.failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
