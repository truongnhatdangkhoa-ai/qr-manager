# QR Manager — App Android (APK + AAB) build bằng GitHub

## Thiết lập 1 lần
1. Tạo repo mới trên GitHub, upload toàn bộ thư mục này (giữ nguyên thư mục `.github/`), nhánh `main`.
2. **Settings → Pages → Source: GitHub Actions.** Sau đó vào tab Actions chạy "Cập nhật nội dung app" (hoặc push 1 commit). Địa chỉ app sẽ là `https://<tên-github>.github.io/<tên-repo>/`.
3. **Actions → "Bước 1: Tạo khóa ký app" → Run workflow.** Tải artifact `khoa-ky-app-GIU-BI-MAT`, rồi vào **Settings → Secrets and variables → Actions** tạo 4 secret:
   `KEYSTORE_BASE64` (nội dung KEYSTORE_BASE64.txt), `KEYSTORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS` (xem secrets.txt).
   **Lưu file release.jks ở nơi an toàn** — mất khóa thì không cập nhật được app trên Google Play.
4. Có **hai workflow build riêng** (tab Actions):
   - **"Bước 2A: Build AAB cho Google Play"** → tải `QRManager.aab` ở mục Artifacts để đưa lên Google Play. Web nằm trong app, chạy offline, không đọc gì từ GitHub. Mỗi lần có nội dung mới phải build lại và tải AAB mới lên Play. Cần đã làm Bước 1 (khóa ký). Đẩy tag `v1.1.0` thì file còn được đăng ở mục Releases.
   - **"Bước 2B: Build APK test (tự cập nhật từ GitHub)"** → tải `QRManager-test.apk` cài lên điện thoại để thử. App mở nội dung từ GitHub Pages: sửa `web/` rồi push lên `main` là điện thoại tự nhận bản mới, **không cần build lại**. Mã app của bản này là `com.tndk.qrmanager.test` và tên "QR Manager (Test)", nên cài song song được với bản Google Play. Chỉ build lại khi đổi icon, tên app hoặc phần native (quyền, in).

Bản test cần mạng và cần Pages đã chạy (bước 2). Không dùng bản test để đưa lên Google Play.

Xem `PLAY-CHECKLIST.md` để đưa app lên Google Play.

## Số phiên bản
Xem **CLAUDE.md**: số phiên bản nằm ở `web/js/version.js`, hiện trong app ở Cài đặt → Giới thiệu; mỗi lần sửa file trong `web/` phải tăng số cuối thêm 1.

## Đổi icon
Thay `assets/icon-only.png`, `icon-foreground.png`, `icon-background.png` (1024×1024) rồi chạy lại Bước 2A (và 2B nếu muốn). Icon bản web nằm ở `web/icons/`.

## Giao diện mobile & quét mã (từ bản 1.1.0)
- Thanh điều hướng dưới: Tạo mã · Hàng loạt · In tem · Lịch sử; **nút Quét mã nằm giữa**, mở màn quét toàn màn hình. Kết quả hiện ở khay trượt từ dưới lên; nút Back của Android đóng khay/màn quét. Lịch sử quét nằm ở Lịch sử → Đã quét.
- **Cài đặt** (nút ở góc phải thanh tiêu đề): giao diện Theo hệ thống / Sáng / Tối; ngôn ngữ **Tiếng Việt / English** (mặc định theo ngôn ngữ điện thoại, lưu lại cho lần sau).
- Mã nguồn viết bằng tiếng Việt; bản English do `web/js/i18n.js` dịch khi hiển thị (từ điển + quy tắc). Thêm chữ mới: thêm một dòng vào từ điển trong `i18n.js`. Dữ liệu người dùng (nội dung mã, tên sản phẩm) không bị dịch.
- Quét QR, Data Matrix, Aztec, PDF417, EAN-13/8, UPC-A/E, Code 128/39/93, ITF, Codabar bằng camera sau/trước, bật đèn, hoặc quét từ ảnh trong máy. Chạy offline.
- Tự nhận diện nội dung như Zalo: liên kết (cảnh báo link lạ/rút gọn), Wi-Fi, danh bạ (lưu .vcf), email, SMS, điện thoại (gọi / Zalo), vị trí, lịch (.ics), **VietQR chuyển khoản** (ngân hàng, số tài khoản, số tiền, nội dung, kiểm tra CRC), mã vạch sản phẩm / ISBN (kiểm tra số cuối, tiền tố GS1), văn bản thường.
- Lưu 50 mã quét gần nhất trong máy (localStorage).
- **Cần build lại APK/AAB** (chạy lại Bước 2A/2B) vì `scripts/patch-android.js` thêm quyền CAMERA vào AndroidManifest.
- Thư viện nhúng sẵn trong `web/js/`: jsQR (Apache-2.0) và ZXing (MIT).

## Ghi chú
- Tải ảnh/ZIP/Excel trong app: file được lưu rồi mở hộp thoại Chia sẻ của Android (chọn "Lưu vào Tệp").
- In tem: dùng hộp thoại in của Android (có thể "Lưu thành PDF").
- Chưa có secrets thì Bước 2B build APK debug để thử; Bước 2A cần khóa ký nên sẽ báo lỗi.
