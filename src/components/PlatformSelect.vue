<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import PlatformIcon from './icons/PlatformIcon.vue'
import { PLATFORMS } from '@/utils/normalize'

const props = defineProps({
  modelValue: {
    type: String,
    default: 'facebook'
  },
  inputId: {
    type: String,
    default: 'platform-select'
  },
  includeAll: {
    type: Boolean,
    default: false
  },
  allLabel: {
    type: String,
    default: 'Tất cả nền tảng'
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const open = ref(false)
const rootRef = ref(null)

const options = computed(() => {
  if (!props.includeAll) return PLATFORMS
  return [{ id: 'all', label: props.allLabel }, ...PLATFORMS]
})

const selectedOption = computed(() => {
  return (
    options.value.find((opt) => opt.id === props.modelValue) ||
    options.value[0] || { id: 'other', label: 'Khác' }
  )
})

function toggleOpen() {
  open.value = !open.value
}

function chooseOption(opt) {
  emit('update:modelValue', opt.id)
  emit('change', opt)
  open.value = false
}

function onClickOutside(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <div ref="rootRef" class="platform-select" @keydown.esc="open = false">
    <button
      :id="inputId"
      type="button"
      class="field__input platform-select__trigger"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="listbox"
      @click="toggleOpen"
    >
      <span class="platform-select__current">
        <PlatformIcon :platform="selectedOption.id" :size="24" />
        <span class="platform-select__label">{{ selectedOption.label }}</span>
      </span>

      <svg
        class="platform-select__chevron"
        :class="{ 'is-open': open }"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
      </svg>
    </button>

    <div v-if="open" class="platform-select__menu" role="listbox">
      <button
        v-for="opt in options"
        :key="opt.id"
        type="button"
        role="option"
        class="platform-select__option"
        :class="{ 'is-active': selectedOption.id === opt.id }"
        :aria-selected="selectedOption.id === opt.id ? 'true' : 'false'"
        @click="chooseOption(opt)"
      >
        <span class="platform-select__option-main">
          <PlatformIcon :platform="opt.id" :size="24" />
          <span>{{ opt.label }}</span>
        </span>
        <svg
          v-if="selectedOption.id === opt.id"
          viewBox="0 0 16 16"
          width="15"
          height="15"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3 8.4L6.3 11.7L13.2 4.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.platform-select {
  position: relative;
}

.platform-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 12px;
  border: 1.5px solid rgba(13, 116, 128, 0.3);
  cursor: pointer;
  text-align: left;
}

.platform-select__trigger:hover {
  border-color: rgba(13, 116, 128, 0.56);
}

.platform-select__current {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.platform-select__label {
  font-weight: 500;
  color: var(--p-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.platform-select__chevron {
  flex-shrink: 0;
  color: var(--p-accent);
  transition: transform 180ms var(--ease);
}

.platform-select__chevron.is-open {
  transform: rotate(180deg);
}

.platform-select__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 32;
  max-height: 392px;
  overflow-y: auto;
  padding: 6px;
  background: var(--p-card);
  border: 1px solid rgba(13, 116, 128, 0.24);
  border-radius: 14px;
  box-shadow: 0 14px 32px rgba(24, 37, 43, 0.12);
}

.platform-select__option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--p-ink);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: background-color 120ms var(--ease);
}

.platform-select__option:hover {
  background: var(--p-surface);
}

.platform-select__option.is-active {
  background: var(--p-accent-soft);
  color: var(--p-action);
  font-weight: 500;
}

.platform-select__option-main {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
</style>
