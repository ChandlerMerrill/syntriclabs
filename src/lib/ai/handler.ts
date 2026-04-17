import { streamText, generateText, stepCountIs } from 'ai'
import type { ModelMessage, StreamTextOnFinishCallback, StepResult } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { crmTools } from '@/lib/ai/tools'
import {
  getWebSearchCountToday,
  logProviderToolCall,
  type AIAuditContext,
} from '@/lib/ai/audit'
import type { MessageChannel } from '@/lib/types'

interface HandlerOptions {
  messages: ModelMessage[]
  context?: {
    clientId?: string
    dealId?: string
    projectId?: string
    documentId?: string
  }
  channel?: MessageChannel | 'playground'
  conversationId?: string | null
  onFinish?: StreamTextOnFinishCallback<typeof crmTools>
}

const WEB_SEARCH_DAILY_CAP = 30
// Cap the per-request output reservation. Claude Sonnet 4's model-level cap
// is 64K, but Anthropic counts max_tokens against the 30K/min input rate limit
// at the tier-1 level — so the default reservation alone blocks every call.
// Our responses are chat-sized; 4K is plenty.
const MAX_OUTPUT_TOKENS = 4096

function buildAuditContext(options: HandlerOptions): AIAuditContext {
  return {
    conversationId: options.conversationId ?? null,
    channel: options.channel,
  }
}

// Move the system prompt into the messages array with an Anthropic cache_control
// breakpoint so the system text + all tool schemas before it are cached across
// steps and across successive conversation turns (5-min TTL). This is the main
// mitigation for the rate limit — without it, every step re-sends ~ the same
// 15–20K tokens of tools + system prompt as fresh input.
function withCachedSystem(system: string, messages: ModelMessage[]): ModelMessage[] {
  const cachedSystem = {
    role: 'system' as const,
    content: system,
    providerOptions: {
      anthropic: { cacheControl: { type: 'ephemeral' as const } },
    },
  }
  return [cachedSystem as ModelMessage, ...messages]
}

async function buildSystemWithCaps(options: HandlerOptions): Promise<string> {
  const base = buildSystemPrompt(options.context, options.channel as MessageChannel | undefined)
  const webSearchCount = await getWebSearchCountToday()
  if (webSearchCount >= WEB_SEARCH_DAILY_CAP) {
    return (
      base +
      `\n\n⚠ Web search daily cap (${WEB_SEARCH_DAILY_CAP}) reached — ${webSearchCount} calls already today. Do not call web_search this turn; rely on existing knowledge or ask the user.`
    )
  }
  return base
}

/**
 * Catch provider-executed tool calls (e.g. web_search) per-step and log them
 * to ai_actions — withAIAudit doesn't cover them because we don't wrap their execute().
 */
function makeStepLogger(ctx: AIAuditContext) {
  return async (step: StepResult<typeof crmTools>) => {
    for (const call of step.toolCalls ?? []) {
      if (call.toolName !== 'web_search') continue
      const match = (step.toolResults ?? []).find(
        (r) => (r as { toolCallId?: string }).toolCallId === (call as { toolCallId?: string }).toolCallId
      )
      const resultOutput = match ? (match as { output?: unknown }).output ?? match : null
      await logProviderToolCall('web_search', (call as { input?: unknown }).input ?? {}, resultOutput, ctx)
    }
  }
}

export async function handleChatStream(options: HandlerOptions) {
  const ctx = buildAuditContext(options)
  const system = await buildSystemWithCaps(options)
  const stepLogger = makeStepLogger(ctx)
  return streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    messages: withCachedSystem(system, options.messages),
    tools: crmTools,
    stopWhen: stepCountIs(10),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    experimental_context: ctx,
    onStepFinish: stepLogger,
    onFinish: options.onFinish,
  })
}

export async function handleChatGenerate(options: Omit<HandlerOptions, 'onFinish'>) {
  const ctx = buildAuditContext(options)
  const system = await buildSystemWithCaps(options)
  const stepLogger = makeStepLogger(ctx)
  const result = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    messages: withCachedSystem(system, options.messages),
    tools: crmTools,
    stopWhen: stepCountIs(10),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    experimental_context: ctx,
    onStepFinish: stepLogger,
  })

  return {
    text: result.text,
    toolCalls: result.steps.flatMap(s =>
      s.staticToolCalls.map(tc => ({
        toolName: tc.toolName,
        args: tc.input,
      }))
    ),
    toolResults: result.steps.flatMap(s =>
      s.staticToolResults.map(tr => ({
        toolName: tr.toolName,
        result: tr.output,
      }))
    ),
  }
}
