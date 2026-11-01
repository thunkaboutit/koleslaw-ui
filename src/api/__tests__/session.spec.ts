import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendEnhanceStream } from '../chat'
import { deleteSession, sendTurn, startSession } from '../session'
import { errorResponse, frame, sseEvents, sseResponse } from './sseStream'

type FetchCall = [string, RequestInit]

function stubFetch(response: () => Response) {
  const fetchMock = vi.fn(async () => response())
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function call(fetchMock: ReturnType<typeof stubFetch>, i = 0): FetchCall {
  return fetchMock.mock.calls[i] as unknown as FetchCall
}

function headersOf(fetchMock: ReturnType<typeof stubFetch>): Record<string, string> {
  return call(fetchMock)[1].headers as Record<string, string>
}

function bodyOf(fetchMock: ReturnType<typeof stubFetch>): unknown {
  return JSON.parse(call(fetchMock)[1].body as string)
}

const SESSION = { type: 'session', session_id: 'sid-1', expires_in: 1800, turns_left: 3 }
const TURN = { type: 'turn', kind: 'question', turn: 1, turns_left: 2, model_used: 'm' }

describe('session requests', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts a session with the prompt and only the public bearer', async () => {
    const fetchMock = stubFetch(() => sseEvents([]))

    await startSession({ prompt: 'write a poem', context: null }, () => {})

    const [url, init] = call(fetchMock)
    expect(url).toBe('/v1/sessions')
    expect(init.method).toBe('POST')
    expect(bodyOf(fetchMock)).toEqual({ prompt: 'write a poem', context: null })
    const headers = headersOf(fetchMock)
    expect(headers.Authorization).toMatch(/^Bearer pk_live_/)
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['X-Api-Key-Id']).toBeUndefined()
    expect(headers['X-Session-Id']).toBeUndefined()
  })

  it('names the selected key when signed in', async () => {
    const fetchMock = stubFetch(() => sseEvents([]))

    await startSession({ prompt: 'p' }, () => {}, { apiKeyId: 'key-123' })

    expect(headersOf(fetchMock)['X-Api-Key-Id']).toBe('key-123')
  })

  it('sends a reply to the turns endpoint with the session id in a header', async () => {
    const fetchMock = stubFetch(() => sseEvents([]))

    await sendTurn('sid-1', { message: 'Python' }, () => {}, { apiKeyId: 'key-123' })

    const [url, init] = call(fetchMock)
    expect(url).toBe('/v1/sessions/turns')
    expect(init.method).toBe('POST')
    expect(bodyOf(fetchMock)).toEqual({ message: 'Python' })
    const headers = headersOf(fetchMock)
    expect(headers['X-Session-Id']).toBe('sid-1')
    expect(headers['X-Api-Key-Id']).toBe('key-123')
    expect(headers.Authorization).toMatch(/^Bearer pk_live_/)
  })

  it('sends a finalize with no message', async () => {
    const fetchMock = stubFetch(() => sseEvents([]))

    await sendTurn('sid-1', { action: 'finalize' }, () => {})

    expect(bodyOf(fetchMock)).toEqual({ action: 'finalize' })
  })

  it('passes the abort signal through', async () => {
    const fetchMock = stubFetch(() => sseEvents([]))
    const controller = new AbortController()

    await sendTurn('sid-1', { message: 'x' }, () => {}, { signal: controller.signal })

    expect(call(fetchMock)[1].signal).toBe(controller.signal)
  })

  it('deletes by header, never the path', async () => {
    const fetchMock = stubFetch(() => ({ ok: true, status: 204 }) as Response)

    await deleteSession('sid-1', 'key-123')

    const [url, init] = call(fetchMock)
    expect(url).toBe('/v1/sessions')
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
    const headers = init.headers as Record<string, string>
    expect(headers['X-Session-Id']).toBe('sid-1')
    expect(headers['X-Api-Key-Id']).toBe('key-123')
  })

  it('throws the status and code of an error before the stream', async () => {
    stubFetch(() =>
      errorResponse(404, { error: 'session not found', code: 'session_not_found', detail: null }),
    )

    await expect(sendTurn('sid-1', { message: 'x' }, () => {})).rejects.toMatchObject({
      status: 404,
      code: 'session_not_found',
      message: 'session not found',
    })
  })

  it('reads a FastAPI detail body without a code', async () => {
    stubFetch(() => errorResponse(422, { detail: 'Reply is too long' }))

    await expect(sendTurn('sid-1', { message: 'x' }, () => {})).rejects.toMatchObject({
      status: 422,
      code: null,
      message: 'Reply is too long',
    })
  })
})

describe('session stream events', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function received(reads: string[]): Promise<unknown[]> {
    stubFetch(() => sseResponse(reads))
    const events: unknown[] = []
    await startSession({ prompt: 'p' }, (event) => events.push(event))
    return events
  }

  it('passes every session event type through in order', async () => {
    const events = await received([
      ': connected\n\n',
      frame(SESSION),
      frame({ type: 'thinking', delta: 'plan' }),
      ': keepalive\n\n',
      frame({ type: 'text', delta: 'Which stack?' }),
      frame(TURN),
      'data: [DONE]\n\n',
    ])

    expect(events).toEqual([
      SESSION,
      { type: 'thinking', delta: 'plan' },
      { type: 'text', delta: 'Which stack?', finish_reason: null },
      TURN,
    ])
  })

  it('passes an error event through', async () => {
    const events = await received([frame({ type: 'error', code: 'llm_error', message: 'Oops' })])

    expect(events).toEqual([{ type: 'error', code: 'llm_error', message: 'Oops' }])
  })

  it('drops unknown and malformed events', async () => {
    const events = await received([
      frame({ type: 'question', questions: [] }),
      frame({ delta: 'no type' }),
      frame({ type: 'session', session_id: '', expires_in: 1800, turns_left: 3 }),
      frame({ type: 'session', session_id: 'x', expires_in: '1800', turns_left: 3 }),
      frame({ ...TURN, kind: 'final' }),
      frame({ ...TURN, turn: -1 }),
      frame({ ...TURN, model_used: undefined }),
      frame({ type: 'error', code: 'llm_error' }),
      frame({ type: 'text', delta: 'kept' }),
    ])

    expect(events).toEqual([{ type: 'text', delta: 'kept', finish_reason: null }])
  })
})

describe('one-shot enhance', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the prompt and context to /v1/enhance', async () => {
    const fetchMock = stubFetch(() => sseEvents([]))

    await sendEnhanceStream('write a poem', 'ctx', () => {}, undefined, 'key-123')

    expect(call(fetchMock)[0]).toBe('/v1/enhance')
    expect(bodyOf(fetchMock)).toEqual({ prompt: 'write a poem', context: 'ctx' })
    expect(headersOf(fetchMock)['X-Api-Key-Id']).toBe('key-123')
  })

  it('reads deltas, and a cache hit as the whole answer', async () => {
    stubFetch(() =>
      sseEvents([
        { delta: 'a', finish_reason: null },
        { enhanced_prompt: 'cached', model_used: 'm', usage: {}, cached: true },
      ]),
    )
    const events: unknown[] = []

    await sendEnhanceStream('p', null, (event) => events.push(event))

    expect(events).toEqual([
      { type: 'text', delta: 'a', finish_reason: null },
      { type: 'text', delta: 'cached', finish_reason: 'stop' },
    ])
  })
})
