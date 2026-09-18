-- Chọn database test rồi chạy toàn bộ câu lệnh này.
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
