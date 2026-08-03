import { createHmac, timingSafeEqual } from 'crypto'

/**
 * The unsubscribe token.
 *
 * Stateless and signed rather than a row in a table, for one reason: the URL has
 * to be computed at *queue* time, when `renderSend` freezes `rendered_html`, and
 * the send row does not exist yet at that point. A stored token would need a
 * write before the write it belongs to.
 *
 * The payload is the prospect id and nothing else, so a token cannot name which
 * send the unsubscribe came from. That is the price of computing it early, and
 * it is stated here rather than discovered later. If per-send attribution is
 * wanted, the payload can carry `prospectId|campaignId|variantId` — all three
 * are known at render time — at roughly double the length.
 *
 * Suppression is global on the prospect anyway, so the missing attribution
 * costs analytics, never correctness: whichever send prompted it, the person
 * stops hearing from us.
 */

/** base64url of 16 raw uuid bytes. */
const ID_LEN = 22
/** base64url of the HMAC, truncated. 22 chars ≈ 132 bits — far past guessable. */
const SIG_LEN = 22

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Same shape as `getKey()` in `src/lib/gmail/crypto.ts` on purpose: it throws
 * rather than falling back. A default secret would mean anyone who read the
 * source could suppress any prospect, and — worse — the failure would be
 * silent, which is exactly how a signing key stays wrong for months.
 */
function secret(): Buffer {
  const hex = process.env.MARKETING_UNSUBSCRIBE_SECRET
  if (!hex || hex.length !== 64 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error(
      'MARKETING_UNSUBSCRIBE_SECRET must be a 64-character hex string (openssl rand -hex 32)'
    )
  }
  return Buffer.from(hex, 'hex')
}

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!raw) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be set to build unsubscribe links')
  }
  return raw.replace(/\/+$/, '')
}

/**
 * Whether an unsubscribe link can be built at all right now.
 *
 * Returns the reason it cannot, or null. Callers that must not throw — the send
 * gate — use this; callers that should fail loudly just call the functions.
 */
export function unsubscribeConfigError(): string | null {
  try {
    secret()
    siteUrl()
    return null
  } catch (err) {
    return err instanceof Error ? err.message : 'Unsubscribe link is not configured'
  }
}

function uuidToBytes(uuid: string): Buffer {
  if (!UUID_RE.test(uuid)) throw new Error(`Not a uuid: ${uuid}`)
  return Buffer.from(uuid.replace(/-/g, ''), 'hex')
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

function sign(idPart: string): string {
  return createHmac('sha256', secret()).update(idPart).digest('base64url').slice(0, SIG_LEN)
}

export function signUnsubscribeToken(prospectId: string): string {
  const idPart = uuidToBytes(prospectId).toString('base64url')
  return `${idPart}.${sign(idPart)}`
}

/**
 * The prospect id a token names, or null.
 *
 * Null for every failure mode — wrong shape, wrong length, bad signature — and
 * the caller renders the same 404 for all of them. A token that fails differently
 * depending on why is an oracle for probing which prospect ids exist.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  if (typeof token !== 'string') return null

  const [idPart, sigPart, ...rest] = token.split('.')
  if (rest.length > 0) return null
  if (!idPart || !sigPart) return null
  // Length-checked before comparing: `timingSafeEqual` throws on a length
  // mismatch, and a thrown error is a 500 where a 404 belongs.
  if (idPart.length !== ID_LEN || sigPart.length !== SIG_LEN) return null

  let expected: string
  try {
    expected = sign(idPart)
  } catch {
    return null
  }

  const given = Buffer.from(sigPart, 'utf8')
  const want = Buffer.from(expected, 'utf8')
  if (given.length !== want.length) return null
  if (!timingSafeEqual(given, want)) return null

  const bytes = Buffer.from(idPart, 'base64url')
  if (bytes.length !== 16) return null

  return bytesToUuid(bytes)
}

export function unsubscribeUrl(prospectId: string): string {
  return `${siteUrl()}/u/${signUnsubscribeToken(prospectId)}`
}
