-- Chọn database test rồi chạy toàn bộ câu lệnh này.
CREATE TABLE IF NOT EXISTS `class_schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `course_class_id` INT NOT NULL,
    `day_of_week` INT NOT NULL COMMENT '2: Thứ 2, 3: Thứ 3, ..., 8: Chủ nhật',
    `start_period` INT NOT NULL COMMENT 'Tiết 1 đến 12',
    `total_periods` INT NOT NULL COMMENT 'Số tiết (vd: 3 tiết)',
    `room` VARCHAR(30) NOT NULL,
    `week_from` INT DEFAULT 1,
    `week_to` INT DEFAULT 16,
    CONSTRAINT `fk_schedules_class` FOREIGN KEY (`course_class_id`) REFERENCES `course_classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
