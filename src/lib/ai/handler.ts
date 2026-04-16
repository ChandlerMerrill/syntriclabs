import { streamText, generateText, stepCountIs } from 'ai'
import type { ModelMessage, StreamTextOnFinishCallback } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { crmTools } from '@/lib/ai/tools'
import type { MessageChannel } from '@/lib/types'

interface HandlerOptions {
  messages: ModelMessage[]
  context?: {
    clientId?: string
    dealId?: string
    projectId?: string
    documentId?: string
  }
  channel?: MessageChannel
  onFinish?: StreamTextOnFinishCallback<typeof crmTools>
}

// For admin chat (streaming)
export function handleChatStream(options: HandlerOptions) {
  return streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: buildSystemPrompt(options.context, options.channel),
    messages: options.messages,
    tools: crmTools,
    stopWhen: stepCountIs(5),
    onFinish: options.onFinish,
  })
}

// For Telegram (non-streaming, collects full response)
export async function handleChatGenerate(options: Omit<HandlerOptions, 'onFinish'>) {
  const result = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: buildSystemPrompt(options.context, options.channel),
    messages: options.messages,
    tools: crmTools,
    stopWhen: stepCountIs(5),
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
