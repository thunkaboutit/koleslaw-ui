<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import BorderFrame from '@/components/BorderFrame.vue'

const route = useRoute()
</script>

<template>
  <BorderFrame>
    <AppNavbar v-if="route.name !== 'login'" />
    <main>
      <RouterView />
    </main>
  </BorderFrame>
</template>
