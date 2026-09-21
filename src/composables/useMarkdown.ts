import type MarkdownIt from 'markdown-it'
import { createMarkdownRenderer } from '@/content/markdown'
import 'highlight.js/styles/github.css'

/**
 * Markdown for the app.
 *
 * The configuration itself lives in src/content/markdown.ts so the build can
 * share it; what stays here is the stylesheet, which only a browser needs. One
 * instance per module rather than per call: MarkdownIt is stateless between
 * renders and constructing it is the expensive part.
 */
const md: MarkdownIt = createMarkdownRenderer()

export function useMarkdown() {
  function renderMarkdown(raw: string): string {
    return md.render(raw)
  }

  return { renderMarkdown }
}
