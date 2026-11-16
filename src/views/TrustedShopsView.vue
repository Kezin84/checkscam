<script setup>
import { ref, computed, watch, defineAsyncComponent } from 'vue'
import { useRepository, fetchShopsPage } from '@/services/repository'
import { useServerFeed } from '@/composables/useServerFeed'

const ShopDossierCard = defineAsyncComponent(() => import('@/components/ShopDossierCard.vue'))

const { siteMeta } = useRepository()
const activeCategory = ref('all')

const dbCategories = computed(() => siteMeta.value.shopCategories || [])

watch(dbCategories, (list) => {
  if (activeCategory.value === 'all') return
  const exists = list.some((c) => c.label.toLowerCase() === activeCategory.value.toLowerCase())
  if (!exists) activeCategory.value = 'all'
})

const {
  items: visibleShops,
  loading,
  loadingMore,
  hasMore,
  sentinelRef,
  loadNextPage
} = useServerFeed({
  batchSize: 6,
  filterRef: activeCategory,
  fetchPage: ({ batchSize, cursorKey, filter }) =>
    fetchShopsPage({ batchSize, cursorKey, category: filter })
})
</script>

<template>
  <section class="section page-section">
    <div class="wrap">
      <div class="page-head">
        <div class="page-head__copy">
          <span class="label">Danh bạ Shop uy tín tại Philippines</span>
          <h1>Shop uy tín đã xác minh tại Philippines</h1>
          <p class="muted measure">
            Danh sách các Shop Việt hoạt động tại Philippines (đổi tiền Peso - VND, đồ ăn &amp; tạp hóa Việt, đặt vé, thuê Condo, trung gian giao dịch...) đã được xác minh kênh liên hệ chính thức và tài khoản nhận tiền chính chủ.
          </p>
        </div>
        <a
          href="https://t.me/dakv88"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn--secondary"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="11.5" fill="#FFFFFF" />
            <path
              fill="#24A1DE"
              d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
            />
          </svg>
          <span>Liên hệ xác minh: <strong class="mono">@dakv88</strong></span>
        </a>
      </div>

      <div v-if="dbCategories.length" class="filter-chips" role="tablist" aria-label="Lọc theo lĩnh vực">
        <button
          type="button"
          class="filter-chip"
          :class="{ 'is-active': activeCategory === 'all' }"
          @click="activeCategory = 'all'"
        >
          Tất cả ({{ siteMeta.shopsCount }})
        </button>
        <button
          v-for="cat in dbCategories"
          :key="cat.key"
          type="button"
          class="filter-chip"
          :class="{ 'is-active': activeCategory === cat.label }"
          @click="activeCategory = cat.label"
        >
          {{ cat.label }} ({{ cat.count }})
        </button>
      </div>

      <div v-if="loading" class="status-box">
        Đang tải danh sách shop đã xác minh...
      </div>

      <template v-else-if="visibleShops.length > 0">
        <div class="cards-grid">
          <ShopDossierCard v-for="shop in visibleShops" :key="shop.id" :shop="shop" />
        </div>

        <div v-if="hasMore" ref="sentinelRef" class="lazy-more">
          <button
            type="button"
            class="btn btn--secondary btn--sm"
            :disabled="loadingMore"
            @click="loadNextPage"
          >
            {{ loadingMore ? 'Đang tải thêm...' : 'Hiển thị thêm shop xác minh' }}
          </button>
        </div>
      </template>

      <div v-else class="card status-box">
        <h3>Chưa có hồ sơ shop nào trong mục này.</h3>
        <p class="muted">Thử chuyển sang lĩnh vực khác hoặc quay lại sau.</p>
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
