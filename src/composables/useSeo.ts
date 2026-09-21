import { onBeforeUnmount, watchEffect, type MaybeRefOrGetter, toValue } from 'vue'
import { pageUrl, staticPage, type PageName, type StaticPage } from '@/config/pages'
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_TITLE, SITE_URL } from '@/config/site'

export interface SeoTags {
  title: string
  description: string
  /** Absolute canonical URL. */
  canonical: string
  /** Site-root-relative or absolute image path. */
  image?: string
  /** Open Graph type, e.g. 'article' for posts. */
  type?: string
  /** ISO date, emitted as article:published_time. */
  publishedTime?: string
  /** ISO date of the last declared edit, emitted as article:modified_time. */
  modifiedTime?: string
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  const selector = `meta[${attr}="${key}"]`
  let tag = document.head.querySelector<HTMLMetaElement>(selector)

  if (tag === null) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    tag.dataset['seo'] = 'managed'
    document.head.appendChild(tag)
  }

  tag.setAttribute('content', content)
}

function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (link === null) {
    link = document.createElement('link')
    link.rel = 'canonical'
    link.dataset['seo'] = 'managed'
    document.head.appendChild(link)
  }

  link.href = href
}

/**
 * Keep the document head in sync with the current route.
 *
 * The build-time generator in plugins/blog-static.ts bakes these same tags
 * into each post's static HTML, which is what link unfurlers and crawlers
 * read. This composable covers client-side navigation, so an in-app move
 * between posts leaves the head saying the same thing a cold load would.
 */
export function useSeo(tags: MaybeRefOrGetter<SeoTags>): void {
  watchEffect(() => {
    const {
      title,
      description,
      canonical,
      image = DEFAULT_OG_IMAGE,
      type = 'website',
      publishedTime,
      modifiedTime,
    } = toValue(tags)

    const absoluteImage = image.startsWith('http') ? image : `${SITE_URL}${image}`

    document.title = title
    upsertCanonical(canonical)
    upsertMeta('name', 'description', description)

    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:image', absoluteImage)
    upsertMeta('property', 'og:type', type)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', absoluteImage)

    if (publishedTime !== undefined) {
      upsertMeta('property', 'article:published_time', publishedTime)
    }

    if (modifiedTime !== undefined) {
      upsertMeta('property', 'article:modified_time', modifiedTime)
    }
  })

  // Leaving the blog must not strand a post's tags on the rest of the app.
  onBeforeUnmount(() => {
    document.title = SITE_TITLE
    document.head.querySelectorAll('[data-seo="managed"]').forEach((node) => node.remove())
  })
}

/**
 * The same, for a page whose head lives in the static registry.
 *
 * Pages call this instead of spelling their own strings out, so the tags the
 * SPA sets and the tags baked into the static HTML come from one entry and
 * cannot drift apart. Hands the entry back so a page can show its `heading`
 * without a second lookup.
 */
export function usePageSeo(name: PageName): StaticPage {
  const page = staticPage(name)

  useSeo({
    title: page.title,
    description: page.description,
    canonical: pageUrl(page),
  })

  return page
}
