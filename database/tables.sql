-- Chọn database test. Chạy toàn bộ 13 câu lệnh theo thứ tự.
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

CREATE TABLE IF NOT EXISTS `departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `department_code` VARCHAR(20) NOT NULL UNIQUE,
    `department_name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS `prerequisites` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `subject_id` INT NOT NULL,
    `prerequisite_subject_id` INT NOT NULL,
    `min_grade_required` FLOAT DEFAULT 4.0,
    CONSTRAINT `fk_prereq_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_prereq_req` FOREIGN KEY (`prerequisite_subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `uk_prerequisite` UNIQUE (`subject_id`, `prerequisite_subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS `course_classes` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `class_code` VARCHAR(30) NOT NULL UNIQUE,
    `subject_id` INT NOT NULL,
    `semester_id` INT NOT NULL,
    `lecturer_id` INT NULL,
    `max_students` INT DEFAULT 50,
    `current_students` INT DEFAULT 0,
    `grades_locked` BOOLEAN NOT NULL DEFAULT FALSE,
    `status` ENUM('OPEN', 'CLOSED', 'CANCELLED') DEFAULT 'OPEN',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_classes_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
    CONSTRAINT `fk_classes_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`),
    CONSTRAINT `fk_classes_lecturer` FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
