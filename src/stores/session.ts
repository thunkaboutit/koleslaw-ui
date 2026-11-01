import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ApiError } from '@/api/client'
import { sendEnhanceStream } from '@/api/chat'
import { deleteSession, sendTurn, startSession } from '@/api/session'
import type { ChatEvent, SessionEvent } from '@/api/sse'
import type { TurnKind, TurnRequest } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import { useKeysStore } from '@/stores/keys'

/* The playground conversation: one model session, held in memory only.  A
   reload starts over (D10), and nothing from an earlier visit is resent.

   idle            nothing sent yet
   streaming       a turn is on the wire
   awaiting_reply  the model answered; the user may reply or finalize
   done            no further turns (cap reached, or one-shot answered)
   expired         the server no longer has the session; read-only */
export type SessionStatus = 'idle' | 'streaming' | 'awaiting_reply' | 'done' | 'expired'

export interface UserTurn {
  id: number
  role: 'user'
  content: string
}

/* `kind` stays null while the turn streams.  `thinking` belongs to this turn
   only; `thinkingActive` is true while reasoning deltas are arriving. */
export interface AssistantTurn {
  id: number
  role: 'assistant'
  kind: Exclude<TurnKind, 'empty'> | null
  text: string
  thinking: string
  thinkingActive: boolean
}

export type Turn = UserTurn | AssistantTurn

/* The chat store kept the playground history here and resent all of it on
   the next send after a reload.  Removed on sight. */
const LEGACY_HISTORY_KEY = 'koleslaw-chat-history'

export const EMPTY_TURN_NOTICE =
  'Woof came back empty-handed. Your message is back in the box: send it again.'
export const SESSION_FULL_NOTICE =
  'This chat has reached its limit. Start a new chat to keep going.'
export const SESSIONS_OFF_NOTICE =
  'Follow-up replies are switched off right now. Start a new chat to enhance another prompt.'
export const CUT_OFF_ERROR = 'The response was cut off. Please send it again.'
export const IMAGES_REFUSED_ERROR = "Images can't be attached here yet. Attach a text file instead."

function forgetLegacyHistory() {
  try {
    localStorage.removeItem(LEGACY_HISTORY_KEY)
  } catch {
    // storage unavailable: nothing was kept there either
  }
}

/* Text files ride on turn 1 as context, in the same shape the chat upload
   endpoint gives the model.  Images are refused (D6). */
async function attachmentContext(files: File[]): Promise<string | null> {
  if (!files.length) return null
  const parts = await Promise.all(
    files.map(async (file) => `[Attached file: ${file.name}]\n\n${await file.text()}`),
  )
  return parts.join('\n\n')
}

function isAbort(e: unknown): boolean {
  return (e as Error)?.name === 'AbortError'
}

export const useSessionStore = defineStore('session', () => {
  forgetLegacyHistory()

  const status = ref<SessionStatus>('idle')
  const turns = ref<Turn[]>([])
  /* The composer text.  Cleared on send, restored when a turn is discarded. */
  const draft = ref('')
  const error = ref<string | null>(null)
  const notice = ref<string | null>(null)
  const turnsLeft = ref<number | null>(null)
  /* Set by the kill switch (503 sessions_disabled); lasts until reload. */
  const oneShot = ref(false)

  let sessionId: string | null = null
  let nextId = 0
  let controller: AbortController | null = null
  /* Bumped by newChat so a stream that is winding down cannot touch the
     fresh conversation. */
  let epoch = 0

  const lastAssistant = computed(() => {
    const last = turns.value[turns.value.length - 1]
    return last?.role === 'assistant' ? last : null
  })
  const canSend = computed(() => status.value === 'idle' || status.value === 'awaiting_reply')
  const canFinalize = computed(
    () => status.value === 'awaiting_reply' && lastAssistant.value?.kind === 'question',
  )
  /* Attachments go on turn 1 only. */
  const canAttach = computed(() => status.value === 'idle')

  function apiKeyId(): string | null {
    const auth = useAuthStore()
    return auth.user ? useKeysStore().playgroundKeyId : null
  }

  /* Pushes the turns for one request and returns the pending assistant turn,
     reactive so streamed deltas render. */
  function begin(userText: string | null): AssistantTurn {
    if (userText !== null) turns.value.push({ id: nextId++, role: 'user', content: userText })
    turns.value.push({
      id: nextId++,
      role: 'assistant',
      kind: null,
      text: '',
      thinking: '',
      thinkingActive: false,
    })
    error.value = null
    notice.value = null
    status.value = 'streaming'
    return turns.value[turns.value.length - 1] as AssistantTurn
  }

  function applyDelta(turn: AssistantTurn, event: ChatEvent) {
    if (event.type === 'thinking') {
      // Thinking that resumes after answer text starts a new paragraph
      const resumed = !turn.thinkingActive && turn.thinking && turn.text
      turn.thinking += (resumed ? '\n\n' : '') + event.delta
      turn.thinkingActive = true
    } else {
      turn.thinkingActive = false
      turn.text += event.delta
    }
  }

  /* Drops the request's turns.  The user's text goes back to the composer so
     a resend is one keypress. */
  function discard(userText: string | null) {
    const drop = userText === null ? 1 : 2
    turns.value.splice(turns.value.length - drop, drop)
    if (userText !== null && !draft.value) draft.value = userText
  }

  function settleFailed(userText: string | null, message: string | null) {
    discard(userText)
    error.value = message
    status.value = sessionId || turns.value.length ? 'awaiting_reply' : 'idle'
  }

  function expire(userText: string | null) {
    discard(userText)
    sessionId = null
    status.value = 'expired'
  }

  function finish(kind: Exclude<TurnKind, 'empty'>, turn: AssistantTurn, left: number) {
    turn.kind = kind
    turn.thinkingActive = false
    turnsLeft.value = left
    status.value = left === 0 ? 'done' : 'awaiting_reply'
  }

  async function run(
    userText: string | null,
    call: (onEvent: (event: SessionEvent) => void, signal: AbortSignal) => Promise<void>,
    fallback: () => Promise<void>,
  ) {
    const mine = epoch
    const turn = begin(userText)
    controller = new AbortController()
    let ended = false

    const onEvent = (event: SessionEvent) => {
      if (mine !== epoch || ended) return
      switch (event.type) {
        case 'session':
          sessionId = event.session_id
          turnsLeft.value = event.turns_left
          return
        case 'thinking':
        case 'text':
          applyDelta(turn, event)
          return
        case 'turn':
          ended = true
          if (event.kind === 'empty') {
            settleFailed(userText, null)
            notice.value = EMPTY_TURN_NOTICE
          } else {
            finish(event.kind, turn, event.turns_left)
          }
          return
        case 'error':
          ended = true
          if (event.code === 'session_not_found') expire(userText)
          else settleFailed(userText, event.message)
      }
    }

    try {
      await call(onEvent, controller.signal)
      if (mine === epoch && !ended) settleFailed(userText, CUT_OFF_ERROR)
    } catch (e) {
      if (mine !== epoch || ended) return
      if (isAbort(e)) {
        settleFailed(userText, null)
      } else if (e instanceof ApiError && e.status === 404) {
        expire(userText)
      } else if (e instanceof ApiError && e.code === 'session_full') {
        discard(userText)
        notice.value = SESSION_FULL_NOTICE
        status.value = 'done'
      } else if (e instanceof ApiError && e.code === 'sessions_disabled') {
        oneShot.value = true
        if (sessionId) {
          discard(userText)
          sessionId = null
          notice.value = SESSIONS_OFF_NOTICE
          status.value = 'done'
        } else {
          turns.value.splice(-1, 1)
          await fallback()
        }
      } else {
        settleFailed(userText, (e as Error).message || 'Failed to get response')
      }
    } finally {
      if (mine === epoch) controller = null
    }
  }

  /* The kill switch path: one /v1/enhance call, no follow-ups. */
  async function runOneShot(prompt: string, context: string | null) {
    const mine = epoch
    const turn = begin(null)
    controller = new AbortController()
    try {
      await sendEnhanceStream(
        prompt,
        context,
        (event) => {
          if (mine === epoch) applyDelta(turn, event)
        },
        controller.signal,
        apiKeyId(),
      )
      if (mine !== epoch) return
      if (turn.text.trim()) {
        finish('prompt', turn, 0)
      } else {
        settleFailed(prompt, null)
        notice.value = EMPTY_TURN_NOTICE
      }
    } catch (e) {
      if (mine !== epoch) return
      settleFailed(prompt, isAbort(e) ? null : (e as Error).message || 'Failed to get response')
    } finally {
      if (mine === epoch) controller = null
    }
  }

  /* Sends the composer text: turn 1 starts the session, later text is a
     reply.  A turn 1 that failed or came back empty leaves a session with no
     turns; its resend is a reply carrying the prompt. */
  async function send(files: File[] = []) {
    const text = draft.value.trim()
    if (!text || !canSend.value) return
    if (files.some((f) => f.type.startsWith('image/'))) {
      error.value = IMAGES_REFUSED_ERROR
      return
    }
    draft.value = ''
    const context = status.value === 'idle' ? await attachmentContext(files) : null

    if (oneShot.value) {
      turns.value.push({ id: nextId++, role: 'user', content: text })
      await runOneShot(text, context)
      return
    }

    const options = (signal: AbortSignal) => ({ signal, apiKeyId: apiKeyId() })
    const id = sessionId
    await run(
      text,
      (onEvent, signal) =>
        id
          ? sendTurn(id, { message: text }, onEvent, options(signal))
          : startSession({ prompt: text, context }, onEvent, options(signal)),
      () => runOneShot(text, context),
    )
  }

  /* "Just write it": the model must answer with the prompt now. */
  async function finalize() {
    const id = sessionId
    if (!canFinalize.value || !id) return
    const body: TurnRequest = { action: 'finalize' }
    await run(
      null,
      (onEvent, signal) => sendTurn(id, body, onEvent, { signal, apiKeyId: apiKeyId() }),
      async () => {},
    )
  }

  /* Stops the streaming turn.  The turn is dropped and its text restored. */
  function cancel() {
    controller?.abort()
  }

  /* Ends the conversation: abort, delete the server copy once (failure is
     ignored, the TTL removes it), and start clean. */
  function newChat() {
    epoch++
    controller?.abort()
    controller = null
    if (sessionId) {
      deleteSession(sessionId, apiKeyId()).catch(() => {})
      sessionId = null
    }
    status.value = 'idle'
    turns.value = []
    draft.value = ''
    error.value = null
    notice.value = null
    turnsLeft.value = null
  }

  return {
    status,
    turns,
    draft,
    error,
    notice,
    turnsLeft,
    oneShot,
    lastAssistant,
    canSend,
    canFinalize,
    canAttach,
    send,
    finalize,
    cancel,
    newChat,
  }
})
