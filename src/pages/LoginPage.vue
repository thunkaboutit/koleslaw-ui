<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import mascotSrc from '@/assets/koleslaw-logo-mascot-woof.svg'

const route = useRoute()

const loading = ref<string | null>(null)
const error = ref('')
const enabledProviders = ref<string[]>([])

onMounted(async () => {
  try {
    enabledProviders.value = await api<string[]>('/auth/providers')
  } catch {
    enabledProviders.value = []
  }

  if (route.query.error) {
    const msg = route.query.error_description || route.query.error
    error.value = typeof msg === 'string' ? msg : 'Sign-in failed. Please try again.'
  }
})

function loginWith(provider: string) {
  loading.value = provider
  error.value = ''
  window.location.href = `/auth/${provider}`
}

const allProviders = [
  { id: 'google', label: 'Sign in with Google', icon: 'google' },
  { id: 'github', label: 'Sign in with GitHub', icon: 'github' },
  { id: 'facebook', label: 'Sign in with Facebook', icon: 'facebook' },
  { id: 'instagram', label: 'Sign in with Instagram', icon: 'instagram' },
]

const providers = computed(() => allProviders.filter((p) => enabledProviders.value.includes(p.id)))
</script>

<template>
  <div class="login">
    <!-- Cow-spot background blobs -->
    <div class="spot spot--1" aria-hidden="true"></div>
    <div class="spot spot--2" aria-hidden="true"></div>
    <div class="spot spot--3" aria-hidden="true"></div>
    <div class="spot spot--4" aria-hidden="true"></div>
    <div class="spot spot--5" aria-hidden="true"></div>

    <!-- Peeking mascot -->
    <div class="peek" aria-hidden="true">
      <img :src="mascotSrc" alt="" class="peek__img" />
    </div>

    <div class="login__card">
      <h1 class="login__title">
        <RouterLink to="/" class="login__title-link">Koleslaw</RouterLink>
      </h1>
      <p class="login__subtitle">koleslaw.ai</p>

      <p v-if="error" class="login__error" role="alert">{{ error }}</p>

      <div class="login__providers">
        <button
          v-for="provider in providers"
          :key="provider.id"
          class="login__provider"
          :class="`login__provider--${provider.id}`"
          :disabled="loading !== null"
          @click="loginWith(provider.id)"
        >
          <span v-if="loading === provider.id" class="login__spinner" aria-hidden="true"></span>
          <template v-else>
            <!-- Google -->
            <svg
              v-if="provider.icon === 'google'"
              class="login__icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>

            <!-- GitHub -->
            <svg
              v-if="provider.icon === 'github'"
              class="login__icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
              />
            </svg>

            <!-- Facebook -->
            <svg
              v-if="provider.icon === 'facebook'"
              class="login__icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path
                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
              />
            </svg>

            <!-- Instagram -->
            <svg
              v-if="provider.icon === 'instagram'"
              class="login__icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
            >
              <path
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
              />
            </svg>
          </template>

          {{ loading === provider.id ? 'Redirecting...' : provider.label }}
        </button>
      </div>

      <p class="login__signup">
        Don't have an account?
        <RouterLink to="/signup" class="login__signup-link">Sign up</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--color-background);
  padding: 2rem;
  overflow: hidden;
}

/* ─── Cow-spot background blobs ─── */
.spot {
  position: absolute;
  border-radius: 50% 40% 55% 45% / 45% 50% 40% 55%;
  background: rgba(42, 42, 42, 0.06);
  z-index: 0;
}

.spot--1 {
  width: 260px;
  height: 200px;
  top: -40px;
  left: -60px;
  border-radius: 50% 35% 60% 40% / 40% 55% 35% 60%;
}

.spot--2 {
  width: 180px;
  height: 160px;
  top: 10%;
  right: -30px;
  border-radius: 45% 55% 40% 60% / 55% 40% 60% 45%;
}

.spot--3 {
  width: 220px;
  height: 180px;
  bottom: 15%;
  left: 5%;
  border-radius: 55% 45% 50% 40% / 40% 50% 55% 45%;
}

.spot--4 {
  width: 140px;
  height: 120px;
  bottom: -20px;
  right: 15%;
  border-radius: 40% 60% 45% 55% / 55% 45% 50% 40%;
}

.spot--5 {
  width: 100px;
  height: 90px;
  top: 35%;
  left: 20%;
  border-radius: 60% 40% 55% 45% / 45% 55% 40% 60%;
}

/* ─── Peeking mascot ─── */
.peek {
  position: fixed;
  bottom: 0;
  left: -200px;
  z-index: 2;
  pointer-events: none;
  animation: peekFromLeft 45s ease-in-out 8s infinite;
}

.peek__img {
  width: 200px;
  height: auto;
  opacity: 0.85;
}

@keyframes peekFromLeft {
  0% {
    transform: translateX(0);
  }
  3% {
    transform: translateX(160px);
  }
  6% {
    transform: translateX(160px);
  }
  9% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(0);
  }
}

/* ─── Login card ─── */
.login__card {
  position: relative;
  z-index: 1;
  text-align: center;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 3rem 2.5rem;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 24px rgba(42, 42, 42, 0.06);
}

.login__title {
  font-family: var(--font-heading);
  font-size: 2rem;
  font-weight: 900;
  color: var(--color-heading);
  margin-bottom: 0.25rem;
}

.login__title-link {
  color: inherit;
  text-decoration: none;
  transition: color 0.2s;
}

.login__title-link:hover {
  color: var(--wl-navy);
}

.login__subtitle {
  color: var(--color-text);
  margin-bottom: 2rem;
  opacity: 0.7;
}

.login__error {
  color: var(--color-danger);
  font-size: 0.8125rem;
  margin-bottom: 1rem;
  padding: 0.625rem 0.875rem;
  background: var(--color-danger-bg);
  border-radius: var(--radius);
}

/* ─── Provider buttons ─── */
.login__providers {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.login__provider {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  padding: 0.625rem 1.25rem;
  border: 1px solid var(--color-border-hover);
  border-radius: var(--radius);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    opacity 0.15s,
    background 0.15s;
  width: 100%;
}

.login__provider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login__provider:not(:disabled):hover {
  opacity: 0.85;
}

.login__provider--google {
  background: var(--wl-white);
  color: var(--wl-black);
}

.login__provider--github {
  background: var(--wl-black);
  color: var(--wl-cream);
  border-color: var(--wl-black);
}

.login__provider--facebook {
  background: #1877f2;
  color: #fff;
  border-color: #1877f2;
}

.login__provider--instagram {
  background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
  color: #fff;
  border-color: transparent;
}

.login__icon {
  flex-shrink: 0;
}

/* ─── Spinner ─── */
.login__spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ─── Bottom link ─── */
.login__signup {
  margin-top: 1.5rem;
  font-size: 0.8125rem;
  color: var(--color-text);
  opacity: 0.7;
}

.login__signup-link {
  color: var(--wl-navy);
  font-weight: 600;
  text-decoration: none;
}

.login__signup-link:hover {
  text-decoration: underline;
}

/* ─── Mobile adjustments ─── */
@media (max-width: 768px) {
  .peek {
    display: none;
  }

  .spot--1 {
    width: 160px;
    height: 120px;
  }
  .spot--2 {
    width: 120px;
    height: 100px;
  }
  .spot--3 {
    width: 140px;
    height: 110px;
  }
  .spot--5 {
    display: none;
  }
}
</style>
