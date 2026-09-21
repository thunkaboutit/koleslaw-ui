import { describe, expect, it } from 'vitest'
import { createMarkdownRenderer } from '../markdown'
import { useMarkdown } from '../../composables/useMarkdown'

/** Everything the app and the build both have to agree on, in one string. */
const SAMPLE = [
  'A "quoted" phrase with an ellipsis...',
  '',
  'See https://koleslaw.ai for more.',
  '',
  '```ts',
  'const answer: number = 42',
  '```',
  '',
  '```wingdings',
  'if (a < b) & "quoted"',
  '```',
  '',
].join('\n')

describe('createMarkdownRenderer', () => {
  it('highlights a fenced block whose language highlight.js knows', () => {
    const html = createMarkdownRenderer().render('```ts\nconst answer: number = 42\n```\n')

    expect(html).toContain('<pre class="hljs"><code class="language-ts">')
    expect(html).toContain('hljs-keyword')
  })

  it('falls back to escaped plain text for an unknown language', () => {
    const html = createMarkdownRenderer().render('```wingdings\nif (a < b) & "quoted"\n```\n')

    expect(html).toContain('<pre class="hljs"><code>')
    expect(html).not.toContain('class="language-wingdings"')
    expect(html).toContain('if (a &lt; b) &amp; &quot;quoted&quot;')
  })

  it('linkifies bare URLs', () => {
    const html = createMarkdownRenderer().render('See https://koleslaw.ai for more.\n')

    expect(html).toContain('<a href="https://koleslaw.ai">https://koleslaw.ai</a>')
  })

  it('applies typographic replacements', () => {
    const html = createMarkdownRenderer().render('A "quoted" phrase with an ellipsis...\n')

    expect(html).toContain('“quoted”')
    expect(html).toContain('…')
  })

  it('returns a fresh instance per call', () => {
    expect(createMarkdownRenderer()).not.toBe(createMarkdownRenderer())
  })
})

describe('useMarkdown', () => {
  /**
   * The whole point of the shared factory: HTML baked into a page at build time
   * has to be the same HTML the booted app would have rendered, or the crawler
   * and the reader are being shown different articles.
   */
  it('renders exactly what the factory renders', () => {
    const { renderMarkdown } = useMarkdown()

    expect(renderMarkdown(SAMPLE)).toBe(createMarkdownRenderer().render(SAMPLE))
  })
})
