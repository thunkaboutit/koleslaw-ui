import type { ChatMessage, ChatChunk } from './types'

const API_BASE = ''
const PUBLIC_API_KEY = 'pk_live_fNuYW07Bf16zLFLbghxSPERYV4QS1SWF4-OuLJ5JcCE'

// ── Shared SSE parser ───────────────────────────────────────────────

function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (chunk: ChatChunk) => void,
): Promise<void> {
  const decoder = new TextDecoder()
  let buffer = ''

  return (async () => {
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
  })()
}

// ── JSON endpoint (no files) ────────────────────────────────────────

export async function sendChatStream(
  messages: ChatMessage[],
  onChunk: (chunk: ChatChunk) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/chat`, {
    method: 'POST',
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

  await parseSSEStream(reader, onChunk)
}

// ── Multipart endpoint (with files) ─────────────────────────────────

export async function sendChatStreamWithFiles(
  messages: ChatMessage[],
  files: File[],
  onChunk: (chunk: ChatChunk) => void,
  signal?: AbortSignal,
): Promise<void> {
  const formData = new FormData()
  formData.append('messages', JSON.stringify(messages))
  for (const file of files) {
    formData.append('files', file)
  }

  const response = await fetch(`${API_BASE}/v1/chat/upload`, {
    method: 'POST',
    // Let the browser set Content-Type with the multipart boundary
    headers: { Authorization: `Bearer ${PUBLIC_API_KEY}` },
    body: formData,
    signal,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new Error(text)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  await parseSSEStream(reader, onChunk)
}
