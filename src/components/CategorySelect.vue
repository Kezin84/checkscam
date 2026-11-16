<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: 'all'
  },
  inputId: {
    type: String,
    default: 'shop-filter-cat'
  },
  categories: {
    type: Array,
    default: () => []
  },
  totalCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootRef = ref(null)

const options = computed(() => {
  const items = [
    {
      value: 'all',
      label: 'Tất cả lĩnh vực',
      count: Number(props.totalCount || 0)
    }
  ]
  for (const cat of props.categories || []) {
    if (!cat?.label) continue
    items.push({
      value: cat.label,
      label: cat.label,
      count: Number(cat.count || 0)
    })
  }
  return items
})

const selectedOption = computed(() => {
  return options.value.find((opt) => opt.value === props.modelValue) || options.value[0]
})

function toggleOpen() {
  open.value = !open.value
}

function chooseOption(opt) {
  emit('update:modelValue', opt.value)
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
  <div ref="rootRef" class="cat-select" @keydown.esc="open = false">
    <button
      :id="inputId"
      type="button"
      class="field__input cat-select__trigger"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="listbox"
      @click="toggleOpen"
    >
      <span class="cat-select__current">
        <span class="cat-select__label">{{ selectedOption.label }}</span>
        <span class="mono cat-select__count">({{ selectedOption.count }})</span>
      </span>

      <svg
        class="cat-select__chevron"
        :class="{ 'is-open': open }"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-if="open" class="cat-select__menu" role="listbox">
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        role="option"
        class="cat-select__option"
        :class="{ 'is-active': selectedOption.value === opt.value }"
        :aria-selected="selectedOption.value === opt.value ? 'true' : 'false'"
        @click="chooseOption(opt)"
      >
        <span class="cat-select__option-main">
          <span class="cat-select__option-label">{{ opt.label }}</span>
          <span class="mono cat-select__option-count">{{ opt.count }}</span>
        </span>
        <svg
          v-if="selectedOption.value === opt.value"
          viewBox="0 0 16 16"
          width="15"
          height="15"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3 8.4L6.3 11.7L13.2 4.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.cat-select {
  position: relative;
}

.cat-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1.5px solid rgba(13, 116, 128, 0.34);
  cursor: pointer;
  text-align: left;
}

.cat-select__trigger:hover {
  border-color: rgba(13, 116, 128, 0.58);
}

.cat-select__current {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.cat-select__label {
  font-weight: 500;
  color: var(--p-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat-select__count {
  font-size: 13px;
  color: var(--p-muted);
  flex-shrink: 0;
}

.cat-select__chevron {
  flex-shrink: 0;
  color: var(--p-accent);
  transition: transform 180ms var(--ease);
}

.cat-select__chevron.is-open {
  transform: rotate(180deg);
}

.cat-select__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 32;
  max-height: 360px;
  overflow-y: auto;
  padding: 6px;
  background: var(--p-card);
  border: 1px solid rgba(13, 116, 128, 0.24);
  border-radius: 14px;
  box-shadow: 0 14px 32px rgba(24, 37, 43, 0.12);
}

.cat-select__option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 12px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--p-ink);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: background-color 120ms var(--ease);
}

.cat-select__option:hover {
  background: var(--p-surface);
}

.cat-select__option.is-active {
  background: var(--p-accent-soft);
  color: var(--p-accent);
  font-weight: 600;
}

.cat-select__option-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.cat-select__option-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cat-select__option-count {
  font-size: 12px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--p-surface);
  color: var(--p-muted);
  flex-shrink: 0;
}

.cat-select__option.is-active .cat-select__option-count {
  background: rgba(13, 116, 128, 0.14);
  color: var(--p-accent);
}
</style>
