import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendChatStream, sendChatStreamWithFiles } from '../chat'
import type { ChatMessage } from '../types'
import { frame, sseResponse } from './sseStream'

const MESSAGES: ChatMessage[] = [{ role: 'user', content: 'hi' }]

function emptyStreamResponse() {
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => ({ done: true, value: undefined }),
      }),
    },
  } as unknown as Response
}

function stubFetch() {
  const fetchMock = vi.fn(async () => emptyStreamResponse())
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function sentHeaders(fetchMock: ReturnType<typeof stubFetch>): Record<string, string> {
  const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
  return init.headers as Record<string, string>
}

describe('chat request auth headers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends only the public bearer for anonymous visitors', async () => {
    const fetchMock = stubFetch()

    await sendChatStream(MESSAGES, () => {})

    const headers = sentHeaders(fetchMock)
    expect(headers.Authorization).toMatch(/^Bearer pk_live_/)
    expect(headers['X-Api-Key-Id']).toBeUndefined()
  })

  it('names the selected key when one is provided', async () => {
    const fetchMock = stubFetch()

    await sendChatStream(MESSAGES, () => {}, undefined, 'key-123')

    expect(sentHeaders(fetchMock)['X-Api-Key-Id']).toBe('key-123')
  })

  it('names the selected key on the multipart endpoint too', async () => {
    const fetchMock = stubFetch()

    await sendChatStreamWithFiles(MESSAGES, [], () => {}, undefined, 'key-123')

    const headers = sentHeaders(fetchMock)
    expect(headers['X-Api-Key-Id']).toBe('key-123')
    // The browser must set the multipart Content-Type itself
    expect(headers['Content-Type']).toBeUndefined()
  })
})

describe('chat stream events', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function received(reads: string[]): Promise<unknown[]> {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => sseResponse(reads)),
    )
    const events: unknown[] = []
    await sendChatStream(MESSAGES, (event) => events.push(event))
    return events
  }

  it('passes thinking and text events through in order', async () => {
    const events = await received([
      frame({ delta: 'plan', type: 'thinking', finish_reason: null }),
      frame({ delta: 'answer', type: 'text', finish_reason: null }),
      frame({ delta: '', type: 'text', finish_reason: 'stop' }),
    ])

    expect(events).toEqual([
      { type: 'thinking', delta: 'plan' },
      { type: 'text', delta: 'answer', finish_reason: null },
      { type: 'text', delta: '', finish_reason: 'stop' },
    ])
  })

  it('reads an event with no type as text, the API schema default', async () => {
    const events = await received([frame({ delta: 'answer' })])

    expect(events).toEqual([{ type: 'text', delta: 'answer', finish_reason: null }])
  })

  it('drops events with an unknown type', async () => {
    const events = await received([
      frame({ type: 'question', questions: [{ id: 'q1', text: 'Which stack?' }] }),
      frame({ type: 'question', delta: 'Which stack?' }),
      frame({ delta: 'kept', type: 'text', finish_reason: null }),
    ])

    expect(events).toEqual([{ type: 'text', delta: 'kept', finish_reason: null }])
  })

  it('drops malformed events', async () => {
    const events = await received([
      'data: {not json\n\n',
      'data: null\n\n',
      'data: 42\n\n',
      'data: ["a"]\n\n',
      frame({ type: 'text' }),
      frame({ type: 'thinking', delta: 7 }),
      frame({ type: 'text', delta: 'x', finish_reason: 3 }),
      frame({ delta: 'kept', type: 'text', finish_reason: null }),
    ])

    expect(events).toEqual([{ type: 'text', delta: 'kept', finish_reason: null }])
  })

  it('ignores non-data lines', async () => {
    const events = await received([
      ': keepalive\n\n',
      'event: message\n',
      frame({ delta: 'kept', type: 'text', finish_reason: null }),
    ])

    expect(events).toEqual([{ type: 'text', delta: 'kept', finish_reason: null }])
  })

  it('joins an event split across reads', async () => {
    const raw = frame({ delta: 'joined', type: 'text', finish_reason: null })
    const events = await received([raw.slice(0, 12), raw.slice(12)])

    expect(events).toEqual([{ type: 'text', delta: 'joined', finish_reason: null }])
  })

  it('stops at the done marker', async () => {
    const events = await received([
      frame({ delta: 'a', type: 'text', finish_reason: null }),
      'data: [DONE]\n\n',
      frame({ delta: 'late', type: 'text', finish_reason: null }),
    ])

    expect(events).toEqual([{ type: 'text', delta: 'a', finish_reason: null }])
  })
})
