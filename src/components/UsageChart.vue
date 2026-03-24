<script setup lang="ts">
import { computed } from 'vue'
import type { DailyUsage } from '@/api/types'

const props = defineProps<{
  data: DailyUsage[]
}>()

const maxRequests = computed(() => Math.max(...props.data.map((d) => d.requests), 1))

function shortDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<template>
  <div class="chart" v-if="data.length">
    <div class="chart__bars">
      <div
        v-for="day in data"
        :key="day.date"
        class="chart__col"
        :title="`${day.date}: ${day.requests} requests`"
      >
        <div
          class="chart__bar"
          :style="{ height: `${(day.requests / maxRequests) * 100}%` }"
        ></div>
        <span class="chart__label">{{ shortDate(day.date) }}</span>
      </div>
    </div>
  </div>
  <p v-else class="chart__empty">No usage data for this period.</p>
</template>

<style scoped>
.chart {
  width: 100%;
  overflow-x: auto;
}

.chart__bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 200px;
  padding-bottom: 1.5rem;
  position: relative;
}

.chart__col {
  flex: 1;
  min-width: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  position: relative;
}

.chart__bar {
  width: 100%;
  max-width: 32px;
  background: var(--wl-navy);
  border-radius: var(--radius) var(--radius) 0 0;
  min-height: 2px;
  transition: height 0.3s ease;
}

.chart__label {
  position: absolute;
  bottom: -1.25rem;
  font-size: 0.625rem;
  color: var(--color-text);
  white-space: nowrap;
}

.chart__empty {
  text-align: center;
  color: var(--color-text);
  padding: 2rem 0;
  opacity: 0.6;
}
</style>
