import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const { escapeHtml } = MarkdownIt().utils

const md: MarkdownIt = new MarkdownIt({
  linkify: true,
  typographer: true,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang }).value}</code></pre>`
      } catch {
        /* fallback below */
      }
    }
    return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`
  },
})

export function useMarkdown() {
  function renderMarkdown(raw: string): string {
    return md.render(raw)
  }

  return { renderMarkdown }
}
