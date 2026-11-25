<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  useRepository,
  saveSeoSettings,
  purgeEdgeSeoCache,
  fetchSitemapStats,
  syncSitemapEntriesFromDatabase
} from '@/services/repository'
import { uploadImageToCloudinary } from '@/services/cloudinary'
import {
  SEO_ROUTE_KEYS,
  SEO_ROUTE_META,
  DEFAULT_SEO_SETTINGS,
  normalizeSeoSettings,
  resolveRouteSeo,
  buildFaviconVariantUrl,
  buildOgImageUrl,
  buildJsonLdGraph,
  buildRobotsTxt,
  buildLlmsTxt,
  interpolateSeoTemplate,
  extractMetaVerificationCode,
  normalizeTelegramContact
} from '@/utils/seoConfig'
import { formatDateVi } from '@/utils/normalize'
import CopyButton from '@/components/CopyButton.vue'

const emit = defineEmits(['notify'])

const { seoSettings, siteMeta } = useRepository()

const sectionTab = ref('brand') // 'brand' | 'routes' | 'schema' | 'crawl'
const selectedRouteKey = ref('home')
const previewMode = ref('google-dark') // 'google-dark' | 'google-light' | 'social'

const form = ref(normalizeSeoSettings(seoSettings.value))
const baselineJson = ref(JSON.stringify(normalizeSeoSettings(seoSettings.value)))

const saving = ref(false)
const purging = ref(false)
const syncingSitemap = ref(false)
const sitemapStats = ref({ shopsCount: 0, reportsCount: 0, syncedAt: 0 })
const newSameAsUrl = ref('')

const uploadingSlot = reactive({
  favicon: false,
  logo: false,
  ogImage: false,
  routeOg: false
})
const uploadError = reactive({
  favicon: '',
  logo: '',
  ogImage: '',
  routeOg: ''
})

const alternateNamesInput = computed({
  get() {
    return (form.value.alternateNames || []).join(', ')
  },
  set(val) {
    form.value.alternateNames = String(val || '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
})

const isDirty = computed(() => {
  const current = JSON.stringify(normalizeSeoSettings({ ...form.value, updatedAt: 0 }))
  const base = JSON.stringify(
    normalizeSeoSettings({ ...JSON.parse(baselineJson.value), updatedAt: 0 })
  )
  return current !== base
})

// Keep local form synced with Firebase RTDB unless admin has unsaved edits
watch(
  seoSettings,
  (next) => {
    const normalized = normalizeSeoSettings(next)
    const nextJson = JSON.stringify(normalized)
    if (!isDirty.value) {
      form.value = normalized
    }
    baselineJson.value = nextJson
  },
  { deep: true }
)

onMounted(async () => {
  sitemapStats.value = await fetchSitemapStats()
})

const activeRouteConfig = computed(() => form.value.routes[selectedRouteKey.value])
const activeRouteMeta = computed(() => SEO_ROUTE_META[selectedRouteKey.value])

const previewResolved = computed(() =>
  resolveRouteSeo(form.value, {
    routeName: selectedRouteKey.value,
    path: activeRouteMeta.value.path
  })
)

const previewFaviconSrc = computed(() => {
  const raw = String(form.value.faviconUrl || '').trim()
  if (!raw || raw === '/logo.jpg' || raw === '/favicon-192.png' || raw === '/favicon.svg') {
    return '/favicon-48.png'
  }
  return buildFaviconVariantUrl(raw, 48, form.value.canonicalBase)
})

const previewLogoSrc = computed(() => {
  const raw = String(form.value.logoUrl || '').trim()
  if (!raw) return '/logo.jpg'
  return raw
})

const previewOgImageSrc = computed(() => {
  const routeImg = activeRouteConfig.value?.ogImage
  const raw = String(routeImg || form.value.ogImageUrl || '/logo.jpg').trim()
  if (raw.startsWith('/')) return raw
  return buildOgImageUrl(raw, form.value.canonicalBase)
})

const previewDisplayDomain = computed(() => {
  try {
    return new URL(previewResolved.value.canonical).host
  } catch {
    return 'checkluadao.online'
  }
})

const previewBreadcrumb = computed(() => {
  const p = activeRouteMeta.value.path
  if (p === '/') return previewResolved.value.canonical.replace(/\/$/, '')
  return `${previewDisplayDomain.value} › ${p.replace(/^\//, '')}`
})

const titleLen = computed(() => (previewResolved.value.title || '').length)
const descLen = computed(() => (previewResolved.value.description || '').length)

const titleHealth = computed(() => {
  const n = titleLen.value
  if (n >= 25 && n <= 60) return { status: 'ok', text: `Tiêu đề tối ưu (${n}/60 ký tự)` }
  if (n > 60 && n <= 70) return { status: 'warn', text: `Tiêu đề hơi dài (${n}/60 ký tự — có thể bị cắt ...)` }
  if (n > 70) return { status: 'danger', text: `Tiêu đề quá dài (${n} ký tự — chắc chắn bị cắt)` }
  return { status: 'warn', text: `Tiêu đề hơi ngắn (${n} ký tự)` }
})

const descHealth = computed(() => {
  const n = descLen.value
  if (n >= 110 && n <= 160) return { status: 'ok', text: `Mô tả tối ưu (${n}/160 ký tự)` }
  if (n > 160) return { status: 'warn', text: `Mô tả hơi dài (${n}/160 ký tự — Google sẽ rút gọn)` }
  if (n >= 60) return { status: 'warn', text: `Mô tả ngắn (${n}/160 ký tự — nên 120–155 ký tự)` }
  return { status: 'danger', text: `Mô tả quá ngắn (${n} ký tự)` }
})

const previewShopDynamicExample = computed(() => {
  const sample = {
    name: 'Shop Chị Hương Manila',
    siteName: form.value.siteName,
    category: 'Đổi Peso - VND',
    owner: 'Nguyễn Thị Hương',
    address: 'Makati, Metro Manila',
    description: 'Nhận đổi Peso - VND tỷ giá tốt, giao dịch nhanh 24/7.'
  }
  return {
    title: interpolateSeoTemplate(form.value.dynamicTemplates.shopTitleTemplate, sample),
    description: interpolateSeoTemplate(form.value.dynamicTemplates.shopDescriptionTemplate, sample)
  }
})

const previewAlertDynamicExample = computed(() => {
  const sample = {
    name: 'Nguyễn Văn A (Lừa đổi Peso)',
    siteName: form.value.siteName,
    scamType: 'Chiếm đoạt tiền cọc / đổi tiền',
    amount: '15.000.000 ₫',
    description: 'Nhận chuyển khoản xong chặn Telegram và xóa lịch sử chat.'
  }
  return {
    title: interpolateSeoTemplate(form.value.dynamicTemplates.alertTitleTemplate, sample),
    description: interpolateSeoTemplate(form.value.dynamicTemplates.alertDescriptionTemplate, sample)
  }
})

const jsonLdPreview = computed(() => {
  const graph = buildJsonLdGraph(form.value)
  return graph ? JSON.stringify(graph, null, 2) : '// Đang tắt tất cả Schema JSON-LD'
})

const robotsPreview = computed(() => buildRobotsTxt(form.value))
const llmsPreview = computed(() => buildLlmsTxt(form.value))

const telegramPreview = computed(() =>
  normalizeTelegramContact(form.value.contactTelegramHandle, form.value.contactTelegramUrl)
)

function onTelegramHandleInput() {
  const cleanHandle = String(form.value.contactTelegramHandle || '')
    .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '')
    .replace(/^@+/, '')
    .split(/[/?#]/)[0]
    .trim()
  if (cleanHandle) {
    form.value.contactTelegramUrl = `https://t.me/${cleanHandle}`
  }
}

function appendPlaceholder(targetField, token) {
  const cur = String(form.value.dynamicTemplates[targetField] || '')
  const sep = cur && !cur.endsWith(' ') ? ' ' : ''
  form.value.dynamicTemplates[targetField] = `${cur}${sep}${token}`
}

function addSameAs() {
  let clean = String(newSameAsUrl.value || '').trim()
  if (!clean) return
  if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`
  if (!form.value.schema.sameAs.includes(clean)) {
    form.value.schema.sameAs = [...form.value.schema.sameAs, clean]
  }
  newSameAsUrl.value = ''
}

function removeSameAs(idx) {
  form.value.schema.sameAs = form.value.schema.sameAs.filter((_, i) => i !== idx)
}

function cleanVerificationField(field) {
  form.value.verification[field] = extractMetaVerificationCode(form.value.verification[field])
}

async function handleImageFileUpload(event, slot) {
  const file = event?.target?.files?.[0]
  if (event?.target) event.target.value = ''
  if (!file) return

  uploadingSlot[slot] = true
  uploadError[slot] = ''
  try {
    const preserveTransparency = slot === 'favicon' || slot === 'logo'
    const res = await uploadImageToCloudinary(file, null, {
      preserveTransparency,
      maxDimension: slot === 'favicon' ? 512 : 1600
    })
    if (slot === 'favicon') form.value.faviconUrl = res.url
    else if (slot === 'logo') form.value.logoUrl = res.url
    else if (slot === 'ogImage') form.value.ogImageUrl = res.url
    else if (slot === 'routeOg') form.value.routes[selectedRouteKey.value].ogImage = res.url
    emit('notify', 'Đã tải ảnh lên Cloudinary. Bấm "Lưu cài đặt SEO" để áp dụng lên hệ thống.')
  } catch (err) {
    uploadError[slot] = err?.message || 'Không thể tải ảnh lên.'
  } finally {
    uploadingSlot[slot] = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    const { settings, cachePurged } = await saveSeoSettings(form.value)
    form.value = settings
    baselineJson.value = JSON.stringify(settings)
    emit(
      'notify',
      cachePurged
        ? 'Đã lưu cài đặt SEO & làm mới bộ đệm Cloudflare Edge ngay lập tức.'
        : 'Đã lưu cài đặt SEO vào Database (Cloudflare Edge tự cập nhật trong vòng 60 giây).'
    )
  } catch (err) {
    emit('notify', err?.message || 'Không thể lưu cài đặt SEO.', 'error')
  } finally {
    saving.value = false
  }
}

async function handlePurgeCache() {
  purging.value = true
  try {
    const res = await purgeEdgeSeoCache()
    if (res?.ok) {
      emit('notify', 'Đã xóa bộ đệm SEO trên Cloudflare Worker thành công.')
    } else {
      emit(
        'notify',
        'Không gọi được /api/seo-cache-purge (có thể đang chạy dev local). Trên Cloudflare production cache tự làm mới sau 60 giây.',
        'error'
      )
    }
  } finally {
    purging.value = false
  }
}

function handleResetDefaults() {
  if (
    !window.confirm(
      'Khôi phục toàn bộ biểu mẫu SEO về cấu hình mặc định? (Cần bấm Lưu để ghi đè lên hệ thống)'
    )
  ) {
    return
  }
  form.value = normalizeSeoSettings(DEFAULT_SEO_SETTINGS)
}

async function handleSyncSitemap() {
  syncingSitemap.value = true
  try {
    const stats = await syncSitemapEntriesFromDatabase()
    sitemapStats.value = stats
    emit(
      'notify',
      `Đã đồng bộ Sitemap thành công: ${stats.shopsCount} Shop và ${stats.reportsCount} hồ sơ lừa đảo.`
    )
  } catch (err) {
    emit('notify', err?.message || 'Không thể đồng bộ Sitemap từ Database.', 'error')
  } finally {
    syncingSitemap.value = false
  }
}

function loadDefaultRobotsIntoEditor() {
  const prev = form.value.robots.useCustom
  form.value.robots.useCustom = false
  const generated = buildRobotsTxt(form.value)
  form.value.robots.useCustom = prev
  form.value.robots.content = generated.trim()
}

function loadDefaultLlmsIntoEditor() {
  const prev = form.value.llms.useCustom
  form.value.llms.useCustom = false
  const generated = buildLlmsTxt(form.value)
  form.value.llms.useCustom = prev
  form.value.llms.content = generated.trim()
}

const ROBOTS_OPTIONS = [
  { value: 'index, follow', label: 'index, follow (Cho phép lập chỉ mục — Khuyên dùng)' },
  { value: 'noindex, follow', label: 'noindex, follow (Ẩn khỏi Google, vẫn theo link)' },
  { value: 'index, nofollow', label: 'index, nofollow (Lập chỉ mục, không theo link)' },
  { value: 'noindex, nofollow', label: 'noindex, nofollow (Chặn hoàn toàn khỏi Google)' }
]

const CHANGEFREQ_OPTIONS = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
const PRIORITY_OPTIONS = ['1.0', '0.9', '0.8', '0.7', '0.6', '0.5', '0.4', '0.3']
</script>

<template>
  <div class="seo-panel">
    <!-- Top Sticky Action Bar -->
    <div class="card seo-action-bar">
      <div class="seo-action-bar__info">
        <div class="seo-action-bar__title-row">
          <h2>Cài đặt SEO, Favicon &amp; Nhận diện thương hiệu</h2>
          <span v-if="isDirty" class="stamp stamp--warn">Có thay đổi chưa lưu</span>
          <span v-else class="stamp stamp--verified">Đã đồng bộ</span>
        </div>
        <p class="muted">
          Mọi cấu hình tại đây được lưu vào Firebase và <strong>Cloudflare Worker</strong> tự động bơm thẳng vào HTML server-side cho Googlebot, Facebook, Zalo, Telegram cùng <code>/robots.txt</code>, <code>/sitemap.xml</code>, <code>/favicon.ico</code>.
        </p>
      </div>
      <div class="btn-row">
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          :disabled="saving || purging"
          @click="handleResetDefaults"
        >
          Khôi phục mặc định
        </button>
        <button
          type="button"
          class="btn btn--secondary btn--sm"
          :disabled="saving || purging"
          @click="handlePurgeCache"
        >
          {{ purging ? 'Đang làm mới...' : 'Xóa cache Edge' }}
        </button>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? 'Đang lưu...' : 'Lưu cài đặt SEO' }}
        </button>
      </div>
    </div>

    <!-- LIVE PREVIEW SHOWCASE (Google SERP Dark/Light + Social Share Card) -->
    <div class="card seo-preview-card">
      <div class="seo-preview-card__toolbar">
        <div class="seo-pill-group" role="tablist" aria-label="Chọn trang xem trước">
          <button
            v-for="key in SEO_ROUTE_KEYS"
            :key="key"
            type="button"
            class="seo-pill"
            :class="{ 'is-active': selectedRouteKey === key }"
            @click="selectedRouteKey = key"
          >
            {{ SEO_ROUTE_META[key].label }}
          </button>
        </div>

        <div class="seo-pill-group" role="tablist" aria-label="Chế độ xem trước">
          <button
            type="button"
            class="seo-pill"
            :class="{ 'is-active': previewMode === 'google-dark' }"
            @click="previewMode = 'google-dark'"
          >
            Google (Tối)
          </button>
          <button
            type="button"
            class="seo-pill"
            :class="{ 'is-active': previewMode === 'google-light' }"
            @click="previewMode = 'google-light'"
          >
            Google (Sáng)
          </button>
          <button
            type="button"
            class="seo-pill"
            :class="{ 'is-active': previewMode === 'social' }"
            @click="previewMode = 'social'"
          >
            Share MXH (FB / Zalo)
          </button>
        </div>
      </div>

      <!-- Google SERP Mockup -->
      <div
        v-if="previewMode === 'google-dark' || previewMode === 'google-light'"
        class="serp-box"
        :class="previewMode === 'google-light' ? 'serp-box--light' : 'serp-box--dark'"
      >
        <div class="serp-box__head">
          <span class="serp-box__favicon">
            <img :src="previewFaviconSrc" alt="" width="20" height="20" />
          </span>
          <div class="serp-box__site">
            <span class="serp-box__sitename">
              {{ form.schema.enableWebsiteSchema ? form.siteName : previewDisplayDomain }}
            </span>
            <span class="serp-box__url">{{ previewBreadcrumb }}</span>
          </div>
          <span class="serp-box__dots" aria-hidden="true">⋮</span>
        </div>
        <div class="serp-box__title">{{ previewResolved.title }}</div>
        <div class="serp-box__desc">{{ previewResolved.description }}</div>
      </div>

      <!-- Social OG Card Mockup -->
      <div v-else class="og-preview">
        <div class="og-preview__media">
          <img :src="previewOgImageSrc" alt="Xem trước ảnh OG" />
        </div>
        <div class="og-preview__body">
          <span class="og-preview__domain">{{ previewDisplayDomain }}</span>
          <strong class="og-preview__title">{{ previewResolved.ogTitle || previewResolved.title }}</strong>
          <p class="og-preview__desc">
            {{ previewResolved.ogDescription || previewResolved.description }}
          </p>
        </div>
      </div>

      <!-- Instant SEO Health Diagnostics -->
      <div class="seo-health-row">
        <span
          class="seo-health-chip"
          :class="`seo-health-chip--${titleHealth.status}`"
        >
          {{ titleHealth.text }}
        </span>
        <span
          class="seo-health-chip"
          :class="`seo-health-chip--${descHealth.status}`"
        >
          {{ descHealth.text }}
        </span>
        <span
          class="seo-health-chip"
          :class="form.schema.enableWebsiteSchema ? 'seo-health-chip--ok' : 'seo-health-chip--warn'"
        >
          {{
            form.schema.enableWebsiteSchema
              ? `Schema Site Name: ${form.siteName}`
              : 'Đang tắt WebSite Schema (Google sẽ hiện tên miền)'
          }}
        </span>
        <span class="seo-health-chip seo-health-chip--ok">
          Favicon 48/96/192 PNG + /favicon.ico
        </span>
      </div>
    </div>

    <!-- Section Sub-navigation -->
    <div class="seo-subtabs" role="tablist" aria-label="Nhóm cấu hình SEO">
      <button
        type="button"
        role="tab"
        class="seo-subtabs__btn"
        :class="{ 'is-active': sectionTab === 'brand' }"
        @click="sectionTab = 'brand'"
      >
        1. Thương hiệu &amp; Favicon
      </button>
      <button
        type="button"
        role="tab"
        class="seo-subtabs__btn"
        :class="{ 'is-active': sectionTab === 'routes' }"
        @click="sectionTab = 'routes'"
      >
        2. SEO từng trang &amp; Link chi tiết
      </button>
      <button
        type="button"
        role="tab"
        class="seo-subtabs__btn"
        :class="{ 'is-active': sectionTab === 'schema' }"
        @click="sectionTab = 'schema'"
      >
        3. Schema (JSON-LD)
      </button>
      <button
        type="button"
        role="tab"
        class="seo-subtabs__btn"
        :class="{ 'is-active': sectionTab === 'crawl' }"
        @click="sectionTab = 'crawl'"
      >
        4. Xác minh, Tracking &amp; Sitemap/Robots
      </button>
    </div>

    <!-- SECTION 1: BRAND, FAVICON, OG IMAGE & UI SYNC -->
    <div v-if="sectionTab === 'brand'" class="seo-section-stack">
      <div class="card seo-group">
        <div class="seo-group__head">
          <h3>Nhận diện trên Google &amp; Trình duyệt</h3>
          <p class="muted">
            Cấu hình tên hiển thị thay thế cho tên miền trên kết quả tìm kiếm Google, tên miền chính (Canonical) và màu chủ đạo.
          </p>
        </div>

        <div class="seo-grid-2">
          <div class="field">
            <label for="seo-site-name" class="field__label">
              Tên thương hiệu (Site Name)
              <span class="field__hint">Đồng bộ Header, Footer &amp; Google Site Name</span>
            </label>
            <input
              id="seo-site-name"
              v-model="form.siteName"
              type="text"
              class="field__input"
              placeholder="CHECK LỪA ĐẢO"
            />
          </div>

          <div class="field">
            <label for="seo-canonical-base" class="field__label">
              Domain chính (Canonical Base URL)
              <span class="field__hint">Không có dấu / ở cuối</span>
            </label>
            <input
              id="seo-canonical-base"
              v-model="form.canonicalBase"
              type="url"
              class="field__input mono"
              placeholder="https://checkluadao.online"
            />
          </div>

          <div class="field">
            <label for="seo-alt-names" class="field__label">
              Tên thay thế (Alternate Names)
              <span class="field__hint">Ngăn cách bằng dấu phẩy</span>
            </label>
            <input
              id="seo-alt-names"
              v-model="alternateNamesInput"
              type="text"
              class="field__input"
              placeholder="Check Lừa Đảo, CheckScam Philippines, checkluadao.online"
            />
          </div>

          <div class="seo-grid-2">
            <div class="field">
              <label for="seo-theme-color" class="field__label">Màu thanh trình duyệt (Theme Color)</label>
              <div class="color-input-row">
                <input
                  v-model="form.themeColor"
                  type="color"
                  class="color-swatch"
                  aria-label="Chọn màu theme"
                />
                <input
                  id="seo-theme-color"
                  v-model="form.themeColor"
                  type="text"
                  class="field__input mono"
                  placeholder="#f7f9fa"
                />
              </div>
            </div>

            <div class="field">
              <label for="seo-locale" class="field__label">Ngôn ngữ / Locale</label>
              <input
                id="seo-locale"
                v-model="form.locale"
                type="text"
                class="field__input mono"
                placeholder="vi_VN"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Asset Uploads: Favicon, Logo, Default OG Image -->
      <div class="card seo-group">
        <div class="seo-group__head">
          <h3>Favicon, Logo &amp; Ảnh chia sẻ mặc định (OG Image)</h3>
          <p class="muted">
            Khi tải ảnh Favicon lên Cloudinary, hệ thống tự xuất đủ bộ PNG vuông chuẩn Google (<code>48×48</code>, <code>96×96</code>, <code>192×192</code>, <code>180×180</code>) và tự động tạo <code>/favicon.ico</code>.
          </p>
        </div>

        <div class="seo-assets-grid">
          <!-- Favicon -->
          <div class="asset-box">
            <div class="asset-box__head">
              <strong>Favicon (Icon Google SERP &amp; Tab trình duyệt)</strong>
              <span class="field__hint">Khuyên dùng ảnh vuông PNG/SVG ≥ 192×192px</span>
            </div>
            <div class="asset-box__preview-row">
              <div class="fav-preview-strip">
                <span class="fav-sample fav-sample--google" title="Hiển thị trên Google">
                  <img :src="previewFaviconSrc" alt="Favicon Google" width="26" height="26" />
                </span>
                <span class="fav-sample fav-sample--tab" title="Tab trình duyệt 16px">
                  <img :src="previewFaviconSrc" alt="Favicon tab" width="16" height="16" />
                </span>
              </div>
              <label class="btn btn--secondary btn--sm asset-upload-btn">
                <span>{{ uploadingSlot.favicon ? 'Đang tải...' : 'Tải ảnh Favicon' }}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                  hidden
                  :disabled="uploadingSlot.favicon"
                  @change="handleImageFileUpload($event, 'favicon')"
                />
              </label>
            </div>
            <input
              v-model="form.faviconUrl"
              type="text"
              class="field__input mono asset-url-input"
              placeholder="/favicon-192.png hoặc https://res.cloudinary.com/..."
            />
            <p v-if="uploadError.favicon" class="field__error">{{ uploadError.favicon }}</p>
            <a
              href="/favicon.ico"
              target="_blank"
              rel="noopener noreferrer"
              class="link asset-check-link"
            >
              Mở kiểm tra /favicon.ico
            </a>
          </div>

          <!-- Header / Footer Logo -->
          <div class="asset-box">
            <div class="asset-box__head">
              <strong>Logo thương hiệu (Header, Footer &amp; Schema)</strong>
              <span class="field__hint">Hiển thị cạnh tên {{ form.siteName }}</span>
            </div>
            <div class="asset-box__preview-row">
              <div class="logo-mini-bar">
                <img :src="previewLogoSrc" alt="Logo" width="28" height="28" />
                <span>{{ form.siteName }}</span>
              </div>
              <div class="btn-row">
                <label class="btn btn--secondary btn--sm asset-upload-btn">
                  <span>{{ uploadingSlot.logo ? 'Đang tải...' : 'Tải Logo' }}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    hidden
                    :disabled="uploadingSlot.logo"
                    @change="handleImageFileUpload($event, 'logo')"
                  />
                </label>
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  @click="form.logoUrl = form.faviconUrl"
                >
                  Dùng Favicon
                </button>
              </div>
            </div>
            <input
              v-model="form.logoUrl"
              type="text"
              class="field__input mono asset-url-input"
              placeholder="/logo.jpg hoặc https://res.cloudinary.com/..."
            />
            <p v-if="uploadError.logo" class="field__error">{{ uploadError.logo }}</p>
          </div>

          <!-- Default OG Image -->
          <div class="asset-box asset-box--wide">
            <div class="asset-box__head">
              <strong>Ảnh chia sẻ MXH mặc định (OG Image — Facebook / Zalo / Telegram)</strong>
              <span class="field__hint">Khuyên dùng tỷ lệ ngang 1200×630px · Tự động chuyển sang URL tuyệt đối HTTPS</span>
            </div>
            <div class="asset-og-row">
              <div class="asset-og-thumb">
                <img :src="previewOgImageSrc" alt="OG Image preview" />
              </div>
              <div class="asset-og-controls">
                <div class="btn-row">
                  <label class="btn btn--secondary btn--sm asset-upload-btn">
                    <span>{{ uploadingSlot.ogImage ? 'Đang tải...' : 'Tải ảnh OG (1200×630)' }}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      :disabled="uploadingSlot.ogImage"
                      @change="handleImageFileUpload($event, 'ogImage')"
                    />
                  </label>
                  <select
                    v-model="form.twitterCard"
                    class="field__select asset-card-select"
                    aria-label="Kiểu Twitter Card"
                  >
                    <option value="summary_large_image">Ảnh lớn (summary_large_image)</option>
                    <option value="summary">Ảnh vuông nhỏ (summary)</option>
                  </select>
                </div>
                <input
                  v-model="form.ogImageUrl"
                  type="text"
                  class="field__input mono asset-url-input"
                  placeholder="/logo.jpg hoặc https://res.cloudinary.com/..."
                />
                <input
                  v-model="form.twitterHandle"
                  type="text"
                  class="field__input"
                  placeholder="Twitter/X @username (tùy chọn, có thể để trống)"
                />
                <p v-if="uploadError.ogImage" class="field__error">{{ uploadError.ogImage }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- UI Contact & Footer Sync -->
      <div class="card seo-group">
        <div class="seo-group__head">
          <h3>Liên hệ &amp; Nội dung đồng bộ Header / Footer</h3>
          <p class="muted">
            Cập nhật đồng bộ nút Liên hệ ở thanh điều hướng, nút Liên hệ xác minh ở trang Shop uy tín và phần chân trang.
          </p>
        </div>

        <div class="seo-grid-2">
          <div class="field">
            <label for="seo-tg-handle" class="field__label">
              Username Telegram hỗ trợ
              <span class="field__hint">Hiển thị: {{ telegramPreview.displayHandle }}</span>
            </label>
            <input
              id="seo-tg-handle"
              v-model="form.contactTelegramHandle"
              type="text"
              class="field__input mono"
              placeholder="dakv88"
              @input="onTelegramHandleInput"
            />
          </div>

          <div class="field">
            <label for="seo-tg-url" class="field__label">
              Đường dẫn Telegram
              <span class="field__hint">Tự tạo từ username hoặc nhập link nhóm/kênh</span>
            </label>
            <input
              id="seo-tg-url"
              v-model="form.contactTelegramUrl"
              type="url"
              class="field__input mono"
              placeholder="https://t.me/dakv88"
            />
          </div>
        </div>

        <div class="field">
          <label for="seo-footer-tagline" class="field__label">Đoạn giới thiệu ngắn ở chân trang (Footer)</label>
          <textarea
            id="seo-footer-tagline"
            v-model="form.footerTagline"
            rows="3"
            class="field__textarea"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- SECTION 2: PER-ROUTE SEO & DYNAMIC DETAIL TEMPLATES -->
    <div v-else-if="sectionTab === 'routes'" class="seo-section-stack">
      <div class="card seo-group">
        <div class="seo-group__head">
          <h3>Tiêu đề &amp; Mô tả SEO theo từng trang</h3>
          <p class="muted">
            Chọn từng trang bên dưới để chỉnh sửa — khung xem trước Google SERP ở phía trên sẽ cập nhật theo thời gian thực. Riêng trang <code>/admin</code> luôn tự động chặn index (<code>noindex, nofollow</code>).
          </p>
        </div>

        <div class="seo-pill-group">
          <button
            v-for="key in SEO_ROUTE_KEYS"
            :key="key"
            type="button"
            class="seo-pill"
            :class="{ 'is-active': selectedRouteKey === key }"
            @click="selectedRouteKey = key"
          >
            {{ SEO_ROUTE_META[key].label }}
            <span class="mono seo-pill__path">{{ SEO_ROUTE_META[key].path }}</span>
          </button>
        </div>

        <div class="field">
          <label :for="`route-title-${selectedRouteKey}`" class="field__label">
            <span>Thẻ Title (Tiêu đề Google)</span>
            <span
              class="mono seo-counter"
              :class="{
                'is-warn': activeRouteConfig.title.length > 60 && activeRouteConfig.title.length <= 70,
                'is-danger': activeRouteConfig.title.length > 70
              }"
            >
              {{ activeRouteConfig.title.length }} / 60 ký tự
            </span>
          </label>
          <input
            :id="`route-title-${selectedRouteKey}`"
            v-model="activeRouteConfig.title"
            type="text"
            class="field__input"
          />
        </div>

        <div class="field">
          <label :for="`route-desc-${selectedRouteKey}`" class="field__label">
            <span>Meta Description (Đoạn mô tả dưới tiêu đề)</span>
            <span
              class="mono seo-counter"
              :class="{
                'is-warn': activeRouteConfig.description.length > 160
              }"
            >
              {{ activeRouteConfig.description.length }} / 160 ký tự
            </span>
          </label>
          <textarea
            :id="`route-desc-${selectedRouteKey}`"
            v-model="activeRouteConfig.description"
            rows="3"
            class="field__textarea"
          ></textarea>
        </div>

        <div class="seo-grid-2">
          <div class="field">
            <label :for="`route-keywords-${selectedRouteKey}`" class="field__label">
              Từ khóa (Meta Keywords — tùy chọn)
            </label>
            <input
              :id="`route-keywords-${selectedRouteKey}`"
              v-model="activeRouteConfig.keywords"
              type="text"
              class="field__input"
              placeholder="check lừa đảo, shop việt philippines..."
            />
          </div>

          <div class="field">
            <label :for="`route-robots-${selectedRouteKey}`" class="field__label">
              Chỉ thị lập chỉ mục (Meta Robots)
            </label>
            <select
              :id="`route-robots-${selectedRouteKey}`"
              v-model="activeRouteConfig.robots"
              class="field__select"
            >
              <option v-for="opt in ROBOTS_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Per-route OG overrides -->
        <div class="seo-subblock">
          <span class="label">Tùy biến riêng khi chia sẻ MXH cho trang {{ activeRouteMeta.path }} (để trống sẽ tự dùng Title / Description / OG Image mặc định)</span>
          <div class="seo-grid-2">
            <div class="field">
              <label class="field__label">OG Title riêng</label>
              <input
                v-model="activeRouteConfig.ogTitle"
                type="text"
                class="field__input"
                :placeholder="activeRouteConfig.title"
              />
            </div>

            <div class="field">
              <label class="field__label">OG Image riêng</label>
              <div class="inline-upload-row">
                <input
                  v-model="activeRouteConfig.ogImage"
                  type="text"
                  class="field__input mono"
                  :placeholder="form.ogImageUrl || '/logo.jpg'"
                />
                <label class="btn btn--secondary btn--sm asset-upload-btn">
                  <span>{{ uploadingSlot.routeOg ? '...' : 'Tải ảnh' }}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    :disabled="uploadingSlot.routeOg"
                    @change="handleImageFileUpload($event, 'routeOg')"
                  />
                </label>
              </div>
              <p v-if="uploadError.routeOg" class="field__error">{{ uploadError.routeOg }}</p>
            </div>
          </div>

          <div class="field">
            <label class="field__label">OG Description riêng</label>
            <textarea
              v-model="activeRouteConfig.ogDescription"
              rows="2"
              class="field__textarea"
              :placeholder="activeRouteConfig.description"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Dynamic Detail Page SEO Templates -->
      <div class="card seo-group">
        <div class="seo-group__head">
          <h3>SEO động cho link chia sẻ chi tiết (<code>/shops/:id</code> &amp; <code>/alerts/:id</code>)</h3>
          <p class="muted">
            Khi ai đó chia sẻ link 1 Shop uy tín hoặc 1 hồ sơ tố cáo lên Zalo, Facebook, Telegram, Cloudflare Worker tự đọc dữ liệu hồ sơ đó và tạo thẻ tiêu đề + mô tả + ảnh đại diện tương ứng.
          </p>
        </div>

        <div class="seo-toggle-row">
          <label class="seo-checkbox">
            <input v-model="form.dynamicTemplates.enabled" type="checkbox" />
            <span>Bật SEO động cho link chi tiết <code>/shops/:id</code> và <code>/alerts/:id</code></span>
          </label>
          <label class="seo-checkbox">
            <input
              v-model="form.dynamicTemplates.useRecordImageForOg"
              type="checkbox"
              :disabled="!form.dynamicTemplates.enabled"
            />
            <span>Dùng ảnh bìa / avatar của Shop hoặc ảnh bằng chứng đầu tiên làm ảnh OG khi chia sẻ</span>
          </label>
        </div>

        <div v-if="form.dynamicTemplates.enabled" class="seo-grid-2">
          <!-- Shop Template -->
          <div class="seo-subblock">
            <strong>Mẫu cho trang chi tiết Shop (<code>/shops/:id</code>)</strong>
            <div class="token-row">
              <button
                v-for="tk in ['{name}', '{category}', '{owner}', '{address}', '{siteName}']"
                :key="tk"
                type="button"
                class="token-chip mono"
                @click="appendPlaceholder('shopTitleTemplate', tk)"
              >
                + {{ tk }}
              </button>
            </div>
            <div class="field">
              <label class="field__label">Mẫu Title</label>
              <input
                v-model="form.dynamicTemplates.shopTitleTemplate"
                type="text"
                class="field__input"
              />
            </div>
            <div class="field">
              <label class="field__label">Mẫu Description</label>
              <textarea
                v-model="form.dynamicTemplates.shopDescriptionTemplate"
                rows="3"
                class="field__textarea"
              ></textarea>
            </div>
            <div class="template-example">
              <span class="label">Ví dụ kết quả:</span>
              <strong>{{ previewShopDynamicExample.title }}</strong>
              <p class="muted">{{ previewShopDynamicExample.description }}</p>
            </div>
          </div>

          <!-- Alert Template -->
          <div class="seo-subblock">
            <strong>Mẫu cho trang chi tiết Cảnh báo (<code>/alerts/:id</code>)</strong>
            <div class="token-row">
              <button
                v-for="tk in ['{name}', '{scamType}', '{amount}', '{description}', '{siteName}']"
                :key="tk"
                type="button"
                class="token-chip mono"
                @click="appendPlaceholder('alertTitleTemplate', tk)"
              >
                + {{ tk }}
              </button>
            </div>
            <div class="field">
              <label class="field__label">Mẫu Title</label>
              <input
                v-model="form.dynamicTemplates.alertTitleTemplate"
                type="text"
                class="field__input"
              />
            </div>
            <div class="field">
              <label class="field__label">Mẫu Description</label>
              <textarea
                v-model="form.dynamicTemplates.alertDescriptionTemplate"
                rows="3"
                class="field__textarea"
              ></textarea>
            </div>
            <div class="template-example">
              <span class="label">Ví dụ kết quả:</span>
              <strong>{{ previewAlertDynamicExample.title }}</strong>
              <p class="muted">{{ previewAlertDynamicExample.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 3: SCHEMA (JSON-LD) -->
    <div v-else-if="sectionTab === 'schema'" class="seo-section-stack">
      <div class="card seo-group">
        <div class="seo-group__head">
          <h3>Dữ liệu có cấu trúc Schema.org (JSON-LD)</h3>
          <p class="muted">
            <strong>WebSite Schema</strong> là tín hiệu quan trọng nhất để Google hiển thị tên thương hiệu <strong>{{ form.siteName }}</strong> thay vì tên miền <code>{{ previewDisplayDomain }}</code> trên kết quả tìm kiếm.
          </p>
        </div>

        <div class="seo-toggle-row">
          <label class="seo-checkbox">
            <input v-model="form.schema.enableWebsiteSchema" type="checkbox" />
            <span>Bật <strong>WebSite Schema</strong> (Site Name + Alternate Names)</span>
          </label>

          <label class="seo-checkbox">
            <input
              v-model="form.schema.enableSearchAction"
              type="checkbox"
              :disabled="!form.schema.enableWebsiteSchema"
            />
            <span>Bật <strong>SearchAction</strong> (hỗ trợ ô tìm kiếm trỏ về <code>/?q={search_term_string}</code>)</span>
          </label>

          <label class="seo-checkbox">
            <input v-model="form.schema.enableOrganizationSchema" type="checkbox" />
            <span>Bật <strong>Organization Schema</strong> (Logo &amp; liên kết MXH chính thức)</span>
          </label>
        </div>

        <div v-if="form.schema.enableOrganizationSchema" class="seo-subblock">
          <div class="seo-grid-2">
            <div class="field">
              <label class="field__label">Tên tổ chức (Organization Name)</label>
              <input
                v-model="form.schema.organizationName"
                type="text"
                class="field__input"
                :placeholder="form.siteName"
              />
            </div>

            <div class="field">
              <label class="field__label">Mô tả tổ chức</label>
              <input
                v-model="form.schema.organizationDescription"
                type="text"
                class="field__input"
              />
            </div>
          </div>

          <div class="field">
            <label class="field__label">Liên kết mạng xã hội chính thức (<code>sameAs</code>)</label>
            <div class="inline-upload-row">
              <input
                v-model="newSameAsUrl"
                type="url"
                class="field__input mono"
                placeholder="https://t.me/dakv88 hoặc https://facebook.com/..."
                @keydown.enter.prevent="addSameAs"
              />
              <button type="button" class="btn btn--secondary btn--sm" @click="addSameAs">
                + Thêm link
              </button>
            </div>
            <div v-if="form.schema.sameAs.length" class="sameas-list">
              <div v-for="(lnk, idx) in form.schema.sameAs" :key="lnk + idx" class="sameas-item">
                <span class="mono">{{ lnk }}</span>
                <button type="button" class="btn btn--secondary btn--sm" @click="removeSameAs(idx)">
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="seo-code-box">
          <div class="seo-code-box__head">
            <span class="label">Xem trước JSON-LD sẽ xuất ra HTML</span>
            <div class="btn-row">
              <a
                :href="`https://search.google.com/test/rich-results?url=${encodeURIComponent(form.canonicalBase)}`"
                target="_blank"
                rel="noopener noreferrer"
                class="link"
              >
                Kiểm tra Google Rich Results
              </a>
              <CopyButton :value="jsonLdPreview" label="Chép JSON-LD" />
            </div>
          </div>
          <pre class="mono seo-code-pre">{{ jsonLdPreview }}</pre>
        </div>
      </div>
    </div>

    <!-- SECTION 4: VERIFICATION, ANALYTICS, SITEMAP, ROBOTS & LLMS -->
    <div v-else class="seo-section-stack">
      <!-- Verification & Tracking -->
      <div class="card seo-group">
        <div class="seo-group__head">
          <h3>Xác minh sở hữu &amp; Google Analytics / Tag Manager</h3>
          <p class="muted">
            Bạn có thể dán trực tiếp mã xác minh hoặc dán nguyên thẻ <code>&lt;meta ...&gt;</code> — hệ thống sẽ tự trích mã <code>content</code>.
          </p>
        </div>

        <div class="seo-grid-3">
          <div class="field">
            <label for="seo-ver-google" class="field__label">Google Search Console</label>
            <input
              id="seo-ver-google"
              v-model="form.verification.google"
              type="text"
              class="field__input mono"
              placeholder="Mã google-site-verification"
              @blur="cleanVerificationField('google')"
            />
          </div>

          <div class="field">
            <label for="seo-ver-bing" class="field__label">Bing Webmaster</label>
            <input
              id="seo-ver-bing"
              v-model="form.verification.bing"
              type="text"
              class="field__input mono"
              placeholder="Mã msvalidate.01"
              @blur="cleanVerificationField('bing')"
            />
          </div>

          <div class="field">
            <label for="seo-ver-fb" class="field__label">Facebook Domain Verification</label>
            <input
              id="seo-ver-fb"
              v-model="form.verification.facebook"
              type="text"
              class="field__input mono"
              placeholder="Mã facebook-domain-verification"
              @blur="cleanVerificationField('facebook')"
            />
          </div>
        </div>

        <div class="seo-subblock">
          <label class="seo-checkbox">
            <input v-model="form.analytics.enabled" type="checkbox" />
            <span>Bật mã đo lường Google Analytics 4 / Google Tag Manager (tự động ẩn trên <code>/admin</code>)</span>
          </label>

          <div class="seo-grid-2">
            <div class="field">
              <label for="seo-ga4" class="field__label">Google Analytics 4 ID</label>
              <input
                id="seo-ga4"
                v-model="form.analytics.ga4Id"
                type="text"
                class="field__input mono"
                placeholder="G-GFSB2HMFT2"
                :disabled="!form.analytics.enabled"
              />
            </div>

            <div class="field">
              <label for="seo-gtm" class="field__label">Google Tag Manager ID</label>
              <input
                id="seo-gtm"
                v-model="form.analytics.gtmId"
                type="text"
                class="field__input mono"
                placeholder="GTM-T32FSTC5"
                :disabled="!form.analytics.enabled"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Sitemap.xml -->
      <div class="card seo-group">
        <div class="seo-group__head seo-group__head--row">
          <div>
            <h3>Sitemap động (<code>/sitemap.xml</code>)</h3>
            <p class="muted">
              Cloudflare Worker tự sinh XML Sitemap trực tiếp từ cấu hình dưới đây và danh sách Shop / Cảnh báo đã duyệt.
            </p>
          </div>
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" class="btn btn--secondary btn--sm">
            Mở /sitemap.xml
          </a>
        </div>

        <label class="seo-checkbox">
          <input v-model="form.sitemap.enabled" type="checkbox" />
          <span>Bật <code>/sitemap.xml</code> động</span>
        </label>

        <div v-if="form.sitemap.enabled" class="seo-sitemap-body">
          <div class="sitemap-table">
            <div class="sitemap-table__head">
              <span>Trang chính</span>
              <span>Bao gồm</span>
              <span>Tần suất (changefreq)</span>
              <span>Ưu tiên (priority)</span>
            </div>
            <div v-for="key in SEO_ROUTE_KEYS" :key="key" class="sitemap-table__row">
              <div class="sitemap-table__route">
                <strong>{{ SEO_ROUTE_META[key].label }}</strong>
                <span class="mono muted">{{ SEO_ROUTE_META[key].path }}</span>
              </div>
              <label class="seo-checkbox">
                <input v-model="form.sitemap.routes[key].include" type="checkbox" />
                <span>Có</span>
              </label>
              <select
                v-model="form.sitemap.routes[key].changefreq"
                class="field__select sitemap-select"
                :disabled="!form.sitemap.routes[key].include"
              >
                <option v-for="cf in CHANGEFREQ_OPTIONS" :key="cf" :value="cf">{{ cf }}</option>
              </select>
              <select
                v-model="form.sitemap.routes[key].priority"
                class="field__select sitemap-select"
                :disabled="!form.sitemap.routes[key].include"
              >
                <option v-for="pr in PRIORITY_OPTIONS" :key="pr" :value="pr">{{ pr }}</option>
              </select>
            </div>
          </div>

          <div class="seo-toggle-row">
            <label class="seo-checkbox">
              <input v-model="form.sitemap.includeDynamicShops" type="checkbox" />
              <span>Tự động gộp các link chi tiết Shop uy tín (<code>/shops/:id</code>)</span>
            </label>
            <label class="seo-checkbox">
              <input v-model="form.sitemap.includeDynamicAlerts" type="checkbox" />
              <span>Tự động gộp các link chi tiết Cảnh báo lừa đảo (<code>/alerts/:id</code>)</span>
            </label>
          </div>

          <div class="sitemap-sync-box">
            <div class="sitemap-sync-box__copy">
              <strong>Chỉ mục URL động trong Sitemap</strong>
              <span class="mono muted">
                Đã đồng bộ: {{ sitemapStats.shopsCount }} / {{ siteMeta.shopsCount }} Shop ·
                {{ sitemapStats.reportsCount }} / {{ siteMeta.reportsCount }} Cảnh báo
                <template v-if="sitemapStats.syncedAt">
                  · Cập nhật: {{ formatDateVi(sitemapStats.syncedAt) }}
                </template>
              </span>
              <span class="field__hint">
                Mỗi lần duyệt / thêm / xóa mới hệ thống tự cập nhật. Bấm nút bên cạnh 1 lần để đồng bộ toàn bộ dữ liệu cũ đã có sẵn trong Database.
              </span>
            </div>
            <button
              type="button"
              class="btn btn--secondary btn--sm"
              :disabled="syncingSitemap"
              @click="handleSyncSitemap"
            >
              {{ syncingSitemap ? 'Đang đồng bộ...' : 'Đồng bộ Sitemap từ Database' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Dynamic Robots.txt & LLMs.txt -->
      <div class="seo-grid-2">
        <div class="card seo-group">
          <div class="seo-group__head seo-group__head--row">
            <div>
              <h3>File <code>/robots.txt</code> động</h3>
              <p class="muted">Điều hướng Googlebot và khai báo Sitemap.</p>
            </div>
            <a href="/robots.txt" target="_blank" rel="noopener noreferrer" class="link">
              Mở /robots.txt
            </a>
          </div>

          <div class="seo-toggle-row">
            <label class="seo-checkbox">
              <input v-model="form.robots.useCustom" type="checkbox" />
              <span>Tự soạn nội dung <code>robots.txt</code> thủ công</span>
            </label>
            <button
              v-if="form.robots.useCustom"
              type="button"
              class="btn btn--secondary btn--sm"
              @click="loadDefaultRobotsIntoEditor"
            >
              Điền mẫu chuẩn
            </button>
          </div>

          <textarea
            v-if="form.robots.useCustom"
            v-model="form.robots.content"
            rows="7"
            class="field__textarea mono seo-mono-area"
            placeholder="User-agent: *&#10;Allow: /&#10;Disallow: /admin"
          ></textarea>
          <pre v-else class="mono seo-code-pre">{{ robotsPreview }}</pre>
        </div>

        <div class="card seo-group">
          <div class="seo-group__head seo-group__head--row">
            <div>
              <h3>File <code>/llms.txt</code> động</h3>
              <p class="muted">Giúp AI Search (ChatGPT, Perplexity, Gemini) hiểu đúng về trang.</p>
            </div>
            <a href="/llms.txt" target="_blank" rel="noopener noreferrer" class="link">
              Mở /llms.txt
            </a>
          </div>

          <div class="seo-toggle-row">
            <label class="seo-checkbox">
              <input v-model="form.llms.useCustom" type="checkbox" />
              <span>Tự soạn nội dung <code>llms.txt</code> thủ công</span>
            </label>
            <button
              v-if="form.llms.useCustom"
              type="button"
              class="btn btn--secondary btn--sm"
              @click="loadDefaultLlmsIntoEditor"
            >
              Điền từ SEO hiện tại
            </button>
          </div>

          <textarea
            v-if="form.llms.useCustom"
            v-model="form.llms.content"
            rows="7"
            class="field__textarea mono seo-mono-area"
          ></textarea>
          <pre v-else class="mono seo-code-pre">{{ llmsPreview }}</pre>
        </div>
      </div>

      <!-- Custom Head HTML -->
      <div class="card seo-group">
        <div class="seo-group__head">
          <h3>Mã <code>&lt;head&gt;</code> tùy biến (Nâng cao)</h3>
          <p class="muted">
            Chèn thêm thẻ <code>&lt;meta&gt;</code> hoặc script xác minh / đo lường (Meta Pixel, TikTok Pixel, Clarity...). Chỉ dán mã từ nguồn tin cậy vì mã lỗi cú pháp HTML có thể ảnh hưởng hiển thị trang.
          </p>
        </div>
        <textarea
          v-model="form.customHeadHtml"
          rows="4"
          class="field__textarea mono seo-mono-area"
          placeholder="<!-- Ví dụ: <meta name=&quot;...&quot; content=&quot;...&quot; /> -->"
        ></textarea>
      </div>
    </div>

    <!-- Bottom Save Bar -->
    <div class="seo-bottom-bar">
      <span class="muted">
        <template v-if="form.updatedAt">
          Lưu gần nhất: <strong class="mono">{{ formatDateVi(form.updatedAt) }}</strong>
        </template>
        <template v-else>Đang dùng cấu hình SEO mặc định.</template>
      </span>
      <button type="button" class="btn btn--primary" :disabled="saving" @click="handleSave">
        {{ saving ? 'Đang lưu cài đặt SEO...' : 'Lưu cài đặt SEO' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.seo-panel {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.seo-action-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-5) var(--s-6);
}

.seo-action-bar__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 68ch;
}

.seo-action-bar__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.seo-action-bar__title-row h2 {
  font-size: var(--t-h3);
}

.seo-action-bar__info p {
  font-size: var(--t-small);
}

/* Preview card */
.seo-preview-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  padding: var(--s-5) var(--s-6);
}

.seo-preview-card__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
}

.seo-pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.seo-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: var(--r-sm);
  border: 1px solid var(--p-line-strong);
  background: var(--p-card);
  color: var(--p-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms var(--ease), color 140ms var(--ease), border-color 140ms var(--ease);
}

.seo-pill:hover {
  color: var(--p-ink);
  background: var(--p-surface);
}

.seo-pill.is-active {
  background: var(--p-accent);
  border-color: var(--p-accent);
  color: #ffffff;
}

.seo-pill__path {
  font-size: 11.5px;
  opacity: 0.78;
}

/* Authentic Google SERP Mockup */
.serp-box {
  padding: 20px 22px;
  border-radius: var(--r-md);
  border: 1px solid var(--p-line);
  max-width: 680px;
  font-family: Arial, Roboto, sans-serif;
}

.serp-box--dark {
  background: #202124;
  border-color: #3c4043;
}

.serp-box--light {
  background: #ffffff;
  border-color: #dadce0;
}

.serp-box__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.serp-box__favicon {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.serp-box__favicon img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.serp-box__site {
  display: flex;
  flex-direction: column;
  line-height: 1.28;
  min-width: 0;
}

.serp-box__sitename {
  font-size: 14px;
  font-weight: 400;
}

.serp-box--dark .serp-box__sitename {
  color: #dadce0;
}

.serp-box--light .serp-box__sitename {
  color: #202124;
}

.serp-box__url {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.serp-box--dark .serp-box__url {
  color: #bdc1c6;
}

.serp-box--light .serp-box__url {
  color: #4d5156;
}

.serp-box__dots {
  margin-left: 2px;
  font-size: 16px;
  opacity: 0.65;
}

.serp-box--dark .serp-box__dots {
  color: #9aa0a6;
}

.serp-box__title {
  font-size: 20px;
  line-height: 1.3;
  font-weight: 400;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.serp-box--dark .serp-box__title {
  color: #8ab4f8;
}

.serp-box--light .serp-box__title {
  color: #1a0dab;
}

.serp-box__desc {
  font-size: 14px;
  line-height: 1.54;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.serp-box--dark .serp-box__desc {
  color: #bdc1c6;
}

.serp-box--light .serp-box__desc {
  color: #4d5156;
}

/* Social OG Preview */
.og-preview {
  max-width: 520px;
  border: 1px solid var(--p-line-strong);
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--p-bg);
}

.og-preview__media {
  aspect-ratio: 1.91 / 1;
  background: var(--p-surface);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.og-preview__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.og-preview__body {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--p-card);
  border-top: 1px solid var(--p-line);
}

.og-preview__domain {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--p-muted);
}

.og-preview__title {
  font-size: 15px;
  color: var(--p-ink);
  line-height: 1.35;
}

.og-preview__desc {
  font-size: 13px;
  color: var(--p-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Health chips */
.seo-health-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.seo-health-chip {
  font-size: 12.5px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--r-sm);
  border: 1px solid var(--p-line);
}

.seo-health-chip--ok {
  background: var(--p-verified-bg);
  border-color: var(--p-verified-line);
  color: var(--p-verified);
}

.seo-health-chip--warn {
  background: var(--p-warn-bg);
  border-color: var(--p-warn-line);
  color: var(--p-warn);
}

.seo-health-chip--danger {
  background: var(--p-danger-bg);
  border-color: var(--p-danger-line);
  color: var(--p-danger);
}

/* Subtabs */
.seo-subtabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.seo-subtabs__btn {
  min-height: 40px;
  padding: 0 15px;
  border-radius: var(--r-md);
  border: 1px solid var(--p-line-strong);
  background: var(--p-card);
  color: var(--p-muted);
  font-size: var(--t-small);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms var(--ease), color 140ms var(--ease), border-color 140ms var(--ease);
}

.seo-subtabs__btn:hover {
  background: var(--p-surface);
  color: var(--p-ink);
}

.seo-subtabs__btn.is-active {
  background: var(--p-ink);
  border-color: var(--p-ink);
  color: var(--p-inv-ink);
}

/* Form layout */
.seo-section-stack {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.seo-group {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.seo-group__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.seo-group__head--row {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-3);
}

.seo-group__head p {
  font-size: var(--t-small);
}

.seo-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-4);
}

.seo-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-4);
}

.color-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-swatch {
  width: 48px;
  height: 48px;
  padding: 4px;
  border-radius: var(--r-md);
  border: 1px solid var(--p-line-strong);
  background: var(--p-card);
  cursor: pointer;
  flex-shrink: 0;
}

/* Assets grid */
.seo-assets-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-4);
}

.asset-box {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-4);
  border: 1px solid var(--p-line);
  border-radius: var(--r-md);
  background: var(--p-bg);
}

.asset-box--wide {
  grid-column: 1 / -1;
}

.asset-box__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.asset-box__preview-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
}

.fav-preview-strip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.fav-sample {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 1px solid var(--p-line-strong);
}

.fav-sample--google {
  width: 38px;
  height: 38px;
  border-radius: 999px;
}

.fav-sample--tab {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
}

.logo-mini-bar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: var(--r-sm);
  background: var(--p-card);
  border: 1px solid var(--p-line);
  font-weight: 700;
  font-size: 14px;
}

.logo-mini-bar img {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: cover;
}

.asset-upload-btn {
  cursor: pointer;
}

.asset-url-input {
  font-size: 13.5px;
  min-height: 42px;
}

.asset-check-link {
  font-size: 13px;
  width: fit-content;
}

.asset-og-row {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: var(--s-4);
  align-items: start;
}

.asset-og-thumb {
  aspect-ratio: 1.91 / 1;
  border-radius: var(--r-md);
  border: 1px solid var(--p-line-strong);
  overflow: hidden;
  background: var(--p-surface);
}

.asset-og-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-og-controls {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.asset-card-select {
  min-height: 38px;
  width: auto;
  font-size: 13.5px;
}

.inline-upload-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.inline-upload-row .field__input {
  flex: 1;
}

/* Subblocks, counters, checkboxes */
.seo-subblock {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-4);
  border-radius: var(--r-md);
  border: 1px solid var(--p-line);
  background: var(--p-bg);
}

.seo-counter {
  font-size: 12px;
  color: var(--p-verified);
}

.seo-counter.is-warn {
  color: var(--p-warn);
}

.seo-counter.is-danger {
  color: var(--p-danger);
}

.seo-toggle-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
}

.seo-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--t-small);
  font-weight: 500;
  color: var(--p-ink);
  cursor: pointer;
}

.seo-checkbox input[type='checkbox'] {
  width: 17px;
  height: 17px;
  accent-color: var(--p-action);
  cursor: pointer;
}

.token-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.token-chip {
  padding: 3px 8px;
  border-radius: var(--r-sm);
  border: 1px solid var(--p-line-strong);
  background: var(--p-card);
  color: var(--p-action);
  font-size: 12px;
  cursor: pointer;
}

.token-chip:hover {
  background: var(--p-accent-soft);
}

.template-example {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--p-card);
  border: 1px dashed var(--p-line-strong);
  font-size: 13px;
}

/* sameAs */
.sameas-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.sameas-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--r-sm);
  border: 1px solid var(--p-line);
  background: var(--p-card);
  font-size: 13px;
  word-break: break-all;
}

/* Code blocks */
.seo-code-box {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.seo-code-box__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
}

.seo-code-pre {
  margin: 0;
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--p-inv-bg);
  color: var(--p-inv-ink);
  font-size: 12.5px;
  line-height: 1.55;
  overflow-x: auto;
  max-height: 320px;
}

.seo-mono-area {
  font-size: 13px;
  line-height: 1.55;
}

/* Sitemap table */
.seo-sitemap-body {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.sitemap-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--p-line);
  border-radius: var(--r-md);
  overflow: hidden;
}

.sitemap-table__head,
.sitemap-table__row {
  display: grid;
  grid-template-columns: 1.6fr 0.7fr 1fr 0.9fr;
  gap: var(--s-3);
  align-items: center;
  padding: 10px 14px;
}

.sitemap-table__head {
  background: var(--p-surface);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--p-muted);
}

.sitemap-table__row {
  border-top: 1px solid var(--p-line);
  background: var(--p-card);
}

.sitemap-table__route {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
}

.sitemap-table__route .mono {
  font-size: 12px;
}

.sitemap-select {
  min-height: 38px;
  font-size: 13.5px;
}

.sitemap-sync-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-4);
  border-radius: var(--r-md);
  background: var(--p-surface);
  border: 1px solid var(--p-line);
}

.sitemap-sync-box__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13.5px;
}

.seo-bottom-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-5);
  border-radius: var(--r-lg);
  background: var(--p-card);
  border: 1px solid var(--p-line);
  font-size: var(--t-small);
}

@media (max-width: 900px) {
  .seo-grid-2,
  .seo-grid-3,
  .seo-assets-grid,
  .asset-og-row {
    grid-template-columns: 1fr;
  }

  .sitemap-table__head {
    display: none;
  }

  .sitemap-table__row {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
