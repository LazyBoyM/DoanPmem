# Hoàn thiện chức năng quản lý đào tạo

## Sử dụng

- **Tài khoản & phân quyền:** xem cả ba vai trò, tạo thêm quản trị viên và phân quyền. Chuyển sang Sinh viên/Giảng viên yêu cầu hồ sơ phù hợp; tài khoản hồ sơ được tạo tại màn hình quản lý sinh viên/giảng viên. Không tự thay quyền của mình. Phiên đăng nhập theo quyền cũ mất hiệu lực sau khi đổi vai trò.
- **Môn học:** thêm/sửa nhiều môn tiên quyết, bỏ chọn để xóa điều kiện; chặn điều kiện tạo vòng lặp. Sửa tín chỉ phải phù hợp chương trình và kế hoạch đã chốt.
- **Học kỳ & đăng ký → Chương trình đào tạo:** menu Thao tác cho phép sửa, xóa, quản lý danh sách môn bắt buộc/tự chọn và học kỳ gợi ý. Chặn môn lặp, học kỳ vượt thời gian đào tạo và tổng tín chỉ phân bổ vượt tổng chương trình. Chương trình có sinh viên không được xóa.
- **Học kỳ & đăng ký → Năm học & học kỳ:** thêm/sửa/xóa học kỳ, sửa năm học, kích hoạt học kỳ hiện hành. Năm học được lưu bằng trường `academic_year` của từng học kỳ. Học kỳ hiện hành hoặc có lớp/đợt đăng ký không được xóa.
- **Đợt đăng ký:** thêm/sửa thời gian, giới hạn tín chỉ; bật/tắt/xóa đợt chưa dùng. Không chuyển đợt sang học kỳ khác, không để các đợt đang bật trùng thời gian, không xóa lịch sử đã chốt.
- **Lớp học phần:** sửa mã lớp, giảng viên và sĩ số; giữ nguyên môn/học kỳ để bảo toàn lịch sử. Kiểm tra trùng giảng viên, sức chứa phòng và số sinh viên hiện có. Đổi lịch/phòng tiếp tục dùng thao tác riêng.
- **Sinh viên → Đăng ký học phần:** chọn các lớp rồi bấm **Chốt đăng ký**. Hệ thống kiểm tra tín chỉ tối thiểu và tối đa của đợt đang mở. Thay đổi đăng ký/hủy hoặc Admin hủy lớp sẽ bỏ lần chốt tương ứng; sinh viên cần chốt lại. Các lớp đã đăng ký vẫn được giữ để sinh viên hoàn thiện kế hoạch; chưa chốt không đồng nghĩa bị hủy học phần.
- **Năm học & học kỳ → Thao tác → Tình trạng chốt đăng ký:** tra cứu tất cả sinh viên, lọc đã chốt/chưa chốt/chưa đủ tín chỉ/vượt giới hạn/chưa đăng ký, xuất Excel toàn học kỳ.

## Cập nhật MySQL

Trong thư mục `server`, chạy `npm run migrate`. Migration `005_training_completion.sql` bổ sung `program_subjects` và `registration_submissions`, không tạo sẵn phân bổ môn học hoặc lần chốt cho dữ liệu cũ. Admin cần nhập chương trình thực tế; sinh viên chốt đăng ký trong đợt đang mở.

Bộ cài mới `database/tables.sql`, các file tách bảng và `schema.sql` đã đồng bộ thành 18 bảng. Không dùng bộ seed để cập nhật cơ sở dữ liệu đang có dữ liệu.

## Kiểm tra

- `server`: `npm test` chạy bộ kiểm thử API, nghiệp vụ và hợp đồng SQL.
- `server`: `npm run verify:mysql` kiểm tra ghi/đọc các luồng mới trên MySQL đang cấu hình. Toàn bộ hồ sơ, chương trình, lớp và đăng ký thử nằm trong giao dịch được rollback khi kết thúc. Cần có ít nhất một khoa và phòng học đang hoạt động đủ 10 chỗ.
- `client`: `npm run build`, `npm run lint`, `node --test src/pages/Lecturer/gradeBook.test.js`.

Kiểm thử cục bộ không đồng nghĩa đã triển khai bản cập nhật lên máy chủ từ xa.
