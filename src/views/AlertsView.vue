<script setup>
import { ref, defineAsyncComponent } from 'vue'
import { useRepository, fetchReportsPage } from '@/services/repository'
import { PLATFORMS } from '@/utils/normalize'
import { useServerFeed } from '@/composables/useServerFeed'

const ReportDossierCard = defineAsyncComponent(() => import('@/components/ReportDossierCard.vue'))

const { siteMeta } = useRepository()
const activePlatform = ref('all')

const {
  items: visibleReports,
  loading,
  loadingMore,
  hasMore,
  sentinelRef,
  loadNextPage
} = useServerFeed({
  batchSize: 6,
  filterRef: activePlatform,
  fetchPage: ({ batchSize, cursorKey, filter }) =>
    fetchReportsPage({ batchSize, cursorKey, platform: filter })
})
</script>

<template>
  <section class="section page-section">
    <div class="wrap">
      <div class="page-head">
        <div class="page-head__copy">
          <span class="label">Danh sách lừa đảo cộng đồng Việt tại Philippines</span>
          <h1>Danh sách lừa đảo đã kiểm duyệt</h1>
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

      <div class="filter-chips" role="tablist" aria-label="Lọc theo nền tảng mạng xã hội">
        <button
          type="button"
          class="filter-chip"
          :class="{ 'is-active': activePlatform === 'all' }"
          @click="activePlatform = 'all'"
        >
          Tất cả ({{ siteMeta.reportsCount }})
        </button>
        <button
          v-for="plat in PLATFORMS"
          :key="plat.id"
          type="button"
          class="filter-chip"
          :class="{ 'is-active': activePlatform === plat.id }"
          @click="activePlatform = plat.id"
        >
          {{ plat.label }}
        </button>
      </div>

      <div v-if="loading" class="status-box">
        Đang tải danh sách lừa đảo...
      </div>

      <template v-else-if="visibleReports.length > 0">
        <div class="cards-grid">
          <ReportDossierCard v-for="rep in visibleReports" :key="rep.id" :report="rep" />
        </div>

        <div v-if="hasMore" ref="sentinelRef" class="lazy-more">
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            :disabled="loadingMore"
            @click="loadNextPage"
          >
            {{ loadingMore ? 'Đang tải thêm...' : 'Hiển thị thêm danh sách lừa đảo' }}
          </button>
        </div>
      </template>

      <div v-else class="card status-box">
        <h3>Chưa có hồ sơ lừa đảo nào trong mục này.</h3>
        <p class="muted">Thử chuyển sang nền tảng khác hoặc gửi hồ sơ mới nếu bạn vừa phát hiện hành vi lừa đảo.</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page-section {
  min-height: calc(100svh - var(--nav));
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

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: var(--s-5);
}

.filter-chip {
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--p-line);
  background: var(--p-card);
  color: var(--p-text);
  font-size: var(--t-small);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms var(--ease), border-color 140ms var(--ease), color 140ms var(--ease);
}

.filter-chip:hover {
  border-color: var(--p-accent);
  color: var(--p-accent);
}

.filter-chip.is-active {
  background: var(--p-accent);
  border-color: var(--p-accent);
  color: #ffffff;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-5);
  align-items: start;
}

.lazy-more {
  display: flex;
  justify-content: center;
  padding-top: var(--s-6);
}

.status-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: var(--s-6);
}

@media (max-width: 960px) {
  .cards-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
