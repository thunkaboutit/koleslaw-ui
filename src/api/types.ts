export interface UserInfo {
  id: string
  email: string
  name: string
  oauth_provider: string
  created_at: string
  plan: string
}

export interface KeyInfo {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
  rate_limit: number
}

export interface CreateKeyRequest {
  name: string
}

export interface CreateKeyResponse {
  id: string
  name: string
  key: string
  key_prefix: string
  created_at: string
}

export interface KeyListResponse {
  keys: KeyInfo[]
}

export interface UsageSummary {
  total_requests: number
  total_input_tokens: number
  total_output_tokens: number
  cached_requests: number
}

export interface DailyUsage {
  date: string
  requests: number
  input_tokens: number
  output_tokens: number
}

export interface UsageResponse {
  summary: UsageSummary
  daily: DailyUsage[]
  period_start: string
  period_end: string
}

export interface UpdateProfileRequest {
  name: string
}

export interface ExportProfile {
  email: string
  name: string
  oauth_provider: string
  created_at: string
}

export interface ExportApiKey {
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

export interface ExportUsageEntry {
  timestamp: string
  input_tokens: number
  output_tokens: number
}

export interface DataExportResponse {
  exported_at: string
  profile: ExportProfile
  api_keys: ExportApiKey[]
  usage_logs: ExportUsageEntry[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  context?: string
}

export interface ChatResponse {
  message: ChatMessage
  model_used: string
  usage: { input_tokens: number; output_tokens: number }
}

// ── Model sessions (mirrors koleslaw-api schemas/session.py) ────────

export type EnhancementType = 'auto' | 'expand' | 'refine' | 'structure'

export interface StartSessionRequest {
  prompt: string
  context?: string | null
  enhancement_type?: EnhancementType
}

export type TurnAction = 'reply' | 'finalize'

/* `message` is required for a reply and ignored for a finalize. */
export interface TurnRequest {
  action?: TurnAction
  message?: string
}

export type TurnKind = 'question' | 'prompt' | 'empty'

/* First event of POST /v1/sessions only.  The id is held in memory only. */
export interface SessionStartEvent {
  type: 'session'
  session_id: string
  expires_in: number
  turns_left: number
}

/* Last event of a turn that completed.  An empty turn is not stored, so its
   number is used again. */
export interface TurnEvent {
  type: 'turn'
  kind: TurnKind
  turn: number
  turns_left: number
  model_used: string
}

/* Last event of a turn that failed after the stream opened.  The message is
   safe to show. */
export interface SessionErrorEvent {
  type: 'error'
  code: string
  message: string
}
