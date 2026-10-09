CREATE TABLE IF NOT EXISTS `resit_attempts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `enrollment_id` INT NOT NULL UNIQUE,
    `status` ENUM('REQUESTED', 'COMPLETED') NOT NULL DEFAULT 'REQUESTED',
    `original_final_score` DECIMAL(4,2) NOT NULL,
    `original_total_score` DECIMAL(4,2) NOT NULL,
    `score` DECIMAL(4,2) NULL,
    `requested_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `recorded_by` INT NULL,
    `recorded_at` TIMESTAMP NULL,
    CONSTRAINT `fk_resit_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_resit_recorder` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
