-- Chọn database test rồi chạy toàn bộ câu lệnh này.
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
