<script setup>
import { ref, computed } from 'vue'
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
</script>

<template>
  <article class="card shop-card" :class="{ 'shop-card--verified': isVerified }">
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
          <span v-for="(badge, bIdx) in badgeList" :key="badge + bIdx" class="shop-card__tag">
            {{ badge }}
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

    <div class="shop-card__guardrail">
      <svg class="shop-card__guardrail-icon" viewBox="0 0 18 18" width="17" height="17" fill="none" aria-hidden="true">
        <path d="M9 1.8L15 4.2V8.7C15 12.4 12.4 15.4 9 16.4C5.6 15.4 3 12.4 3 8.7V4.2L9 1.8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        <path d="M6.3 9.1L8.1 10.9L11.8 7.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span>Chỉ chuyển khoản đúng số tài khoản chính chủ niêm yết bên dưới. Nếu người bán gửi số tài khoản khác dù trùng tên trang cá nhân, hãy dừng giao dịch ngay.</span>
    </div>

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
    </div>

    <!-- Official Social Links -->
    <div v-if="socialList.length" class="shop-card__section">
      <span class="label">Kênh mạng xã hội chính thức</span>
      <div class="rows">
        <div v-for="(soc, sIdx) in socialList" :key="sIdx" class="rows__item shop-card__row">
          <div class="shop-card__row-main">
            <PlatformIcon :platform="soc.platform" />
            <div class="shop-card__row-text">
              <div class="shop-card__soc-line">
                <span class="shop-card__bank-name">{{ platformLabel(soc.platform) }}</span>
                <span v-if="soc.accountName" class="shop-card__sub-inline"> · {{ soc.accountName }}</span>
              </div>
              <span v-if="resolveSocialId(soc)" class="mono shop-card__sub">
                {{ resolveSocialId(soc) }}
              </span>
            </div>
          </div>
          <div class="shop-card__actions">
            <CopyButton
              v-if="resolveSocialId(soc)"
              :value="resolveSocialId(soc)"
              label="Copy ID"
            />
            <CopyButton
              v-if="resolveSocialUrl(soc)"
              :value="resolveSocialUrl(soc)"
              label="Copy link"
            />
            <a
              v-if="resolveSocialUrl(soc)"
              :href="resolveSocialUrl(soc)"
              target="_blank"
              rel="noopener noreferrer"
              class="link shop-card__ext"
            >
              <span>Mở kênh</span>
              <svg viewBox="0 0 14 14" width="12" height="12" fill="none" aria-hidden="true">
                <path d="M4 10L10 4M10 4H5.2M10 4V8.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
              </svg>
            </a>
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
  gap: var(--s-5);
  content-visibility: auto;
  contain-intrinsic-size: auto 380px;
}

.shop-card--verified {
  border-left: 3px solid #1877f2;
}

.shop-card__identity {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.shop-card__avatar {
  width: 64px;
  height: 64px;
  padding: 0;
  border-radius: var(--r-md);
  border: 1px solid var(--p-line);
  background: var(--p-surface);
  color: var(--p-ink);
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(24, 37, 43, 0.08);
}

.shop-card__avatar--btn {
  cursor: zoom-in;
  transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
}

.shop-card__avatar--btn:hover {
  border-color: var(--p-accent);
  box-shadow: 0 2px 8px rgba(13, 116, 128, 0.16);
}

.shop-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-card__title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.shop-card__name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
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
  padding: 2px 8px;
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
  gap: 6px;
  margin-top: 4px;
}

.shop-card__tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--r-sm);
  background: var(--p-surface);
  border: 1px solid var(--p-line);
  font-size: 12px;
  font-weight: 500;
  color: var(--p-ink);
  line-height: 1.4;
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
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--r-sm);
  background: var(--p-verified-bg);
  border: 1px solid var(--p-verified-line);
  color: var(--p-verified);
  font-size: var(--t-small);
  line-height: 1.5;
}

.shop-card__guardrail-icon {
  flex-shrink: 0;
  margin-top: 2px;
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

.shop-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.shop-card__ext {
  font-size: var(--t-small);
}
</style>
