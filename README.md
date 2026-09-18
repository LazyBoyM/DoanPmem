# HỆ THỐNG QUẢN LÝ ĐÀO TẠO VÀ ĐĂNG KÝ HỌC PHẦN (EDUPORTAL)

Hệ thống Web ứng dụng công nghệ hiện đại phục vụ công tác quản lý đào tạo, phân quyền người dùng, mở lớp học phần, đăng ký tín chỉ trực tuyến, tính điểm GPA/CPA và thống kê báo cáo theo quy chế tín chỉ đại học.

---

## 🌟 Công Nghệ Sử Dụng (Tech Stack)

### Frontend (Client)
- **Framework & Core:** React 19, Vite, React Router DOM v7
- **Giao diện & Styling:** Bootstrap 5, Bootstrap Icons, Vanilla CSS Design System (Glassmorphism, Dark/Light palettes, Micro-animations)
- **HTTP Client:** Axios với Request/Response Interceptors tự động đính kèm JWT Token
- **Linter & Code Quality:** Oxlint

### Backend (Server)
- **Nền tảng:** Node.js, Express.js
- **Xác thực & Bảo mật:** JSON Web Token (JWT), Bcrypt password hashing, CORS
- **Cơ sở dữ liệu:** MySQL (kết nối qua `mysql2/promise`), hỗ trợ tự động chuyển sang chế độ In-Memory Mock Database nếu chưa cài MySQL.
- **Báo cáo & Xuất dữ liệu:** Thư viện `xlsx` xuất báo cáo bảng điểm và danh sách sinh viên chuẩn Excel.

---

## 📋 12 Chức Năng Cốt Lõi Của Hệ Thống

1. **Quản lý tài khoản & Phân quyền:** Phân quyền 3 vai trò (ADMIN, LECTURER, STUDENT). Ẩn tài khoản Admin, chặn Admin tự khóa tài khoản của chính mình.
2. **Quản lý sinh viên & giảng viên:** Quản lý hồ sơ, lớp sinh hoạt, học vị, khoa/bộ môn, cấp lại mật khẩu.
3. **Quản lý môn học:** Cấu hình số tín chỉ, tiết lý thuyết, tiết thực hành và điều kiện môn học tiên quyết (Prerequisites).
4. **Quản lý chương trình đào tạo:** Khung chương trình theo ngành đào tạo, tổng số tín chỉ tích lũy (135 TC), thời gian đào tạo.
5. **Quản lý năm học, học kỳ & đợt đăng ký:** Bật/Tắt công tắc đóng/mở cổng đăng ký học phần, thiết lập hạn mức tín chỉ tối thiểu (Min) và tối đa (Max).
6. **Mở và quản lý lớp học phần:** Mở lớp HP, phân công giảng viên, giới hạn sĩ số, theo dõi số lượng sinh viên đã đăng ký.
7. **Sinh viên đăng ký / hủy học phần:** Giao diện trực quan chọn lớp học phần và hủy học phần trong thời gian mở cổng.
8. **Kiểm tra trùng lịch & Giới hạn tín chỉ:** Thuật toán kiểm tra xung đột thời gian (thứ trong tuần, tiết học) và chặn vượt số tín chỉ quy định trong một học kỳ.
9. **Giảng viên nhập điểm & Khóa điểm:** Nhập điểm Chuyên cần (10%), Giữa kỳ (30%), Cuối kỳ (60%), tự động quy đổi sang thang điểm 10, thang điểm 4 và điểm chữ (A, B+, B, C+, C, D+, D, F), chức năng khóa điểm.
10. **Sinh viên tra cứu kết quả học tập:** Bảng điểm chi tiết từng học kỳ và điểm trung bình tích lũy GPA.
11. **Thời khóa biểu ma trận tuần:** Hiển thị thời khóa biểu dạng lưới 12 tiết từ Thứ 2 đến Chủ nhật cho cả Giảng viên và Sinh viên.
12. **Thống kê, xuất danh sách & báo cáo:** Biểu đồ phân bổ phổ điểm toàn trường, xuất file Excel danh sách sinh viên và bảng điểm lớp học phần.

---

## 🚀 Hướng Dẫn Cài Đặt Và Khởi Chạy

### 1. Yêu cầu môi trường
- **Node.js:** phiên bản 22.12+ (đã kiểm tra trên Node 26).
- **MySQL:** phiên bản 8.0+ (Tùy chọn: nếu máy chưa cài MySQL, hệ thống sẽ tự động dùng Mock DB có sẵn đầy đủ dữ liệu demo).

### 2. Cài đặt CSDL (Nếu dùng MySQL)
- Mở MySQL Workbench / phpMyAdmin, tạo CSDL và import file:
  ```bash
  schema.sql
  ```

### 3. Cài đặt & Khởi chạy Backend Server
```bash
cd server
npm install
npm start
```
*Backend sẽ lắng nghe tại: `http://localhost:5000`*

### 4. Cài đặt & Khởi chạy Frontend Client
```bash
cd client
npm install
npm run dev
```
*Frontend sẽ chạy tại: `http://localhost:5173`*

---

## 🔑 Tài Khoản Thử Nghiệm (Demo Accounts)

| Phân quyền | Tên đăng nhập | Mật khẩu mặc định | Ghi chú |
| :--- | :--- | :---: | :--- |
| **Quản trị viên (Admin)** | `admin` | `123456` | Toàn quyền quản trị hệ thống |
| **Giảng viên** | `gv_thuan` | `123456` | ThS. Phạm Thị Thuận (Khoa CNTT) |
| **Giảng viên** | `gv_nam` | `123456` | TS. Nguyễn Văn Nam (Khoa CNTT) |
| **Sinh viên** | `74dctt25001` | `123456` | Lê Văn Hiệp (Lớp 2DCTT745) |
| **Sinh viên** | `74dctt25002` | `123456` | Bùi Đức Huy (Lớp 2DCTT745) |

*Đăng nhập nhanh chỉ bật trong môi trường phát triển khi client đặt `VITE_ENABLE_DEMO_LOGIN=true`; bản production luôn ẩn.*


## Cấu hình và nâng cấp database

Sao chép `server/.env.example` thành `server/.env`, điền thông tin MySQL. Database mới import `schema.sql`. Database đang dùng schema cũ cần sao lưu và chạy trong thư mục `server`:

```bash
npm run migrate
```

Migration 001 chỉ sửa hash mẫu cũ; migration 002 bổ sung khóa điểm cấp lớp và chuẩn hóa một học kỳ đang hoạt động. Script ghi nhận migration đã chạy, không thay mật khẩu riêng. Không import lại toàn bộ schema vào database đang có dữ liệu.

Dùng `DB_MODE=mock` cho demo cục bộ; dữ liệu mock mất khi khởi động lại. Dùng `DB_MODE=mysql` để buộc kết nối MySQL. Production phải đặt `NODE_ENV=production`, JWT_SECRET riêng tối thiểu 32 ký tự và dùng MySQL; lỗi kết nối sẽ dừng khởi động, không chuyển sang mock.

Frontend mặc định gọi `/api`, Vite proxy đến backend cổng 5000. Có thể cấu hình `VITE_API_BASE_URL` trong `client/.env` trước khi build nếu API ở địa chỉ khác. Chạy `npm run build` trong `client`, sau đó `npm start` trong `server`: Express phục vụ `client/dist` và hỗ trợ tải lại URL của SPA.

## Quy tắc nghiệp vụ đã thống nhất

- Học kỳ được chọn chung trên giao diện; thời hạn và giới hạn tín chỉ lấy từ đợt đăng ký. Mức tối thiểu dùng để hiển thị mục tiêu; mức tối đa chặn đăng ký vượt giới hạn.
- Hủy đăng ký chỉ trong đợt mở, khi chưa có điểm hoặc khóa điểm. Đăng ký/hủy cập nhật sĩ số trong transaction.
- Khóa điểm áp dụng cả lớp, kể cả lớp trống; lớp đã khóa không nhận đăng ký mới.
- Lịch kiểm tra cả thứ, tiết và khoảng tuần; không cho trùng phòng hoặc giảng viên trong cùng học kỳ.
- GPA tích lũy chọn điểm cao nhất mỗi môn, chỉ tính tín chỉ đạt một lần; tổng tín chỉ yêu cầu lấy từ chương trình đào tạo.
- Hủy lớp là trạng thái cuối, không áp dụng cho lớp đã có điểm/khóa điểm; các đăng ký và lịch liên quan được xử lý cùng transaction.
- Tạo tài khoản sinh viên/giảng viên thông qua hồ sơ tương ứng. Tài khoản cũ chưa có hồ sơ có thể liên kết bằng mã trùng tên đăng nhập và đúng vai trò.

## Kiểm tra

Trong `server`: `npm test`. Trong `client`: `npm run lint` và `npm run build`.
Chi tiết phạm vi đã kiểm chứng và giới hạn MySQL thật nằm trong `INTEGRATION_AUDIT.md`.


### Database cloud và Vercel

Cấu hình biến môi trường của backend trên Vercel:

```dotenv
DB_MODE=mysql
USE_MOCK_IF_NO_DB=false
DB_SSL=true
DB_CONNECTION_LIMIT=2
```

Đặt `JWT_SECRET` riêng ít nhất 32 ký tự và `DATABASE_URL` theo thông tin nhà cung cấp, hoặc dùng bộ `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. Khi có cả hai, URL được ưu tiên; ký tự đặc biệt trong username/password của URL phải được percent-encode. Không thêm query options vào URL; dùng các biến `DB_*` để cấu hình.

Backend và `npm run migrate` dùng chung cấu hình kết nối, SSL và múi giờ. Nếu dịch vụ cấp CA riêng, đặt nội dung PEM trong `DB_SSL_CA` hoặc đường dẫn file trong `DB_SSL_CA_PATH`. Production/Vercel bắt buộc TLS và xác minh chứng chỉ; không tắt xác minh để né lỗi kết nối. Không đưa thông tin DB vào biến frontend `VITE_*`.

API trả HTTP 503 khi khởi tạo DB/cấu hình production thất bại, không phục vụ dữ liệu mock. Các request khởi động đồng thời dùng chung một lần tạo pool; pool khởi tạo lỗi được đóng để lần sau thử lại. Giới hạn 2 kết nối là cho mỗi instance Vercel, không phải toàn deployment.

Các truy vấn danh mục không tự động khóa cả bảng. Đăng ký giữ khóa trên sinh viên/lớp và các bản ghi liên quan; dữ liệu lớp, lịch và điểm phục vụ tính toán được truy vấn theo ID. Kích hoạt học kỳ vẫn khóa tập học kỳ vì thao tác này phải bảo đảm chỉ một kỳ đang hoạt động.
