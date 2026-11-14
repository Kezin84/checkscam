<script setup>
import { computed } from 'vue'
import PlatformIcon from './icons/PlatformIcon.vue'
import CopyButton from './CopyButton.vue'
import { useBanks } from '@/services/banks'
import { optimizeCloudinaryUrl } from '@/services/cloudinary'
import {
  formatDateVi,
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

const bankList = computed(() => {
  return Array.isArray(props.shop.bankAccounts) ? props.shop.bankAccounts : []
})

const socialList = computed(() => {
  return Array.isArray(props.shop.socials) ? props.shop.socials : []
})

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
  <article class="card shop-card">
    <div class="shop-card__head">
      <div class="shop-card__badges">
        <span class="stamp stamp--verified">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
            <path d="M2.8 8.3L6.2 11.7L13.4 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
          </svg>
          <span>Đã xác minh</span>
        </span>
        <span v-if="shop.category" class="stamp">{{ shop.category }}</span>
      </div>
      <span class="mono shop-card__date">Xác minh {{ formatDateVi(shop.createdAt) }}</span>
    </div>

    <div class="shop-card__identity">
      <div class="shop-card__avatar">
        <img
          v-if="shop.avatar"
          :src="optimizeCloudinaryUrl(shop.avatar, 160)"
          :alt="`Ảnh đại diện ${shop.shopName}`"
          loading="lazy"
        />
        <span v-else>{{ initials }}</span>
      </div>
      <div class="shop-card__title-wrap">
        <h3 class="shop-card__name">{{ shop.shopName }}</h3>
        <p v-if="shop.ownerName" class="shop-card__owner">
          Chủ sở hữu: <strong>{{ shop.ownerName }}</strong>
        </p>
      </div>
    </div>

    <p v-if="shop.description" class="shop-card__desc">
      {{ shop.description }}
    </p>

    <div class="shop-card__guardrail">
      Chỉ chuyển khoản đúng số tài khoản chính chủ niêm yết bên dưới. Nếu người bán gửi số tài khoản khác dù trùng tên trang cá nhân, hãy dừng giao dịch ngay.
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
  </article>
</template>

<style scoped>
.shop-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  border-left: 3px solid var(--p-verified);
  content-visibility: auto;
  contain-intrinsic-size: auto 380px;
}

.shop-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.shop-card__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.shop-card__date {
  font-size: var(--t-label);
  color: var(--p-muted);
}

.shop-card__identity {
  display: flex;
  align-items: center;
  gap: 14px;
}

.shop-card__avatar {
  width: 52px;
  height: 52px;
  border-radius: var(--r-md);
  border: 1px solid var(--p-line);
  background: var(--p-surface);
  color: var(--p-ink);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.shop-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-card__title-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shop-card__name {
  font-size: var(--t-h3);
  color: var(--p-ink);
}

.shop-card__owner {
  font-size: var(--t-small);
  color: var(--p-muted);
}

.shop-card__owner strong {
  font-weight: 500;
  color: var(--p-ink);
}

.shop-card__desc {
  font-size: var(--t-body);
  color: var(--p-text);
}

.shop-card__guardrail {
  padding: 12px 14px;
  border-radius: var(--r-sm);
  background: var(--p-verified-bg);
  border: 1px solid var(--p-verified-line);
  color: var(--p-verified);
  font-size: var(--t-small);
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
