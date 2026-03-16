import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api, ApiError } from '@/api/client'
import type { UserInfo } from '@/api/types'

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

  async function login(username: string, password: string) {
    await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    await fetchUser()
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    user.value = null
  }

  return { user, loading, fetchUser, login, logout }
})
