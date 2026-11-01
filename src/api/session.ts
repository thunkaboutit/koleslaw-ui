/* Model sessions: start, turn, delete.  Signatures only; implemented in the
   next commit. */

import type { SessionEvent } from './sse'
import type { StartSessionRequest, TurnRequest } from './types'

export interface SessionCallOptions {
  signal?: AbortSignal
  apiKeyId?: string | null
}

export async function startSession(
  _body: StartSessionRequest,
  _onEvent: (event: SessionEvent) => void,
  _options: SessionCallOptions = {},
): Promise<void> {
  throw new Error('Not implemented')
}

export async function sendTurn(
  _sessionId: string,
  _body: TurnRequest,
  _onEvent: (event: SessionEvent) => void,
  _options: SessionCallOptions = {},
): Promise<void> {
  throw new Error('Not implemented')
}

export async function deleteSession(_sessionId: string, _apiKeyId?: string | null): Promise<void> {
  throw new Error('Not implemented')
}
