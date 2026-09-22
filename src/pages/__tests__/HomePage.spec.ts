import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RouterLinkStub, shallowMount } from '@vue/test-utils'
import HomePage from '../HomePage.vue'
import { HOME_HERO, HOME_SECTIONS } from '@/content/home'

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
  return shallowMount(HomePage, {
    global: { stubs: { EnhancePanel: true, RouterLink: RouterLinkStub } },
  })
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

/**
 * The build bakes HOME_SECTIONS into home.html for crawlers; the app renders
 * the same data here. These hold the rendered side to it, so a heading or a
 * link that exists in one and not the other fails rather than drifts.
 */
describe('HomePage content sections', () => {
  it('renders every section under the playground, in order, by id', () => {
    const sections = mountHome().findAll('section.content')

    expect(HOME_SECTIONS.length).toBeGreaterThan(0)
    expect(sections.map((section) => section.attributes('id'))).toEqual(
      HOME_SECTIONS.map((section) => section.id),
    )
    expect(sections.map((section) => section.get('h2').text())).toEqual(
      HOME_SECTIONS.map((section) => section.heading),
    )
  })

  it('renders each item as a titled paragraph with its text, under the intro', () => {
    const wrapper = mountHome()

    for (const section of HOME_SECTIONS) {
      const rendered = wrapper.get(`section#${section.id}`)
      const intro = rendered.find('.content__intro')

      expect(rendered.findAll('h3').map((title) => title.text())).toEqual(
        section.items.map((item) => item.title),
      )
      expect(section.items.filter((item) => !rendered.text().includes(item.text))).toEqual([])
      expect(intro.exists() ? intro.text() : undefined).toBe(section.intro)
    }
  })

  it('routes site paths in-app and opens everything else in a new tab', () => {
    const wrapper = mountHome()
    const links = HOME_SECTIONS.flatMap((section) =>
      section.items.flatMap((item) => (item.link === undefined ? [] : [item.link])),
    )

    expect(wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))).toEqual(
      links.filter((link) => link.href.startsWith('/')).map((link) => link.href),
    )
    expect(
      wrapper.findAll('section.content a[target="_blank"]').map((link) => link.attributes('href')),
    ).toEqual(links.filter((link) => !link.href.startsWith('/')).map((link) => link.href))
    expect(
      wrapper.findAll('section.content a[target="_blank"]').map((link) => link.attributes('rel')),
    ).toEqual(links.filter((link) => !link.href.startsWith('/')).map(() => 'noopener'))
  })

  it('renders each link with the label the copy gives it', () => {
    const wrapper = mountHome()
    const missing = HOME_SECTIONS.flatMap((section) => {
      const text = wrapper.get(`section#${section.id}`).text()

      return section.items.flatMap((item) =>
        item.link === undefined || text.includes(item.link.label) ? [] : [item.link.label],
      )
    })

    expect(missing).toEqual([])
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
