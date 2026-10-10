export const scoreFields = ['attendance_score', 'midterm_score', 'final_score'];
export const scoreLabels = ['Chuyên cần', 'Giữa kỳ', 'Cuối kỳ'];
export const scoreWeights = [10, 30, 60];

const comparable = value => value == null || value === '' ? null : Number(value);
export const hasGradeChanges = (student, saved) => Boolean(saved) && scoreFields.some(field => comparable(student[field]) !== comparable(saved[field]));
export const invalidGrade = student => scoreFields.some(field => student[field] != null && student[field] !== '' && (!Number.isFinite(Number(student[field])) || Number(student[field]) < 0 || Number(student[field]) > 10));
export const gradePayload = student => Object.fromEntries(scoreFields.map(field => [field, comparable(student[field])]));
export const mergeSavedGrade = (view, enrollmentId, grade) => ({
    ...view,
    students: view.students.map(student => student.enrollment_id === enrollmentId ? { ...student, ...grade } : student),
    saved: { ...view.saved, [enrollmentId]: grade }
});
