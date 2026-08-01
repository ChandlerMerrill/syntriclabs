/**
 * Mints a browser-shaped session cookie for the admin user.
 *
 * Exists so the marketing loop can be walked against the real API routes from
 * a terminal instead of a browser. It does not bypass anything: the cookie is
 * an ordinary session for a real user, so `requireAdmin()` and every RLS policy
 * behave exactly as they do for a signed-in operator. What it avoids is
 * reimplementing the routes in a script, which would verify the copy rather
 * than the code that ships.
 *
 * Prints a cookie string suitable for `curl -H "Cookie: ..."`.
 *
 *   tsx --env-file=.env.local scripts/db/mint-admin-cookie.ts [email]
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
const secret = process.env.SUPABASE_SECRET_KEY!

const email = process.argv[2] || 'chandler@syntriclabs.com'

/** @supabase/ssr chunks cookies above this many characters. */
const CHUNK_SIZE = 3180

function cookieBase(): string {
  const ref = new URL(url).hostname.split('.')[0]
  return `sb-${ref}-auth-token`
}

async function main() {
  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError) throw new Error(`generateLink: ${linkError.message}`)

  const tokenHash = link.properties?.hashed_token
  if (!tokenHash) throw new Error('No hashed_token returned')

  const pub = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: verified, error: verifyError } = await pub.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  })
  if (verifyError) throw new Error(`verifyOtp: ${verifyError.message}`)

  const session = verified.session
  if (!session) throw new Error('No session returned')

  // The shape @supabase/ssr writes: base64url of the session JSON, prefixed,
  // split across numbered cookies once it exceeds the chunk size.
  const payload = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  const name = cookieBase()

  const parts: string[] = []
  if (payload.length <= CHUNK_SIZE) {
    parts.push(`${name}=${payload}`)
  } else {
    for (let i = 0, n = 0; i < payload.length; i += CHUNK_SIZE, n++) {
      parts.push(`${name}.${n}=${payload.slice(i, i + CHUNK_SIZE)}`)
    }
  }

  console.log(parts.join('; '))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
