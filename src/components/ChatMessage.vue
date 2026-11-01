<script setup lang="ts">
import { computed } from 'vue'
import { useMarkdown } from '@/composables/useMarkdown'

/* `markdown` renders the content as markdown (the playground); without it
   the content shows as plain text. */
const props = defineProps<{
  role: 'user' | 'assistant'
  content: string
  markdown?: boolean
}>()

const { renderMarkdown } = useMarkdown()
const rendered = computed(() => (props.markdown ? renderMarkdown(props.content) : ''))
</script>

<template>
  <div class="chat-msg" :class="[`chat-msg--${role}`]" :aria-label="`${role} message`">
    <div class="chat-msg__label">{{ role === 'user' ? 'You' : 'Koleslaw' }}</div>
    <div
      v-if="markdown"
      class="chat-msg__body chat-msg__body--markdown markdown-body"
      v-html="rendered"
    />
    <div v-else class="chat-msg__body">{{ content }}</div>
  </div>
</template>

<style scoped>
.chat-msg {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 85%;
}

.chat-msg--user {
  align-self: flex-end;
}

.chat-msg--assistant {
  align-self: flex-start;
}

.chat-msg__label {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--wl-warm-gray);
  padding: 0 0.5rem;
}

.chat-msg__body {
  padding: 0.625rem 0.875rem;
  border-radius: var(--radius);
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-msg__body--markdown {
  white-space: normal;
}

.chat-msg__body--markdown :deep(> :first-child) {
  margin-top: 0;
}

.chat-msg__body--markdown :deep(> :last-child) {
  margin-bottom: 0;
}

.chat-msg--user .chat-msg__body {
  background: var(--color-primary);
  color: var(--wl-cream);
  border-bottom-right-radius: 2px;
}

.chat-msg--assistant .chat-msg__body {
  background: var(--color-background-mute);
  color: var(--color-text);
  border-bottom-left-radius: 2px;
}
</style>
