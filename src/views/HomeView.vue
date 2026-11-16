<script setup>
import { ref, watch, nextTick, onMounted, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchRecordsOnServer } from '@/services/repository'
import { useLazyList } from '@/composables/useLazyList'

const ReportDossierCard = defineAsyncComponent(() => import('@/components/ReportDossierCard.vue'))
const ShopDossierCard = defineAsyncComponent(() => import('@/components/ShopDossierCard.vue'))

const route = useRoute()
const router = useRouter()

const searchInput = ref(String(route.query.q || ''))
const activeQuery = ref(String(route.query.q || '').trim())
const isSearching = ref(false)
const matchedReports = ref([])
const matchedShops = ref([])
const resultsAnchor = ref(null)
let searchReqId = 0

async function performServerSearch(q) {
  const trimmed = String(q || '').trim()
  if (!trimmed) {
    matchedReports.value = []
    matchedShops.value = []
    isSearching.value = false
    return
  }

  const reqId = ++searchReqId
  isSearching.value = true
  try {
    const res = await searchRecordsOnServer(trimmed)
    if (reqId !== searchReqId) return
    matchedReports.value = res.reports
    matchedShops.value = res.shops
  } finally {
    if (reqId === searchReqId) isSearching.value = false
  }
}

watch(
  () => route.query.q,
  (q) => {
    const val = String(q || '')
    const trimmed = val.trim()
    searchInput.value = val
    if (trimmed !== activeQuery.value) {
      activeQuery.value = trimmed
      performServerSearch(trimmed)
    }
  }
)

onMounted(async () => {
  if (activeQuery.value) {
    performServerSearch(activeQuery.value)
    await nextTick()
    resultsAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
})

async function executeSearch() {
  const trimmed = searchInput.value.trim()
  activeQuery.value = trimmed
  resetMatchedReports()
  resetMatchedShops()

  const searchPromise = performServerSearch(trimmed)

  await router.replace({
    path: '/',
    query: trimmed ? { q: trimmed } : {}
  })
  if (trimmed) {
    await nextTick()
    resultsAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  await searchPromise
}

function clearSearch() {
  searchReqId += 1
  searchInput.value = ''
  activeQuery.value = ''
  matchedReports.value = []
  matchedShops.value = []
  isSearching.value = false
  router.replace({ path: '/', query: {} })
}

async function pasteAndSearch() {
  try {
    const text = await navigator.clipboard.readText()
    if (text && text.trim()) {
      searchInput.value = text.trim()
      executeSearch()
    }
  } catch {
    // Clipboard permission denied — keep focus for manual Ctrl+V
  }
}

const {
  visibleItems: visibleMatchedReports,
  hasMore: hasMoreReports,
  remainingCount: remainingReports,
  sentinelRef: reportsSentinelRef,
  loadMore: loadMoreReports,
  reset: resetMatchedReports
} = useLazyList(matchedReports, 6)

const {
  visibleItems: visibleMatchedShops,
  hasMore: hasMoreShops,
  remainingCount: remainingShops,
  sentinelRef: shopsSentinelRef,
  loadMore: loadMoreShops,
  reset: resetMatchedShops
} = useLazyList(matchedShops, 6)
</script>

<template>
  <div class="home">
    <!-- Screen 1: Centered Hero -->
    <section class="hero-centred" aria-labelledby="hero-heading">
      <div class="wrap hero-centred__inner">
        <span class="stamp enter-rise-1">Cộng đồng người Việt tại Philippines</span>

        <h1 id="hero-heading" class="hero-centred__h1 enter-rise-1">
          Tra cứu thông tin Shop Việt tại Philippines trước khi giao dịch.
        </h1>

        <p class="hero-centred__lead enter-rise-2">
          Nhập số tài khoản ngân hàng, ví GCash, @username Telegram, số điện thoại Zalo hoặc dán link Facebook để đối chiếu danh bạ Shop Việt đã xác minh tại Philippines và dữ liệu cảnh báo lừa đảo.
        </p>

        <form class="search-bar enter-rise-3" role="search" @submit.prevent="executeSearch">
          <label for="main-lookup-input" class="sr-only">
            Nhập số tài khoản, số GCash, số điện thoại, username hoặc link mạng xã hội
          </label>
          <div class="search-bar__box">
            <svg class="search-bar__icon" viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.7" />
              <path d="M13.5 13.5L17.5 17.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="square" />
            </svg>

            <input
              id="main-lookup-input"
              v-model="searchInput"
              type="search"
              class="search-bar__input"
              placeholder="Nhập STK, số GCash, SĐT, @telegram hoặc dán link Facebook..."
              autocomplete="off"
            />

            <button
              v-if="!searchInput"
              type="button"
              class="search-bar__aux"
              @click="pasteAndSearch"
            >
              Dán nhanh
            </button>
            <button
              v-else
              type="button"
              class="search-bar__aux"
              aria-label="Xóa từ khóa tìm kiếm"
              @click="clearSearch"
            >
              Xóa
            </button>

            <button type="submit" class="btn btn--primary search-bar__submit" :disabled="isSearching">
              <span>{{ isSearching ? 'Đang tra cứu...' : 'Kiểm tra' }}</span>
              <svg class="m-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
              </svg>
            </button>
          </div>

          <div class="search-bar__hints">
            <span>Hỗ trợ đối chiếu Shop Việt tại Philippines (đổi Peso - VND, đồ Việt, vé máy bay, trung gian...) · Tự động lọc UID Facebook và chuẩn hóa đầu số +84 / +63.</span>
          </div>
        </form>
      </div>
    </section>

    <!-- On-Demand Search Results Section (Only shown when user searches) -->
    <section
      v-if="activeQuery"
      ref="resultsAnchor"
      class="section section--results"
      aria-live="polite"
    >
      <div class="wrap">
        <div class="verdict-header">
          <div class="verdict-header__left">
            <span class="label">Kết quả đối chiếu cho truy vấn</span>
            <h2 class="verdict-header__query mono">"{{ activeQuery }}"</h2>
          </div>
          <button type="button" class="btn btn--secondary btn--sm" @click="clearSearch">
            Đóng kết quả tra cứu
          </button>
        </div>

        <div v-if="isSearching" class="verdict-banner verdict-banner--neutral">
          <div>
            <strong>Đang truy vấn dữ liệu trên hệ thống...</strong>
            <p class="muted">Đang đối chiếu chỉ mục số tài khoản, số điện thoại và định danh mạng xã hội.</p>
          </div>
        </div>

        <template v-else>
          <div
            v-if="matchedReports.length > 0"
            class="verdict-banner verdict-banner--danger"
          >
            <div>
              <strong>Cảnh báo rủi ro cao: Phát hiện {{ matchedReports.length }} hồ sơ tố cáo lừa đảo trùng khớp.</strong>
              <p>Tuyệt đối tạm dừng chuyển khoản và kiểm tra kỹ số tài khoản, tên chủ thẻ cùng bằng chứng đính kèm bên dưới.</p>
            </div>
          </div>

          <div
            v-if="matchedShops.length > 0"
            class="verdict-banner verdict-banner--verified"
          >
            <div>
              <strong>Tìm thấy {{ matchedShops.length }} hồ sơ Shop đã xác minh trùng khớp.</strong>
              <p>Hãy đối chiếu chính xác từng chữ số của Số tài khoản ngân hàng và đúng đường dẫn MXH chính thức trước khi giao dịch.</p>
            </div>
          </div>

          <div
            v-if="matchedReports.length === 0 && matchedShops.length === 0"
            class="verdict-banner verdict-banner--neutral"
          >
            <div class="verdict-banner__empty-copy">
              <strong>Chưa ghi nhận hồ sơ trùng khớp với "{{ activeQuery }}" trên hệ thống.</strong>
              <p>
                Việc chưa có đơn tố cáo không đồng nghĩa tài khoản này an toàn 100% (kẻ gian có thể vừa mở tài khoản mới). Hãy kiểm tra kỹ lịch sử hoạt động của nick, gọi video xác nhận hoặc giao dịch qua shop đã xác minh.
              </p>
            </div>
            <RouterLink to="/report" class="btn btn--secondary btn--sm">
              Gửi tố cáo mới
            </RouterLink>
          </div>

          <!-- Matched Scam Reports (Lazy Loaded) -->
          <div v-if="matchedReports.length > 0" class="verdict-group">
            <h3 class="verdict-group__title">Danh sách lừa đảo ({{ matchedReports.length }})</h3>
            <div class="dossier-grid">
              <ReportDossierCard
                v-for="entry in visibleMatchedReports"
                :key="entry.item.id"
                :report="entry.item"
                :match-info="entry.match"
              />
            </div>
            <div v-if="hasMoreReports" ref="reportsSentinelRef" class="lazy-more">
              <button type="button" class="btn btn--secondary btn--sm" @click="loadMoreReports">
                Hiển thị thêm ({{ remainingReports }} hồ sơ lừa đảo)
              </button>
            </div>
          </div>

          <!-- Matched Verified Shops (Lazy Loaded) -->
          <div v-if="matchedShops.length > 0" class="verdict-group">
            <h3 class="verdict-group__title">Shop uy tín ({{ matchedShops.length }})</h3>
            <div class="dossier-grid">
              <ShopDossierCard
                v-for="entry in visibleMatchedShops"
                :key="entry.item.id"
                :shop="entry.item"
                :match-info="entry.match"
              />
            </div>
            <div v-if="hasMoreShops" ref="shopsSentinelRef" class="lazy-more">
              <button type="button" class="btn btn--secondary btn--sm" @click="loadMoreShops">
                Hiển thị thêm ({{ remainingShops }} shop uy tín)
              </button>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- Section: Verification Protocol -->
    <section class="section section--alt" aria-labelledby="protocol-h">
      <div class="wrap">
        <div class="section-head">
          <div class="section-head__copy">
            <h2 id="protocol-h">
              Ba nguyên tắc kiểm tra khi giao dịch với Shop Việt tại Philippines.
            </h2>
          </div>
        </div>

        <div class="grid">
          <article class="card span-4 protocol-card">
            <span class="mono protocol-card__step">01 / Ngân hàng &amp; GCash</span>
            <h3>Đối chiếu đúng STK hoặc số GCash nhận tiền</h3>
            <p>
              Kẻ mạo danh thường sao chép y hệt tên và ảnh các Shop Việt uy tín tại Philippines (đổi Peso - VND, vé máy bay, tạp hóa Việt...) nhưng gửi STK hoặc GCash lạ khi thanh toán.
            </p>
          </article>

          <article class="card span-4 protocol-card">
            <span class="mono protocol-card__step">02 / Định danh MXH</span>
            <h3>Kiểm tra đúng @username Telegram, Zalo &amp; UID gốc</h3>
            <p>
              Giao dịch tại Philippines phần lớn diễn ra qua Telegram và Facebook. Tên hiển thị rất dễ làm giả, hãy đối chiếu chính xác mã ID và đường dẫn gốc của shop trước khi chuyển tiền.
            </p>
          </article>

          <article class="card span-4 protocol-card">
            <span class="mono protocol-card__step">03 / Bằng chứng thực</span>
            <h3>Chụp lại biên lai &amp; tin nhắn trước khi bị thu hồi</h3>
            <p>
              Trên Telegram kẻ gian có thể xóa trắng lịch sử chat hai chiều bất cứ lúc nào. Hãy lưu ảnh chụp màn hình biên lai và @username ngay khi giao dịch để kịp gửi cảnh báo.
            </p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.hero-centred {
  min-height: calc(78svh - var(--nav));
  display: flex;
  align-items: center;
  padding-top: var(--s-8);
  padding-bottom: var(--s-8);
  border-bottom: 1px solid var(--p-line);
  background: var(--p-bg);
}

.hero-centred__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--s-5);
}

.hero-centred__h1 {
  max-width: 23ch;
}

.hero-centred__lead {
  font-size: var(--t-lead);
  color: var(--p-text);
  max-width: 60ch;
  line-height: 1.55;
  text-wrap: pretty;
}

/* Centered Search Bar */
.search-bar {
  width: min(100%, 760px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: var(--s-2);
}

.search-bar__box {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--p-card);
  border: 1.5px solid rgba(13, 116, 128, 0.34);
  border-radius: 999px;
  padding: 6px 6px 6px 18px;
  text-align: left;
  transition: border-color 150ms var(--ease), box-shadow 150ms var(--ease);
}

.search-bar__box:hover {
  border-color: rgba(13, 116, 128, 0.58);
}

.search-bar__box:focus-within {
  border-color: var(--p-accent);
  box-shadow: 0 0 0 3px rgba(13, 116, 128, 0.12);
}

.search-bar__icon {
  color: var(--p-accent);
  flex-shrink: 0;
}

.search-bar__input {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: none;
  background: transparent;
  font-size: 16px;
  color: var(--p-ink);
}

.search-bar__input:focus {
  outline: none;
}

.search-bar__aux {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--p-line);
  background: var(--p-surface);
  color: var(--p-ink);
  font-size: var(--t-label);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.search-bar__aux:hover {
  border-color: var(--p-accent);
  color: var(--p-accent);
}

.search-bar__submit {
  border-radius: 999px;
}

.search-bar__hints {
  font-size: var(--t-label);
  color: var(--p-muted);
  text-align: center;
  max-width: 60ch;
}

/* Search Verdict Section */
.section--results {
  scroll-margin-top: var(--nav);
  border-bottom: 1px solid var(--p-line);
  background: var(--p-bg);
}

.verdict-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-4);
  margin-bottom: var(--s-5);
}

.verdict-header__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.verdict-header__query {
  font-size: var(--t-h2);
  word-break: break-all;
}

.verdict-banner {
  padding: 18px 22px;
  border-radius: var(--r-md);
  border: 1px solid var(--p-line);
  margin-bottom: var(--s-5);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
}

.verdict-banner strong {
  display: block;
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.verdict-banner p {
  font-size: var(--t-small);
}

.verdict-banner--danger {
  background: var(--p-danger-bg);
  border-color: var(--p-danger-line);
  color: var(--p-danger);
}

.verdict-banner--verified {
  background: var(--p-verified-bg);
  border-color: var(--p-verified-line);
  color: var(--p-verified);
}

.verdict-banner--neutral {
  background: var(--p-card);
  border-color: var(--p-line-strong);
  color: var(--p-ink);
}

.verdict-banner__empty-copy {
  max-width: 72ch;
}

.verdict-banner__empty-copy p {
  color: var(--p-muted);
}

.verdict-group {
  margin-top: var(--s-6);
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.verdict-group__title {
  font-size: var(--t-h3);
}

.dossier-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-5);
  align-items: start;
}

.lazy-more {
  display: flex;
  justify-content: center;
  padding-top: var(--s-5);
}

.protocol-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.protocol-card__step {
  font-size: var(--t-label);
  color: var(--p-action);
  font-weight: 500;
}

.protocol-card p {
  font-size: var(--t-body);
  color: var(--p-text);
}

@media (max-width: 1080px) {
  .dossier-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 639px) {
  .hero-centred {
    min-height: auto;
    padding-top: var(--s-7);
    padding-bottom: var(--s-7);
  }
  .search-bar__box {
    flex-wrap: wrap;
    border-radius: 24px;
    padding: 10px 12px;
  }
  .search-bar__submit {
    width: 100%;
  }
}
</style>
