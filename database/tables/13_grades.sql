-- Chọn database test rồi chạy toàn bộ câu lệnh này.
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
