# Cơ sở dữ liệu EduPortal

Bộ cấu trúc hiện tại gồm 18 bảng. `tables.sql` chứa DDL tổng hợp; thư mục `tables/` chứa các câu lệnh tách riêng. `seed.sql` là dữ liệu minh họa.

## Cài mới

1. Tạo cơ sở dữ liệu ứng dụng trống trên MySQL hoặc dịch vụ tương thích.
2. Cấu hình kết nối trong `server/.env` theo `server/.env.example`.
3. Trong `server`, chạy `npm ci` rồi `npm run db:setup` để tạo bảng và nhập dữ liệu minh họa.

Script từ chối cơ sở dữ liệu hệ thống hoặc bảng đã có dữ liệu. DDL có thể được lưu trước khi seed thất bại do cơ chế commit của máy chủ SQL; không coi toàn bộ quá trình cài mới là một giao dịch duy nhất.

## Cập nhật dữ liệu đã có

Trong `server`, chạy `npm run migrate`. Không chạy lại seed để cập nhật cơ sở dữ liệu đang sử dụng. Migration `005_training_completion.sql` bổ sung chương trình môn học và bản chốt đăng ký; dữ liệu cũ cần được hoàn thiện theo nghiệp vụ thực tế.

## Kiểm tra

Chạy `npm run verify:mysql` trong `server` để thử các luồng mới bằng kết nối SQL đã cấu hình. Cần có ít nhất một khoa và phòng học đang hoạt động đủ 10 chỗ. Dữ liệu thử nằm trong giao dịch ngoài được rollback; các thao tác bên trong dùng savepoint. Phép thử không chứng minh độ bền sau commit độc lập hoặc xử lý đồng thời trên nhiều kết nối.

Lượt kiểm chứng ngày 16/10/2026 sử dụng TiDB Cloud qua giao thức MySQL và TLS; xem chi tiết trong báo cáo Nhóm 8.
