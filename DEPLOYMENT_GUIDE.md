# Hướng Dẫn Triển Khai EduPortal (Cloud MySQL & Vercel)

Tài liệu cấu hình backend của dự án với database cloud và Vercel. Hạn mức, giá và giao diện nhà cung cấp cần kiểm tra trên tài khoản của bạn; không mặc định dịch vụ miễn phí vĩnh viễn hoặc tương thích đầy đủ mọi tính năng MySQL.

## 1. Chuẩn bị

Dùng thông tin kết nối thực tế do dịch vụ database cung cấp. Với TiDB, cần chạy kiểm thử migration và transaction trên database thử nghiệm trước khi dùng dữ liệu thật. Mã nguồn hiện chưa được xác minh trên deployment cloud của bạn.

## 2. Các Bước Thực Hiện Chi Tiết

### Bước 1: Tạo Database MySQL Trên TiDB Cloud
1. Truy cập [tidbcloud.com](https://tidbcloud.com) và đăng ký tài khoản (bằng Google / GitHub).
2. Tạo cụm phù hợp với gói và hạn mức trên tài khoản:
   - Đặt tên cụm (ví dụ: `eduportal-db`).
   - Chọn Region gần Việt Nam: `ap-southeast-1` (Singapore).
   - Bấm **Create Cluster**.
3. Lấy thông tin kết nối:
   - Bấm nút **Connect** ở góc phải màn hình, chọn tab **General**.
   - Lưu lại các thông tin:
     - **Host**: `gateway01.ap-southeast-1.prod.aws.tidbcloud.com`
     - **Port**: `4000`
     - **User**: `<chuoi-ky-tu>.root`
     - **Password**: Mật khẩu do hệ thống sinh ra (hoặc bấm *Reset password* để lấy mới).
     - **Database**: `test` (hoặc tạo db tên khác nếu muốn).
4. Khởi tạo cấu trúc & dữ liệu:
   - Trên menu bên trái của TiDB Cloud, bấm **SQL Editor**.
   - Mở file `schema.sql` trong dự án, copy toàn bộ nội dung và dán vào SQL Editor.
   - Nhấn **Run** để khởi tạo bảng và dữ liệu mẫu.

---

### Bước 2: Đẩy Mã Nguồn Lên GitHub
Nếu bạn chưa đẩy code lên GitHub, mở terminal tại thư mục dự án và chạy:
```bash
git init
git add .
git commit -m "feat: setup cloud db and vercel serverless deployment"
git branch -M main
git remote add origin https://github.com/<tai-khoan-github>/<ten-repository>.git
git push -u origin main
```

---

### Bước 3: Deploy Lên Vercel
1. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng GitHub.
2. Bấm **Add New...** -> **Project** -> Chọn Repository của dự án vừa đẩy lên.
3. Ở mục **Environment Variables**, cấu hình các biến sau:

| Tên Biến | Giá Trị Mẫu | Mô Tả |
| :--- | :--- | :--- |
| `DB_HOST` | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` | Host của TiDB Cloud |
| `DB_PORT` | `4000` | Cổng kết nối (mặc định 4000) |
| `DB_USER` | `xxxxxx.root` | User TiDB Cloud cung cấp |
| `DB_PASSWORD` | `MatKhauCuaBan123#` | Password do TiDB Cloud cung cấp |
| `DB_NAME` | `test` | Tên database |
| `DB_SSL` | `true` | **Bắt buộc** để kích hoạt mã hóa TLS kết nối Cloud |
| `JWT_SECRET` | Giá trị ngẫu nhiên riêng của bạn | Tối thiểu 32 ký tự; không dùng khóa mẫu |
| `DB_MODE` | `mysql` | Bắt buộc dùng database thật |
| `USE_MOCK_IF_NO_DB` | `false` | Không chuyển sang dữ liệu demo |
| `DB_CONNECTION_LIMIT` | `2` | Giới hạn cho mỗi instance |
| `NODE_ENV` | `production` | Môi trường production |

4. Nhấn nút **Deploy**.
5. Sau deploy, kiểm tra API, đăng nhập và một vòng đăng ký/hủy trên dữ liệu thử nghiệm. Nếu API trả 503, kiểm tra cấu hình DB, chứng chỉ và JWT trong môi trường deploy.


## 3. SSL và nâng cấp database

SSL xác minh chứng chỉ mặc định. Nếu nhà cung cấp yêu cầu CA riêng, đặt `DB_SSL_CA` bằng nội dung PEM hoặc `DB_SSL_CA_PATH` bằng đường dẫn file đã triển khai. Không đặt `DB_SSL_REJECT_UNAUTHORIZED=false` trên production.

Có thể dùng `DATABASE_URL` thay cho bộ biến kết nối; URL được ưu tiên và không nhận query options. Backend và migration dùng chung cấu hình. Không đưa thông tin kết nối vào frontend.

Chỉ import `schema.sql` vào database mới, trống. Database cũ: sao lưu, cấu hình đúng database đích trong môi trường chạy lệnh, rồi chạy `npm run migrate` tại thư mục `server`. Không chạy migration mỗi request serverless. Chưa có migration nào được chạy lên cloud trong lần chỉnh sửa mã nguồn này.

Kiểm chứng cục bộ: `npm test` đạt 34/34, gồm xử lý DB lỗi, TLS, JWT production, pool khởi động đồng thời và phạm vi khóa. Các kiểm thử dùng mock/pool giả; chưa thay thế kiểm thử MySQL/TiDB thật.
