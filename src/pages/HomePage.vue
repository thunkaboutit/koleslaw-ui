<script setup lang="ts">
import { onMounted, ref } from 'vue'
import mascotSrc from '@/assets/koleslaw-logo-mascot-woof.svg'
import logoSrc from '@/assets/koleslaw-logo-woof-bubble.svg'

const sections = ref<HTMLElement[]>([])
const revealed = ref(new Set<number>())

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = sections.value.indexOf(entry.target as HTMLElement)
          if (idx !== -1) revealed.value.add(idx)
        }
      })
    },
    { threshold: 0.1 },
  )
  sections.value.forEach((el) => {
    if (el) observer.observe(el)
  })
})

function setSectionRef(idx: number) {
  return (el: unknown) => {
    if (el instanceof HTMLElement) sections.value[idx] = el
  }
}
</script>

<template>
  <div class="home">
    <!-- Hero Section -->
    <section
      :ref="setSectionRef(0)"
      class="hero"
      :class="{ 'animate-in': revealed.has(0) }"
    >
      <div class="hero__inner">
        <div class="hero__mascot-area">
          <img
            :src="mascotSrc"
            alt="Koleslaw mascot — a cartoon cow saying Woof?"
            class="hero__mascot"
          />
          <!-- Floating code bracket icons -->
          <span class="floating-icon floating-icon--1" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <text x="2" y="22" font-family="var(--font-mono)" font-size="22" fill="#1a2744" opacity="0.6">&lt;/&gt;</text>
            </svg>
          </span>
          <span class="floating-icon floating-icon--2" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <text x="1" y="18" font-family="var(--font-mono)" font-size="18" fill="#c9a84c" opacity="0.7">&lt;/&gt;</text>
            </svg>
          </span>
          <span class="floating-icon floating-icon--3" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <text x="1" y="15" font-family="var(--font-mono)" font-size="15" fill="#1a2744" opacity="0.5">&lt;/&gt;</text>
            </svg>
          </span>
          <span class="floating-icon floating-icon--4" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <text x="1" y="17" font-family="var(--font-mono)" font-size="17" fill="#5a6340" opacity="0.6">&lt;/&gt;</text>
            </svg>
          </span>
          <!-- Sparkle decorations -->
          <span class="sparkle sparkle--1" aria-hidden="true">+</span>
          <span class="sparkle sparkle--2" aria-hidden="true">*</span>
          <span class="sparkle sparkle--3" aria-hidden="true">+</span>
        </div>
        <div class="hero__content">
          <h1 class="hero__title">
            Unexpected Connections.<br />
            Dependable Deliveries.
          </h1>
          <p class="hero__subtitle">
            Connecting your systems when the language doesn't match.
            Meet Koleslaw, your reliable (if quirky) integration portal.
          </p>
          <div class="hero__actions">
            <RouterLink to="/dashboard" class="btn btn--filled">Explore API Docs</RouterLink>
            <RouterLink to="/keys" class="btn btn--outlined">Start Integrations</RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Section divider -->
    <div class="section-divider">
      <span class="section-divider__ornament"></span>
    </div>

    <!-- Features Section -->
    <section
      :ref="setSectionRef(1)"
      class="features"
      :class="{ 'animate-in delay-1': revealed.has(1) }"
    >
      <h2 class="features__title">Features</h2>
      <div class="features__grid">
        <div class="feature-card">
          <div class="feature-card__icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="6" y="10" width="36" height="28" rx="4" stroke="#1a2744" stroke-width="2" fill="none"/>
              <path d="M14 22l4 4-4 4M22 30h8" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="feature-card__label">Robust APIs</h3>
          <p class="feature-card__desc">Battle-tested endpoints that handle anything you throw at them.</p>
        </div>
        <div class="feature-card">
          <div class="feature-card__icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="14" width="14" height="20" rx="2" stroke="#1a2744" stroke-width="2" fill="none"/>
              <rect x="26" y="14" width="14" height="20" rx="2" stroke="#1a2744" stroke-width="2" fill="none"/>
              <path d="M22 24h4" stroke="#c9a84c" stroke-width="2" stroke-linecap="round"/>
              <circle cx="15" cy="20" r="2" fill="#c9a84c"/>
              <circle cx="33" cy="20" r="2" fill="#c9a84c"/>
            </svg>
          </div>
          <h3 class="feature-card__label">Comprehensive SDKs</h3>
          <p class="feature-card__desc">Libraries for every major language, so you can moo in your native tongue.</p>
        </div>
        <div class="feature-card">
          <div class="feature-card__icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M10 38V14a4 4 0 014-4h20a4 4 0 014 4v24" stroke="#1a2744" stroke-width="2" fill="none"/>
              <path d="M6 38h36" stroke="#1a2744" stroke-width="2" stroke-linecap="round"/>
              <path d="M18 22l3 3 7-7" stroke="#c9a84c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="feature-card__label">Testing Sandbox</h3>
          <p class="feature-card__desc">A safe pasture to test your integrations before going live.</p>
        </div>
      </div>
    </section>

    <!-- Section divider -->
    <div class="section-divider">
      <span class="section-divider__ornament"></span>
    </div>

    <!-- Promise Section -->
    <section
      :ref="setSectionRef(2)"
      class="promise"
      :class="{ 'animate-in delay-2': revealed.has(2) }"
    >
      <div class="promise__inner">
        <div class="promise__content">
          <h2 class="promise__title">The Woof Promise</h2>
          <ul class="promise__list">
            <li class="promise__item">
              <span class="promise__icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="#c9a84c" stroke-width="2"/>
                  <path d="M12 6v6l4 2" stroke="#1a2744" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <div>
                <strong>99.9% Uptime</strong>
                <span class="promise__aside"> (Moo is for milk, uptime is for you.)</span>
              </div>
            </li>
            <li class="promise__item">
              <span class="promise__icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="#c9a84c" stroke-width="2" stroke-linecap="round"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="#1a2744" stroke-width="2" fill="none"/>
                </svg>
              </span>
              <div>
                <strong>Dedicated Support</strong>
                <span class="promise__aside"> (We don't just bark, we solve.)</span>
              </div>
            </li>
            <li class="promise__item">
              <span class="promise__icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#c9a84c" stroke-width="2" fill="none" stroke-linecap="round"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#1a2744" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </span>
              <div>
                <strong>Zero Unexpected Surprises</strong>
                <span class="promise__aside"> (Except this cow.)</span>
              </div>
            </li>
          </ul>
        </div>
        <div class="promise__terminal">
          <div class="terminal">
            <div class="terminal__bar">
              <span class="terminal__dot terminal__dot--red"></span>
              <span class="terminal__dot terminal__dot--yellow"></span>
              <span class="terminal__dot terminal__dot--green"></span>
            </div>
            <pre class="terminal__code"><code><span class="t-keyword">export</span> <span class="t-string">https://koleslaw.ai/connect/</span>{
  <span class="t-key">request</span>: {
    <span class="t-string">'key'</span>: <span class="t-value">'KEY_KEY'</span>,
    <span class="t-string">'value'</span>: <span class="t-value">'$SHORT_MORE_VALUE'</span>
  }
}</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer
      :ref="setSectionRef(3)"
      class="footer"
      :class="{ 'animate-in delay-3': revealed.has(3) }"
    >
      <div class="footer__inner">
        <div class="footer__links">
          <a href="#terms" class="footer__link">Terms of Service</a>
          <a href="#privacy" class="footer__link">Privacy Policy</a>
          <a href="#contact" class="footer__link">Contact Us</a>
        </div>
        <div class="footer__right">
          <span class="footer__copy">Copyright &copy; 2022. All Koleslaw</span>
          <img :src="logoSrc" alt="Koleslaw logo" class="footer__logo" />
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

/* ─── Hero ─── */
.hero {
  padding: 3rem 0 2rem;
}

.hero__inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.hero__mascot-area {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero__mascot {
  width: 100%;
  max-width: 380px;
  height: auto;
  position: relative;
  z-index: 1;
}

/* Floating code bracket icons */
.floating-icon {
  position: absolute;
  z-index: 2;
  animation: bob 3s ease-in-out infinite;
}

.floating-icon--1 {
  top: 5%;
  right: 5%;
  animation-delay: 0s;
}

.floating-icon--2 {
  bottom: 20%;
  right: 0;
  animation-delay: 0.7s;
}

.floating-icon--3 {
  top: 15%;
  left: 5%;
  animation-delay: 1.4s;
}

.floating-icon--4 {
  bottom: 10%;
  left: 10%;
  animation-delay: 2.1s;
}

/* Sparkle decorations */
.sparkle {
  position: absolute;
  z-index: 2;
  font-size: 1rem;
  color: var(--wl-gold);
  font-weight: 700;
  animation: bob 2.5s ease-in-out infinite;
  opacity: 0.7;
}

.sparkle--1 {
  top: 2%;
  right: 20%;
  animation-delay: 0.3s;
}

.sparkle--2 {
  top: 40%;
  right: -2%;
  animation-delay: 1s;
  font-size: 1.2rem;
}

.sparkle--3 {
  bottom: 5%;
  left: 2%;
  animation-delay: 1.8s;
}

.hero__title {
  font-size: 2.75rem;
  font-weight: 900;
  line-height: 1.15;
  margin-bottom: 1.25rem;
  color: var(--wl-black);
}

.hero__subtitle {
  font-size: 1.0625rem;
  line-height: 1.7;
  color: var(--color-text);
  margin-bottom: 2rem;
  max-width: 440px;
}

.hero__actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

/* CTA Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.75rem;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  border-radius: var(--radius);
  text-decoration: none;
  cursor: pointer;
  transition: background 0.25s, color 0.25s, border-color 0.25s;
}

.btn--filled {
  background: var(--wl-navy);
  color: var(--wl-cream);
  border: 2px solid var(--wl-navy);
}

.btn--filled:hover {
  background: var(--wl-navy-light);
  border-color: var(--wl-navy-light);
  color: var(--wl-cream);
}

.btn--outlined {
  background: transparent;
  color: var(--wl-navy);
  border: 2px solid var(--wl-navy);
}

.btn--outlined:hover {
  background: var(--wl-navy);
  color: var(--wl-cream);
}

/* ─── Features ─── */
.features {
  text-align: center;
  padding: 1rem 0;
}

.features__title {
  font-size: 2rem;
  margin-bottom: 2.5rem;
}

.features__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.feature-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2rem 1.5rem;
  transition: transform 0.25s, box-shadow 0.25s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(42, 42, 42, 0.08);
}

.feature-card__icon {
  margin-bottom: 1rem;
}

.feature-card__label {
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--color-heading);
}

.feature-card__desc {
  font-size: 0.9375rem;
  color: var(--color-text);
  line-height: 1.5;
}

/* ─── Promise ─── */
.promise {
  padding: 1rem 0;
}

.promise__inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: start;
}

.promise__title {
  font-size: 2rem;
  margin-bottom: 1.75rem;
}

.promise__list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.promise__item {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}

.promise__icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.promise__item strong {
  font-weight: 700;
  color: var(--color-heading);
}

.promise__aside {
  color: var(--wl-warm-gray);
  font-style: italic;
}

/* Terminal code block */
.terminal {
  background: var(--wl-charcoal);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.terminal__bar {
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
}

.terminal__dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.terminal__dot--red { background: #ff5f57; }
.terminal__dot--yellow { background: #febc2e; }
.terminal__dot--green { background: #28c840; }

.terminal__code {
  padding: 1.25rem 1.5rem 1.5rem;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.7;
  color: #e0ddd5;
  overflow-x: auto;
}

.t-keyword { color: var(--wl-code-blue); }
.t-string { color: var(--wl-code-green); }
.t-key { color: #e0ddd5; }
.t-value { color: var(--wl-code-gold); }

/* ─── Footer ─── */
.footer {
  margin-top: var(--section-gap);
  padding: 1.5rem 0 2rem;
  border-top: 1px solid var(--color-border-hover);
}

.footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.footer__links {
  display: flex;
  gap: 1.5rem;
}

.footer__link {
  color: var(--color-text);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.footer__link:hover {
  color: var(--color-heading);
}

.footer__right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.footer__copy {
  font-size: 0.875rem;
  color: var(--wl-warm-gray);
}

.footer__logo {
  height: 36px;
  width: auto;
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .home {
    padding: 0 1rem;
  }

  .hero__inner {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero__mascot-area {
    order: -1;
  }

  .hero__mascot {
    max-width: 220px;
  }

  .hero__subtitle {
    margin-left: auto;
    margin-right: auto;
  }

  .hero__actions {
    justify-content: center;
  }

  .hero__title {
    font-size: 2rem;
  }

  .features__grid {
    grid-template-columns: 1fr;
    max-width: 360px;
    margin: 0 auto;
  }

  .promise__inner {
    grid-template-columns: 1fr;
  }

  .footer__inner {
    flex-direction: column;
    text-align: center;
  }

  .footer__links {
    justify-content: center;
  }

  .footer__right {
    justify-content: center;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .hero__title {
    font-size: 2.25rem;
  }

  .hero__mascot {
    max-width: 300px;
  }
}
</style>
