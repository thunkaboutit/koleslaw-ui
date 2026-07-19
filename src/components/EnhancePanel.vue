<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, onBeforeUnmount } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useMarkdown } from '@/composables/useMarkdown'
import PlatformActionBar from '@/components/PlatformActionBar.vue'

const emit = defineEmits<{
  'update:submitting': [value: boolean]
}>()

const chat = useChatStore()
const { renderMarkdown } = useMarkdown()

/* ── Placeholder rotation ── */
const PLACEHOLDERS = [
  'Type something ruff and let Woof polish it.',
  "Paste your prompt here. Woof won't judge… much.",
  'Go ahead, throw Woof a bone. Any prompt will do.',
  'Your prompt called. It wants to be better.',
  "Drop it like it's prompt.",
  'Woof accepts belly rubs and bad prompts.',
  'Don\'t worry, even "make it good" is a starting point.',
  "This cow barks. Your prompt doesn't have to.",
  'Moo? No. Woof? Yes. Prompt? Paste it.',
  'Enter your prompt — Woof will herd it into shape.',
  'You write the draft, Woof writes the craft.',
  'Prompts in, woofed-up results out. Simple as that.',
  'Got a prompt that needs CPR? Woof is on it.',
  'Feed Woof your prompt. Watch it come back golden.',
  'Warning: prompts may come back dramatically better.',
  'One small paste for you, one giant woof for promptkind.',
  "Woof doesn't fetch — Woof enhances.",
  'Your future self will thank you for pasting that prompt.',
  'Half-baked prompt? Woof has the oven ready.',
  'Toss your spaghetti prompt in here. Woof sorts the noodles.',
]
const placeholder = PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]

/* ── Local UI state ── */
const userInput = ref('')
const copied = ref(false)
const showPreview = ref(false)
const thinkingExpanded = ref(false)
const thinkingBodyRef = ref<HTMLElement | null>(null)
const thinkingUserScrolled = ref(false)
const responseRef = ref<HTMLElement | null>(null)
const enhanceTextarea = ref<HTMLTextAreaElement | null>(null)

/* ── File attachments ── */
const fileInputRef = ref<HTMLInputElement | null>(null)
const attachedFiles = ref<File[]>([])
const filePreviews = ref<string[]>([])
// Block compressed/archive files only — everything else is accepted
const BLOCKED_EXTENSIONS = new Set([
  '.zip',
  '.gz',
  '.tar',
  '.tgz',
  '.bz2',
  '.xz',
  '.7z',
  '.rar',
  '.zst',
  '.lz',
  '.lz4',
  '.cab',
  '.iso',
  '.dmg',
  '.jar',
  '.war',
  '.ear',
])

function openFilePicker() {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files) return
  for (const file of Array.from(input.files)) {
    if (attachedFiles.value.length >= 5) break
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (BLOCKED_EXTENSIONS.has(ext)) {
      chat.error = `Compressed/archive files (${ext}) are not supported.`
      continue
    }
    attachedFiles.value.push(file)
    if (file.type.startsWith('image/')) {
      filePreviews.value.push(URL.createObjectURL(file))
    } else {
      filePreviews.value.push('')
    }
  }
  input.value = ''
}

function removeFile(index: number) {
  const preview = filePreviews.value[index]
  if (preview) URL.revokeObjectURL(preview)
  attachedFiles.value.splice(index, 1)
  filePreviews.value.splice(index, 1)
}

function clearFiles() {
  filePreviews.value.forEach((url) => {
    if (url) URL.revokeObjectURL(url)
  })
  attachedFiles.value = []
  filePreviews.value = []
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

onBeforeUnmount(() => clearFiles())

/* ── Submission & animation state ── */
const isSubmitting = ref(false)
const responseText = ref('')

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

const enhancedPrompt = computed(() => cleanResponse(chat.streamingContent || responseText.value))
const hasResponse = computed(() => responseText.value.length > 0 && !chat.sending)
const renderedResponse = computed(() => renderMarkdown(enhancedPrompt.value))
const renderedPreview = computed(() => renderMarkdown(userInput.value))

/* ── Thinking block ── */
const showThinkingBlock = computed(
  () => !!(chat.isThinking || chat.streamingThinking || chat.lastThinkingContent),
)
const showWaitingSpinner = computed(
  () => chat.sending && !showThinkingBlock.value && !enhancedPrompt.value,
)
const thinkingContent = computed(() => chat.streamingThinking || chat.lastThinkingContent)
const renderedThinking = computed(() =>
  thinkingContent.value ? renderMarkdown(thinkingContent.value) : '',
)

/* Notify parent when submitting state changes */
watch(isSubmitting, (val) => emit('update:submitting', val))

function autoResize() {
  const el = enhanceTextarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

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

/* Auto-expand thinking block when thinking starts */
watch(
  () => chat.isThinking,
  (thinking) => {
    if (thinking) {
      thinkingExpanded.value = true
      thinkingUserScrolled.value = false
    }
  },
)

/* Auto-scroll thinking body as streamed thinking arrives */
watch(
  () => chat.streamingThinking,
  () => {
    if (chat.isThinking && !thinkingUserScrolled.value) {
      nextTick(() => {
        const el = thinkingBodyRef.value
        if (el) el.scrollTop = el.scrollHeight
      })
    }
  },
)

/* Detect user scrolling up in the thinking body */
function onThinkingScroll() {
  const el = thinkingBodyRef.value
  if (!el) return
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20
  thinkingUserScrolled.value = !atBottom
}

/* Auto-collapse thinking block when content starts streaming */
watch(
  () => chat.streamingContent,
  (content) => {
    if (content && !chat.isThinking) thinkingExpanded.value = false
  },
)

/* Capture completed response, or reset on error/cancel */
watch(
  () => chat.sending,
  (sending, wasSending) => {
    if (wasSending && !sending) {
      if (chat.error) {
        isSubmitting.value = false
      } else {
        const last = chat.messages[chat.messages.length - 1]
        if (last?.role === 'assistant') {
          responseText.value = last.content
        } else {
          isSubmitting.value = false
        }
      }
    }
  },
)

const ENHANCE_PREFIX_RE =
  /^(enhance|improve|rewrite|refine|rephrase|fix|optimize|polish|upgrade|rework)\b/i

function prefixPrompt(text: string): string {
  if (ENHANCE_PREFIX_RE.test(text)) return text
  return `Enhance this prompt:\n\n${text}`
}

async function submitPrompt() {
  const text = userInput.value.trim()
  if (!text || chat.sending) return
  // Snapshot files for this request — chips stay visible until submit completes
  const files = attachedFiles.value.length ? [...attachedFiles.value] : undefined

  responseText.value = ''
  copied.value = false
  chat.error = null
  isSubmitting.value = true

  nextTick(() => enhanceTextarea.value?.focus())

  await chat.send(prefixPrompt(text), files)
}

function clearEnhancement() {
  userInput.value = ''
  responseText.value = ''
  copied.value = false
  isSubmitting.value = false
  thinkingExpanded.value = false
  chat.clearChat()
  clearFiles()
  nextTick(() => {
    autoResize()
    enhanceTextarea.value?.focus()
  })
}

/* Reset local state when the chat store is cleared externally (e.g. navbar "New Chat" link) */
watch(
  () => chat.messages.length,
  (len) => {
    if (len === 0 && responseText.value) {
      userInput.value = ''
      responseText.value = ''
      copied.value = false
      isSubmitting.value = false
      thinkingExpanded.value = false
      clearFiles()
      nextTick(() => autoResize())
    }
  },
)

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

/* ── Voice input ── */
const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition

const isRecording = ref(false)
const speechSupported = !!SpeechRecognitionCtor
let recognition: SpeechRecognition | null = null

function toggleRecording() {
  if (isRecording.value) {
    recognition?.stop()
    return
  }

  if (!SpeechRecognitionCtor) {
    chat.error = 'Speech recognition is not supported in this browser.'
    return
  }

  const rec = new SpeechRecognitionCtor()
  rec.continuous = true
  rec.interimResults = false
  rec.lang = navigator.language || 'en-US'

  rec.onresult = (event: SpeechRecognitionEvent) => {
    const last = event.results[event.results.length - 1]
    if (last?.isFinal) {
      const transcript = last[0]?.transcript.trim()
      if (transcript) {
        userInput.value +=
          (userInput.value && !userInput.value.endsWith(' ') ? ' ' : '') + transcript
        autoResize()
      }
    }
  }

  rec.onend = () => {
    isRecording.value = false
    recognition = null
  }

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    isRecording.value = false
    recognition = null
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      chat.error =
        'Microphone access was denied. Please allow microphone access in your browser settings.'
    } else if (event.error !== 'aborted') {
      chat.error = `Speech recognition error: ${event.error}`
    }
  }

  recognition = rec
  rec.start()
  isRecording.value = true
}

onUnmounted(() => {
  recognition?.stop()
})
</script>

<template>
  <div class="enhance__container">
    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="enhance__file-input"
      @change="handleFileSelect"
    />

    <!-- Input area -->
    <div class="enhance__input-area" :class="{ 'enhance__input-area--expanded': isSubmitting }">
      <!-- Markdown preview (read-only) -->
      <div
        v-if="showPreview && userInput"
        class="enhance__preview markdown-body"
        v-html="renderedPreview"
      />
      <!-- Raw textarea -->
      <textarea
        v-show="!showPreview"
        ref="enhanceTextarea"
        v-model="userInput"
        class="enhance__input"
        :placeholder="placeholder"
        rows="2"
        :disabled="chat.sending"
        aria-label="Prompt input"
        @input="autoResize"
        @keydown.enter.exact.prevent="submitPrompt"
      />

      <!-- Attached file previews -->
      <div v-if="attachedFiles.length" class="enhance__files">
        <div v-for="(file, i) in attachedFiles" :key="i" class="enhance__file-chip">
          <img
            v-if="filePreviews[i]"
            :src="filePreviews[i]"
            :alt="file.name"
            class="enhance__file-thumb"
          />
          <span v-else class="enhance__file-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"
                stroke="currentColor"
                stroke-width="1.2"
                fill="none"
              />
              <path
                d="M9 1v4h4"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linejoin="round"
                fill="none"
              />
            </svg>
          </span>
          <span class="enhance__file-name">{{ file.name }}</span>
          <span class="enhance__file-size">{{ formatFileSize(file.size) }}</span>
          <button class="enhance__file-remove" aria-label="Remove file" @click="removeFile(i)">
            &times;
          </button>
        </div>
      </div>

      <div class="enhance__toolbar">
        <div class="enhance__toolbar-left">
          <button
            class="enhance__tool-btn"
            :class="{ 'enhance__tool-btn--active': attachedFiles.length > 0 }"
            :disabled="chat.sending || attachedFiles.length >= 5"
            aria-label="Attach file"
            @click="openFilePicker"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 4v12M4 10h12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <button
            class="enhance__tool-btn"
            :class="{ 'enhance__tool-btn--active': showPreview }"
            :aria-label="showPreview ? 'Switch to plain text' : 'Switch to markdown preview'"
            :aria-pressed="showPreview"
            @click="showPreview = !showPreview"
          >
            <svg v-if="!showPreview" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"
                stroke="currentColor"
                stroke-width="1.5"
                fill="none"
              />
              <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5" fill="none" />
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"
                stroke="currentColor"
                stroke-width="1.5"
                fill="none"
              />
              <circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5" fill="none" />
              <path
                d="M3 17L17 3"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <span class="enhance__view-label">{{ showPreview ? 'Markdown' : 'Plain text' }}</span>
        </div>
        <div class="enhance__toolbar-right">
          <button
            v-if="speechSupported"
            class="enhance__tool-btn"
            :class="{ 'enhance__tool-btn--recording': isRecording }"
            :aria-label="isRecording ? 'Stop recording' : 'Voice input'"
            :aria-pressed="isRecording"
            :disabled="chat.sending"
            @click="toggleRecording"
          >
            <span v-if="isRecording" class="enhance__rec-dot" aria-hidden="true" />
            <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect
                x="7"
                y="2"
                width="6"
                height="10"
                rx="3"
                stroke="currentColor"
                stroke-width="1.5"
                fill="none"
              />
              <path
                d="M4 10a6 6 0 0012 0"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                fill="none"
              />
              <path d="M10 16v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
          <button
            v-if="chat.sending"
            class="enhance__send enhance__send--cancel"
            @click="chat.cancelStream"
            aria-label="Cancel"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="4" y="4" width="12" height="12" rx="2" fill="currentColor" />
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
              <path
                d="M3 10h14M11 4l6 6-6 6"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Waiting spinner (shown after submit, before any stream content arrives) -->
    <div v-if="showWaitingSpinner" class="enhance__waiting" role="status" aria-live="polite">
      <span class="enhance__waiting-spinner" aria-hidden="true" />
      <span class="enhance__waiting-text">Woof is fetching&hellip;</span>
    </div>

    <!-- Thinking block (collapsible, streamed) -->
    <div
      v-if="showThinkingBlock"
      class="thinking-block"
      role="status"
      aria-label="Model thinking process"
    >
      <button
        class="thinking-block__header"
        :aria-expanded="thinkingExpanded"
        @click="thinkingExpanded = !thinkingExpanded"
      >
        <span v-if="chat.isThinking" class="thinking-block__spinner" aria-hidden="true" />
        <span
          v-else
          class="thinking-block__chevron"
          :class="{ 'thinking-block__chevron--open': thinkingExpanded }"
          aria-hidden="true"
          >&#9654;</span
        >
        <span class="thinking-block__text">
          {{ chat.isThinking ? 'Thinking\u2026' : 'Thought process' }}
        </span>
      </button>
      <div
        v-if="thinkingExpanded && thinkingContent"
        ref="thinkingBodyRef"
        class="thinking-block__body markdown-body"
        v-html="renderedThinking"
        @scroll="onThinkingScroll"
      />
    </div>

    <!-- Error message -->
    <div v-if="chat.error" class="enhance__error" role="alert">
      <p>{{ chat.error }}</p>
    </div>

    <!-- Streaming / completed response -->
    <div
      v-if="enhancedPrompt"
      ref="responseRef"
      class="enhance__response animate-in"
      aria-label="Enhanced prompt result"
      aria-live="polite"
    >
      <div class="enhance__response-header">
        <h3 class="enhance__response-title">Enhanced Prompt</h3>
        <div v-if="hasResponse" class="enhance__response-actions">
          <button class="enhance__clear-btn" @click="clearEnhancement">Clear</button>
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
        <div class="response-text markdown-body" v-html="renderedResponse" />
        <span v-if="chat.sending" class="enhance__cursor" />
      </div>
      <PlatformActionBar
        v-if="hasResponse"
        :enhanced-prompt="enhancedPrompt"
        @clear="clearEnhancement"
      />
    </div>
  </div>
</template>

<style scoped>
.enhance__container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.enhance__input-area {
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 1.25rem;
  padding: 0.875rem 1rem 0.5rem;
  transition:
    border-color 0.2s,
    box-shadow 0.2s,
    flex 0.4s ease;
}

.enhance__input-area:focus-within {
  border-color: var(--wl-navy);
  box-shadow: 0 0 0 3px rgba(26, 39, 68, 0.08);
}

.enhance__input-area--expanded {
  flex: none;
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
  transition:
    color 0.2s,
    background 0.2s;
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
  transition:
    background 0.2s,
    opacity 0.2s;
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

/* ─── File attachments ─── */
.enhance__file-input {
  display: none;
}

.enhance__files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.enhance__file-chip {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: rgba(26, 39, 68, 0.05);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.75rem;
  max-width: 200px;
}

.enhance__file-thumb {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border-radius: 3px;
  flex-shrink: 0;
}

.enhance__file-icon {
  flex-shrink: 0;
  color: var(--wl-warm-gray);
}

.enhance__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-heading);
  font-family: var(--font-body);
}

.enhance__file-size {
  color: var(--wl-warm-gray);
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
}

.enhance__file-remove {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  background: none;
  color: var(--wl-warm-gray);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 50%;
  transition:
    color 0.2s,
    background 0.2s;
}

.enhance__file-remove:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

/* ─── Waiting spinner ─── */
.enhance__waiting {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.enhance__waiting-spinner {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-border);
  border-top-color: var(--wl-navy);
  border-right-color: var(--wl-gold);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.enhance__waiting-text {
  font-family: var(--font-body);
  font-style: italic;
  font-size: 0.875rem;
  color: var(--wl-warm-gray);
}

/* ─── Thinking Block ─── */
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

/* ─── Error ─── */
.enhance__error {
  background: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
}

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

/* ─── Markdown body (v-html) ─── */
.markdown-body {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--color-heading);
  word-wrap: break-word;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  font-family: var(--font-heading);
  margin: 1em 0 0.5em;
  line-height: 1.3;
}

.markdown-body :deep(h1) {
  font-size: 1.5rem;
}
.markdown-body :deep(h2) {
  font-size: 1.25rem;
}
.markdown-body :deep(h3) {
  font-size: 1.1rem;
}

.markdown-body :deep(p) {
  margin: 0.5em 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.markdown-body :deep(li + li) {
  margin-top: 0.25em;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--wl-gold);
  margin: 0.75em 0;
  padding: 0.25em 1em;
  color: var(--wl-warm-gray);
}

.markdown-body :deep(a) {
  color: var(--wl-navy);
  text-decoration: underline;
}

.markdown-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: rgba(26, 39, 68, 0.06);
  padding: 0.15em 0.35em;
  border-radius: 3px;
}

.markdown-body :deep(pre.hljs) {
  background: rgba(26, 39, 68, 0.04);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem;
  overflow-x: auto;
  margin: 0.75em 0;
}

.markdown-body :deep(pre.hljs code) {
  background: none;
  padding: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1em 0;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.75em 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--color-border);
  padding: 0.4em 0.75em;
  text-align: left;
}

.markdown-body :deep(th) {
  background: rgba(26, 39, 68, 0.04);
  font-weight: 700;
}

/* ─── Input preview ─── */
.enhance__preview {
  min-height: 2.5em;
  max-height: 300px;
  overflow-y: auto;
  padding: 0;
}

.enhance__tool-btn--active {
  color: var(--wl-navy);
  background: rgba(26, 39, 68, 0.08);
}

.enhance__tool-btn--recording {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

.enhance__rec-dot {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-danger);
  animation: pulse-rec 1.2s ease-in-out infinite;
}

@keyframes pulse-rec {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.85);
  }
}

.enhance__view-label {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--wl-warm-gray);
  user-select: none;
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
