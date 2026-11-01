import { vi } from 'vitest'
import { controlledSSE, errorResponse, sseEvents } from '@/api/__tests__/sseStream'

/* A scripted koleslaw-api for session specs.  Each POST takes the next
   queued answer; DELETE answers 204 unless told otherwise.  Every request is
   recorded. */

export interface RecordedCall {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

type Answer = (init: RequestInit) => Response | Promise<Response>

export const SID = 'sid-1'

export const ev = {
  session: (turnsLeft = 3) => ({
    type: 'session',
    session_id: SID,
    expires_in: 1800,
    turns_left: turnsLeft,
  }),
  thinking: (delta: string) => ({ type: 'thinking', delta }),
  text: (delta: string) => ({ type: 'text', delta }),
  turn: (kind: string, turn: number, turnsLeft: number) => ({
    type: 'turn',
    kind,
    turn,
    turns_left: turnsLeft,
    model_used: 'koleslaw',
  }),
  error: (code: string, message: string) => ({ type: 'error', code, message }),
}

export function apiError(code: string) {
  return { error: code.replace('_', ' '), code, detail: null }
}

export function stubServer() {
  const calls: RecordedCall[] = []
  const queue: Answer[] = []
  let deleteAnswer: () => Promise<Response> = async () => ({ ok: true, status: 204 }) as Response

  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      headers: (init.headers ?? {}) as Record<string, string>,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : init.body,
    })
    if (init.method === 'DELETE') return deleteAnswer()
    const answer = queue.shift()
    if (!answer) throw new Error(`unexpected request ${url}`)
    return answer(init)
  })
  vi.stubGlobal('fetch', fetchMock)

  return {
    calls,
    posts: () => calls.filter((c) => c.method === 'POST'),
    deletes: () => calls.filter((c) => c.method === 'DELETE'),
    /* A complete stream of these events. */
    reply(...events: unknown[]) {
      queue.push(() => sseEvents(events))
    },
    fail(status: number, body: unknown) {
      queue.push(() => errorResponse(status, body))
    },
    /* A stream the spec drives; it honours the request's abort signal. */
    stream() {
      let live: ReturnType<typeof controlledSSE> | null = null
      const pending: Array<(s: ReturnType<typeof controlledSSE>) => void> = []
      queue.push((init) => {
        live = controlledSSE(init.signal)
        pending.splice(0).forEach((op) => op(live!))
        return live.response
      })
      const run = (op: (s: ReturnType<typeof controlledSSE>) => void) =>
        live ? op(live) : pending.push(op)
      return {
        push: (event: unknown) => run((s) => s.push(event)),
        close: () => run((s) => s.close()),
      }
    },
    deleteFails() {
      deleteAnswer = async () => {
        throw new TypeError('Failed to fetch')
      }
    },
  }
}
