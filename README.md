# EduPortal

Hệ thống quản lý đào tạo và đăng ký học phần với ba vai trò: Admin, Giảng viên và Sinh viên.

- [Chức năng, migration và cách kiểm tra](docs/Hoan-thien-chuc-nang.md)
- [Cài đặt cơ sở dữ liệu](database/README.md)
- [Quy tắc tòa, phòng và xếp lịch](docs/Quy-tac-toa-phong-hoc.md)

## Chạy dự án

Trong `server`, chạy `npm ci`, sao chép `.env.example` thành `.env` và cấu hình kết nối cùng khóa JWT. Chạy `npm run migrate` để cập nhật cơ sở dữ liệu đã có, sau đó `npm start`.

Trong `client`, chạy `npm ci` rồi `npm run dev`.

Với cơ sở dữ liệu mới, làm theo hướng dẫn trong `database/README.md`. Không chạy seed trên dữ liệu đang sử dụng. Không đưa tệp `.env` hoặc khóa bí mật lên Git.

## Kiểm tra

- Backend: `cd server` rồi `npm test`.
- Frontend: `cd client` rồi `npm run build`, `npm run lint` và `node --test src/pages/Lecturer/gradeBook.test.js`.
- SQL thực tế: trong `server`, chạy `npm run verify:mysql` với cơ sở dữ liệu đã cấu hình; dữ liệu thử được rollback. Xem phạm vi và điều kiện trong tài liệu chức năng.

