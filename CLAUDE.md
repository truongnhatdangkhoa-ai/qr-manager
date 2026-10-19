# CLAUDE.md — Quy ước làm việc cho dự án QR Manager

## 1. Quy ước phiên bản (BẮT BUỘC)
- **Nguồn duy nhất** của số phiên bản phần web: `web/js/version.js` → `self.APP_VERSION="X.Y.Z"`.
- **Mỗi lần sửa BẤT KỲ file nào trong `web/`** (css, js, html, sw.js, icon…) phải **tăng số cuối (Z) thêm đúng 1** trong `version.js`, ví dụ `1.1.3` → `1.1.4`. Sửa nhiều file trong cùng một lượt giao = vẫn chỉ tăng 1.
- Chỉ đổi `X` hoặc `Y` khi người dùng yêu cầu (tính năng lớn / bản phát hành mới).
- Không sửa `web/` mà quên tăng số. Khi trả file cho người dùng, luôn báo rõ: "Phiên bản: A → B".
- Số này hiện trong app ở **Cài đặt → Giới thiệu → Phiên bản**, để biết điện thoại đang chạy bản nào.
- `sw.js` lấy tên bộ nhớ đệm từ số này (`qr-manager-<phiên bản>`), nên **đổi số = app tự nhận bản mới** (tự tải lại một lần). Vì vậy không sửa tên cache trong `sw.js` bằng tay.
- Không dùng `web/version.json` nữa (đã bỏ; workflow Pages không còn ghi đè số phiên bản).
- Số phiên bản **native** (versionName/versionCode của APK/AAB) do workflow Bước 2A/2B tự đặt theo `run_number`; không liên quan tới số ở trên.

## 2. Cách cập nhật app bản test (APK "QR Manager (Test)")
1. Sửa trong `web/` + tăng `version.js`.
2. Upload/commit lên nhánh `main` (đúng cấp: thư mục `web/` nằm ở gốc repo). Workflow "Cập nhật nội dung app (GitHub Pages)" chạy khi có thay đổi trong `web/**`.
3. Chờ Actions xanh (~20 giây), rồi mở app: app tự lấy bản mới và tải lại một lần. Kiểm tra số ở Cài đặt → Giới thiệu.
- Chỉ bản **Test** (Bước 2B) tự cập nhật từ GitHub Pages. Bản **AAB/Google Play** (Bước 2A) có web nằm trong app: phải build lại và đưa AAB mới lên Play.
- Chỉ build lại APK khi đổi icon, tên app hoặc phần native (quyền, in) — xem `scripts/patch-android.js`.

## 3. Quy ước chung khi sửa mã
- Mã nguồn, chú thích, giao diện viết bằng **tiếng Việt**; bản English do `web/js/i18n.js` dịch khi hiển thị. Thêm chữ mới → thêm một dòng vào từ điển trong `i18n.js`.
- Giao diện mobile-first: vùng chạm ≥ 48px, chữ nhập 16px. **Không** đặt `overflow-x:hidden` đồng thời trên `html` và `body`, không dùng `overscroll-behavior-y:none` trên `body`, không lồng khung cuộn dọc trên mobile (gây lỗi không vuốt cuộn được trong WebView Android).
- Dữ liệu người dùng chỉ lưu trên máy (localStorage); không gửi đi đâu.

## 4. Nhật ký thay đổi (thêm dòng mới ở TRÊN CÙNG mỗi lần tăng số)
- 1.1.4 — Bỏ link Chính sách ngoài màn hình chính (chỉ còn trong Cài đặt); thẻ Xem trước rộng đủ chiều ngang trên mobile (`align-items:stretch`); `privacy.html` có nút "← Quay lại" (về `./`) và nút Back/vuốt Back của Android cũng quay về app.
- 1.1.3 — Thêm hiển thị số phiên bản (Cài đặt → Giới thiệu); `sw.js` lấy tên cache từ `version.js`; bỏ `version.json`; thêm CLAUDE.md.
- 1.1.2 — Sửa tự cập nhật: `sw.js` dùng `cache:'no-cache'` (bỏ đệm HTTP 10 phút của GitHub Pages); tự tải lại khi có bản mới.
- 1.1.1 — Sửa lỗi không vuốt cuộn dọc được: bỏ `overflow-x:hidden` kép trên `html`/`body` và `overscroll-behavior-y:none`; `.p3-preview` trên mobile không còn khung cuộn dọc lồng.
- 1.1.0 — Bản gốc (giao diện mobile, quét mã, Cài đặt Sáng/Tối, Việt/English).
