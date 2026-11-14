<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>

<template>
  <AppHeader />
  <main id="top" class="app-main">
    <RouterView />
  </main>
  <AppFooter />
</template>

<style scoped>
.app-main {
  padding-top: var(--nav);
  min-height: calc(100svh - 120px);
}
</style>
