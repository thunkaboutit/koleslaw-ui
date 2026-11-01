import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EnhancePanel from '../EnhancePanel.vue'
import { controlledSSE } from '@/api/__tests__/sseStream'

/* Stream shapes found while investigating the CoT mangling (model sessions
   PRD, root cause cases).  Each case mounts the real panel and store over a
   stubbed SSE fetch. */

function mountPanel(): VueWrapper {
  return mount(EnhancePanel, {
    global: { stubs: { PlaygroundKeyPicker: true, PlatformActionBar: true } },
  })
}

async function settle() {
  await flushPromises()
  await flushPromises()
}

async function submit(wrapper: VueWrapper, text: string) {
  await wrapper.find('textarea').setValue(text)
  await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
  await settle()
}

function stubStream() {
  const stream = controlledSSE()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => stream.response),
  )
  return stream
}

describe('EnhancePanel stream rendering', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    Element.prototype.scrollIntoView = () => {}
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('case G: an unknown event type renders nothing', async () => {
    const stream = stubStream()
    const wrapper = mountPanel()
    await submit(wrapper, 'make an app')

    stream.push({ type: 'question', questions: [{ id: 'q1', text: 'Which stack?' }] })
    stream.push({ delta: 'Final prompt', type: 'text', finish_reason: null })
    stream.push({ delta: '', type: 'text', finish_reason: 'stop' })
    stream.close()
    await settle()

    expect(wrapper.find('.response-text').text()).toBe('Final prompt')
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('case G: a stream of only unknown events leaves no response', async () => {
    const stream = stubStream()
    const wrapper = mountPanel()
    await submit(wrapper, 'make an app')

    stream.push({ type: 'question', questions: [{ id: 'q1', text: 'Which stack?' }] })
    stream.close()
    await settle()

    expect(wrapper.find('.response-text').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('undefined')
  })

  it('case E: thinking that resumes after text stays in its collapsed block', async () => {
    const stream = stubStream()
    const wrapper = mountPanel()
    await submit(wrapper, 'make an app')
    const body = () => wrapper.find('.thinking-block__body')

    stream.push({ delta: 'plan', type: 'thinking', finish_reason: null })
    await settle()
    expect(body().exists()).toBe(true)

    stream.push({ delta: 'Q: which DB?', type: 'text', finish_reason: null })
    await settle()
    expect(body().exists()).toBe(false)

    stream.push({ delta: 'assume postgres', type: 'thinking', finish_reason: null })
    await settle()
    expect(wrapper.findAll('.thinking-block')).toHaveLength(1)
    expect(body().exists()).toBe(false)

    stream.push({ delta: ' Enhanced: build X', type: 'text', finish_reason: null })
    stream.push({ delta: '', type: 'text', finish_reason: 'stop' })
    stream.close()
    await settle()

    const answer = wrapper.find('.response-text').text()
    expect(answer).toBe('Q: which DB? Enhanced: build X')
    await wrapper.find('.thinking-block__header').trigger('click')
    expect(body().text()).toContain('plan')
    expect(body().text()).toContain('assume postgres')
  })
})
