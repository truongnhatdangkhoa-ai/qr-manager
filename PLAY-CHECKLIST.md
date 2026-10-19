# Checklist đưa "QR Manager" lên Google Play

## Trước khi build
- [ ] Mã định danh app là `com.tndk.qrmanager` (trong `capacitor.config.template.json`). Mã này phải **duy nhất trên toàn Google Play** và **không đổi được sau khi đã đăng**. Nếu Play báo đã có người dùng, đổi `appId` ở file đó (chỉ một chỗ) trước khi tải bản đầu tiên lên.
- [x] Email liên hệ trong `web/privacy.html` đã điền (truongnhatdangkhoa@gmail.com). Push lên `main` (workflow Pages sẽ đăng trang).
- [ ] Settings → Pages → Source: GitHub Actions. Địa chỉ chính sách: `https://<tên-github>.github.io/<tên-repo>/privacy.html`
- [ ] Làm "Bước 1" (tạo khóa ký) và lưu 4 secrets. **Giữ file release.jks ở nơi an toàn** (workflow chỉ giữ 3 ngày).
- [ ] Chạy **"Bước 2A: Build AAB cho Google Play"** (web đóng gói sẵn trong app) và tải `QRManager.aab`. Còn **"Bước 2B"** chỉ để build APK test tự cập nhật từ GitHub (mã app `.test`, không đưa lên Play).
- [ ] Mỗi lần upload bản mới, versionCode tự tăng theo số lần chạy workflow.

## Đã được xử lý trong code
- targetSdk/compileSdk **36** (Capacitor 8; bắt buộc từ 31/08/2026) — script patch sẽ báo lỗi nếu thấp hơn 36.
- Quyền camera (`CAMERA`, `required=false` nên máy không có camera vẫn cài được) và `VIBRATE`.
- Web đóng gói trong app, chạy offline ngay lần mở đầu tiên; không gọi mạng nào.
- Chặn mở `javascript:`, `data:`, `file:`, `intent:`… từ mã QR.

## Play Console — khai báo
- **Chính sách quyền riêng tư:** dán link `privacy.html` ở trên.
- **Data safety (An toàn dữ liệu):** "Không thu thập dữ liệu" và "Không chia sẻ dữ liệu" (app không gửi gì ra ngoài). Dữ liệu chỉ nằm trên máy.
- **Quyền camera:** mục đích "quét mã QR/mã vạch", xử lý trên máy, không lưu/gửi.
- **Quảng cáo:** Không (bản hiện tại chưa có quảng cáo). Chính sách riêng tư đã viết sẵn mục “Quảng cáo” cho AdMob. Khi thêm SDK quảng cáo: đổi sang “Có”, cập nhật Data safety (Advertising ID, thu thập + chia sẻ), thêm form đồng ý EU (UMP) và quyền `com.google.android.gms.permission.AD_ID`, sửa lại mục “Phiên bản hiện tại” trong privacy.html. **Ứng dụng cần đăng nhập:** Không.
- **Phân loại nội dung:** Tiện ích; không có nội dung nhạy cảm. **Đối tượng:** từ 18+ hoặc "không nhắm đến trẻ em".
- **Danh mục:** Công cụ (Tools) hoặc Năng suất (Productivity).
- **Ảnh chụp màn hình:** tối thiểu 2 ảnh điện thoại. Bộ 6 ảnh 1080×2160 làm sẵn: `play-screenshots/` (tiếng Việt) và `play-screenshots-en/` (English) — dùng cho phần mô tả cửa hàng tương ứng (chụp từ bản web; nên chụp lại vài ảnh trên máy thật sau khi cài APK để chắc khớp). Icon 512×512 và ảnh bìa 1024×500 chuẩn bị riêng.
- **Tài khoản cá nhân mới tạo sau 11/2023:** phải chạy kiểm thử kín với ít nhất 12 người trong 14 ngày liên tục trước khi xin lên bản chính thức.

## Thử trước khi gửi
- Cài `QRManager-test.apk` (Bước 2B) lên điện thoại thật; trước khi gửi Play, nên thử kỹ cả bản 2A bằng cách cho 12 người thử kín: bật tab Quét mã, cấp quyền camera, quét thử QR, mã vạch sản phẩm, VietQR.
- Thử tải PNG/ZIP và in tem để chắc hộp thoại Chia sẻ/In hoạt động.

## Đa ngôn ngữ
- App có Tiếng Việt và English (Cài đặt → Ngôn ngữ). Trên Play Console, nếu muốn hiện cả hai thứ tiếng ở trang cửa hàng, thêm bản dịch "English (United States)" cho tên, mô tả ngắn/dài và ảnh chụp màn hình.
- Trang chính sách riêng tư tự chọn ngôn ngữ và có nút chuyển Tiếng Việt / English.
