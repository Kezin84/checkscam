<script setup>
import { ref, computed } from 'vue'
import CopyButton from './CopyButton.vue'
import LightboxModal from './LightboxModal.vue'
import SocialChannelList from './SocialChannelList.vue'
import { useBanks } from '@/services/banks'
import { optimizeCloudinaryUrl } from '@/services/cloudinary'
import {
  formatDateVi,
  formatCurrencyVi
} from '@/utils/normalize'

const props = defineProps({
  report: {
    type: Object,
    required: true
  },
  matchInfo: {
    type: Object,
    default: null
  }
})

const { findBank } = useBanks()
const lightboxIdx = ref(-1)

const bankList = computed(() => {
  return Array.isArray(props.report.bankAccounts) ? props.report.bankAccounts : []
})

const socialList = computed(() => {
  return Array.isArray(props.report.socials) ? props.report.socials : []
})

const evidenceList = computed(() => {
  return Array.isArray(props.report.evidenceImages) ? props.report.evidenceImages : []
})

const exposeList = computed(() => {
  return Array.isArray(props.report.exposeLinks) ? props.report.exposeLinks : []
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

function matchBadgeLabel(type) {
  if (type === 'exact_stk') return 'Khớp chính xác số tài khoản'
  if (type === 'exact_social') return 'Khớp định danh mạng xã hội'
  if (type === 'partial_stk') return 'Khớp dãy số tài khoản'
  if (type === 'name_partial') return 'Trùng tên — đối chiếu kỹ STK bên dưới'
  return ''
}
</script>

<template>
  <article class="card dossier dossier--danger">
    <div class="dossier__head">
      <div class="dossier__badges">
        <span class="stamp stamp--danger">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
            <path d="M8 2.2L14.3 13.2H1.7L8 2.2Z" stroke="currentColor" stroke-width="1.5" />
            <path d="M8 6.4V9.4M8 11.4V11.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
          </svg>
          <span>Cảnh báo lừa đảo</span>
        </span>
        <span v-if="matchInfo?.matchType" class="stamp">
          {{ matchBadgeLabel(matchInfo.matchType) }}
        </span>
      </div>
      <span class="mono dossier__date">Cập nhật {{ formatDateVi(report.createdAt) }}</span>
    </div>

    <div class="dossier__title-block">
      <h3 class="dossier__name">{{ report.subjectName }}</h3>
      <div class="dossier__scam-meta">
        <span v-if="report.scamType" class="dossier__method">{{ report.scamType }}</span>
        <span v-if="report.scamAmount > 0" class="mono dossier__amount">
          Thiệt hại ghi nhận: {{ formatCurrencyVi(report.scamAmount) }}
        </span>
      </div>
    </div>

    <!-- Bank accounts ledger -->
    <div v-if="bankList.length" class="dossier__section">
      <span class="label">Tài khoản nhận tiền bị tố cáo</span>
      <div class="rows">
        <div v-for="(bank, bIdx) in bankList" :key="bIdx" class="rows__item dossier__bank-row">
          <div class="dossier__bank-main">
            <span class="dossier__bank-logo">
              <img
                v-if="resolveBankLogo(bank)"
                :src="resolveBankLogo(bank)"
                :alt="resolveBankLabel(bank)"
                loading="lazy"
              />
              <span v-else class="mono">{{ (bank.bankCode || 'NH').slice(0, 4) }}</span>
            </span>
            <div class="dossier__bank-text">
              <div class="dossier__stk-line">
                <span class="dossier__bank-name">{{ resolveBankLabel(bank) }}</span>
                <strong v-if="bank.accountNumber" class="mono dossier__stk">
                  {{ bank.accountNumber }}
                </strong>
              </div>
              <span v-if="bank.accountHolder" class="mono dossier__holder">
                Chủ TK: {{ bank.accountHolder }}
              </span>
            </div>
          </div>
          <CopyButton v-if="bank.accountNumber" :value="formatBankCopyValue(bank)" label="Chép STK" />
        </div>
      </div>
    </div>

    <!-- Social accounts ledger -->
    <div v-if="socialList.length" class="dossier__section">
      <span class="label">Tài khoản mạng xã hội liên quan</span>
      <SocialChannelList :socials="socialList" />
    </div>

    <!-- Description -->
    <p v-if="report.description" class="dossier__desc">
      {{ report.description }}
    </p>

    <!-- Evidence photos (House rule 1: no captions under images) -->
    <div v-if="evidenceList.length" class="dossier__section">
      <span class="label">Bằng chứng hình ảnh ({{ evidenceList.length }})</span>
      <div class="dossier__gallery">
        <button
          v-for="(img, idx) in evidenceList"
          :key="img + idx"
          type="button"
          class="m-zoom dossier__evidence-btn"
          :aria-label="`Phóng to ảnh bằng chứng ${idx + 1}`"
          @click="lightboxIdx = idx"
        >
          <img
            :src="optimizeCloudinaryUrl(img, 420)"
            :alt="`Ảnh chụp bằng chứng giao dịch ${idx + 1}`"
            loading="lazy"
          />
        </button>
      </div>
    </div>

    <!-- Expose post links -->
    <div v-if="exposeList.length" class="dossier__expose">
      <span class="label">Bài viết bóc phốt đối chiếu:</span>
      <div class="dossier__expose-links">
        <a
          v-for="(url, lIdx) in exposeList"
          :key="url + lIdx"
          :href="url"
          target="_blank"
          rel="noopener noreferrer"
          class="link"
        >
          <span>Bài đăng cảnh báo {{ exposeList.length > 1 ? lIdx + 1 : '' }}</span>
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none" aria-hidden="true">
            <path d="M4 10L10 4M10 4H5.2M10 4V8.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
          </svg>
        </a>
      </div>
    </div>

    <LightboxModal
      :images="evidenceList"
      :active-index="lightboxIdx"
      @close="lightboxIdx = -1"
      @change="(i) => (lightboxIdx = i)"
    />
  </article>
</template>

<style scoped>
.dossier {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  content-visibility: auto;
  contain-intrinsic-size: auto 420px;
}

.dossier--danger {
  border-left: 3px solid var(--p-danger);
}

.dossier__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
}

.dossier__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.dossier__date {
  font-size: var(--t-label);
  color: var(--p-muted);
}

.dossier__title-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dossier__name {
  font-size: var(--t-h3);
  color: var(--p-ink);
}

.dossier__scam-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  font-size: var(--t-body);
}

.dossier__method {
  color: var(--p-danger);
  font-weight: 500;
}

.dossier__amount {
  font-size: var(--t-small);
  color: var(--p-muted);
}

.dossier__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dossier__bank-row {
  flex-wrap: wrap;
  gap: 10px 14px;
}

.dossier__bank-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1 1 210px;
}

.dossier__bank-logo {
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

.dossier__bank-logo img {
  max-height: 24px;
  width: auto;
  object-fit: contain;
}

.dossier__bank-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.dossier__stk-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.dossier__bank-name {
  font-size: var(--t-small);
  font-weight: 500;
  color: var(--p-ink);
}

.dossier__stk {
  font-size: 16px;
  font-weight: 500;
  color: var(--p-danger);
  letter-spacing: 0.02em;
}

.dossier__holder {
  font-size: 13px;
  color: var(--p-muted);
  word-break: break-all;
}

.dossier__desc {
  font-size: var(--t-body);
  color: var(--p-text);
  line-height: 1.65;
  white-space: pre-line;
}

.dossier__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
  gap: var(--s-3);
}

.dossier__evidence-btn {
  padding: 0;
  aspect-ratio: 4 / 3;
  cursor: zoom-in;
}

.dossier__expose {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-top: var(--s-2);
  border-top: 1px solid var(--p-line);
}

.dossier__expose-links {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: var(--t-small);
}
</style>
