<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useBanks } from '@/services/banks'
import { normalizeText } from '@/utils/normalize'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  inputId: {
    type: String,
    default: 'bank-select'
  },
  invalid: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const { banks } = useBanks()
const open = ref(false)
const search = ref('')
const rootRef = ref(null)

const selectedBank = computed(() => {
  if (!props.modelValue) return null
  return (
    banks.value.find(
      (b) =>
        b.code.toLowerCase() === props.modelValue.toLowerCase() ||
        b.shortName.toLowerCase() === props.modelValue.toLowerCase()
    ) || null
  )
})

const filteredBanks = computed(() => {
  const q = normalizeText(search.value)
  if (!q) return banks.value
  return banks.value.filter(
    (b) =>
      normalizeText(b.code).includes(q) ||
      normalizeText(b.shortName).includes(q) ||
      normalizeText(b.name).includes(q)
  )
})

function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    search.value = ''
  }
}

function chooseBank(bank) {
  emit('update:modelValue', bank.code)
  emit('select', bank)
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
  <div ref="rootRef" class="bank-select" @keydown.esc="open = false">
    <button
      :id="inputId"
      type="button"
      class="field__input bank-select__trigger"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-invalid="invalid ? 'true' : undefined"
      @click="toggleOpen"
    >
      <span v-if="selectedBank" class="bank-select__current">
        <span class="bank-logo-tile">
          <img v-if="selectedBank.logo" :src="selectedBank.logo" :alt="selectedBank.shortName" />
          <span v-else class="mono bank-code-fallback">{{ selectedBank.code.slice(0, 3) }}</span>
        </span>
        <span class="bank-select__title">{{ selectedBank.shortName }}</span>
        <span class="mono bank-select__code">{{ selectedBank.code }}</span>
      </span>
      <span v-else class="bank-select__placeholder">Chọn ngân hàng / ví điện tử</span>

      <svg class="bank-select__chevron" :class="{ 'is-open': open }" viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
        <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
      </svg>
    </button>

    <div v-if="open" class="bank-select__menu" role="listbox">
      <div class="bank-select__search-wrap">
        <input
          v-model="search"
          type="text"
          class="field__input bank-select__search"
          placeholder="Gõ mã hoặc tên ngân hàng (VD: VCB, MB, ACB...)"
          aria-label="Tìm ngân hàng"
        />
      </div>
      <div class="bank-select__list">
        <button
          v-for="bank in filteredBanks"
          :key="bank.code"
          type="button"
          role="option"
          class="bank-select__option"
          :class="{ 'is-active': selectedBank?.code === bank.code }"
          :aria-selected="selectedBank?.code === bank.code ? 'true' : 'false'"
          @click="chooseBank(bank)"
        >
          <span class="bank-logo-tile">
            <img v-if="bank.logo" :src="bank.logo" :alt="bank.shortName" loading="lazy" />
            <span v-else class="mono bank-code-fallback">{{ bank.code.slice(0, 3) }}</span>
          </span>
          <span class="bank-select__option-text">
            <strong>{{ bank.shortName }}</strong>
            <span>{{ bank.name }}</span>
          </span>
          <span class="mono bank-select__code">{{ bank.code }}</span>
        </button>
        <p v-if="filteredBanks.length === 0" class="bank-select__empty">
          Không tìm thấy ngân hàng phù hợp.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bank-select {
  position: relative;
}

.bank-select__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
  text-align: left;
}

.bank-select__current {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.bank-select__title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bank-select__placeholder {
  color: rgba(85, 100, 107, 0.72);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bank-select__code {
  font-size: 12px;
  color: var(--p-muted);
  padding: 2px 6px;
  border-radius: var(--r-sm);
  background: var(--p-surface);
}

.bank-logo-tile {
  width: 44px;
  height: 26px;
  border-radius: var(--r-sm);
  border: 1px solid var(--p-line);
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  flex-shrink: 0;
}

.bank-logo-tile img {
  max-height: 20px;
  width: auto;
  object-fit: contain;
}

.bank-code-fallback {
  font-size: 11px;
  font-weight: 500;
  color: var(--p-ink);
}

.bank-select__chevron {
  flex-shrink: 0;
  color: var(--p-muted);
  transition: transform 180ms var(--ease);
}

.bank-select__chevron.is-open {
  transform: rotate(180deg);
}

.bank-select__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 30;
  background: var(--p-card);
  border: 1px solid var(--p-line-strong);
  border-radius: var(--r-md);
  box-shadow: 0 12px 32px rgba(31, 48, 56, 0.12);
  overflow: hidden;
}

.bank-select__search-wrap {
  padding: 10px;
  border-bottom: 1px solid var(--p-line);
  background: var(--p-bg);
}

.bank-select__search {
  min-height: 40px;
  font-size: 14px;
}

.bank-select__list {
  max-height: 264px;
  overflow-y: auto;
  padding: 6px;
}

.bank-select__option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: none;
  border-radius: var(--r-sm);
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.bank-select__option:hover,
.bank-select__option.is-active {
  background: var(--p-surface);
}

.bank-select__option-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.bank-select__option-text strong {
  font-size: 14px;
  font-weight: 500;
  color: var(--p-ink);
}

.bank-select__option-text span {
  font-size: 12px;
  color: var(--p-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bank-select__empty {
  padding: 16px;
  text-align: center;
  font-size: var(--t-small);
  color: var(--p-muted);
}
</style>
