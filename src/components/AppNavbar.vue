<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useRouter, useRoute } from 'vue-router'

const auth = useAuthStore()
const chat = useChatStore()
const router = useRouter()
const route = useRoute()
const forceRemount = inject<() => void>('forceRemount')

const scrolled = ref(false)
const menuOpen = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 80
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

watch(
  () => route.path,
  () => {
    menuOpen.value = false
  },
)

function handleNav(path: string, action?: () => void) {
  menuOpen.value = false
  action?.()
  if (route.path === path) {
    forceRemount?.()
  }
}

async function signOut() {
  menuOpen.value = false
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="navbar" :class="{ 'navbar--scrolled': scrolled }">
    <div class="navbar__inner">
      <div class="navbar__left">
        <RouterLink to="/" class="navbar__brand">
          <span class="navbar__brand-text">koleslaw.ai</span>
        </RouterLink>
        <div class="navbar__links">
          <template v-if="auth.user">
            <RouterLink
              to="/chat"
              class="navbar__link"
              @click="handleNav('/chat', () => chat.clearChat())"
              >New Chat</RouterLink
            >
            <RouterLink to="/dashboard" class="navbar__link" @click="handleNav('/dashboard')"
              >Dashboard</RouterLink
            >
            <RouterLink to="/keys" class="navbar__link" @click="handleNav('/keys')"
              >API Keys</RouterLink
            >
          </template>
          <RouterLink to="/pricing" class="navbar__link" @click="handleNav('/pricing')"
            >Pricing</RouterLink
          >
        </div>
      </div>
      <div class="navbar__right">
        <template v-if="auth.user">
          <RouterLink to="/profile" class="navbar__user-link">{{ auth.user.name }}</RouterLink>
          <button class="navbar__signout" @click="signOut">Sign out</button>
        </template>
        <template v-else>
          <RouterLink to="/signup" class="navbar__signup-link">Sign up</RouterLink>
          <RouterLink to="/login" class="navbar__login-btn">Login</RouterLink>
        </template>
      </div>
      <button
        class="navbar__burger"
        :class="{ 'navbar__burger--open': menuOpen }"
        aria-label="Toggle menu"
        :aria-expanded="menuOpen"
        @click="menuOpen = !menuOpen"
      >
        <span class="navbar__burger-line" />
        <span class="navbar__burger-line" />
        <span class="navbar__burger-line" />
      </button>
    </div>
    <div v-if="menuOpen" class="navbar__mobile-menu">
      <RouterLink to="/pricing" class="navbar__mobile-link" @click="handleNav('/pricing')"
        >Pricing</RouterLink
      >
      <template v-if="auth.user">
        <RouterLink
          to="/chat"
          class="navbar__mobile-link"
          @click="handleNav('/chat', () => chat.clearChat())"
          >New Chat</RouterLink
        >
        <RouterLink to="/dashboard" class="navbar__mobile-link" @click="handleNav('/dashboard')"
          >Dashboard</RouterLink
        >
        <RouterLink to="/keys" class="navbar__mobile-link" @click="handleNav('/keys')"
          >API Keys</RouterLink
        >
        <RouterLink to="/profile" class="navbar__mobile-link" @click="handleNav('/profile')">{{
          auth.user.name
        }}</RouterLink>
        <button class="navbar__mobile-link navbar__mobile-link--signout" @click="signOut">
          Sign out
        </button>
      </template>
      <template v-else>
        <RouterLink to="/signup" class="navbar__mobile-link" @click="handleNav('/signup')"
          >Sign up</RouterLink
        >
        <RouterLink to="/login" class="navbar__mobile-link" @click="handleNav('/login')"
          >Login</RouterLink
        >
      </template>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--wl-cream);
  transition:
    box-shadow 0.3s,
    background-color 0.3s;
}

.navbar--scrolled {
  background: rgba(245, 240, 232, 0.97);
  box-shadow: 0 2px 12px rgba(42, 42, 42, 0.08);
}

.navbar__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.875rem 2rem;
}

.navbar__left {
  display: flex;
  align-items: center;
  gap: 2.5rem;
}

.navbar__brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.navbar__logo {
  height: 32px;
  width: auto;
}

.navbar__brand-text {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 1.5rem;
  color: var(--color-heading);
}

.navbar__links {
  display: flex;
  align-items: center;
  gap: 1.75rem;
}

.navbar__link {
  color: var(--color-text);
  text-decoration: none;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 500;
  transition: color 0.2s;
}

.navbar__link:hover,
.navbar__link.router-link-active {
  color: var(--color-heading);
}

.navbar__right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.navbar__user-link {
  font-size: 0.875rem;
  color: var(--color-text);
  text-decoration: none;
  transition: color 0.2s;
}

.navbar__user-link:hover {
  color: var(--color-heading);
}

.navbar__signout {
  background: none;
  border: 1px solid var(--color-border-hover);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.375rem 1rem;
  border-radius: var(--radius);
  transition:
    color 0.2s,
    border-color 0.2s;
}

.navbar__signout:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.navbar__signup-link {
  color: var(--color-text);
  text-decoration: none;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 500;
  transition: color 0.2s;
}

.navbar__signup-link:hover {
  color: var(--color-heading);
}

.navbar__login-btn {
  display: inline-block;
  padding: 0.375rem 1.25rem;
  border: 1.5px solid var(--color-heading);
  border-radius: var(--radius);
  color: var(--color-heading);
  text-decoration: none;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 500;
  transition:
    background 0.2s,
    color 0.2s;
}

.navbar__login-btn:hover {
  background: var(--color-heading);
  color: var(--wl-cream);
}

/* ─── Hamburger button ─── */
.navbar__burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 6px;
  border: none;
  background: none;
  cursor: pointer;
}

.navbar__burger-line {
  display: block;
  width: 100%;
  height: 2px;
  background: var(--color-heading);
  border-radius: 1px;
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

.navbar__burger--open .navbar__burger-line:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.navbar__burger--open .navbar__burger-line:nth-child(2) {
  opacity: 0;
}

.navbar__burger--open .navbar__burger-line:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* ─── Mobile menu panel ─── */
.navbar__mobile-menu {
  display: none;
}

@media (max-width: 768px) {
  .navbar__inner {
    padding: 0.75rem 1rem;
  }

  .navbar__links,
  .navbar__right {
    display: none;
  }

  .navbar__burger {
    display: flex;
  }

  .navbar__mobile-menu {
    display: flex;
    flex-direction: column;
    padding: 0.5rem 1rem 1rem;
    border-top: 1px solid var(--color-border);
  }

  .navbar__mobile-link {
    display: block;
    padding: 0.75rem 0.5rem;
    color: var(--color-text);
    text-decoration: none;
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 500;
    border-bottom: 1px solid var(--color-border);
    transition: color 0.2s;
  }

  .navbar__mobile-link:last-child {
    border-bottom: none;
  }

  .navbar__mobile-link:hover,
  .navbar__mobile-link.router-link-active {
    color: var(--color-heading);
  }

  .navbar__mobile-link--signout {
    width: 100%;
    background: none;
    border: none;
    border-bottom: none;
    cursor: pointer;
    text-align: left;
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 500;
    padding: 0.75rem 0.5rem;
    transition: color 0.2s;
  }

  .navbar__mobile-link--signout:hover {
    color: var(--color-danger);
  }
}
</style>
