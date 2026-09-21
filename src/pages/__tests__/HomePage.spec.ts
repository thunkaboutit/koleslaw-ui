import { beforeAll, describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import HomePage from '../HomePage.vue'
import { HOME_HERO } from '@/content/home'

/** The page observes its sections on mount, and jsdom has no observer. */
class NoopIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  globalThis.IntersectionObserver =
    NoopIntersectionObserver as unknown as typeof IntersectionObserver
})

function mountHome() {
  return shallowMount(HomePage, { global: { stubs: { EnhancePanel: true } } })
}

describe('HomePage hero', () => {
  it('renders one headline line per entry, still split by a line break', () => {
    const title = mountHome().get('.hero__title')

    expect(HOME_HERO.headline.length).toBeGreaterThan(1)
    expect(title.findAll('br')).toHaveLength(HOME_HERO.headline.length - 1)

    for (const line of HOME_HERO.headline) {
      expect(title.text()).toContain(line)
    }
  })

  it('renders the subtitle and the call to action from the shared copy', () => {
    const wrapper = mountHome()

    expect(wrapper.get('.hero__subtitle').text()).toBe(HOME_HERO.subtitle)
    expect(wrapper.get('.hero__cta-btn').text()).toBe(HOME_HERO.cta.label)
    expect(wrapper.get('.hero__cta-note').text()).toBe(HOME_HERO.cta.note)
  })
})
