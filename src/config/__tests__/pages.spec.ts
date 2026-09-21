import { describe, expect, it } from 'vitest'
import router from '@/router'
import { pageUrl, staticPage, STATIC_PAGES, type PageName } from '../pages'
import { BLOG_DESCRIPTION, BLOG_TITLE, SITE_NAME, SITE_TITLE } from '../site'

/** Google truncates a snippet well short of 160, and ignores one under ~50. */
const DESCRIPTION_MIN = 50
const DESCRIPTION_MAX = 160

function duplicates(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index)
}

describe('STATIC_PAGES', () => {
  it('lists every public page once, in navigation order', () => {
    expect(STATIC_PAGES.map((page) => page.name)).toEqual([
      'home',
      'blog',
      'pricing',
      'contact',
      'terms',
      'privacy',
    ])
  })

  it('keeps names, paths and titles unique', () => {
    expect(duplicates(STATIC_PAGES.map((page) => page.name))).toEqual([])
    expect(duplicates(STATIC_PAGES.map((page) => page.path))).toEqual([])
    expect(duplicates(STATIC_PAGES.map((page) => page.title))).toEqual([])
  })

  it('writes every description to fit a search result', () => {
    for (const page of STATIC_PAGES) {
      expect(page.description.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN)
      expect(page.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    }
  })

  it('takes the shell and blog strings from the site constants', () => {
    expect(staticPage('home').title).toBe(SITE_TITLE)
    expect(staticPage('blog').title).toBe(`${BLOG_TITLE} — koleslaw.ai`)
    expect(staticPage('blog').description).toBe(BLOG_DESCRIPTION)
  })

  it('names the heading each page shows, which is also its label in the baked site nav', () => {
    expect(STATIC_PAGES.map((page) => page.heading)).toEqual([
      SITE_NAME,
      BLOG_TITLE,
      'Pricing',
      'Contact Us',
      'Terms of Service',
      'Privacy Policy',
    ])
  })

  it('carries no trailing slash on any path but the root', () => {
    const paths = STATIC_PAGES.map((page) => page.path)

    expect(paths.filter((path) => !path.startsWith('/'))).toEqual([])
    expect(paths.filter((path) => path !== '/' && path.endsWith('/'))).toEqual([])
  })
})

describe('pageUrl', () => {
  it('gives the root a trailing slash', () => {
    expect(pageUrl(staticPage('home'))).toBe('https://koleslaw.ai/')
  })

  it('gives every other page an absolute URL without one', () => {
    expect(pageUrl(staticPage('pricing'))).toBe('https://koleslaw.ai/pricing')
    expect(pageUrl(staticPage('blog'))).toBe('https://koleslaw.ai/blog')

    const urls = STATIC_PAGES.filter((page) => page.name !== 'home').map(pageUrl)

    expect(urls.filter((url) => url.endsWith('/'))).toEqual([])
  })
})

describe('staticPage', () => {
  it('returns the registry entry', () => {
    expect(staticPage('contact')).toBe(STATIC_PAGES.find((page) => page.name === 'contact'))
  })

  it('throws on a name that is not in the registry', () => {
    expect(() => staticPage('nope' as PageName)).toThrow(/nope/)
  })
})

describe('the registry against the router', () => {
  /**
   * The registry drives canonicals and the sitemap, so a path that no longer
   * routes — or one the router stopped treating as public — would publish a
   * link into an auth redirect. Catch that here rather than in production.
   */
  it('names a public route for every page', () => {
    const publicPaths = router
      .getRoutes()
      .filter((route) => route.meta.public === true)
      .map((route) => route.path)

    for (const page of STATIC_PAGES) {
      expect(publicPaths).toContain(page.path)
    }
  })
})
