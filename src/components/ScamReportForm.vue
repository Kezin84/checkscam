<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import BankSelect from './BankSelect.vue'
import PlatformSelect from './PlatformSelect.vue'
import EvidenceUploader from './EvidenceUploader.vue'
import PlatformIcon from './icons/PlatformIcon.vue'
import { normalizeReportIncidents } from '@/services/repository'
import {
  SCAM_TYPES,
  detectPlatformFromInput,
  extractSocialIdentifier,
  normalizeAccountHolder
} from '@/utils/normalize'

const props = defineProps({
  initialData: {
    type: Object,
    default: null
  },
  mode: {
    type: String,
    default: 'public' // 'public' | 'admin-approve' | 'admin-direct'
  },
  submitting: {
    type: Boolean,
    default: false
  },
  submitLabel: {
    type: String,
    default: 'Gửi hồ sơ tố cáo'
  }
})

const emit = defineEmits(['submit', 'cancel'])

function emptySocial() {
  return {
    platform: 'facebook',
    accountName: '',
    usernameOrPhone: '',
    url: ''
  }
}

function emptyBank() {
  return {
    bankCode: '',
    bankName: '',
    bankLogo: '',
    accountNumber: '',
    accountHolder: ''
  }
}

let nextIncidentUid = 1

function emptyIncident(overrides = {}) {
  return {
    _uid: nextIncidentUid++,
    scamType: '',
    scamAmount: '',
    description: '',
    evidenceImages: [],
    exposeLinks: [''],
    ...overrides
  }
}

function createInitialState(src) {
  const normalizedIncidents = src ? normalizeReportIncidents(src) : []
  const incidents = normalizedIncidents.length
    ? normalizedIncidents.map((inc) =>
        emptyIncident({
          scamType: inc.scamType || '',
          scamAmount: inc.scamAmount ? String(inc.scamAmount) : '',
          description: inc.description || '',
          evidenceImages: Array.isArray(inc.evidenceImages) ? [...inc.evidenceImages] : [],
          exposeLinks:
            Array.isArray(inc.exposeLinks) && inc.exposeLinks.length ? [...inc.exposeLinks] : ['']
        })
      )
    : [emptyIncident()]

  return {
    subjectName: src?.subjectName || '',
    socials:
      Array.isArray(src?.socials) && src.socials.length
        ? src.socials.map((s) => ({ ...emptySocial(), ...s }))
        : [emptySocial()],
    bankAccounts:
      Array.isArray(src?.bankAccounts) && src.bankAccounts.length
        ? src.bankAccounts.map((b) => ({ ...emptyBank(), ...b }))
        : [emptyBank()],
    incidents,
    reporterName: src?.reporterName || '',
    reporterContact: src?.reporterContact || '',
    createdAt: src?.createdAt || null
  }
}

const form = reactive(createInitialState(props.initialData))
const uploadingMap = reactive({})
const isUploading = computed(() => Object.values(uploadingMap).some(Boolean))
const scamModalOpen = ref(false)
const scamModalTargetIdx = ref(0)
const errors = reactive({
  subjectName: '',
  identifier: '',
  incidents: []
})

function openScamModal(idx) {
  scamModalTargetIdx.value = idx
  scamModalOpen.value = true
}

function pickScamType(st) {
  const targetIdx = scamModalTargetIdx.value
  if (form.incidents[targetIdx]) {
    form.incidents[targetIdx].scamType = st
  }
  if (errors.incidents[targetIdx]) {
    errors.incidents[targetIdx].scamType = ''
  }
  scamModalOpen.value = false
}

function setClusterUploading(uid, state) {
  if (state) {
    uploadingMap[uid] = true
  } else {
    delete uploadingMap[uid]
  }
}

function getIncidentError(idx, field) {
  return errors.incidents[idx]?.[field] || ''
}

function onModalKeydown(e) {
  if (e.key === 'Escape' && scamModalOpen.value) {
    scamModalOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onModalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onModalKeydown)
})

watch(
  () => props.initialData,
  (next) => {
    Object.assign(form, createInitialState(next))
  }
)

function onSocialUrlBlur(soc) {
  if (!soc.url) return
  const detected = detectPlatformFromInput(soc.url)
  if (detected) soc.platform = detected
  if (!soc.usernameOrPhone) {
    const parsed = extractSocialIdentifier(soc.url)
    if (parsed.handle) soc.usernameOrPhone = parsed.handle
  }
}

function onHolderBlur(bank) {
  if (bank.accountHolder) {
    bank.accountHolder = normalizeAccountHolder(bank.accountHolder)
  }
}

function onSelectBank(bankRow, bankMeta) {
  bankRow.bankCode = bankMeta.code
  bankRow.bankName = bankMeta.shortName
  bankRow.bankLogo = bankMeta.logo || ''
}

function addSocialRow() {
  form.socials.push(emptySocial())
}

function removeSocialRow(idx) {
  if (form.socials.length > 1) form.socials.splice(idx, 1)
}

function addBankRow() {
  form.bankAccounts.push(emptyBank())
}

function removeBankRow(idx) {
  if (form.bankAccounts.length > 1) form.bankAccounts.splice(idx, 1)
}

function addIncidentRow() {
  form.incidents.push(emptyIncident())
}

function removeIncidentRow(idx) {
  if (form.incidents.length <= 1) return
  const [removed] = form.incidents.splice(idx, 1)
  if (removed?._uid) delete uploadingMap[removed._uid]
  if (errors.incidents.length > idx) errors.incidents.splice(idx, 1)
}

function addExposeLink(inc) {
  inc.exposeLinks.push('')
}

function removeExposeLink(inc, idx) {
  if (inc.exposeLinks.length > 1) inc.exposeLinks.splice(idx, 1)
  else inc.exposeLinks[0] = ''
}

function validate() {
  errors.subjectName = ''
  errors.identifier = ''
  errors.incidents = form.incidents.map(() => ({ scamType: '', evidence: '' }))

  if (!form.subjectName.trim()) {
    errors.subjectName = 'Nhập tên tài khoản mạng xã hội hoặc tên đối tượng bị tố cáo.'
  }

  const hasBank = form.bankAccounts.some((b) => b.accountNumber.trim())
  const hasSocial = form.socials.some((s) => s.usernameOrPhone.trim() || s.url.trim())
  if (!hasBank && !hasSocial) {
    errors.identifier =
      'Cần nhập ít nhất một Số tài khoản ngân hàng hoặc một Username / SĐT / Link MXH để người khác tra cứu được.'
  }

  let hasIncidentError = false
  form.incidents.forEach((inc, idx) => {
    if (!inc.scamType.trim()) {
      errors.incidents[idx].scamType = 'Nhập trực tiếp hoặc bấm Chọn để điền hình thức lừa đảo.'
      hasIncidentError = true
    }
    if (props.mode === 'public' && inc.evidenceImages.length === 0) {
      errors.incidents[idx].evidence =
        'Tải lên ít nhất 1 ảnh chụp màn hình bằng chứng (tin nhắn hoặc biên lai chuyển khoản).'
      hasIncidentError = true
    }
  })

  return !errors.subjectName && !errors.identifier && !hasIncidentError
}

function handleSubmit() {
  if (isUploading.value) return
  if (!validate()) return

  // Sync subjectName into first social accountName if left blank
  const socialsPayload = form.socials.map((s, idx) => ({
    ...s,
    accountName: s.accountName.trim() || (idx === 0 ? form.subjectName.trim() : '')
  }))

  const incidentsPayload = form.incidents.map((inc) => ({
    scamType: inc.scamType.trim(),
    scamAmount: inc.scamAmount,
    description: inc.description.trim(),
    evidenceImages: [...inc.evidenceImages],
    exposeLinks: [...inc.exposeLinks]
  }))

  const primaryIncident = incidentsPayload[0] || {}
  const totalAmount = incidentsPayload.reduce(
    (sum, inc) => sum + (Number(String(inc.scamAmount || '').replace(/[^\d]/g, '')) || 0),
    0
  )

  emit('submit', {
    subjectName: form.subjectName.trim(),
    scamType: primaryIncident.scamType || '',
    scamAmount: totalAmount || '',
    description: primaryIncident.description || '',
    incidents: incidentsPayload,
    socials: socialsPayload,
    bankAccounts: form.bankAccounts,
    evidenceImages: incidentsPayload.flatMap((inc) => inc.evidenceImages),
    exposeLinks: incidentsPayload.flatMap((inc) => inc.exposeLinks),
    reporterName: form.reporterName.trim(),
    reporterContact: form.reporterContact.trim(),
    createdAt: form.createdAt
  })
}
</script>

<template>
  <form class="report-form" novalidate @submit.prevent="handleSubmit">
    <!-- Block 1: Social Media Identity -->
    <div class="form-group-box">
      <div class="form-group-box__head">
        <h3>1. Thông tin tài khoản mạng xã hội</h3>
        <p class="muted">Nhập tên hiển thị, nền tảng, username/SĐT và liên kết trang cá nhân của đối tượng.</p>
      </div>

      <div class="field">
        <label for="rf-subject-name" class="field__label">
          <span>Tên tài khoản MXH / Tên gọi đối tượng *</span>
        </label>
        <input
          id="rf-subject-name"
          v-model="form.subjectName"
          type="text"
          class="field__input"
          placeholder="Ví dụ: Nguyễn Hoàng Nam (Shop Acc Giá Rẻ)"
          :aria-invalid="errors.subjectName ? 'true' : undefined"
        />
        <p v-if="errors.subjectName" class="field__error">{{ errors.subjectName }}</p>
      </div>

      <div class="repeat-list">
        <div v-for="(soc, idx) in form.socials" :key="idx" class="repeat-item">
          <div class="repeat-item__bar">
            <span class="repeat-item__title">
              <PlatformIcon :platform="soc.platform" :size="24" />
              <span>Tài khoản MXH #{{ idx + 1 }}</span>
            </span>
            <button
              v-if="form.socials.length > 1"
              type="button"
              class="text-remove-btn"
              @click="removeSocialRow(idx)"
            >
              Xóa dòng
            </button>
          </div>

          <div class="repeat-grid-3">
            <div class="field">
              <label :for="`soc-platform-${idx}`" class="field__label">Nền tảng MXH</label>
              <PlatformSelect
                :input-id="`soc-platform-${idx}`"
                v-model="soc.platform"
              />
            </div>

            <div class="field">
              <label :for="`soc-handle-${idx}`" class="field__label">Username / SĐT MXH</label>
              <input
                :id="`soc-handle-${idx}`"
                v-model="soc.usernameOrPhone"
                type="text"
                class="field__input mono"
                placeholder="VD: 0987654321 hoặc UID"
              />
            </div>

            <div class="field">
              <label :for="`soc-url-${idx}`" class="field__label">Link tài khoản MXH</label>
              <input
                :id="`soc-url-${idx}`"
                v-model="soc.url"
                type="url"
                class="field__input"
                placeholder="https://facebook.com/..."
                @blur="onSocialUrlBlur(soc)"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <button type="button" class="btn btn--secondary btn--sm" @click="addSocialRow">
          + Thêm kênh MXH khác (Zalo, Telegram...)
        </button>
      </div>
    </div>

    <!-- Block 2: Bank Account Info -->
    <div class="form-group-box">
      <div class="form-group-box__head">
        <h3>2. Tài khoản ngân hàng nhận tiền</h3>
        <p class="muted">Số tài khoản giúp cảnh báo chính xác ngay cả khi kẻ gian đổi tên Facebook.</p>
      </div>

      <div class="repeat-list">
        <div v-for="(bank, idx) in form.bankAccounts" :key="idx" class="repeat-item">
          <div v-if="form.bankAccounts.length > 1" class="repeat-item__bar">
            <span class="repeat-item__title">Tài khoản ngân hàng #{{ idx + 1 }}</span>
            <button type="button" class="text-remove-btn" @click="removeBankRow(idx)">
              Xóa STK
            </button>
          </div>

          <div class="repeat-grid-3">
            <div class="field">
              <label :for="`bank-code-${idx}`" class="field__label">Ngân hàng</label>
              <BankSelect
                :input-id="`bank-code-${idx}`"
                v-model="bank.bankCode"
                @select="(meta) => onSelectBank(bank, meta)"
              />
            </div>

            <div class="field">
              <label :for="`bank-acc-${idx}`" class="field__label">Số tài khoản</label>
              <input
                :id="`bank-acc-${idx}`"
                v-model="bank.accountNumber"
                type="text"
                inputmode="text"
                class="field__input mono"
                placeholder="Nhập liền số tài khoản"
              />
            </div>

            <div class="field">
              <label :for="`bank-holder-${idx}`" class="field__label">Tên chủ tài khoản</label>
              <input
                :id="`bank-holder-${idx}`"
                v-model="bank.accountHolder"
                type="text"
                class="field__input mono"
                placeholder="VD: NGUYEN VAN A"
                @blur="onHolderBlur(bank)"
              />
            </div>
          </div>
        </div>
      </div>

      <p v-if="errors.identifier" class="field__error">{{ errors.identifier }}</p>

      <div>
        <button type="button" class="btn btn--secondary btn--sm" @click="addBankRow">
          + Thêm số tài khoản khác
        </button>
      </div>
    </div>

    <!-- Block 3: Scam Details, Evidence & Expose Post (repeatable incident clusters) -->
    <div class="form-group-box">
      <div class="form-group-box__head">
        <h3>3. Hình thức lừa đảo & Bằng chứng</h3>
        <p class="muted">
          Mỗi vụ việc gồm hình thức, số tiền, tóm tắt sự việc, ảnh bằng chứng và link bài phốt. Có thể thêm nhiều cụm vụ việc khác nhau của cùng đối tượng.
        </p>
      </div>

      <div class="incident-cluster-list">
        <div
          v-for="(inc, idx) in form.incidents"
          :key="inc._uid"
          class="incident-cluster"
        >
          <div class="repeat-item__bar">
            <span class="repeat-item__title">
              <span class="stamp stamp--danger">Cụm vụ việc #{{ idx + 1 }}</span>
            </span>
            <button
              v-if="form.incidents.length > 1"
              type="button"
              class="text-remove-btn"
              @click="removeIncidentRow(idx)"
            >
              Xóa cụm
            </button>
          </div>

          <div class="repeat-grid-2">
            <div class="field">
              <label :for="`rf-scam-type-${idx}`" class="field__label">Hình thức lừa đảo *</label>
              <div class="scam-type-control">
                <input
                  :id="`rf-scam-type-${idx}`"
                  v-model="inc.scamType"
                  type="text"
                  class="field__input scam-type-control__input"
                  placeholder="Nhập tay hoặc bấm Chọn..."
                  :aria-invalid="getIncidentError(idx, 'scamType') ? 'true' : undefined"
                />
                <button
                  type="button"
                  class="btn btn--secondary scam-type-control__btn"
                  @click="openScamModal(idx)"
                >
                  Chọn
                </button>
              </div>
              <p v-if="getIncidentError(idx, 'scamType')" class="field__error">
                {{ getIncidentError(idx, 'scamType') }}
              </p>
            </div>

            <div class="field">
              <label :for="`rf-scam-amount-${idx}`" class="field__label">
                <span>Số tiền chiếm đoạt (VNĐ)</span>
                <span class="field__hint">Không bắt buộc</span>
              </label>
              <input
                :id="`rf-scam-amount-${idx}`"
                v-model="inc.scamAmount"
                type="text"
                inputmode="numeric"
                class="field__input mono"
                placeholder="Ví dụ: 500000"
              />
            </div>
          </div>

          <div class="field">
            <label :for="`rf-desc-${idx}`" class="field__label">
              <span>Tóm tắt sự việc</span>
              <span class="field__hint">Giúp người tra cứu hiểu rõ thủ đoạn</span>
            </label>
            <textarea
              :id="`rf-desc-${idx}`"
              v-model="inc.description"
              class="field__textarea"
              placeholder="Mô tả ngắn gọn diễn biến giao dịch, thời điểm chuyển khoản và cách đối tượng chặn liên lạc..."
            ></textarea>
          </div>

          <div class="field">
            <span class="field__label">
              <span>Bằng chứng hình ảnh {{ mode === 'public' ? '*' : '' }}</span>
            </span>
            <EvidenceUploader
              v-model="inc.evidenceImages"
              @uploading="(state) => setClusterUploading(inc._uid, state)"
            />
            <p v-if="getIncidentError(idx, 'evidence')" class="field__error">
              {{ getIncidentError(idx, 'evidence') }}
            </p>
          </div>

          <div class="field">
            <span class="field__label">
              <span>Link bài viết bóc phốt</span>
              <span class="field__hint">Facebook Group, TikTok, Threads...</span>
            </span>
            <div class="expose-inputs">
              <div v-for="(_, lIdx) in inc.exposeLinks" :key="lIdx" class="expose-inputs__row">
                <input
                  v-model="inc.exposeLinks[lIdx]"
                  type="url"
                  class="field__input"
                  :aria-label="`Link bài viết bóc phốt ${lIdx + 1} của cụm ${idx + 1}`"
                  placeholder="https://facebook.com/groups/..."
                />
                <button
                  v-if="inc.exposeLinks.length > 1 || inc.exposeLinks[0]"
                  type="button"
                  class="btn btn--secondary btn--sm"
                  @click="removeExposeLink(inc, lIdx)"
                >
                  Xóa
                </button>
              </div>
            </div>
            <div>
              <button type="button" class="btn btn--secondary btn--sm" @click="addExposeLink(inc)">
                + Thêm link bài phốt
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <button type="button" class="btn btn--secondary btn--sm" @click="addIncidentRow">
          + Thêm cụm vụ việc / bằng chứng khác
        </button>
      </div>
    </div>

    <!-- Block 4: Private Reporter Info (only in public or pending review) -->
    <div v-if="mode !== 'admin-direct'" class="form-group-box form-group-box--subtle">
      <div class="form-group-box__head">
        <h3>4. Liên hệ người gửi đơn (Bảo mật nội bộ)</h3>
        <p class="muted">
          Chỉ quản trị viên xem được mục này để xác minh khi cần thiết. Thông tin của bạn hoàn toàn không hiển thị lên trang công khai.
        </p>
      </div>

      <div class="repeat-grid-2">
        <div class="field">
          <label for="rf-rep-name" class="field__label">Tên hoặc biệt danh của bạn</label>
          <input
            id="rf-rep-name"
            v-model="form.reporterName"
            type="text"
            autocomplete="name"
            class="field__input"
            placeholder="Có thể để ẩn danh"
          />
        </div>
        <div class="field">
          <label for="rf-rep-contact" class="field__label">Zalo / SĐT hoặc Facebook liên hệ</label>
          <input
            id="rf-rep-contact"
            v-model="form.reporterContact"
            type="text"
            class="field__input"
            placeholder="Để Admin đối chiếu khi có khiếu nại"
          />
        </div>
      </div>
    </div>

    <div class="report-form__footer">
      <button
        v-if="mode !== 'public'"
        type="button"
        class="btn btn--secondary"
        @click="emit('cancel')"
      >
        Hủy bỏ
      </button>
      <button
        type="submit"
        class="btn btn--primary"
        :disabled="submitting || isUploading"
      >
        <span>{{ isUploading ? 'Đang tải ảnh lên...' : submitting ? 'Đang lưu hồ sơ...' : submitLabel }}</span>
        <svg class="m-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
        </svg>
      </button>
    </div>

    <!-- Modal chọn nhanh hình thức lừa đảo -->
    <Teleport to="body">
      <div
        v-if="scamModalOpen"
        class="scam-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scam-modal-title"
        @click.self="scamModalOpen = false"
      >
        <div class="scam-modal">
          <div class="scam-modal__head">
            <div>
              <h3 id="scam-modal-title">Chọn hình thức lừa đảo</h3>
              <p class="muted">Chọn một mẫu bên dưới hoặc đóng lại để tự nhập tay tùy ý.</p>
            </div>
            <button
              type="button"
              class="modal-close-x"
              aria-label="Đóng"
              title="Đóng (Esc)"
              @click="scamModalOpen = false"
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <div class="scam-modal__list">
            <button
              v-for="st in SCAM_TYPES"
              :key="st"
              type="button"
              class="scam-modal__option"
              :class="{ 'is-selected': form.incidents[scamModalTargetIdx]?.scamType === st }"
              @click="pickScamType(st)"
            >
              <span>{{ st }}</span>
              <svg
                v-if="form.incidents[scamModalTargetIdx]?.scamType === st"
                viewBox="0 0 16 16"
                width="16"
                height="16"
                fill="none"
                aria-hidden="true"
              >
                <path d="M3 8.4L6.3 11.7L13.2 4.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </form>
</template>

<style scoped>
.report-form {
  display: flex;
  flex-direction: column;
  gap: var(--s-6);
}

.form-group-box {
  background: var(--p-card);
  border: 1px solid var(--p-line);
  border-radius: var(--r-lg);
  padding: var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.form-group-box--subtle {
  background: var(--p-surface);
}

.form-group-box__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group-box__head p {
  font-size: var(--t-small);
}

.repeat-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.repeat-item {
  padding-top: var(--s-4);
  border-top: 1px solid var(--p-line);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.repeat-item__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.repeat-item__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--t-small);
  font-weight: 500;
  color: var(--p-ink);
}

.text-remove-btn {
  border: none;
  background: transparent;
  color: var(--p-danger);
  font-size: var(--t-label);
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
}

.text-remove-btn:hover {
  text-decoration: underline;
}

.repeat-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-4);
}

.repeat-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-4);
}

.incident-cluster-list {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.incident-cluster {
  padding: var(--s-4);
  border: 1px solid var(--p-line);
  border-radius: var(--r-md);
  background: var(--p-surface);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.expose-inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.expose-inputs__row {
  display: flex;
  gap: 10px;
}

.scam-type-control {
  display: flex;
  gap: 8px;
}

.scam-type-control__input {
  flex: 1;
  min-width: 0;
}

.scam-type-control__btn {
  min-height: 48px;
  padding: 0 18px;
  flex-shrink: 0;
}

.scam-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(24, 37, 43, 0.56);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.scam-modal {
  width: min(100%, 560px);
  max-height: 85svh;
  display: flex;
  flex-direction: column;
  background: var(--p-card);
  border: 1px solid var(--p-line-strong);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: 0 18px 42px rgba(24, 37, 43, 0.18);
}

.scam-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--p-line);
}

.scam-modal__head p {
  font-size: var(--t-small);
  margin-top: 4px;
}

.scam-modal__list {
  display: flex;
  flex-direction: column;
  padding: 8px 12px 16px;
  overflow-y: auto;
}

.scam-modal__option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 14px;
  border: none;
  border-bottom: 1px solid var(--p-line);
  background: transparent;
  color: var(--p-ink);
  font-size: var(--t-body);
  text-align: left;
  cursor: pointer;
  border-radius: var(--r-sm);
  transition: background-color 140ms var(--ease), color 140ms var(--ease);
}

.scam-modal__option:last-child {
  border-bottom: none;
}

.scam-modal__option:hover {
  background: var(--p-surface);
}

.scam-modal__option.is-selected {
  background: var(--p-accent-soft);
  color: var(--p-action);
  font-weight: 500;
}

.report-form__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--s-3);
}

@media (max-width: 860px) {
  .repeat-grid-3,
  .repeat-grid-2 {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .form-group-box {
    padding: var(--s-5);
  }
  .report-form__footer {
    flex-direction: column-reverse;
  }
  .report-form__footer .btn {
    width: 100%;
  }
}
</style>
