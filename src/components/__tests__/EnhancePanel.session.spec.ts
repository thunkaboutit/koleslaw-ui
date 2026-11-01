import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EnhancePanel from '../EnhancePanel.vue'
import { apiError, ev, SID, stubServer } from '@/stores/__tests__/sessionServer'

/* The playground over a scripted session API (model sessions PRD, BDD 3, 5,
   8, 10, 14, 17). */

let server: ReturnType<typeof stubServer>

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

function buttonNamed(wrapper: VueWrapper, name: string) {
  return wrapper.findAll('button').find((b) => b.text() === name)
}

const QUESTION = [ev.session(), ev.text('**Which** stack?'), ev.turn('question', 1, 2)]

describe('EnhancePanel sessions', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    Element.prototype.scrollIntoView = () => {}
    server = stubServer()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a question as a bubble with a reply box and no Copy', async () => {
    server.reply(...QUESTION)
    const wrapper = mountPanel()

    await submit(wrapper, 'make an app')

    const bubbles = wrapper.findAll('.chat-msg')
    expect(bubbles.map((b) => b.classes())).toEqual([
      expect.arrayContaining(['chat-msg--user']),
      expect.arrayContaining(['chat-msg--assistant']),
    ])
    expect(bubbles[1]?.find('strong').text()).toBe('Which')
    expect(buttonNamed(wrapper, 'Copy')).toBeUndefined()
    expect(wrapper.find('.enhance__response').exists()).toBe(false)
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('disabled')).toBeUndefined()
    expect(textarea.attributes('placeholder')).toBe('Answer Woof, or ask for changes.')
  })

  it('clears the composer after each send', async () => {
    server.reply(...QUESTION)
    const wrapper = mountPanel()

    await submit(wrapper, 'make an app')

    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  })

  it('sends the answer as a reply and shows the prompt card with Copy', async () => {
    server.reply(...QUESTION)
    server.reply(ev.text('Build X in Python'), ev.turn('prompt', 2, 1))
    const wrapper = mountPanel()
    await submit(wrapper, 'make an app')

    await submit(wrapper, 'Python')

    expect(server.posts()[1]?.body).toEqual({ message: 'Python' })
    expect(server.posts()[1]?.headers['X-Session-Id']).toBe(SID)
    expect(wrapper.find('.response-text').text()).toBe('Build X in Python')
    expect(buttonNamed(wrapper, 'Copy')).toBeDefined()
    expect(wrapper.findComponent({ name: 'PlatformActionBar' }).exists()).toBe(true)
    // The reply box stays for refining the prompt (D5)
    expect(wrapper.find('textarea').attributes('disabled')).toBeUndefined()
  })

  it('shows no Copy while a prompt is still streaming', async () => {
    const stream = server.stream()
    const wrapper = mountPanel()
    await submit(wrapper, 'make an app')

    stream.push(ev.session())
    stream.push(ev.text('Build'))
    await settle()

    expect(wrapper.find('.response-text').text()).toBe('Build')
    expect(buttonNamed(wrapper, 'Copy')).toBeUndefined()
    stream.push(ev.turn('prompt', 1, 2))
    stream.close()
    await settle()
    expect(buttonNamed(wrapper, 'Copy')).toBeDefined()
  })

  it('"Just write it" shows only after a question and sends finalize', async () => {
    server.reply(...QUESTION)
    server.reply(ev.text('Build X'), ev.turn('prompt', 2, 1))
    const wrapper = mountPanel()
    expect(buttonNamed(wrapper, 'Just write it')).toBeUndefined()
    await submit(wrapper, 'make an app')

    await buttonNamed(wrapper, 'Just write it')?.trigger('click')
    await settle()

    expect(server.posts()[1]?.body).toEqual({ action: 'finalize' })
    expect(buttonNamed(wrapper, 'Just write it')).toBeUndefined()
    expect(wrapper.find('.response-text').text()).toBe('Build X')
  })

  it('keeps each turn its own thinking block', async () => {
    server.reply(ev.session(), ev.thinking('first'), ev.text('Q?'), ev.turn('question', 1, 2))
    server.reply(ev.thinking('second'), ev.text('P'), ev.turn('prompt', 2, 1))
    const wrapper = mountPanel()
    await submit(wrapper, 'make an app')
    await submit(wrapper, 'Python')

    const blocks = wrapper.findAll('.thinking-block')
    expect(blocks).toHaveLength(2)
    await blocks[0]?.find('.thinking-block__header').trigger('click')
    await blocks[1]?.find('.thinking-block__header').trigger('click')
    const bodies = wrapper.findAll('.thinking-block__body').map((b) => b.text())
    expect(bodies).toEqual(['first', 'second'])
  })

  it('an empty turn shows the notice and puts the text back', async () => {
    server.reply(ev.session(), ev.thinking('hmm'), ev.turn('empty', 1, 3))
    const wrapper = mountPanel()

    await submit(wrapper, 'make an app')

    expect(wrapper.find('.enhance__notice').text()).toContain('empty-handed')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('make an app')
    expect(wrapper.find('.chat-msg').exists()).toBe(false)
  })

  it('an expired session shows the banner and a read-only transcript', async () => {
    server.reply(...QUESTION)
    server.fail(404, apiError('session_not_found'))
    const wrapper = mountPanel()
    await submit(wrapper, 'make an app')

    await submit(wrapper, 'Python')

    expect(wrapper.find('.enhance__banner').text()).toContain('expired')
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(buttonNamed(wrapper, 'Just write it')).toBeUndefined()
    expect(wrapper.findAll('.chat-msg')).toHaveLength(2)
  })

  it('the banner New chat starts over with no DELETE for an expired session', async () => {
    server.reply(...QUESTION)
    server.fail(404, apiError('session_not_found'))
    const wrapper = mountPanel()
    await submit(wrapper, 'make an app')
    await submit(wrapper, 'Python')

    await buttonNamed(wrapper, 'New chat')?.trigger('click')
    await settle()

    expect(server.deletes()).toHaveLength(0)
    expect(wrapper.find('.chat-msg').exists()).toBe(false)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('Clear on the prompt card deletes the session once and resets', async () => {
    server.reply(ev.session(), ev.text('Build X'), ev.turn('prompt', 1, 2))
    const wrapper = mountPanel()
    await submit(wrapper, 'make an app')

    await buttonNamed(wrapper, 'Clear')?.trigger('click')
    await settle()

    expect(server.deletes()).toHaveLength(1)
    expect(server.deletes()[0]?.headers['X-Session-Id']).toBe(SID)
    expect(wrapper.find('.enhance__response').exists()).toBe(false)
  })

  it('falls back to one-shot when sessions are switched off', async () => {
    server.fail(503, apiError('sessions_disabled'))
    server.reply({ delta: 'Build X', finish_reason: null })
    const wrapper = mountPanel()

    await submit(wrapper, 'make an app')

    expect(server.posts().map((c) => c.url)).toEqual(['/v1/sessions', '/v1/enhance'])
    expect(wrapper.find('.response-text').text()).toBe('Build X')
    expect(buttonNamed(wrapper, 'Copy')).toBeDefined()
    expect(wrapper.find('.enhance__error').exists()).toBe(false)
  })

  it('emits submitting while the playground has turns', async () => {
    server.reply(ev.session(), ev.text('Build X'), ev.turn('prompt', 1, 2))
    const wrapper = mountPanel()

    await submit(wrapper, 'make an app')
    await buttonNamed(wrapper, 'Clear')?.trigger('click')

    expect(wrapper.emitted('update:submitting')).toEqual([[false], [true], [false]])
  })
})
