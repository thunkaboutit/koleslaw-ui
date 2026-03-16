<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

async function signOut() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar__left">
      <RouterLink to="/dashboard" class="navbar__brand">Prompt Enhance</RouterLink>
      <RouterLink to="/dashboard" class="navbar__link">Dashboard</RouterLink>
      <RouterLink to="/keys" class="navbar__link">API Keys</RouterLink>
    </div>
    <div class="navbar__right" v-if="auth.user">
      <span class="navbar__user">{{ auth.user.name }}</span>
      <button class="navbar__signout" @click="signOut">Sign out</button>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
}

.navbar__left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.navbar__brand {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-heading);
  text-decoration: none;
}

.navbar__link {
  color: var(--color-text);
  text-decoration: none;
  font-size: 0.875rem;
  padding: 0.25rem 0;
}

.navbar__link.router-link-active {
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-primary);
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
  border: none;
  color: var(--color-text);
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius);
}

.navbar__signout:hover {
  color: var(--color-danger);
}
</style>
