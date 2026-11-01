import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import {
  CUT_OFF_ERROR,
  EMPTY_TURN_NOTICE,
  IMAGES_REFUSED_ERROR,
  SESSION_FULL_NOTICE,
  SESSIONS_OFF_NOTICE,
  useSessionStore,
} from '../session'
import { useAuthStore } from '../auth'
import { useKeysStore } from '../keys'
import { apiError, ev, SID, stubServer } from './sessionServer'
import type { UserInfo } from '@/api/types'

/* The session state machine (model sessions PRD, koleslaw-ui state table).
   Each spec drives the store over a scripted API. */

let server: ReturnType<typeof stubServer>

async function say(store: ReturnType<typeof useSessionStore>, text: string, files?: File[]) {
  store.draft = text
  await store.send(files)
}

/* Turn 1 answered with a question; the store is awaiting a reply. */
async function askedOnce(store: ReturnType<typeof useSessionStore>) {
  server.reply(
    ev.session(),
    ev.thinking('plan'),
    ev.text('Which stack?'),
    ev.turn('question', 1, 2),
  )
  await say(store, 'make an app')
}

describe('session store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    server = stubServer()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('from idle', () => {
    it('starts in idle with nothing to show', () => {
      const store = useSessionStore()

      expect(store.status).toBe('idle')
      expect(store.turns).toEqual([])
      expect(store.canSend).toBe(true)
      expect(store.canFinalize).toBe(false)
    })

    it('send goes to streaming, clears the composer and starts a session', async () => {
      const stream = server.stream()
      const store = useSessionStore()

      store.draft = '  make an app  '
      const sending = store.send()
      await flushPromises()

      expect(store.status).toBe('streaming')
      expect(store.draft).toBe('')
      expect(store.canSend).toBe(false)
      expect(server.posts()).toHaveLength(1)
      expect(server.calls[0]?.url).toBe('/v1/sessions')
      expect(server.calls[0]?.body).toEqual({ prompt: 'make an app', context: null })
      expect(server.calls[0]?.headers['X-Session-Id']).toBeUndefined()
      expect(store.turns.map((t) => t.role)).toEqual(['user', 'assistant'])

      stream.close()
      await sending
    })

    it('sends the prompt unprefixed', async () => {
      server.reply(ev.session(), ev.text('P'), ev.turn('prompt', 1, 2))
      const store = useSessionStore()

      await say(store, 'a poem about dogs')

      expect(server.calls[0]?.body).toMatchObject({ prompt: 'a poem about dogs' })
    })

    it('ignores a blank composer', async () => {
      const store = useSessionStore()

      await say(store, '   ')

      expect(server.calls).toHaveLength(0)
      expect(store.status).toBe('idle')
    })

    it('a failure before any session goes back to idle with the error', async () => {
      server.fail(429, { detail: 'Daily limit reached.' })
      const store = useSessionStore()

      await say(store, 'make an app')

      expect(store.status).toBe('idle')
      expect(store.error).toBe('Daily limit reached.')
      expect(store.turns).toEqual([])
      expect(store.draft).toBe('make an app')
    })
  })

  describe('from streaming', () => {
    it('a question turn goes to awaiting_reply, labelled question', async () => {
      const store = useSessionStore()

      await askedOnce(store)

      expect(store.status).toBe('awaiting_reply')
      expect(store.lastAssistant).toMatchObject({
        kind: 'question',
        text: 'Which stack?',
        thinking: 'plan',
        thinkingActive: false,
      })
      expect(store.canFinalize).toBe(true)
      expect(store.canSend).toBe(true)
      expect(store.turnsLeft).toBe(2)
    })

    it('a prompt turn goes to awaiting_reply so the user may refine it (D5)', async () => {
      server.reply(ev.session(), ev.text('Build X'), ev.turn('prompt', 1, 2))
      const store = useSessionStore()

      await say(store, 'make an app')

      expect(store.status).toBe('awaiting_reply')
      expect(store.lastAssistant?.kind).toBe('prompt')
      expect(store.canFinalize).toBe(false)
      expect(store.canSend).toBe(true)
    })

    it('an empty turn goes to awaiting_reply with a notice and the text restored (D9)', async () => {
      server.reply(ev.session(), ev.thinking('hmm'), ev.turn('empty', 1, 3))
      const store = useSessionStore()

      await say(store, 'make an app')

      expect(store.status).toBe('awaiting_reply')
      expect(store.notice).toBe(EMPTY_TURN_NOTICE)
      expect(store.draft).toBe('make an app')
      expect(store.turns).toEqual([])
      expect(server.posts()).toHaveLength(1)
    })

    it('resends an empty turn 1 as a reply carrying the prompt', async () => {
      server.reply(ev.session(), ev.turn('empty', 1, 3))
      server.reply(ev.text('P'), ev.turn('prompt', 1, 2))
      const store = useSessionStore()
      await say(store, 'make an app')

      await store.send()

      const resend = server.posts()[1]
      expect(resend?.url).toBe('/v1/sessions/turns')
      expect(resend?.headers['X-Session-Id']).toBe(SID)
      expect(resend?.body).toEqual({ message: 'make an app' })
      expect(store.notice).toBeNull()
      expect(store.lastAssistant?.kind).toBe('prompt')
    })

    it('an error event goes to awaiting_reply with the error, discarding the turn', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.reply(ev.text('partial'), ev.error('llm_error', 'The model failed. Try again.'))

      await say(store, 'Python')

      expect(store.status).toBe('awaiting_reply')
      expect(store.error).toBe('The model failed. Try again.')
      expect(store.turns).toHaveLength(2)
      expect(store.lastAssistant?.text).toBe('Which stack?')
      expect(store.draft).toBe('Python')
    })

    it('resends a failed turn 1 as a reply carrying the prompt', async () => {
      server.reply(ev.session(), ev.error('connection_error', 'Lost the model.'))
      server.reply(ev.text('P'), ev.turn('prompt', 1, 2))
      const store = useSessionStore()
      await say(store, 'make an app')
      expect(store.status).toBe('awaiting_reply')

      await store.send()

      expect(server.posts()[1]?.url).toBe('/v1/sessions/turns')
      expect(server.posts()[1]?.body).toEqual({ message: 'make an app' })
    })

    it('an HTTP 5xx goes to awaiting_reply with the error, discarding the turn', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.fail(502, { detail: 'Bad gateway' })

      await say(store, 'Python')

      expect(store.status).toBe('awaiting_reply')
      expect(store.error).toBe('Bad gateway')
      expect(store.turns).toHaveLength(2)
      expect(store.draft).toBe('Python')
    })

    it('a stream that ends without a turn event is discarded as cut off', async () => {
      server.reply(ev.session(), ev.text('half'))
      const store = useSessionStore()

      await say(store, 'make an app')

      expect(store.error).toBe(CUT_OFF_ERROR)
      expect(store.turns).toEqual([])
      expect(store.status).toBe('awaiting_reply')
    })

    it('cancel drops the turn and restores the text, with no error', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.stream()
      store.draft = 'Python'
      const sending = store.send()
      await flushPromises()

      store.cancel()
      await sending

      expect(store.status).toBe('awaiting_reply')
      expect(store.error).toBeNull()
      expect(store.turns).toHaveLength(2)
      expect(store.draft).toBe('Python')
    })

    it('a 409 session_busy keeps the session with the error', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.fail(409, apiError('session_busy'))

      await say(store, 'Python')

      expect(store.status).toBe('awaiting_reply')
      expect(store.error).toBe('session busy')
    })
  })

  describe('from awaiting_reply', () => {
    it('a reply streams to the turns endpoint, unprefixed, with the session id', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      const stream = server.stream()

      store.draft = 'Python'
      const sending = store.send()
      await flushPromises()

      expect(store.status).toBe('streaming')
      const reply = server.posts()[1]
      expect(reply?.url).toBe('/v1/sessions/turns')
      expect(reply?.headers['X-Session-Id']).toBe(SID)
      expect(reply?.body).toEqual({ message: 'Python' })

      stream.push(ev.text('Build X in Python'))
      stream.push(ev.turn('prompt', 2, 1))
      stream.close()
      await sending

      expect(store.status).toBe('awaiting_reply')
      expect(store.turns.map((t) => t.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
      expect(store.lastAssistant).toMatchObject({ kind: 'prompt', text: 'Build X in Python' })
    })

    it('"Just write it" sends finalize and adds no user turn', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.reply(ev.text('Build X'), ev.turn('prompt', 2, 1))

      await store.finalize()

      expect(server.posts()[1]?.body).toEqual({ action: 'finalize' })
      expect(server.posts()[1]?.headers['X-Session-Id']).toBe(SID)
      expect(store.turns.map((t) => t.role)).toEqual(['user', 'assistant', 'assistant'])
      expect(store.lastAssistant?.kind).toBe('prompt')
    })

    it('finalize does nothing unless the model asked a question', async () => {
      server.reply(ev.session(), ev.text('P'), ev.turn('prompt', 1, 2))
      const store = useSessionStore()
      await say(store, 'make an app')

      await store.finalize()

      expect(server.posts()).toHaveLength(1)
    })

    it('turns_left 0 after a prompt goes to done', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.reply(ev.text('Build X'), ev.turn('prompt', 4, 0))

      await say(store, 'Python')

      expect(store.status).toBe('done')
      expect(store.canSend).toBe(false)
      expect(store.canFinalize).toBe(false)
    })

    it('a 409 session_full goes to done with a notice', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.fail(409, apiError('session_full'))

      await say(store, 'Python')

      expect(store.status).toBe('done')
      expect(store.notice).toBe(SESSION_FULL_NOTICE)
      expect(store.turns).toHaveLength(2)
    })

    it('keeps each turn its own thinking', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.reply(ev.thinking('python it is'), ev.text('Build X'), ev.turn('prompt', 2, 1))

      await say(store, 'Python')

      const thinking = store.turns.flatMap((t) => (t.role === 'assistant' ? [t.thinking] : []))
      expect(thinking).toEqual(['plan', 'python it is'])
    })

    it('appends thinking that resumes after text to that turn, as a new paragraph', async () => {
      server.reply(
        ev.session(),
        ev.thinking('pl'),
        ev.thinking('an'),
        ev.text('Build'),
        ev.thinking('assume postgres'),
        ev.text(' X'),
        ev.turn('prompt', 1, 2),
      )
      const store = useSessionStore()

      await say(store, 'make an app')

      expect(store.lastAssistant).toMatchObject({
        thinking: 'plan\n\nassume postgres',
        text: 'Build X',
      })
    })
  })

  describe('expiry', () => {
    it('a 404 goes to expired, keeping the transcript read-only', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.fail(404, apiError('session_not_found'))

      await say(store, 'Python')

      expect(store.status).toBe('expired')
      expect(store.turns).toHaveLength(2)
      expect(store.canSend).toBe(false)
      expect(store.canFinalize).toBe(false)
    })

    it('an error event session_not_found goes to expired', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.reply(ev.error('session_not_found', 'Session not found'))

      await say(store, 'Python')

      expect(store.status).toBe('expired')
      expect(store.error).toBeNull()
    })

    it('New Chat after expiry deletes nothing and starts a new session', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.fail(404, apiError('session_not_found'))
      await say(store, 'Python')

      store.newChat()
      server.reply(ev.session(), ev.text('P'), ev.turn('prompt', 1, 2))
      await say(store, 'again')

      expect(server.deletes()).toHaveLength(0)
      expect(server.posts()[2]?.url).toBe('/v1/sessions')
    })
  })

  describe('New Chat', () => {
    it('deletes the session once, resets to idle, and the next send starts fresh', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      store.draft = 'half typed'

      store.newChat()
      store.newChat()
      await flushPromises()

      expect(server.deletes()).toHaveLength(1)
      expect(server.deletes()[0]?.url).toBe('/v1/sessions')
      expect(server.deletes()[0]?.headers['X-Session-Id']).toBe(SID)
      expect(store.status).toBe('idle')
      expect(store.turns).toEqual([])
      expect(store.draft).toBe('')
      expect(store.error).toBeNull()
      expect(store.notice).toBeNull()
      expect(store.turnsLeft).toBeNull()

      server.reply(ev.session(), ev.text('P'), ev.turn('prompt', 1, 2))
      await say(store, 'a new prompt')
      const next = server.posts()[1]
      expect(next?.url).toBe('/v1/sessions')
      expect(next?.headers['X-Session-Id']).toBeUndefined()
    })

    it('aborts a streaming turn, which then changes nothing', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      const stream = server.stream()
      store.draft = 'Python'
      const sending = store.send()
      await flushPromises()

      store.newChat()
      stream.push(ev.text('late'))
      await sending

      expect(server.deletes()).toHaveLength(1)
      expect(store.status).toBe('idle')
      expect(store.turns).toEqual([])
      expect(store.draft).toBe('')
      expect(store.error).toBeNull()
    })

    it('resets and shows no error when DELETE fails', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.deleteFails()

      store.newChat()
      await flushPromises()

      expect(server.deletes()).toHaveLength(1)
      expect(store.status).toBe('idle')
      expect(store.error).toBeNull()
    })

    it('sends no DELETE when there is no session', async () => {
      const store = useSessionStore()

      store.newChat()

      expect(server.calls).toHaveLength(0)
    })
  })

  describe('kill switch (503 sessions_disabled)', () => {
    it('falls back to one-shot /v1/enhance from idle', async () => {
      server.fail(503, apiError('sessions_disabled'))
      server.reply({ delta: 'Build X', finish_reason: null }, { delta: '', finish_reason: 'stop' })
      const store = useSessionStore()

      await say(store, 'make an app')

      expect(server.posts().map((c) => c.url)).toEqual(['/v1/sessions', '/v1/enhance'])
      expect(server.posts()[1]?.body).toEqual({ prompt: 'make an app', context: null })
      expect(store.oneShot).toBe(true)
      expect(store.status).toBe('done')
      expect(store.turns.map((t) => t.role)).toEqual(['user', 'assistant'])
      expect(store.lastAssistant).toMatchObject({ kind: 'prompt', text: 'Build X' })
    })

    it('stays one-shot after New Chat', async () => {
      server.fail(503, apiError('sessions_disabled'))
      server.reply({ delta: 'Build X', finish_reason: null })
      const store = useSessionStore()
      await say(store, 'make an app')

      store.newChat()
      server.reply({ delta: 'Build Y', finish_reason: null })
      await say(store, 'another')

      expect(server.posts().map((c) => c.url)).toEqual([
        '/v1/sessions',
        '/v1/enhance',
        '/v1/enhance',
      ])
      expect(server.deletes()).toHaveLength(0)
    })

    it('an empty one-shot answer restores the text with the notice', async () => {
      server.fail(503, apiError('sessions_disabled'))
      server.reply({ delta: '', finish_reason: 'stop' })
      const store = useSessionStore()

      await say(store, 'make an app')

      expect(store.status).toBe('idle')
      expect(store.notice).toBe(EMPTY_TURN_NOTICE)
      expect(store.draft).toBe('make an app')
      expect(store.turns).toEqual([])
    })

    it('mid-session ends the chat with a notice', async () => {
      const store = useSessionStore()
      await askedOnce(store)
      server.fail(503, apiError('sessions_disabled'))

      await say(store, 'Python')

      expect(store.status).toBe('done')
      expect(store.notice).toBe(SESSIONS_OFF_NOTICE)
      expect(store.oneShot).toBe(true)
      expect(store.turns).toHaveLength(2)
    })
  })

  describe('auth', () => {
    it('signed-in turns send the selected key on every request', async () => {
      useAuthStore().user = { id: 'u1' } as UserInfo
      useKeysStore().selectPlaygroundKey('key-123')
      const store = useSessionStore()
      await askedOnce(store)
      server.reply(ev.text('P'), ev.turn('prompt', 2, 1))

      await say(store, 'Python')
      store.newChat()

      expect(server.calls.map((c) => c.headers['X-Api-Key-Id'])).toEqual([
        'key-123',
        'key-123',
        'key-123',
      ])
    })

    it('anonymous turns send only the public bearer', async () => {
      const store = useSessionStore()

      await askedOnce(store)

      expect(server.calls[0]?.headers['X-Api-Key-Id']).toBeUndefined()
      expect(server.calls[0]?.headers.Authorization).toMatch(/^Bearer pk_live_/)
    })
  })

  describe('attachments (D6)', () => {
    it('sends text files as turn 1 context', async () => {
      server.reply(ev.session(), ev.text('P'), ev.turn('prompt', 1, 2))
      const store = useSessionStore()
      const file = new File(['col_a,col_b'], 'data.csv', { type: 'text/csv' })

      await say(store, 'explain this', [file])

      expect(server.calls[0]?.body).toEqual({
        prompt: 'explain this',
        context: '[Attached file: data.csv]\n\ncol_a,col_b',
      })
    })

    it('refuses images without sending', async () => {
      const store = useSessionStore()
      const image = new File(['x'], 'cat.png', { type: 'image/png' })

      await say(store, 'describe this', [image])

      expect(server.calls).toHaveLength(0)
      expect(store.error).toBe(IMAGES_REFUSED_ERROR)
      expect(store.draft).toBe('describe this')
      expect(store.status).toBe('idle')
    })
  })

  describe('no reload leak (D10)', () => {
    it('forgets the old chat history and sends none of it', async () => {
      localStorage.setItem(
        'koleslaw-chat-history',
        JSON.stringify([{ role: 'user', content: 'yesterday' }]),
      )
      server.reply(ev.session(), ev.text('P'), ev.turn('prompt', 1, 2))
      const store = useSessionStore()

      await say(store, 'today')

      expect(localStorage.getItem('koleslaw-chat-history')).toBeNull()
      expect(JSON.stringify(server.calls)).not.toContain('yesterday')
      expect(store.turns.map((t) => t.role)).toEqual(['user', 'assistant'])
    })

    it('keeps the conversation out of localStorage', async () => {
      const store = useSessionStore()

      await askedOnce(store)

      const stored = Object.keys(localStorage).map((k) => localStorage.getItem(k))
      expect(stored.join()).not.toContain('Which stack?')
      expect(stored.join()).not.toContain(SID)
    })
  })
})
