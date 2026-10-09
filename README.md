# EduPortal

Hệ thống quản lý đào tạo, đăng ký học phần và theo dõi kết quả học tập cho ADMIN, LECTURER và STUDENT.

## Chức năng và nơi sử dụng

| Vai trò | Chức năng | Vị trí trên giao diện |
| --- | --- | --- |
| Admin | Quản lý tài khoản, hồ sơ, môn, học kỳ, đợt đăng ký và lớp | Menu quản lý đào tạo và hệ thống |
| Admin | Xem hồ sơ, GPA, điểm, tín chỉ; chuyển sang sửa hồ sơ | Sinh viên → nút mắt → Thông tin sinh viên / Điểm & tín chỉ |
| Admin | Nhập, khóa/mở khóa điểm và xuất bảng điểm lớp | Nhập & khóa điểm |
| Giảng viên | Nhập điểm và khóa điểm lớp phụ trách | Nhập & khóa điểm |
| Giảng viên | Xem kết quả toàn khóa của sinh viên thuộc lớp phụ trách, nhập thi lại ở lớp mình | Theo dõi sinh viên |
| Giảng viên | Xem lịch các lớp được phân công | Lịch giảng dạy |
| Sinh viên | Đăng ký/hủy lớp; xem lịch và kết quả | Đăng ký học phần / Thời khóa biểu / Kết quả & thi lại |
| Sinh viên | Đăng ký thi lại khi đủ điều kiện | Kết quả & thi lại → Đăng ký thi lại |

Admin nhập lịch thủ công khi **Lớp học phần → Mở lớp học phần mới**: thứ, tiết bắt đầu, số tiết, phòng và khoảng tuần. Hệ thống kiểm tra trùng phòng/lịch giảng viên rồi hiển thị thời khóa biểu theo các lớp sinh viên đã đăng ký. Chưa có thuật toán tự chọn giờ/phòng hoặc trang thời khóa biểu tổng hợp cho admin.

Thông tin chương trình đào tạo có API xem/tạo và được dùng trong hồ sơ, nhưng chưa có giao diện quản lý chương trình riêng hoặc bảng liên kết khung môn học theo chương trình.

## Công nghệ và cấu trúc

- Frontend: React, Vite, React Router, Bootstrap/React Bootstrap, Axios; CSS dùng chung tại `client/src/index.css`.
- Backend: Node.js, Express, MySQL/mysql2, bcryptjs, JWT và xlsx.
- `client/src/pages`: trang theo vai trò; `components`: giao diện dùng chung; `hooks/useAcademicReport.js`: tải bảng điểm, hủy request cũ và thử lại.
- `server/src/controllers`: nghiệp vụ API; `services`: giao dịch, lịch, GPA và tổng hợp lượt học; `middlewares`: phiên và quyền lớp.
- `database`: 14 bảng theo thứ tự khóa ngoại, seed mẫu; `server/migrations`: nâng cấp database đang sử dụng.
- `server/test`: kiểm thử API, nghiệp vụ, hợp đồng truy vấn SQL và triển khai.

## Chạy cục bộ

Dùng Node.js 22.12 trở lên và MySQL 8.0 trở lên nếu chạy chế độ MySQL. Cài dependency trong `client` và `server` bằng `npm ci`.

Backend:

```powershell
cd server
Copy-Item .env.example .env
# Sửa .env: DB_MODE=mock để demo hoặc DB_MODE=mysql cùng cấu hình database.
npm start
```

Frontend:

```powershell
cd client
npm run dev
```

Vite chuyển `/api` tới backend cổng 5000. Sau `npm run build` tại client, backend có thể phục vụ cả API và `client/dist` trên một cổng. Build frontend tự động chọn URL `/api`; có thể cấu hình `VITE_API_BASE_URL` khi cần.

Tài khoản mẫu có mật khẩu `123456`: `admin`, `gv_thuan`, `gv_nam`, `74dctt25001`–`74dctt25004`. Đây là dữ liệu demo. Nút đăng nhập nhanh chỉ hiện trong môi trường phát triển khi `VITE_ENABLE_DEMO_LOGIN=true`.

## Database mới và nâng cấp

- Database trống: cấu hình backend rồi chạy `npm run db:setup` trong `server`, hoặc nhập `database/tables.sql` trước `database/seed.sql`.
- Database có dữ liệu: sao lưu rồi chạy `npm run migrate` trong `server`. Không nhập lại seed/setup vào dữ liệu hiện có.
- Migration 003 thêm `resit_attempts`, lưu một lần thi lại theo lượt đăng ký, điểm ban đầu và người nhập kết quả.
- `DB_MODE=mock` dùng bộ nhớ và mất thay đổi khi khởi động lại. Bộ mock và seed SQL là hai bộ mẫu khác nhau; không dùng ảnh mock để chứng minh dữ liệu SQL đã được nhập hoặc mọi dữ liệu mẫu hợp lệ.

## Quy tắc nghiệp vụ

- Đăng ký kiểm tra lớp mở, sĩ số, đợt mở, trùng môn trong kỳ, tiên quyết, tín chỉ tối đa và trùng thứ/tiết/tuần. Mức tín chỉ tối thiểu chỉ là mục tiêu hiển thị.
- Đăng ký/hủy cập nhật sĩ số trong giao dịch. Hủy chỉ trong đợt mở và khi chưa có điểm hoặc khóa điểm.
- MySQL khóa các bản ghi cần thiết và thử lại deadlock/lock timeout tối đa ba lần. Mock xử lý ghi tuần tự và chỉ công bố snapshot khi thành công.
- Khóa điểm áp dụng cả lớp, kể cả lớp trống. Lớp khóa không nhận đăng ký mới. Lớp đã có điểm/khóa điểm không được hủy.
- Điểm tổng kết = 10% chuyên cần + 30% giữa kỳ + 60% cuối kỳ; làm tròn một chữ số thập phân. Thiếu thành phần thì tổng kết là NULL.
- GPA dùng điểm cao nhất mỗi môn, có trọng số tín chỉ. Tín chỉ đạt tính một lần cho môn có điểm tổng kết từ 4,0.

### Thi lại theo quy tắc của đồ án

Quy tắc này phục vụ đồ án, không phải quy chế chính thức của trường:

1. Có đủ ba điểm thành phần và tổng kết dưới 4,0; chưa có lần học tiếp theo/lần đạt khác → được đăng ký thi lại một lần cho mỗi lượt học.
2. Sinh viên đăng ký, hệ thống lưu yêu cầu `REQUESTED` và điểm ban đầu.
3. Admin hoặc giảng viên phụ trách nhập điểm 0–10; bảng điểm phải mở khóa. Giảng viên không nhập thi lại của lớp khác.
4. Giữ điểm cuối kỳ cao hơn giữa điểm ban đầu, điểm cuối kỳ hiện tại và điểm thi lại; tính lại tổng kết, chuyển yêu cầu thành `COMPLETED`. GPA/tín chỉ được tính từ kết quả cập nhật.
5. Sau thi lại vẫn dưới 4,0 thì hướng dẫn đăng ký học lại ở học kỳ khác; vẫn phải đáp ứng các điều kiện đăng ký thông thường.

Kết quả thi lại lưu điểm cuối kỳ/tổng kết ban đầu, điểm thi lại, thời gian yêu cầu, người nhập và thời gian nhập. API thi lại không cho nhập lần hai. Chưa có xếp lịch thi, lệ phí hoặc quy trình phê duyệt thi lại riêng.

## Kiểm tra

```powershell
# server
npm test
# client
npm run lint
npm run build
```

Bộ backend có 48 kiểm thử. Các kiểm thử MySQL dùng kết nối giả lập để kiểm tra hợp đồng truy vấn; không thay thế kiểm thử trên MySQL thực hoặc kiểm thử tải. Mọi thay đổi chức năng cần chạy lại các kiểm tra phù hợp.

## Triển khai

Backend production/Vercel yêu cầu MySQL, JWT_SECRET riêng ít nhất 32 ký tự, TLS và xác minh chứng chỉ. Lỗi cấu hình/kết nối không được thay bằng dữ liệu mock.

Dùng `DATABASE_URL` hoặc `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; URL được ưu tiên. Tài khoản/mật khẩu trong URL cần percent-encode, không thêm query options. Đặt `DB_MODE=mysql`, `USE_MOCK_IF_NO_DB=false`, `DB_SSL=true`; có thể đặt `DB_CONNECTION_LIMIT=2` cho mỗi instance Vercel. CA riêng dùng `DB_SSL_CA` hoặc `DB_SSL_CA_PATH`.

Thông tin DB chỉ đặt ở backend, không đặt trong `VITE_*`. Chạy migration trên database trước khi dùng bản có thi lại. Pool được dùng chung cho các request khởi động đồng thời; API trả 503 nếu khởi tạo thất bại.

`.env`, `node_modules`, `dist`, log và dữ liệu kiểm tra cục bộ không được commit. Các migration, schema, seed, lockfile, test và hướng dẫn là thành phần cần lưu trong repository.
