import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendChatStream, sendChatStreamWithFiles } from '../chat'
import type { ChatMessage } from '../types'

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
