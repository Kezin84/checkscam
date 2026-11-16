<script setup>
import { watch, onMounted, onBeforeUnmount } from 'vue'
import { optimizeCloudinaryUrl } from '@/services/cloudinary'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  },
  activeIndex: {
    type: Number,
    default: -1
  }
})

const emit = defineEmits(['close', 'change'])

const isOpen = () => props.activeIndex >= 0 && props.activeIndex < props.images.length

function prev() {
  if (!props.images.length) return
  const nextIdx = (props.activeIndex - 1 + props.images.length) % props.images.length
  emit('change', nextIdx)
}

function next() {
  if (!props.images.length) return
  const nextIdx = (props.activeIndex + 1) % props.images.length
  emit('change', nextIdx)
}

function onKeydown(e) {
  if (!isOpen()) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'ArrowRight') next()
}

watch(
  () => props.activeIndex,
  (idx) => {
    document.body.style.overflow = idx >= 0 ? 'hidden' : ''
  }
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="activeIndex >= 0 && images[activeIndex]"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh bằng chứng"
      @click.self="emit('close')"
    >
      <div class="lightbox__topbar">
        <span class="mono lightbox__counter">{{ activeIndex + 1 }} / {{ images.length }}</span>
        <div class="lightbox__actions">
          <a
            :href="images[activeIndex]"
            target="_blank"
            rel="noopener noreferrer"
            class="lightbox__btn"
          >
            Mở ảnh gốc
          </a>
          <button
            type="button"
            class="lightbox__btn"
            aria-label="Đóng trình xem ảnh"
            @click="emit('close')"
          >
            Đóng (Esc)
          </button>
        </div>
      </div>

      <button
        v-if="images.length > 1"
        type="button"
        class="lightbox__nav lightbox__nav--prev"
        aria-label="Ảnh trước"
        @click.stop="prev"
      >
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
          <path d="M12.5 4.5L7 10L12.5 15.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
        </svg>
      </button>

      <div class="lightbox__stage" @click.self="emit('close')">
        <img
          :src="optimizeCloudinaryUrl(images[activeIndex], 1400)"
          :alt="`Ảnh bằng chứng ${activeIndex + 1}`"
          class="lightbox__img"
        />
      </div>

      <button
        v-if="images.length > 1"
        type="button"
        class="lightbox__nav lightbox__nav--next"
        aria-label="Ảnh tiếp theo"
        @click.stop="next"
      >
        <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
          <path d="M7.5 4.5L13 10L7.5 15.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
        </svg>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(16, 25, 29, 0.94);
  display: flex;
  flex-direction: column;
}

.lightbox__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  color: #f7f9fa;
}

.lightbox__counter {
  font-size: var(--t-small);
}

.lightbox__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lightbox__btn {
  min-height: 38px;
  padding: 0 14px;
  border-radius: var(--r-sm);
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-size: var(--t-small);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.lightbox__btn:hover {
  background: rgba(255, 255, 255, 0.18);
}

.lightbox__stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 72px;
  min-height: 0;
}

.lightbox__img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: var(--r-sm);
}

.lightbox__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: var(--r-sm);
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(24, 37, 43, 0.85);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.lightbox__nav--prev {
  left: 16px;
}

.lightbox__nav--next {
  right: 16px;
}

@media (max-width: 639px) {
  .lightbox__stage {
    padding: 16px;
  }
  .lightbox__nav {
    top: auto;
    bottom: 20px;
    transform: none;
  }
}
</style>
