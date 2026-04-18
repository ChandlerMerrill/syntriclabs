/**
 * Fallback OAuth helper — only run if the Anthropic Console UI can't create
 * an MCP OAuth credential directly. Performs Dynamic Client Registration +
 * PKCE authorization-code flow against the Supabase MCP server and prints
 * the five values needed by setup-vault.ts:
 *
 *   SUPABASE_MCP_ACCESS_TOKEN
 *   SUPABASE_MCP_REFRESH_TOKEN
 *   SUPABASE_MCP_EXPIRES_AT
 *   SUPABASE_MCP_CLIENT_ID
 *   SUPABASE_MCP_TOKEN_ENDPOINT
 *
 * Paste these into .env.local before running setup-vault.ts. Do not commit.
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()
import { createServer } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'
import { URL, URLSearchParams } from 'node:url'

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF
if (!PROJECT_REF) {
  console.error('SUPABASE_PROJECT_REF is not set. Add it to .env.local first.')
  process.exit(1)
}

const REDIRECT_PORT = 5175
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`
const MCP_BASE = `https://mcp.supabase.com/mcp?project_ref=${PROJECT_REF}`
const OAUTH_METADATA_URL = `https://mcp.supabase.com/mcp/.well-known/oauth-protected-resource?project_ref=${PROJECT_REF}`

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function main() {
  console.log(`[mint] discovering OAuth metadata from ${OAUTH_METADATA_URL}`)
  const protectedResRes = await fetch(OAUTH_METADATA_URL)
  if (!protectedResRes.ok) {
    throw new Error(`oauth-protected-resource discovery failed: ${protectedResRes.status} ${await protectedResRes.text()}`)
  }
  const protectedResMeta = await protectedResRes.json() as {
    authorization_servers?: string[]
    resource?: string
  }
  const authServerUrl = protectedResMeta.authorization_servers?.[0]
  if (!authServerUrl) {
    throw new Error(`No authorization_servers in metadata: ${JSON.stringify(protectedResMeta)}`)
  }
  console.log(`[mint] authorization server: ${authServerUrl}`)

  const authMetaUrl = authServerUrl.endsWith('/')
    ? `${authServerUrl}.well-known/oauth-authorization-server`
    : `${authServerUrl}/.well-known/oauth-authorization-server`
  const authMetaRes = await fetch(authMetaUrl)
  if (!authMetaRes.ok) {
    throw new Error(`oauth-authorization-server discovery failed: ${authMetaRes.status} ${await authMetaRes.text()}`)
  }
  const authMeta = await authMetaRes.json() as {
    authorization_endpoint: string
    token_endpoint: string
    registration_endpoint?: string
    code_challenge_methods_supported?: string[]
  }
  if (!authMeta.registration_endpoint) {
    throw new Error('Authorization server does not expose a registration_endpoint (Dynamic Client Registration required)')
  }
  console.log(`[mint] authorization_endpoint=${authMeta.authorization_endpoint}`)
  console.log(`[mint] token_endpoint=${authMeta.token_endpoint}`)
  console.log(`[mint] registration_endpoint=${authMeta.registration_endpoint}`)

  // Dynamic Client Registration
  const dcrRes = await fetch(authMeta.registration_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'syntric-labs phase 1 smoke test',
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'native',
    }),
  })
  if (!dcrRes.ok) {
    throw new Error(`DCR failed: ${dcrRes.status} ${await dcrRes.text()}`)
  }
  const dcr = await dcrRes.json() as { client_id: string }
  console.log(`[mint] client_id=${dcr.client_id}`)

  // PKCE
  const codeVerifier = b64url(randomBytes(32))
  const codeChallenge = b64url(createHash('sha256').update(codeVerifier).digest())
  const state = b64url(randomBytes(16))

  // Local callback server
  const codePromise = new Promise<string>((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!req.url) return
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`)
      if (url.pathname !== '/callback') {
        res.writeHead(404).end('not found')
        return
      }
      const code = url.searchParams.get('code')
      const retState = url.searchParams.get('state')
      const error = url.searchParams.get('error')
      if (error) {
        res.writeHead(400, { 'content-type': 'text/plain' }).end(`OAuth error: ${error}`)
        server.close()
        reject(new Error(`OAuth error: ${error}`))
        return
      }
      if (!code || retState !== state) {
        res.writeHead(400, { 'content-type': 'text/plain' }).end('state mismatch or missing code')
        server.close()
        reject(new Error('state mismatch or missing code'))
        return
      }
      res.writeHead(200, { 'content-type': 'text/html' }).end('<html><body><h1>OK</h1><p>You may close this tab.</p></body></html>')
      server.close()
      resolve(code)
    })
    server.listen(REDIRECT_PORT)
  })

  const authUrl = new URL(authMeta.authorization_endpoint)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', dcr.client_id)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('resource', MCP_BASE)

  console.log('\n[mint] Open this URL in your browser (should happen automatically):')
  console.log(`  ${authUrl.toString()}`)
  try {
    const { spawn } = await import('node:child_process')
    spawn('open', [authUrl.toString()], { detached: true, stdio: 'ignore' }).unref()
  } catch {
    // ignore — user opens manually
  }

  const code = await codePromise
  console.log(`[mint] received authorization code (${code.slice(0, 8)}…)`)

  const tokenRes = await fetch(authMeta.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: dcr.client_id,
      code_verifier: codeVerifier,
    }).toString(),
  })
  if (!tokenRes.ok) {
    throw new Error(`token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`)
  }
  const tok = await tokenRes.json() as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
  }
  const expiresAt = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString()

  console.log('\n════════ PASTE INTO .env.local ════════')
  console.log(`SUPABASE_MCP_ACCESS_TOKEN=${tok.access_token}`)
  console.log(`SUPABASE_MCP_REFRESH_TOKEN=${tok.refresh_token ?? ''}`)
  console.log(`SUPABASE_MCP_EXPIRES_AT=${expiresAt}`)
  console.log(`SUPABASE_MCP_CLIENT_ID=${dcr.client_id}`)
  console.log(`SUPABASE_MCP_TOKEN_ENDPOINT=${authMeta.token_endpoint}`)
  console.log('═══════════════════════════════════════')
  console.log('\nNext: `npx tsx scripts/managed-agent/setup-vault.ts`')
}

main().catch(err => {
  console.error('[mint] fatal:', err)
  process.exit(1)
})
