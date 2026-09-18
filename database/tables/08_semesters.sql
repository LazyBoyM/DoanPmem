-- Chọn database test rồi chạy toàn bộ câu lệnh này.
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
