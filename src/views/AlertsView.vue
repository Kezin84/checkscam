<script setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useRepository,
  fetchReportsPage,
  fetchReportById,
  searchRecordsOnServer
} from '@/services/repository'
import PlatformSelect from '@/components/PlatformSelect.vue'
import { useServerFeed } from '@/composables/useServerFeed'

const ReportDossierCard = defineAsyncComponent(() => import('@/components/ReportDossierCard.vue'))

const route = useRoute()
const router = useRouter()
const { siteMeta } = useRepository()
const activePlatform = ref('all')

const sharedId = computed(() => String(route.params.id || route.query.id || '').trim())
const sharedReport = ref(null)
const sharedLoading = ref(false)
let sharedReqId = 0

watch(
  sharedId,
  async (id) => {
    const reqId = ++sharedReqId
    if (!id) {
      sharedReport.value = null
      sharedLoading.value = false
      if (typeof document !== 'undefined') {
        document.title = 'Danh sách lừa đảo cộng đồng Việt tại Philippines — CHECK LỪA ĐẢO'
      }
      return
    }
    sharedLoading.value = true
    try {
      const found = await fetchReportById(id)
      if (reqId !== sharedReqId) return
      sharedReport.value = found
      if (found?.subjectName && typeof document !== 'undefined') {
        document.title = `Cảnh báo: ${found.subjectName} — CHECK LỪA ĐẢO`
      }
    } finally {
      if (reqId === sharedReqId) sharedLoading.value = false
    }
  },
  { immediate: true }
)

const PUBLIC_RECENT_LIMIT = 10

const {
  items: visibleReports,
  loading,
  searching,
  keyword,
  triggerSearchNow
} = useServerFeed({
  cacheKey: 'alerts',
  batchSize: PUBLIC_RECENT_LIMIT,
  filterRef: activePlatform,
  fetchPage: ({ batchSize, filter }) =>
    fetchReportsPage({ batchSize, cursorKey: null, platform: filter, probeMore: false }),
  searchFn: async (q, filter) => {
    const res = await searchRecordsOnServer(q, {
      includeReports: true,
      includeShops: false,
      platform: filter
    })
    return res.reports.map((entry) => entry.item)
  }
})

const feedReports = computed(() => {
  if (!sharedReport.value?.id) return visibleReports.value
  return visibleReports.value.filter((rep) => rep.id !== sharedReport.value.id)
})
</script>

<template>
  <section class="section page-section">
    <div class="wrap">
      <!-- Shared Report Spotlight (when opened via /alerts/:id) -->
      <div v-if="sharedId" class="shared-spotlight">
        <div class="shared-spotlight__bar">
          <span class="stamp stamp--danger">Hồ sơ cảnh báo được chia sẻ</span>
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            @click="router.push('/alerts')"
          >
            Xem toàn bộ danh sách
          </button>
        </div>

        <div v-if="sharedLoading" class="card skeleton-card" aria-busy="true">
          <div class="skeleton-line skeleton-line--lg"></div>
          <div class="skeleton-line skeleton-line--md"></div>
          <div class="skeleton-line skeleton-line--sm"></div>
        </div>

        <div v-else-if="sharedReport" class="shared-spotlight__card">
          <ReportDossierCard :report="sharedReport" />
        </div>

        <div v-else class="card status-box">
          <h3>Không tìm thấy hồ sơ cảnh báo này.</h3>
          <p class="muted">Liên kết có thể không chính xác hoặc hồ sơ đã được gỡ bỏ khỏi hệ thống.</p>
        </div>
      </div>

      <div class="page-head">
        <div class="page-head__copy">
          <span class="label">Danh sách lừa đảo cộng đồng Việt tại Philippines</span>
          <h1>{{ sharedReport ? 'Các hồ sơ lừa đảo khác' : 'Danh sách lừa đảo đã kiểm duyệt' }}</h1>
          <p class="muted measure">
            Tổng hợp các đối tượng mạo danh Shop Việt tại Philippines, lừa đổi tiền Peso - VND, nhận cọc ảo hoặc lừa đảo giao dịch đã được đối chiếu biên lai và thông tin định danh trước khi công bố.
          </p>
        </div>
        <RouterLink to="/report" class="btn btn--primary">
          <span>Gửi tố cáo mới</span>
          <svg class="m-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
          </svg>
        </RouterLink>
      </div>

      <div class="filter-bar">
        <div class="field">
          <label for="alert-filter-q" class="field__label">Tra cứu theo STK, SĐT, tên chủ thẻ hoặc link MXH</label>
          <div class="search-pill">
            <svg class="search-pill__icon" viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.7" />
              <path d="M13.5 13.5L17.5 17.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
            </svg>
            <input
              id="alert-filter-q"
              v-model="keyword"
              type="search"
              class="search-pill__input"
              placeholder="Nhập số tài khoản, tên đối tượng, SĐT hoặc link..."
              @keydown.enter.prevent="triggerSearchNow"
            />
          </div>
        </div>

        <div class="field">
          <label for="alert-filter-plat" class="field__label">Nền tảng mạng xã hội</label>
          <PlatformSelect
            input-id="alert-filter-plat"
            v-model="activePlatform"
            include-all
            :all-label="`Tất cả nền tảng (${siteMeta.reportsCount})`"
          />
        </div>
      </div>

      <div v-if="loading && visibleReports.length === 0" class="cards-grid" aria-busy="true">
        <div v-for="n in 4" :key="n" class="card skeleton-card">
          <div class="skeleton-line skeleton-line--lg"></div>
          <div class="skeleton-line skeleton-line--md"></div>
          <div class="skeleton-line skeleton-line--sm"></div>
        </div>
      </div>

      <template v-else-if="feedReports.length > 0">
        <div class="cards-grid">
          <ReportDossierCard v-for="rep in feedReports" :key="rep.id" :report="rep" />
        </div>

        <div
          v-if="!keyword.trim() && siteMeta.reportsCount > visibleReports.length"
          class="card archive-guard-note"
        >
          <strong>
            Đang hiển thị {{ visibleReports.length }} cảnh báo mới nhất trên tổng số {{ siteMeta.reportsCount }} hồ sơ đã kiểm duyệt.
          </strong>
          <p class="muted">
            Để bảo vệ dữ liệu hệ thống chống sao chép hàng loạt, các hồ sơ cũ hơn chỉ hiển thị khi bạn nhập chính xác
            <strong>Số tài khoản, ví GCash, SĐT, @username hoặc Link MXH</strong> vào ô tra cứu phía trên.
          </p>
        </div>
      </template>

      <div v-else-if="searching" class="status-box">
        Đang tìm kiếm thêm trên hệ thống...
      </div>

      <div v-else-if="!sharedReport" class="card status-box">
        <h3>Chưa tìm thấy hồ sơ lừa đảo phù hợp.</h3>
        <p class="muted">Thử thay đổi từ khóa tra cứu hoặc gửi hồ sơ mới nếu bạn vừa phát hiện hành vi lừa đảo.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-section {
  min-height: calc(100svh - var(--nav));
}

.shared-spotlight {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  margin-bottom: var(--s-7);
  padding-bottom: var(--s-7);
  border-bottom: 1px solid var(--p-line-strong);
}

.shared-spotlight__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.shared-spotlight__card {
  max-width: 780px;
}

.page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-5);
  margin-bottom: var(--s-6);
}

.page-head__copy {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.filter-bar {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--s-4);
  margin-bottom: var(--s-6);
}

.search-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1.5px solid rgba(13, 116, 128, 0.34);
  background: var(--p-card);
  transition: border-color 140ms var(--ease), box-shadow 140ms var(--ease);
}

.search-pill:hover {
  border-color: rgba(13, 116, 128, 0.58);
}

.search-pill:focus-within {
  border-color: var(--p-accent);
  box-shadow: 0 0 0 3px rgba(13, 116, 128, 0.12);
}

.search-pill__icon {
  color: var(--p-accent);
  flex-shrink: 0;
}

.search-pill__input {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: var(--p-ink);
}

.search-pill__input::placeholder {
  color: rgba(85, 100, 107, 0.72);
}

.search-pill__input:focus {
  outline: none;
}

.filter-bar :deep(.platform-select__trigger) {
  border-radius: 999px;
  border: 1.5px solid rgba(13, 116, 128, 0.34);
  padding: 0 18px;
}

.filter-bar :deep(.platform-select__trigger:hover) {
  border-color: rgba(13, 116, 128, 0.58);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-5);
  align-items: start;
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 220px;
}

.skeleton-line {
  height: 16px;
  border-radius: var(--r-sm);
  background: var(--p-surface);
}

.skeleton-line--lg {
  width: 65%;
  height: 22px;
}

.skeleton-line--md {
  width: 85%;
}

.skeleton-line--sm {
  width: 45%;
}

.archive-guard-note {
  margin-top: var(--s-6);
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--p-surface);
  border-color: var(--p-line-strong);
}

.archive-guard-note strong {
  font-size: var(--t-body);
  font-weight: 500;
  color: var(--p-ink);
}

.archive-guard-note p {
  font-size: var(--t-small);
}

.archive-guard-note p strong {
  font-size: inherit;
}

.status-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--s-6);
}

@media (max-width: 960px) {
  .filter-bar,
  .cards-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
