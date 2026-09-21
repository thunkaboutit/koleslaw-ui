import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

/**
 * The one MarkdownIt configuration, shared by the running app and the build.
 *
 * Article HTML is rendered twice: once into the static page baked at build time
 * for crawlers, and once in the browser when the SPA boots. Two configurations
 * would mean two different articles at the same URL, which is exactly what
 * search engines treat as cloaking. So the config lives here and both callers
 * build from it.
 *
 * Isomorphic on purpose: no CSS import, no `import.meta`, no alias imports.
 * vite.config.ts is bundled for Node, where none of those resolve — the
 * stylesheet stays with useMarkdown.ts, which only the app loads.
 */

const { escapeHtml } = MarkdownIt().utils

export function createMarkdownRenderer(): MarkdownIt {
  return new MarkdownIt({
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
}
