<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useMarkdown } from '@/composables/useMarkdown'

/* One assistant turn's reasoning.  Opens while the model thinks before any
   answer, closes when the answer starts, and stays closed when thinking
   resumes after the answer began: the reader is looking at the answer. */
const props = defineProps<{
  content: string
  active: boolean
  answered: boolean
}>()

const { renderMarkdown } = useMarkdown()

const expanded = ref(props.active && !props.answered)
const bodyRef = ref<HTMLElement | null>(null)
const userScrolled = ref(false)

const rendered = computed(() => (props.content ? renderMarkdown(props.content) : ''))

watch(
  () => props.active,
  (active) => {
    if (active && !props.answered) {
      expanded.value = true
      userScrolled.value = false
    }
  },
)

watch(
  () => props.answered,
  (answered) => {
    if (answered && !props.active) expanded.value = false
  },
)

/* Follow the streamed thinking unless the reader scrolled up */
watch(
  () => props.content,
  () => {
    if (props.active && !userScrolled.value) {
      nextTick(() => {
        const el = bodyRef.value
        if (el) el.scrollTop = el.scrollHeight
      })
    }
  },
)

function onScroll() {
  const el = bodyRef.value
  if (!el) return
  userScrolled.value = el.scrollHeight - el.scrollTop - el.clientHeight >= 20
}
</script>

<template>
  <div class="thinking-block" role="status" aria-label="Model thinking process">
    <button class="thinking-block__header" :aria-expanded="expanded" @click="expanded = !expanded">
      <span v-if="active" class="thinking-block__spinner" aria-hidden="true" />
      <span
        v-else
        class="thinking-block__chevron"
        :class="{ 'thinking-block__chevron--open': expanded }"
        aria-hidden="true"
        >&#9654;</span
      >
      <span class="thinking-block__text">
        {{ active ? 'Thinking…' : 'Thought process' }}
      </span>
    </button>
    <div
      v-if="expanded && content"
      ref="bodyRef"
      class="thinking-block__body markdown-body"
      v-html="rendered"
      @scroll="onScroll"
    />
  </div>
</template>

<style scoped>
.thinking-block {
  background: var(--color-background-soft, var(--color-card));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.thinking-block__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s;
}

.thinking-block__header:hover {
  background: rgba(26, 39, 68, 0.04);
}

.thinking-block__chevron {
  flex-shrink: 0;
  font-size: 0.625rem;
  color: var(--wl-warm-gray);
  transition: transform 0.2s ease;
}

.thinking-block__chevron--open {
  transform: rotate(90deg);
}

.thinking-block__spinner {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--wl-navy);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.thinking-block__text {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--wl-warm-gray);
  font-size: 0.875rem;
}

.thinking-block__body {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
  max-height: 300px;
  overflow-y: auto;
  font-size: 0.8125rem;
  color: var(--wl-warm-gray);
}
</style>
