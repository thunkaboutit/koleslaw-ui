import { BLOG_DESCRIPTION, BLOG_TITLE, SITE_NAME, SITE_URL, postUrl } from '../src/config/site'
import type { PostFrontmatter } from '../src/content/frontmatter'

/**
 * Pure rendering for the blog's build-time artefacts: per-post HTML, the RSS
 * feed, the sitemap, and robots.txt.
 *
 * Split out of blog-static.ts, which owns everything that touches the disk, so
 * these transforms can be tested directly instead of through a full
 * `vite build`. Nothing here may import node:fs — the moment it does, the tests
 * need a filesystem and stop being about the output.
 */

export interface BlogPost extends PostFrontmatter {
  slug: string
}

export interface PageMeta {
  title: string
  description: string
  canonical: string
  /** Absolute image URL, or undefined when no card art exists. */
  image: string | undefined
  type: string
  publishedTime?: string
}

/** Public routes worth listing in the sitemap. Authed app routes stay out. */
export const STATIC_ROUTES = ['/', '/blog', '/pricing', '/contact', '/terms', '/privacy']

/**
 * Routes behind auth. They serve the same SPA shell as everything else, so to a
 * crawler they are half a dozen copies of one page. Keeping them out of the
 * index is housekeeping, not security: the auth check is the security.
 */
export const DISALLOWED_ROUTES = ['/chat', '/dashboard', '/keys', '/login', '/profile', '/signup']

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Published posts, newest first.
 *
 * Applied by every renderer rather than by the caller, so a draft cannot reach
 * a feed or a generated page by way of someone forgetting to filter.
 */
export function publishedPosts(posts: BlogPost[]): BlogPost[] {
  return posts.filter((post) => !post.draft).sort((a, b) => b.date.localeCompare(a.date))
}

function renderHead(meta: PageMeta): string {
  const tags = [
    ['name', 'description', meta.description],
    ['property', 'og:site_name', SITE_NAME],
    ['property', 'og:title', meta.title],
    ['property', 'og:description', meta.description],
    ['property', 'og:url', meta.canonical],
    ['property', 'og:type', meta.type],
    // A card pointing at a missing image unfurls worse than no card at all,
    // so the image tags only appear once the art is actually in the build.
    ['name', 'twitter:card', meta.image === undefined ? 'summary' : 'summary_large_image'],
    ['name', 'twitter:title', meta.title],
    ['name', 'twitter:description', meta.description],
  ]

  if (meta.image !== undefined) {
    tags.push(['property', 'og:image', meta.image], ['name', 'twitter:image', meta.image])
  }

  if (meta.publishedTime !== undefined) {
    tags.push(['property', 'article:published_time', meta.publishedTime])
  }

  const rendered = tags
    .map(([attr, key, content]) => {
      return `    <meta ${attr}="${key}" content="${escapeHtml(content ?? '')}">`
    })
    .join('\n')

  return [
    `    <link rel="canonical" href="${escapeHtml(meta.canonical)}">`,
    rendered,
    `    <link rel="alternate" type="application/rss+xml" title="${escapeHtml(
      BLOG_TITLE,
    )}" href="${SITE_URL}/rss.xml">`,
  ].join('\n')
}

/** The built SPA shell with this page's title and social tags substituted in. */
export function buildPage(shell: string, meta: PageMeta): string {
  const withTitle = shell.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`,
  )
  // Swallow the closing tag's own indentation so the injected block lines up.
  return withTitle.replace(/[ \t]*<\/head>/, `${renderHead(meta)}\n  </head>`)
}

export function renderRss(posts: BlogPost[]): string {
  const items = publishedPosts(posts)
    .map((post) => {
      const link = postUrl(post.slug)
      const pubDate = new Date(`${post.date}T00:00:00Z`).toUTCString()
      return [
        '    <item>',
        `      <title>${escapeHtml(post.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${escapeHtml(post.description)}</description>`,
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeHtml(BLOG_TITLE)}</title>`,
    `    <link>${SITE_URL}/blog</link>`,
    `    <description>${escapeHtml(BLOG_DESCRIPTION)}</description>`,
    '    <language>en</language>',
    `    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>`,
    ...(items === '' ? [] : [items]),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}

/**
 * Emitted next to sitemap.xml rather than kept in public/, so the sitemap URL
 * has exactly one source of truth and cannot drift from what is generated.
 */
export function renderRobots(): string {
  return [
    'User-agent: *',
    'Allow: /',
    ...DISALLOWED_ROUTES.map((route) => `Disallow: ${route}`),
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n')
}

export function renderSitemap(posts: BlogPost[]): string {
  const urls = [
    ...STATIC_ROUTES.map((route) => `  <url><loc>${SITE_URL}${route}</loc></url>`),
    ...publishedPosts(posts).map((post) => {
      return `  <url><loc>${postUrl(post.slug)}</loc><lastmod>${post.date}</lastmod></url>`
    }),
  ].join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')
}
