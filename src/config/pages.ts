import { BLOG_DESCRIPTION, BLOG_TITLE, SITE_NAME, SITE_TITLE, SITE_URL } from './site'

/**
 * Head data for every public static page.
 *
 * One registry so a page's title and description cannot say one thing in the
 * SPA and another in the HTML a crawler is served: the app reads it through
 * usePageSeo, and the build-time generator reads it to bake the same tags and
 * to derive the sitemap. That shared use is why this file stays plain data
 * with relative imports — vite.config.ts is bundled for Node, where the `@/`
 * alias and anything Vite-specific do not resolve.
 */

export type PageName = 'home' | 'blog' | 'pricing' | 'contact' | 'terms' | 'privacy'

export interface StaticPage {
  name: PageName
  /** Router path. No trailing slash, except the root itself. */
  path: string
  title: string
  description: string
  /**
   * The page's visible h1. The build bakes it into the static HTML and labels
   * the baked site nav with it; pricing, contact, terms and privacy render it
   * too, so what a crawler reads and what a person sees is one string.
   */
  heading: string
}

export const STATIC_PAGES: readonly StaticPage[] = [
  {
    name: 'home',
    path: '/',
    title: SITE_TITLE,
    description:
      'Koleslaw turns a rough prompt into a clear, well-structured one before you send it to an AI model. Try it here, or in place on ChatGPT, Claude, and Gemini.',
    heading: SITE_NAME,
  },
  {
    name: 'blog',
    path: '/blog',
    // The blog's own name already carries the brand, so it takes no
    // "— Koleslaw" suffix: "The Koleslaw Blog — Koleslaw" says it twice.
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    heading: BLOG_TITLE,
  },
  {
    name: 'pricing',
    path: '/pricing',
    title: 'Pricing — Koleslaw',
    description:
      'Koleslaw is free for 50 prompt enhancements a day per API key. Pro is $10 a month for 500 a day. The playground needs no account at all.',
    heading: 'Pricing',
  },
  {
    name: 'contact',
    path: '/contact',
    title: 'Contact — Koleslaw',
    description:
      'Questions, bug reports, and feedback about Koleslaw, the AI prompt enhancer built and run by Thunk About It.',
    heading: 'Contact Us',
  },
  {
    name: 'terms',
    path: '/terms',
    title: 'Terms of Service — Koleslaw',
    description:
      'The terms that govern your use of Koleslaw, the AI prompt enhancement service built and run by Thunk About It.',
    heading: 'Terms of Service',
  },
  {
    name: 'privacy',
    path: '/privacy',
    title: 'Privacy Policy — Koleslaw',
    description:
      'What Koleslaw collects, what happens to the prompts you send, who processes them, and how to delete your account and your data.',
    heading: 'Privacy Policy',
  },
]

/** The registry entry for `name`. Throws rather than returning a blank head. */
export function staticPage(name: PageName): StaticPage {
  const page = STATIC_PAGES.find((entry) => entry.name === name)

  if (page === undefined) {
    throw new Error(`No static page named "${name}"`)
  }

  return page
}

/**
 * The page's canonical URL.
 *
 * The root's path is already '/', so the home canonical keeps the trailing
 * slash crawlers expect on an origin and no other page picks one up.
 */
export function pageUrl(page: StaticPage): string {
  return `${SITE_URL}${page.path}`
}
