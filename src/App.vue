<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'

const route = useRoute()
</script>

<template>
  <AppNavbar v-if="route.name !== 'login'" />
  <RouterView />
</template>
