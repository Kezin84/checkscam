<script setup>
import { ref } from 'vue'
import ScamReportForm from '@/components/ScamReportForm.vue'
import { submitUserPendingReport } from '@/services/repository'

const submitting = ref(false)
const submittedId = ref('')
const submitError = ref('')
const formResetKey = ref(0)

async function handleCreateReport(payload) {
  submitting.value = true
  submitError.value = ''
  try {
    const id = await submitUserPendingReport(payload)
    submittedId.value = id || 'OK'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (err) {
    submitError.value =
      err?.message || 'Không thể gửi đơn tố cáo lúc này. Vui lòng kiểm tra kết nối mạng và thử lại.'
  } finally {
    submitting.value = false
  }
}

function sendAnother() {
  submittedId.value = ''
  submitError.value = ''
  formResetKey.value += 1
}
</script>

<template>
  <section class="section report-page">
    <div class="wrap report-page__wrap">
      <div class="report-page__head">
        <span class="label">Báo cáo cộng đồng</span>
        <h1>Gửi hồ sơ tố cáo lừa đảo</h1>
        <p class="muted measure">
          Điền chính xác số tài khoản nhận tiền, liên kết mạng xã hội và tải lên ảnh chụp màn hình biên lai hoặc tin nhắn. Hồ sơ của bạn sẽ được quản trị viên kiểm duyệt trước khi hiển thị công khai.
        </p>
      </div>

      <!-- Confirmation after real Firebase RTDB write -->
      <div v-if="submittedId" class="card confirmation-card" role="status">
        <span class="stamp stamp--verified">Đã ghi nhận vào hàng chờ duyệt</span>
        <h2>Hồ sơ tố cáo của bạn đã được gửi thành công.</h2>
        <p class="muted measure">
          Mã tiếp nhận: <strong class="mono">{{ submittedId }}</strong>. Quản trị viên sẽ đối chiếu ảnh bằng chứng và kích hoạt cảnh báo công khai để bảo vệ người dùng khác.
        </p>
        <div class="btn-row">
          <RouterLink to="/" class="btn btn--primary">Quay về trang tra cứu</RouterLink>
          <button type="button" class="btn btn--secondary" @click="sendAnother">
            Gửi thêm hồ sơ khác
          </button>
        </div>
      </div>

      <template v-else>
        <div v-if="submitError" class="error-banner" role="alert">
          {{ submitError }}
        </div>

        <ScamReportForm
          :key="formResetKey"
          mode="public"
          :submitting="submitting"
          submit-label="Gửi hồ sơ chờ kiểm duyệt"
          @submit="handleCreateReport"
        />
      </template>
    </div>
  </section>
</template>

<style scoped>
.report-page {
  min-height: calc(100svh - var(--nav));
}

.report-page__wrap {
  max-width: 920px;
}

.report-page__head {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  margin-bottom: var(--s-6);
}

.confirmation-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-4);
  padding: var(--s-7);
}

.error-banner {
  padding: 14px 18px;
  border-radius: var(--r-md);
  background: var(--p-danger-bg);
  border: 1px solid var(--p-danger-line);
  color: var(--p-danger);
  font-size: var(--t-small);
  font-weight: 500;
  margin-bottom: var(--s-5);
}
</style>
