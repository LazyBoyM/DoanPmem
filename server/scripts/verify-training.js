// Explicit MySQL smoke check. All generated records are rolled back, including successful writes.
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const admin = require('../src/controllers/adminController');
const training = require('../src/controllers/trainingController');
const registration = require('../src/controllers/registrationController');

async function verify() {
    await db.initDb();
    if (db.isUsingMock()) throw new Error('This verification requires MySQL.');
    const pool = db.getPool(), originalPool = db.getPool;
    const connection = await pool.getConnection();
    let savepoint = 0;
    try {
        await connection.beginTransaction();
        const proxy = {
            query: connection.query.bind(connection),
            getConnection: async () => {
                const name = `verify_${++savepoint}`;
                return {
                    query: connection.query.bind(connection),
                    beginTransaction: async () => connection.query(`SAVEPOINT ${name}`),
                    commit: async () => connection.query(`RELEASE SAVEPOINT ${name}`),
                    rollback: async () => connection.query(`ROLLBACK TO SAVEPOINT ${name}`),
                    release() {},
                };
            },
        };
        db.getPool = () => proxy;
        const stamp = String(Date.now());
        const [[department]] = await connection.query('SELECT id FROM departments ORDER BY id LIMIT 1');
        const [[room]] = await connection.query("SELECT r.id FROM rooms r JOIN buildings b ON b.id = r.building_id WHERE r.status = 'ACTIVE' AND b.status = 'ACTIVE' AND r.capacity >= 10 ORDER BY r.id LIMIT 1");
        if (!department || !room) throw new Error('A department and an active room are required.');
        async function invoke(handler, body = {}, params = {}, user = { id: -1, role: 'ADMIN' }, expected = 200, query = {}) {
            let code = 200, result;
            await handler({ body, params, user, query }, { status(value) { code = value; return this; }, json(value) { result = value; } });
            assert.equal(code, expected, result?.message);
            return result;
        }
        const program = (await invoke(admin.createProgram, { program_code: `P${stamp}`, program_name: 'Verification program', department_id: department.id, total_credits: 6, duration_years: 4 })).data;
        const subject = (await invoke(admin.createSubject, { subject_code: `S${stamp}`, subject_name: 'Verification subject', department_id: department.id, credits: 3 })).data;
        await invoke(training.saveCurriculum, { subjects: [{ subject_id: subject.id, recommended_semester: 1, is_required: 1 }] }, { id: program.id });
        assert.equal((await invoke(training.getCurriculum, {}, { id: program.id })).data[0].credits, 3);
        await invoke(training.updateProgram, { program_name: 'Updated verification program' }, { id: program.id });
        const semester = (await invoke(admin.createSemester, { semester_code: `T${stamp}`, semester_name: 'Verification semester', academic_year: '2098-2099', start_date: '2098-09-01', end_date: '2099-01-01' })).data;
        await invoke(training.updateSemester, { semester_name: 'Updated verification semester' }, { id: semester.id });
        const period = (await invoke(admin.createRegistrationPeriod, { semester_id: semester.id, name: 'Verification period', start_time: '2000-01-01 00:00:00', end_time: '2099-01-01 00:00:00', min_credits: 3, max_credits: 6 })).data;
        await invoke(training.updatePeriod, { name: 'Updated verification period' }, { id: period.id });
        const student = (await invoke(admin.createStudent, { student_code: `V${stamp}`, full_name: 'Verification student', class_name: 'VERIFY', program_id: program.id, email: `verify${stamp}@example.com` })).data;
        const user = { role: 'STUDENT', student_id: student.id, id: student.user_id };
        const cls = (await invoke(admin.createCourseClass, { class_code: `C${stamp}`, subject_id: subject.id, semester_id: semester.id, max_students: 10, schedules: [{ room_id: room.id, day_of_week: 2, start_period: 1, total_periods: 3, week_from: 1, week_to: 16 }] })).data;
        await invoke(training.updateClass, { class_code: `E${stamp}`, max_students: 10 }, { id: cls.id });
        await invoke(training.submitRegistration, { semester_id: semester.id }, {}, user, 400);
        await invoke(registration.registerClass, { course_class_id: cls.id }, {}, user);
        await invoke(training.submitRegistration, { semester_id: semester.id }, {}, user);
        assert.equal((await invoke(training.getSubmission, {}, {}, user, 200, { semester_id: semester.id })).data.total_credits, 3);
        const plans = await invoke(training.getRegistrationPlans, {}, { id: semester.id });
        assert.equal(plans.data.find(s => s.student_id === student.id).status, 'SUBMITTED');
        const [[enrollment]] = await connection.query('SELECT id FROM enrollments WHERE student_id = ? AND course_class_id = ?', [student.id, cls.id]);
        await invoke(registration.cancelEnrollment, { enrollment_id: enrollment.id }, {}, user);
        assert.equal((await invoke(training.getSubmission, {}, {}, user, 200, { semester_id: semester.id })).data, null);
        await invoke(training.deleteProgram, {}, { id: program.id }, undefined, 409);
        console.log('MySQL verification passed: curriculum, semester, period, class, registration and submission.');
    } finally {
        db.getPool = originalPool;
        await connection.rollback();
        connection.release();
        await pool.end();
        console.log('Verification transaction rolled back; no verification records retained.');
    }
}
verify().catch(error => { console.error(error.code || error.message); process.exitCode = 1; });
