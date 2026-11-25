<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useSiteSeo } from '@/composables/useSiteSeo'

const route = useRoute()
const { siteName, logoUrl, contactTelegram } = useSiteSeo()
const dockHidden = ref(false)
let lastScrollY = 0
let touchStartY = 0
let hasTouch = false

function readScrollY() {
  return Math.max(
    0,
    window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
  )
}

function onWindowScroll() {
  const currentY = readScrollY()
  if (currentY <= 16) {
    dockHidden.value = false
    lastScrollY = currentY
    return
  }

  const delta = currentY - lastScrollY
  if (delta >= 6) {
    dockHidden.value = true
    lastScrollY = currentY
  } else if (delta <= -10) {
    dockHidden.value = false
    lastScrollY = currentY
  }
}

function onTouchStart(e) {
  if (e.touches && e.touches.length === 1) {
    touchStartY = e.touches[0].clientY
    hasTouch = true
  }
}

function onTouchMove(e) {
  if (!hasTouch || !e.touches || e.touches.length !== 1) return
  const curTouchY = e.touches[0].clientY
  const swipeDelta = touchStartY - curTouchY
  if (swipeDelta > 16 && readScrollY() > 16) {
    dockHidden.value = true
    touchStartY = curTouchY
  } else if (swipeDelta < -16) {
    dockHidden.value = false
    touchStartY = curTouchY
  }
}

watch(
  () => route.fullPath,
  () => {
    dockHidden.value = false
    lastScrollY = typeof window !== 'undefined' ? readScrollY() : 0
  }
)

onMounted(() => {
  lastScrollY = readScrollY()
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onWindowScroll)
  document.removeEventListener('touchstart', onTouchStart)
  document.removeEventListener('touchmove', onTouchMove)
})
</script>

<template>
  <header class="nav-bar">
    <div class="wrap nav-bar__inner">
      <a class="skip-link" href="#top">Chuyển tới nội dung chính</a>

      <RouterLink to="/" class="nav-brand" :aria-label="`${siteName} Trang chủ`">
        <span class="nav-brand__mark" aria-hidden="true">
          <img :src="logoUrl" alt="" class="nav-brand__img" width="28" height="28" />
        </span>
        <span class="nav-brand__word">{{ siteName }}</span>
      </RouterLink>

      <nav class="nav-links" aria-label="Điều hướng chính">
        <RouterLink
          to="/"
          class="nav-links__item"
          :aria-current="route.path === '/' ? 'page' : undefined"
        >
          Tra cứu
        </RouterLink>
        <RouterLink
          to="/shops"
          class="nav-links__item"
          :aria-current="route.path.startsWith('/shops') ? 'page' : undefined"
        >
          Shop uy tín
        </RouterLink>
        <RouterLink
          to="/alerts"
          class="nav-links__item"
          :aria-current="route.path.startsWith('/alerts') ? 'page' : undefined"
        >
          Danh sách lừa đảo
        </RouterLink>
        <a
          :href="contactTelegram.url"
          target="_blank"
          rel="noopener noreferrer"
          class="nav-links__item"
        >
          Liên hệ
        </a>
      </nav>

      <div class="nav-actions">
        <RouterLink to="/report" class="btn btn--primary nav-actions__cta">
          <span>Gửi tố cáo</span>
          <svg class="m-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
          </svg>
        </RouterLink>
      </div>
    </div>
  </header>

  <!-- Mobile Dock Bottom Bar -->
  <nav
    class="mobile-dock"
    :class="{ 'is-hidden': dockHidden }"
    :aria-hidden="dockHidden ? 'true' : undefined"
    aria-label="Điều hướng di động"
  >
    <RouterLink
      to="/"
      class="mobile-dock__item"
      :aria-current="route.path === '/' ? 'page' : undefined"
    >
      <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden="true">
        <circle cx="8.8" cy="8.8" r="5.6" stroke="currentColor" stroke-width="1.7" />
        <path d="M13.2 13.2L17.2 17.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
      </svg>
      <span>Tra cứu</span>
    </RouterLink>

    <RouterLink
      to="/shops"
      class="mobile-dock__item"
      :aria-current="route.path.startsWith('/shops') ? 'page' : undefined"
    >
      <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden="true">
        <path
          d="M10 2.4L16.2 4.8V9.8C16.2 13.7 13.5 16.5 10 17.8C6.5 16.5 3.8 13.7 3.8 9.8V4.8L10 2.4Z"
          stroke="currentColor"
          stroke-width="1.6"
        />
        <path d="M7.3 10.1L9.2 12L13 8.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
      </svg>
      <span>Shop uy tín</span>
    </RouterLink>

    <RouterLink
      to="/alerts"
      class="mobile-dock__item"
      :aria-current="route.path.startsWith('/alerts') ? 'page' : undefined"
    >
      <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden="true">
        <path d="M10 3L17.6 16.4H2.4L10 3Z" stroke="currentColor" stroke-width="1.6" />
        <path d="M10 8V11.6M10 13.9V14.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
      </svg>
      <span>Lừa đảo</span>
    </RouterLink>

    <RouterLink
      to="/report"
      class="mobile-dock__item"
      :aria-current="route.path === '/report' ? 'page' : undefined"
    >
      <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden="true">
        <rect x="3.2" y="3.2" width="13.6" height="13.6" rx="2.5" stroke="currentColor" stroke-width="1.6" />
        <path d="M10 6.8V13.2M6.8 10H13.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
      </svg>
      <span>Tố cáo</span>
    </RouterLink>

    <a
      :href="contactTelegram.url"
      target="_blank"
      rel="noopener noreferrer"
      class="mobile-dock__item"
    >
      <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden="true">
        <path
          d="M16.8 3.6L14.3 15.8C14.1 16.5 13.6 16.7 13 16.3L9.4 13.7L7.7 15.3C7.5 15.5 7.3 15.6 7 15.6L7.3 11.9L14 5.9C14.3 5.6 13.9 5.5 13.5 5.7L5.2 10.9L1.7 9.8C1 9.6 1 9 1.9 8.7L15.7 3.3C16.3 3.1 16.9 3.4 16.8 3.6Z"
          stroke="currentColor"
          stroke-width="1.45"
          stroke-linejoin="round"
        />
      </svg>
      <span>Liên hệ</span>
    </a>
  </nav>
</template>

<style scoped>
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--nav);
  z-index: 40;
  background: var(--p-bg);
  border-bottom: 1px solid var(--p-line);
}

.nav-bar__inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-5);
}

.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.nav-brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.nav-brand__img {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--p-line);
  display: block;
}

.nav-brand__word {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--p-ink);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-links__item {
  position: relative;
  font-size: 15px;
  font-weight: 500;
  color: var(--p-muted);
  padding: 6px 0;
  white-space: nowrap;
  background-image: linear-gradient(var(--p-ink), var(--p-ink));
  background-size: 0% 1px;
  background-position: 0 100%;
  background-repeat: no-repeat;
  transition: color var(--m-out) var(--ease), background-size var(--m-out) var(--ease);
}

@media (hover: hover) and (pointer: fine) {
  .nav-links__item:hover {
    color: var(--p-ink);
    background-size: 100% 1px;
    transition-duration: var(--m-in);
  }
}

.nav-links__item[aria-current="page"] {
  color: var(--p-ink);
  background-size: 100% 2px;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Mobile Dock Bottom Bar (hidden on desktop) */
.mobile-dock {
  display: none;
}

@media (max-width: 960px) {
  .nav-links,
  .nav-actions {
    display: none;
  }

  .mobile-dock {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(10px + env(safe-area-inset-bottom, 0px));
    max-width: 500px;
    margin-inline: auto;
    padding: 6px;
    background: var(--p-card);
    border: 1px solid var(--p-line-strong);
    border-radius: var(--r-lg);
    box-shadow: 0 10px 28px rgba(24, 37, 43, 0.16);
    z-index: 45;
    will-change: transform, opacity;
    transition:
      transform 220ms var(--ease),
      opacity 180ms var(--ease),
      visibility 220ms var(--ease);
  }

  .mobile-dock.is-hidden {
    transform: translate3d(0, calc(100% + 56px), 0);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .mobile-dock__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 52px;
    padding: 6px 2px;
    border-radius: var(--r-md);
    color: var(--p-muted);
    font-size: 11.5px;
    font-weight: 500;
    line-height: 1.15;
    text-align: center;
    white-space: nowrap;
    transition:
      background-color var(--m-out) var(--ease),
      color var(--m-out) var(--ease),
      transform var(--m-press) var(--ease);
  }

  .mobile-dock__item:active {
    transform: scale(0.96);
  }

  .mobile-dock__item[aria-current="page"] {
    background: var(--p-accent-soft);
    color: var(--p-action);
    font-weight: 600;
  }
}
</style>
