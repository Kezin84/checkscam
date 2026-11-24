<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useAuth } from '@/services/firebase'
import {
  useRepository,
  fetchReportsPage,
  fetchShopsPage,
  searchRecordsOnServer,
  subscribePendingReports,
  unsubscribePendingReports,
  approvePendingReport,
  rejectPendingReport,
  saveApprovedReport,
  deleteApprovedReport,
  saveTrustedShop,
  deleteTrustedShop,
  normalizeReportIncidents
} from '@/services/repository'
import {
  formatDateVi,
  formatCurrencyVi,
  platformLabel,
  resolveSocialId,
  resolveSocialUrl
} from '@/utils/normalize'
import { optimizeCloudinaryUrl } from '@/services/cloudinary'
import { useServerFeed } from '@/composables/useServerFeed'
import ScamReportForm from '@/components/ScamReportForm.vue'
import TrustedShopForm from '@/components/TrustedShopForm.vue'
import LightboxModal from '@/components/LightboxModal.vue'
import CopyButton from '@/components/CopyButton.vue'
import PlatformIcon from '@/components/icons/PlatformIcon.vue'

const {
  currentUser,
  authReady,
  authError,
  isAdmin,
  loginWithGoogle,
  logout
} = useAuth()

const { siteMeta, pendingReports, pendingLoading } = useRepository()

const activeTab = ref('pending') // 'pending' | 'reports' | 'shops' | 'rules'
const actionBusy = ref(false)
const feedbackMsg = ref('')
const feedbackType = ref('ok')

// Editor state
const editingMode = ref('') // '' | 'approve-edit' | 'new-report' | 'edit-report' | 'new-shop' | 'edit-shop'
const editingItem = ref(null)

// Paginated + server-searched Admin feeds
const {
  items: filteredAdminReports,
  loading: adminReportsLoading,
  loadingMore: adminReportsLoadingMore,
  hasMore: adminReportsHasMore,
  keyword: reportQuery,
  loadNextPage: loadMoreAdminReports,
  triggerSearchNow: triggerReportSearchNow,
  reload: reloadAdminReports
} = useServerFeed({
  batchSize: 15,
  fetchPage: ({ batchSize, cursorKey }) => fetchReportsPage({ batchSize, cursorKey }),
  searchFn: async (q) => {
    const res = await searchRecordsOnServer(q, { includeReports: true, includeShops: false })
    return res.reports.map((entry) => entry.item)
  }
})

const {
  items: filteredAdminShops,
  loading: adminShopsLoading,
  loadingMore: adminShopsLoadingMore,
  hasMore: adminShopsHasMore,
  keyword: shopQuery,
  loadNextPage: loadMoreAdminShops,
  triggerSearchNow: triggerShopSearchNow,
  reload: reloadAdminShops
} = useServerFeed({
  batchSize: 15,
  fetchPage: ({ batchSize, cursorKey }) => fetchShopsPage({ batchSize, cursorKey }),
  searchFn: async (q) => {
    const res = await searchRecordsOnServer(q, { includeReports: false, includeShops: true })
    return res.shops.map((entry) => entry.item)
  }
})

// Lightbox for pending evidence preview
const previewImages = ref([])
const previewIdx = ref(-1)

watch(
  isAdmin,
  (ok) => {
    if (ok) {
      subscribePendingReports()
    } else {
      unsubscribePendingReports()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  unsubscribePendingReports()
})

function notify(msg, type = 'ok') {
  feedbackMsg.value = msg
  feedbackType.value = type
  setTimeout(() => {
    if (feedbackMsg.value === msg) feedbackMsg.value = ''
  }, 4200)
}

function openPreview(images, index) {
  previewImages.value = images
  previewIdx.value = index
}

function closeEditor() {
  editingMode.value = ''
  editingItem.value = null
}

// Pending actions
async function handleQuickApprove(item) {
  actionBusy.value = true
  try {
    await approvePendingReport(item.id, item)
    reloadAdminReports()
    notify(`Đã duyệt và công khai hồ sơ "${item.subjectName}".`)
  } catch (err) {
    notify(err?.message || 'Lỗi khi duyệt hồ sơ.', 'error')
  } finally {
    actionBusy.value = false
  }
}

async function handleRejectPending(item) {
  if (!window.confirm(`Xác nhận từ chối và xóa đơn chờ duyệt "${item.subjectName}"?`)) return
  actionBusy.value = true
  try {
    await rejectPendingReport(item.id)
    notify('Đã xóa đơn tố cáo khỏi danh sách chờ duyệt.')
  } catch (err) {
    notify(err?.message || 'Không thể xóa đơn chờ duyệt.', 'error')
  } finally {
    actionBusy.value = false
  }
}

function startEditBeforeApprove(item) {
  editingItem.value = item
  editingMode.value = 'approve-edit'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Form submission handler for reports (approve-edit, new-report, edit-report)
async function handleSaveReportForm(payload) {
  actionBusy.value = true
  try {
    if (editingMode.value === 'approve-edit' && editingItem.value?.id) {
      await approvePendingReport(editingItem.value.id, payload)
      notify(`Đã cập nhật và duyệt công khai "${payload.subjectName}".`)
    } else if (editingMode.value === 'edit-report' && editingItem.value?.id) {
      await saveApprovedReport(payload, editingItem.value.id)
      notify(`Đã lưu chỉnh sửa hồ sơ "${payload.subjectName}".`)
    } else {
      await saveApprovedReport(payload, null)
      notify(`Đã đăng công khai hồ sơ cảnh báo "${payload.subjectName}".`)
    }
    reloadAdminReports()
    closeEditor()
  } catch (err) {
    notify(err?.message || 'Không thể lưu hồ sơ cảnh báo.', 'error')
  } finally {
    actionBusy.value = false
  }
}

async function handleDeleteApprovedReport(item) {
  if (!window.confirm(`Xóa vĩnh viễn hồ sơ cảnh báo "${item.subjectName}"?`)) return
  actionBusy.value = true
  try {
    await deleteApprovedReport(item.id)
    reloadAdminReports()
    notify('Đã xóa hồ sơ cảnh báo.')
  } catch (err) {
    notify(err?.message || 'Lỗi khi xóa hồ sơ.', 'error')
  } finally {
    actionBusy.value = false
  }
}

// Form submission handler for trusted shops
async function handleSaveShopForm(payload) {
  actionBusy.value = true
  try {
    if (editingMode.value === 'edit-shop' && editingItem.value?.id) {
      await saveTrustedShop(payload, editingItem.value.id)
      notify(`Đã cập nhật thông tin shop "${payload.shopName}".`)
    } else {
      await saveTrustedShop(payload, null)
      notify(`Đã thêm shop xác minh "${payload.shopName}".`)
    }
    reloadAdminShops()
    closeEditor()
  } catch (err) {
    notify(err?.message || 'Không thể lưu hồ sơ shop.', 'error')
  } finally {
    actionBusy.value = false
  }
}

async function handleDeleteShop(shop) {
  if (!window.confirm(`Xóa shop xác minh "${shop.shopName}" khỏi danh bạ?`)) return
  actionBusy.value = true
  try {
    await deleteTrustedShop(shop.id)
    reloadAdminShops()
    notify('Đã xóa hồ sơ shop xác minh.')
  } catch (err) {
    notify(err?.message || 'Không thể xóa shop.', 'error')
  } finally {
    actionBusy.value = false
  }
}

const securityRulesJson = computed(() => {
  const email = currentUser.value?.email || ''
  return `{
  "rules": {
    "trusted_shops": {
      ".read": true,
      ".write": "auth != null && auth.token.email === '${email}'"
    },
    "scam_reports": {
      ".read": true,
      ".write": "auth != null && auth.token.email === '${email}'"
    },
    "lookup_index": {
      ".read": true,
      ".write": "auth != null && auth.token.email === '${email}'"
    },
    "cat_index": {
      ".read": true,
      ".write": "auth != null && auth.token.email === '${email}'"
    },
    "plat_index": {
      ".read": true,
      ".write": "auth != null && auth.token.email === '${email}'"
    },
    "site_meta": {
      ".read": true,
      ".write": "auth != null && auth.token.email === '${email}'"
    },
    "pending_reports": {
      ".read": "auth != null && auth.token.email === '${email}'",
      "$submissionId": {
        ".write": "!data.exists() || (auth != null && auth.token.email === '${email}')",
        ".validate": "newData.hasChildren(['subjectName', 'scamType', 'createdAt']) || !newData.exists()"
      }
    },
    "reporter_archive": {
      ".read": "auth != null && auth.token.email === '${email}'",
      ".write": "auth != null && auth.token.email === '${email}'"
    }
  }
}`
})
</script>

<template>
  <section class="section admin-page">
    <div class="wrap">
      <!-- Loading Auth -->
      <div v-if="!authReady" class="card auth-card">
        <p class="muted">Đang kiểm tra phiên đăng nhập quản trị...</p>
      </div>

      <!-- Not signed in or unauthorized account -->
      <div v-else-if="!isAdmin" class="card auth-card">
        <span class="stamp">Khu vực quản trị viên</span>
        <h1>Đăng nhập để duyệt đơn và quản lý danh bạ</h1>
        <p class="muted measure">
          Quyền chỉnh sửa dữ liệu, duyệt bài tố cáo của người dùng và cấp nhãn Đã xác minh được giới hạn riêng cho email quản trị viên hệ thống.
        </p>

        <div v-if="currentUser && !isAdmin" class="auth-mismatch">
          <strong>Tài khoản hiện tại chưa được cấp quyền:</strong>
          <span class="mono">{{ currentUser.email }}</span>
          <p>Vui lòng đăng xuất và đăng nhập bằng tài khoản quản trị được cấp quyền.</p>
        </div>

        <p v-if="authError" class="field__error">{{ authError }}</p>

        <div class="btn-row">
          <button
            v-if="!currentUser"
            type="button"
            class="btn btn--primary"
            @click="loginWithGoogle"
          >
            <span class="google-tile" aria-hidden="true">
              <svg viewBox="0 0 18 18" width="14" height="14">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            </span>
            <span>Đăng nhập bằng Google</span>
          </button>

          <template v-else>
            <button type="button" class="btn btn--primary" @click="loginWithGoogle">
              Đổi tài khoản Google khác
            </button>
            <button type="button" class="btn btn--secondary" @click="logout">
              Đăng xuất
            </button>
          </template>
        </div>
      </div>

      <!-- Authenticated Admin Workspace -->
      <div v-else class="admin-workspace">
        <div class="admin-topbar">
          <div>
            <span class="label">Bảng điều khiển quản trị</span>
            <h1>Kiểm duyệt hồ sơ & Shop xác minh</h1>
          </div>
          <div class="admin-user-bar">
            <span class="mono admin-user-bar__email">{{ currentUser?.email }}</span>
            <button type="button" class="btn btn--secondary btn--sm" @click="logout">
              Đăng xuất
            </button>
          </div>
        </div>

        <div
          v-if="feedbackMsg"
          class="admin-toast"
          :class="{ 'admin-toast--error': feedbackType === 'error' }"
          role="status"
        >
          {{ feedbackMsg }}
        </div>

        <!-- Active Editor Drawer / Panel -->
        <div v-if="editingMode" class="admin-editor">
          <div class="admin-editor__bar">
            <h2>
              <template v-if="editingMode === 'approve-edit'">Kiểm tra & chỉnh sửa trước khi duyệt công khai</template>
              <template v-else-if="editingMode === 'new-report'">Đăng trực tiếp hồ sơ cảnh báo mới</template>
              <template v-else-if="editingMode === 'edit-report'">Chỉnh sửa hồ sơ cảnh báo</template>
              <template v-else-if="editingMode === 'new-shop'">Thêm Shop đã xác minh mới</template>
              <template v-else-if="editingMode === 'edit-shop'">Chỉnh sửa hồ sơ Shop đã xác minh</template>
            </h2>
            <button type="button" class="btn btn--secondary btn--sm" @click="closeEditor">
              Quay lại danh sách
            </button>
          </div>

          <ScamReportForm
            v-if="['approve-edit', 'new-report', 'edit-report'].includes(editingMode)"
            :initial-data="editingItem"
            :mode="editingMode === 'approve-edit' ? 'admin-approve' : 'admin-direct'"
            :submitting="actionBusy"
            :submit-label="
              editingMode === 'approve-edit'
                ? 'Duyệt & đăng công khai'
                : 'Lưu hồ sơ cảnh báo'
            "
            @submit="handleSaveReportForm"
            @cancel="closeEditor"
          />

          <TrustedShopForm
            v-else
            :initial-data="editingItem"
            :submitting="actionBusy"
            @submit="handleSaveShopForm"
            @cancel="closeEditor"
          />
        </div>

        <!-- Main Tabs -->
        <template v-else>
          <div class="admin-tabs" role="tablist" aria-label="Phân mục quản trị">
            <button
              type="button"
              role="tab"
              class="admin-tabs__btn"
              :class="{ 'is-active': activeTab === 'pending' }"
              :aria-selected="activeTab === 'pending' ? 'true' : 'false'"
              @click="activeTab = 'pending'"
            >
              <span>Đơn chờ duyệt</span>
              <span class="mono admin-tabs__count" :class="{ 'is-alert': pendingReports.length > 0 }">
                {{ pendingReports.length }}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              class="admin-tabs__btn"
              :class="{ 'is-active': activeTab === 'reports' }"
              :aria-selected="activeTab === 'reports' ? 'true' : 'false'"
              @click="activeTab = 'reports'"
            >
              <span>Hồ sơ lừa đảo</span>
              <span class="mono admin-tabs__count">{{ siteMeta.reportsCount }}</span>
            </button>

            <button
              type="button"
              role="tab"
              class="admin-tabs__btn"
              :class="{ 'is-active': activeTab === 'shops' }"
              :aria-selected="activeTab === 'shops' ? 'true' : 'false'"
              @click="activeTab = 'shops'"
            >
              <span>Shop đã xác minh</span>
              <span class="mono admin-tabs__count">{{ siteMeta.shopsCount }}</span>
            </button>

            <button
              type="button"
              role="tab"
              class="admin-tabs__btn"
              :class="{ 'is-active': activeTab === 'rules' }"
              :aria-selected="activeTab === 'rules' ? 'true' : 'false'"
              @click="activeTab = 'rules'"
            >
              <span>Bảo mật Database</span>
            </button>
          </div>

          <!-- TAB 1: PENDING SUBMISSIONS -->
          <div v-if="activeTab === 'pending'" class="admin-panel">
            <div v-if="pendingLoading" class="card admin-empty">
              Đang tải danh sách đơn tố cáo chờ duyệt...
            </div>

            <div v-else-if="pendingReports.length === 0" class="card admin-empty">
              <h3>Không có đơn tố cáo nào đang chờ duyệt.</h3>
              <p class="muted">
                Khi người dùng gửi báo cáo tại trang Gửi tố cáo, đơn mới sẽ xuất hiện tức thời tại đây.
              </p>
            </div>

            <div v-else class="pending-stack">
              <article v-for="item in pendingReports" :key="item.id" class="card pending-card">
                <div class="pending-card__top">
                  <div class="pending-card__badges">
                    <span class="stamp stamp--warn">Chờ kiểm duyệt</span>
                    <span class="mono label">Gửi ngày {{ formatDateVi(item.createdAt) }}</span>
                  </div>
                  <div class="btn-row">
                    <button
                      type="button"
                      class="btn btn--secondary btn--sm"
                      :disabled="actionBusy"
                      @click="startEditBeforeApprove(item)"
                    >
                      Sửa & Duyệt
                    </button>
                    <button
                      type="button"
                      class="btn btn--primary btn--sm"
                      :disabled="actionBusy"
                      @click="handleQuickApprove(item)"
                    >
                      Duyệt đăng ngay
                    </button>
                    <button
                      type="button"
                      class="btn btn--danger btn--sm"
                      :disabled="actionBusy"
                      @click="handleRejectPending(item)"
                    >
                      Từ chối
                    </button>
                  </div>
                </div>

                <div class="pending-card__body">
                  <h3>{{ item.subjectName }}</h3>
                  <p v-if="normalizeReportIncidents(item).length > 1" class="pending-card__scam">
                    <strong>Tổng hợp:</strong> {{ normalizeReportIncidents(item).length }} cụm vụ việc
                    <span v-if="item.scamAmount > 0" class="mono">
                      · Tổng thiệt hại: {{ formatCurrencyVi(item.scamAmount) }}
                    </span>
                  </p>

                  <div class="pending-card__cols">
                    <div class="pending-card__col">
                      <span class="label">Tài khoản ngân hàng bị tố cáo</span>
                      <div v-if="item.bankAccounts?.length" class="rows">
                        <div v-for="(b, bi) in item.bankAccounts" :key="bi" class="rows__item">
                          <span class="mono">
                            {{ b.bankName || b.bankCode || 'NH' }} · <strong>{{ b.accountNumber }}</strong>
                            ({{ b.accountHolder || 'Chưa rõ chủ TK' }})
                          </span>
                        </div>
                      </div>
                      <p v-else class="muted">Không cung cấp STK</p>
                    </div>

                    <div class="pending-card__col">
                      <span class="label">Kênh mạng xã hội</span>
                      <div v-if="item.socials?.length" class="rows">
                        <div v-for="(s, si) in item.socials" :key="si" class="rows__item">
                          <span style="display: inline-flex; align-items: center; gap: 8px">
                            <PlatformIcon :platform="s.platform" :size="22" />
                            <span>
                              {{ platformLabel(s.platform) }}:
                              <strong class="mono">{{ resolveSocialId(s) || '—' }}</strong>
                            </span>
                          </span>
                          <a
                            v-if="resolveSocialUrl(s)"
                            :href="resolveSocialUrl(s)"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="link"
                          >
                            Mở link
                          </a>
                        </div>
                      </div>
                      <p v-else class="muted">Không cung cấp MXH</p>
                    </div>
                  </div>

                  <div
                    v-if="normalizeReportIncidents(item).length"
                    class="pending-card__incidents"
                  >
                    <div
                      v-for="(inc, cIdx) in normalizeReportIncidents(item)"
                      :key="cIdx"
                      class="pending-card__incident"
                    >
                      <p class="pending-card__scam">
                        <strong v-if="normalizeReportIncidents(item).length > 1">
                          Vụ việc #{{ cIdx + 1 }} ·
                        </strong>
                        <strong>Hình thức:</strong> {{ inc.scamType || '—' }}
                        <span v-if="inc.scamAmount > 0" class="mono">
                          · Số tiền: {{ formatCurrencyVi(inc.scamAmount) }}
                        </span>
                      </p>

                      <p v-if="inc.description" class="pending-card__desc">{{ inc.description }}</p>

                      <div v-if="inc.evidenceImages?.length" class="pending-card__photos">
                        <button
                          v-for="(img, idx) in inc.evidenceImages"
                          :key="img + idx"
                          type="button"
                          class="m-zoom pending-card__thumb"
                          :aria-label="`Xem ảnh bằng chứng ${idx + 1}`"
                          @click="openPreview(inc.evidenceImages, idx)"
                        >
                          <img :src="optimizeCloudinaryUrl(img, 320)" :alt="`Ảnh bằng chứng ${idx + 1}`" />
                        </button>
                      </div>

                      <div v-if="inc.exposeLinks?.length" class="pending-card__links">
                        <span class="label">Link bài phốt:</span>
                        <a
                          v-for="(lnk, li) in inc.exposeLinks"
                          :key="li"
                          :href="lnk"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="link"
                        >
                          Bài phốt #{{ li + 1 }}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div class="pending-card__reporter">
                    <span class="label">Thông tin người gửi (ẩn với công khai):</span>
                    <span class="mono">
                      {{ item.reporterName || 'Ẩn danh' }} · {{ item.reporterContact || 'Không để lại liên hệ' }}
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <!-- TAB 2: APPROVED SCAM REPORTS -->
          <div v-else-if="activeTab === 'reports'" class="admin-panel">
            <div class="admin-toolbar">
              <input
                v-model="reportQuery"
                type="search"
                class="field__input admin-toolbar__search"
                aria-label="Tìm kiếm trong danh sách hồ sơ cảnh báo"
                placeholder="Tìm nhanh theo STK, tên đối tượng hoặc SĐT..."
                @keydown.enter.prevent="triggerReportSearchNow"
              />
              <button
                type="button"
                class="btn btn--primary"
                @click="editingItem = null; editingMode = 'new-report'"
              >
                + Tự thêm hồ sơ cảnh báo
              </button>
            </div>

            <div v-if="adminReportsLoading" class="card admin-empty">
              <p class="muted">Đang tải danh sách hồ sơ cảnh báo...</p>
            </div>

            <div v-else-if="filteredAdminReports.length === 0" class="card admin-empty">
              <p class="muted">Chưa có hồ sơ cảnh báo nào khớp tìm kiếm.</p>
            </div>

            <div v-else class="card admin-table-card">
              <div class="rows">
                <div v-for="rep in filteredAdminReports" :key="rep.id" class="rows__item admin-row">
                  <div class="admin-row__info">
                    <strong>{{ rep.subjectName }}</strong>
                    <span class="mono admin-row__meta">
                      {{ rep.bankAccounts?.[0]?.bankCode || '' }}
                      {{ rep.bankAccounts?.[0]?.accountNumber || 'Không có STK' }}
                      · {{ rep.socials?.[0]?.usernameOrPhone || 'Không rõ MXH' }}
                      · {{ formatDateVi(rep.createdAt) }}
                    </span>
                  </div>
                  <div class="btn-row">
                    <button
                      type="button"
                      class="btn btn--secondary btn--sm"
                      @click="editingItem = rep; editingMode = 'edit-report'"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      class="btn btn--danger btn--sm"
                      :disabled="actionBusy"
                      @click="handleDeleteApprovedReport(rep)"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="adminReportsHasMore" style="display:flex;justify-content:center;padding-top:16px">
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  :disabled="adminReportsLoadingMore"
                  @click="loadMoreAdminReports"
                >
                  {{ adminReportsLoadingMore ? 'Đang tải...' : 'Tải thêm hồ sơ' }}
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 3: VERIFIED SHOPS -->
          <div v-else-if="activeTab === 'shops'" class="admin-panel">
            <div class="admin-toolbar">
              <input
                v-model="shopQuery"
                type="search"
                class="field__input admin-toolbar__search"
                aria-label="Tìm kiếm shop đã xác minh"
                placeholder="Tìm theo tên shop, chủ tài khoản hoặc STK..."
                @keydown.enter.prevent="triggerShopSearchNow"
              />
              <button
                type="button"
                class="btn btn--primary"
                @click="editingItem = null; editingMode = 'new-shop'"
              >
                + Thêm Shop đã xác minh
              </button>
            </div>

            <div v-if="adminShopsLoading" class="card admin-empty">
              <p class="muted">Đang tải danh sách shop xác minh...</p>
            </div>

            <div v-else-if="filteredAdminShops.length === 0" class="card admin-empty">
              <p class="muted">Chưa có hồ sơ shop xác minh nào.</p>
            </div>

            <div v-else class="card admin-table-card">
              <div class="rows">
                <div v-for="shop in filteredAdminShops" :key="shop.id" class="rows__item admin-row">
                  <div class="admin-row__info">
                    <div class="admin-row__title-line">
                      <strong>{{ shop.shopName }}</strong>
                      <span v-if="shop.verified !== false" class="stamp stamp--verified">Đã xác minh</span>
                      <span v-else class="stamp">Chưa xác minh</span>
                    </div>
                    <span class="mono admin-row__meta">
                      Chủ shop: {{ shop.ownerName || '—' }}
                      <template v-if="shop.address"> · {{ shop.address }}</template>
                      · STK: {{ shop.bankAccounts?.[0]?.accountNumber || '—' }}
                      · {{ shop.category }}
                    </span>
                  </div>
                  <div class="btn-row">
                    <button
                      type="button"
                      class="btn btn--secondary btn--sm"
                      @click="editingItem = shop; editingMode = 'edit-shop'"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      class="btn btn--danger btn--sm"
                      :disabled="actionBusy"
                      @click="handleDeleteShop(shop)"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="adminShopsHasMore" style="display:flex;justify-content:center;padding-top:16px">
                <button
                  type="button"
                  class="btn btn--secondary btn--sm"
                  :disabled="adminShopsLoadingMore"
                  @click="loadMoreAdminShops"
                >
                  {{ adminShopsLoadingMore ? 'Đang tải...' : 'Tải thêm shop' }}
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 4: DATABASE SECURITY RULES -->
          <div v-else-if="activeTab === 'rules'" class="admin-panel">
            <div class="card rules-card">
              <div class="rules-card__head">
                <div>
                  <h3>Quy tắc bảo mật Firebase Realtime Database</h3>
                  <p class="muted">
                    Dán cấu hình dưới đây vào mục <strong>Realtime Database → Rules → Publish</strong> trên Firebase Console để khóa quyền ghi chỉ cho phép <strong>{{ currentUser?.email }}</strong> duyệt bài và bảo vệ thông tin người tố cáo.
                  </p>
                </div>
                <CopyButton :value="securityRulesJson" label="Chép toàn bộ Rules" />
              </div>
              <pre class="mono rules-card__code">{{ securityRulesJson }}</pre>
            </div>
          </div>
        </template>
      </div>
    </div>

    <LightboxModal
      :images="previewImages"
      :active-index="previewIdx"
      @close="previewIdx = -1"
      @change="(i) => (previewIdx = i)"
    />
  </section>
</template>

<style scoped>
.admin-page {
  min-height: calc(100svh - var(--nav));
}

.auth-card {
  max-width: 620px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-4);
  padding: var(--s-7);
}

.google-tile {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.auth-mismatch {
  width: 100%;
  padding: 14px 16px;
  border-radius: var(--r-md);
  background: var(--p-warn-bg);
  border: 1px solid var(--p-warn-line);
  color: var(--p-warn);
  font-size: var(--t-small);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-workspace {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.admin-topbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-4);
}

.admin-user-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-user-bar__email {
  font-size: var(--t-small);
  color: var(--p-muted);
}

.admin-toast {
  padding: 12px 16px;
  border-radius: var(--r-md);
  background: var(--p-verified-bg);
  border: 1px solid var(--p-verified-line);
  color: var(--p-verified);
  font-size: var(--t-small);
  font-weight: 500;
}

.admin-toast--error {
  background: var(--p-danger-bg);
  border-color: var(--p-danger-line);
  color: var(--p-danger);
}

.admin-editor {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.admin-editor__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
}

/* Tabs */
.admin-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border-bottom: 1px solid var(--p-line);
  padding-bottom: 10px;
}

.admin-tabs__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 16px;
  border-radius: var(--r-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--p-muted);
  font-size: var(--t-small);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 150ms var(--ease), color 150ms var(--ease);
}

.admin-tabs__btn:hover {
  color: var(--p-ink);
  background: var(--p-surface);
}

.admin-tabs__btn.is-active {
  background: var(--p-ink);
  color: var(--p-inv-ink);
}

.admin-tabs__count {
  padding: 2px 7px;
  border-radius: 3px;
  font-size: 12px;
  background: rgba(128, 140, 146, 0.2);
}

.admin-tabs__count.is-alert {
  background: var(--p-danger);
  color: #ffffff;
}

.admin-panel {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.admin-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--s-3);
}

.admin-toolbar__search {
  flex: 1;
  min-width: 260px;
  max-width: 520px;
}

.admin-empty {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Pending cards */
.pending-stack {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}

.pending-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  border-left: 3px solid var(--p-warn);
}

.pending-card__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  padding-bottom: var(--s-3);
  border-bottom: 1px solid var(--p-line);
}

.pending-card__badges {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pending-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.pending-card__scam {
  font-size: var(--t-small);
  color: var(--p-danger);
}

.pending-card__cols {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s-5);
}

.pending-card__col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pending-card__desc {
  font-size: var(--t-body);
  color: var(--p-text);
  white-space: pre-line;
}

.pending-card__photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  gap: var(--s-3);
}

.pending-card__thumb {
  padding: 0;
  aspect-ratio: 4 / 3;
  cursor: zoom-in;
}

.pending-card__links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: var(--t-small);
}

.pending-card__incidents {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.pending-card__incident {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-3);
  border: 1px solid var(--p-line);
  border-radius: var(--r-md);
  background: var(--p-surface);
}

.pending-card__reporter {
  padding: 10px 14px;
  border-radius: var(--r-sm);
  background: var(--p-surface);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: var(--t-small);
}

/* Admin rows */
.admin-table-card {
  padding: var(--s-4) var(--s-6);
}

.admin-row {
  flex-wrap: wrap;
}

.admin-row__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.admin-row__title-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-row__meta {
  font-size: 13px;
  color: var(--p-muted);
}

/* Security rules tab */
.rules-card {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
}

.rules-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-4);
}

.rules-card__head p {
  font-size: var(--t-small);
  margin-top: 4px;
  max-width: 68ch;
}

.rules-card__code {
  margin: 0;
  padding: var(--s-5);
  border-radius: var(--r-md);
  background: var(--p-inv-bg);
  color: var(--p-inv-ink);
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}

@media (max-width: 820px) {
  .pending-card__cols {
    grid-template-columns: 1fr;
  }
}
</style>
