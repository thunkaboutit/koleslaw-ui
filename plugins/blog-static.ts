import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import { DEFAULT_OG_IMAGE, SITE_URL } from '../src/config/site'
import { parsePost } from '../src/content/frontmatter'
import { createMarkdownRenderer } from '../src/content/markdown'
import { renderRobots, renderRss, renderSitemap } from './blog-render'
import { bakePage, sitePages, type SourcePost } from './static-pages'

/**
 * Bakes a static HTML file for every public page, plus the RSS feed, the
 * sitemap and robots.txt, into the build output.
 *
 * The UI is a client-rendered SPA: left alone, every route serves the same
 * index.html with one hard-coded <title>, no social tags and an empty
 * <div id="app">. Link unfurlers, Bing and the AI crawlers (GPTBot, ClaudeBot,
 * PerplexityBot) do not run JavaScript, so to them every page was a blank one
 * called "Koleslaw — AI Prompt Enhancement".
 *
 * So each public URL gets its own file: the built shell with that page's
 * title, description, canonical, Open Graph tags and JSON-LD in the head, and
 * the page's real text baked into the mount point. nginx serves the file (see
 * the $uri.html clauses in nginx.conf.template), the SPA boots as usual, and
 * createApp().mount() replaces the baked body with the live app. This is not
 * SSR and nothing hydrates: the boot path is exactly what it was.
 *
 * index.html itself is never written to. It is what the authed app routes and
 * every 404 are served, so it stays the neutral shell; the home page goes to
 * home.html.
 *
 * This file owns the disk and nothing else. What each page contains is decided
 * in static-pages.ts, rendered by blog-render.ts, json-ld.ts and
 * body-render.ts, and covered by their unit tests; that the files are reachable
 * at their canonical URLs is covered by scripts/verify-blog-routes.sh.
 */

const CONTENT_DIR = 'src/content/blog'
const POLICY_DIR = 'src/assets/policies'

function loadPosts(root: string): SourcePost[] {
  const dir = resolve(root, CONTENT_DIR)
  if (!existsSync(dir)) return []

  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const path = join(dir, name)
      const { frontmatter, body } = parsePost(readFileSync(path, 'utf8'), `${CONTENT_DIR}/${name}`)
      return { ...frontmatter, slug: name.replace(/\.md$/, ''), body }
    })
}

/** The same files the policy pages import with `?raw`. Missing one fails the build. */
function loadPolicy(root: string, name: 'terms' | 'privacy'): string {
  return readFileSync(resolve(root, POLICY_DIR, `${name}.md`), 'utf8')
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
        this.warn('index.html not found in the build output; skipping static page generation')
        return
      }

      const shell = readFileSync(shellPath, 'utf8')
      const markdown = createMarkdownRenderer()
      // A malformed post throws here and fails the build on purpose. Shipping a
      // post with no title is worse than not shipping.
      const posts = loadPosts(config.root)

      const pages = sitePages({
        posts,
        documents: {
          terms: loadPolicy(config.root, 'terms'),
          privacy: loadPolicy(config.root, 'privacy'),
        },
        renderMarkdown: (raw) => markdown.render(raw),
        resolveImage: (image) => resolveImage(outDir, image),
      })

      for (const page of pages) {
        write(outDir, page.file, bakePage(shell, page))
      }

      write(outDir, 'rss.xml', renderRss(posts))
      write(outDir, 'sitemap.xml', renderSitemap(posts))
      write(outDir, 'robots.txt', renderRobots())

      config.logger.info(
        `  static pages: ${pages.length} baked (${pages.map((page) => page.file).join(', ')}), ` +
          'rss.xml, sitemap.xml, robots.txt',
      )
    },
  }
}
