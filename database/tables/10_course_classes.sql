-- Chọn database test rồi chạy toàn bộ câu lệnh này.
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
