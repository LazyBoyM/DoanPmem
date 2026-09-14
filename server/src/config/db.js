const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let pool = null;
let isConnected = false;

// Mock in-memory database fallback
const mockDb = {
    users: [
        { id: 1, username: 'admin', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', email: 'admin@utt.edu.vn', role: 'ADMIN', status: 1 },
        { id: 2, username: 'gv_thuan', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', email: 'thuanpt@utt.edu.vn', role: 'LECTURER', status: 1 },
        { id: 3, username: 'gv_nam', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', email: 'namnv@utt.edu.vn', role: 'LECTURER', status: 1 },
        { id: 4, username: '74dctt25001', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', email: 'hieplv@sinhvien.utt.edu.vn', role: 'STUDENT', status: 1 },
        { id: 5, username: '74dctt25002', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', email: 'huybd@sinhvien.utt.edu.vn', role: 'STUDENT', status: 1 },
        { id: 6, username: '74dctt25003', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', email: 'minhnla@sinhvien.utt.edu.vn', role: 'STUDENT', status: 1 },
        { id: 7, username: '74dctt25004', password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', email: 'vienvn@sinhvien.utt.edu.vn', role: 'STUDENT', status: 1 }
    ],
    departments: [
        { id: 1, department_code: 'CNTT', department_name: 'Khoa Công nghệ Thông tin', phone: '02438544264', email: 'cntt@utt.edu.vn' },
        { id: 2, department_code: 'KTXD', department_name: 'Khoa Công trình', phone: '02438544265', email: 'ktxd@utt.edu.vn' }
    ],
    programs: [
        { id: 1, program_code: '7480201', program_name: 'Công nghệ Thông tin', department_id: 1, total_credits: 135, duration_years: 4.0 }
    ],
    lecturers: [
        { id: 1, user_id: 2, lecturer_code: 'GV001', full_name: 'ThS. Phạm Thị Thuận', degree: 'Thạc sĩ', department_id: 1, phone: '0912345678', email: 'thuanpt@utt.edu.vn' },
        { id: 2, user_id: 3, lecturer_code: 'GV002', full_name: 'TS. Nguyễn Văn Nam', degree: 'Tiến sĩ', department_id: 1, phone: '0987654321', email: 'namnv@utt.edu.vn' }
    ],
    students: [
        { id: 1, user_id: 4, student_code: '74DCTT25001', full_name: 'Lê Văn Hiệp', gender: 'Nam', birth_date: '2004-05-12', phone: '0911000001', program_id: 1, academic_year: 'K74', class_name: '2DCTT745', program_name: 'Công nghệ Thông tin' },
        { id: 2, user_id: 5, student_code: '74DCTT25002', full_name: 'Bùi Đức Huy', gender: 'Nam', birth_date: '2004-08-20', phone: '0911000002', program_id: 1, academic_year: 'K74', class_name: '2DCTT745', program_name: 'Công nghệ Thông tin' },
        { id: 3, user_id: 6, student_code: '74DCTT25003', full_name: 'Nguyễn Lê Anh Minh', gender: 'Nam', birth_date: '2004-11-15', phone: '0911000003', program_id: 1, academic_year: 'K74', class_name: '2DCTT745', program_name: 'Công nghệ Thông tin' },
        { id: 4, user_id: 7, student_code: '74DCTT25004', full_name: 'Vũ Ngọc Viên', gender: 'Nam', birth_date: '2004-03-09', phone: '0911000004', program_id: 1, academic_year: 'K74', class_name: '2DCTT745', program_name: 'Công nghệ Thông tin' }
    ],
    subjects: [
        { id: 1, subject_code: 'INT1001', subject_name: 'Lập trình Cơ sở', credits: 3, theory_periods: 30, practice_periods: 15, department_id: 1 },
        { id: 2, subject_code: 'INT1002', subject_name: 'Lập trình Hướng đối tượng', credits: 3, theory_periods: 30, practice_periods: 15, department_id: 1 },
        { id: 3, subject_code: 'INT1003', subject_name: 'Cơ sở Dữ liệu', credits: 3, theory_periods: 30, practice_periods: 15, department_id: 1 },
        { id: 4, subject_code: 'INT1004', subject_name: 'Phát triển Phần mềm Ứng dụng', credits: 3, theory_periods: 30, practice_periods: 15, department_id: 1 },
        { id: 5, subject_code: 'INT1005', subject_name: 'Công nghệ Web', credits: 3, theory_periods: 30, practice_periods: 15, department_id: 1 },
        { id: 6, subject_code: 'MAT1001', subject_name: 'Toán Rời rạc', credits: 3, theory_periods: 45, practice_periods: 0, department_id: 1 }
    ],
    prerequisites: [
        { subject_id: 2, prerequisite_subject_id: 1, min_grade_required: 4.0 },
        { subject_id: 4, prerequisite_subject_id: 2, min_grade_required: 4.0 },
        { subject_id: 4, prerequisite_subject_id: 3, min_grade_required: 4.0 }
    ],
    semesters: [
        { id: 1, semester_code: 'HK1_2026_2027', semester_name: 'Học kỳ 1 - 2026-2027', academic_year: '2026-2027', start_date: '2026-09-01', end_date: '2027-01-15', is_active: 1 }
    ],
    registration_periods: [
        { id: 1, semester_id: 1, name: 'Đợt 1: Đăng ký học phần chính thức HK1', start_time: '2026-09-01 00:00:00', end_time: '2026-10-30 23:59:59', min_credits: 12, max_credits: 24, is_active: 1 }
    ],
    course_classes: [
        { id: 1, class_code: 'LHP_INT1004_01', subject_id: 4, subject_code: 'INT1004', subject_name: 'Phát triển Phần mềm Ứng dụng', credits: 3, semester_id: 1, lecturer_id: 1, lecturer_name: 'ThS. Phạm Thị Thuận', max_students: 50, current_students: 4, status: 'OPEN' },
        { id: 2, class_code: 'LHP_INT1005_01', subject_id: 5, subject_code: 'INT1005', subject_name: 'Công nghệ Web', credits: 3, semester_id: 1, lecturer_id: 2, lecturer_name: 'TS. Nguyễn Văn Nam', max_students: 45, current_students: 2, status: 'OPEN' },
        { id: 3, class_code: 'LHP_INT1003_01', subject_id: 3, subject_code: 'INT1003', subject_name: 'Cơ sở Dữ liệu', credits: 3, semester_id: 1, lecturer_id: 1, lecturer_name: 'ThS. Phạm Thị Thuận', max_students: 60, current_students: 0, status: 'OPEN' },
        { id: 4, class_code: 'LHP_MAT1001_01', subject_id: 6, subject_code: 'MAT1001', subject_name: 'Toán Rời rạc', credits: 3, semester_id: 1, lecturer_id: 2, lecturer_name: 'TS. Nguyễn Văn Nam', max_students: 50, current_students: 0, status: 'OPEN' }
    ],
    class_schedules: [
        { id: 1, course_class_id: 1, day_of_week: 2, start_period: 1, total_periods: 3, room: '301-A1', week_from: 1, week_to: 16 },
        { id: 2, course_class_id: 2, day_of_week: 4, start_period: 4, total_periods: 3, room: '402-A2', week_from: 1, week_to: 16 },
        { id: 3, course_class_id: 3, day_of_week: 2, start_period: 2, total_periods: 3, room: '205-A1', week_from: 1, week_to: 16 },
        { id: 4, course_class_id: 4, day_of_week: 6, start_period: 7, total_periods: 3, room: '102-A3', week_from: 1, week_to: 16 }
    ],
    enrollments: [
        { id: 1, student_id: 1, course_class_id: 1, status: 'ENROLLED', enrollment_time: '2026-09-02 08:30:00' },
        { id: 2, student_id: 2, course_class_id: 1, status: 'ENROLLED', enrollment_time: '2026-09-02 08:35:00' },
        { id: 3, student_id: 3, course_class_id: 1, status: 'ENROLLED', enrollment_time: '2026-09-02 08:40:00' },
        { id: 4, student_id: 4, course_class_id: 1, status: 'ENROLLED', enrollment_time: '2026-09-02 08:45:00' },
        { id: 5, student_id: 1, course_class_id: 2, status: 'ENROLLED', enrollment_time: '2026-09-02 09:00:00' },
        { id: 6, student_id: 2, course_class_id: 2, status: 'ENROLLED', enrollment_time: '2026-09-02 09:05:00' }
    ],
    grades: [
        { id: 1, enrollment_id: 1, attendance_score: 9.0, midterm_score: 8.5, final_score: 8.0, total_score_10: 8.3, total_score_4: 3.5, letter_grade: 'B+', is_locked: 0 },
        { id: 2, enrollment_id: 2, attendance_score: 8.0, midterm_score: 7.0, final_score: 7.5, total_score_10: 7.4, total_score_4: 3.0, letter_grade: 'B', is_locked: 0 }
    ]
};

async function initDb() {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'training_management',
            port: parseInt(process.env.DB_PORT || '3306', 10),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const conn = await pool.getConnection();
        conn.release();
        isConnected = true;
        console.log('✅ Connected to MySQL database successfully.');
    } catch (err) {
        console.warn('⚠️  MySQL connection failed (' + err.message + ').');
        if (process.env.USE_MOCK_IF_NO_DB !== 'false') {
            console.log('💡 Running in Mock In-Memory Database Mode for demo/testing.');
            isConnected = false;
        } else {
            throw err;
        }
    }
}

module.exports = {
    initDb,
    getPool: () => pool,
    isUsingMock: () => !isConnected,
    mockDb
};
