import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import yaml from 'highlight.js/lib/languages/yaml'

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

/**
 * The grammars the site writes in, registered one by one.
 *
 * `import hljs from 'highlight.js'` brings all ~190, which was 345 KB of the
 * home page's 397 KB of gzipped JavaScript, loaded to colour a playground that
 * had not rendered anything yet. A fence in any other language still renders,
 * as escaped plain text; markdown.spec.ts fails when a post or a policy opens a
 * fence that is not listed here, so the omission cannot ship quietly. Each
 * grammar brings its own aliases (`ts`, `js`, `sh`, `text`, `yml`).
 */
const LANGUAGES = { bash, javascript, json, plaintext, python, sql, typescript, yaml }

for (const [name, grammar] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, grammar)
}

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
