<script setup lang="ts">
import ContactForm from '@/components/ContactForm.vue'
</script>

<template>
  <div class="contact">
    <div class="contact__card">
      <h1 class="contact__title">Contact Us</h1>
      <p class="contact__subtitle">
        Have a question, found a bug, or just want to say woof? Drop us a line.
      </p>
      <ContactForm />
    </div>
  </div>
</template>

<style scoped>
.contact {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  justify-content: center;
}

.contact__card {
  width: 100%;
  max-width: 520px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2.5rem 2rem;
  box-shadow: 0 4px 24px rgba(42, 42, 42, 0.06);
}

.contact__title {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.contact__subtitle {
  color: var(--color-text);
  margin-bottom: 2rem;
  line-height: 1.6;
}

@media (max-width: 600px) {
  .contact {
    padding: 1rem;
  }

  .contact__card {
    padding: 2rem 1.25rem;
  }
}
</style>
