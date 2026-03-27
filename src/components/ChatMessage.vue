<script setup lang="ts">
defineProps<{
  role: 'user' | 'assistant'
  content: string
}>()
</script>

<template>
  <div class="chat-msg" :class="[`chat-msg--${role}`]" :aria-label="`${role} message`">
    <div class="chat-msg__label">{{ role === 'user' ? 'You' : 'Koleslaw' }}</div>
    <div class="chat-msg__body">{{ content }}</div>
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
