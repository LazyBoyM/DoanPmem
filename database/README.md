# Bộ database EduPortal

Bộ này gồm 13 bảng đúng thứ tự khóa ngoại, 7 tài khoản, 2 khoa, 2 chương trình, 2 giảng viên, 4 sinh viên, 6 môn, 3 điều kiện tiên quyết, 1 học kỳ, 1 đợt đăng ký, 4 lớp, 4 lịch, 6 đăng ký và 2 bảng điểm mẫu.

## Cách khuyến nghị: import bằng một lệnh

Trong `server/.env`, cấu hình thông tin cloud của bạn và `DB_NAME=test`, `DB_MODE=mysql`, `DB_SSL=true`. Nếu có DATABASE_URL, database trong URL phải là test vì URL được ưu tiên. Không dùng sys. Không lưu mật khẩu vào file SQL.

Chạy trong terminal tại thư mục dự án:

```powershell
cd server
npm run db:setup
```

Script tạo từng bảng tuần tự và dừng ngay tại lỗi đầu tiên. Chấp nhận database trống hoặc các bảng đã tạo dở nhưng chưa có dữ liệu. Nếu có dữ liệu, script dừng trước khi thay đổi: dùng database mới hoặc migration phù hợp, không tự xóa dữ liệu.

Dữ liệu mẫu được nhập trong transaction; lỗi thì rollback phần dữ liệu. DDL có thể đã tạo một phần bảng; sửa cấu hình rồi chạy lại để tiếp tục. Script giữ nguyên kiểm tra khóa ngoại và chứng chỉ TLS.

## Nếu dùng SQL Editor

1. Chọn database test trên giao diện.
2. Mở `tables.sql`, copy toàn bộ vào editor, click vào vùng mã, Ctrl+A rồi Run.
3. Nếu công cụ vẫn chỉ chạy câu cuối: mở lần lượt 13 file trong `tables`, từ 01_users.sql đến 13_grades.sql. Mỗi file chỉ có đúng một lệnh CREATE TABLE. Chạy thành công file trước rồi mới sang file sau.
4. Khi đủ 13 bảng, mở `seed.sql`, chọn toàn bộ rồi Run. Dữ liệu mẫu có ID cố định và không ghi đè bản ghi trùng khóa khi chạy lại; chỉ sử dụng cho database demo được khởi tạo từ bộ này, không trộn với dữ liệu thật.
5. Kiểm tra `SHOW TABLES;` và `SELECT COUNT(*) FROM grades;` (bảng điểm mẫu có 2 dòng).

`../schema.sql` là bản gộp đầy đủ cho công cụ có hỗ trợ chạy toàn file; không cần chạy thêm nếu đã dùng một trong hai cách trên.

## Tài khoản và dữ liệu demo

Mật khẩu ứng dụng mẫu: 123456. Admin: admin. Giảng viên: gv_thuan, gv_nam. Sinh viên: 74dctt25001 đến 74dctt25004.

Sinh viên đăng ký sẵn Cơ sở Dữ liệu thay vì môn nâng cao chưa đủ tiên quyết. Lịch giảng viên không bị trùng; sĩ số khớp số đăng ký. Đợt đăng ký mẫu: 01/09/2026–30/10/2026, sau đó cần tạo đợt phù hợp từ màn quản trị.

Đã kiểm tra cấu trúc, quan hệ dữ liệu và quy trình import bằng kiểm thử cục bộ. Chưa chạy bộ này trên cloud của bạn; không cam kết mọi môi trường không phát sinh lỗi cấu hình/quyền truy cập.
