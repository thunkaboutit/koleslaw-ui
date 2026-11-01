/* Typed SSE reader.  Frames the byte stream into `data:` payloads, parses
   each as JSON, and hands it to a decoder that returns a typed event or
   null.  Null means unknown or malformed: the event is dropped, never
   rendered.  A new event family (for example sessions) adds its own union
   and decoder and reuses readSSE and decodeChatEvent unchanged. */

import type { SessionErrorEvent, SessionStartEvent, TurnEvent } from './types'

export interface ThinkingEvent {
  type: 'thinking'
  delta: string
}

export interface TextEvent {
  type: 'text'
  delta: string
  finish_reason: string | null
}

export type ChatEvent = ThinkingEvent | TextEvent

export type SessionEvent =
  | ThinkingEvent
  | TextEvent
  | SessionStartEvent
  | TurnEvent
  | SessionErrorEvent

/* Returns the typed event, or null to drop the payload. */
export type EventDecoder<E> = (data: unknown) => E | null

const DONE = '[DONE]'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/* Mirrors the API's ChatChunk.  A missing type is text, the schema default. */
export const decodeChatEvent: EventDecoder<ChatEvent> = (data) => {
  if (!isRecord(data) || typeof data.delta !== 'string') return null
  const type = data.type ?? 'text'
  if (type === 'thinking') return { type, delta: data.delta }
  if (type !== 'text') return null
  const finish = data.finish_reason ?? null
  if (finish !== null && typeof finish !== 'string') return null
  return { type, delta: data.delta, finish_reason: finish }
}

function parseJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/* Reads until the stream ends or a [DONE] payload arrives. */
export async function readSSE<E>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  decode: EventDecoder<E>,
  onEvent: (event: E) => void,
): Promise<void> {
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
      const payload = line.slice(6).trim()
      if (payload === DONE) return
      const event = decode(parseJSON(payload))
      if (event !== null) onEvent(event)
    }
  }
}
