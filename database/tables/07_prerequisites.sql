-- Chọn database test rồi chạy toàn bộ câu lệnh này.
CREATE TABLE IF NOT EXISTS `prerequisites` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `subject_id` INT NOT NULL,
    `prerequisite_subject_id` INT NOT NULL,
    `min_grade_required` FLOAT DEFAULT 4.0,
    CONSTRAINT `fk_prereq_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_prereq_req` FOREIGN KEY (`prerequisite_subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
    CONSTRAINT `uk_prerequisite` UNIQUE (`subject_id`, `prerequisite_subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
