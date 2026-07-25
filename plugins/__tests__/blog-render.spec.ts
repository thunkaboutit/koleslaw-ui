import { describe, it, expect } from 'vitest'
import {
  buildPage,
  publishedPosts,
  renderRobots,
  renderRss,
  renderSitemap,
  STATIC_ROUTES,
  type BlogPost,
  type PageMeta,
} from '../blog-render'

/** Stand-in for dist/index.html: one title, hashed assets, nothing else. */
const SHELL = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '  <head>',
  '    <meta charset="UTF-8">',
  '    <title>koleslaw.ai — Developer Portal</title>',
  '    <script type="module" crossorigin src="/assets/index-DHOcSlju.js"></script>',
  '    <link rel="stylesheet" crossorigin href="/assets/index-4jiqPqtK.css">',
  '  </head>',
  '  <body>',
  '    <div id="app"></div>',
  '  </body>',
  '</html>',
  '',
].join('\n')

function meta(overrides: Partial<PageMeta> = {}): PageMeta {
  return {
    title: 'A post about quantization',
    description: 'What happens when a hidden dimension is not divisible by 256.',
    canonical: 'https://koleslaw.ai/blog/quantization',
    image: undefined,
    type: 'article',
    publishedTime: '2026-08-01',
    ...overrides,
  }
}

function post(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    slug: 'quantization',
    title: 'A post about quantization',
    description: 'What happens when a hidden dimension is not divisible by 256.',
    date: '2026-08-01',
    tags: [],
    draft: false,
    ...overrides,
  }
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1
}

function parseXml(source: string): Document {
  const doc = new DOMParser().parseFromString(source, 'application/xml')
  expect(doc.querySelector('parsererror')).toBeNull()
  return doc
}

describe('buildPage', () => {
  it('replaces the shell title', () => {
    const html = buildPage(SHELL, meta())

    expect(html).toContain('<title>A post about quantization</title>')
    expect(html).not.toContain('koleslaw.ai — Developer Portal')
    expect(count(html, '<title>')).toBe(1)
  })

  it('injects exactly one absolute canonical with no trailing slash', () => {
    const html = buildPage(SHELL, meta())

    expect(count(html, 'rel="canonical"')).toBe(1)
    expect(html).toContain('<link rel="canonical" href="https://koleslaw.ai/blog/quantization">')
    expect(html).not.toContain('href="https://koleslaw.ai/blog/quantization/"')
  })

  it('injects the Open Graph basics', () => {
    const html = buildPage(SHELL, meta())

    expect(html).toContain('<meta property="og:title" content="A post about quantization">')
    expect(html).toContain(
      '<meta property="og:description" content="What happens when a hidden dimension is not divisible by 256.">',
    )
    expect(html).toContain(
      '<meta property="og:url" content="https://koleslaw.ai/blog/quantization">',
    )
    expect(html).toContain('<meta property="og:type" content="article">')
    expect(html).toContain('<meta property="og:site_name" content="Koleslaw">')
  })

  it('stamps the publish date', () => {
    const html = buildPage(SHELL, meta({ publishedTime: '2026-09-14' }))

    expect(html).toContain('<meta property="article:published_time" content="2026-09-14">')
  })

  it('omits the publish date on non-article pages', () => {
    const html = buildPage(SHELL, meta({ type: 'website', publishedTime: undefined }))

    expect(html).toContain('<meta property="og:type" content="website">')
    expect(html).not.toContain('article:published_time')
  })

  it('escapes hostile content', () => {
    const html = buildPage(
      SHELL,
      meta({
        title: 'Bobby "Tables" <script>alert(1)</script>',
        description: 'A "quoted" & <bracketed> description',
      }),
    )

    // The injected block must not reopen the document's markup.
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain(
      '<title>Bobby &quot;Tables&quot; &lt;script&gt;alert(1)&lt;/script&gt;</title>',
    )
    expect(html).toContain(
      'content="Bobby &quot;Tables&quot; &lt;script&gt;alert(1)&lt;/script&gt;"',
    )
    expect(html).toContain('content="A &quot;quoted&quot; &amp; &lt;bracketed&gt; description"')
  })

  it('omits image tags when no card art exists', () => {
    const html = buildPage(SHELL, meta({ image: undefined }))

    expect(html).not.toContain('og:image')
    expect(html).not.toContain('twitter:image')
    expect(html).toContain('<meta name="twitter:card" content="summary">')
  })

  it('emits image tags when card art exists', () => {
    const html = buildPage(SHELL, meta({ image: 'https://koleslaw.ai/og/default.png' }))

    expect(html).toContain(
      '<meta property="og:image" content="https://koleslaw.ai/og/default.png">',
    )
    expect(html).toContain(
      '<meta name="twitter:image" content="https://koleslaw.ai/og/default.png">',
    )
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
  })

  it('leaves the rest of the shell intact', () => {
    const html = buildPage(SHELL, meta())

    expect(html).toContain('<script type="module" crossorigin src="/assets/index-DHOcSlju.js">')
    expect(html).toContain('<link rel="stylesheet" crossorigin href="/assets/index-4jiqPqtK.css">')
    expect(html).toContain('<div id="app"></div>')
    expect(count(html, '</head>')).toBe(1)
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
  })

  it('points at the RSS feed', () => {
    const html = buildPage(SHELL, meta())

    expect(html).toContain('href="https://koleslaw.ai/rss.xml"')
    expect(html).toContain('type="application/rss+xml"')
  })
})

describe('publishedPosts', () => {
  it('drops drafts and orders newest first', () => {
    const posts = publishedPosts([
      post({ slug: 'older', date: '2026-01-01' }),
      post({ slug: 'hidden', date: '2026-06-01', draft: true }),
      post({ slug: 'newer', date: '2026-03-01' }),
    ])

    expect(posts.map((entry) => entry.slug)).toEqual(['newer', 'older'])
  })
})

describe('renderRss', () => {
  it('is well formed, with one item per published post', () => {
    const xml = renderRss([post({ slug: 'one' }), post({ slug: 'two', date: '2026-07-01' })])
    const doc = parseXml(xml)

    expect(doc.querySelectorAll('item')).toHaveLength(2)
    expect(doc.querySelector('channel > title')?.textContent).toBe('The Koleslaw Blog')
    expect(doc.querySelector('item > link')?.textContent).toBe('https://koleslaw.ai/blog/one')
    expect(doc.querySelector('item > guid')?.textContent).toBe('https://koleslaw.ai/blog/one')
  })

  it('dates items in RFC 822', () => {
    const doc = parseXml(renderRss([post({ date: '2026-08-01' })]))
    const pubDate = doc.querySelector('item > pubDate')?.textContent ?? ''

    expect(pubDate).toMatch(/^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/)
    expect(pubDate).toBe('Sat, 01 Aug 2026 00:00:00 GMT')
  })

  it('excludes drafts', () => {
    const xml = renderRss([post({ slug: 'live' }), post({ slug: 'wip', draft: true })])

    expect(parseXml(xml).querySelectorAll('item')).toHaveLength(1)
    expect(xml).not.toContain('wip')
  })

  it('is well formed with no posts at all', () => {
    expect(parseXml(renderRss([])).querySelectorAll('item')).toHaveLength(0)
  })

  it('escapes titles that would break the XML', () => {
    const xml = renderRss([post({ title: 'Tags & <angles>' })])

    expect(parseXml(xml).querySelector('item > title')?.textContent).toBe('Tags & <angles>')
  })
})

describe('renderRobots', () => {
  it('points crawlers at the sitemap', () => {
    const robots = renderRobots()

    expect(robots).toContain('User-agent: *')
    expect(robots).toContain('Sitemap: https://koleslaw.ai/sitemap.xml')
  })

  it('leaves the blog crawlable', () => {
    const robots = renderRobots()

    expect(robots).not.toContain('Disallow: /blog')
    expect(robots).not.toMatch(/^Disallow: \/$/m)
  })

  it('keeps crawlers out of the authed app routes', () => {
    const robots = renderRobots()

    for (const route of ['/chat', '/dashboard', '/keys', '/login', '/profile', '/signup']) {
      expect(robots).toContain(`Disallow: ${route}`)
    }
  })

  it('agrees with the sitemap about what is public', () => {
    const robots = renderRobots()
    const sitemap = renderSitemap([])

    for (const route of STATIC_ROUTES) {
      expect(sitemap).toContain(`<loc>https://koleslaw.ai${route}</loc>`)
      expect(robots).not.toContain(`Disallow: ${route}\n`)
    }
  })
})

describe('renderSitemap', () => {
  it('lists the public routes and every post with a lastmod', () => {
    const xml = renderSitemap([post({ slug: 'quantization', date: '2026-08-01' })])
    const locations = [...parseXml(xml).querySelectorAll('url > loc')].map(
      (node) => node.textContent,
    )

    expect(locations).toContain('https://koleslaw.ai/')
    expect(locations).toContain('https://koleslaw.ai/blog')
    expect(locations).toContain('https://koleslaw.ai/pricing')
    expect(locations).toContain('https://koleslaw.ai/blog/quantization')
    expect(xml).toContain(
      '<loc>https://koleslaw.ai/blog/quantization</loc><lastmod>2026-08-01</lastmod>',
    )
  })

  it('excludes authed app routes and drafts', () => {
    const xml = renderSitemap([post({ slug: 'wip', draft: true })])

    for (const route of ['/login', '/signup', '/keys', '/dashboard', '/profile', '/chat']) {
      expect(xml).not.toContain(`<loc>https://koleslaw.ai${route}</loc>`)
    }
    expect(xml).not.toContain('wip')
  })
})
