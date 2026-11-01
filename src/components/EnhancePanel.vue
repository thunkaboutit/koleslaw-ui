<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, onBeforeUnmount } from 'vue'
import { useSessionStore } from '@/stores/session'
import { useMarkdown } from '@/composables/useMarkdown'
import ChatMessage from '@/components/ChatMessage.vue'
import EnhancedPromptCard from '@/components/EnhancedPromptCard.vue'
import PlaygroundKeyPicker from '@/components/PlaygroundKeyPicker.vue'
import ThinkingBlock from '@/components/ThinkingBlock.vue'

/* The playground: the session transcript and the composer.  The
   conversation itself lives in the session store. */

const emit = defineEmits<{
  'update:submitting': [value: boolean]
}>()

const session = useSessionStore()
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
const REPLY_PLACEHOLDER = 'Answer Woof, or ask for changes.'

/* ── Local UI state ── */
const showPreview = ref(false)
const endRef = ref<HTMLElement | null>(null)
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
      session.error = `Compressed/archive files (${ext}) are not supported.`
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

/* ── Transcript ── */
const hasTurns = computed(() => session.turns.length > 0)
const renderedPreview = computed(() => renderMarkdown(session.draft))
const composerPlaceholder = computed(() =>
  session.status === 'awaiting_reply' ? REPLY_PLACEHOLDER : placeholder,
)
const sendLabel = computed(() => (session.status === 'awaiting_reply' ? 'Send reply' : 'Enhance'))
const showWaitingSpinner = computed(() => {
  const turn = session.lastAssistant
  return session.status === 'streaming' && !!turn && !turn.text && !turn.thinking
})
const banner = computed(() => {
  if (session.status === 'expired') return 'This chat expired. Start a new chat to keep going.'
  if (session.status === 'done') {
    return (
      session.notice ?? 'That was the last turn for this chat. Start a new chat for another prompt.'
    )
  }
  return null
})

/* Notify parent when the playground leaves or returns to its empty state */
watch(hasTurns, (val) => emit('update:submitting', val), { immediate: true })

function autoResize() {
  const el = enhanceTextarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/* The store clears the draft on send and restores it on a discarded turn */
watch(
  () => session.draft,
  () => nextTick(autoResize),
)

/* Auto-scroll as streamed content arrives */
watch(
  () => session.lastAssistant?.text,
  () => {
    if (session.status === 'streaming') {
      nextTick(() => endRef.value?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
    }
  },
)

async function submitPrompt() {
  if (!session.canSend || !session.draft.trim()) return
  // Snapshot files for this request; chips stay visible until the turn ends
  const files = attachedFiles.value.length ? [...attachedFiles.value] : []
  nextTick(() => enhanceTextarea.value?.focus())
  await session.send(files)
  if (session.status !== 'idle') clearFiles()
}

function newChat() {
  showPreview.value = false
  session.newChat()
  clearFiles()
  nextTick(() => enhanceTextarea.value?.focus())
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
    session.error = 'Speech recognition is not supported in this browser.'
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
        session.draft += (session.draft && !session.draft.endsWith(' ') ? ' ' : '') + transcript
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
      session.error =
        'Microphone access was denied. Please allow microphone access in your browser settings.'
    } else if (event.error !== 'aborted') {
      session.error = `Speech recognition error: ${event.error}`
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
    <!-- Signed-in users pick which of their API keys the playground uses -->
    <PlaygroundKeyPicker class="enhance__key-picker" />

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      class="enhance__file-input"
      @change="handleFileSelect"
    />

    <!-- Transcript: one entry per user turn and per assistant turn -->
    <div v-if="hasTurns" class="enhance__transcript" role="log">
      <template v-for="turn in session.turns" :key="turn.id">
        <ChatMessage v-if="turn.role === 'user'" role="user" :content="turn.content" markdown />
        <template v-else>
          <ThinkingBlock
            v-if="turn.thinking || turn.thinkingActive"
            :content="turn.thinking"
            :active="turn.thinkingActive"
            :answered="!!turn.text"
          />
          <ChatMessage
            v-if="turn.kind === 'question'"
            class="enhance__question"
            role="assistant"
            :content="turn.text"
            markdown
          />
          <EnhancedPromptCard
            v-else
            :text="turn.text"
            :streaming="turn.kind === null"
            @clear="newChat"
          />
        </template>
      </template>

      <!-- Waiting spinner (after send, before any stream content arrives) -->
      <div v-if="showWaitingSpinner" class="enhance__waiting" role="status" aria-live="polite">
        <span class="enhance__waiting-spinner" aria-hidden="true" />
        <span class="enhance__waiting-text">Woof is fetching&hellip;</span>
      </div>
      <div ref="endRef" />
    </div>

    <!-- Error message -->
    <div v-if="session.error" class="enhance__error" role="alert">
      <p>{{ session.error }}</p>
    </div>

    <!-- Notice (an empty turn) while the chat can go on -->
    <div v-if="session.notice && !banner" class="enhance__notice" role="status">
      <p>{{ session.notice }}</p>
    </div>

    <!-- The chat cannot go on: expired, full, or one-shot answered -->
    <div v-if="banner" class="enhance__banner" role="status">
      <p>{{ banner }}</p>
      <button class="enhance__text-btn" @click="newChat">New chat</button>
    </div>

    <!-- Input area -->
    <div
      v-if="session.status !== 'expired' && session.status !== 'done'"
      class="enhance__input-area"
      :class="{ 'enhance__input-area--expanded': hasTurns }"
    >
      <!-- Markdown preview (read-only) -->
      <div
        v-if="showPreview && session.draft"
        class="enhance__preview markdown-body"
        v-html="renderedPreview"
      />
      <!-- Raw textarea -->
      <textarea
        v-show="!showPreview"
        ref="enhanceTextarea"
        v-model="session.draft"
        class="enhance__input"
        :placeholder="composerPlaceholder"
        rows="2"
        :disabled="!session.canSend"
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
            :disabled="!session.canAttach || attachedFiles.length >= 5"
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
            :disabled="!session.canSend"
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
          <button v-if="session.canFinalize" class="enhance__text-btn" @click="session.finalize()">
            Just write it
          </button>
          <button
            v-if="session.status === 'streaming'"
            class="enhance__send enhance__send--cancel"
            @click="session.cancel"
            aria-label="Cancel"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="4" y="4" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          </button>
          <button
            v-else
            class="enhance__send"
            :disabled="!session.canSend || !session.draft.trim()"
            @click="submitPrompt"
            :aria-label="sendLabel"
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
  </div>
</template>

<style scoped>
.enhance__container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.enhance__key-picker {
  align-self: flex-end;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ─── Transcript ─── */
.enhance__transcript {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

/* ─── Notice and banner ─── */
.enhance__notice,
.enhance__banner {
  background: var(--color-card);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
}

.enhance__banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.enhance__text-btn {
  flex-shrink: 0;
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
    color 0.2s;
}

.enhance__text-btn:hover {
  border-color: var(--wl-navy);
  color: var(--wl-navy);
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
</style>
