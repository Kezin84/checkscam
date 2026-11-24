<script setup>
import { ref } from 'vue'

const props = defineProps({
  value: {
    type: String,
    required: true
  },
  label: {
    type: String,
    default: 'Sao chép'
  },
  copiedLabel: {
    type: String,
    default: 'Đã chép'
  },
  icon: {
    type: String,
    default: 'copy' // 'copy' | 'link'
  }
})

const copied = ref(false)
let timer = null

async function handleCopy() {
  if (!props.value) return
  try {
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      copied.value = false
    }, 1600)
  } catch {
    // Fallback
    const el = document.createElement('textarea')
    el.value = props.value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      copied.value = false
    }, 1600)
  }
}
</script>

<template>
  <button
    type="button"
    class="copy-btn"
    :class="{ 'is-copied': copied }"
    :aria-label="`${label}: ${String(value || '').replace(/\s*\n\s*/g, ' · ')}`"
    :title="copied ? 'Đã sao chép' : label"
    @click.stop="handleCopy"
  >
    <svg
      v-if="!copied && icon === 'link'"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.7 9.3L9.3 6.7M5.6 7.2L4.2 8.6C3.1 9.7 3.1 11.5 4.2 12.6C5.3 13.7 7.1 13.7 8.2 12.6L9.6 11.2M10.4 8.8L11.8 7.4C12.9 6.3 12.9 4.5 11.8 3.4C10.7 2.3 8.9 2.3 7.8 3.4L6.4 4.8"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
    <svg v-else-if="!copied" viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <rect x="5.2" y="5.2" width="8.3" height="8.3" rx="1.5" stroke="currentColor" stroke-width="1.4" />
      <path d="M10.8 5.2V3.6C10.8 2.99 10.31 2.5 9.7 2.5H3.6C2.99 2.5 2.5 2.99 2.5 3.6V9.7C2.5 10.31 2.99 10.8 3.6 10.8H5.2" stroke="currentColor" stroke-width="1.4" />
    </svg>
    <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M3 8.4L6.3 11.7L13.2 4.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
    </svg>
    <span>{{ copied ? copiedLabel : label }}</span>
  </button>
</template>

<style scoped>
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid rgba(13, 116, 128, 0.22);
  background: var(--p-accent-soft);
  color: var(--p-accent);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition:
    background-color 150ms var(--ease),
    border-color 150ms var(--ease),
    color 150ms var(--ease),
    transform 90ms var(--ease);
}

.copy-btn:active {
  transform: scale(0.97);
}

@media (hover: hover) and (pointer: fine) {
  .copy-btn:hover {
    background: #d7ecef;
    border-color: rgba(13, 116, 128, 0.45);
  }
}

.copy-btn.is-copied {
  background: var(--p-verified-bg);
  border-color: var(--p-verified-line);
  color: var(--p-verified);
}
</style>
