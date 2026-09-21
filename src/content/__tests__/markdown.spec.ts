import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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

  it('carries only the languages the site writes in, not all of highlight.js', () => {
    // Rust is a real highlight.js language. If it highlights here, the full
    // 190-language build is back in the bundle: about 350 KB gzipped on the home
    // page, to colour a playground that has not rendered anything yet.
    const html = createMarkdownRenderer().render('```rust\nfn main() {}\n```\n')

    expect(html).toContain('<pre class="hljs"><code>fn main() {}')
    expect(html).not.toContain('hljs-keyword')
  })

  it.each(['bash', 'python', 'json', 'javascript', 'typescript', 'yaml', 'sql', 'text'])(
    'highlights a %s fence',
    (lang) => {
      const html = createMarkdownRenderer().render(`\`\`\`${lang}\nx = 1\n\`\`\`\n`)

      expect(html).toContain(`<pre class="hljs"><code class="language-${lang}">`)
    },
  )

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

describe('the fences the site really uses', () => {
  // jsdom resolves `new URL(relative, import.meta.url)` against the document, so
  // the repo root is worked out from the file path instead.
  const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
  const SOURCES = ['src/content/blog', 'src/assets/policies']

  /** highlight.js ships no grammar for these at all, so they were never coloured. */
  const NEVER_HIGHLIGHTED = ['hcl']

  function fenceLanguages(): string[] {
    const found = SOURCES.flatMap((dir) =>
      readdirSync(join(ROOT, dir))
        .filter((name) => name.endsWith('.md'))
        .flatMap((name) => {
          const markdown = readFileSync(join(ROOT, dir, name), 'utf8')
          return [...markdown.matchAll(/^```([\w-]+)/gm)].map((match) => match[1] ?? '')
        }),
    )
    return [...new Set(found)].sort()
  }

  /**
   * The renderer registers languages one by one, so a post that opens a fence in
   * a new one ships unhighlighted with no error anywhere. This is the error.
   */
  it('are all registered in src/content/markdown.ts', () => {
    const renderer = createMarkdownRenderer()
    const unhighlighted = fenceLanguages()
      .filter((lang) => !NEVER_HIGHLIGHTED.includes(lang))
      .filter(
        (lang) =>
          !renderer.render(`\`\`\`${lang}\nx\n\`\`\`\n`).includes(`class="language-${lang}"`),
      )

    // Fix: import the grammar in src/content/markdown.ts and add it to LANGUAGES.
    expect(unhighlighted).toEqual([])
  })

  it('include at least one fence, so the check above is not vacuous', () => {
    expect(fenceLanguages()).toContain('text')
  })
})
