import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { KeyInfo } from '@/api/types'

const apiMock = vi.hoisted(() => vi.fn())
vi.mock('@/api/client', () => ({ api: apiMock }))

import { useKeysStore } from '../keys'

const STORAGE = 'koleslaw-playground-key'

/* Node's experimental localStorage global shadows jsdom's here, so give the
   store and the assertions one deterministic Map-backed stand-in. */
function stubStorage(): Storage {
  const data = new Map<string, string>()
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, String(value)),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size
    },
  } as Storage
  vi.stubGlobal('localStorage', storage)
  return storage
}

function key(id: string, createdAt: string, isActive = true): KeyInfo {
  return {
    id,
    name: `key-${id}`,
    key_prefix: `pk_live_${id}`,
    created_at: createdAt,
    last_used_at: null,
    is_active: isActive,
    rate_limit: 60,
  }
}

describe('playground key selection', () => {
  beforeEach(() => {
    stubStorage()
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('defaults to the newest active key when nothing is selected', async () => {
    // The API returns newest first
    apiMock.mockResolvedValue({ keys: [key('b', '2026-07-30'), key('a', '2026-07-01')] })
    const store = useKeysStore()

    await store.fetchKeys()

    expect(store.playgroundKeyId).toBe('b')
    expect(localStorage.getItem(STORAGE)).toBe('b')
  })

  it('keeps a stored selection that is still active', async () => {
    localStorage.setItem(STORAGE, 'a')
    apiMock.mockResolvedValue({ keys: [key('b', '2026-07-30'), key('a', '2026-07-01')] })
    const store = useKeysStore()

    await store.fetchKeys()

    expect(store.playgroundKeyId).toBe('a')
  })

  it('falls back to the newest active key when the selection was revoked', async () => {
    localStorage.setItem(STORAGE, 'a')
    apiMock.mockResolvedValue({ keys: [key('b', '2026-07-30'), key('a', '2026-07-01', false)] })
    const store = useKeysStore()

    await store.fetchKeys()

    expect(store.playgroundKeyId).toBe('b')
    expect(localStorage.getItem(STORAGE)).toBe('b')
  })

  it('clears the selection when no active keys remain', async () => {
    localStorage.setItem(STORAGE, 'a')
    apiMock.mockResolvedValue({ keys: [key('a', '2026-07-01', false)] })
    const store = useKeysStore()

    await store.fetchKeys()

    expect(store.playgroundKeyId).toBeNull()
    expect(localStorage.getItem(STORAGE)).toBeNull()
  })

  it('persists an explicit selection across store instances', () => {
    const store = useKeysStore()
    store.selectPlaygroundKey('a')

    setActivePinia(createPinia())
    const fresh = useKeysStore()

    expect(fresh.playgroundKeyId).toBe('a')
  })
})
