<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { BILLING_PORTAL_LOGIN_URL, proCheckoutUrl } from '@/config/billing'

const auth = useAuthStore()

const isPro = computed(() => auth.user?.plan === 'pro')
const checkoutUrl = computed(() => (auth.user ? proCheckoutUrl(auth.user.id, auth.user.email) : ''))
</script>

<template>
  <div class="pricing-page">
    <h1>Pricing</h1>
    <p class="pricing__sub">Start free. Upgrade when you outgrow the limits.</p>

    <div class="pricing__grid">
      <!-- Free -->
      <div class="pricing__card">
        <h2 class="pricing__tier">Free</h2>
        <p class="pricing__price">$0<span class="pricing__period">/month</span></p>
        <ul class="pricing__features">
          <li>50 enhances/day per API key</li>
          <li>60 requests/min</li>
          <li>VS Code, JetBrains, Chrome &amp; Claude Code clients</li>
          <li>Community support</li>
        </ul>
        <RouterLink v-if="!auth.user" to="/signup" class="pricing__cta pricing__cta--secondary"
          >Create a free account</RouterLink
        >
        <RouterLink v-else to="/keys" class="pricing__cta pricing__cta--secondary"
          >Create an API key</RouterLink
        >
      </div>

      <!-- Pro -->
      <div class="pricing__card pricing__card--featured">
        <h2 class="pricing__tier">Pro</h2>
        <p class="pricing__price">$10<span class="pricing__period">/month</span></p>
        <ul class="pricing__features">
          <li><strong>500</strong> enhances/day per API key</li>
          <li>60 requests/min</li>
          <li>All clients + direct API access</li>
          <li>Priority support</li>
          <li>Cancel anytime</li>
        </ul>
        <template v-if="isPro">
          <p class="pricing__current">You're on Pro ✓</p>
          <a
            :href="BILLING_PORTAL_LOGIN_URL"
            target="_blank"
            rel="noopener"
            class="pricing__cta pricing__cta--secondary"
            >Manage billing</a
          >
        </template>
        <a
          v-else-if="auth.user && checkoutUrl"
          :href="checkoutUrl"
          class="pricing__cta pricing__cta--primary"
          >Upgrade to Pro</a
        >
        <RouterLink v-else-if="!auth.user" to="/login" class="pricing__cta pricing__cta--primary"
          >Sign in to upgrade</RouterLink
        >
        <span v-else class="pricing__cta pricing__cta--disabled">Coming shortly</span>
      </div>

      <!-- Teams -->
      <div class="pricing__card">
        <h2 class="pricing__tier">Teams</h2>
        <p class="pricing__price pricing__price--talk">Let's talk</p>
        <ul class="pricing__features">
          <li>House prompt structure for the whole team</li>
          <li>Per-developer usage attribution</li>
          <li>SSO &amp; admin controls</li>
          <li>Custom limits &amp; SLAs</li>
        </ul>
        <RouterLink to="/contact" class="pricing__cta pricing__cta--secondary"
          >Talk to us</RouterLink
        >
      </div>
    </div>

    <p class="pricing__note">
      The playground on the home page stays free for everyone — 10 enhances/day, no account needed.
    </p>
  </div>
</template>

<style scoped>
.pricing-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 3rem 2rem 4rem;
  text-align: center;
}

.pricing-page h1 {
  font-family: var(--font-heading);
  color: var(--color-heading);
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.pricing__sub {
  color: var(--color-text);
  font-size: 1.125rem;
  margin-bottom: 2.5rem;
}

.pricing__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  align-items: stretch;
  text-align: left;
}

.pricing__card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 2rem 1.75rem;
}

.pricing__card--featured {
  border: 2px solid var(--color-heading);
  box-shadow: 0 4px 20px rgba(42, 42, 42, 0.08);
}

.pricing__tier {
  font-family: var(--font-heading);
  color: var(--color-heading);
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}

.pricing__price {
  font-family: var(--font-heading);
  color: var(--color-heading);
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
}

.pricing__price--talk {
  font-size: 1.75rem;
}

.pricing__period {
  font-size: 1rem;
  font-weight: 400;
  color: var(--color-text);
}

.pricing__features {
  list-style: none;
  padding: 0;
  margin: 0 0 1.75rem;
  flex: 1;
}

.pricing__features li {
  padding: 0.4rem 0;
  color: var(--color-text);
  font-size: 0.9375rem;
  border-bottom: 1px solid var(--color-border);
}

.pricing__features li:last-child {
  border-bottom: none;
}

.pricing__cta {
  display: block;
  text-align: center;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius);
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    background 0.2s,
    color 0.2s;
}

.pricing__cta--primary {
  background: var(--color-heading);
  color: var(--wl-cream);
  border: 1.5px solid var(--color-heading);
}

.pricing__cta--primary:hover {
  background: transparent;
  color: var(--color-heading);
}

.pricing__cta--secondary {
  border: 1.5px solid var(--color-heading);
  color: var(--color-heading);
}

.pricing__cta--secondary:hover {
  background: var(--color-heading);
  color: var(--wl-cream);
}

.pricing__cta--disabled {
  border: 1.5px solid var(--color-border);
  color: var(--color-text);
  cursor: default;
}

.pricing__current {
  text-align: center;
  color: var(--color-heading);
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.pricing__note {
  margin-top: 2.5rem;
  color: var(--color-text);
  font-size: 0.9375rem;
}

@media (max-width: 900px) {
  .pricing__grid {
    grid-template-columns: 1fr;
    max-width: 420px;
    margin: 0 auto;
  }
}
</style>
