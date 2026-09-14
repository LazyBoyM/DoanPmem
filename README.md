# HỆ THỐNG QUẢN LÝ ĐÀO TẠO VÀ ĐĂNG KÝ HỌC PHẦN (UTT EDUPORTAL)

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
11. **Thời khóa biểu ma trận tuần:** Hiển thị thời khóa biểu dạng lưới 10 tiết từ Thứ 2 đến Chủ nhật cho cả Giảng viên và Sinh viên.
12. **Thống kê, xuất danh sách & báo cáo:** Biểu đồ phân bổ phổ điểm toàn trường, xuất file Excel danh sách sinh viên và bảng điểm lớp học phần.

---

## 🚀 Hướng Dẫn Cài Đặt Và Khởi Chạy

### 1. Yêu cầu môi trường
- **Node.js:** phiên bản 18+ trở lên.
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

*(Trên giao diện Web có tích hợp sẵn nút bấm đăng nhập nhanh 1-click để thuận tiện thuyết trình và chấm điểm)*.
