import { BLOG_DESCRIPTION, BLOG_TITLE } from '../src/config/site'
import type { HomeSection } from '../src/content/home'
import { featureText, type PricingPlan } from '../src/content/pricing'
import { escapeHtml, publishedPosts, type BlogPost } from './blog-render'

/**
 * Pure rendering of the page body that gets baked into the SPA shell.
 *
 * The site ships one empty `<div id="app">`, so every crawler that does not run
 * JavaScript — Bing, link unfurlers, GPTBot, ClaudeBot, PerplexityBot — sees a
 * blank page where the article is. These functions render the same headings,
 * text and links the booted app renders, and blog-static.ts writes them into
 * the mount point.
 *
 * This is not SSR and not hydration: `createApp(App).mount('#app')` empties its
 * container, so the baked markup is read by crawlers, flashes for a human on a
 * slow connection, and is then thrown away. That only stays honest while the
 * baked text says what the app says, which is why every renderer here takes its
 * copy as a parameter instead of inventing any.
 *
 * Like blog-render.ts: no node:fs, no `import.meta`, no `@/` alias, no CSS.
 * vite.config.ts is bundled for Node, where none of those resolve.
 */

export interface NavLink {
  href: string
  label: string
}

export interface HeroCopy {
  /** One entry per visual line of the h1. */
  headline: readonly string[]
  subtitle: string
  cta?: { label: string; href: string; note?: string }
}

const MOUNT_POINT = /<div id="app">\s*<\/div>/g

/**
 * Inline, not a class: the body exists before the app's stylesheet has anything
 * to say about it, and is gone by the time it would. Enough to keep the flash
 * readable rather than a full-bleed wall of text — and nothing that hides it.
 */
const WRAPPER_STYLE = 'max-width: 44rem; margin: 0 auto; padding: 2rem 1rem;'

/** One wrapper for every body, so a page can never be baked unwrapped. */
function wrap(children: string[]): string {
  return [
    `<main class="prerendered" style="${WRAPPER_STYLE}">`,
    ...children.filter((child) => child !== ''),
    '</main>',
  ].join('\n')
}

function anchor(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`
}

/** "29 July 2026" — what the app shows, pinned to UTC so it cannot drift. */
function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Machine-readable date beside the human one, for anything parsing the page. */
function timeTag(date: string): string {
  return `<time datetime="${escapeHtml(date)}">${escapeHtml(formatDate(date))}</time>`
}

/**
 * The post's dates: published, and the last declared edit when there is one.
 *
 * The edit gets its own `<time>` rather than a second date inside the first:
 * the page's JSON-LD claims a dateModified, and this is the visible half of
 * that claim, so it has to be as machine-readable as the claim is.
 */
function dateLine(date: string, updated?: string): string {
  const published = timeTag(date)

  return updated === undefined
    ? `<p>${published}</p>`
    : `<p>${published} · Updated ${timeTag(updated)}</p>`
}

/** `.prose` is global (src/assets/prose.css), so this is styled before boot. */
function prose(html: string): string {
  return `<div class="prose">${html}</div>`
}

/**
 * Replace the shell's empty mount point with the baked body.
 *
 * Throws when the shell does not hold exactly one empty `<div id="app"></div>`:
 * shipping blank pages is the bug this whole module exists to fix, so a shell
 * that changed shape has to break the build rather than quietly do nothing.
 */
export function injectBody(shell: string, body: string): string {
  const found = shell.match(MOUNT_POINT)?.length ?? 0

  if (found !== 1) {
    throw new Error(
      `injectBody: expected exactly one empty <div id="app"></div> in the shell, found ${found}. ` +
        'Refusing to bake a page with no body content.',
    )
  }

  // A replacer function, because article HTML contains `$` often enough ($5,
  // awk snippets) and `$&` in a replacement string is not a literal.
  return shell.replace(MOUNT_POINT, () => `<div id="app">${body}</div>`)
}

/** Crawlable internal links, appended to every baked body. */
export function renderSiteNav(links: readonly NavLink[]): string {
  return [
    '<nav aria-label="Site">',
    '<ul>',
    ...links.map((link) => `<li>${anchor(link.href, link.label)}</li>`),
    '</ul>',
    '</nav>',
  ].join('\n')
}

/**
 * One home section: an h2, its intro, then an h3 and a paragraph per item.
 *
 * An item's link rides inside its paragraph, after the text, which is also
 * where HomePage.vue puts it — a crawler and a reader get the same sentence
 * with the same link at the end of it.
 */
function homeSection(section: HomeSection): string {
  const items = section.items.flatMap((item) => [
    `<h3>${escapeHtml(item.title)}</h3>`,
    item.link === undefined
      ? `<p>${escapeHtml(item.text)}</p>`
      : `<p>${escapeHtml(item.text)} ${anchor(item.link.href, item.link.label)}</p>`,
  ])

  return [
    `<section id="${escapeHtml(section.id)}">`,
    `<h2>${escapeHtml(section.heading)}</h2>`,
    section.intro === undefined ? '' : `<p>${escapeHtml(section.intro)}</p>`,
    ...items,
    '</section>',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

/**
 * The home page: the hero, then the sections that follow the playground.
 *
 * The playground itself is not baked — it is the app — so with no sections the
 * body is the hero alone, which is what the page was before it had any.
 */
export function renderHomeBody(hero: HeroCopy, sections: readonly HomeSection[] = []): string {
  const cta = hero.cta

  return wrap([
    `<h1>${hero.headline.map((line) => escapeHtml(line)).join('<br>')}</h1>`,
    `<p>${escapeHtml(hero.subtitle)}</p>`,
    cta === undefined ? '' : `<p>${anchor(cta.href, cta.label)}</p>`,
    cta?.note === undefined ? '' : `<p>${escapeHtml(cta.note)}</p>`,
    ...sections.map(homeSection),
  ])
}

export function renderPageBody(page: { heading: string; description: string }): string {
  return wrap([`<h1>${escapeHtml(page.heading)}</h1>`, `<p>${escapeHtml(page.description)}</p>`])
}

/** "$10/month", or the plan's own words where there is no amount to qualify. */
function priceLine(plan: PricingPlan): string {
  return `${plan.price}${plan.period ?? ''}`
}

/**
 * The pricing page, plan by plan.
 *
 * The cards are the page: baking the heading and the meta sentence alone left
 * every price, limit and client out of the HTML a crawler is served, on the one
 * page people search for by price. The copy arrives from src/content/pricing.ts,
 * which the Vue page reads too, so the two cannot say different numbers.
 */
export function renderPricingBody(input: {
  heading: string
  tagline: string
  plans: readonly PricingPlan[]
  note: string
}): string {
  const plans = input.plans.map((plan) =>
    [
      '<section>',
      `<h2>${escapeHtml(plan.name)}</h2>`,
      `<p>${escapeHtml(priceLine(plan))}</p>`,
      '<ul>',
      ...plan.features.map((feature) => `<li>${escapeHtml(featureText(feature))}</li>`),
      '</ul>',
      '</section>',
    ].join('\n'),
  )

  return wrap([
    `<h1>${escapeHtml(input.heading)}</h1>`,
    `<p>${escapeHtml(input.tagline)}</p>`,
    ...plans,
    `<p>${escapeHtml(input.note)}</p>`,
  ])
}

/** Privacy and terms: a heading plus markdown this module did not render. */
export function renderDocumentBody(heading: string, html: string): string {
  return wrap([`<h1>${escapeHtml(heading)}</h1>`, prose(html)])
}

export function renderBlogIndexBody(posts: BlogPost[]): string {
  const entries = publishedPosts(posts).map((post) =>
    [
      '<article>',
      `<h2>${anchor(`/blog/${post.slug}`, post.title)}</h2>`,
      dateLine(post.date),
      `<p>${escapeHtml(post.description)}</p>`,
      '</article>',
    ].join('\n'),
  )

  return wrap([
    `<h1>${escapeHtml(BLOG_TITLE)}</h1>`,
    `<p>${escapeHtml(BLOG_DESCRIPTION)}</p>`,
    `<p>${anchor('/rss.xml', 'RSS')}</p>`,
    ...entries,
  ])
}

/**
 * "Series name · Part 2 of 3", worded and counted the way BlogPostPage does it:
 * position among the published parts, not the raw `part` number, so an
 * unpublished part cannot make the baked line disagree with the live one.
 */
function seriesLine(post: BlogPost, others: BlogPost[]): string {
  if (post.series === undefined) return ''

  const parts = publishedPosts([post, ...others.filter((other) => other.slug !== post.slug)])
    .filter((candidate) => candidate.series === post.series)
    .sort((a, b) => (a.part ?? 0) - (b.part ?? 0))
  const position = parts.findIndex((candidate) => candidate.slug === post.slug) + 1

  return `<p>${escapeHtml(`${post.series} · Part ${position} of ${parts.length}`)}</p>`
}

export function renderPostBody(input: {
  post: BlogPost
  html: string
  others: BlogPost[]
}): string {
  const { post, html, others } = input

  const series = seriesLine(post, others)

  // publishedPosts drops drafts and orders newest first; the post itself would
  // otherwise link to the page the reader is already on.
  const more = publishedPosts(others.filter((other) => other.slug !== post.slug))
  const moreNav =
    more.length === 0
      ? ''
      : [
          '<nav aria-label="More posts">',
          '<h2>More posts</h2>',
          '<ul>',
          ...more.map((other) => `<li>${anchor(`/blog/${other.slug}`, other.title)}</li>`),
          '</ul>',
          '</nav>',
        ].join('\n')

  return wrap([
    '<article>',
    `<p>${anchor('/blog', '← All posts')}</p>`,
    dateLine(post.date, post.updated),
    `<h1>${escapeHtml(post.title)}</h1>`,
    series,
    prose(html),
    moreNav,
    '</article>',
  ])
}
