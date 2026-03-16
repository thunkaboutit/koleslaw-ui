import { ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '@/api/client'
import type { UsageResponse } from '@/api/types'

export const useUsageStore = defineStore('usage', () => {
  const data = ref<UsageResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const period = ref(30)

  async function fetchUsage() {
    loading.value = true
    error.value = null
    try {
      data.value = await api<UsageResponse>(`/v1/usage?days=${period.value}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load usage'
    } finally {
      loading.value = false
    }
  }

  async function setPeriod(days: number) {
    period.value = days
    await fetchUsage()
  }

  return { data, loading, error, period, fetchUsage, setPeriod }
})
