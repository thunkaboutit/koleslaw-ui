import { beforeEach, describe, expect, it } from 'vitest'
import { RouterLinkStub, shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PricingPage from '../PricingPage.vue'
import { BILLING_PORTAL_LOGIN_URL } from '@/config/billing'
import { PRICING_NOTE, PRICING_PLANS, PRICING_TAGLINE, featureText } from '@/content/pricing'
import { useAuthStore } from '@/stores/auth'

/**
 * The cards and the body the build bakes for crawlers are the same copy read
 * twice, so everything a card says has to come out of PRICING_PLANS. The calls
 * to action are the deliberate exception — they depend on who is signed in and
 * on Stripe, so they stay in the template and are asserted as written.
 */
function mountPricing() {
  return shallowMount(PricingPage, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

function cardFor(wrapper: ReturnType<typeof mountPricing>, tier: string) {
  const card = wrapper
    .findAll('.pricing__card')
    .find((candidate) => candidate.get('.pricing__tier').text() === tier)

  if (card === undefined) throw new Error(`No ${tier} card on the page`)

  return card
}

function signIn(plan: string): void {
  useAuthStore().user = {
    id: 'u_1',
    email: 'cp@example.com',
    name: 'cp',
    oauth_provider: 'github',
    created_at: '2026-01-01T00:00:00Z',
    plan,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('the pricing cards', () => {
  it('renders one card per plan, named and priced by the data', () => {
    const cards = mountPricing().findAll('.pricing__card')

    expect(cards).toHaveLength(PRICING_PLANS.length)
    expect(cards.map((card) => card.get('.pricing__tier').text())).toEqual(
      PRICING_PLANS.map((plan) => plan.name),
    )
    expect(cards.map((card) => card.get('.pricing__price').text())).toEqual(
      PRICING_PLANS.map((plan) => `${plan.price}${plan.period ?? ''}`),
    )
  })

  it('sets the period apart from the amount, and only where there is one', () => {
    const cards = mountPricing().findAll('.pricing__card')

    expect(cards.map((card) => card.find('.pricing__period').exists())).toEqual(
      PRICING_PLANS.map((plan) => plan.period !== undefined),
    )
    expect(cardFor(mountPricing(), 'Pro').get('.pricing__period').text()).toBe('/month')
  })

  it('shrinks the price line of the plan that quotes no price', () => {
    const talk = mountPricing().findAll('.pricing__price--talk')

    expect(talk).toHaveLength(1)
    expect(talk[0]?.text()).toBe("Let's talk")
  })

  it('highlights Pro and nothing else', () => {
    const featured = mountPricing().findAll('.pricing__card--featured')

    expect(featured).toHaveLength(1)
    expect(featured[0]?.get('.pricing__tier').text()).toBe('Pro')
  })

  it('lists every feature line each plan declares', () => {
    const cards = mountPricing().findAll('.pricing__card')

    expect(
      cards.map((card) => card.findAll('.pricing__features li').map((item) => item.text())),
    ).toEqual(PRICING_PLANS.map((plan) => plan.features.map(featureText)))
  })

  it('keeps the emphasis on the lead-in of a feature that has one', () => {
    const wrapper = mountPricing()

    expect(cardFor(wrapper, 'Pro').get('.pricing__features li strong').text()).toBe('500')
    expect(cardFor(wrapper, 'Free').find('.pricing__features strong').exists()).toBe(false)
  })

  it('renders the tagline and the playground note', () => {
    const wrapper = mountPricing()

    expect(wrapper.get('.pricing__sub').text()).toBe(PRICING_TAGLINE)
    expect(wrapper.get('.pricing__note').text()).toBe(PRICING_NOTE)
  })
})

describe('the pricing calls to action', () => {
  it('asks a signed-out visitor to sign up, to sign in, or to talk', () => {
    const links = mountPricing().findAllComponents(RouterLinkStub)

    expect(links.map((link) => link.props('to'))).toEqual(['/signup', '/login', '/contact'])
    expect(links.map((link) => link.text())).toEqual([
      'Create a free account',
      'Sign in to upgrade',
      'Talk to us',
    ])
    expect(links[1]?.classes()).toContain('pricing__cta--primary')
  })

  it('sends a signed-in free user to their keys and to checkout', () => {
    signIn('free')
    const wrapper = mountPricing()
    const upgrade = cardFor(wrapper, 'Pro').get('a[href]')

    expect(wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))).toEqual([
      '/keys',
      '/contact',
    ])
    expect(cardFor(wrapper, 'Free').findComponent(RouterLinkStub).text()).toBe('Create an API key')
    expect(upgrade.text()).toBe('Upgrade to Pro')
    expect(upgrade.attributes('href')).toContain('client_reference_id=u_1')
    expect(upgrade.classes()).toContain('pricing__cta--primary')
  })

  it('tells a subscriber they are on Pro and opens the billing portal', () => {
    signIn('pro')
    const pro = cardFor(mountPricing(), 'Pro')
    const portal = pro.get('a[href]')

    expect(pro.get('.pricing__current').text()).toBe("You're on Pro ✓")
    expect(portal.text()).toBe('Manage billing')
    expect(portal.attributes('href')).toBe(BILLING_PORTAL_LOGIN_URL)
    expect(portal.attributes('target')).toBe('_blank')
    expect(portal.attributes('rel')).toBe('noopener')
  })
})
