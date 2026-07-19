<script setup lang="ts">
import { ref } from 'vue'
import { useForm, useField } from 'vee-validate'
import { object, string } from 'yup'
import BaseButton from '@/components/BaseButton.vue'

const WEB3FORMS_URL = 'https://api.web3forms.com/submit'
const WEB3FORMS_KEY = '77e3a660-3449-490b-beee-e50c43d5129b'

const submitted = ref(false)
const submitError = ref('')

const schema = object({
  name: string().required('Name is required').trim(),
  email: string().required('Email is required').email('Please enter a valid email address').trim(),
  message: string()
    .required('Message is required')
    .trim()
    .min(10, 'Message must be at least 10 characters'),
})

const { handleSubmit, isSubmitting, resetForm } = useForm({ validationSchema: schema })

const { value: name, errorMessage: nameError } = useField<string>('name')
const { value: email, errorMessage: emailError } = useField<string>('email')
const { value: message, errorMessage: messageError } = useField<string>('message')

function sanitize(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim()
}

const onSubmit = handleSubmit(async (values) => {
  submitError.value = ''
  try {
    const formData = new FormData()
    formData.append('access_key', WEB3FORMS_KEY)
    formData.append('name', sanitize(values.name))
    formData.append('email', sanitize(values.email))
    formData.append('message', sanitize(values.message))

    const response = await fetch(WEB3FORMS_URL, {
      method: 'POST',
      body: formData,
    })
    const data = await response.json()

    if (response.ok && data.success) {
      submitted.value = true
      resetForm()
    } else {
      submitError.value =
        data.message || 'Something went wrong with your submission. Please try again.'
    }
  } catch {
    submitError.value = 'Unable to send your message. Please check your connection and try again.'
  }
})

function sendAnother() {
  submitted.value = false
}
</script>

<template>
  <div v-if="submitted" class="success">
    <div class="success__icon" aria-hidden="true">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle
          cx="24"
          cy="24"
          r="22"
          stroke="var(--color-success)"
          stroke-width="2.5"
          fill="var(--color-success-bg)"
        />
        <path
          d="M15 24l6 6 12-12"
          stroke="var(--color-success)"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <h2 class="success__title">Message sent!</h2>
    <p class="success__text">Thanks for reaching out. We'll get back to you soon.</p>
    <BaseButton variant="secondary" @click="sendAnother">Send another message</BaseButton>
  </div>

  <form v-else class="form" novalidate @submit.prevent="onSubmit">
    <div class="form-group">
      <label class="form-label" for="contact-name">Name</label>
      <input
        id="contact-name"
        v-model="name"
        class="form-input"
        :class="{ 'form-input--error': nameError }"
        type="text"
        autocomplete="name"
      />
      <p v-if="nameError" class="form-error" role="alert">{{ nameError }}</p>
    </div>

    <div class="form-group">
      <label class="form-label" for="contact-email">Email</label>
      <input
        id="contact-email"
        v-model="email"
        class="form-input"
        :class="{ 'form-input--error': emailError }"
        type="email"
        autocomplete="email"
      />
      <p v-if="emailError" class="form-error" role="alert">{{ emailError }}</p>
    </div>

    <div class="form-group">
      <label class="form-label" for="contact-message">Message</label>
      <textarea
        id="contact-message"
        v-model="message"
        class="form-input form-textarea"
        :class="{ 'form-input--error': messageError }"
        rows="6"
      />
      <p v-if="messageError" class="form-error" role="alert">{{ messageError }}</p>
    </div>

    <p v-if="submitError" class="submit-error" role="alert">{{ submitError }}</p>

    <BaseButton
      type="submit"
      :disabled="isSubmitting"
      aria-label="Submit contact form"
      class="form__submit"
    >
      <span v-if="isSubmitting" class="spinner" aria-hidden="true" />
      {{ isSubmitting ? 'Sending…' : 'Send message' }}
    </BaseButton>
  </form>
</template>

<style scoped>
.form {
  text-align: left;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.375rem;
  color: var(--color-heading);
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius);
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.form-input--error {
  border-color: var(--color-danger);
}

.form-input--error:focus {
  outline-color: var(--color-danger);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

.form-error {
  color: var(--color-danger);
  font-size: 0.8125rem;
  margin-top: 0.25rem;
}

.submit-error {
  color: var(--color-danger);
  font-size: 0.8125rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-danger-bg);
  border-radius: var(--radius);
}

.form__submit {
  width: 100%;
  justify-content: center;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--wl-cream);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ─── Success state ─── */
.success {
  text-align: center;
  padding: 2rem 0;
}

.success__icon {
  margin-bottom: 1rem;
}

.success__title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 0.5rem;
}

.success__text {
  color: var(--color-text);
  margin-bottom: 1.5rem;
}
</style>
