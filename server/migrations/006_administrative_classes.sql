CREATE TABLE IF NOT EXISTS administrative_classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO administrative_classes (class_name)
SELECT DISTINCT TRIM(class_name) FROM students
WHERE class_name IS NOT NULL AND TRIM(class_name) <> ''
ON DUPLICATE KEY UPDATE class_name = VALUES(class_name);
