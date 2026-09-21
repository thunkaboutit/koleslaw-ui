import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
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

describe('HomePage mascot', () => {
  /**
   * An <img> with no width and height reserves no room until the file arrives,
   * and this one is a 700 KB SVG above the fold: everything under it jumps when
   * it lands. The attributes only have to carry the right RATIO (the stylesheet
   * still sizes the box), so they are held to the drawing's own dimensions.
   */
  it('declares the intrinsic size of the drawing, so the layout reserves its space', () => {
    // jsdom resolves `new URL(relative, import.meta.url)` against the document.
    const here = dirname(fileURLToPath(import.meta.url))
    const svg = readFileSync(resolve(here, '../../assets/koleslaw-logo-mascot-woof.svg'), 'utf8')
    const intrinsic = /<svg[^>]*\swidth="(\d+)"[^>]*\sheight="(\d+)"/.exec(svg)

    const mascot = mountHome().get('img.hero__mascot')

    expect(intrinsic).not.toBeNull()
    expect(mascot.attributes('width')).toBe(intrinsic?.[1])
    expect(mascot.attributes('height')).toBe(intrinsic?.[2])
  })
})
