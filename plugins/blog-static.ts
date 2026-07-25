import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import {
  BLOG_DESCRIPTION,
  BLOG_TITLE,
  DEFAULT_OG_IMAGE,
  SITE_URL,
  postUrl,
} from '../src/config/site'
import { parsePost } from '../src/content/frontmatter'
import { buildPage, publishedPosts, renderRss, renderSitemap, type BlogPost } from './blog-render'

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
 * as usual, and the user sees no difference. Routing is covered by
 * scripts/verify-blog-routes.sh; the rendering itself lives in blog-render.ts
 * and is covered by its unit tests.
 *
 * Body content is deliberately NOT prerendered. Correct meta tags fix
 * unfurling outright, and Google renders JS for the article text. If organic
 * search ever justifies it, full prerendering via vite-ssg is the next step.
 */

const CONTENT_DIR = 'src/content/blog'

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
      const posts = publishedPosts(loadPosts(config.root))

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
