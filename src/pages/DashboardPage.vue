<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useUsageStore } from '@/stores/usage'
import BaseCard from '@/components/BaseCard.vue'
import UsageChart from '@/components/UsageChart.vue'

const usage = useUsageStore()

onMounted(() => usage.fetchUsage())

const cacheRate = computed(() => {
  if (!usage.data || usage.data.summary.total_requests === 0) return '0%'
  const rate = (usage.data.summary.cached_requests / usage.data.summary.total_requests) * 100
  return `${rate.toFixed(1)}%`
})

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

const periods = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]
</script>

<template>
  <div>
    <div class="page-header">
      <h1>Dashboard</h1>
      <div class="period-selector">
        <button
          v-for="p in periods"
          :key="p.days"
          class="period-btn"
          :class="{ active: usage.period === p.days }"
          @click="usage.setPeriod(p.days)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <p v-if="usage.error" class="error">{{ usage.error }}</p>

    <div v-if="usage.loading && !usage.data" class="loading">Loading usage data...</div>

    <template v-if="usage.data">
      <div class="stats-grid">
        <BaseCard title="Requests">
          <p class="stat-value">{{ formatNumber(usage.data.summary.total_requests) }}</p>
        </BaseCard>
        <BaseCard title="Input Tokens">
          <p class="stat-value">{{ formatNumber(usage.data.summary.total_input_tokens) }}</p>
        </BaseCard>
        <BaseCard title="Output Tokens">
          <p class="stat-value">{{ formatNumber(usage.data.summary.total_output_tokens) }}</p>
        </BaseCard>
        <BaseCard title="Cache Hit Rate">
          <p class="stat-value">{{ cacheRate }}</p>
        </BaseCard>
      </div>

      <BaseCard title="Daily Requests" class="chart-card">
        <UsageChart :data="usage.data.daily" />
      </BaseCard>
    </template>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-heading);
}

.period-selector {
  display: flex;
  gap: 0.25rem;
  background: var(--color-background-mute);
  border-radius: var(--radius);
  padding: 0.125rem;
}

.period-btn {
  padding: 0.375rem 0.75rem;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  cursor: pointer;
  border-radius: var(--radius);
  color: var(--color-text);
}

.period-btn.active {
  background: var(--color-card);
  font-weight: 600;
  color: var(--color-heading);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-heading);
}

.chart-card {
  margin-bottom: 1.5rem;
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
}

.error {
  color: var(--color-danger);
}
</style>
