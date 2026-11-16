<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import PlatformIcon from './icons/PlatformIcon.vue'
import CopyButton from './CopyButton.vue'
import LightboxModal from './LightboxModal.vue'
import { useBanks } from '@/services/banks'
import { optimizeCloudinaryUrl } from '@/services/cloudinary'
import {
  platformLabel,
  resolveSocialId,
  resolveSocialUrl
} from '@/utils/normalize'

const props = defineProps({
  shop: {
    type: Object,
    required: true
  },
  matchInfo: {
    type: Object,
    default: null
  }
})

const { findBank } = useBanks()
const lightboxImages = ref([])
const lightboxIdx = ref(-1)

function openLightbox(images, idx = 0) {
  const valid = (Array.isArray(images) ? images : []).filter(Boolean)
  if (!valid.length) return
  lightboxImages.value = valid
  lightboxIdx.value = idx
}

function closeLightbox() {
  lightboxIdx.value = -1
}

const bankList = computed(() => {
  return Array.isArray(props.shop.bankAccounts) ? props.shop.bankAccounts : []
})

const socialList = computed(() => {
  return Array.isArray(props.shop.socials) ? props.shop.socials : []
})

const galleryList = computed(() => {
  return Array.isArray(props.shop.galleryImages) ? props.shop.galleryImages.filter(Boolean) : []
})

const badgeList = computed(() => {
  return Array.isArray(props.shop.badges) ? props.shop.badges.filter(Boolean) : []
})

const isVerified = computed(() => props.shop.verified !== false)

const initials = computed(() => {
  const words = String(props.shop.shopName || 'S')
    .trim()
    .split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase()
  }
  return words[0].slice(0, 2).toUpperCase()
})

function resolveBankLogo(b) {
  if (b.bankLogo) return b.bankLogo
  const found = findBank(b.bankCode || b.bankName)
  return found?.logo || ''
}

function resolveBankLabel(b) {
  const found = findBank(b.bankCode || b.bankName)
  return found?.shortName || b.bankName || b.bankCode || 'Ngân hàng'
}

function formatBankCopyValue(b) {
  const stk = String(b.accountNumber || '').trim()
  const bankName = b.bankCode || b.bankName ? resolveBankLabel(b) : ''
  const holder = String(b.accountHolder || '').trim()
  return [stk, bankName, holder].filter(Boolean).join('\n')
}

function openSocialLink(soc) {
  openCopyMenuIdx.value = -1
  const url = resolveSocialUrl(soc)
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

const openCopyMenuIdx = ref(-1)
const copiedSocialKey = ref('')
let copyResetTimer = null

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

function onGlobalClick() {
  if (openCopyMenuIdx.value !== -1) openCopyMenuIdx.value = -1
}

function onGlobalKeydown(e) {
  if (e.key === 'Escape' && openCopyMenuIdx.value !== -1) {
    openCopyMenuIdx.value = -1
  }
}

onMounted(() => {
  document.addEventListener('click', onGlobalClick)
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onGlobalClick)
  window.removeEventListener('keydown', onGlobalKeydown)
  if (copyResetTimer) clearTimeout(copyResetTimer)
})

function resolveBadgeStyle(label = '') {
  const s = String(label).toLowerCase()
  if (/(ngon|best|hot|chuẩn|đặc sản|chất lượng|thơm|sạch|nổi bật)/.test(s)) {
    return { icon: 'star', tone: 'gold' }
  }
  if (/(nhanh|ship|giao|freeship|tận nơi|hỏa tốc|express)/.test(s)) {
    return { icon: 'bolt', tone: 'fast' }
  }
  if (/(giá|rẻ|minh bạch|ưu đãi|giảm|combo|tặng)/.test(s)) {
    return { icon: 'tag', tone: 'promo' }
  }
  if (/(24\/7|khuya|sớm|hỗ trợ|nhiệt tình|tư vấn|rep)/.test(s)) {
    return { icon: 'clock', tone: 'sky' }
  }
  if (/(đóng gói|uy tín|trung gian|bảo|an toàn|chính chủ)/.test(s)) {
    return { icon: 'shield', tone: 'trust' }
  }
  return { icon: 'check', tone: 'neutral' }
}
</script>

<template>
  <article class="card shop-card">
    <button
      v-if="shop.coverImage"
      type="button"
      class="shop-card__cover shop-card__cover--btn"
      :aria-label="`Xem ảnh bìa của ${shop.shopName}`"
      @click="openLightbox([shop.coverImage], 0)"
    >
      <img
        :src="optimizeCloudinaryUrl(shop.coverImage, 960)"
        :alt="`Ảnh bìa ${shop.shopName}`"
        :style="{ objectPosition: shop.coverPosition || '50% 50%' }"
        loading="lazy"
      />
    </button>

    <div class="shop-card__body" :class="{ 'shop-card__body--with-cover': Boolean(shop.coverImage) }">
      <div class="shop-card__identity">
        <button
          v-if="shop.avatar"
          type="button"
          class="m-zoom shop-card__avatar shop-card__avatar--btn"
          :aria-label="`Xem ảnh đại diện của ${shop.shopName}`"
          @click="openLightbox([shop.avatar], 0)"
        >
          <img
            :src="optimizeCloudinaryUrl(shop.avatar, 240)"
            :alt="`Ảnh đại diện ${shop.shopName}`"
            :style="{ objectPosition: shop.avatarPosition || '50% 50%' }"
            loading="lazy"
          />
        </button>
        <div v-else class="shop-card__avatar">
          <span>{{ initials }}</span>
        </div>
        <div class="shop-card__title-wrap">
          <div class="shop-card__name-row">
            <h3 class="shop-card__name">{{ shop.shopName }}</h3>
            <span
              v-if="isVerified"
              class="shop-card__fb-tick"
              title="Shop đã xác minh"
              aria-label="Shop đã xác minh"
            >
              <svg viewBox="0 0 20 20" width="19" height="19" fill="none" aria-hidden="true">
                <path
                  d="M10 1.4L12.3 2.8L14.9 2.6L16.1 5L18.4 6.3L18.1 8.9L19.4 11.2L17.6 13.1L17.4 15.7L14.9 16.5L13.3 18.6L10.7 17.9L8.3 19.1L6.3 17.3L3.7 17.2L3 14.7L1 13L1.8 10.5L0.9 8L2.9 6.3L3.4 3.7L6 3.3L7.8 1.5L10 1.4Z"
                  fill="#1877F2"
                />
                <path
                  d="M6.7 10.3L8.9 12.5L13.6 7.7"
                  stroke="#ffffff"
                  stroke-width="2.1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </div>

          <span v-if="shop.category" class="shop-card__category">{{ shop.category }}</span>

          <div v-if="badgeList.length" class="shop-card__tags">
          <span
            v-for="(badge, bIdx) in badgeList"
            :key="badge + bIdx"
            class="shop-card__tag"
            :class="`shop-card__tag--${resolveBadgeStyle(badge).tone}`"
          >
            <svg
              v-if="resolveBadgeStyle(badge).icon === 'star'"
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 1.3L10.05 5.45L14.63 6.12L11.31 9.35L12.1 13.91L8 11.76L3.9 13.91L4.69 9.35L1.37 6.12L5.95 5.45L8 1.3Z" />
            </svg>
            <svg
              v-else-if="resolveBadgeStyle(badge).icon === 'bolt'"
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M9.1 1.2L3.2 9.1H7.7L6.8 14.8L12.8 6.9H8.3L9.1 1.2Z" />
            </svg>
            <svg
              v-else-if="resolveBadgeStyle(badge).icon === 'tag'"
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              aria-hidden="true"
            >
              <path d="M8.6 2H3.2C2.54 2 2 2.54 2 3.2V8.6L8.2 14.8C8.67 15.27 9.43 15.27 9.9 14.8L14.8 9.9C15.27 9.43 15.27 8.67 14.8 8.2L8.6 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <circle cx="5.4" cy="5.4" r="1" fill="currentColor" />
            </svg>
            <svg
              v-else-if="resolveBadgeStyle(badge).icon === 'clock'"
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
              <path d="M8 4.8V8.2L10.3 9.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            <svg
              v-else-if="resolveBadgeStyle(badge).icon === 'shield'"
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              aria-hidden="true"
            >
              <path d="M8 1.6L13.3 3.7V7.7C13.3 11 11 13.7 8 14.6C5 13.7 2.7 11 2.7 7.7V3.7L8 1.6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
              <path d="M5.7 8.1L7.3 9.7L10.5 6.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg
              v-else
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
              <path d="M5.4 8.2L7.2 10L10.8 6.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>{{ badge }}</span>
          </span>
        </div>

        <p v-if="shop.ownerName" class="shop-card__owner">
          Chủ sở hữu: <strong>{{ shop.ownerName }}</strong>
        </p>
        <p v-if="shop.address" class="shop-card__address">
          Địa chỉ: <strong>{{ shop.address }}</strong>
        </p>
      </div>
    </div>

    <div v-if="galleryList.length" class="shop-card__section">
      <span class="label">Hình ảnh / Menu quán ({{ galleryList.length }})</span>
      <div class="shop-card__gallery">
        <button
          v-for="(img, idx) in galleryList"
          :key="img + idx"
          type="button"
          class="m-zoom shop-card__thumb"
          :aria-label="`Xem ảnh menu hoặc sản phẩm ${idx + 1} của ${shop.shopName}`"
          @click="openLightbox(galleryList, idx)"
        >
          <img
            :src="optimizeCloudinaryUrl(img, 240)"
            :alt="`Ảnh giới thiệu ${idx + 1} của ${shop.shopName}`"
            loading="lazy"
          />
        </button>
      </div>
    </div>

    <p v-if="shop.description" class="shop-card__desc">
      {{ shop.description }}
    </p>

    <!-- Official Bank Accounts -->
    <div v-if="bankList.length" class="shop-card__section">
      <span class="label">Tài khoản ngân hàng chính chủ</span>
      <div class="rows">
        <div v-for="(bank, bIdx) in bankList" :key="bIdx" class="rows__item shop-card__row">
          <div class="shop-card__row-main">
            <span class="shop-card__bank-logo">
              <img
                v-if="resolveBankLogo(bank)"
                :src="resolveBankLogo(bank)"
                :alt="resolveBankLabel(bank)"
                loading="lazy"
              />
              <span v-else class="mono">{{ (bank.bankCode || 'NH').slice(0, 4) }}</span>
            </span>
            <div class="shop-card__row-text">
              <div class="shop-card__inline">
                <span class="shop-card__bank-name">{{ resolveBankLabel(bank) }}</span>
                <strong v-if="bank.accountNumber" class="mono shop-card__stk">
                  {{ bank.accountNumber }}
                </strong>
              </div>
              <span v-if="bank.accountHolder" class="mono shop-card__sub">
                Chủ TK: {{ bank.accountHolder }}
              </span>
            </div>
          </div>
          <CopyButton v-if="bank.accountNumber" :value="formatBankCopyValue(bank)" label="Chép STK" />
        </div>
      </div>
      <p class="shop-card__guardrail">
        Chỉ chuyển khoản đúng số tài khoản chính chủ niêm yết bên trên. Nếu người bán gửi số tài khoản khác dù trùng tên trang cá nhân, hãy dừng giao dịch ngay.
      </p>
    </div>

    <!-- Official Social Links -->
    <div v-if="socialList.length" class="shop-card__section">
      <span class="label">Kênh mạng xã hội chính thức</span>
      <div class="rows">
        <div
          v-for="(soc, sIdx) in socialList"
          :key="sIdx"
          class="rows__item shop-card__row"
          :class="{ 'shop-card__row--clickable': Boolean(resolveSocialUrl(soc)) }"
          :role="resolveSocialUrl(soc) ? 'link' : undefined"
          :tabindex="resolveSocialUrl(soc) ? 0 : undefined"
          @click="openSocialLink(soc)"
          @keydown.enter.prevent="openSocialLink(soc)"
        >
          <div class="shop-card__row-main">
            <PlatformIcon :platform="soc.platform" />
            <div class="shop-card__row-text">
              <div class="shop-card__soc-line">
                <span class="shop-card__bank-name">{{ platformLabel(soc.platform) }}</span>
                <span v-if="soc.accountName" class="shop-card__sub-inline"> · {{ soc.accountName }}</span>
              </div>

              <div v-if="resolveSocialId(soc) || resolveSocialUrl(soc)" class="shop-card__id-line">
                <span v-if="resolveSocialId(soc)" class="mono shop-card__sub">
                  {{ resolveSocialId(soc) }}
                </span>

                <div class="shop-card__copy-wrap" @click.stop>
                  <button
                    type="button"
                    class="shop-card__copy-trigger"
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
                    <span v-if="copiedSocialKey.startsWith(`${sIdx}-`)" class="shop-card__copied-note">Đã chép</span>
                  </button>

                  <div v-if="openCopyMenuIdx === sIdx" class="shop-card__copy-menu" role="menu">
                    <button
                      v-if="resolveSocialId(soc)"
                      type="button"
                      role="menuitem"
                      class="shop-card__copy-opt"
                      @click.stop="copySocialValue(resolveSocialId(soc), `${sIdx}-id`)"
                    >
                      Copy ID
                    </button>
                    <button
                      v-if="resolveSocialUrl(soc)"
                      type="button"
                      role="menuitem"
                      class="shop-card__copy-opt"
                      @click.stop="copySocialValue(resolveSocialUrl(soc), `${sIdx}-url`)"
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <span v-if="resolveSocialUrl(soc)" class="shop-card__row-arrow" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="15" height="15" fill="none">
              <path d="M4.5 11.5L11.5 4.5M11.5 4.5H6M11.5 4.5V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
            </svg>
          </span>
        </div>
      </div>
    </div>
    </div>

    <LightboxModal
      :images="lightboxImages"
      :active-index="lightboxIdx"
      @close="closeLightbox"
      @change="(i) => (lightboxIdx = i)"
    />
  </article>
</template>

<style scoped>
.shop-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  content-visibility: auto;
  contain-intrinsic-size: auto 460px;
}

.shop-card__cover {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  border-bottom: 1px solid var(--p-line);
  border-radius: calc(var(--r-lg) - 1px) calc(var(--r-lg) - 1px) 0 0;
  background: var(--p-surface);
  overflow: hidden;
}

.shop-card__cover--btn {
  cursor: zoom-in;
}

.shop-card__cover img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: contain;
  transition: transform var(--m-image-out) var(--ease);
}

@media (hover: hover) and (pointer: fine) {
  .shop-card__cover--btn:hover img {
    transform: scale(1.015);
    transition-duration: var(--m-image);
  }
}

.shop-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  padding: var(--s-6);
}

.shop-card__body--with-cover {
  padding-top: var(--s-5);
}

.shop-card__identity {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  text-align: left;
  gap: 14px;
}

.shop-card__avatar {
  width: 76px;
  height: 76px;
  padding: 0;
  border-radius: 50%;
  border: 2px solid var(--p-line);
  background: var(--p-surface);
  color: var(--p-ink);
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(24, 37, 43, 0.08);
}

.shop-card__avatar--btn {
  cursor: zoom-in;
  transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
}

.shop-card__avatar--btn:hover {
  border-color: var(--p-accent);
  box-shadow: 0 4px 14px rgba(13, 116, 128, 0.2);
}

.shop-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-card__title-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.shop-card__name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
}

.shop-card__name {
  font-size: var(--t-h3);
  font-weight: 600;
  color: var(--p-ink);
  line-height: 1.25;
}

.shop-card__fb-tick {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transform: translateY(1px);
}

.shop-card__category {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 2px 10px;
  margin-top: 2px;
  border-radius: var(--r-sm);
  background: var(--p-accent-soft);
  border: 1px solid rgba(13, 116, 128, 0.22);
  font-size: var(--t-label);
  font-weight: 500;
  color: var(--p-accent);
  line-height: 1.35;
}

.shop-card__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 6px;
  margin-top: 4px;
}

@media (max-width: 639px) {
  .shop-card__cover img {
    max-height: 150px;
  }
  .shop-card__body {
    padding: var(--s-5);
  }
  .shop-card__identity {
    gap: 12px;
  }
  .shop-card__avatar {
    width: 64px;
    height: 64px;
    font-size: 18px;
  }
}

.shop-card__tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px 3px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: -0.01em;
  border: 1px solid transparent;
}

.shop-card__tag svg {
  flex-shrink: 0;
}

.shop-card__tag--gold {
  background: #fff7ed;
  border-color: #fed7aa;
  color: #c2410c;
}

.shop-card__tag--fast {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #047857;
}

.shop-card__tag--promo {
  background: #fef2f2;
  border-color: #fecaca;
  color: #b91c1c;
}

.shop-card__tag--sky {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.shop-card__tag--trust {
  background: #f0fdfa;
  border-color: #99f6e4;
  color: #0f766e;
}

.shop-card__tag--neutral {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
}

.shop-card__owner,
.shop-card__address {
  font-size: var(--t-small);
  color: var(--p-muted);
}

.shop-card__owner strong,
.shop-card__address strong {
  font-weight: 500;
  color: var(--p-ink);
}

.shop-card__gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.shop-card__thumb {
  width: 68px;
  height: 68px;
  padding: 0;
  cursor: zoom-in;
  flex-shrink: 0;
}

.shop-card__desc {
  font-size: var(--t-body);
  color: var(--p-text);
}

.shop-card__guardrail {
  margin: 0;
  color: var(--p-danger);
  font-size: var(--t-small);
  font-weight: 500;
  line-height: 1.5;
}

.shop-card__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shop-card__row {
  flex-wrap: wrap;
  gap: 10px 14px;
}

.shop-card__row--clickable {
  cursor: pointer;
  transition: background-color 150ms var(--ease);
}

@media (hover: hover) and (pointer: fine) {
  .shop-card__row--clickable:hover {
    background: var(--p-accent-soft);
  }
}

.shop-card__row-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1 1 210px;
}

.shop-card__bank-logo {
  width: 52px;
  height: 32px;
  border-radius: var(--r-sm);
  border: 1px solid var(--p-line);
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 3px 5px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
}

.shop-card__bank-logo img {
  max-height: 24px;
  width: auto;
  object-fit: contain;
}

.shop-card__row-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.shop-card__inline {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.shop-card__soc-line {
  line-height: 1.4;
}

.shop-card__bank-name {
  font-size: var(--t-small);
  font-weight: 500;
  color: var(--p-ink);
}

.shop-card__stk {
  font-size: 16px;
  font-weight: 500;
  color: var(--p-verified);
  letter-spacing: 0.02em;
}

.shop-card__sub {
  font-size: 13px;
  color: var(--p-muted);
  word-break: break-all;
}

.shop-card__sub-inline {
  font-size: var(--t-small);
  color: var(--p-text);
}

.shop-card__id-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.shop-card__copy-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.shop-card__copy-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 2px 6px;
  border-radius: var(--r-sm);
  border: 1px solid var(--p-line);
  background: var(--p-surface);
  color: var(--p-muted);
  cursor: pointer;
  transition: background-color 140ms var(--ease), border-color 140ms var(--ease), color 140ms var(--ease);
}

.shop-card__copy-trigger:hover {
  background: var(--p-card);
  border-color: var(--p-ink);
  color: var(--p-ink);
}

.shop-card__copy-trigger.is-copied {
  background: var(--p-verified-bg);
  border-color: var(--p-verified-line);
  color: var(--p-verified);
}

.shop-card__copied-note {
  font-size: 11px;
  font-weight: 500;
}

.shop-card__copy-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 25;
  min-width: 124px;
  padding: 4px;
  border-radius: var(--r-md);
  border: 1px solid var(--p-line-strong);
  background: var(--p-card);
  box-shadow: 0 10px 24px rgba(24, 37, 43, 0.14);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shop-card__copy-opt {
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--p-ink);
  font-size: var(--t-label);
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms var(--ease), color 120ms var(--ease);
}

.shop-card__copy-opt:hover {
  background: var(--p-accent-soft);
  color: var(--p-accent);
}

.shop-card__row-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--p-muted);
  flex-shrink: 0;
}

@media (hover: hover) and (pointer: fine) {
  .shop-card__row--clickable:hover .shop-card__row-arrow {
    color: var(--p-accent);
  }
}
</style>
