<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue'
import mascotSrc from '@/assets/koleslaw-logo-mascot-woof.svg'
import logoSrc from '@/assets/koleslaw-logo-woof-bubble.svg'
import { useChatStore } from '@/stores/chat'
import BaseModal from '@/components/BaseModal.vue'

const chat = useChatStore()

/* ── Prompt usage tracking ── */
const PROMPT_COUNT_KEY = 'koleslaw-prompt-count'
const MAX_PROMPTS = 3
const promptCount = ref(parseInt(localStorage.getItem(PROMPT_COUNT_KEY) ?? '0', 10))
const showLimitModal = ref(false)

/* ── Local UI state ── */
const userInput = ref('')
const copied = ref(false)
const responseRef = ref<HTMLElement | null>(null)
const enhanceTextarea = ref<HTMLTextAreaElement | null>(null)

function autoResize() {
  const el = enhanceTextarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
const lastEnhancedPrompt = ref('')

const enhancedPrompt = computed(
  () => chat.streamingContent || lastEnhancedPrompt.value,
)
const hasResponse = computed(() => lastEnhancedPrompt.value.length > 0 && !chat.sending)
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

/* Capture completed response and increment counter */
watch(
  () => chat.sending,
  (sending, wasSending) => {
    if (wasSending && !sending) {
      const lastAssistant = [...chat.messages].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant) {
        lastEnhancedPrompt.value = lastAssistant.content
        promptCount.value++
        localStorage.setItem(PROMPT_COUNT_KEY, String(promptCount.value))
      }
    }
  },
)

async function submitPrompt() {
  const text = userInput.value.trim()
  if (!text || chat.sending) return
  if (limitReached.value) {
    showLimitModal.value = true
    return
  }
  lastEnhancedPrompt.value = ''
  copied.value = false
  await chat.send(text)
}

async function copyToClipboard() {
  const text = enhancedPrompt.value
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
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

/* ── Section reveal animation ── */
const sections = ref<HTMLElement[]>([])
const revealed = ref(new Set<number>())

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = sections.value.indexOf(entry.target as HTMLElement)
          if (idx !== -1) revealed.value.add(idx)
        }
      })
    },
    { threshold: 0.1 },
  )
  sections.value.forEach((el) => {
    if (el) observer.observe(el)
  })
})

function setSectionRef(idx: number) {
  return (el: unknown) => {
    if (el instanceof HTMLElement) sections.value[idx] = el
  }
}
</script>

<template>
  <div class="home">
    <!-- Hero Section -->
    <section
      :ref="setSectionRef(0)"
      class="hero"
      :class="{ 'animate-in': revealed.has(0) }"
    >
      <div class="hero__inner">
        <div class="hero__mascot-area">
          <img
            :src="mascotSrc"
            alt="Koleslaw mascot — a cartoon cow saying Woof?"
            class="hero__mascot"
          />
          <!-- Floating code bracket icons -->
          <span class="floating-icon floating-icon--1" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <text x="2" y="22" font-family="var(--font-mono)" font-size="22" fill="#1a2744" opacity="0.6">&lt;/&gt;</text>
            </svg>
          </span>
          <span class="floating-icon floating-icon--2" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <text x="1" y="18" font-family="var(--font-mono)" font-size="18" fill="#c9a84c" opacity="0.7">&lt;/&gt;</text>
            </svg>
          </span>
          <span class="floating-icon floating-icon--3" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <text x="1" y="15" font-family="var(--font-mono)" font-size="15" fill="#1a2744" opacity="0.5">&lt;/&gt;</text>
            </svg>
          </span>
          <span class="floating-icon floating-icon--4" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <text x="1" y="17" font-family="var(--font-mono)" font-size="17" fill="#5a6340" opacity="0.6">&lt;/&gt;</text>
            </svg>
          </span>
          <!-- Sparkle decorations -->
          <span class="sparkle sparkle--1" aria-hidden="true">+</span>
          <span class="sparkle sparkle--2" aria-hidden="true">*</span>
          <span class="sparkle sparkle--3" aria-hidden="true">+</span>
        </div>
        <div class="hero__content">
          <h1 class="hero__title">
            Stop Re-prompting.<br />
            Start One-shotting.
          </h1>
          <p class="hero__subtitle">
            Koleslaw takes your rough prompt and turns it into exactly what AI
            needs to hear. Better input, better output — it's not rocket science.
            It's a barking cow.
          </p>
          <div class="hero__flow">
            <div class="flow-step">
              <span class="flow-step__icon flow-step__icon--rough" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="3" y="5" width="22" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <path d="M8 11h12M8 15h8M8 19h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>
                </svg>
              </span>
              <span class="flow-step__label">Your prompt</span>
            </div>
            <span class="flow-arrow" aria-hidden="true">
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
                <path d="M0 7h20M16 1l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="flow-step">
              <span class="flow-step__icon flow-step__icon--magic" aria-hidden="true">
                <img :src="logoSrc" alt="" class="flow-step__logo" />
              </span>
              <span class="flow-step__label">Woof magic</span>
            </div>
            <span class="flow-arrow" aria-hidden="true">
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
                <path d="M0 7h20M16 1l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="flow-step">
              <span class="flow-step__icon flow-step__icon--enhanced" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="3" y="5" width="22" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <path d="M8 11h12M8 15h10M8 19h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M19 3l2 2-2 2" stroke="var(--wl-gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M23 7l1 1-1 1" stroke="var(--wl-gold)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="flow-step__label">Woofed up prompt</span>
            </div>
            <span class="flow-arrow" aria-hidden="true">
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
                <path d="M0 7h20M16 1l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="flow-step">
              <span class="flow-step__icon flow-step__icon--paste" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="11" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <path d="M9 14l3 3 7-7" stroke="var(--wl-gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="flow-step__label">Paste anywhere</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Enhance Section -->
    <section
      :ref="setSectionRef(1)"
      class="enhance"
      :class="{ 'animate-in delay-1': revealed.has(1) }"
    >
      <div class="enhance__container">
        <!-- Usage indicator -->
        <div class="enhance__usage">
          <span class="enhance__usage-text">
            {{ promptCount }} / {{ MAX_PROMPTS }} free prompts used
          </span>
          <div class="enhance__usage-bar">
            <div
              class="enhance__usage-fill"
              :style="{ width: `${(promptCount / MAX_PROMPTS) * 100}%` }"
            />
          </div>
        </div>

        <!-- Input area -->
        <div class="enhance__input-area">
          <textarea
            ref="enhanceTextarea"
            v-model="userInput"
            class="enhance__input"
            placeholder="How can I help you today?"
            rows="2"
            :disabled="chat.sending"
            @input="autoResize"
            @keydown.enter.exact.prevent="submitPrompt"
          />
          <div class="enhance__toolbar">
            <div class="enhance__toolbar-left">
              <button class="enhance__tool-btn" aria-label="Attach file">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="enhance__toolbar-right">
              <button class="enhance__tool-btn" aria-label="Voice input">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <path d="M4 10a6 6 0 0012 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                  <path d="M10 16v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
              <button
                v-if="chat.sending"
                class="enhance__send enhance__send--cancel"
                @click="chat.cancelStream"
                aria-label="Cancel"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="4" y="4" width="12" height="12" rx="2" fill="currentColor"/>
                </svg>
              </button>
              <button
                v-else
                class="enhance__send"
                :disabled="!userInput.trim()"
                @click="submitPrompt"
                aria-label="Enhance"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 10h14M11 4l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="chat.sending && !enhancedPrompt" class="enhance__loading">
          <img :src="mascotSrc" alt="Woof is thinking..." class="enhance__mascot" />
          <p class="enhance__loading-text">Woof is enhancing your prompt&hellip;</p>
        </div>

        <!-- Error message -->
        <div v-if="chat.error" class="enhance__error">
          <p>{{ chat.error }}</p>
        </div>

        <!-- Streamed response -->
        <div
          v-if="enhancedPrompt"
          ref="responseRef"
          class="enhance__response animate-in"
        >
          <div class="enhance__response-header">
            <h3 class="enhance__response-title">Enhanced Prompt</h3>
            <button
              v-if="hasResponse"
              class="enhance__copy-btn"
              :class="{ 'enhance__copy-btn--copied': copied }"
              @click="copyToClipboard"
            >
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <div class="enhance__response-body">
            <p class="enhance__response-text">{{ enhancedPrompt }}</p>
            <span v-if="chat.sending" class="enhance__cursor" />
          </div>
        </div>
      </div>
    </section>

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
        <RouterLink to="/login" class="enhance__btn enhance__btn--submit">
          Sign Up
        </RouterLink>
        <button class="enhance__btn enhance__btn--cancel" @click="showLimitModal = false">
          Maybe Later
        </button>
      </template>
    </BaseModal>

    <!-- Footer -->
    <footer
      :ref="setSectionRef(2)"
      class="footer"
      :class="{ 'animate-in delay-2': revealed.has(2) }"
    >
      <div class="footer__inner">
        <div class="footer__links">
          <a href="#terms" class="footer__link">Terms of Service</a>
          <a href="#privacy" class="footer__link">Privacy Policy</a>
          <a href="#contact" class="footer__link">Contact Us</a>
        </div>
        <div class="footer__right">
          <span class="footer__copy">Copyright &copy; 2022. All Koleslaw</span>
          <img :src="logoSrc" alt="Koleslaw logo" class="footer__logo" />
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.spacer {
  flex-grow: 1;
}

.home {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ─── Hero ─── */
.hero {
  padding: 3rem 0 2rem;
}

.hero__inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.hero__mascot-area {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero__mascot {
  width: 100%;
  max-width: 380px;
  height: auto;
  position: relative;
  z-index: 1;
}

/* Floating code bracket icons */
.floating-icon {
  position: absolute;
  z-index: 2;
  animation: bob 3s ease-in-out infinite;
}

.floating-icon--1 {
  top: 5%;
  right: 5%;
  animation-delay: 0s;
}

.floating-icon--2 {
  bottom: 20%;
  right: 0;
  animation-delay: 0.7s;
}

.floating-icon--3 {
  top: 15%;
  left: 5%;
  animation-delay: 1.4s;
}

.floating-icon--4 {
  bottom: 10%;
  left: 10%;
  animation-delay: 2.1s;
}

/* Sparkle decorations */
.sparkle {
  position: absolute;
  z-index: 2;
  font-size: 1rem;
  color: var(--wl-gold);
  font-weight: 700;
  animation: bob 2.5s ease-in-out infinite;
  opacity: 0.7;
}

.sparkle--1 {
  top: 2%;
  right: 20%;
  animation-delay: 0.3s;
}

.sparkle--2 {
  top: 40%;
  right: -2%;
  animation-delay: 1s;
  font-size: 1.2rem;
}

.sparkle--3 {
  bottom: 5%;
  left: 2%;
  animation-delay: 1.8s;
}

.hero__title {
  font-size: 2.75rem;
  font-weight: 900;
  line-height: 1.15;
  margin-bottom: 1.25rem;
  color: var(--wl-black);
}

.hero__subtitle {
  font-size: 1.0625rem;
  line-height: 1.7;
  color: var(--color-text);
  margin-bottom: 2rem;
  max-width: 440px;
}

/* ─── Process Flow ─── */
.hero__flow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  text-align: center;
}

.flow-step__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  color: var(--wl-navy);
}

.flow-step__icon--rough {
  background: var(--color-border);
  color: var(--wl-warm-gray);
}

.flow-step__icon--magic {
  background: rgba(201, 168, 76, 0.12);
  border-radius: 12px;
}

.flow-step__logo {
  width: 32px;
  height: 32px;
}

.flow-step__icon--enhanced {
  background: rgba(26, 39, 68, 0.08);
  color: var(--wl-navy);
}

.flow-step__icon--paste {
  background: rgba(201, 168, 76, 0.12);
  color: var(--wl-navy);
}

.flow-step__label {
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--wl-warm-gray);
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.flow-arrow {
  color: var(--color-border-hover);
  flex-shrink: 0;
  margin-bottom: 1.25rem;
}

/* ─── Enhance ─── */
.enhance {
  padding: 2rem 0;
}

.enhance__container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.enhance__usage {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.enhance__usage-text {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  color: var(--wl-warm-gray);
  white-space: nowrap;
}

.enhance__usage-bar {
  flex: 1;
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.enhance__usage-fill {
  height: 100%;
  background: var(--wl-gold);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.enhance__input-area {
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 1.25rem;
  padding: 0.875rem 1rem 0.5rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.enhance__input-area:focus-within {
  border-color: var(--wl-navy);
  box-shadow: 0 0 0 3px rgba(26, 39, 68, 0.08);
}

.enhance__input {
  width: 100%;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-heading);
  line-height: 1.5;
  resize: none;
  overflow: hidden;
  padding: 0;
}

.enhance__input::placeholder {
  color: var(--wl-warm-gray-light);
}

.enhance__input:focus {
  outline: none;
}

.enhance__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.5rem;
}

.enhance__toolbar-left,
.enhance__toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.enhance__tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--wl-warm-gray);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.enhance__tool-btn:hover {
  color: var(--color-heading);
  background: var(--color-border);
}

.enhance__send {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--wl-navy);
  color: var(--wl-cream);
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.enhance__send:hover:not(:disabled) {
  background: var(--wl-navy-light);
}

.enhance__send:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.enhance__send--cancel {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border-hover);
}

.enhance__send--cancel:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.enhance__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
}

.enhance__mascot {
  width: 80px;
  height: auto;
  animation: bob 2s ease-in-out infinite;
}

.enhance__loading-text {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--wl-warm-gray);
  font-size: 0.9375rem;
}

.enhance__error {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
}

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

.enhance__copy-btn {
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

.enhance__response-text {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--color-heading);
  white-space: pre-wrap;
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
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ─── Footer ─── */
.footer {
  margin-top: auto;
  padding: 1.5rem 0 2rem;
  border-top: 1px solid var(--color-border-hover);
}

.footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.footer__links {
  display: flex;
  gap: 1.5rem;
}

.footer__link {
  color: var(--color-text);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.footer__link:hover {
  color: var(--color-heading);
}

.footer__right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.footer__copy {
  font-size: 0.875rem;
  color: var(--wl-warm-gray);
}

.footer__logo {
  height: 36px;
  width: auto;
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .home {
    padding: 0 1rem;
  }

  .hero__inner {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero__mascot-area {
    order: -1;
  }

  .hero__mascot {
    max-width: 220px;
  }

  .hero__subtitle {
    margin-left: auto;
    margin-right: auto;
  }

  .hero__flow {
    justify-content: center;
    flex-wrap: wrap;
  }

  .hero__title {
    font-size: 2rem;
  }

  .footer__inner {
    flex-direction: column;
    text-align: center;
  }

  .footer__links {
    justify-content: center;
  }

  .footer__right {
    justify-content: center;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .hero__title {
    font-size: 2.25rem;
  }

  .hero__mascot {
    max-width: 300px;
  }
}
</style>
