-- Chỉ chạy sau khi đủ 13 bảng. Chọn toàn bộ nội dung rồi Run.
-- DỮ LIỆU MẪU (SEED DATA)
-- Mật khẩu mặc định cho các tài khoản là: "123456"
-- Hash bcrypt tương ứng: $2a$10$0yBOIkFePreY4k4Ds7/GjOyvJc4ujz8SWQ6J07yNhTay00tNoVMJu
-- ==========================================================

-- 1. Tài khoản Users
INSERT INTO `users` (`id`, `username`, `password`, `email`, `role`, `status`) VALUES
(1, 'admin', '$2a$10$0yBOIkFePreY4k4Ds7/GjOyvJc4ujz8SWQ6J07yNhTay00tNoVMJu', 'admin@edu.vn', 'ADMIN', 1),
(2, 'gv_thuan', '$2a$10$0yBOIkFePreY4k4Ds7/GjOyvJc4ujz8SWQ6J07yNhTay00tNoVMJu', 'thuanpt@edu.vn', 'LECTURER', 1),
(3, 'gv_nam', '$2a$10$0yBOIkFePreY4k4Ds7/GjOyvJc4ujz8SWQ6J07yNhTay00tNoVMJu', 'namnv@edu.vn', 'LECTURER', 1),
(4, '74dctt25001', '$2a$10$0yBOIkFePreY4k4Ds7/GjOyvJc4ujz8SWQ6J07yNhTay00tNoVMJu', 'hieplv@sinhvien.edu.vn', 'STUDENT', 1),
(5, '74dctt25002', '$2a$10$0yBOIkFePreY4k4Ds7/GjOyvJc4ujz8SWQ6J07yNhTay00tNoVMJu', 'huybd@sinhvien.edu.vn', 'STUDENT', 1),
(6, '74dctt25003', '$2a$10$0yBOIkFePreY4k4Ds7/GjOyvJc4ujz8SWQ6J07yNhTay00tNoVMJu', 'minhnla@sinhvien.edu.vn', 'STUDENT', 1),
(7, '74dctt25004', '$2a$10$0yBOIkFePreY4k4Ds7/GjOyvJc4ujz8SWQ6J07yNhTay00tNoVMJu', 'vienvn@sinhvien.edu.vn', 'STUDENT', 1)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 2. Khoa
INSERT INTO `departments` (`id`, `department_code`, `department_name`, `phone`, `email`) VALUES
(1, 'CNTT', 'Khoa Công nghệ Thông tin', '02438544264', 'cntt@edu.vn'),
(2, 'KTXD', 'Khoa Công trình', '02438544265', 'ktxd@edu.vn')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 3. Chương trình đào tạo
INSERT INTO `programs` (`id`, `program_code`, `program_name`, `department_id`, `total_credits`, `duration_years`) VALUES
(1, '7480201', 'Công nghệ Thông tin', 1, 135, 4.0),
(2, '7480101', 'Khoa học Máy tính', 1, 138, 4.0)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 4. Giảng viên
INSERT INTO `lecturers` (`id`, `user_id`, `lecturer_code`, `full_name`, `degree`, `department_id`, `phone`) VALUES
(1, 2, 'GV001', 'ThS. Phạm Thị Thuận', 'Thạc sĩ', 1, '0912345678'),
(2, 3, 'GV002', 'TS. Nguyễn Văn Nam', 'Tiến sĩ', 1, '0987654321')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 5. Sinh viên (Nhóm 6)
INSERT INTO `students` (`id`, `user_id`, `student_code`, `full_name`, `gender`, `birth_date`, `phone`, `program_id`, `academic_year`, `class_name`) VALUES
(1, 4, '74DCTT25001', 'Lê Văn Hiệp', 'Nam', '2004-05-12', '0911000001', 1, 'K74', '2DCTT745'),
(2, 5, '74DCTT25002', 'Bùi Đức Huy', 'Nam', '2004-08-20', '0911000002', 1, 'K74', '2DCTT745'),
(3, 6, '74DCTT25003', 'Nguyễn Lê Anh Minh', 'Nam', '2004-11-15', '0911000003', 1, 'K74', '2DCTT745'),
(4, 7, '74DCTT25004', 'Vũ Ngọc Viên', 'Nam', '2004-03-09', '0911000004', 1, 'K74', '2DCTT745')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 6. Môn học
INSERT INTO `subjects` (`id`, `subject_code`, `subject_name`, `credits`, `theory_periods`, `practice_periods`, `department_id`) VALUES
(1, 'INT1001', 'Lập trình Cơ sở', 3, 30, 15, 1),
(2, 'INT1002', 'Lập trình Hướng đối tượng', 3, 30, 15, 1),
(3, 'INT1003', 'Cơ sở Dữ liệu', 3, 30, 15, 1),
(4, 'INT1004', 'Phát triển Phần mềm Ứng dụng', 3, 30, 15, 1),
(5, 'INT1005', 'Công nghệ Web', 3, 30, 15, 1),
(6, 'MAT1001', 'Toán Rời rạc', 3, 45, 0, 1)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 7. Môn tiên quyết
-- Môn LTHĐT (2) yêu cầu môn Lập trình cơ sở (1)
-- Môn PTPM (4) yêu cầu môn Cơ sở dữ liệu (3) và LTHĐT (2)
INSERT INTO `prerequisites` (`id`, `subject_id`, `prerequisite_subject_id`, `min_grade_required`) VALUES
(1, 2, 1, 4.0),
(2, 4, 2, 4.0),
(3, 4, 3, 4.0)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 8. Học kỳ
INSERT INTO `semesters` (`id`, `semester_code`, `semester_name`, `academic_year`, `start_date`, `end_date`, `is_active`) VALUES
(1, 'HK1_2026_2027', 'Học kỳ 1 - 2026-2027', '2026-2027', '2026-09-01', '2027-01-15', 1)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 9. Đợt đăng ký tín chỉ
INSERT INTO `registration_periods` (`id`, `semester_id`, `name`, `start_time`, `end_time`, `min_credits`, `max_credits`, `is_active`) VALUES
(1, 1, 'Đợt 1: Đăng ký học phần chính thức HK1', '2026-09-01 00:00:00', '2026-10-30 23:59:59', 12, 24, 1)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 10. Lớp học phần mở trong kỳ
INSERT INTO `course_classes` (`id`, `class_code`, `subject_id`, `semester_id`, `lecturer_id`, `max_students`, `current_students`, `status`) VALUES
(1, 'LHP_INT1004_01', 4, 1, 1, 50, 0, 'OPEN'),
(2, 'LHP_INT1005_01', 5, 1, 2, 45, 2, 'OPEN'),
(3, 'LHP_INT1003_01', 3, 1, 1, 60, 4, 'OPEN'),
(4, 'LHP_MAT1001_01', 6, 1, 2, 50, 0, 'OPEN')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 11. Lịch học chi tiết
-- Lớp Phát triển phần mềm: Thứ Hai, tiết 1-3, Phòng 301-A1
INSERT INTO `class_schedules` (`id`, `course_class_id`, `day_of_week`, `start_period`, `total_periods`, `room`, `week_from`, `week_to`) VALUES
(1, 1, 2, 1, 3, '301-A1', 1, 16),
-- Lớp Công nghệ Web: Thứ Tư, tiết 4-6, Phòng 402-A2
(2, 2, 4, 4, 3, '402-A2', 1, 16),
-- Lớp Cơ sở Dữ liệu: Thứ Ba, tiết 2-4, Phòng 205-A1
-- Không trùng lịch giảng viên.
(3, 3, 3, 2, 3, '205-A1', 1, 16),
-- Lớp Toán rời rạc: Thứ Sáu, tiết 7-9, Phòng 102-A3
(4, 4, 6, 7, 3, '102-A3', 1, 16)
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 12. Dữ liệu Đăng ký học phần sẵn
INSERT INTO `enrollments` (`id`, `student_id`, `course_class_id`, `status`) VALUES
(1, 1, 3, 'ENROLLED'),
(2, 2, 3, 'ENROLLED'),
(3, 3, 3, 'ENROLLED'),
(4, 4, 3, 'ENROLLED'),
(5, 1, 2, 'ENROLLED'),
(6, 2, 2, 'ENROLLED')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- 13. Điểm số mẫu
INSERT INTO `grades` (`id`, `enrollment_id`, `attendance_score`, `midterm_score`, `final_score`, `total_score_10`, `total_score_4`, `letter_grade`, `is_locked`) VALUES
(1, 1, 9.0, 8.5, 8.0, 8.3, 3.5, 'B+', 0),
(2, 2, 8.0, 7.0, 7.5, 7.4, 3.0, 'B', 0)
ON DUPLICATE KEY UPDATE `id` = `id`;
