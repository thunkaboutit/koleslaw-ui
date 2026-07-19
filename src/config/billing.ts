/* Stripe URLs are public (they ship in the bundle regardless).
   TEST-MODE values until billing E2E passes — swap for live-mode URLs at
   the live flip (workspace docs/stripe-billing-plan.md, Phase E). */

// Payment Link for Koleslaw Pro ($10/mo).
export const PRO_PAYMENT_LINK_URL = 'https://buy.stripe.com/test_28E28ldis67g9htc2AbII00'

// No-code Stripe Customer Portal login (email magic-link auth).
export const BILLING_PORTAL_LOGIN_URL =
  'https://billing.stripe.com/p/login/test_eVqfZbbakcvE51d1nWbII01'

/* client_reference_id ties the checkout to the signed-in user — the billing
   webhook maps it back to users.id when flipping the plan to pro. */
export function proCheckoutUrl(userId: string, email: string): string {
  if (!PRO_PAYMENT_LINK_URL) return ''
  const url = new URL(PRO_PAYMENT_LINK_URL)
  url.searchParams.set('client_reference_id', userId)
  url.searchParams.set('prefilled_email', email)
  return url.toString()
}
