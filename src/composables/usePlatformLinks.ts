import { computed, ref, type Ref } from 'vue'

export interface Platform {
  id: string
  name: string
  icon: string
  type: 'deeplink' | 'copy'
  url?: string
}

interface PlatformDef {
  id: string
  name: string
  icon: string
  urlTemplate?: string
}

const PLATFORMS: PlatformDef[] = [
  { id: 'chatgpt', name: 'ChatGPT', icon: '💬', urlTemplate: 'https://chatgpt.com/?q={encoded}' },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '🔍',
    urlTemplate: 'https://www.perplexity.ai/search?q={encoded}',
  },
  { id: 'claude', name: 'Claude', icon: '🤖' },
  { id: 'gemini', name: 'Gemini', icon: '✨' },
]

const MAX_URL_LENGTH = 8000

export function usePlatformLinks(promptText: Ref<string>) {
  const copiedPlatformId = ref<string | null>(null)
  let resetTimer: ReturnType<typeof setTimeout> | undefined

  const platforms = computed<Platform[]>(() => {
    const encoded = encodeURIComponent(promptText.value)
    const tooLong = encoded.length > MAX_URL_LENGTH

    return PLATFORMS.map((p) => {
      if (!p.urlTemplate || tooLong) {
        return { id: p.id, name: p.name, icon: p.icon, type: 'copy' as const }
      }
      return {
        id: p.id,
        name: p.name,
        icon: p.icon,
        type: 'deeplink' as const,
        url: p.urlTemplate.replace('{encoded}', encoded),
      }
    })
  })

  async function copyToClipboard(platformId: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(promptText.value)
      copiedPlatformId.value = platformId
      clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        copiedPlatformId.value = null
      }, 2000)
      return true
    } catch {
      return false
    }
  }

  return { platforms, copiedPlatformId, copyToClipboard }
}
