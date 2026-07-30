import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/api/client'
import type { CreateKeyResponse, KeyInfo, KeyListResponse } from '@/api/types'

const PLAYGROUND_KEY_STORAGE = 'koleslaw-playground-key'

function loadPlaygroundKey(): string | null {
  try {
    return localStorage.getItem(PLAYGROUND_KEY_STORAGE)
  } catch {
    return null
  }
}

export const useKeysStore = defineStore('keys', () => {
  const keys = ref<KeyInfo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const newlyCreatedKey = ref<CreateKeyResponse | null>(null)
  /* Which of the user's keys the playground acts as (sent as X-Api-Key-Id).
     Only the id is stored — the plaintext key never persists client-side. */
  const playgroundKeyId = ref<string | null>(loadPlaygroundKey())

  function selectPlaygroundKey(id: string | null) {
    playgroundKeyId.value = id
    try {
      if (id) localStorage.setItem(PLAYGROUND_KEY_STORAGE, id)
      else localStorage.removeItem(PLAYGROUND_KEY_STORAGE)
    } catch {
      // storage unavailable — the selection just won't survive a reload
    }
  }

  /* Keep the selection valid against the fetched list: default to the newest
     active key (the API returns newest first), and step off a key that was
     revoked or belongs to a previously signed-in account. */
  function reconcilePlaygroundKey() {
    const active = keys.value.filter((k) => k.is_active)
    if (!active.some((k) => k.id === playgroundKeyId.value)) {
      selectPlaygroundKey(active[0]?.id ?? null)
    }
  }

  async function fetchKeys() {
    loading.value = true
    error.value = null
    try {
      const data = await api<KeyListResponse>('/v1/keys')
      keys.value = data.keys
      reconcilePlaygroundKey()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load keys'
    } finally {
      loading.value = false
    }
  }

  async function createKey(name: string) {
    const data = await api<CreateKeyResponse>('/v1/keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    newlyCreatedKey.value = data
    await fetchKeys()
    return data
  }

  async function revokeKey(keyId: string) {
    await api(`/v1/keys/${keyId}`, { method: 'DELETE' })
    await fetchKeys()
  }

  function clearNewKey() {
    newlyCreatedKey.value = null
  }

  return {
    keys,
    loading,
    error,
    newlyCreatedKey,
    playgroundKeyId,
    fetchKeys,
    createKey,
    revokeKey,
    clearNewKey,
    selectPlaygroundKey,
  }
})
