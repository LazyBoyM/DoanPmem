-- Chọn database test rồi chạy toàn bộ câu lệnh này.
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
