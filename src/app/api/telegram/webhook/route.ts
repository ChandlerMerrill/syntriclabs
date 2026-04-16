import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { handleChatGenerate } from '@/lib/ai/handler'
import { getOrCreateConversation, addMessage, getMessages } from '@/lib/services/messages'
import { logAutoActivity } from '@/lib/services/activities'
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

    // Check for document generation — send PDF via Telegram
    for (const tr of result.toolResults) {
      if (tr.toolName === 'generateDocument' && tr.result) {
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

    // Log activity for any client-related tool calls
    const clientIds = new Set<string>()
    for (const tc of result.toolCalls) {
      const args = tc.args as Record<string, unknown>
      if (args.clientId) clientIds.add(args.clientId as string)
      if (args.client_id) clientIds.add(args.client_id as string)
    }

    for (const clientId of clientIds) {
      await logAutoActivity(supabase, {
        client_id: clientId,
        title: 'AI query via Telegram',
        description: `Asked: "${userText.slice(0, 100)}"`,
        type: 'note',
        metadata: { channel: 'telegram', conversation_id: conversation.id },
      })
    }
  } catch (e) {
    console.error('Telegram webhook error:', e)
    await sendTelegramMessage(chatId, 'Something went wrong. Please try again.')
  }

  return NextResponse.json({ ok: true })
}
