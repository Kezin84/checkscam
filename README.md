# CheckGD — Cổng tra cứu Shop Việt tại Philippines & Cảnh báo lừa đảo

Ứng dụng **Vue 3 + Vite + Firebase Realtime Database + Cloudinary** phục vụ cộng đồng người Việt tại Philippines tra cứu nhanh thông tin Shop Việt đã xác minh, đối chiếu số tài khoản ngân hàng / ví GCash, liên kết mạng xã hội (Telegram, Facebook, Zalo, TikTok...) và hồ sơ cảnh báo lừa đảo.

## Chạy dự án tại máy

```bash
npm install
npm run dev
```

Build bản triển khai thực tế:

```bash
npm run build
```

## Cấu trúc dữ liệu Firebase Realtime Database

- `scam_reports`: Các hồ sơ cảnh báo lừa đảo đã được Admin kiểm duyệt (công khai, tải phân trang theo `orderByKey`).
- `trusted_shops`: Danh sách các Shop & Trung gian gắn nhãn **Đã xác minh** (công khai, tải phân trang theo `orderByKey`).
- `lookup_index`, `cat_index`, `plat_index`, `site_meta`: Hệ thống chỉ mục tra cứu đảo (Inverted Index) và thống kê gọn nhẹ giúp truy vấn trực tiếp trên server khi nhấn **Kiểm tra** mà không cần tải toàn bộ DB về máy.
- `pending_reports`: Đơn tố cáo do người dùng gửi lên chờ Admin duyệt (ẩn hoàn toàn với người ngoài).
- `reporter_archive`: Lưu trữ riêng thông tin liên hệ người gửi đơn sau khi duyệt (chỉ Admin đọc được).

## Thiết lập bảo mật Firebase Console & Đường dẫn ẩn Admin

- Trang quản trị đã được ẩn hoàn toàn khỏi thanh điều hướng và chân trang công khai. Truy cập trực tiếp bằng đường dẫn riêng: `/admin` (ví dụ `http://127.0.0.1:5173/admin`).
1. **Authentication**: Vào *Build → Authentication → Sign-in method → Google*, bật **Enable** và bấm **Save** để đăng nhập trang `/admin` bằng email `quangdang080420022@gmail.com`.
2. **Realtime Database Rules**: Mở tệp `database.rules.json` (hoặc vào mục *Bảo mật Database* ngay trong trang `/admin`), sao chép toàn bộ nội dung dán vào *Realtime Database → Rules → Publish*.
