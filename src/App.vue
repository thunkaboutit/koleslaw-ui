<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'
import BorderFrame from '@/components/BorderFrame.vue'
// import ChatPanel from '@/components/ChatPanel.vue'

const route = useRoute()
</script>

<template>
  <BorderFrame>
<!--    <main>-->
      <AppNavbar v-if="route.name !== 'login'" />
      <RouterView />
<!--    </main>-->
  </BorderFrame>
  <!-- <ChatPanel v-if="route.name !== 'login'" /> -->
</template>
