<script setup lang="ts">
import type { KeyInfo } from '@/api/types'
import BaseButton from './BaseButton.vue'

defineProps<{
  keyInfo: KeyInfo
}>()

defineEmits<{
  revoke: [id: string]
}>()

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <tr :class="{ 'row--revoked': !keyInfo.is_active }">
    <td>{{ keyInfo.name }}</td>
    <td class="mono">{{ keyInfo.key_prefix }}...</td>
    <td>{{ formatDate(keyInfo.created_at) }}</td>
    <td>{{ keyInfo.last_used_at ? formatDate(keyInfo.last_used_at) : 'Never' }}</td>
    <td>
      <span :class="keyInfo.is_active ? 'badge badge--active' : 'badge badge--revoked'">
        {{ keyInfo.is_active ? 'Active' : 'Revoked' }}
      </span>
    </td>
    <td>
      <BaseButton v-if="keyInfo.is_active" variant="danger" @click="$emit('revoke', keyInfo.id)">
        Revoke
      </BaseButton>
    </td>
  </tr>
</template>

<style scoped>
td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.mono {
  font-family: var(--font-mono);
}

.row--revoked {
  opacity: 0.5;
}

.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge--active {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.badge--revoked {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
</style>
