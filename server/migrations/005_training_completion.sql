CREATE TABLE IF NOT EXISTS `program_subjects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `program_id` INT NOT NULL,
    `subject_id` INT NOT NULL,
    `recommended_semester` INT NOT NULL,
    `is_required` TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY `uq_program_subject` (`program_id`, `subject_id`),
    CONSTRAINT `fk_curriculum_program` FOREIGN KEY (`program_id`) REFERENCES `programs` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_curriculum_subject` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
