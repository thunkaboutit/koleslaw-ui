<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useChatStore } from '@/stores/chat'
import BaseModal from '@/components/BaseModal.vue'
import mascotSvg from '@/assets/koleslaw-logo-mascot-woof.svg'

const chat = useChatStore()

/* ── Prompt usage tracking ── */
const PROMPT_COUNT_KEY = 'koleslaw-prompt-count'
const MAX_PROMPTS = 3

/** Number of prompts the visitor has submitted (persisted in localStorage) */
const promptCount = ref(parseInt(localStorage.getItem(PROMPT_COUNT_KEY) ?? '0', 10))

/** Whether the sign-up modal is visible */
const showLimitModal = ref(false)

/* ── Local UI state ── */

/** The current text in the input field */
const userInput = ref('')

/** Whether the copy-to-clipboard action succeeded */
const copied = ref(false)

/** Reference to the response container for auto-scrolling */
const responseRef = ref<HTMLElement | null>(null)

/**
 * The last completed assistant response, captured from the store's messages
 * after streaming finishes (since the store clears streamingContent on completion).
 */
const lastEnhancedPrompt = ref('')

/** The visible enhanced prompt text — live stream or last completed response */
const enhancedPrompt = computed(
  () => chat.streamingContent || lastEnhancedPrompt.value,
)

/** True when there is a completed response to display */
const hasResponse = computed(() => lastEnhancedPrompt.value.length > 0 && !chat.sending)

/** True when the visitor has reached the usage limit */
const limitReached = computed(() => promptCount.value >= MAX_PROMPTS)

/* Auto-scroll as streamed content arrives */
watch(
  () => chat.streamingContent,
  () => {
    if (chat.sending) {
      nextTick(() => {
        responseRef.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    }
  },
)

/**
 * When the store finishes streaming, capture the last assistant message
 * and increment the prompt counter.
 */
watch(
  () => chat.sending,
  (sending, wasSending) => {
    if (wasSending && !sending) {
      const lastAssistant = [...chat.messages].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant) {
        lastEnhancedPrompt.value = lastAssistant.content
        /* Increment and persist usage count on successful completion */
        promptCount.value++
        localStorage.setItem(PROMPT_COUNT_KEY, String(promptCount.value))
      }
    }
  },
)

/**
 * Submit the user's prompt for enhancement.
 * Delegates streaming to the chat store and enforces the per-visitor limit.
 */
async function submitPrompt() {
  const text = userInput.value.trim()
  if (!text || chat.sending) return

  /* Check usage limit before sending */
  if (limitReached.value) {
    showLimitModal.value = true
    return
  }

  /* Reset local display state for a new request */
  lastEnhancedPrompt.value = ''
  copied.value = false

  /* Delegate to the shared chat store */
  await chat.send(text)
}

/** Copy the enhanced prompt to the clipboard */
async function copyToClipboard() {
  const text = enhancedPrompt.value
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* Fallback for older browsers */
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
}
</script>

<template>
  <main class="chat-page">
    <div class="chat-page__container">
      <!-- Header -->
      <div class="chat-page__header animate-in">
        <h1 class="chat-page__title">Enhance Your Prompt</h1>
        <p class="chat-page__subtitle">
          Paste your prompt below and let Woof polish it for better results.
        </p>
      </div>

      <!-- Usage indicator -->
      <div class="chat-page__usage animate-in delay-1">
        <span class="chat-page__usage-text">
          {{ promptCount }} / {{ MAX_PROMPTS }} free prompts used
        </span>
        <div class="chat-page__usage-bar">
          <div
            class="chat-page__usage-fill"
            :style="{ width: `${(promptCount / MAX_PROMPTS) * 100}%` }"
          />
        </div>
      </div>

      <!-- Input area -->
      <div class="chat-page__input-area animate-in delay-2">
        <textarea
          v-model="userInput"
          class="chat-page__textarea"
          placeholder="How can I help you today?"
          rows="4"
          :disabled="chat.sending"
          @keydown.meta.enter="submitPrompt"
          @keydown.ctrl.enter="submitPrompt"
        />
        <div class="chat-page__actions">
          <span class="chat-page__hint">{{ '\u2318' }}+Enter to submit</span>
          <button
            v-if="chat.sending"
            class="chat-page__btn chat-page__btn--cancel"
            @click="chat.cancelStream"
          >
            Cancel
          </button>
          <button
            v-else
            class="chat-page__btn chat-page__btn--submit"
            :disabled="!userInput.trim()"
            @click="submitPrompt"
          >
            Enhance
          </button>
        </div>
      </div>

      <!-- Loading indicator with mascot -->
      <div v-if="chat.sending && !enhancedPrompt" class="chat-page__loading">
        <img :src="mascotSvg" alt="Woof is thinking..." class="chat-page__mascot" />
        <p class="chat-page__loading-text">Woof is enhancing your prompt&hellip;</p>
      </div>

      <!-- Error message -->
      <div v-if="chat.error" class="chat-page__error">
        <p>{{ chat.error }}</p>
      </div>

      <!-- Streamed response -->
      <div
        v-if="enhancedPrompt"
        ref="responseRef"
        class="chat-page__response animate-in"
      >
        <div class="chat-page__response-header">
          <h3 class="chat-page__response-title">Enhanced Prompt</h3>
          <button
            v-if="hasResponse"
            class="chat-page__copy-btn"
            :class="{ 'chat-page__copy-btn--copied': copied }"
            @click="copyToClipboard"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
        <div class="chat-page__response-body">
          <p class="chat-page__response-text">{{ enhancedPrompt }}</p>
          <span v-if="chat.sending" class="chat-page__cursor" />
        </div>
      </div>
    </div>

    <!-- Usage limit modal -->
    <BaseModal v-if="showLimitModal" @close="showLimitModal = false">
      <template #header>
        <h3>Free Limit Reached</h3>
      </template>
      <p>
        You've used all <strong>{{ MAX_PROMPTS }}</strong> free prompt enhancements.
        Sign up for an account to continue enhancing your prompts with Woof.
      </p>
      <template #footer>
        <RouterLink to="/login" class="chat-page__btn chat-page__btn--submit">
          Sign Up
        </RouterLink>
        <button class="chat-page__btn chat-page__btn--cancel" @click="showLimitModal = false">
          Maybe Later
        </button>
      </template>
    </BaseModal>
  </main>
</template>

<style scoped>
.chat-page {
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 3rem 1.5rem;
}

.chat-page__container {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Header ── */
.chat-page__header {
  text-align: center;
}

.chat-page__title {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 900;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.chat-page__subtitle {
  font-family: var(--font-body);
  color: var(--color-text);
  font-size: 1.05rem;
}

/* ── Usage indicator ── */
.chat-page__usage {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chat-page__usage-text {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--wl-warm-gray);
  white-space: nowrap;
}

.chat-page__usage-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.chat-page__usage-fill {
  height: 100%;
  background: var(--wl-gold);
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* ── Input area ── */
.chat-page__input-area {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color 0.2s;
}

.chat-page__input-area:focus-within {
  border-color: var(--wl-navy);
}

.chat-page__textarea {
  width: 100%;
  border: none;
  background: transparent;
  padding: 1.25rem 1.25rem 0.75rem;
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-heading);
  line-height: 1.6;
  resize: vertical;
  min-height: 100px;
}

.chat-page__textarea::placeholder {
  color: var(--wl-warm-gray-light);
}

.chat-page__textarea:focus {
  outline: none;
}

.chat-page__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--color-border);
}

.chat-page__hint {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--wl-warm-gray-light);
}

/* ── Buttons ── */
.chat-page__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.5rem;
  border-radius: var(--radius);
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.2s, color 0.2s, opacity 0.2s;
  text-decoration: none;
}

.chat-page__btn--submit {
  background: var(--wl-navy);
  color: var(--wl-cream);
}

.chat-page__btn--submit:hover:not(:disabled) {
  background: var(--wl-navy-light);
}

.chat-page__btn--submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chat-page__btn--cancel {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border-hover);
}

.chat-page__btn--cancel:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

/* ── Loading indicator ── */
.chat-page__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
}

.chat-page__mascot {
  width: 80px;
  height: auto;
  animation: bob 2s ease-in-out infinite;
}

.chat-page__loading-text {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--wl-warm-gray);
  font-size: 0.9375rem;
}

/* ── Error ── */
.chat-page__error {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
}

/* ── Response ── */
.chat-page__response {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.chat-page__response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.chat-page__response-title {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-heading);
}

.chat-page__copy-btn {
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

.chat-page__copy-btn:hover {
  border-color: var(--wl-navy);
  color: var(--wl-navy);
}

.chat-page__copy-btn--copied {
  border-color: var(--color-success);
  color: var(--color-success);
  background: var(--color-success-bg);
}

.chat-page__response-body {
  padding: 1.25rem;
  position: relative;
}

.chat-page__response-text {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--color-heading);
  white-space: pre-wrap;
}

/* Blinking cursor during streaming */
.chat-page__cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--wl-gold);
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .chat-page {
    padding: 2rem 1rem;
  }

  .chat-page__title {
    font-size: 1.5rem;
  }

  .chat-page__textarea {
    min-height: 80px;
  }

  .chat-page__hint {
    display: none;
  }
}
</style>
