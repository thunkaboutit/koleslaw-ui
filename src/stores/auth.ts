import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError } from '@/api/client'
import type { UserInfo, DataExportResponse } from '@/api/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null)
  const loading = ref(false)

  async function fetchUser() {
    loading.value = true
    try {
      user.value = await api<UserInfo>('/auth/me')
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        user.value = null
      } else {
        throw e
      }
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(name: string) {
    user.value = await api<UserInfo>('/v1/account/profile', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    })
  }

  async function exportData() {
    return await api<DataExportResponse>('/v1/account/export')
  }

  async function deleteAccount(confirmation: string) {
    await api('/v1/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation }),
    })
    user.value = null
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, loading, fetchUser, logout, updateProfile, exportData, deleteAccount }
})
