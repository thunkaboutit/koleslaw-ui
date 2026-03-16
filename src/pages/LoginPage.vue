<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/client'
import BaseButton from '@/components/BaseButton.vue'

const auth = useAuthStore()
const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) return
  error.value = ''
  submitting.value = true
  try {
    await auth.login(username.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      error.value = 'Invalid username or password'
    } else {
      error.value = 'Something went wrong. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}

function loginWithGitHub() {
  window.location.href = '/auth/github'
}
</script>

<template>
  <div class="login">
    <div class="login__card">
      <h1 class="login__title">Prompt Enhance</h1>
      <p class="login__subtitle">Developer Portal</p>

      <form class="login__form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label" for="username">Username</label>
          <input
            id="username"
            v-model="username"
            class="form-input"
            type="text"
            autocomplete="username"
            autofocus
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input
            id="password"
            v-model="password"
            class="form-input"
            type="password"
            autocomplete="current-password"
          />
        </div>
        <p v-if="error" class="login__error">{{ error }}</p>
        <BaseButton
          type="submit"
          :disabled="!username || !password || submitting"
          class="login__submit"
        >
          {{ submitting ? 'Signing in...' : 'Sign in' }}
        </BaseButton>
      </form>

      <div class="login__divider">
        <span>or</span>
      </div>

      <button class="login__github" @click="loginWithGitHub">
        <svg class="login__icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
        Sign in with GitHub
      </button>
    </div>
  </div>
</template>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
}

.login__card {
  text-align: center;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 3rem 2.5rem;
  max-width: 400px;
  width: 100%;
}

.login__title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 0.25rem;
}

.login__subtitle {
  color: var(--color-text);
  margin-bottom: 2rem;
  opacity: 0.7;
}

.login__form {
  text-align: left;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.375rem;
  color: var(--color-heading);
}

.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
}

.form-input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: -1px;
}

.login__error {
  color: var(--color-danger);
  font-size: 0.8125rem;
  margin-bottom: 0.75rem;
}

.login__submit {
  width: 100%;
  justify-content: center;
}

.login__divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  color: var(--color-text);
  opacity: 0.5;
  font-size: 0.8125rem;
}

.login__divider::before,
.login__divider::after {
  content: '';
  flex: 1;
  border-top: 1px solid var(--color-border);
}

.login__github {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1.25rem;
  background: var(--vt-c-black);
  color: var(--vt-c-white);
  border: none;
  border-radius: var(--radius);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.login__github:hover {
  opacity: 0.85;
}

.login__icon {
  flex-shrink: 0;
}

@media (prefers-color-scheme: dark) {
  .login__github {
    background: var(--vt-c-white);
    color: var(--vt-c-black);
  }
}
</style>
