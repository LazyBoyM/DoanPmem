-- Chọn database test rồi chạy toàn bộ câu lệnh này.
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
