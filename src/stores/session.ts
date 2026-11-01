import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { TurnKind } from '@/api/types'

/* The playground conversation as a model session.  Surface only; the state
   machine is implemented in the next commit. */
export type SessionStatus = 'idle' | 'streaming' | 'awaiting_reply' | 'done' | 'expired'

export interface UserTurn {
  id: number
  role: 'user'
  content: string
}

export interface AssistantTurn {
  id: number
  role: 'assistant'
  kind: Exclude<TurnKind, 'empty'> | null
  text: string
  thinking: string
  thinkingActive: boolean
}

export type Turn = UserTurn | AssistantTurn

export const EMPTY_TURN_NOTICE = ''
export const SESSION_FULL_NOTICE = ''
export const SESSIONS_OFF_NOTICE = ''
export const CUT_OFF_ERROR = ''
export const IMAGES_REFUSED_ERROR = ''

export const useSessionStore = defineStore('session', () => {
  const status = ref<SessionStatus>('idle')
  const turns = ref<Turn[]>([])
  const draft = ref('')
  const error = ref<string | null>(null)
  const notice = ref<string | null>(null)
  const turnsLeft = ref<number | null>(null)
  const oneShot = ref(false)

  const lastAssistant = computed<AssistantTurn | null>(() => null)
  const canSend = computed(() => false)
  const canFinalize = computed(() => false)
  const canAttach = computed(() => false)

  async function send(_files: File[] = []) {}
  async function finalize() {}
  function cancel() {}
  function newChat() {}

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
