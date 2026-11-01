<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMarkdown } from '@/composables/useMarkdown'
import PlatformActionBar from '@/components/PlatformActionBar.vue'

/* An enhanced prompt.  While it streams there is nothing to copy yet; once
   complete it offers Copy, Clear and the platform bar. */
const props = defineProps<{
  text: string
  streaming: boolean
}>()

const emit = defineEmits<{
  clear: []
}>()

const { renderMarkdown } = useMarkdown()
const copied = ref(false)

/* Strip boilerplate the model sometimes wraps around its output */
function cleanResponse(raw: string): string {
  return raw
    .replace(/^---\n?/gm, '')
    .replace(
      /^\s*(?:[#*_`]*\s*)*(?:here(?:'s| is)(?: your| the)?\s+)?enhanced\s+prompt\s*(?:[#*_`]*\s*)*:?\s*\n*/i,
      '',
    )
    .trim()
}

const prompt = computed(() => cleanResponse(props.text))
const rendered = computed(() => renderMarkdown(prompt.value))

function markCopied() {
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

async function copyToClipboard() {
  const text = prompt.value
  try {
    await navigator.clipboard.writeText(text)
    markCopied()
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    markCopied()
  }
}
</script>

<template>
  <div
    v-if="prompt"
    class="enhance__response animate-in"
    aria-label="Enhanced prompt result"
    aria-live="polite"
  >
    <div class="enhance__response-header">
      <h3 class="enhance__response-title">Enhanced Prompt</h3>
      <div v-if="!streaming" class="enhance__response-actions">
        <button class="enhance__clear-btn" @click="emit('clear')">Clear</button>
        <button
          class="enhance__copy-btn"
          :class="{ 'enhance__copy-btn--copied': copied }"
          @click="copyToClipboard"
        >
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>
    <div class="enhance__response-body">
      <div class="response-text markdown-body" v-html="rendered" />
      <span v-if="streaming" class="enhance__cursor" />
    </div>
    <PlatformActionBar v-if="!streaming" :enhanced-prompt="prompt" @clear="emit('clear')" />
  </div>
</template>

<style scoped>
/* ─── Response ─── */
.enhance__response {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.enhance__response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.enhance__response-title {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
}

.enhance__response-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.enhance__clear-btn {
  background: transparent;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius);
  padding: 0.3rem 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s,
    background 0.2s;
}

.enhance__clear-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.enhance__copy-btn {
  background: transparent;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius);
  padding: 0.3rem 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text);
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s,
    background 0.2s;
}

.enhance__copy-btn:hover {
  border-color: var(--wl-navy);
  color: var(--wl-navy);
}

.enhance__copy-btn--copied {
  border-color: var(--color-success);
  color: var(--color-success);
  background: var(--color-success-bg);
}

.enhance__response-body {
  padding: 1.25rem;
  position: relative;
}

.enhance__cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--wl-gold);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
