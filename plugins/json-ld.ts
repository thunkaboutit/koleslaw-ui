import {
  BLOG_DESCRIPTION,
  BLOG_TITLE,
  CHROME_STORE_URL,
  SITE_NAME,
  SITE_URL,
  postUrl,
} from '../src/config/site'
import { publishedPosts, type BlogPost } from './blog-render'

/**
 * Pure builders for the schema.org nodes the site publishes, plus the renderer
 * that wraps them in one JSON-LD script block.
 *
 * Like blog-render.ts this may not import node:fs: it is bundled into
 * vite.config.ts by esbuild, and keeping it pure is what lets the tests be
 * about the output rather than about a filesystem.
 *
 * Nodes are emitted as a single `@graph` so the shared entities — the
 * organization, the site, the blog — are declared once per page and pointed at
 * by `@id` from everywhere else, instead of being repeated in every node.
 */

export type JsonLdNode = Record<string, unknown>

/** Stable node identities. Pages reference these; only one node declares each. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`
export const WEBSITE_ID = `${SITE_URL}/#website`
export const BLOG_ID = `${SITE_URL}/blog#blog`

/**
 * The publishing company. These facts live here because nothing else in the UI
 * needs them: the site is Koleslaw, the legal entity behind it is Thunk About
 * It, and the name always carries the "It".
 */
const ORGANIZATION_NAME = 'Thunk About It'
const ORGANIZATION_URL = 'https://thunkabout.it'
const ORGANIZATION_SAME_AS = [
  'https://github.com/thunkaboutit',
  'https://huggingface.co/thunkaboutit',
]

/** Everything the site publishes is in English; schema.org wants it per node. */
const LANGUAGE = 'en'

/**
 * The two plans with a price. The pricing page also shows Teams ("Let's talk"),
 * which has no price to state, and an Offer without one is worse than none.
 */
const OFFERS = [
  {
    '@type': 'Offer',
    name: 'Free',
    price: '0',
    priceCurrency: 'USD',
    description: '50 enhances a day per API key',
  },
  {
    '@type': 'Offer',
    name: 'Pro',
    price: '10.00',
    priceCurrency: 'USD',
    description: '500 enhances a day per API key, billed monthly',
  },
]

/** A pointer at a node declared elsewhere in the same graph. */
function ref(id: string): JsonLdNode {
  return { '@id': id }
}

export function organizationNode(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: ORGANIZATION_NAME,
    url: ORGANIZATION_URL,
    sameAs: ORGANIZATION_SAME_AS,
  }
}

export function websiteNode(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: LANGUAGE,
    publisher: ref(ORGANIZATION_ID),
  }
}

/**
 * The product itself, for the home page.
 *
 * No aggregateRating and no review: there are none to report, and inventing
 * them is the fastest route to a structured-data manual action.
 *
 * @param description The home page's meta description, which lives in another
 *                    module — injected so the two can never disagree.
 */
export function softwareApplicationNode(description: string): JsonLdNode {
  return {
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    installUrl: CHROME_STORE_URL,
    publisher: ref(ORGANIZATION_ID),
    offers: OFFERS,
  }
}

/**
 * The blog index, with a stub per post.
 *
 * Filters through publishedPosts rather than trusting the caller, for the same
 * reason the feed and the sitemap do: a draft must not be able to leak into a
 * crawlable artefact because someone forgot to filter.
 */
export function blogNode(posts: BlogPost[]): JsonLdNode {
  return {
    '@type': 'Blog',
    '@id': BLOG_ID,
    name: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    url: `${SITE_URL}/blog`,
    inLanguage: LANGUAGE,
    publisher: ref(ORGANIZATION_ID),
    blogPost: publishedPosts(posts).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: postUrl(post.slug),
      datePublished: post.date,
    })),
  }
}

/**
 * One post.
 *
 * The author is the organization, deliberately: the blog carries no personal
 * byline, and a Person node would be structured data the pages do not show.
 * There is no dateModified either — posts do not track one, and a guessed date
 * is worse than none.
 *
 * @param image Absolute card URL, or undefined. The key is omitted entirely
 *              when there is no art, mirroring how blog-render drops og:image.
 */
export function blogPostingNode(post: BlogPost, image: string | undefined): JsonLdNode {
  const url = postUrl(post.slug)

  return {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    url,
    mainEntityOfPage: url,
    inLanguage: LANGUAGE,
    isPartOf: ref(BLOG_ID),
    author: ref(ORGANIZATION_ID),
    publisher: ref(ORGANIZATION_ID),
    ...(post.tags.length === 0 ? {} : { keywords: post.tags.join(', ') }),
    ...(image === undefined ? {} : { image }),
  }
}

export function breadcrumbNode(trail: ReadonlyArray<{ name: string; url: string }>): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  }
}

/**
 * Post titles are author-controlled text that ends up inside a script element,
 * where the HTML parser — not the JSON parser — decides where the block ends.
 * A title containing `</script>` would close it and spill the rest onto the
 * page. Escaping the three characters that can start a tag or a comment as
 * \u escapes keeps the payload inert and still valid JSON: JSON.parse turns
 * them back into the original text.
 */
function escapeForScript(json: string): string {
  return json.replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
}

/**
 * One `<script type="application/ld+json">` block for a page's head, indented
 * to sit beside the meta tags blog-render injects. Empty list, empty string:
 * an empty graph is not worth a tag.
 *
 * The JSON stays minified. It is read by crawlers, never by people, and
 * pretty-printing it would add bytes to every page for nobody's benefit.
 */
export function renderJsonLd(nodes: JsonLdNode[]): string {
  if (nodes.length === 0) return ''

  const graph = JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes })

  return [
    '    <script type="application/ld+json">',
    `      ${escapeForScript(graph)}`,
    '    </script>',
  ].join('\n')
}
