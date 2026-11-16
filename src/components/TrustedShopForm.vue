<script setup>
import { reactive, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import BankSelect from './BankSelect.vue'
import PlatformSelect from './PlatformSelect.vue'
import EvidenceUploader from './EvidenceUploader.vue'
import ShopDossierCard from './ShopDossierCard.vue'
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

const SHOP_BADGE_PRESETS = [
  'Quán ngon',
  'Ship hàng nhanh',
  'Giá minh bạch',
  'Hỗ trợ 24/7',
  'Đóng gói kỹ',
  'Giao tận nơi',
  'Trung gian uy tín',
  'Hàng chuẩn Việt'
]

const POSITION_PRESETS = [
  { label: 'Giữa', x: 50, y: 50 },
  { label: 'Trên', x: 50, y: 15 },
  { label: 'Dưới', x: 50, y: 85 },
  { label: 'Trái', x: 15, y: 50 },
  { label: 'Phải', x: 85, y: 50 }
]

function parsePosition(pos = '') {
  const m = String(pos || '').trim().match(/^(\d{1,3})%\s+(\d{1,3})%$/)
  if (!m) return { x: 50, y: 50 }
  return {
    x: Math.min(100, Math.max(0, Number(m[1]))),
    y: Math.min(100, Math.max(0, Number(m[2])))
  }
}

function createInitialState(src) {
  const avatarPos = parsePosition(src?.avatarPosition)
  const coverPos = parsePosition(src?.coverPosition)
  return {
    shopName: src?.shopName || '',
    ownerName: src?.ownerName || '',
    address: src?.address || '',
    category: src?.category || '',
    description: src?.description || '',
    verified: src?.verified !== false,
    badges: Array.isArray(src?.badges) ? [...src.badges] : [],
    avatarList: src?.avatar ? [src.avatar] : [],
    avatarPosX: avatarPos.x,
    avatarPosY: avatarPos.y,
    coverList: src?.coverImage ? [src.coverImage] : [],
    coverPosX: coverPos.x,
    coverPosY: coverPos.y,
    galleryImages: Array.isArray(src?.galleryImages) ? [...src.galleryImages] : [],
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
const previewViewport = ref('desktop')
const customBadgeInput = ref('')
const avatarUploading = ref(false)
const coverUploading = ref(false)
const galleryUploading = ref(false)
const isUploading = computed(() => avatarUploading.value || coverUploading.value || galleryUploading.value)
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

function hasBadge(label) {
  const key = String(label || '').trim().toLowerCase()
  return form.badges.some((b) => b.trim().toLowerCase() === key)
}

function togglePresetBadge(label) {
  const key = label.trim().toLowerCase()
  const idx = form.badges.findIndex((b) => b.trim().toLowerCase() === key)
  if (idx >= 0) {
    form.badges.splice(idx, 1)
  } else if (form.badges.length < 8) {
    form.badges.push(label.trim())
  }
}

function addCustomBadge() {
  const val = customBadgeInput.value.trim()
  if (!val) return
  if (!hasBadge(val) && form.badges.length < 8) {
    form.badges.push(val)
  }
  customBadgeInput.value = ''
}

function removeBadge(idx) {
  form.badges.splice(idx, 1)
}

function applyAvatarPreset(preset) {
  form.avatarPosX = preset.x
  form.avatarPosY = preset.y
}

function applyCoverPreset(preset) {
  form.coverPosX = preset.x
  form.coverPosY = preset.y
}

const previewShop = computed(() => {
  const shopName = form.shopName.trim() || 'Tên Shop (Xem trước)'
  return {
    shopName,
    ownerName: form.ownerName.trim(),
    address: form.address.trim(),
    category: form.category.trim(),
    description: form.description.trim(),
    verified: Boolean(form.verified),
    badges: form.badges,
    avatar: form.avatarList[0] || '',
    avatarPosition: `${form.avatarPosX}% ${form.avatarPosY}%`,
    coverImage: form.coverList[0] || '',
    coverPosition: `${form.coverPosX}% ${form.coverPosY}%`,
    galleryImages: form.galleryImages,
    bankAccounts: form.bankAccounts.filter(
      (b) => b.accountNumber?.trim() || b.accountHolder?.trim() || b.bankCode?.trim()
    ),
    socials: form.socials
      .filter((s) => s.usernameOrPhone?.trim() || s.url?.trim() || s.accountName?.trim())
      .map((s) => ({
        ...s,
        accountName: s.accountName?.trim() || shopName
      }))
  }
})

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
    verified: Boolean(form.verified),
    badges: form.badges,
    avatar: form.avatarList[0] || '',
    avatarPosition: `${form.avatarPosX}% ${form.avatarPosY}%`,
    coverImage: form.coverList[0] || '',
    coverPosition: `${form.coverPosX}% ${form.coverPosY}%`,
    galleryImages: form.galleryImages,
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
  <div class="shop-editor-layout">
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
        <label class="verify-toggle">
          <input v-model="form.verified" type="checkbox" class="verify-toggle__check" />
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
            <path
              d="M10 1.4L12.3 2.8L14.9 2.6L16.1 5L18.4 6.3L18.1 8.9L19.4 11.2L17.6 13.1L17.4 15.7L14.9 16.5L13.3 18.6L10.7 17.9L8.3 19.1L6.3 17.3L3.7 17.2L3 14.7L1 13L1.8 10.5L0.9 8L2.9 6.3L3.4 3.7L6 3.3L7.8 1.5L10 1.4Z"
              fill="#1877F2"
            />
            <path
              d="M6.7 10.3L8.9 12.5L13.6 7.7"
              stroke="#ffffff"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span>Hiển thị icon tick xanh xác minh ngay cạnh tên quán</span>
        </label>
      </div>

      <div class="field">
        <span class="field__label">Badge nổi bật dưới tên quán (tối đa 8 badge)</span>

        <div class="badge-presets">
          <button
            v-for="preset in SHOP_BADGE_PRESETS"
            :key="preset"
            type="button"
            class="badge-chip"
            :class="{ 'is-active': hasBadge(preset) }"
            @click="togglePresetBadge(preset)"
          >
            <span>{{ hasBadge(preset) ? '✓' : '+' }} {{ preset }}</span>
          </button>
        </div>

        <div class="cat-control">
          <input
            v-model="customBadgeInput"
            type="text"
            class="field__input cat-control__input"
            placeholder="Hoặc tự nhập badge (ví dụ: Freeship Makati, Mở 24/7...)"
            @keydown.enter.prevent="addCustomBadge"
          />
          <button
            type="button"
            class="btn btn--secondary cat-control__btn"
            @click="addCustomBadge"
          >
            Thêm
          </button>
        </div>

        <div v-if="form.badges.length" class="badge-selected">
          <span v-for="(badge, bIdx) in form.badges" :key="badge + bIdx" class="badge-selected__item">
            <span>{{ badge }}</span>
            <button
              type="button"
              class="badge-selected__rm"
              :aria-label="`Xóa badge ${badge}`"
              @click="removeBadge(bIdx)"
            >
              ×
            </button>
          </span>
        </div>
      </div>

      <div class="field">
        <span class="field__label">Ảnh đại diện / Logo Shop (Tùy chọn)</span>
        <EvidenceUploader
          v-model="form.avatarList"
          single
          button-label="Tải lên ảnh đại diện của shop"
          @uploading="(state) => (avatarUploading = state)"
        />
        <div v-if="form.avatarList.length" class="pos-control">
          <div class="pos-control__head">
            <span class="label">Căn vị trí ảnh đại diện trong khung tròn</span>
            <div class="pos-control__presets">
              <button
                v-for="p in POSITION_PRESETS"
                :key="'av-' + p.label"
                type="button"
                class="pos-btn"
                :class="{ 'is-active': form.avatarPosX === p.x && form.avatarPosY === p.y }"
                @click="applyAvatarPreset(p)"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
          <div class="pos-control__sliders">
            <label class="pos-slider">
              <span class="mono">Ngang {{ form.avatarPosX }}%</span>
              <input v-model.number="form.avatarPosX" type="range" min="0" max="100" />
            </label>
            <label class="pos-slider">
              <span class="mono">Dọc {{ form.avatarPosY }}%</span>
              <input v-model.number="form.avatarPosY" type="range" min="0" max="100" />
            </label>
          </div>
        </div>
      </div>

      <div class="field">
        <span class="field__label">Ảnh bìa Shop / Banner ngang (Tùy chọn)</span>
        <EvidenceUploader
          v-model="form.coverList"
          single
          button-label="Tải lên ảnh bìa ngang cho đầu card shop"
          @uploading="(state) => (coverUploading = state)"
        />
        <div v-if="form.coverList.length" class="pos-control">
          <div class="pos-control__head">
            <span class="label">Căn vị trí ảnh bìa trên đầu card</span>
            <div class="pos-control__presets">
              <button
                v-for="p in POSITION_PRESETS"
                :key="'cv-' + p.label"
                type="button"
                class="pos-btn"
                :class="{ 'is-active': form.coverPosX === p.x && form.coverPosY === p.y }"
                @click="applyCoverPreset(p)"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
          <div class="pos-control__sliders">
            <label class="pos-slider">
              <span class="mono">Ngang {{ form.coverPosX }}%</span>
              <input v-model.number="form.coverPosX" type="range" min="0" max="100" />
            </label>
            <label class="pos-slider">
              <span class="mono">Dọc {{ form.coverPosY }}%</span>
              <input v-model.number="form.coverPosY" type="range" min="0" max="100" />
            </label>
          </div>
        </div>
      </div>

      <div class="field">
        <span class="field__label">Ảnh menu / món ăn / sản phẩm nổi bật (Tùy chọn, tối đa 8 ảnh)</span>
        <EvidenceUploader
          v-model="form.galleryImages"
          :max-files="8"
          button-label="Tải lên ảnh menu hoặc sản phẩm của shop"
          @uploading="(state) => (galleryUploading = state)"
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

  <!-- Live Customer View Preview -->
  <aside class="shop-preview" aria-label="Xem trước hiển thị phía khách hàng">
    <div class="shop-preview__bar">
      <div>
        <span class="label">Xem trước hiển thị phía khách hàng</span>
        <p class="shop-preview__hint">Tự cập nhật trực tiếp khi bạn chỉnh thông tin hoặc căn vị trí ảnh.</p>
      </div>
      <div class="shop-preview__modes" role="group" aria-label="Chế độ màn hình xem trước">
        <button
          type="button"
          class="pos-btn"
          :class="{ 'is-active': previewViewport === 'desktop' }"
          @click="previewViewport = 'desktop'"
        >
          PC
        </button>
        <button
          type="button"
          class="pos-btn"
          :class="{ 'is-active': previewViewport === 'mobile' }"
          @click="previewViewport = 'mobile'"
        >
          Điện thoại
        </button>
      </div>
    </div>

    <div class="shop-preview__stage" :class="{ 'is-mobile': previewViewport === 'mobile' }">
      <ShopDossierCard :shop="previewShop" :expandable="false" />
    </div>
  </aside>
  </div>
</template>

<style scoped>
.shop-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(380px, 500px);
  gap: var(--s-6);
  align-items: start;
}

.shop-form {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  min-width: 0;
}

.shop-preview {
  position: sticky;
  top: calc(var(--nav) + 16px);
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-4);
  border-radius: var(--r-lg);
  border: 1px solid var(--p-line);
  background: var(--p-surface);
}

.shop-preview__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.shop-preview__hint {
  font-size: 12px;
  color: var(--p-muted);
  margin-top: 2px;
}

.shop-preview__modes {
  display: inline-flex;
  gap: 6px;
}

.shop-preview__stage {
  width: 100%;
  margin: 0 auto;
  transition: max-width 180ms var(--ease);
}

.shop-preview__stage.is-mobile {
  max-width: 375px;
}

.pos-control {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  border: 1px solid var(--p-line);
  background: var(--p-bg);
}

.pos-control__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pos-control__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pos-btn {
  min-height: 28px;
  padding: 3px 10px;
  border-radius: var(--r-sm);
  border: 1px solid var(--p-line);
  background: var(--p-card);
  color: var(--p-ink);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms var(--ease), border-color 140ms var(--ease), color 140ms var(--ease);
}

.pos-btn:hover {
  border-color: var(--p-accent);
}

.pos-btn.is-active {
  background: var(--p-accent);
  border-color: var(--p-accent);
  color: #ffffff;
}

.pos-control__sliders {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pos-slider {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--p-muted);
}

.pos-slider input[type='range'] {
  width: 100%;
  accent-color: var(--p-accent);
  cursor: pointer;
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

.verify-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  border: 1px solid var(--p-line);
  background: var(--p-bg);
  font-size: var(--t-small);
  font-weight: 500;
  color: var(--p-ink);
  cursor: pointer;
}

.verify-toggle__check {
  width: 18px;
  height: 18px;
  accent-color: #1877f2;
  cursor: pointer;
}

.badge-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge-chip {
  min-height: 32px;
  padding: 4px 10px;
  border-radius: var(--r-sm);
  border: 1px solid var(--p-line);
  background: var(--p-bg);
  color: var(--p-text);
  font-size: var(--t-label);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms var(--ease), border-color 140ms var(--ease), color 140ms var(--ease);
}

.badge-chip:hover {
  border-color: var(--p-accent);
}

.badge-chip.is-active {
  background: var(--p-accent-soft);
  border-color: var(--p-accent);
  color: var(--p-accent);
}

.badge-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

.badge-selected__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--r-sm);
  background: var(--p-surface);
  border: 1px solid var(--p-line-strong);
  font-size: var(--t-label);
  font-weight: 500;
  color: var(--p-ink);
}

.badge-selected__rm {
  border: none;
  background: transparent;
  color: var(--p-muted);
  font-size: 15px;
  line-height: 1;
  padding: 0 2px;
  cursor: pointer;
}

.badge-selected__rm:hover {
  color: var(--p-danger);
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

@media (max-width: 1120px) {
  .shop-editor-layout {
    grid-template-columns: 1fr;
  }
  .shop-preview {
    position: static;
  }
}

@media (max-width: 960px) {
  .shop-form__grid-4,
  .shop-form__grid-3,
  .shop-form__grid-2,
  .pos-control__sliders {
    grid-template-columns: 1fr;
  }
}
</style>
