const API_BASE = ''
const PUBLIC_API_KEY = 'pk_live_fNuYW07Bf16zLFLbghxSPERYV4QS1SWF4-OuLJ5JcCE'

/* `code` is the API's machine-readable error code (ErrorResponse.code), when
   the body carries one. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PUBLIC_API_KEY}`,
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText)
    throw new ApiError(response.status, text)
  }

  if (response.status === 204) return undefined as T

  return response.json()
}
