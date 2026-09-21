import { STATIC_PAGES, pageUrl, staticPage, type StaticPage } from '../src/config/pages'
import { BLOG_TITLE, CHROME_STORE_URL, postUrl } from '../src/config/site'
import { HOME_HERO } from '../src/content/home'
import { PRICING_NOTE, PRICING_PLANS, PRICING_TAGLINE } from '../src/content/pricing'
import { buildPage, publishedPosts, type BlogPost, type PageMeta } from './blog-render'
import {
  injectBody,
  renderBlogIndexBody,
  renderDocumentBody,
  renderHomeBody,
  renderPageBody,
  renderPostBody,
  renderPricingBody,
  renderSiteNav,
  type NavLink,
} from './body-render'
import {
  blogNode,
  blogPostingNode,
  breadcrumbNode,
  organizationNode,
  renderJsonLd,
  softwareApplicationNode,
  websiteNode,
  type JsonLdNode,
} from './json-ld'

/**
 * Decides what every public URL is baked with: which head, which structured
 * data, which body, and which file it lands in.
 *
 * blog-render.ts knows meta tags, json-ld.ts knows schema.org and body-render.ts
 * knows markup; none of them knows the site. This is the one place that does,
 * and it is still pure — everything that needs a disk or a markdown engine
 * arrives through SiteSources, so the whole site map is testable without a build.
 *
 * Nothing here ever targets index.html. nginx serves that file for the authed
 * app routes and as the body of every 404, so it has to stay the neutral shell:
 * the home page is baked into home.html, which `location = /` prefers.
 */

/** A post with its raw markdown, which the bake needs and the feeds do not. */
export interface SourcePost extends BlogPost {
  body: string
}

/** Everything sitePages cannot work out for itself. */
export interface SiteSources {
  posts: SourcePost[]
  /** Raw policy markdown, as the app loads it. */
  documents: { terms: string; privacy: string }
  renderMarkdown: (raw: string) => string
  /** Absolute card URL for a declared image, or undefined when the art is not in the build. */
  resolveImage: (image: string | undefined) => string | undefined
}

export interface BakedPage {
  /** Path inside the build output. */
  file: string
  meta: PageMeta
  jsonLd: JsonLdNode[]
  body: string
}

/**
 * Appended to every baked body: a crawler that lands anywhere can reach every
 * public page, and the extension listing, without running a script.
 */
const SITE_NAV: NavLink[] = [
  ...STATIC_PAGES.map((page) => ({ href: page.path, label: page.heading })),
  { href: CHROME_STORE_URL, label: 'Chrome Extension' },
]

/** `/pricing` -> `pricing.html`, the name nginx's `$uri.html` looks for. */
function fileFor(page: StaticPage): string {
  return page.name === 'home' ? 'home.html' : `${page.path.slice(1)}.html`
}

function crumb(page: StaticPage): { name: string; url: string } {
  return { name: page.heading, url: pageUrl(page) }
}

/**
 * The policies open with their own "# Koleslaw — Privacy Policy" title. The page
 * already heads them, and a baked body gets exactly one h1.
 */
function withoutLeadingTitle(markdown: string): string {
  return markdown.replace(/^\s*# .*\r?\n/, '')
}

function withNav(body: string): string {
  return `${body}\n${renderSiteNav(SITE_NAV)}`
}

function staticBody(page: StaticPage, sources: SiteSources): string {
  switch (page.name) {
    case 'home':
      return renderHomeBody({
        ...HOME_HERO,
        cta: { ...HOME_HERO.cta, href: CHROME_STORE_URL },
      })
    case 'blog':
      return renderBlogIndexBody(sources.posts)
    case 'pricing':
      return renderPricingBody({
        heading: page.heading,
        tagline: PRICING_TAGLINE,
        plans: PRICING_PLANS,
        note: PRICING_NOTE,
      })
    case 'terms':
    case 'privacy':
      return renderDocumentBody(
        page.heading,
        sources.renderMarkdown(withoutLeadingTitle(sources.documents[page.name])),
      )
    default:
      return renderPageBody(page)
  }
}

/** The organization and the site ride along everywhere: every other node points at them. */
function staticJsonLd(page: StaticPage, sources: SiteSources): JsonLdNode[] {
  const shared = [organizationNode(), websiteNode()]

  switch (page.name) {
    case 'home':
      return [...shared, softwareApplicationNode(page.description)]
    case 'blog':
      return [
        ...shared,
        blogNode(sources.posts),
        breadcrumbNode([crumb(staticPage('home')), crumb(page)]),
      ]
    default:
      return [...shared, breadcrumbNode([crumb(staticPage('home')), crumb(page)])]
  }
}

function bakeStatic(page: StaticPage, sources: SiteSources): BakedPage {
  return {
    file: fileFor(page),
    meta: {
      title: page.title,
      description: page.description,
      canonical: pageUrl(page),
      image: sources.resolveImage(undefined),
      type: 'website',
    },
    jsonLd: staticJsonLd(page, sources),
    body: withNav(staticBody(page, sources)),
  }
}

function bakePost(post: SourcePost, sources: SiteSources): BakedPage {
  const image = sources.resolveImage(post.ogImage)

  return {
    file: `blog/${post.slug}.html`,
    meta: {
      title: `${post.title} — ${BLOG_TITLE}`,
      description: post.description,
      canonical: postUrl(post.slug),
      image,
      type: 'article',
      publishedTime: post.date,
    },
    jsonLd: [
      organizationNode(),
      websiteNode(),
      // The posting says it isPartOf the blog, so the blog is declared here too,
      // but without its post list: those stubs would read as extra, thinner
      // articles on a page that is about exactly one.
      blogNode([]),
      blogPostingNode(post, image),
      breadcrumbNode([
        crumb(staticPage('home')),
        crumb(staticPage('blog')),
        { name: post.title, url: postUrl(post.slug) },
      ]),
    ],
    body: withNav(
      renderPostBody({
        post,
        html: sources.renderMarkdown(post.body),
        others: sources.posts,
      }),
    ),
  }
}

/**
 * Every page the build bakes: the registry's pages, then one per published post.
 *
 * Drafts are dropped here, up front, so a draft has no page and cannot reach a
 * list, a nav or a graph on anyone else's.
 */
export function sitePages(sources: SiteSources): BakedPage[] {
  const posts = publishedPosts(sources.posts) as SourcePost[]
  const published = { ...sources, posts }

  return [
    ...STATIC_PAGES.map((page) => bakeStatic(page, published)),
    ...posts.map((post) => bakePost(post, published)),
  ]
}

/** One baked page as the HTML file that ships. */
export function bakePage(shell: string, page: BakedPage): string {
  return injectBody(buildPage(shell, page.meta, renderJsonLd(page.jsonLd)), page.body)
}
