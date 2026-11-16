<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import PlatformIcon from './icons/PlatformIcon.vue'
import {
  platformLabel,
  resolveSocialId,
  resolveSocialUrl
} from '@/utils/normalize'

defineProps({
  socials: {
    type: Array,
    default: () => []
  }
})

const rootRef = ref(null)
const openCopyMenuIdx = ref(-1)
const copiedSocialKey = ref('')
let copyResetTimer = null

function openSocialLink(soc) {
  openCopyMenuIdx.value = -1
  const url = resolveSocialUrl(soc)
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function toggleCopyMenu(idx) {
  openCopyMenuIdx.value = openCopyMenuIdx.value === idx ? -1 : idx
}

async function copySocialValue(value, key) {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const el = document.createElement('textarea')
    el.value = value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
  copiedSocialKey.value = key
  openCopyMenuIdx.value = -1
  if (copyResetTimer) clearTimeout(copyResetTimer)
  copyResetTimer = setTimeout(() => {
    copiedSocialKey.value = ''
  }, 1600)
}

function onGlobalClick(e) {
  if (openCopyMenuIdx.value !== -1 && (!rootRef.value || !rootRef.value.contains(e.target))) {
    openCopyMenuIdx.value = -1
  }
}

function onGlobalKeydown(e) {
  if (e.key === 'Escape' && openCopyMenuIdx.value !== -1) {
    openCopyMenuIdx.value = -1
    e.stopImmediatePropagation()
  }
}

onMounted(() => {
  document.addEventListener('click', onGlobalClick)
  window.addEventListener('keydown', onGlobalKeydown, { capture: true })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onGlobalClick)
  window.removeEventListener('keydown', onGlobalKeydown, { capture: true })
  if (copyResetTimer) clearTimeout(copyResetTimer)
})
</script>

<template>
  <div ref="rootRef" class="rows">
    <div
      v-for="(soc, sIdx) in socials"
      :key="sIdx"
      class="rows__item soc-row"
      :class="{ 'soc-row--clickable': Boolean(resolveSocialUrl(soc)) }"
      :role="resolveSocialUrl(soc) ? 'link' : undefined"
      :tabindex="resolveSocialUrl(soc) ? 0 : undefined"
      @click="openSocialLink(soc)"
      @keydown.enter.prevent="openSocialLink(soc)"
    >
      <div class="soc-row__main">
        <PlatformIcon :platform="soc.platform" />
        <div class="soc-row__text">
          <div class="soc-row__line">
            <span class="soc-row__platform">{{ platformLabel(soc.platform) }}</span>
            <span v-if="soc.accountName" class="soc-row__name"> · {{ soc.accountName }}</span>
          </div>

          <div v-if="resolveSocialId(soc) || resolveSocialUrl(soc)" class="soc-row__id-line">
            <span v-if="resolveSocialId(soc)" class="mono soc-row__id">
              {{ resolveSocialId(soc) }}
            </span>

            <div class="soc-row__copy-wrap" @click.stop>
              <button
                type="button"
                class="soc-row__copy-trigger"
                :class="{ 'is-copied': copiedSocialKey.startsWith(`${sIdx}-`) }"
                :aria-expanded="openCopyMenuIdx === sIdx ? 'true' : 'false'"
                :aria-label="`Sao chép ID hoặc link ${platformLabel(soc.platform)}`"
                :title="copiedSocialKey.startsWith(`${sIdx}-`) ? 'Đã sao chép' : 'Sao chép ID / Link'"
                @click.stop="toggleCopyMenu(sIdx)"
              >
                <svg
                  v-if="!copiedSocialKey.startsWith(`${sIdx}-`)"
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect x="5.2" y="5.2" width="8.3" height="8.3" rx="1.5" stroke="currentColor" stroke-width="1.4" />
                  <path
                    d="M10.8 5.2V3.6C10.8 2.99 10.31 2.5 9.7 2.5H3.6C2.99 2.5 2.5 2.99 2.5 3.6V9.7C2.5 10.31 2.99 10.8 3.6 10.8H5.2"
                    stroke="currentColor"
                    stroke-width="1.4"
                  />
                </svg>
                <svg v-else viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
                  <path
                    d="M3 8.4L6.3 11.7L13.2 4.8"
                    stroke="currentColor"
                    stroke-width="1.7"
                    stroke-linecap="square"
                  />
                </svg>
                <span v-if="copiedSocialKey.startsWith(`${sIdx}-`)" class="soc-row__copied-note">Đã chép</span>
              </button>

              <div v-if="openCopyMenuIdx === sIdx" class="soc-row__copy-menu" role="menu">
                <button
                  v-if="resolveSocialId(soc)"
                  type="button"
                  role="menuitem"
                  class="soc-row__copy-opt"
                  @click.stop="copySocialValue(resolveSocialId(soc), `${sIdx}-id`)"
                >
                  Copy ID
                </button>
                <button
                  v-if="resolveSocialUrl(soc)"
                  type="button"
                  role="menuitem"
                  class="soc-row__copy-opt"
                  @click.stop="copySocialValue(resolveSocialUrl(soc), `${sIdx}-url`)"
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <span v-if="resolveSocialUrl(soc)" class="soc-row__arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="15" height="15" fill="none">
          <path d="M4.5 11.5L11.5 4.5M11.5 4.5H6M11.5 4.5V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
        </svg>
      </span>
    </div>
  </div>
</template>

<style scoped>
.soc-row {
  flex-wrap: wrap;
  gap: 10px 14px;
}

.soc-row--clickable {
  cursor: pointer;
  transition: background-color 150ms var(--ease);
}

@media (hover: hover) and (pointer: fine) {
  .soc-row--clickable:hover {
    background: var(--p-accent-soft);
  }
}

.soc-row__main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1 1 210px;
}

.soc-row__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.soc-row__line {
  line-height: 1.4;
}

.soc-row__platform {
  font-size: var(--t-small);
  font-weight: 500;
  color: var(--p-ink);
}

.soc-row__name {
  font-size: var(--t-small);
  color: var(--p-text);
}

.soc-row__id-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.soc-row__id {
  font-size: 13px;
  color: var(--p-muted);
  word-break: break-all;
}

.soc-row__copy-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.soc-row__copy-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--p-muted);
  cursor: pointer;
  transition:
    background-color 140ms var(--ease),
    border-color 140ms var(--ease),
    color 140ms var(--ease),
    transform 90ms var(--ease);
}

.soc-row__copy-trigger:active {
  transform: scale(0.95);
}

.soc-row__copy-trigger:hover,
.soc-row__copy-trigger[aria-expanded='true'] {
  background: var(--p-accent-soft);
  border-color: rgba(13, 116, 128, 0.22);
  color: var(--p-accent);
}

.soc-row__copy-trigger.is-copied {
  background: var(--p-verified-bg);
  border-color: var(--p-verified-line);
  color: var(--p-verified);
}

.soc-row__copied-note {
  font-size: 11px;
  font-weight: 600;
}

.soc-row__copy-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 25;
  min-width: 128px;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--p-line);
  background: var(--p-card);
  box-shadow: 0 8px 24px rgba(24, 37, 43, 0.12);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.soc-row__copy-opt {
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--p-ink);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms var(--ease), color 120ms var(--ease);
}

.soc-row__copy-opt:hover {
  background: var(--p-accent-soft);
  color: var(--p-accent);
}

.soc-row__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--p-muted);
  flex-shrink: 0;
}

@media (hover: hover) and (pointer: fine) {
  .soc-row--clickable:hover .soc-row__arrow {
    color: var(--p-accent);
  }
}
</style>
