import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/api/client'
import type { CreateKeyResponse, KeyInfo, KeyListResponse } from '@/api/types'

export const useKeysStore = defineStore('keys', () => {
  const keys = ref<KeyInfo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const newlyCreatedKey = ref<CreateKeyResponse | null>(null)

  async function fetchKeys() {
    loading.value = true
    error.value = null
    try {
      const data = await api<KeyListResponse>('/v1/keys')
      keys.value = data.keys
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

  return { keys, loading, error, newlyCreatedKey, fetchKeys, createKey, revokeKey, clearNewKey }
})
