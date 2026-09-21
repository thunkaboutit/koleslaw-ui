import { describe, expect, it } from 'vitest'
import { PRICING_PLANS, featureText, type PricingPlan } from '../pricing'
import { staticPage } from '@/config/pages'

/** The plans with a price to state; Teams talks instead of quoting one. */
const PRICED = PRICING_PLANS.filter((plan) => plan.amount !== undefined)

/** The "50" out of "50 enhances/day per API key", whichever side of the lead-in it sits. */
function dailyLimit(plan: PricingPlan): string {
  const line = plan.features.map(featureText).find((text) => text.includes('enhances/day'))
  const limit = line?.match(/\d+/)?.[0]

  if (limit === undefined) throw new Error(`No daily enhance limit in the ${plan.name} plan`)

  return limit
}

describe('featureText', () => {
  it('reads the lead-in and the rest of the line as one sentence', () => {
    expect(featureText({ lead: '500', text: ' enhances/day per API key' })).toBe(
      '500 enhances/day per API key',
    )
    expect(featureText({ text: '60 requests/min' })).toBe('60 requests/min')
  })
})

describe('the pricing meta description', () => {
  /**
   * The registry sentence is written prose and stays written prose — nothing
   * generates it. But it is the line search results quote, so a limit or a
   * price that the plans changed and the sentence did not is a lie in public.
   * This is the only thing standing between those two files.
   */
  it('states every number the priced plans advertise', () => {
    const description = staticPage('pricing').description
    const facts = [
      ...PRICED.map(dailyLimit),
      ...PRICED.filter((plan) => Number(plan.amount) > 0).map((plan) => plan.price),
    ]
    const unstated = facts
      .filter((fact) => !description.includes(fact))
      .map((fact) => `${fact} — say it in the pricing description in src/config/pages.ts`)

    expect(unstated).toEqual([])
  })
})
