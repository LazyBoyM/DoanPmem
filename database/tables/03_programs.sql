-- Chọn database test rồi chạy toàn bộ câu lệnh này.
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
