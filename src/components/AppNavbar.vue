<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 80
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

async function signOut() {
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
            <RouterLink to="/dashboard" class="navbar__link">Dashboard</RouterLink>
            <RouterLink to="/keys" class="navbar__link">API Keys</RouterLink>
          </template>
        </div>
      </div>
      <div class="navbar__right">
        <template v-if="auth.user">
          <span class="navbar__user">{{ auth.user.name }}</span>
          <button class="navbar__signout" @click="signOut">Sign out</button>
        </template>
        <RouterLink v-else to="/login" class="navbar__login-btn">Login</RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--wl-cream);
  transition: box-shadow 0.3s, background-color 0.3s;
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

.navbar__user {
  font-size: 0.875rem;
  color: var(--color-text);
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
  transition: color 0.2s, border-color 0.2s;
}

.navbar__signout:hover {
  color: var(--color-danger);
  border-color: var(--color-danger);
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
  transition: background 0.2s, color 0.2s;
}

.navbar__login-btn:hover {
  background: var(--color-heading);
  color: var(--wl-cream);
}

@media (max-width: 768px) {
  .navbar__inner {
    padding: 0.75rem 1rem;
  }

  .navbar__links {
    display: none;
  }
}
</style>
