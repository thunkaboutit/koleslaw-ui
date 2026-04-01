<script setup lang="ts">
import logoSrc from '@/assets/koleslaw-logo-woof-bubble.svg'

withDefaults(
  defineProps<{
    companyName?: string
    copyrightYears?: string
  }>(),
  {
    companyName: 'Koleslaw',
    copyrightYears: '2025-2026',
  },
)
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__links">
        <RouterLink to="/terms" class="footer__link">Terms of Service</RouterLink>
        <RouterLink to="/privacy" class="footer__link">Privacy Policy</RouterLink>
        <a href="#contact" class="footer__link">Contact Us</a>
      </div>
      <div class="footer__right">
        <span class="footer__copy">
          Copyright &copy; {{ copyrightYears }}. All {{ companyName }}
        </span>
        <img :src="logoSrc" :alt="`${companyName} logo`" class="footer__logo" />
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: auto;
  padding: 1.5rem 2rem 2rem;
  border-top: 1px solid var(--color-border-hover);
}

.footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  max-width: 1400px;
  margin: 0 auto;
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

@media (max-width: 768px) {
  .footer {
    padding: 1.5rem 1rem 2rem;
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
</style>
