<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import AppFooter from '@/components/AppFooter.vue'
import BorderFrame from '@/components/BorderFrame.vue'
// import ChatPanel from '@/components/ChatPanel.vue'

const route = useRoute()
</script>

<template>
  <BorderFrame>
<!--    <main>-->
      <AppNavbar v-if="route.name !== 'login' && route.name !== 'signup'" />
      <RouterView />
      <AppFooter v-if="route.name !== 'login' && route.name !== 'signup'" />
<!--    </main>-->
  </BorderFrame>
  <!-- <ChatPanel v-if="route.name !== 'login'" /> -->
</template>
