import { createServiceClient } from '@/lib/supabase/server'
import { verifyUnsubscribeToken } from '@/lib/marketing/send/unsubscribe-token'

/**
 * The public way out.
 *
 * One Route Handler serving both verbs rather than a `page.tsx` beside it —
 * App Router will not let a page and a route share a path segment, and the POST
 * is the load-bearing half.
 *
 * **GET does not unsubscribe.** Corporate link scanners, Outlook SafeLinks and
 * Gmail's own image proxy fetch every URL in a message before a human sees it.
 * A GET that mutated would unsubscribe people who never clicked, and it would
 * look exactly like they had.
 *
 * POST is both buttons: the confirm on the page below, and Gmail's RFC 8058
 * one-click, which posts `List-Unsubscribe=One-Click` as form data. Neither
 * needs the body read — the token is the whole request.
 *
 * A service client is required. `marketing_prospects` is behind an `auth_all`
 * policy scoped `to authenticated` (023:10-12), so an anon client sees no rows
 * and the update would silently do nothing.
 */

export const dynamic = 'force-dynamic'

const BG = '#0B1120'
const PANEL = '#111A2E'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT = '#F8FAFC'
const MUTED = '#94A3B8'
const ACCENT = '#2563EB'

function shell(title: string, inner: string, status: number): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:${BG};color:${TEXT};padding:24px;
       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
  main{width:100%;max-width:420px;background:${PANEL};border:1px solid ${BORDER};
       border-radius:14px;padding:32px}
  h1{margin:0 0 12px;font-size:19px;font-weight:600;letter-spacing:-0.01em}
  p{margin:0 0 20px;font-size:14px;line-height:1.6;color:${MUTED}}
  p:last-child{margin-bottom:0}
  button{width:100%;padding:11px 18px;border:0;border-radius:9px;background:${ACCENT};
         color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
  button:hover{background:#3B82F6}
  form{margin:0}
</style>
</head>
<body><main>${inner}</main></body>
</html>`

  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Nothing here is cacheable, and a cached "you're unsubscribed" shown to
      // the next person on a shared proxy would be a lie in both directions.
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

/**
 * The same page for every failure — wrong shape, bad signature, missing key.
 *
 * A response that differs by reason is an oracle: it would tell someone probing
 * the endpoint which ids are real, which is the only thing a stranger could
 * learn here.
 */
function notFound(): Response {
  return shell(
    'Link not found',
    `<h1>This link isn't valid</h1>
     <p>It may have been altered in transit, or it may not be an unsubscribe link at all.
        If you want to stop receiving email, replying to the message with
        &ldquo;unsubscribe&rdquo; works just as well.</p>`,
    404
  )
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  if (!verifyUnsubscribeToken(token)) return notFound()

  // The token verified, so this is a real link. Nothing is loaded and nothing is
  // written — the prospect is not read here, so there is no record to echo back
  // to whoever (or whatever) opened the URL.
  return shell(
    'Unsubscribe',
    `<h1>Unsubscribe from Syntric</h1>
     <p>Confirm below and you won't receive any further email from us.</p>
     <form method="post"><button type="submit">Unsubscribe</button></form>`,
    200
  )
}

export async function POST(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const prospectId = verifyUnsubscribeToken(token)
  if (!prospectId) return notFound()

  const supabase = await createServiceClient()

  // `.is('suppressed_at', null)` makes this idempotent and non-destructive: a
  // second click, or Gmail's one-click arriving after the page button, matches
  // zero rows and leaves the original timestamp and reason alone. It also means
  // a manual suppression with a specific reason is never overwritten by this
  // generic one.
  const { error } = await supabase
    .from('marketing_prospects')
    .update({
      suppressed_at: new Date().toISOString(),
      suppression_reason: 'Unsubscribed via email link',
    })
    .eq('id', prospectId)
    .is('suppressed_at', null)

  if (error) {
    return shell(
      'Something went wrong',
      `<h1>That didn't go through</h1>
       <p>Try again in a moment. If it still fails, reply to the email with
          &ldquo;unsubscribe&rdquo; and it will be handled by hand.</p>`,
      500
    )
  }

  // 200, never a redirect: RFC 8058 one-click clients treat a 3xx as a failure,
  // and the human case has nowhere better to go.
  return shell(
    'Unsubscribed',
    `<h1>You're unsubscribed</h1>
     <p>You won't get any more email from Syntric. If this was a mistake,
        reply to any earlier message and we'll put it back.</p>`,
    200
  )
}
