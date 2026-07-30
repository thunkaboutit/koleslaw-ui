<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useKeysStore } from '@/stores/keys'

const auth = useAuthStore()
const keysStore = useKeysStore()

const activeKeys = computed(() => keysStore.keys.filter((k) => k.is_active))

onMounted(() => {
  if (auth.user && !keysStore.keys.length) keysStore.fetchKeys()
})

const selected = computed({
  get: () => keysStore.playgroundKeyId ?? '',
  set: (id: string) => keysStore.selectPlaygroundKey(id || null),
})
</script>

<template>
  <div v-if="auth.user" class="key-picker">
    <template v-if="activeKeys.length">
      <label class="key-picker__label" for="playground-key-select">Using key</label>
      <select id="playground-key-select" v-model="selected" class="key-picker__select">
        <option v-for="key in activeKeys" :key="key.id" :value="key.id">
          {{ key.name }} ({{ key.key_prefix }}…)
        </option>
      </select>
    </template>
    <RouterLink v-else-if="!keysStore.loading" class="key-picker__hint" to="/keys">
      Create an API key to use your plan's higher limits →
    </RouterLink>
  </div>
</template>

<style scoped>
.key-picker {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.key-picker__label {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--wl-warm-gray);
  user-select: none;
}

.key-picker__select {
  max-width: 240px;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-card);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.2s;
}

.key-picker__select:hover,
.key-picker__select:focus {
  border-color: var(--wl-navy);
  outline: none;
}

.key-picker__hint {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--wl-navy);
  text-decoration: underline;
}
</style>
