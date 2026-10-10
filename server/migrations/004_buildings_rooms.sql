CREATE TABLE IF NOT EXISTS `buildings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `building_code` VARCHAR(30) NOT NULL UNIQUE,
    `building_name` VARCHAR(100) NOT NULL,
    `location` VARCHAR(200) NOT NULL DEFAULT '',
    `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

ALTER TABLE class_schedules ADD COLUMN room_id INT NULL;
ALTER TABLE class_schedules MODIFY COLUMN room VARCHAR(80) NOT NULL;
INSERT INTO buildings (building_code, building_name, location, status)
SELECT 'LEGACY', 'Phòng chuyển đổi từ lịch cũ', '', 'ACTIVE'
WHERE EXISTS (SELECT 1 FROM class_schedules WHERE room_id IS NULL) AND NOT EXISTS (SELECT 1 FROM buildings WHERE building_code = 'LEGACY');
INSERT INTO rooms (building_id, room_code, room_name, capacity, floor, room_type, status)
SELECT b.id, COALESCE(NULLIF(UPPER(TRIM(s.room)), ''), 'UNASSIGNED'),
    COALESCE(NULLIF(UPPER(TRIM(s.room)), ''), 'UNASSIGNED'), GREATEST(1, MAX(c.max_students)), 0, 'LECTURE', 'ACTIVE'
FROM class_schedules s JOIN course_classes c ON c.id = s.course_class_id
JOIN buildings b ON b.building_code = 'LEGACY'
WHERE s.room_id IS NULL
GROUP BY b.id, COALESCE(NULLIF(UPPER(TRIM(s.room)), ''), 'UNASSIGNED')
ON DUPLICATE KEY UPDATE capacity = GREATEST(rooms.capacity, VALUES(capacity));
UPDATE class_schedules s JOIN buildings b ON b.building_code = 'LEGACY'
JOIN rooms r ON r.building_id = b.id AND r.room_code = COALESCE(NULLIF(UPPER(TRIM(s.room)), ''), 'UNASSIGNED')
SET s.room_id = r.id WHERE s.room_id IS NULL;
ALTER TABLE class_schedules MODIFY COLUMN room_id INT NOT NULL;
ALTER TABLE class_schedules ADD CONSTRAINT fk_schedules_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT;
CREATE INDEX idx_schedules_room ON class_schedules(room_id);
