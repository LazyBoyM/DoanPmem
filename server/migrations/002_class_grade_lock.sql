-- Apply once to existing databases before starting the updated server.
ALTER TABLE course_classes ADD COLUMN grades_locked BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE course_classes c SET grades_locked = 1
WHERE EXISTS (SELECT 1 FROM enrollments e JOIN grades g ON g.enrollment_id = e.id
              WHERE e.course_class_id = c.id AND e.status = 'ENROLLED' AND g.is_locked = 1);
-- Keep a single active semester for legacy data.
UPDATE semesters SET is_active = 0 WHERE id <> (
    SELECT active_id FROM (SELECT MAX(id) AS active_id FROM semesters WHERE is_active = 1) AS active_semester
);
