import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ChatMessage } from '@/api/types'
import { sendChatStream, sendChatStreamWithFiles } from '@/api/chat'

const STORAGE_KEY = 'koleslaw-chat-history'
const MAX_MESSAGES = 100

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as ChatMessage[]
  } catch {
    // corrupted storage — start fresh
  }
  return []
}

function saveMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)))
  } catch {
    // storage full — silently fail
  }
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>(loadMessages())
  const sending = ref(false)
  const error = ref<string | null>(null)
  const streamingContent = ref('')
  let abortController: AbortController | null = null

  const hasMessages = computed(() => messages.value.length > 0)

  async function send(content: string, files?: File[]) {
    if (!content.trim() || sending.value) return

    error.value = null
    const userMessage: ChatMessage = { role: 'user', content: content.trim() }
    messages.value.push(userMessage)
    saveMessages(messages.value)

    sending.value = true
    streamingContent.value = ''
    abortController = new AbortController()

    const onChunk = (chunk: { delta: string }) => {
      streamingContent.value += chunk.delta
    }

    try {
      if (files?.length) {
        await sendChatStreamWithFiles(messages.value, files, onChunk, abortController.signal)
      } else {
        await sendChatStream(messages.value, onChunk, abortController.signal)
      }

      if (streamingContent.value) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: streamingContent.value,
        }
        messages.value.push(assistantMessage)
        saveMessages(messages.value)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        error.value = (e as Error).message || 'Failed to get response'
      }
    } finally {
      sending.value = false
      streamingContent.value = ''
      abortController = null
    }
  }

  function cancelStream() {
    abortController?.abort()
  }

  function clearChat() {
    messages.value = []
    error.value = null
    streamingContent.value = ''
    cancelStream()
    localStorage.removeItem(STORAGE_KEY)
  }

  return { messages, sending, error, streamingContent, hasMessages, send, cancelStream, clearChat }
})
