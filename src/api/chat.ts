import type { ChatMessage, ChatChunk } from './types'

const API_BASE = ''
const PUBLIC_API_KEY = 'pk_live_fNuYW07Bf16zLFLbghxSPERYV4QS1SWF4-OuLJ5JcCE'

/* Signed-in playground requests name one of the user's own keys by id; the API
   authenticates the session cookie + ownership and applies that key's plan
   limits. The public bearer stays on every request as the anonymous fallback. */
function authHeaders(apiKeyId?: string | null): Record<string, string> {
  const headers: Record<string, string> = { Authorization: `Bearer ${PUBLIC_API_KEY}` }
  if (apiKeyId) headers['X-Api-Key-Id'] = apiKeyId
  return headers
}

// ── Error handling ──────────────────────────────────────────────────

/* The API returns {"detail": ...} (FastAPI/HTTPException) or {"error": ...}
   (ErrorResponse) bodies; surface the message instead of raw JSON. The 429
   from the anonymous daily cap arrives here with user-facing copy. */
async function throwApiError(response: Response): Promise<never> {
  const text = await response.text().catch(() => response.statusText)
  let message = text
  try {
    const body = JSON.parse(text)
    message = body.detail || body.error || text
  } catch {
    // not JSON — keep the raw text
  }
  if (!message) {
    message =
      response.status === 429 ? 'Rate limit reached. Please try again later.' : response.statusText
  }
  throw new Error(message)
}

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
  apiKeyId?: string | null,
): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(apiKeyId) },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok) {
    await throwApiError(response)
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
  apiKeyId?: string | null,
): Promise<void> {
  const formData = new FormData()
  formData.append('messages', JSON.stringify(messages))
  for (const file of files) {
    formData.append('files', file)
  }

  const response = await fetch(`${API_BASE}/v1/chat/upload`, {
    method: 'POST',
    // Let the browser set Content-Type with the multipart boundary
    headers: authHeaders(apiKeyId),
    body: formData,
    signal,
  })

  if (!response.ok) {
    await throwApiError(response)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  await parseSSEStream(reader, onChunk)
}
