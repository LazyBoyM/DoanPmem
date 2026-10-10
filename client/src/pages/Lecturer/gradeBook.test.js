import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasGradeChanges, invalidGrade, gradePayload, mergeSavedGrade } from './gradeBook.js';

test('draft comparison preserves blank and zero semantics', () => {
    const saved = { attendance_score: null, midterm_score: 8.5, final_score: 0 };
    assert.equal(hasGradeChanges({ attendance_score: '', midterm_score: '8.50', final_score: '0' }, saved), false);
    assert.equal(hasGradeChanges({ ...saved, final_score: '' }, saved), true);
    assert.deepEqual(gradePayload(saved), saved);
});
test('score validation rejects invalid ranges and non-numeric values', () => {
    for (const value of [-1, 11, 'bad', Infinity]) assert.equal(invalidGrade({ final_score: value }), true);
    for (const value of [null, '', 0, '10', 8.5]) assert.equal(invalidGrade({ final_score: value }), false);
});
test('saving one row keeps other drafts and adopts server results including resit adjustment', () => {
    const otherDraft = { enrollment_id: 2, final_score: '9' };
    const view = { students: [{ enrollment_id: 1, final_score: '5' }, otherDraft], saved: { 2: { final_score: 6 } } };
    const grade = { final_score: 8, total_score_10: 8.3, letter_grade: 'B+' };
    const merged = mergeSavedGrade(view, 1, grade);
    assert.equal(merged.students[1], otherDraft);
    assert.equal(hasGradeChanges(merged.students[1], merged.saved[2]), true);
    assert.equal(merged.students[0].final_score, 8);
    assert.equal(merged.students[0].total_score_10, 8.3);
    assert.equal(hasGradeChanges(merged.students[0], merged.saved[1]), false);
});
