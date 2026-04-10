<script setup lang="ts">
import { toRef } from 'vue'
import { usePlatformLinks } from '@/composables/usePlatformLinks'

const props = defineProps<{
  enhancedPrompt: string
}>()

const promptRef = toRef(props, 'enhancedPrompt')
const { platforms, copiedPlatformId, copyToClipboard } = usePlatformLinks(promptRef)
</script>

<template>
  <div v-if="enhancedPrompt" class="platform-bar">
    <span class="platform-bar__label">Use this prompt in:</span>
    <div class="platform-bar__buttons">
      <template v-for="p in platforms" :key="p.id">
        <a
          v-if="p.type === 'deeplink'"
          :href="p.url"
          target="_blank"
          rel="noopener noreferrer"
          class="platform-bar__btn"
        >
          <span class="platform-bar__icon">{{ p.icon }}</span>
          Open in {{ p.name }}
        </a>
        <button
          v-else
          class="platform-bar__btn"
          :class="{ 'platform-bar__btn--copied': copiedPlatformId === p.id }"
          @click="copyToClipboard(p.id)"
        >
          <span class="platform-bar__icon">{{ p.icon }}</span>
          {{ copiedPlatformId === p.id ? 'Copied ✓' : `Copy for ${p.name}` }}
        </button>
      </template>
    </div>
    <button
      class="platform-bar__copy-btn"
      :class="{ 'platform-bar__copy-btn--copied': copiedPlatformId === '_copy' }"
      @click="copyToClipboard('_copy')"
    >
      {{ copiedPlatformId === '_copy' ? 'Copied!' : 'Copy' }}
    </button>
  </div>
</template>

<style scoped>
.platform-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--color-border);
}

.platform-bar__label {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--wl-warm-gray);
  white-space: nowrap;
}

.platform-bar__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.platform-bar__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius);
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--color-text);
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.platform-bar__btn:hover {
  border-color: var(--wl-navy);
  color: var(--wl-navy);
}

.platform-bar__btn--copied {
  border-color: var(--color-success);
  color: var(--color-success);
  background: var(--color-success-bg);
}

.platform-bar__icon {
  font-size: 1rem;
  line-height: 1;
}

.platform-bar__copy-btn {
  margin-left: auto;
  background: transparent;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius);
  padding: 0.3rem 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.platform-bar__copy-btn:hover {
  border-color: var(--wl-navy);
  color: var(--wl-navy);
}

.platform-bar__copy-btn--copied {
  border-color: var(--color-success);
  color: var(--color-success);
  background: var(--color-success-bg);
}
</style>
