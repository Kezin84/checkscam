<script setup>
import { watch } from 'vue'
import { Analytics } from '@vercel/analytics/vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import ScrollTopButton from '@/components/ScrollTopButton.vue'
import { useSiteSeo } from '@/composables/useSiteSeo'

const { seoSettings, applyClientSeo } = useSiteSeo()

watch(
  seoSettings,
  () => {
    applyClientSeo()
  },
  { deep: true }
)
</script>

<template>
  <Analytics />
  <AppHeader />
  <main id="top" class="app-main">
    <RouterView />
  </main>
  <AppFooter />
  <ScrollTopButton />
</template>

<style scoped>
.app-main {
  padding-top: var(--nav);
  min-height: calc(100svh - 120px);
}
</style>
