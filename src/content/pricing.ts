/**
 * The plans the pricing page sells.
 *
 * Out of the component because three readers need the same facts: the page, the
 * prerendered body the build bakes for crawlers, and the Offer nodes in the
 * structured data. Copy that only exists in a template is copy the other two
 * have to repeat, and a price repeated in three files is a price that will be
 * changed in two. Same isomorphic rules as the page registry — plain data,
 * relative imports, nothing Vite-only.
 */

export interface PlanFeature {
  /** Emphasised lead-in, rendered <strong> in the app ("500"). */
  lead?: string
  text: string
}

export interface PricingPlan {
  name: string
  /** What the card shows: '$0', '$10', or the no-price line "Let's talk". */
  price: string
  /** '/month' for the priced plans; undefined where there is no price. */
  period?: string
  /** USD amount for structured data; undefined when the plan has no public price. */
  amount?: string
  /** Pro's highlighted card. */
  featured?: boolean
  features: readonly PlanFeature[]
}

/**
 * One feature as plain text, for the readers that cannot show a <strong>: the
 * baked body and the Offer descriptions. Here rather than in either of them so
 * the two can never word the same line differently.
 */
export function featureText(feature: PlanFeature): string {
  return `${feature.lead ?? ''}${feature.text}`
}

export const PRICING_TAGLINE = 'Start free. Upgrade when you outgrow the limits.'

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    amount: '0',
    features: [
      { text: '50 enhances/day per API key' },
      { text: '60 requests/min' },
      { text: 'VS Code, JetBrains, Chrome & Claude Code clients' },
      { text: 'Community support' },
    ],
  },
  {
    name: 'Pro',
    price: '$10',
    period: '/month',
    amount: '10.00',
    featured: true,
    features: [
      { lead: '500', text: ' enhances/day per API key' },
      { text: '60 requests/min' },
      { text: 'All clients + direct API access' },
      { text: 'Priority support' },
      { text: 'Cancel anytime' },
    ],
  },
  {
    name: 'Teams',
    price: "Let's talk",
    features: [
      { text: 'House prompt structure for the whole team' },
      { text: 'Per-developer usage attribution' },
      { text: 'SSO & admin controls' },
      { text: 'Custom limits & SLAs' },
    ],
  },
]

export const PRICING_NOTE =
  'The playground on the home page stays free for everyone — 10 enhances/day, no account needed.'
