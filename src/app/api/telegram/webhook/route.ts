import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleChatGenerate } from '@/lib/ai/handler'
import { getOrCreateConversation, addMessage, getMessages } from '@/lib/services/messages'
import {
  sendLongTelegramMessage,
  sendTelegramMessage,
  sendTelegramDocument,
  sendTelegramChatAction,
  markdownToTelegramHTML,
} from '@/lib/telegram'

export const maxDuration = 60

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!
const AUTHORIZED_USER_ID = process.env.TELEGRAM_AUTHORIZED_USER_ID!

export async function POST(req: Request) {
  // Verify webhook secret
  const secretHeader = req.headers.get('x-telegram-bot-api-secret-token')
  if (secretHeader !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const message = body.message

  if (!message?.text) {
    return NextResponse.json({ ok: true })
  }

  const chatId = String(message.chat.id)
  const userId = String(message.from.id)
  const userText = message.text as string

  // Only allow authorized user
  if (userId !== AUTHORIZED_USER_ID) {
    await sendTelegramMessage(chatId, 'Unauthorized. This bot is private.')
    return NextResponse.json({ ok: true })
  }

  // Handle /start command
  if (userText === '/start') {
    await sendTelegramMessage(
      chatId,
      "Hey Chandler! Syntric AI is ready. Ask me anything about your clients, deals, projects, or documents."
    )
    return NextResponse.json({ ok: true })
  }

  // Handle /reset command — wipe conversation history for a fresh context
  if (userText === '/reset') {
    const supabase = await createServiceClient()
    const conversation = await getOrCreateConversation(supabase, 'telegram', chatId)
    await supabase.from('messages').delete().eq('conversation_id', conversation.id)
    await sendTelegramMessage(chatId, "Context cleared. Starting fresh — what's up?")
    return NextResponse.json({ ok: true })
  }

  try {
    const supabase = await createServiceClient()

    // Get or create conversation
    const conversation = await getOrCreateConversation(supabase, 'telegram', chatId)

    // Persist user message
    await addMessage(supabase, conversation.id, {
      role: 'user',
      content: userText,
    })

    // Load conversation history (last 20 messages)
    const { data: history } = await getMessages(supabase, conversation.id, { limit: 20 })
    const aiMessages = (history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }))

    // Send typing indicator
    await sendTelegramChatAction(chatId, 'typing')

    // Generate AI response
    const result = await handleChatGenerate({
      messages: aiMessages,
      channel: 'telegram',
      conversationId: conversation.id,
    })

    // Build tool calls for persistence
    const mergedToolCalls = result.toolCalls.map((tc) => {
      const tr = result.toolResults.find((r) => r.toolName === tc.toolName)
      return { toolName: tc.toolName, args: tc.args, result: tr?.result }
    })

    // Persist assistant response
    await addMessage(supabase, conversation.id, {
      role: 'assistant',
      content: result.text,
      toolCalls: mergedToolCalls.length > 0 ? mergedToolCalls : undefined,
    })

    // Check for document generation — send PDF via Telegram.
    // Both generateDocument (typed: proposal/price_sheet/contract) and
    // generateCustomDocument (freeform markdown brief) produce a documents row
    // with a storage_path; deliver either.
    for (const tr of result.toolResults) {
      if ((tr.toolName === 'generateDocument' || tr.toolName === 'generateCustomDocument') && tr.result) {
        const docResult = tr.result as { document?: { id: string; title: string }; viewUrl?: string }
        if (docResult.document) {
          try {
            // Get signed URL from Supabase storage
            const { data: doc } = await supabase
              .from('documents')
              .select('storage_path, title')
              .eq('id', docResult.document.id)
              .single()

            if (doc?.storage_path) {
              const { data: signedData } = await supabase
                .storage
                .from('documents')
                .createSignedUrl(doc.storage_path, 3600) // 1 hour expiry

              if (signedData?.signedUrl) {
                await sendTelegramChatAction(chatId, 'upload_document')
                await sendTelegramDocument(chatId, signedData.signedUrl, doc.title)
              }
            }
          } catch (e) {
            console.error('Failed to send document via Telegram:', e)
          }
        }
      }
    }

    // Send text response
    if (result.text) {
      const htmlText = markdownToTelegramHTML(result.text)
      await sendLongTelegramMessage(chatId, htmlText)
    }
  } catch (e) {
    console.error('Telegram webhook error:', e)
    await sendTelegramMessage(chatId, 'Something went wrong. Please try again.')
  }

  return NextResponse.json({ ok: true })
}
