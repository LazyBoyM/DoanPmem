CREATE TABLE IF NOT EXISTS `registration_submissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `semester_id` INT NOT NULL,
    `period_id` INT NOT NULL,
    `total_credits` INT NOT NULL,
    `submitted_at` DATETIME NOT NULL,
    UNIQUE KEY `uq_submission_student_semester` (`student_id`, `semester_id`),
    CONSTRAINT `fk_submission_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_submission_semester` FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_submission_period` FOREIGN KEY (`period_id`) REFERENCES `registration_periods` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
