<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import ChatMessage from '@/components/ChatMessage.vue'

const chat = useChatStore()
const open = ref(false)
const input = ref('')
const messagesEl = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
  if (open.value) {
    nextTick(() => scrollToBottom())
  }
}

function scrollToBottom() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

watch(
  () => [chat.messages.length, chat.streamingContent],
  () => {
    if (open.value) nextTick(() => scrollToBottom())
  },
)

async function handleSend() {
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  await chat.send(text)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleClear() {
  chat.clearChat()
}

function retry() {
  chat.error = null
  // Re-send last user message
  const lastUser = [...chat.messages].reverse().find((m) => m.role === 'user')
  if (lastUser) {
    // Remove the last user message since send() will re-add it
    chat.messages.pop()
    chat.send(lastUser.content)
  }
}
</script>

<template>
  <div class="chat-panel" :class="{ 'chat-panel--open': open }">
    <!-- Toggle button -->
    <button
      class="chat-toggle"
      :aria-expanded="open"
      aria-label="Toggle chat panel"
      @click="toggle"
    >
      <span class="chat-toggle__icon" aria-hidden="true">{{ open ? '&times;' : '&#9993;' }}</span>
      <span v-if="!open" class="chat-toggle__label">Chat</span>
    </button>

    <!-- Panel -->
    <div v-if="open" class="chat-container" role="region" aria-label="AI chat">
      <header class="chat-header">
        <h3 class="chat-header__title">Koleslaw Chat</h3>
        <button
          v-if="chat.hasMessages"
          class="chat-header__clear"
          aria-label="Clear chat history"
          @click="handleClear"
        >
          Clear
        </button>
      </header>

      <!-- Messages -->
      <div ref="messagesEl" class="chat-messages" role="log" aria-live="polite">
        <div v-if="!chat.hasMessages && !chat.sending" class="chat-empty">
          <p>Ask anything about prompts, APIs, or development.</p>
        </div>

        <ChatMessage
          v-for="(msg, i) in chat.messages"
          :key="i"
          :role="msg.role"
          :content="msg.content"
        />

        <!-- Streaming response -->
        <ChatMessage
          v-if="chat.sending && chat.streamingContent"
          role="assistant"
          :content="chat.streamingContent"
        />

        <!-- Typing indicator -->
        <div v-if="chat.sending && !chat.streamingContent" class="chat-typing" aria-label="Assistant is thinking">
          <span class="chat-typing__dot" />
          <span class="chat-typing__dot" />
          <span class="chat-typing__dot" />
        </div>

        <!-- Error -->
        <div v-if="chat.error" class="chat-error" role="alert">
          <p>{{ chat.error }}</p>
          <button class="chat-error__retry" @click="retry">Retry</button>
        </div>
      </div>

      <!-- Input -->
      <div class="chat-input">
        <textarea
          v-model="input"
          class="chat-input__field"
          rows="2"
          placeholder="Type a message..."
          :disabled="chat.sending"
          aria-label="Chat message input"
          @keydown="handleKeydown"
        />
        <button
          class="chat-input__send"
          :disabled="chat.sending || !input.trim()"
          aria-label="Send message"
          @click="handleSend"
        >
          {{ chat.sending ? 'Sending...' : 'Send' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 1000;
  font-family: var(--font-body);
}

.chat-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--color-primary);
  color: var(--wl-cream);
  border: 2px solid var(--color-primary);
  border-radius: 2rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
  box-shadow: 0 4px 12px rgba(26, 39, 68, 0.25);
}

.chat-toggle:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.chat-toggle__icon {
  font-size: 1.125rem;
  line-height: 1;
}

.chat-panel--open .chat-toggle {
  position: absolute;
  top: -0.5rem;
  right: 0;
  transform: translateY(-100%);
  border-radius: var(--radius);
  padding: 0.375rem 0.625rem;
}

.chat-container {
  width: 380px;
  max-height: 520px;
  display: flex;
  flex-direction: column;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px rgba(26, 39, 68, 0.15);
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-background);
}

.chat-header__title {
  font-family: var(--font-heading);
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-heading);
}

.chat-header__clear {
  background: none;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius);
  padding: 0.25rem 0.625rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--wl-warm-gray);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.chat-header__clear:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 200px;
  max-height: 360px;
}

.chat-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
  color: var(--wl-warm-gray);
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem;
}

/* Typing indicator */
.chat-typing {
  display: flex;
  gap: 4px;
  align-self: flex-start;
  padding: 0.75rem 1rem;
  background: var(--color-background-mute);
  border-radius: var(--radius);
}

.chat-typing__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--wl-warm-gray);
  animation: typing-bounce 1.4s infinite ease-in-out both;
}

.chat-typing__dot:nth-child(1) { animation-delay: -0.32s; }
.chat-typing__dot:nth-child(2) { animation-delay: -0.16s; }
.chat-typing__dot:nth-child(3) { animation-delay: 0s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* Error */
.chat-error {
  align-self: center;
  background: var(--color-danger-bg);
  border: 1px solid rgba(158, 42, 42, 0.2);
  border-radius: var(--radius);
  padding: 0.625rem 0.875rem;
  font-size: 0.8125rem;
  color: var(--color-danger);
  text-align: center;
}

.chat-error__retry {
  margin-top: 0.375rem;
  background: none;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius);
  padding: 0.25rem 0.75rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-danger);
  cursor: pointer;
}

.chat-error__retry:hover {
  background: var(--color-danger);
  color: var(--wl-cream);
}

/* Input */
.chat-input {
  display: flex;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

.chat-input__field {
  flex: 1;
  padding: 0.5rem 0.625rem;
  background: var(--color-background);
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius);
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-text);
  resize: none;
  line-height: 1.4;
}

.chat-input__field:focus {
  border-color: var(--color-primary);
  outline: none;
}

.chat-input__field::placeholder {
  color: var(--wl-warm-gray-light);
}

.chat-input__field:disabled {
  opacity: 0.5;
}

.chat-input__send {
  align-self: flex-end;
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  color: var(--wl-cream);
  border: none;
  border-radius: var(--radius);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.chat-input__send:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.chat-input__send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive: smaller on mobile */
@media (max-width: 480px) {
  .chat-container {
    width: calc(100vw - 2rem);
    max-height: 70vh;
  }

  .chat-panel {
    bottom: 1rem;
    right: 1rem;
  }
}
</style>
