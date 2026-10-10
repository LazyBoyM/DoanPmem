# Quản lý tòa nhà, phòng học và xếp lịch

## Danh mục

- Chỉ quản trị viên được tạo, sửa, xóa tòa nhà và phòng học.
- Mã tòa duy nhất; mã phòng duy nhất trong từng tòa, không phân biệt chữ hoa/thường. Hai tòa được phép có cùng mã phòng.
- Phòng thuộc một tòa; có tên, tầng, sức chứa từ 1–1000, loại phòng (lý thuyết, máy tính, thí nghiệm) và trạng thái.
- Loại phòng là thông tin tra cứu. Chưa tự động buộc môn có tiết thực hành phải học phòng máy hoặc thí nghiệm, vì môn chưa có yêu cầu loại phòng cụ thể.

## Khi tạo hoặc đổi lịch lớp

- Mỗi buổi dùng `room_id` của danh mục. Backend tự lấy tên hiển thị; không nhận tên phòng tự nhập để quyết định phòng.
- Phòng và tòa phải đang sử dụng. Sĩ số **tối đa** của lớp không được vượt sức chứa phòng, kể cả lớp chưa có sinh viên.
- Thứ 2–Chủ nhật, tiết 1–12; tiết cuối không vượt 12; tuần 1–53, tuần cuối không trước tuần đầu.
- Trong cùng học kỳ, hai lịch trùng khi cùng ngày, tuần giao nhau (bao gồm hai đầu), tiết giao nhau. Buổi bắt đầu ngay sau buổi trước được phép.
- Không xếp cùng phòng hoặc cùng giảng viên vào hai lớp trùng lịch. Lớp đóng đăng ký vẫn giữ chỗ phòng; lớp đã hủy được giải phóng.
- Đổi lịch kiểm tra thêm các lớp khác của sinh viên đã đăng ký. Giữ nguyên đăng ký và điểm. Lớp đã hủy hoặc khóa điểm không được đổi lịch.
- Có thể thêm nhiều buổi khi đổi lịch. Các buổi trong cùng lớp không được giao nhau.
- Các thao tác phân phòng, chỉnh danh mục và đăng ký dùng chung khóa danh mục trong giao dịch để tránh kiểm tra trên dữ liệu đang thay đổi. Đây là cách bảo đảm tính đúng cho quy mô hiện tại; lượng ghi lớn có thể cần chuyển sang khóa theo tài nguyên/học kỳ.

## Bảo vệ dữ liệu

- Phòng đã gắn với lịch không thể xóa. Tòa còn phòng không thể xóa.
- Không ngừng sử dụng phòng/tòa còn lịch của lớp chưa hủy, bao gồm lịch lịch sử được giữ lại. Không giảm sức chứa dưới sĩ số tối đa của lớp đã xếp.
- Có thể sửa mã, tên, địa điểm hoặc gắn phòng sang tòa đang sử dụng, với điều kiện mã phòng duy nhất và sức chứa phù hợp. ID phòng giữ nguyên nên không mất liên kết lịch học.
- Hủy lớp theo nghiệp vụ hiện có sẽ gỡ lịch; lớp có điểm/khóa điểm vẫn được bảo vệ theo quy tắc cũ.

## Database và chuyển đổi

- Cài mới: `database/tables.sql`, `database/seed.sql` và `schema.sql` đồng bộ 16 bảng; dữ liệu demo gồm các tòa A1/A2/A3 và 4 phòng.
- Database cũ: chạy riêng `npm --prefix server run migrate -- --only 004_buildings_rooms.sql` (không chạy lại các migration trước). Migration `004_buildings_rooms.sql` thêm danh mục và khóa ngoại `class_schedules.room_id`. Không xóa lịch, lớp, đăng ký hoặc điểm; giữ cột `room` làm tên chụp tại thời điểm lưu.
- Tên cũ được chuẩn hóa hoa/thường, đưa vào tòa `LEGACY` (Phòng chuyển đổi từ lịch cũ). Sức chứa tạm lấy theo sĩ số tối đa của các lớp đã xếp; tầng 0 và loại lý thuyết là giá trị mặc định, cần quản trị viên xác nhận. Giao diện hiển thị ghi chú này, không coi đó là số đo thực tế.
- Migration có thể chạy lại khi DDL bị gián đoạn; kiểm tra cột, khóa ngoại và chỉ mục trước khi thêm. Cài mới không tạo thêm phòng chuyển đổi khi mọi lịch đã có `room_id`.
- Bản phát triển hiện tại đã áp dụng riêng migration 004 trên database đang cấu hình và kiểm tra 4 lịch cũ được giữ nguyên. Không chạy lại các migration cũ liên quan mật khẩu.

## API mới

| API | Chức năng |
|---|---|
| `GET/POST /api/admin/buildings` | Danh sách / thêm tòa |
| `PUT/DELETE /api/admin/buildings/:id` | Sửa / xóa tòa |
| `GET/POST /api/admin/rooms` | Danh sách / thêm phòng |
| `PUT/DELETE /api/admin/rooms/:id` | Sửa / xóa phòng |
| `PUT /api/admin/classes/:id/schedule` | Đổi các buổi học và phòng |

API mở lớp hiện có `/api/admin/create-class` sử dụng `schedules[].room_id`. Thời khóa biểu sinh viên, giảng viên và danh sách lớp đọc tên/phòng/tòa hiện tại từ danh mục.
