/* Model sessions: start, turn, delete.  Auth is the same as /v1/chat (the
   public bearer, plus X-Api-Key-Id for a signed-in user's selected key).  The
   session id rides in the X-Session-Id header, never the path. */

import { authHeaders, postEventStream } from './chat'
import { decodeSessionEvent, type SessionEvent } from './sse'
import type { StartSessionRequest, TurnRequest } from './types'

export const SESSION_ID_HEADER = 'X-Session-Id'

export interface SessionCallOptions {
  signal?: AbortSignal
  apiKeyId?: string | null
}

export async function startSession(
  body: StartSessionRequest,
  onEvent: (event: SessionEvent) => void,
  options: SessionCallOptions = {},
): Promise<void> {
  await postEventStream('/v1/sessions', body, decodeSessionEvent, onEvent, options)
}

export async function sendTurn(
  sessionId: string,
  body: TurnRequest,
  onEvent: (event: SessionEvent) => void,
  options: SessionCallOptions = {},
): Promise<void> {
  await postEventStream('/v1/sessions/turns', body, decodeSessionEvent, onEvent, {
    ...options,
    headers: { [SESSION_ID_HEADER]: sessionId },
  })
}

/* Always 204 on the server.  Rejects only on a network failure. */
export async function deleteSession(sessionId: string, apiKeyId?: string | null): Promise<void> {
  await fetch('/v1/sessions', {
    method: 'DELETE',
    headers: { ...authHeaders(apiKeyId), [SESSION_ID_HEADER]: sessionId },
  })
}
