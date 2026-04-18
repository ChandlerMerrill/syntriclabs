/**
 * Fallback vault-creation helper — only run after mint-supabase-tokens.ts
 * has populated the SUPABASE_MCP_* env vars in .env.local.
 *
 * Creates an Anthropic vault named "syntric-supabase-mcp" and adds one
 * mcp_oauth credential for the Supabase MCP server. Prints the resulting
 * vault id; paste it into .env.local as ANTHROPIC_SUPABASE_VAULT_ID.
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })
loadEnv()
import Anthropic from '@anthropic-ai/sdk'

const required = [
  'ANTHROPIC_API_KEY',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_MCP_ACCESS_TOKEN',
  'SUPABASE_MCP_REFRESH_TOKEN',
  'SUPABASE_MCP_EXPIRES_AT',
  'SUPABASE_MCP_CLIENT_ID',
  'SUPABASE_MCP_TOKEN_ENDPOINT',
] as const

for (const key of required) {
  if (!process.env[key]) {
    console.error(`[setup-vault] missing env: ${key}`)
    process.exit(1)
  }
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
const MCP_URL = `https://mcp.supabase.com/mcp?project_ref=${process.env.SUPABASE_PROJECT_REF}`

async function main() {
  const vault = await (client.beta as any).vaults.create({
    name: 'syntric-supabase-mcp',
  })
  console.log(`[vault] created ${vault.id}`)

  const credential = await (client.beta as any).vaults.credentials.create(vault.id, {
    display_name: 'Supabase MCP',
    auth: {
      type: 'mcp_oauth',
      mcp_server_url: MCP_URL,
      access_token: process.env.SUPABASE_MCP_ACCESS_TOKEN!,
      expires_at: process.env.SUPABASE_MCP_EXPIRES_AT!,
      refresh: {
        refresh_token: process.env.SUPABASE_MCP_REFRESH_TOKEN!,
        client_id: process.env.SUPABASE_MCP_CLIENT_ID!,
        token_endpoint: process.env.SUPABASE_MCP_TOKEN_ENDPOINT!,
        token_endpoint_auth: { type: 'none' },
      },
    },
  })
  console.log(`[credential] created ${credential.id ?? '<id-unavailable>'}`)

  console.log('\n════════ PASTE INTO .env.local ════════')
  console.log(`ANTHROPIC_SUPABASE_VAULT_ID=${vault.id}`)
  console.log('═══════════════════════════════════════')
  console.log('\nNext: `npm run smoke-test-mcp`')
}

main().catch(err => {
  console.error('[setup-vault] fatal:', err)
  process.exit(1)
})
