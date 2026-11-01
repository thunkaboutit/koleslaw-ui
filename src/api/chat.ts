import type { ChatMessage } from './types'
import { ApiError } from './client'
import {
  decodeChatEvent,
  decodeEnhanceEvent,
  readSSE,
  type ChatEvent,
  type EventDecoder,
} from './sse'

const API_BASE = ''
const PUBLIC_API_KEY = 'pk_live_fNuYW07Bf16zLFLbghxSPERYV4QS1SWF4-OuLJ5JcCE'

/* Signed-in playground requests name one of the user's own keys by id; the API
   authenticates the session cookie + ownership and applies that key's plan
   limits. The public bearer stays on every request as the anonymous fallback. */
export function authHeaders(apiKeyId?: string | null): Record<string, string> {
  const headers: Record<string, string> = { Authorization: `Bearer ${PUBLIC_API_KEY}` }
  if (apiKeyId) headers['X-Api-Key-Id'] = apiKeyId
  return headers
}

// ── Error handling ──────────────────────────────────────────────────

/* The API returns {"detail": ...} (FastAPI/HTTPException) or {"error": ...}
   (ErrorResponse) bodies; surface the message instead of raw JSON. The 429
   from the anonymous daily cap arrives here with user-facing copy. The
   thrown ApiError keeps the status and, when present, the body's code. */
export async function throwApiError(response: Response): Promise<never> {
  const text = await response.text().catch(() => response.statusText)
  let message = text
  let code: string | null = null
  try {
    const body = JSON.parse(text)
    message = body.detail || body.error || text
    if (typeof body.code === 'string') code = body.code
  } catch {
    // not JSON — keep the raw text
  }
  if (!message) {
    message =
      response.status === 429 ? 'Rate limit reached. Please try again later.' : response.statusText
  }
  throw new ApiError(response.status, message, code)
}

/* Reads an SSE response body, or throws the API's error for a non-2xx. */
export async function readEventStream<E>(
  response: Response,
  decode: EventDecoder<E>,
  onEvent: (event: E) => void,
): Promise<void> {
  if (!response.ok) {
    await throwApiError(response)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  await readSSE(reader, decode, onEvent)
}

/* POSTs a JSON body and reads the SSE answer. */
export async function postEventStream<E>(
  path: string,
  body: unknown,
  decode: EventDecoder<E>,
  onEvent: (event: E) => void,
  options: { signal?: AbortSignal; apiKeyId?: string | null; headers?: Record<string, string> },
): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(options.apiKeyId),
      ...options.headers,
    },
    body: JSON.stringify(body),
    signal: options.signal,
  })
  await readEventStream(response, decode, onEvent)
}

// ── JSON endpoint (no files) ────────────────────────────────────────

export async function sendChatStream(
  messages: ChatMessage[],
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
  apiKeyId?: string | null,
): Promise<void> {
  await postEventStream('/v1/chat', { messages }, decodeChatEvent, onEvent, { signal, apiKeyId })
}

// ── Multipart endpoint (with files) ─────────────────────────────────

export async function sendChatStreamWithFiles(
  messages: ChatMessage[],
  files: File[],
  onEvent: (event: ChatEvent) => void,
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

  await readEventStream(response, decodeChatEvent, onEvent)
}

// ── One-shot enhance (the sessions kill switch fallback) ────────────

export async function sendEnhanceStream(
  prompt: string,
  context: string | null,
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
  apiKeyId?: string | null,
): Promise<void> {
  await postEventStream('/v1/enhance', { prompt, context }, decodeEnhanceEvent, onEvent, {
    signal,
    apiKeyId,
  })
}
