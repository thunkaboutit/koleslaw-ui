import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import {
  BLOG_DESCRIPTION,
  BLOG_TITLE,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  postUrl,
} from '../src/config/site'
import { parsePost, type PostFrontmatter } from '../src/content/frontmatter'

/**
 * Bakes per-post static HTML, an RSS feed, and a sitemap into the build output.
 *
 * The portal is a client-rendered SPA: every route serves the same index.html
 * with one hard-coded <title> and no social tags. Link unfurlers (Reddit,
 * Slack, LinkedIn, X) do not run JavaScript, so without this every shared post
 * would preview as "koleslaw.ai — Developer Portal".
 *
 * This writes dist/blog/<slug>.html — the SPA shell with that post's title,
 * description, canonical and Open Graph tags substituted in. nginx serves the
 * real file (see the $uri.html clause in nginx.conf.template), the SPA boots
 * as usual, and the user sees no difference.
 *
 * Body content is deliberately NOT prerendered. Correct meta tags fix
 * unfurling outright, and Google renders JS for the article text. If organic
 * search ever justifies it, full prerendering via vite-ssg is the next step.
 */

interface BlogPost extends PostFrontmatter {
  slug: string
}

const CONTENT_DIR = 'src/content/blog'

/** Public routes worth listing in the sitemap. Authed app routes stay out. */
const STATIC_ROUTES = ['/', '/blog', '/pricing', '/contact', '/terms', '/privacy']

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function loadPosts(root: string): BlogPost[] {
  const dir = resolve(root, CONTENT_DIR)
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const path = join(dir, name)
      const { frontmatter } = parsePost(readFileSync(path, 'utf8'), `${CONTENT_DIR}/${name}`)
      return { ...frontmatter, slug: name.replace(/\.md$/, '') }
    })
    .filter((post) => !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date))
}

interface PageMeta {
  title: string
  description: string
  canonical: string
  /** Absolute image URL, or undefined when no card art exists on disk. */
  image: string | undefined
  type: string
  publishedTime?: string
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

function buildPage(shell: string, meta: PageMeta): string {
  const withTitle = shell.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`,
  )
  // Swallow the closing tag's own indentation so the injected block lines up.
  return withTitle.replace(/[ \t]*<\/head>/, `${renderHead(meta)}\n  </head>`)
}

/**
 * Turn a declared card path into an absolute URL, but only if the file is
 * really in the build output. Drop `public/og/default.png` into the repo and
 * every post picks it up automatically.
 */
function resolveImage(outDir: string, image: string | undefined): string | undefined {
  const path = image ?? DEFAULT_OG_IMAGE
  if (path.startsWith('http')) return path
  return existsSync(join(outDir, path)) ? `${SITE_URL}${path}` : undefined
}

function renderRss(posts: BlogPost[]): string {
  const items = posts
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

function renderSitemap(posts: BlogPost[]): string {
  const urls = [
    ...STATIC_ROUTES.map((route) => `  <url><loc>${SITE_URL}${route}</loc></url>`),
    ...posts.map((post) => {
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

function write(outDir: string, relativePath: string, contents: string): void {
  const target = join(outDir, relativePath)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, contents, 'utf8')
}

export function blogStatic(): Plugin {
  let config: ResolvedConfig

  return {
    name: 'koleslaw-blog-static',
    apply: 'build',

    configResolved(resolved) {
      config = resolved
    },

    // writeBundle runs after dist/index.html exists on disk, which is the
    // shell every generated page is derived from.
    writeBundle() {
      const outDir = resolve(config.root, config.build.outDir)
      const shellPath = join(outDir, 'index.html')

      if (!existsSync(shellPath)) {
        this.warn('index.html not found in the build output; skipping blog static generation')
        return
      }

      const shell = readFileSync(shellPath, 'utf8')
      // A malformed post throws here and fails the build on purpose. Shipping a
      // post with no title is worse than not shipping.
      const posts = loadPosts(config.root)

      write(
        outDir,
        'blog.html',
        buildPage(shell, {
          title: `${BLOG_TITLE} — koleslaw.ai`,
          description: BLOG_DESCRIPTION,
          canonical: `${SITE_URL}/blog`,
          image: resolveImage(outDir, undefined),
          type: 'website',
        }),
      )

      for (const post of posts) {
        write(
          outDir,
          `blog/${post.slug}.html`,
          buildPage(shell, {
            title: `${post.title} — ${BLOG_TITLE}`,
            description: post.description,
            canonical: postUrl(post.slug),
            image: resolveImage(outDir, post.ogImage),
            type: 'article',
            publishedTime: post.date,
          }),
        )
      }

      write(outDir, 'rss.xml', renderRss(posts))
      write(outDir, 'sitemap.xml', renderSitemap(posts))

      config.logger.info(
        `  blog: ${posts.length} post${posts.length === 1 ? '' : 's'}, rss.xml, sitemap.xml`,
      )
    },
  }
}
