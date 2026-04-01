<script setup lang="ts">
import { onMounted, ref } from 'vue'
import mascotSrc from '@/assets/koleslaw-logo-mascot-woof.svg'
import logoSrc from '@/assets/koleslaw-logo-woof-bubble.svg'
import EnhancePanel from '@/components/EnhancePanel.vue'

const isSubmitting = ref(false)

/* ── Section reveal animation ── */
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
  <div class="home" :class="{ 'home--submitted': isSubmitting }">
    <!-- Hero Section -->
    <section
      :ref="setSectionRef(0)"
      class="hero"
      :class="{
        'animate-in': revealed.has(0),
        'hero--hidden': isSubmitting,
      }"
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
            Stop Re-prompting.<br />
            Start Kolewoofing.
          </h1>
          <p class="hero__subtitle">
            Koleslaw takes your rough prompt and turns it into exactly what AI
            needs to hear. Better input, better output — it's not rocket science.
            It's a barking cow.
          </p>
          <div class="hero__flow">
            <div class="flow-step">
              <span class="flow-step__icon flow-step__icon--rough" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="3" y="5" width="22" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <path d="M8 11h12M8 15h8M8 19h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>
                </svg>
              </span>
              <span class="flow-step__label">Your prompt</span>
            </div>
            <span class="flow-arrow" aria-hidden="true">
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
                <path d="M0 7h20M16 1l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="flow-step">
              <span class="flow-step__icon flow-step__icon--magic" aria-hidden="true">
                <img :src="logoSrc" alt="" class="flow-step__logo" />
              </span>
              <span class="flow-step__label">Woof magic</span>
            </div>
            <span class="flow-arrow" aria-hidden="true">
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
                <path d="M0 7h20M16 1l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="flow-step">
              <span class="flow-step__icon flow-step__icon--enhanced" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="3" y="5" width="22" height="18" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <path d="M8 11h12M8 15h10M8 19h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M19 3l2 2-2 2" stroke="var(--wl-gold)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M23 7l1 1-1 1" stroke="var(--wl-gold)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="flow-step__label">Woofed up prompt</span>
            </div>
            <span class="flow-arrow" aria-hidden="true">
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none">
                <path d="M0 7h20M16 1l6 6-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div class="flow-step">
              <span class="flow-step__icon flow-step__icon--paste" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="11" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  <path d="M9 14l3 3 7-7" stroke="var(--wl-gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span class="flow-step__label">Paste anywhere</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Enhance Section -->
    <section
      :ref="setSectionRef(1)"
      class="enhance"
      :class="{
        'animate-in delay-1': revealed.has(1),
        'enhance--expanded': isSubmitting,
      }"
    >
      <EnhancePanel @update:submitting="isSubmitting = $event" />
    </section>

  </div>
</template>

<style scoped>
.home {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* ─── Hero ─── */
.hero {
  padding: 3rem 0 2rem;
  max-height: 800px;
  overflow: hidden;
  transition: opacity 0.4s ease, max-height 0.5s ease 0.1s, padding 0.5s ease 0.1s;
}

.hero--hidden {
  opacity: 0;
  max-height: 0;
  padding: 0;
  pointer-events: none;
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
  font-weight: 500;
  line-height: 1.25;
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

/* ─── Process Flow ─── */
.hero__flow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  text-align: center;
}

.flow-step__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  color: var(--wl-navy);
}

.flow-step__icon--rough {
  background: var(--color-border);
  color: var(--wl-warm-gray);
}

.flow-step__icon--magic {
  background: rgba(201, 168, 76, 0.12);
  border-radius: 12px;
}

.flow-step__logo {
  width: 32px;
  height: 32px;
}

.flow-step__icon--enhanced {
  background: rgba(26, 39, 68, 0.08);
  color: var(--wl-navy);
}

.flow-step__icon--paste {
  background: rgba(201, 168, 76, 0.12);
  color: var(--wl-navy);
}

.flow-step__label {
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--wl-warm-gray);
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.flow-arrow {
  color: var(--color-border-hover);
  flex-shrink: 0;
  margin-bottom: 1.25rem;
}

/* ─── Enhance ─── */
.enhance {
  padding: 2rem 0;
  transition: flex 0.4s ease;
}

.enhance--expanded {
  flex: 1;
  display: flex;
  flex-direction: column;
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

  .hero__flow {
    justify-content: center;
    flex-wrap: wrap;
  }

  .hero__title {
    font-size: 2rem;
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
