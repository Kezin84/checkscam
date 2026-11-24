<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import CopyButton from './CopyButton.vue'
import LightboxModal from './LightboxModal.vue'
import SocialChannelList from './SocialChannelList.vue'
import PlatformIcon from './icons/PlatformIcon.vue'
import { useBanks } from '@/services/banks'
import { normalizeReportIncidents } from '@/services/repository'
import { optimizeCloudinaryUrl } from '@/services/cloudinary'
import {
  formatDateVi,
  formatCurrencyVi,
  detectPlatformFromInput
} from '@/utils/normalize'

const props = defineProps({
  report: {
    type: Object,
    required: true
  },
  matchInfo: {
    type: Object,
    default: null
  },
  expandable: {
    type: Boolean,
    default: true
  },
  inModal: {
    type: Boolean,
    default: false
  }
})

const { findBank } = useBanks()
const detailModalOpen = ref(false)
const lightboxImages = ref([])
const lightboxIdx = ref(-1)

function handleCardClick(e) {
  if (!props.expandable || props.inModal) return
  if (typeof window !== 'undefined' && window.getSelection?.()?.toString()?.trim()) return
  if (e?.target?.closest?.('button, a, [role="link"], [role="menu"], input, select, textarea')) {
    return
  }
  detailModalOpen.value = true
}

function closeDetailModal() {
  detailModalOpen.value = false
}

function onGlobalKeydown(e) {
  if (e.key === 'Escape' && detailModalOpen.value && lightboxIdx.value === -1) {
    closeDetailModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  if (!props.inModal && detailModalOpen.value && typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})

watch(detailModalOpen, (isOpen) => {
  if (props.inModal || typeof document === 'undefined') return
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

const bankList = computed(() => {
  return Array.isArray(props.report.bankAccounts) ? props.report.bankAccounts : []
})

const socialList = computed(() => {
  return Array.isArray(props.report.socials) ? props.report.socials : []
})

const incidentList = computed(() => {
  return normalizeReportIncidents(props.report)
})

const totalScamAmount = computed(() => {
  const sum = incidentList.value.reduce((acc, inc) => acc + (inc.scamAmount || 0), 0)
  return sum || Number(props.report.scamAmount || 0)
})

const shareUrl = computed(() => {
  const id = String(props.report?.id || '').trim()
  if (!id || typeof window === 'undefined') return ''
  return `${window.location.origin}/alerts/${encodeURIComponent(id)}`
})

function openIncidentLightbox(images, idx) {
  lightboxImages.value = Array.isArray(images) ? images : []
  lightboxIdx.value = idx
}

function closeLightbox() {
  lightboxIdx.value = -1
  if (detailModalOpen.value && typeof document !== 'undefined') {
    requestAnimationFrame(() => {
      if (detailModalOpen.value) document.body.style.overflow = 'hidden'
    })
  }
}

function resolveExposePlatform(url) {
  return (
    detectPlatformFromInput(url) ||
    (/^https?:\/\//i.test(String(url || '').trim()) ? 'website' : 'other')
  )
}

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
  <article
    class="card dossier dossier--danger"
    :class="{
      'dossier--expandable': expandable && !inModal,
      'dossier--in-modal': inModal,
      'dossier--no-incidents': incidentList.length === 0
    }"
    @click="handleCardClick"
  >
    <div v-if="!inModal" class="dossier__head">
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
      <div class="dossier__head-actions">
        <span class="mono dossier__date">Cập nhật {{ formatDateVi(report.createdAt) }}</span>
        <CopyButton
          v-if="shareUrl"
          :value="shareUrl"
          label="Copy link"
          copied-label="Đã chép link"
          icon="link"
        />
      </div>
    </div>

    <div class="dossier__col-identity">
      <div class="dossier__title-block">
        <h3 class="dossier__name">{{ report.subjectName }}</h3>
        <p v-if="report.subjectDescription" class="dossier__subject-desc">
          {{ report.subjectDescription }}
        </p>
        <div v-if="totalScamAmount > 0 || incidentList.length > 1" class="dossier__scam-meta">
          <span v-if="totalScamAmount > 0" class="mono dossier__total-amount">
            Tổng số tiền bị lừa: <strong>{{ formatCurrencyVi(totalScamAmount) }}</strong>
          </span>
          <span v-if="incidentList.length > 1" class="dossier__method">
            {{ incidentList.length }} vụ việc ghi nhận
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
    </div>

    <!-- Incident clusters -->
    <div v-if="incidentList.length" class="dossier__col-incidents dossier__incidents">
      <section
        v-for="(inc, cIdx) in incidentList"
        :key="cIdx"
        class="dossier__incident"
      >
        <div v-if="incidentList.length > 1 || inc.scamAmount > 0" class="dossier__incident-head">
          <span v-if="incidentList.length > 1" class="stamp stamp--danger">
            Vụ việc #{{ cIdx + 1 }}
          </span>
          <span v-if="inc.scamAmount > 0" class="mono dossier__amount">
            Thiệt hại: {{ formatCurrencyVi(inc.scamAmount) }}
          </span>
        </div>

        <div v-if="inc.scamType" class="dossier__section">
          <span class="label">Hình thức lừa đảo</span>
          <span class="dossier__method">{{ inc.scamType }}</span>
        </div>

        <!-- Description -->
        <div v-if="inc.description" class="dossier__section">
          <span class="label">Mô tả sự việc</span>
          <p class="dossier__desc">{{ inc.description }}</p>
        </div>

        <!-- Evidence photos (House rule 1: no captions under images) -->
        <div v-if="inc.evidenceImages.length" class="dossier__section">
          <span class="label">Bằng chứng hình ảnh ({{ inc.evidenceImages.length }})</span>
          <div class="dossier__gallery">
            <button
              v-for="(img, idx) in inc.evidenceImages"
              :key="img + idx"
              type="button"
              class="m-zoom dossier__evidence-btn"
              :aria-label="`Phóng to ảnh bằng chứng ${idx + 1}`"
              @click="openIncidentLightbox(inc.evidenceImages, idx)"
            >
              <img
                :src="optimizeCloudinaryUrl(img, inModal ? 640 : 420)"
                :alt="`Ảnh chụp bằng chứng giao dịch ${idx + 1}`"
                loading="lazy"
              />
            </button>
          </div>
        </div>

        <!-- Expose post links -->
        <div v-if="inc.exposeLinks.length" class="dossier__expose">
          <span class="label">Bài viết bóc phốt đối chiếu:</span>
          <div class="dossier__expose-links">
            <a
              v-for="(url, lIdx) in inc.exposeLinks"
              :key="url + lIdx"
              :href="url"
              target="_blank"
              rel="noopener noreferrer"
              class="link dossier__expose-link"
            >
              <PlatformIcon :platform="resolveExposePlatform(url)" :size="22" />
              <span>Bài đăng cảnh báo {{ inc.exposeLinks.length > 1 ? lIdx + 1 : '' }}</span>
              <svg viewBox="0 0 14 14" width="12" height="12" fill="none" aria-hidden="true">
                <path d="M4 10L10 4M10 4H5.2M10 4V8.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>

    <LightboxModal
      :images="lightboxImages"
      :active-index="lightboxIdx"
      @close="closeLightbox"
      @change="(i) => (lightboxIdx = i)"
    />

    <!-- Detail Modal when clicking on Scam Report Card -->
    <Teleport to="body">
      <div
        v-if="detailModalOpen && !inModal"
        class="report-modal-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="`Chi tiết hồ sơ cảnh báo ${report.subjectName}`"
        @click.self="closeDetailModal"
      >
        <div class="report-modal">
          <div class="report-modal__bar">
            <div class="report-modal__head-info">
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
              <span class="mono report-modal__date">Cập nhật {{ formatDateVi(report.createdAt) }}</span>
            </div>

            <div class="report-modal__bar-actions">
              <CopyButton
                v-if="shareUrl"
                :value="shareUrl"
                label="Copy link"
                copied-label="Đã chép link"
                icon="link"
              />
              <button
                type="button"
                class="modal-close-x"
                aria-label="Đóng chi tiết cảnh báo"
                title="Đóng (Esc)"
                @click="closeDetailModal"
              >
                <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <div class="report-modal__body">
            <ReportDossierCard
              :report="report"
              :match-info="matchInfo"
              :expandable="false"
              in-modal
            />
          </div>
        </div>
      </div>
    </Teleport>
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

.dossier--expandable {
  cursor: pointer;
}

@media (hover: hover) and (pointer: fine) {
  .dossier--expandable:hover {
    transform: translateY(-2px);
    border-color: rgba(180, 35, 24, 0.32);
    border-left-color: var(--p-danger);
    box-shadow:
      0 2px 4px rgba(24, 37, 43, 0.05),
      0 14px 28px -6px rgba(24, 37, 43, 0.1),
      0 16px 32px -12px rgba(180, 35, 24, 0.1);
  }
}

.dossier__col-identity {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  min-width: 0;
}

.dossier--in-modal {
  display: grid;
  grid-template-columns: minmax(310px, 0.92fr) minmax(0, 1.2fr);
  gap: var(--s-5);
  align-items: start;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  content-visibility: visible;
  contain-intrinsic-size: auto;
}

.dossier--in-modal.dossier--no-incidents {
  grid-template-columns: minmax(0, 1fr);
}

.dossier--in-modal .dossier__col-identity {
  background: var(--p-card);
  border: 1px solid rgba(31, 48, 56, 0.12);
  border-left: 3px solid var(--p-danger);
  border-radius: 12px;
  padding: var(--s-5);
  box-shadow: 0 2px 10px rgba(24, 37, 43, 0.04);
}

.dossier--in-modal .dossier__col-incidents {
  min-width: 0;
}

.dossier--in-modal .dossier__incident {
  background: var(--p-card);
  border: 1px solid rgba(31, 48, 56, 0.12);
  border-radius: 12px;
  padding: var(--s-5);
  box-shadow: 0 2px 10px rgba(24, 37, 43, 0.04);
}

.dossier--in-modal .dossier__gallery {
  grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
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

.dossier__head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
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

.dossier__subject-desc {
  font-size: var(--t-small);
  font-weight: 500;
  color: var(--p-danger);
  line-height: 1.55;
  white-space: pre-line;
}

.dossier__total-amount {
  font-size: var(--t-small);
  color: var(--p-danger);
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
  gap: 10px 16px;
  font-size: var(--t-small);
}

.dossier__expose-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.dossier__incidents {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.dossier__incident {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  padding: var(--s-4);
  border-radius: var(--r-md);
  border: 1px solid var(--p-line);
  background: var(--p-surface);
}

.dossier__incident-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 14px;
}

/* Detail Modal */
.report-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 75;
  background: rgba(16, 25, 29, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.report-modal {
  width: min(100%, 1120px);
  max-height: calc(100svh - 48px);
  display: flex;
  flex-direction: column;
  background: #f3f6f8;
  border: 1px solid var(--p-line-strong);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(16, 25, 29, 0.34);
}

.report-modal__bar {
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--p-line);
}

.report-modal__head-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.report-modal__date {
  font-size: var(--t-label);
  color: var(--p-muted);
}

.report-modal__bar-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.report-modal__body {
  padding: var(--s-5);
  overflow-y: auto;
  min-height: 0;
}

@media (max-width: 959px) {
  .dossier--in-modal {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 639px) {
  .report-modal-backdrop {
    padding: 0;
    align-items: stretch;
  }

  .report-modal {
    width: 100%;
    height: 100svh;
    max-height: 100svh;
    border: none;
    border-radius: 0;
  }

  .report-modal__bar {
    padding: 12px 16px;
  }

  .report-modal__body {
    padding: var(--s-4);
  }
}
</style>
