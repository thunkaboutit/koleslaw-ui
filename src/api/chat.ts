import type { ChatMessage, ChatChunk } from './types'

const API_BASE = ''
const PUBLIC_API_KEY = 'pk_live_5-sDRbrB_-8sQlGGSlQzx0ZJoqLVj_VZb4ZWYDVXdho'

export async function sendChatStream(
  messages: ChatMessage[],
  onChunk: (chunk: ChatChunk) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PUBLIC_API_KEY}` },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(text)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        onChunk(JSON.parse(data) as ChatChunk)
      } catch {
        // skip malformed chunks
      }
    }
  }
}
