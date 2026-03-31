const API_BASE = ''
const PUBLIC_API_KEY = 'pk_live_5-sDRbrB_-8sQlGGSlQzx0ZJoqLVj_VZb4ZWYDVXdho'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
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
      'X-API-Key': PUBLIC_API_KEY,
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
