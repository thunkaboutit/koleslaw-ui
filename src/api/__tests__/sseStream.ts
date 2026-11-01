/* Test doubles for an SSE response body.  `sseResponse` replays fixed raw
   reads; `controlledSSE` lets a spec push events one at a time and inspect
   the UI between them; `errorResponse` is a non-2xx JSON answer. */

const encoder = new TextEncoder()

type ReadResult = { done: false; value: Uint8Array } | { done: true; value: undefined }

function responseFrom(read: () => Promise<ReadResult>): Response {
  return { ok: true, body: { getReader: () => ({ read }) } } as unknown as Response
}

/* Each string is one reader.read() result, so a frame can be split on purpose. */
export function sseResponse(reads: string[]): Response {
  let i = 0
  return responseFrom(async () =>
    i < reads.length
      ? { done: false, value: encoder.encode(reads[i++]) }
      : { done: true, value: undefined },
  )
}

export function frame(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/* A complete stream: each event framed, then the done marker. */
export function sseEvents(events: unknown[]): Response {
  return sseResponse([...events.map(frame), 'data: [DONE]\n\n'])
}

export function errorResponse(status: number, body: unknown): Response {
  const text = JSON.stringify(body)
  return { ok: false, status, statusText: '', text: async () => text } as unknown as Response
}

/* With a signal, a pending read rejects with an AbortError once it aborts,
   as a real fetch body does. */
export function controlledSSE(signal?: AbortSignal | null) {
  const queue: string[] = []
  let closed = false
  let wake: (() => void) | null = null

  const read = () =>
    new Promise<ReadResult>((resolve, reject) => {
      const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'))
      if (signal?.aborted) return abort()
      signal?.addEventListener('abort', abort, { once: true })
      const next = () => {
        const raw = queue.shift()
        if (raw !== undefined) resolve({ done: false, value: encoder.encode(raw) })
        else if (closed) resolve({ done: true, value: undefined })
        else wake = next
      }
      next()
    })

  const notify = () => {
    const w = wake
    wake = null
    w?.()
  }

  return {
    response: responseFrom(read),
    push(event: unknown) {
      queue.push(frame(event))
      notify()
    },
    close() {
      queue.push('data: [DONE]\n\n')
      closed = true
      notify()
    },
  }
}
