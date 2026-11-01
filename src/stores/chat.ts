import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { ChatMessage } from '@/api/types'
import { sendChatStream, sendChatStreamWithFiles } from '@/api/chat'
import type { ChatEvent } from '@/api/sse'
import { useAuthStore } from '@/stores/auth'
import { useKeysStore } from '@/stores/keys'

/* Memory only.  The history used to persist in localStorage and was resent
   in full on the first send after a reload; the session store removes the
   old key. */

export const useChatStore = defineStore('chat', () => {
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)
  const error = ref<string | null>(null)
  const streamingContent = ref('')
  const streamingThinking = ref('')
  const isThinking = ref(false)
  const lastThinkingContent = ref('')
  let abortController: AbortController | null = null

  const hasMessages = computed(() => messages.value.length > 0)

  async function send(content: string, files?: File[]) {
    if (!content.trim() || sending.value) return

    error.value = null
    const userMessage: ChatMessage = { role: 'user', content: content.trim() }
    messages.value.push(userMessage)

    sending.value = true
    streamingContent.value = ''
    streamingThinking.value = ''
    lastThinkingContent.value = ''
    isThinking.value = false
    abortController = new AbortController()

    const onChunk = (event: ChatEvent) => {
      if (event.type === 'thinking') {
        // Thinking that resumes after answer text starts a new paragraph
        const resumed = !isThinking.value && streamingThinking.value && streamingContent.value
        streamingThinking.value += (resumed ? '\n\n' : '') + event.delta
        if (!isThinking.value) isThinking.value = true
      } else {
        if (isThinking.value) isThinking.value = false
        streamingContent.value += event.delta
      }
    }

    // Signed-in users act with their selected key; visitors stay anonymous
    const auth = useAuthStore()
    const keysStore = useKeysStore()
    const apiKeyId = auth.user ? keysStore.playgroundKeyId : null

    try {
      if (files?.length) {
        await sendChatStreamWithFiles(
          messages.value,
          files,
          onChunk,
          abortController.signal,
          apiKeyId,
        )
      } else {
        await sendChatStream(messages.value, onChunk, abortController.signal, apiKeyId)
      }

      if (streamingContent.value) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: streamingContent.value,
        }
        messages.value.push(assistantMessage)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        error.value = (e as Error).message || 'Failed to get response'
      }
    } finally {
      sending.value = false
      lastThinkingContent.value = streamingThinking.value
      streamingContent.value = ''
      streamingThinking.value = ''
      isThinking.value = false
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
    streamingThinking.value = ''
    isThinking.value = false
    lastThinkingContent.value = ''
    cancelStream()
  }

  return {
    messages,
    sending,
    error,
    streamingContent,
    streamingThinking,
    isThinking,
    lastThinkingContent,
    hasMessages,
    send,
    cancelStream,
    clearChat,
  }
})
