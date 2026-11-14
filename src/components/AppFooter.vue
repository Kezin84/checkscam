<script setup>
const year = new Date().getFullYear()
</script>

<template>
  <footer class="closing">
    <div class="wrap closing__inner">
      <div class="closing__top">
        <div class="closing__statement">
          <h2 class="closing__heading">
            Đối chiếu số tài khoản trước mỗi lần bấm chuyển tiền.
          </h2>
          <p class="closing__sub">
            Phát hiện tài khoản nhận tiền có dấu hiệu lừa đảo hoặc mạo danh shop? Gửi bằng chứng để cảnh báo cộng đồng sau khi quản trị viên kiểm duyệt.
          </p>
        </div>
        <div class="closing__cta">
          <RouterLink to="/report" class="btn btn--primary">
            <span>Gửi hồ sơ tố cáo</span>
            <svg class="m-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
            </svg>
          </RouterLink>
        </div>
      </div>

      <div class="closing__directory">
        <div class="closing__brand-col">
          <div class="closing__logo">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
              <rect width="24" height="24" rx="4" fill="#f7f9fa" />
              <path d="M6.8 12.2L10.3 15.7L17.4 8.6" stroke="#18252b" stroke-width="2.1" stroke-linecap="square" />
            </svg>
            <span>CheckGD</span>
          </div>
          <p class="closing__note">
            Cổng tra cứu số tài khoản ngân hàng, liên kết mạng xã hội và danh bạ shop đã xác minh phục vụ giao dịch trực tuyến an toàn.
          </p>
        </div>

        <div class="closing__cols">
          <div class="closing__col">
            <h3>Tra cứu</h3>
            <RouterLink to="/">Kiểm tra số tài khoản</RouterLink>
            <RouterLink to="/shops">Shop đã xác minh</RouterLink>
            <RouterLink to="/alerts">Hồ sơ cảnh báo</RouterLink>
          </div>
          <div class="closing__col">
            <h3>Cộng đồng bảo vệ</h3>
            <RouterLink to="/report">Gửi đơn tố cáo lừa đảo</RouterLink>
            <RouterLink to="/alerts">Cảnh báo mới cập nhật</RouterLink>
          </div>
          <div class="closing__col">
            <h3>Liên hệ</h3>
            <a
              href="https://t.me/dakv88"
              target="_blank"
              rel="noopener noreferrer"
              class="closing__tele"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="11.5" fill="#FFFFFF" />
                <path
                  fill="#24A1DE"
                  d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
                />
              </svg>
              <span>Telegram: <strong class="mono">@dakv88</strong></span>
            </a>
            <a
              href="https://t.me/dakv88"
              target="_blank"
              rel="noopener noreferrer"
              class="mono closing__tele-url"
            >
              t.me/dakv88
            </a>
            <span class="closing__col-hint">Hỗ trợ xác minh shop & phản hồi hồ sơ.</span>
          </div>
        </div>
      </div>

      <div class="closing__legal">
        <span>© {{ year }} CheckGD. Dữ liệu tố cáo được kiểm duyệt trước khi hiển thị công khai.</span>
        <span>Tên và biểu trưng ngân hàng, mạng xã hội thuộc quyền sở hữu của đơn vị chủ quản.</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.closing {
  background: var(--p-inv-bg);
  color: var(--p-inv-ink);
  padding-top: var(--padt);
  padding-bottom: var(--s-7);
}

.closing__inner {
  display: flex;
  flex-direction: column;
  gap: var(--s-8);
}

.closing__top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--s-6);
  padding-bottom: var(--s-7);
  border-bottom: 1px solid var(--p-inv-line);
}

.closing__statement {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.closing__heading {
  color: var(--p-inv-ink);
  font-size: var(--t-h2);
}

.closing__sub {
  color: var(--p-inv-muted);
  font-size: var(--t-body);
}

.closing__directory {
  display: grid;
  grid-template-columns: 5fr 7fr;
  gap: var(--s-7);
}

.closing__brand-col {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  max-width: 420px;
}

.closing__logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.closing__note {
  font-size: var(--t-small);
  color: var(--p-inv-muted);
  line-height: 1.6;
}

.closing__cols {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--s-6);
}

.closing__col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.closing__col h3 {
  font-size: var(--t-small);
  font-weight: 500;
  color: var(--p-inv-ink);
  margin-bottom: 4px;
}

.closing__col a {
  font-size: var(--t-small);
  color: var(--p-inv-muted);
  width: fit-content;
  transition: color 140ms var(--ease);
}

.closing__col a:hover {
  color: var(--p-inv-ink);
}

.closing__tele {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.closing__tele strong {
  color: var(--p-inv-ink);
  font-weight: 500;
}

.closing__tele-url {
  font-size: 13px !important;
}

.closing__col-hint {
  font-size: 13px;
  color: var(--p-inv-muted);
  line-height: 1.5;
}

.closing__legal {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--s-3);
  padding-top: var(--s-5);
  border-top: 1px solid var(--p-inv-line);
  font-size: var(--t-label);
  color: var(--p-inv-muted);
}

@media (max-width: 960px) {
  .closing {
    padding-bottom: calc(var(--s-7) + 84px + env(safe-area-inset-bottom, 0px));
  }
}

@media (max-width: 900px) {
  .closing__top {
    flex-direction: column;
    align-items: flex-start;
  }
  .closing__directory {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .closing__cols {
    grid-template-columns: 1fr;
    gap: var(--s-5);
  }
}
</style>
