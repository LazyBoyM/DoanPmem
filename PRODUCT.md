# EduPortal

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Quản trị viên quản lý hồ sơ, môn học, lớp, học kỳ và tài khoản. Giảng viên quản lý lớp được phân công, điểm và kết quả học tập. Sinh viên đăng ký học phần, xem lịch, điểm, tiến độ tín chỉ và thi lại.

## Product Purpose

Cổng quản lý đào tạo và đăng ký học phần bằng tiếng Việt. Mục tiêu thiết kế được người dùng xác nhận ngày 10/10/2026: giữ toàn bộ nghiệp vụ, giúp đọc dữ liệu rõ hơn, thao tác nhanh và dùng tốt trên điện thoại.

## Capabilities and Constraints

Giữ toàn bộ chức năng, API, vai trò, phân quyền và quy tắc nghiệp vụ hiện có. React/Vite, Bootstrap và Express/MySQL là nền tảng đang hoạt động. Không thay đổi nghiệp vụ đăng ký, tính điểm, khóa điểm, thi lại hoặc xử lý hồ sơ chỉ vì thay đổi giao diện. Thiết kế lại gồm đăng nhập và tất cả màn hình của ba vai trò, kể cả theo dõi sinh viên và hồ sơ chi tiết.

## Brand Commitments

Giữ tên EduPortal và ngôn ngữ tiếng Việt. Người dùng đã chọn Academic Focus: nền trắng, chữ graphite, ít màu và ưu tiên đọc dữ liệu. Ngày 10/10/2026, người dùng yêu cầu áp dụng hướng “Sổ học vụ số” trên toàn bộ giao diện sau khi xem trang Nhập & khóa điểm: mục lục theo công việc, sổ dữ liệu và panel cạnh phải. Duy trì Source Sans 3 và màu petrol cho hành động; tránh trở lại bố cục dashboard có nhiều khung lặp lại.

## Evidence on Hand

Routes và chức năng hiện có tại client/src/App.jsx; hướng dẫn và quy tắc trong README.md. Các số liệu, hồ sơ, lớp và kết quả trên giao diện lấy từ API. Dữ liệu mock phục vụ kiểm tra cục bộ, không phải bằng chứng về khách hàng hay quy mô thực tế.

## Product Principles

- Ưu tiên hoàn thành công việc và đọc đúng dữ liệu.
- Một ngôn ngữ giao diện nhất quán cho cả ba vai trò.
- Dùng được bằng bàn phím và trên màn hình nhỏ.
- Trạng thái tải, lỗi, rỗng và thao tác quan trọng phải rõ ràng.
- Giữ nguyên nội dung và quy tắc sản phẩm khi thay thiết kế.
