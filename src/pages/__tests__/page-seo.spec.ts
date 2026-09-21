import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Component } from 'vue'
import BlogIndexPage from '../BlogIndexPage.vue'
import ContactPage from '../ContactPage.vue'
import HomePage from '../HomePage.vue'
import PricingPage from '../PricingPage.vue'
import PrivacyPolicyPage from '../PrivacyPolicyPage.vue'
import TermsOfServicePage from '../TermsOfServicePage.vue'
import { pageUrl, staticPage, type PageName } from '@/config/pages'

/**
 * Every public page, against its registry entry. A page that forgets to call
 * usePageSeo ships the bare shell head, which is the whole bug this registry
 * exists to close — so the check belongs on the pages, not just the composable.
 */
const PUBLIC_PAGES: [PageName, Component][] = [
  ['home', HomePage],
  ['blog', BlogIndexPage],
  ['pricing', PricingPage],
  ['contact', ContactPage],
  ['terms', TermsOfServicePage],
  ['privacy', PrivacyPolicyPage],
]

class NoopIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  globalThis.IntersectionObserver =
    NoopIntersectionObserver as unknown as typeof IntersectionObserver
})

beforeEach(() => {
  setActivePinia(createPinia())
  document.head.innerHTML = ''
  document.title = ''
})

describe('the public pages', () => {
  it.each(PUBLIC_PAGES)('takes the %s head from the registry', (name, component) => {
    const page = staticPage(name)

    shallowMount(component, { global: { stubs: { RouterLink: true } } })

    expect(document.title).toBe(page.title)
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      pageUrl(page),
    )
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(
      page.description,
    )
  })

  /**
   * The build bakes `heading` into the static HTML as the page's h1. These four
   * pages show it themselves, so the two can only agree if the template reads
   * the registry rather than spelling the words out a second time.
   */
  it.each(['pricing', 'contact', 'terms', 'privacy'] as const)(
    'heads the %s page with the registry heading',
    (name) => {
      const component = PUBLIC_PAGES.find(([candidate]) => candidate === name)?.[1]

      const wrapper = shallowMount(component as Component, {
        global: { stubs: { RouterLink: true } },
      })

      expect(wrapper.get('h1').text()).toBe(staticPage(name).heading)
    },
  )
})
