CREATE TABLE IF NOT EXISTS `rooms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `building_id` INT NOT NULL,
    `room_code` VARCHAR(30) NOT NULL,
    `room_name` VARCHAR(100) NOT NULL,
    `capacity` INT NOT NULL,
    `floor` INT NOT NULL DEFAULT 0,
    `room_type` ENUM('LECTURE','COMPUTER','LAB') NOT NULL DEFAULT 'LECTURE',
    `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    UNIQUE KEY `uq_room_building_code` (`building_id`, `room_code`),
    CONSTRAINT `fk_rooms_building` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `chk_room_capacity` CHECK (`capacity` BETWEEN 1 AND 1000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
