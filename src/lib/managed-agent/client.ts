import Anthropic from '@anthropic-ai/sdk'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is required for managed-agent path`)
  return v
}

export const anthropicClient = new Anthropic()

export const AGENT_ID = () => requireEnv('ANTHROPIC_AGENT_ID')
export const AGENT_VERSION = () => Number(requireEnv('ANTHROPIC_AGENT_VERSION'))
export const ENV_ID = () => requireEnv('ANTHROPIC_ENV_ID')
export const VAULT_ID = () => requireEnv('ANTHROPIC_SUPABASE_VAULT_ID')
