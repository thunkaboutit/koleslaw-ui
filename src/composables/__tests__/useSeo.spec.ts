import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { usePageSeo, useSeo, type SeoTags } from '../useSeo'
import { staticPage } from '@/config/pages'
import { SITE_TITLE } from '@/config/site'

function seo(overrides: Partial<SeoTags> = {}): SeoTags {
  return {
    title: 'A page about slaw',
    description: 'What this particular page has to say.',
    canonical: 'https://koleslaw.ai/slaw',
    ...overrides,
  }
}

/** A component that exists only to give the composable a real lifecycle. */
function mountWith(setup: () => void) {
  return mount(defineComponent({ setup, render: () => h('div') }))
}

function metas(attr: 'name' | 'property', key: string): HTMLMetaElement[] {
  return [...document.head.querySelectorAll<HTMLMetaElement>(`meta[${attr}="${key}"]`)]
}

function content(attr: 'name' | 'property', key: string): string | undefined {
  return metas(attr, key)[0]?.content
}

function canonical(): HTMLLinkElement | null {
  return document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
}

/**
 * A tag as the build-time generator leaves it in the static HTML: correct
 * content, and no data-seo marker, because nothing in the app put it there.
 */
function bake(attr: 'name' | 'property', key: string, value: string): HTMLMetaElement {
  const tag = document.createElement('meta')
  tag.setAttribute(attr, key)
  tag.content = value
  document.head.appendChild(tag)
  return tag
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.title = SITE_TITLE
})

describe('useSeo', () => {
  it('fills the head from the tags it is given', () => {
    mountWith(() => useSeo(seo()))

    expect(document.title).toBe('A page about slaw')
    expect(canonical()?.href).toBe('https://koleslaw.ai/slaw')
    expect(content('name', 'description')).toBe('What this particular page has to say.')

    expect(content('property', 'og:site_name')).toBe('Koleslaw')
    expect(content('property', 'og:title')).toBe('A page about slaw')
    expect(content('property', 'og:description')).toBe('What this particular page has to say.')
    expect(content('property', 'og:url')).toBe('https://koleslaw.ai/slaw')
    expect(content('property', 'og:type')).toBe('website')

    expect(content('name', 'twitter:card')).toBe('summary_large_image')
    expect(content('name', 'twitter:title')).toBe('A page about slaw')
    expect(content('name', 'twitter:description')).toBe('What this particular page has to say.')
  })

  it('makes the social card absolute', () => {
    mountWith(() => useSeo(seo()))

    expect(content('property', 'og:image')).toBe('https://koleslaw.ai/og/default.png')
    expect(content('name', 'twitter:image')).toBe('https://koleslaw.ai/og/default.png')
  })

  it('updates a baked tag rather than adding a second one', () => {
    const description = bake('name', 'description', 'The baked description.')
    const link = document.createElement('link')
    link.rel = 'canonical'
    link.href = 'https://koleslaw.ai/baked'
    document.head.appendChild(link)

    mountWith(() => useSeo(seo()))

    expect(metas('name', 'description')).toHaveLength(1)
    expect(description.content).toBe('What this particular page has to say.')
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1)
    expect(link.href).toBe('https://koleslaw.ai/slaw')
  })

  it('removes only its own tags on unmount', () => {
    const description = bake('name', 'description', 'The baked description.')
    const wrapper = mountWith(() => useSeo(seo()))

    wrapper.unmount()

    expect(metas('name', 'description')).toEqual([description])
    expect(metas('property', 'og:title')).toEqual([])
    expect(metas('name', 'twitter:title')).toEqual([])
    expect(canonical()).toBeNull()
  })

  it('hands the title back to the site on unmount', () => {
    const wrapper = mountWith(() => useSeo(seo()))

    wrapper.unmount()

    expect(document.title).toBe(SITE_TITLE)
  })
})

describe('usePageSeo', () => {
  it('publishes the registry entry for the named page', () => {
    mountWith(() => usePageSeo('pricing'))

    expect(document.title).toBe(staticPage('pricing').title)
    expect(content('name', 'description')).toBe(staticPage('pricing').description)
    expect(canonical()?.href).toBe('https://koleslaw.ai/pricing')
    expect(content('property', 'og:url')).toBe('https://koleslaw.ai/pricing')
  })

  it('keeps the trailing slash on the home canonical', () => {
    mountWith(() => usePageSeo('home'))

    expect(document.title).toBe(SITE_TITLE)
    expect(canonical()?.href).toBe('https://koleslaw.ai/')
  })
})
