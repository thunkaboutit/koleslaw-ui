import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../chat'
import { frame, sseResponse } from '@/api/__tests__/sseStream'

function stubStream(events: unknown[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => sseResponse([...events.map(frame), 'data: [DONE]\n\n'])),
  )
}

describe('chat store streaming', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps thinking out of the answer text', async () => {
    stubStream([
      { delta: 'plan', type: 'thinking', finish_reason: null },
      { delta: 'answer', type: 'text', finish_reason: null },
      { delta: '', type: 'text', finish_reason: 'stop' },
    ])
    const chat = useChatStore()

    await chat.send('make an app')

    expect(chat.messages[chat.messages.length - 1]).toEqual({
      role: 'assistant',
      content: 'answer',
    })
    expect(chat.lastThinkingContent).toBe('plan')
  })

  it('appends thinking that resumes after text to the same block, as a new paragraph', async () => {
    stubStream([
      { delta: 'plan', type: 'thinking', finish_reason: null },
      { delta: 'Q: which DB?\n', type: 'text', finish_reason: null },
      { delta: 'assume postgres', type: 'thinking', finish_reason: null },
      { delta: 'Enhanced: build X', type: 'text', finish_reason: null },
      { delta: '', type: 'text', finish_reason: 'stop' },
    ])
    const chat = useChatStore()

    await chat.send('make an app')

    expect(chat.lastThinkingContent).toBe('plan\n\nassume postgres')
    expect(chat.messages[chat.messages.length - 1]?.content).toBe('Q: which DB?\nEnhanced: build X')
  })

  it('does not split one thinking phase streamed in several chunks', async () => {
    stubStream([
      { delta: 'pl', type: 'thinking', finish_reason: null },
      { delta: 'an', type: 'thinking', finish_reason: null },
      { delta: 'answer', type: 'text', finish_reason: null },
    ])
    const chat = useChatStore()

    await chat.send('make an app')

    expect(chat.lastThinkingContent).toBe('plan')
  })
})
