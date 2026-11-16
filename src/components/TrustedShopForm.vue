<script setup>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import BankSelect from './BankSelect.vue'
import PlatformSelect from './PlatformSelect.vue'
import EvidenceUploader from './EvidenceUploader.vue'
import PlatformIcon from './icons/PlatformIcon.vue'
import { useRepository } from '@/services/repository'
import {
  SHOP_CATEGORIES,
  detectPlatformFromInput,
  extractSocialIdentifier,
  normalizeAccountHolder
} from '@/utils/normalize'

const props = defineProps({
  initialData: {
    type: Object,
    default: null
  },
  submitting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])
const { siteMeta } = useRepository()

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

function createInitialState(src) {
  return {
    shopName: src?.shopName || '',
    ownerName: src?.ownerName || '',
    address: src?.address || '',
    category: src?.category || '',
    description: src?.description || '',
    avatarList: src?.avatar ? [src.avatar] : [],
    socials:
      Array.isArray(src?.socials) && src.socials.length
        ? src.socials.map((s) => ({ ...emptySocial(), ...s }))
        : [emptySocial()],
    bankAccounts:
      Array.isArray(src?.bankAccounts) && src.bankAccounts.length
        ? src.bankAccounts.map((b) => ({ ...emptyBank(), ...b }))
        : [emptyBank()],
    createdAt: src?.createdAt || null
  }
}

const form = reactive(createInitialState(props.initialData))
const isUploading = ref(false)
const categoryModalOpen = ref(false)
const errors = reactive({
  shopName: '',
  category: '',
  identifier: ''
})

const categoryChoices = computed(() => {
  const map = new Map()
  for (const cat of siteMeta.value.shopCategories || []) {
    const label = String(cat.label || '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    map.set(key, { label, count: Number(cat.count || 0), fromDb: true })
  }
  for (const preset of SHOP_CATEGORIES) {
    const key = preset.toLowerCase()
    if (!map.has(key)) {
      map.set(key, { label: preset, count: 0, fromDb: false })
    }
  }
  return Array.from(map.values())
})

function pickCategory(label) {
  form.category = label
  errors.category = ''
  categoryModalOpen.value = false
}

function onModalKeydown(e) {
  if (e.key === 'Escape' && categoryModalOpen.value) {
    categoryModalOpen.value = false
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

function handleSubmit() {
  errors.shopName = ''
  errors.category = ''
  errors.identifier = ''

  if (!form.shopName.trim()) {
    errors.shopName = 'Nhập tên shop hoặc đơn vị được xác minh.'
  }

  if (!form.category.trim()) {
    errors.category = 'Nhập trực tiếp hoặc bấm Chọn lĩnh vực giao dịch.'
  }

  const hasBank = form.bankAccounts.some((b) => b.accountNumber.trim())
  const hasSocial = form.socials.some((s) => s.usernameOrPhone.trim() || s.url.trim())
  if (!hasBank && !hasSocial) {
    errors.identifier = 'Cần khai báo ít nhất 1 Số tài khoản chính chủ hoặc 1 kênh MXH chính thức.'
  }

  if (errors.shopName || errors.category || errors.identifier) return

  emit('submit', {
    shopName: form.shopName.trim(),
    ownerName: form.ownerName.trim(),
    address: form.address.trim(),
    category: form.category.trim(),
    description: form.description.trim(),
    avatar: form.avatarList[0] || '',
    socials: form.socials.map((s) => ({
      ...s,
      accountName: s.accountName.trim() || form.shopName.trim()
    })),
    bankAccounts: form.bankAccounts,
    createdAt: form.createdAt
  })
}
</script>

<template>
  <form class="shop-form" novalidate @submit.prevent="handleSubmit">
    <div class="shop-form__box">
      <h3>Thông tin định danh Shop đã xác minh</h3>

      <div class="shop-form__grid-2">
        <div class="field">
          <label for="sf-name" class="field__label">Tên Shop / Thương hiệu *</label>
          <input
            id="sf-name"
            v-model="form.shopName"
            type="text"
            class="field__input"
            placeholder="Ví dụ: Hoàng Kiên Mobile"
            :aria-invalid="errors.shopName ? 'true' : undefined"
          />
          <p v-if="errors.shopName" class="field__error">{{ errors.shopName }}</p>
        </div>

        <div class="field">
          <label for="sf-owner" class="field__label">Họ tên chủ sở hữu</label>
          <input
            id="sf-owner"
            v-model="form.ownerName"
            type="text"
            class="field__input"
            placeholder="Ví dụ: Trần Văn Kiên"
          />
        </div>
      </div>

      <div class="field">
        <label for="sf-address" class="field__label">Địa chỉ shop</label>
        <input
          id="sf-address"
          v-model="form.address"
          type="text"
          class="field__input"
          placeholder="Ví dụ: Makati / Pasay, Metro Manila, Philippines"
        />
      </div>

      <div class="shop-form__grid-2">
        <div class="field">
          <label for="sf-cat" class="field__label">Lĩnh vực giao dịch *</label>
          <div class="cat-control">
            <input
              id="sf-cat"
              v-model="form.category"
              type="text"
              class="field__input cat-control__input"
              placeholder="Nhập tay hoặc bấm Chọn..."
              :aria-invalid="errors.category ? 'true' : undefined"
            />
            <button
              type="button"
              class="btn btn--secondary cat-control__btn"
              @click="categoryModalOpen = true"
            >
              Chọn
            </button>
          </div>
          <p v-if="errors.category" class="field__error">{{ errors.category }}</p>
        </div>

        <div class="field">
          <label for="sf-desc" class="field__label">Ghi chú xác minh ngắn</label>
          <input
            id="sf-desc"
            v-model="form.description"
            type="text"
            class="field__input"
            placeholder="Ví dụ: Đã đối chiếu giấy tờ & tài khoản ngân hàng chính chủ"
          />
        </div>
      </div>

      <div class="field">
        <span class="field__label">Ảnh đại diện / Logo Shop (Tùy chọn)</span>
        <EvidenceUploader
          v-model="form.avatarList"
          single
          button-label="Tải lên ảnh đại diện của shop"
          @uploading="(state) => (isUploading = state)"
        />
      </div>
    </div>

    <div class="shop-form__box">
      <h3>Tài khoản ngân hàng chính chủ</h3>
      <div class="shop-form__rows">
        <div v-for="(bank, idx) in form.bankAccounts" :key="idx" class="shop-form__item">
          <div class="shop-form__item-head">
            <span>Tài khoản ngân hàng #{{ idx + 1 }}</span>
            <button
              v-if="form.bankAccounts.length > 1"
              type="button"
              class="shop-form__rm"
              @click="form.bankAccounts.splice(idx, 1)"
            >
              Xóa
            </button>
          </div>
          <div class="shop-form__grid-3">
            <div class="field">
              <label :for="`sbank-code-${idx}`" class="field__label">Ngân hàng</label>
              <BankSelect
                :input-id="`sbank-code-${idx}`"
                v-model="bank.bankCode"
                @select="(meta) => onSelectBank(bank, meta)"
              />
            </div>
            <div class="field">
              <label :for="`sbank-acc-${idx}`" class="field__label">Số tài khoản</label>
              <input
                :id="`sbank-acc-${idx}`"
                v-model="bank.accountNumber"
                type="text"
                class="field__input mono"
                placeholder="Số tài khoản chính chủ"
              />
            </div>
            <div class="field">
              <label :for="`sbank-holder-${idx}`" class="field__label">Tên chủ tài khoản</label>
              <input
                :id="`sbank-holder-${idx}`"
                v-model="bank.accountHolder"
                type="text"
                class="field__input mono"
                placeholder="TRAN VAN KIEN"
                @blur="onHolderBlur(bank)"
              />
            </div>
          </div>
        </div>
      </div>
      <div>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          @click="form.bankAccounts.push(emptyBank())"
        >
          + Thêm số tài khoản chính chủ
        </button>
      </div>
    </div>

    <div class="shop-form__box">
      <h3>Kênh mạng xã hội chính thức</h3>
      <div class="shop-form__rows">
        <div v-for="(soc, idx) in form.socials" :key="idx" class="shop-form__item">
          <div class="shop-form__item-head">
            <span class="shop-form__soc-label">
              <PlatformIcon :platform="soc.platform" :size="22" />
              <span>Kênh MXH #{{ idx + 1 }}</span>
            </span>
            <button
              v-if="form.socials.length > 1"
              type="button"
              class="shop-form__rm"
              @click="form.socials.splice(idx, 1)"
            >
              Xóa
            </button>
          </div>
          <div class="shop-form__grid-4">
            <div class="field">
              <label :for="`ssoc-plat-${idx}`" class="field__label">Nền tảng</label>
              <PlatformSelect :input-id="`ssoc-plat-${idx}`" v-model="soc.platform" />
            </div>
            <div class="field">
              <label :for="`ssoc-name-${idx}`" class="field__label">Tên hiển thị MXH</label>
              <input
                :id="`ssoc-name-${idx}`"
                v-model="soc.accountName"
                type="text"
                class="field__input"
                placeholder="Tên Fanpage / Nick"
              />
            </div>
            <div class="field">
              <label :for="`ssoc-handle-${idx}`" class="field__label">Username / SĐT</label>
              <input
                :id="`ssoc-handle-${idx}`"
                v-model="soc.usernameOrPhone"
                type="text"
                class="field__input mono"
                placeholder="0912345678 / UID"
              />
            </div>
            <div class="field">
              <label :for="`ssoc-url-${idx}`" class="field__label">Link chính thức</label>
              <input
                :id="`ssoc-url-${idx}`"
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

      <p v-if="errors.identifier" class="field__error">{{ errors.identifier }}</p>

      <div>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          @click="form.socials.push(emptySocial())"
        >
          + Thêm kênh MXH chính thức
        </button>
      </div>
    </div>

    <div class="shop-form__actions">
      <button type="button" class="btn btn--secondary" @click="emit('cancel')">Hủy</button>
      <button type="submit" class="btn btn--primary" :disabled="submitting || isUploading">
        {{ isUploading ? 'Đang tải ảnh...' : submitting ? 'Đang lưu...' : 'Lưu hồ sơ Shop đã xác minh' }}
      </button>
    </div>

    <!-- Modal chọn nhanh lĩnh vực giao dịch (Admin) -->
    <Teleport to="body">
      <div
        v-if="categoryModalOpen"
        class="cat-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-modal-title"
        @click.self="categoryModalOpen = false"
      >
        <div class="cat-modal">
          <div class="cat-modal__head">
            <div>
              <h3 id="cat-modal-title">Chọn lĩnh vực giao dịch</h3>
              <p class="muted">Chọn lĩnh vực đang có trong DB, gợi ý mẫu, hoặc đóng lại để tự nhập tay.</p>
            </div>
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              @click="categoryModalOpen = false"
            >
              Đóng
            </button>
          </div>

          <div class="cat-modal__list">
            <button
              v-for="item in categoryChoices"
              :key="item.label"
              type="button"
              class="cat-modal__option"
              :class="{ 'is-selected': form.category.trim().toLowerCase() === item.label.toLowerCase() }"
              @click="pickCategory(item.label)"
            >
              <span class="cat-modal__option-main">
                <span>{{ item.label }}</span>
                <span v-if="item.fromDb" class="mono cat-modal__tag">Đang có ({{ item.count }})</span>
              </span>
              <svg
                v-if="form.category.trim().toLowerCase() === item.label.toLowerCase()"
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
.shop-form {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.shop-form__box {
  background: var(--p-card);
  border: 1px solid var(--p-line);
  border-radius: var(--r-lg);
  padding: var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.shop-form__rows {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.shop-form__item {
  padding-top: var(--s-4);
  border-top: 1px solid var(--p-line);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.shop-form__item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--t-small);
  font-weight: 500;
}

.shop-form__soc-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.shop-form__rm {
  border: none;
  background: transparent;
  color: var(--p-danger);
  font-size: var(--t-label);
  font-weight: 500;
  cursor: pointer;
}

.shop-form__grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-4);
}

.shop-form__grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-4);
}

.shop-form__grid-4 {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--s-3);
}

.shop-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--s-3);
}

.cat-control {
  display: flex;
  gap: 8px;
}

.cat-control__input {
  flex: 1;
  min-width: 0;
}

.cat-control__btn {
  min-height: 48px;
  padding: 0 18px;
  flex-shrink: 0;
}

.cat-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(24, 37, 43, 0.56);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.cat-modal {
  width: min(100%, 540px);
  max-height: 85svh;
  display: flex;
  flex-direction: column;
  background: var(--p-card);
  border: 1px solid var(--p-line-strong);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: 0 18px 42px rgba(24, 37, 43, 0.18);
}

.cat-modal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--p-line);
}

.cat-modal__head p {
  font-size: var(--t-small);
  margin-top: 4px;
}

.cat-modal__list {
  display: flex;
  flex-direction: column;
  padding: 8px 12px 16px;
  overflow-y: auto;
}

.cat-modal__option {
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

.cat-modal__option:last-child {
  border-bottom: none;
}

.cat-modal__option:hover {
  background: var(--p-surface);
}

.cat-modal__option.is-selected {
  background: var(--p-accent-soft);
  color: var(--p-action);
  font-weight: 500;
}

.cat-modal__option-main {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.cat-modal__tag {
  font-size: 12px;
  padding: 2px 7px;
  border-radius: var(--r-sm);
  background: var(--p-surface);
  border: 1px solid var(--p-line);
  color: var(--p-muted);
}

@media (max-width: 960px) {
  .shop-form__grid-4,
  .shop-form__grid-3,
  .shop-form__grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
