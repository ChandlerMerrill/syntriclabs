const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`

export async function sendTelegramMessage(chatId: string | number, text: string, parseMode?: 'HTML' | 'Markdown') {
  const res = await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(parseMode && { parse_mode: parseMode }),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Telegram sendMessage failed:', err)
  }
  return res
}

export async function sendLongTelegramMessage(chatId: string | number, text: string) {
  const MAX_LENGTH = 4096
  if (text.length <= MAX_LENGTH) {
    return sendTelegramMessage(chatId, text, 'HTML')
  }

  // Split on paragraph boundaries
  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= MAX_LENGTH) {
      chunks.push(remaining)
      break
    }

    // Find last double-newline within limit
    let splitAt = remaining.lastIndexOf('\n\n', MAX_LENGTH)
    if (splitAt === -1 || splitAt < MAX_LENGTH / 2) {
      // Fall back to single newline
      splitAt = remaining.lastIndexOf('\n', MAX_LENGTH)
    }
    if (splitAt === -1 || splitAt < MAX_LENGTH / 2) {
      // Fall back to space
      splitAt = remaining.lastIndexOf(' ', MAX_LENGTH)
    }
    if (splitAt === -1) {
      splitAt = MAX_LENGTH
    }

    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trimStart()
  }

  for (const chunk of chunks) {
    await sendTelegramMessage(chatId, chunk, 'HTML')
  }
}

export async function sendTelegramDocument(chatId: string | number, fileUrl: string, caption?: string) {
  const res = await fetch(`${API_BASE}/sendDocument`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      document: fileUrl,
      ...(caption && { caption }),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Telegram sendDocument failed:', err)
  }
  return res
}

export async function sendTelegramChatAction(chatId: string | number, action: 'typing' | 'upload_document') {
  await fetch(`${API_BASE}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action }),
  })
}

export async function setTelegramWebhook(webhookUrl: string, secret: string) {
  const res = await fetch(`${API_BASE}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message'],
    }),
  })
  return res.json()
}

export function markdownToTelegramHTML(markdown: string): string {
  let html = markdown

  // Bold: **text** → <b>text</b>
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')

  // Italic: *text* or _text_ → <i>text</i>
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<i>$1</i>')
  html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<i>$1</i>')

  // Code: `text` → <code>text</code>
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headers: ### text → <b>text</b> (Telegram has no header support)
  html = html.replace(/^#{1,3}\s+(.+)$/gm, '<b>$1</b>')

  // Bullet points: - text → • text
  html = html.replace(/^[-*]\s+/gm, '• ')

  // Escape special HTML chars in non-tag content (already handled by replacements above)
  // Only escape & that aren't already part of entities
  html = html.replace(/&(?!amp;|lt;|gt;)/g, '&amp;')

  return html
}
