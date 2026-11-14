<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const visible = ref(false)
const THRESHOLD = 320

function onScroll() {
  visible.value = window.scrollY > THRESHOLD
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <button
    type="button"
    class="scroll-top-btn"
    :class="{ 'is-visible': visible }"
    :tabindex="visible ? 0 : -1"
    aria-label="Cuộn lên đầu trang"
    title="Lên đầu trang"
    @click="scrollToTop"
  >
    <svg class="scroll-top-btn__icon" viewBox="0 0 18 18" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M9 14.5V3.8M4.2 8.4L9 3.6L13.8 8.4" stroke="currentColor" stroke-width="1.75" stroke-linecap="square" />
    </svg>
  </button>
</template>

<style scoped>
.scroll-top-btn {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 44;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: var(--r-md);
  border: 1px solid var(--p-action);
  background: var(--p-action);
  color: var(--p-action-ink);
  box-shadow: 0 8px 22px rgba(13, 116, 128, 0.28);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(10px);
  transition:
    opacity 180ms var(--ease),
    visibility 180ms var(--ease),
    transform 180ms var(--ease),
    background-color var(--m-out) var(--ease),
    border-color var(--m-out) var(--ease),
    color var(--m-out) var(--ease);
}

.scroll-top-btn.is-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}

.scroll-top-btn__icon {
  transition: transform var(--m-out) var(--ease);
}

@media (hover: hover) and (pointer: fine) {
  .scroll-top-btn.is-visible:hover {
    background: var(--p-accent-hover);
    border-color: var(--p-accent-hover);
    color: var(--p-action-ink);
    transform: translateY(-2px);
    transition-duration: var(--m-in);
  }

  .scroll-top-btn.is-visible:hover .scroll-top-btn__icon {
    transform: translateY(-1.5px);
    transition-duration: var(--m-in);
  }
}

.scroll-top-btn.is-visible:active {
  transform: translateY(1px) scale(0.96);
  transition-duration: var(--m-press);
}

@media (max-width: 960px) {
  .scroll-top-btn {
    right: 16px;
    bottom: calc(84px + env(safe-area-inset-bottom, 0px));
    width: 42px;
    height: 42px;
  }
}
</style>
