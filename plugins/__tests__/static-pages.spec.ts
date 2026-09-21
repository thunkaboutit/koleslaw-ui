import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  bakePage,
  sitePages,
  type BakedPage,
  type SiteSources,
  type SourcePost,
} from '../static-pages'
import { HOME_HERO } from '../../src/content/home'
import { STATIC_PAGES, pageUrl, staticPage } from '../../src/config/pages'
import { BLOG_TITLE, CHROME_STORE_URL, SITE_TITLE } from '../../src/config/site'

/** Stand-in for dist/index.html: one title, one empty mount point. */
const SHELL = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '  <head>',
  '    <meta charset="UTF-8">',
  `    <title>${SITE_TITLE}</title>`,
  '    <script type="module" crossorigin src="/assets/index-DHOcSlju.js"></script>',
  '  </head>',
  '  <body>',
  '    <div id="app"></div>',
  '  </body>',
  '</html>',
  '',
].join('\n')

// jsdom resolves `new URL(relative, import.meta.url)` against the document, so
// the repo root is worked out from the file path instead.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function post(overrides: Partial<SourcePost> = {}): SourcePost {
  return {
    slug: 'quantization',
    title: 'My "4-bit" quant was 6.2 bits per weight',
    description: 'What happens when a hidden dimension is not divisible by 256.',
    date: '2026-07-29',
    tags: ['gguf'],
    draft: false,
    body: 'The GPU bill was **$1,360** a month.',
    ...overrides,
  }
}

function sources(overrides: Partial<SiteSources> = {}): SiteSources {
  return {
    posts: [post(), post({ slug: 'spot', title: 'Spot GPUs', date: '2026-08-05' })],
    documents: {
      terms: '# Koleslaw — Terms of Service\n\nThese Terms govern your use.',
      privacy: '# Koleslaw — Privacy Policy\n\nWe keep prompts for 24 hours.',
    },
    // Tags the output so a spec can tell rendered markdown from raw text.
    renderMarkdown: (raw) => `<div data-md>${raw}</div>`,
    resolveImage: (image) => (image === undefined ? undefined : `https://koleslaw.ai${image}`),
    ...overrides,
  }
}

function page(file: string, from: SiteSources = sources()): BakedPage {
  const found = sitePages(from).find((candidate) => candidate.file === file)
  if (found === undefined) throw new Error(`no baked page for ${file}`)
  return found
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

function types(baked: BakedPage): unknown[] {
  return baked.jsonLd.map((node) => node['@type'])
}

/** Every `{ '@id': x }` pointer anywhere inside a graph. */
function references(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(references)
  if (value === null || typeof value !== 'object') return []

  const entries = Object.entries(value)
  const only = entries.length === 1 ? entries[0] : undefined
  if (only !== undefined && only[0] === '@id') return [String(only[1])]

  return entries.flatMap(([, child]) => references(child))
}

describe('sitePages', () => {
  it('bakes one file per registry page and one per published post', () => {
    expect(sitePages(sources()).map((baked) => baked.file)).toEqual([
      'home.html',
      'blog.html',
      'pricing.html',
      'contact.html',
      'terms.html',
      'privacy.html',
      'blog/spot.html',
      'blog/quantization.html',
    ])
  })

  it('never bakes over index.html, which stays the neutral shell for app routes and 404s', () => {
    expect(sitePages(sources()).map((baked) => baked.file)).not.toContain('index.html')
  })

  it('gives a draft no page, no link and no mention', () => {
    const withDraft = sources({
      posts: [post(), post({ slug: 'unwritten', title: 'Unwritten thing', draft: true })],
    })
    const baked = sitePages(withDraft)

    expect(baked.map((entry) => entry.file)).not.toContain('blog/unwritten.html')
    expect(JSON.stringify(baked)).not.toContain('unwritten')
  })

  it('takes every static page head from the registry', () => {
    for (const entry of STATIC_PAGES) {
      const file = entry.name === 'home' ? 'home.html' : `${entry.path.slice(1)}.html`
      const { meta } = page(file)

      expect(meta.title).toBe(entry.title)
      expect(meta.description).toBe(entry.description)
      expect(meta.canonical).toBe(pageUrl(entry))
      expect(meta.type).toBe('website')
    }
  })

  it('heads a post as an article with its own card', () => {
    const { meta } = page(
      'blog/quantization.html',
      sources({ posts: [post({ ogImage: '/og/quantization.png' })] }),
    )

    expect(meta.title).toBe(`My "4-bit" quant was 6.2 bits per weight — ${BLOG_TITLE}`)
    expect(meta.canonical).toBe('https://koleslaw.ai/blog/quantization')
    expect(meta.type).toBe('article')
    expect(meta.publishedTime).toBe('2026-07-29')
    expect(meta.image).toBe('https://koleslaw.ai/og/quantization.png')
  })

  it('gives every body exactly one h1 and closes it with links to every public page', () => {
    for (const baked of sitePages(sources())) {
      const document = parse(baked.body)
      const navLinks = [...document.querySelectorAll('nav[aria-label="Site"] a')].map((link) =>
        link.getAttribute('href'),
      )

      expect(document.querySelectorAll('h1')).toHaveLength(1)
      expect(navLinks).toEqual([...STATIC_PAGES.map((entry) => entry.path), CHROME_STORE_URL])
    }
  })

  it('bakes the home hero the app shows, with the store link as the call to action', () => {
    const document = parse(page('home.html').body)

    expect(document.querySelector('h1')?.textContent).toBe(HOME_HERO.headline.join(''))
    expect(document.body.textContent).toContain(HOME_HERO.subtitle)
    expect(document.querySelector(`main a[href="${CHROME_STORE_URL}"]`)?.textContent).toBe(
      HOME_HERO.cta.label,
    )
  })

  it('describes the product on the home page in the words of its meta description', () => {
    const home = page('home.html')
    const app = home.jsonLd.find((node) => node['@type'] === 'SoftwareApplication')

    expect(types(home)).toEqual(['Organization', 'WebSite', 'SoftwareApplication'])
    expect(app?.['description']).toBe(staticPage('home').description)
  })

  it('bakes the pricing and contact pages as heading plus description', () => {
    for (const name of ['pricing', 'contact'] as const) {
      const entry = staticPage(name)
      const document = parse(page(`${name}.html`).body)

      expect(document.querySelector('h1')?.textContent).toBe(entry.heading)
      expect(document.body.textContent).toContain(entry.description)
    }
  })

  it('bakes the policies from their markdown, under the page heading alone', () => {
    const document = parse(page('privacy.html').body)
    const prose = document.querySelector('.prose')

    expect(document.querySelector('h1')?.textContent).toBe('Privacy Policy')
    expect(prose?.querySelector('[data-md]')?.textContent).toContain(
      'We keep prompts for 24 hours.',
    )
    // The markdown opens with its own "# Koleslaw — Privacy Policy" title, which
    // would make a second h1 of the same words.
    expect(prose?.textContent).not.toContain('Koleslaw — Privacy Policy')
  })

  it('lists the published posts on the blog index, newest first', () => {
    const blog = page('blog.html')
    const links = [...parse(blog.body).querySelectorAll('article h2 a')].map((link) =>
      link.getAttribute('href'),
    )

    expect(links).toEqual(['/blog/spot', '/blog/quantization'])
    expect(types(blog)).toEqual(['Organization', 'WebSite', 'Blog', 'BreadcrumbList'])
  })

  it('bakes the rendered article into its post page', () => {
    const baked = page('blog/quantization.html')
    const document = parse(baked.body)

    expect(document.querySelector('.prose [data-md]')?.textContent).toBe(
      'The GPU bill was **$1,360** a month.',
    )
    expect(document.querySelector('nav[aria-label="More posts"] a')?.getAttribute('href')).toBe(
      '/blog/spot',
    )
    expect(types(baked)).toEqual([
      'Organization',
      'WebSite',
      'Blog',
      'BlogPosting',
      'BreadcrumbList',
    ])
  })

  it('describes exactly one article on a post page', () => {
    // The Blog node lists a stub per post. On a post page those stubs would sit
    // beside the real BlogPosting as extra, thinner articles about other URLs.
    const graph = JSON.stringify(page('blog/quantization.html').jsonLd)

    expect(graph.split('"@type":"BlogPosting"')).toHaveLength(2)
  })

  it('walks the breadcrumb from the home page down to the page itself', () => {
    const trail = (file: string): unknown =>
      page(file).jsonLd.find((node) => node['@type'] === 'BreadcrumbList')?.['itemListElement']

    expect(trail('blog/quantization.html')).toMatchObject([
      { position: 1, item: 'https://koleslaw.ai/' },
      { position: 2, item: 'https://koleslaw.ai/blog' },
      { position: 3, item: 'https://koleslaw.ai/blog/quantization' },
    ])
    expect(trail('pricing.html')).toMatchObject([
      { position: 1, item: 'https://koleslaw.ai/' },
      { position: 2, name: 'Pricing', item: 'https://koleslaw.ai/pricing' },
    ])
  })

  it('declares, on the same page, every node another node points at', () => {
    for (const baked of sitePages(sources())) {
      const declared = baked.jsonLd.map((node) => node['@id']).filter(Boolean)

      expect(references(baked.jsonLd).filter((id) => !declared.includes(id))).toEqual([])
    }
  })
})

describe('bakePage', () => {
  it('writes the head, the structured data and the body into one shell', () => {
    const baked = page('blog/quantization.html')
    const document = parse(bakePage(SHELL, baked))
    const graph = JSON.parse(
      document.querySelector('head script[type="application/ld+json"]')?.textContent ?? '{}',
    )

    expect(document.title).toBe(baked.meta.title)
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      baked.meta.canonical,
    )
    expect(graph['@graph']).toHaveLength(baked.jsonLd.length)
    expect(document.querySelector('#app main.prerendered h1')?.textContent).toBe(
      'My "4-bit" quant was 6.2 bits per weight',
    )
    expect(document.querySelector('script[type="module"]')).not.toBeNull()
  })
})

describe('the real shell', () => {
  it('still titles itself with SITE_TITLE, the string every unmount restores', () => {
    const shell = readFileSync(resolve(REPO_ROOT, 'index.html'), 'utf8')

    expect(shell).toContain(`<title>${SITE_TITLE}</title>`)
  })

  it('still has the one empty mount point the bake fills', () => {
    const shell = readFileSync(resolve(REPO_ROOT, 'index.html'), 'utf8')

    expect(() => bakePage(shell, page('home.html'))).not.toThrow()
  })
})
