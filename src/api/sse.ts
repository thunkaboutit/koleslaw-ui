/* Typed SSE reader.  Frames the byte stream into `data:` payloads, parses
   each as JSON, and hands it to a decoder that returns a typed event or
   null.  Null means unknown or malformed: the event is dropped, never
   rendered.  Each event family (chat, sessions, one-shot enhance) has its
   own union and decoder and shares readSSE. */

import type { SessionErrorEvent, SessionStartEvent, TurnEvent, TurnKind } from './types'

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

export function isRecord(value: unknown): value is Record<string, unknown> {
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

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

const TURN_KINDS: readonly unknown[] = ['question', 'prompt', 'empty'] satisfies TurnKind[]

/* Mirrors the API's SessionStreamEvent.  Session text events carry only a
   delta; decodeChatEvent reads the missing finish_reason as null. */
export const decodeSessionEvent: EventDecoder<SessionEvent> = (data) => {
  if (!isRecord(data)) return null
  switch (data.type) {
    case 'thinking':
    case 'text':
      return decodeChatEvent(data)
    case 'session':
      if (typeof data.session_id !== 'string' || !data.session_id) return null
      if (!isCount(data.expires_in) || !isCount(data.turns_left)) return null
      return {
        type: 'session',
        session_id: data.session_id,
        expires_in: data.expires_in,
        turns_left: data.turns_left,
      }
    case 'turn':
      if (!TURN_KINDS.includes(data.kind) || typeof data.model_used !== 'string') return null
      if (!isCount(data.turn) || !isCount(data.turns_left)) return null
      return {
        type: 'turn',
        kind: data.kind as TurnKind,
        turn: data.turn,
        turns_left: data.turns_left,
        model_used: data.model_used,
      }
    case 'error':
      if (typeof data.code !== 'string' || typeof data.message !== 'string') return null
      return { type: 'error', code: data.code, message: data.message }
    default:
      return null
  }
}

/* Mirrors POST /v1/enhance: EnhanceChunk deltas, or one EnhanceResponse when
   the prompt cache hits, which reads as the whole answer in one text event. */
export const decodeEnhanceEvent: EventDecoder<ChatEvent> = (data) => {
  if (isRecord(data) && typeof data.enhanced_prompt === 'string') {
    return { type: 'text', delta: data.enhanced_prompt, finish_reason: 'stop' }
  }
  return decodeChatEvent(data)
}
