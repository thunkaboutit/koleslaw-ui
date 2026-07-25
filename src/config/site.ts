/**
 * Canonical site identity.
 *
 * SITE_URL is the origin every canonical link, RSS entry, and sitemap URL is
 * built from. It is also what dev.to / Hashnode cross-posts point back to via
 * rel=canonical, so it must stay stable once the first post ships.
 */
export const SITE_URL = 'https://koleslaw.ai'

export const SITE_NAME = 'Koleslaw'

export const BLOG_TITLE = 'The Koleslaw Blog'

export const BLOG_DESCRIPTION =
  'Notes from running a fine-tuned 30B model in production: quantization, spot GPUs, failure design, and what it all costs.'

/** Fallback social card, used when a post declares no ogImage of its own. */
export const DEFAULT_OG_IMAGE = '/og/default.png'

/** Absolute URL for a blog post slug, with no trailing slash. */
export function postUrl(slug: string): string {
  return `${SITE_URL}/blog/${slug}`
}
