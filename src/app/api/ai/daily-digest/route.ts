import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getDailyDigest, type DailyDigest } from '@/lib/services/ai-actions'
import { sendLongTelegramMessage, markdownToTelegramHTML } from '@/lib/telegram'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const digest = await getDailyDigest(supabase, since)

  if (digest.totalCalls === 0) {
    return NextResponse.json({ ok: true, skipped: 'no tool calls in last 24h' })
  }

  const chatId = process.env.TELEGRAM_AUTHORIZED_USER_ID
  if (!chatId) {
    return NextResponse.json({ error: 'TELEGRAM_AUTHORIZED_USER_ID not set' }, { status: 500 })
  }

  const message = formatDigestMarkdown(digest)
  await sendLongTelegramMessage(chatId, markdownToTelegramHTML(message))

  return NextResponse.json({ ok: true, digest })
}

function formatDigestMarkdown(d: DailyDigest): string {
  const lines: string[] = []
  lines.push(`**AI Actions — last 24h**`)
  lines.push('')

  const rate = (d.errorRate * 100).toFixed(0)
  lines.push(
    `${d.totalCalls} tool call${d.totalCalls === 1 ? '' : 's'} — ${d.successCount} ok, ${d.errorCount} error${d.errorCount === 1 ? '' : 's'} (${rate}% error rate).`
  )

  const created: string[] = []
  if (d.createdCounts.clients > 0) created.push(`${d.createdCounts.clients} client${d.createdCounts.clients === 1 ? '' : 's'}`)
  if (d.createdCounts.leads > 0) created.push(`${d.createdCounts.leads} lead${d.createdCounts.leads === 1 ? '' : 's'}`)
  if (d.createdCounts.deals > 0) created.push(`${d.createdCounts.deals} deal${d.createdCounts.deals === 1 ? '' : 's'}`)
  if (created.length > 0) lines.push(`Created: ${created.join(', ')}.`)

  if (d.customDocsCount > 0) lines.push(`Generated ${d.customDocsCount} custom document${d.customDocsCount === 1 ? '' : 's'}.`)

  lines.push(`Web searches: ${d.webSearchCount}.`)

  if (d.writeSqlCalls.length > 0) {
    lines.push('')
    lines.push(`**writeSql** (${d.writeSqlCalls.length}):`)
    for (const w of d.writeSqlCalls.slice(0, 5)) {
      lines.push(`- ${w.table ?? '?'} × ${w.rowCount} — ${w.reason}`)
    }
  }

  if (d.hardDeletes.length > 0) {
    lines.push('')
    lines.push(`**Hard deletes** (${d.hardDeletes.length}):`)
    for (const h of d.hardDeletes) {
      lines.push(`- ${h.toolName}: ${h.displayName}`)
    }
  }

  lines.push('')
  lines.push(`**Top tools:**`)
  for (const t of d.topTools) {
    lines.push(`- ${t.tool} × ${t.count}`)
  }

  if (d.errors.length > 0) {
    lines.push('')
    lines.push(`**Errors:**`)
    for (const e of d.errors) {
      lines.push(`- ${e.toolName}: ${e.message}`)
    }
  }

  lines.push('')
  lines.push(`→ /admin/ai-actions`)

  return lines.join('\n')
}
