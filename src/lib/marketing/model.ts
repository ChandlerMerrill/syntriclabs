import { anthropic } from '@ai-sdk/anthropic'

/**
 * Model selection for the marketing loop.
 *
 * This module uses the AI-SDK path rather than the managed-agent stack. The
 * whole job here is iterating prompts and measuring which ones win; putting
 * them behind a registration script plus env updates in three Vercel
 * environments defeats that. The core loop is cron jobs, not a chat surface,
 * so it doesn't need the agent loop either.
 *
 * Overridable per stage so a cheap mechanical pass and a hard judgement call
 * don't have to cost the same. Default is Opus 5 — the model each stage records
 * on the row it writes, so a performance comparison can tell which model
 * produced a winner.
 */
const DEFAULT_MODEL = 'claude-opus-5'

export function marketingModelId(stage?: 'extract' | 'generate' | 'score'): string {
  switch (stage) {
    case 'extract':
      return process.env.MARKETING_EXTRACT_MODEL || process.env.MARKETING_MODEL || DEFAULT_MODEL
    case 'generate':
      return process.env.MARKETING_GENERATE_MODEL || process.env.MARKETING_MODEL || DEFAULT_MODEL
    case 'score':
      return process.env.MARKETING_SCORE_MODEL || process.env.MARKETING_MODEL || DEFAULT_MODEL
    default:
      return process.env.MARKETING_MODEL || DEFAULT_MODEL
  }
}

export function marketingModel(stage?: 'extract' | 'generate' | 'score') {
  return anthropic(marketingModelId(stage))
}

/**
 * Output budget for structured-extraction calls.
 *
 * On Opus 5 thinking is on by default and `maxOutputTokens` caps thinking plus
 * response together — a budget sized around the answer alone truncates
 * mid-object. Generous on purpose.
 */
export const MARKETING_MAX_OUTPUT_TOKENS = 16000
