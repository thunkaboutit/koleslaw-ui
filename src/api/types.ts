export interface UserInfo {
  id: string
  email: string
  name: string
  oauth_provider: string
  created_at: string
}

export interface LoginRequest {
  username: string
  password: string
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
