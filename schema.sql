-- ==========================================================
-- HỆ THỐNG QUẢN LÝ ĐÀO TẠO VÀ ĐĂNG KÝ HỌC PHẦN
-- Database: training_management
-- Hệ QT CSDL: MySQL 8.0+
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `training_management` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `training_management`;

-- 1. Bảng tài khoản người dùng
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `role` ENUM('ADMIN', 'LECTURER', 'STUDENT') NOT NULL,
    `status` TINYINT(1) DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Bảng Khoa / Bộ môn
CREATE TABLE IF NOT EXISTS `departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `department_code` VARCHAR(20) NOT NULL UNIQUE,
    `department_name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Bảng Chương trình đào tạo / Ngành
CREATE TABLE IF NOT EXISTS `programs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `program_code` VARCHAR(20) NOT NULL UNIQUE,
    `program_name` VARCHAR(150) NOT NULL,
    `department_id` INT NOT NULL,
    `total_credits` INT DEFAULT 135,
    `duration_years` FLOAT DEFAULT 4.0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_programs_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bảng Giảng viên
CREATE TABLE IF NOT EXISTS `lecturers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `lecturer_code` VARCHAR(20) NOT NULL UNIQUE,
    `full_name` VARCHAR(100) NOT NULL,
    `degree` VARCHAR(50) DEFAULT 'Thạc sĩ',
    `department_id` INT NOT NULL,
    `phone` VARCHAR(20) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_lecturers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_lecturers_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bảng Sinh viên
CREATE TABLE IF NOT EXISTS `students` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `student_code` VARCHAR(20) NOT NULL UNIQUE,
    `full_name` VARCHAR(100) NOT NULL,
    `gender` ENUM('Nam', 'Nữ') DEFAULT 'Nam',
    `birth_date` DATE NULL,
    `phone` VARCHAR(20) NULL,
    `address` VARCHAR(255) NULL,
    `program_id` INT NOT NULL,
    `academic_year` VARCHAR(20) DEFAULT 'K74',
    `class_name` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_students_program` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Bảng Môn học / Học phần
CREATE TABLE IF NOT EXISTS `subjects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `subject_code` VARCHAR(20) NOT NULL UNIQUE,
    `subject_name` VARCHAR(150) NOT NULL,
    `credits` INT NOT NULL DEFAULT 3,
    `theory_periods` INT DEFAULT 30,
    `practice_periods` INT DEFAULT 15,
    `department_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_subjects_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Bảng Môn tiên quyết
CREATE TABLE IF NOT EXISTS `prerequisites` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `subject_id` INT NOT NULL,
    `prerequisite_subject_id` INT NOT NULL,
    `min_grade_required` FLOAT DEFAULT 4.0,
    CONSTRAINT `fk_prereq_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_prereq_req` FOREIGN KEY (`prerequisite_subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `uk_prerequisite` UNIQUE (`subject_id`, `prerequisite_subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Bảng Năm học & Học kỳ
CREATE TABLE IF NOT EXISTS `semesters` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `semester_code` VARCHAR(20) NOT NULL UNIQUE,
    `semester_name` VARCHAR(50) NOT NULL,
    `academic_year` VARCHAR(20) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Bảng Đợt đăng ký tín chỉ
CREATE TABLE IF NOT EXISTS `registration_periods` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `semester_id` INT NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `start_time` DATETIME NOT NULL,
    `end_time` DATETIME NOT NULL,
    `min_credits` INT DEFAULT 12,
    `max_credits` INT DEFAULT 24,
    `is_active` BOOLEAN DEFAULT TRUE,
    CONSTRAINT `fk_reg_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Bảng Lớp học phần
CREATE TABLE IF NOT EXISTS `course_classes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `class_code` VARCHAR(30) NOT NULL UNIQUE,
    `subject_id` INT NOT NULL,
    `semester_id` INT NOT NULL,
    `lecturer_id` INT NULL,
    `max_students` INT DEFAULT 50,
    `current_students` INT DEFAULT 0,
    `status` ENUM('OPEN', 'CLOSED', 'CANCELLED') DEFAULT 'OPEN',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_classes_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
    CONSTRAINT `fk_classes_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`),
    CONSTRAINT `fk_classes_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Bảng Lịch học chi tiết (Thứ, Tiết, Phòng)
CREATE TABLE IF NOT EXISTS `class_schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `course_class_id` INT NOT NULL,
    `day_of_week` INT NOT NULL COMMENT '2: Thứ 2, 3: Thứ 3, ..., 8: Chủ nhật',
    `start_period` INT NOT NULL COMMENT 'Tiết 1 đến 12',
    `total_periods` INT NOT NULL COMMENT 'Số tiết (vd: 3 tiết)',
    `room` VARCHAR(30) NOT NULL,
    `week_from` INT DEFAULT 1,
    `week_to` INT DEFAULT 16,
    CONSTRAINT `fk_schedules_class` FOREIGN KEY (`course_class_id`) REFERENCES `course_classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Bảng Đăng ký học phần của sinh viên
CREATE TABLE IF NOT EXISTS `enrollments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `course_class_id` INT NOT NULL,
    `enrollment_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM('ENROLLED', 'CANCELLED') DEFAULT 'ENROLLED',
    CONSTRAINT `fk_enrollments_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_enrollments_class` FOREIGN KEY (`course_class_id`) REFERENCES `course_classes` (`id`) ON DELETE CASCADE,
    CONSTRAINT `uk_student_class` UNIQUE (`student_id`, `course_class_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Bảng Điểm và Kết quả học tập
CREATE TABLE IF NOT EXISTS `grades` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `enrollment_id` INT NOT NULL UNIQUE,
    `attendance_score` FLOAT NULL COMMENT 'Điểm chuyên cần 10%',
    `midterm_score` FLOAT NULL COMMENT 'Điểm giữa kỳ 30%',
    `final_score` FLOAT NULL COMMENT 'Điểm cuối kỳ 60%',
    `total_score_10` FLOAT NULL,
    `total_score_4` FLOAT NULL,
    `letter_grade` VARCHAR(5) NULL,
    `is_locked` BOOLEAN DEFAULT FALSE,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_grades_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- DỮ LIỆU MẪU (SEED DATA)
-- Mật khẩu mặc định cho các tài khoản là: "123456"
-- Hash bcrypt tương ứng: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
-- ==========================================================

-- 1. Tài khoản Users
INSERT INTO `users` (`id`, `username`, `password`, `email`, `role`, `status`) VALUES
(1, 'admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin@utt.edu.vn', 'ADMIN', 1),
(2, 'gv_thuan', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'thuanpt@utt.edu.vn', 'LECTURER', 1),
(3, 'gv_nam', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'namnv@utt.edu.vn', 'LECTURER', 1),
(4, '74dctt25001', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'hieplv@sinhvien.utt.edu.vn', 'STUDENT', 1),
(5, '74dctt25002', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'huybd@sinhvien.utt.edu.vn', 'STUDENT', 1),
(6, '74dctt25003', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'minhnla@sinhvien.utt.edu.vn', 'STUDENT', 1),
(7, '74dctt25004', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'vienvn@sinhvien.utt.edu.vn', 'STUDENT', 1);

-- 2. Khoa
INSERT INTO `departments` (`id`, `department_code`, `department_name`, `phone`, `email`) VALUES
(1, 'CNTT', 'Khoa Công nghệ Thông tin', '02438544264', 'cntt@utt.edu.vn'),
(2, 'KTXD', 'Khoa Công trình', '02438544265', 'ktxd@utt.edu.vn');

-- 3. Chương trình đào tạo
INSERT INTO `programs` (`id`, `program_code`, `program_name`, `department_id`, `total_credits`, `duration_years`) VALUES
(1, '7480201', 'Công nghệ Thông tin', 1, 135, 4.0),
(2, '7480101', 'Khoa học Máy tính', 1, 138, 4.0);

-- 4. Giảng viên
INSERT INTO `lecturers` (`id`, `user_id`, `lecturer_code`, `full_name`, `degree`, `department_id`, `phone`) VALUES
(1, 2, 'GV001', 'ThS. Phạm Thị Thuận', 'Thạc sĩ', 1, '0912345678'),
(2, 3, 'GV002', 'TS. Nguyễn Văn Nam', 'Tiến sĩ', 1, '0987654321');

-- 5. Sinh viên (Nhóm 6)
INSERT INTO `students` (`id`, `user_id`, `student_code`, `full_name`, `gender`, `birth_date`, `phone`, `program_id`, `academic_year`, `class_name`) VALUES
(1, 4, '74DCTT25001', 'Lê Văn Hiệp', 'Nam', '2004-05-12', '0911000001', 1, 'K74', '2DCTT745'),
(2, 5, '74DCTT25002', 'Bùi Đức Huy', 'Nam', '2004-08-20', '0911000002', 1, 'K74', '2DCTT745'),
(3, 6, '74DCTT25003', 'Nguyễn Lê Anh Minh', 'Nam', '2004-11-15', '0911000003', 1, 'K74', '2DCTT745'),
(4, 7, '74DCTT25004', 'Vũ Ngọc Viên', 'Nam', '2004-03-09', '0911000004', 1, 'K74', '2DCTT745');

-- 6. Môn học
INSERT INTO `subjects` (`id`, `subject_code`, `subject_name`, `credits`, `theory_periods`, `practice_periods`, `department_id`) VALUES
(1, 'INT1001', 'Lập trình Cơ sở', 3, 30, 15, 1),
(2, 'INT1002', 'Lập trình Hướng đối tượng', 3, 30, 15, 1),
(3, 'INT1003', 'Cơ sở Dữ liệu', 3, 30, 15, 1),
(4, 'INT1004', 'Phát triển Phần mềm Ứng dụng', 3, 30, 15, 1),
(5, 'INT1005', 'Công nghệ Web', 3, 30, 15, 1),
(6, 'MAT1001', 'Toán Rời rạc', 3, 45, 0, 1);

-- 7. Môn tiên quyết
-- Môn LTHĐT (2) yêu cầu môn Lập trình cơ sở (1)
-- Môn PTPM (4) yêu cầu môn Cơ sở dữ liệu (3) và LTHĐT (2)
INSERT INTO `prerequisites` (`subject_id`, `prerequisite_subject_id`, `min_grade_required`) VALUES
(2, 1, 4.0),
(4, 2, 4.0),
(4, 3, 4.0);

-- 8. Học kỳ
INSERT INTO `semesters` (`id`, `semester_code`, `semester_name`, `academic_year`, `start_date`, `end_date`, `is_active`) VALUES
(1, 'HK1_2026_2027', 'Học kỳ 1 - 2026-2027', '2026-2027', '2026-09-01', '2027-01-15', 1);

-- 9. Đợt đăng ký tín chỉ
INSERT INTO `registration_periods` (`id`, `semester_id`, `name`, `start_time`, `end_time`, `min_credits`, `max_credits`, `is_active`) VALUES
(1, 1, 'Đợt 1: Đăng ký học phần chính thức HK1', '2026-09-01 00:00:00', '2026-10-30 23:59:59', 12, 24, 1);

-- 10. Lớp học phần mở trong kỳ
INSERT INTO `course_classes` (`id`, `class_code`, `subject_id`, `semester_id`, `lecturer_id`, `max_students`, `current_students`, `status`) VALUES
(1, 'LHP_INT1004_01', 4, 1, 1, 50, 4, 'OPEN'),
(2, 'LHP_INT1005_01', 5, 1, 2, 45, 2, 'OPEN'),
(3, 'LHP_INT1003_01', 3, 1, 1, 60, 0, 'OPEN'),
(4, 'LHP_MAT1001_01', 6, 1, 2, 50, 0, 'OPEN');

-- 11. Lịch học chi tiết
-- Lớp Phát triển phần mềm: Thứ Hai, tiết 1-3, Phòng 301-A1
INSERT INTO `class_schedules` (`course_class_id`, `day_of_week`, `start_period`, `total_periods`, `room`, `week_from`, `week_to`) VALUES
(1, 2, 1, 3, '301-A1', 1, 16),
-- Lớp Công nghệ Web: Thứ Tư, tiết 4-6, Phòng 402-A2
(2, 4, 4, 3, '402-A2', 1, 16),
-- Lớp Cơ sở Dữ liệu: Thứ Hai, tiết 2-4, Phòng 205-A1 (Cố tình tạo trùng lịch với lớp 1 để test thuật toán)
(3, 2, 2, 3, '205-A1', 1, 16),
-- Lớp Toán rời rạc: Thứ Sáu, tiết 7-9, Phòng 102-A3
(4, 6, 7, 3, '102-A3', 1, 16);

-- 12. Dữ liệu Đăng ký học phần sẵn
INSERT INTO `enrollments` (`id`, `student_id`, `course_class_id`, `status`) VALUES
(1, 1, 1, 'ENROLLED'),
(2, 2, 1, 'ENROLLED'),
(3, 3, 1, 'ENROLLED'),
(4, 4, 1, 'ENROLLED'),
(5, 1, 2, 'ENROLLED'),
(6, 2, 2, 'ENROLLED');

-- 13. Điểm số mẫu
INSERT INTO `grades` (`enrollment_id`, `attendance_score`, `midterm_score`, `final_score`, `total_score_10`, `total_score_4`, `letter_grade`, `is_locked`) VALUES
(1, 9.0, 8.5, 8.0, 8.3, 3.5, 'B+', 0),
(2, 8.0, 7.0, 7.5, 7.4, 3.0, 'B', 0);
