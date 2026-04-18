/**
 * Vault-creation helper.
 *
 * Creates an Anthropic vault named "syntric-supabase-mcp" and adds one
 * credential for the Supabase MCP server. Prints the resulting vault id;
 * paste it into .env.local as ANTHROPIC_SUPABASE_VAULT_ID.
 *
 * Credential mode is chosen by env:
 *   - If SUPABASE_MCP_PAT is set → static_bearer credential (recommended;
 *     Supabase's OAuth flow currently issues opaque tokens the MCP server
 *     rejects as "JWT could not be decoded").
 *   - Otherwise → mcp_oauth credential built from SUPABASE_MCP_* fields
 *     minted by mint-supabase-tokens.ts.
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()
import Anthropic from '@anthropic-ai/sdk'

const baseRequired = ['ANTHROPIC_API_KEY', 'SUPABASE_PROJECT_REF'] as const
const oauthRequired = [
  'SUPABASE_MCP_ACCESS_TOKEN',
  'SUPABASE_MCP_REFRESH_TOKEN',
  'SUPABASE_MCP_EXPIRES_AT',
  'SUPABASE_MCP_CLIENT_ID',
  'SUPABASE_MCP_CLIENT_SECRET',
  'SUPABASE_MCP_TOKEN_ENDPOINT',
] as const

for (const key of baseRequired) {
  if (!process.env[key]) {
    console.error(`[setup-vault] missing env: ${key}`)
    process.exit(1)
  }
}

const usePat = Boolean(process.env.SUPABASE_MCP_PAT)
if (!usePat) {
  for (const key of oauthRequired) {
    if (!process.env[key]) {
      console.error(`[setup-vault] missing env: ${key} (or set SUPABASE_MCP_PAT to use a personal access token instead)`)
      process.exit(1)
    }
  }
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const MCP_URL = `https://mcp.supabase.com/mcp?project_ref=${process.env.SUPABASE_PROJECT_REF}`

async function main() {
  const vault = await (client.beta as any).vaults.create({
    display_name: 'syntric-supabase-mcp',
  })
  console.log(`[vault] created ${vault.id}`)

  const auth = usePat
    ? {
        type: 'static_bearer',
        mcp_server_url: MCP_URL,
        token: process.env.SUPABASE_MCP_PAT!,
      }
    : {
        type: 'mcp_oauth',
        mcp_server_url: MCP_URL,
        access_token: process.env.SUPABASE_MCP_ACCESS_TOKEN!,
        expires_at: process.env.SUPABASE_MCP_EXPIRES_AT!,
        refresh: {
          refresh_token: process.env.SUPABASE_MCP_REFRESH_TOKEN!,
          client_id: process.env.SUPABASE_MCP_CLIENT_ID!,
          token_endpoint: process.env.SUPABASE_MCP_TOKEN_ENDPOINT!,
          token_endpoint_auth: {
            type: 'client_secret_post',
            client_secret: process.env.SUPABASE_MCP_CLIENT_SECRET!,
          },
        },
      }

  const credential = await (client.beta as any).vaults.credentials.create(vault.id, {
    display_name: usePat ? 'Supabase MCP (PAT)' : 'Supabase MCP (OAuth)',
    auth,
  })
  console.log(`[credential] created ${credential.id ?? '<id-unavailable>'} (${usePat ? 'static_bearer' : 'mcp_oauth'})`)

  console.log('\n════════ PASTE INTO .env.local ════════')
  console.log(`ANTHROPIC_SUPABASE_VAULT_ID=${vault.id}`)
  console.log('═══════════════════════════════════════')
  console.log('\nNext: `npm run smoke-test-mcp`')
}

main().catch(err => {
  console.error('[setup-vault] fatal:', err)
  process.exit(1)
})
