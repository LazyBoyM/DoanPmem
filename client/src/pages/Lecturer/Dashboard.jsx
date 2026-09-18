import React, { useEffect, useState, useCallback } from 'react';
import { useAcademic } from '../../context/academic-context';
import SemesterSelect from '../../components/SemesterSelect';
import axiosClient from '../../api/axiosClient';
import { downloadFile } from '../../api/download';

const LecturerDashboard = () => {
    const { semesterId } = useAcademic();
    const [classResult, setClassResult] = useState({ semesterId: '', data: [] });
    const [selectedClass, setSelectedClass] = useState('');
    const [view, setView] = useState({ classId: '', students: [], course: null });
    const [error, setError] = useState('');
    const classes = classResult.semesterId === semesterId ? classResult.data : [];
    const validSelection = classes.some(c => String(c.id) === String(selectedClass));
    const students = validSelection && view.classId === String(selectedClass) ? view.students : [];
    const course = validSelection && view.classId === String(selectedClass) ? view.course : null;
    useEffect(() => {
        const controller = new AbortController();
        if (semesterId) axiosClient.get('/lecturer/my-classes', { params: { semester_id: semesterId }, signal: controller.signal })
            .then(res => { setClassResult({ semesterId, data: res.data }); setSelectedClass(String(res.data[0]?.id || '')); setError(''); })
            .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Không tải được danh sách lớp.'); });
        return () => controller.abort();
    }, [semesterId]);
    const fetchStudents = useCallback(async (classId, signal) => {
        try {
            const res = await axiosClient.get(`/lecturer/class-students/${classId}`, { signal });
            if (!signal?.aborted) { setView({ classId: String(classId), students: res.data, course: res.course_class }); setError(''); }
        } catch (err) { if (!signal?.aborted) setError(err.response?.data?.message || 'Không tải được sinh viên.'); }
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        // State updates occur after the HTTP response, not synchronously in this effect.
        // eslint-disable-next-line react/set-state-in-effect
        if (validSelection) fetchStudents(selectedClass, controller.signal);
        return () => controller.abort();
    }, [selectedClass, validSelection, fetchStudents]);
    const handleGradeChange = (enrollmentId, field, value) => {
        setView(prev => ({ ...prev, students: prev.students.map(s => s.enrollment_id === enrollmentId ? { ...s, [field]: value } : s) }));
    };

    const handleSaveGrade = async (student) => {
        try {
            const res = await axiosClient.post('/lecturer/update-grades', {
                enrollment_id: student.enrollment_id,
                attendance_score: student.attendance_score === '' ? null : student.attendance_score,
                midterm_score: student.midterm_score === '' ? null : student.midterm_score,
                final_score: student.final_score === '' ? null : student.final_score
            });

            if (res.success) {
                alert('Lưu kết quả học tập thành công!');
                fetchStudents(selectedClass); // Reload to get calculated total scores
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi lưu điểm');
        }
    };

    const handleExport = async () => {
        if (!selectedClass) return;
        try {
            await downloadFile(`/reports/export-class-excel/${selectedClass}`, `Danh_sach_lop_${selectedClass}.xlsx`);
        } catch {
            alert('Không thể xuất danh sách lớp.');
        }
    };

    const handleToggleLock = async () => {
        if (!selectedClass) return;
        const isLocked = Boolean(course?.grades_locked) || students.some(s => s.is_locked === 1);
        const willLock = !isLocked;

        try {
            const res = await axiosClient.put(`/lecturer/lock-grades/${selectedClass}`, { is_locked: willLock ? 1 : 0 });
            if (res.success) {
                alert(res.message);
                fetchStudents(selectedClass);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi khóa điểm');
        }
    };

    const isLocked = Boolean(course?.grades_locked) || students.some(s => s.is_locked === 1);

    return (
        <div className="lecturer-pane">
            <SemesterSelect />
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            <div className="card shadow-sm border-0 p-4 mb-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 className="fw-bold mb-1"><i className="bi bi-journal-check text-warning me-2"></i>Quản Lý Lớp & Nhập Kết Quả Học Tập</h4>
                        <p className="text-muted small mb-0">Hệ thống tự động tính điểm Hệ 10, Hệ 4 và Điểm chữ tức thời theo công thức đào tạo tín chỉ</p>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        <button className={`btn ${isLocked ? 'btn-outline-warning' : 'btn-outline-danger'}`} disabled={!course} onClick={handleToggleLock}>
                            <i className={`bi ${isLocked ? 'bi-unlock-fill' : 'bi-lock-fill'} me-1`}></i>
                            {isLocked ? 'Mở Khóa Bảng Điểm' : 'Khóa Bảng Điểm'}
                        </button>
                        <button className="btn btn-success" disabled={!course} onClick={handleExport}>
                            <i className="bi bi-file-earmark-excel me-1"></i> Xuất File Excel Lớp
                        </button>
                    </div>
                </div>

                <div className="row g-3 mb-4">
                    <div className="col-md-6">
                        <label className="form-label fw-bold small text-secondary">CHỌN LỚP HỌC PHẦN PHỤ TRÁCH:</label>
                        <select
                            className="form-select form-select-lg"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.class_code} - {c.subject_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="table-container-responsive">
                    <table className="table-modern text-center">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Mã SV</th>
                                <th className="text-start">Họ và Tên</th>
                                <th>Lớp SH</th>
                                <th>Chuyên Cần (10%)</th>
                                <th>Giữa Kỳ (30%)</th>
                                <th>Cuối Kỳ (60%)</th>
                                <th>Tổng Kết Hệ 10</th>
                                <th>Hệ 4</th>
                                <th>Điểm Chữ</th>
                                <th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length > 0 ? students.map((s, idx) => (
                                <tr key={s.enrollment_id}>
                                    <td>{idx + 1}</td>
                                    <td className="fw-bold text-primary">{s.student_code}</td>
                                    <td className="text-start fw-semibold text-dark">{s.full_name}</td>
                                    <td>{s.class_name}</td>
                                    <td>
                                        <input
                                            type="number" step="0.1" min="0" max="10"
                                            disabled={isLocked}
                                            className="form-control form-control-sm grade-input mx-auto"
                                            value={s.attendance_score !== null ? s.attendance_score : ''}
                                            onChange={(e) => handleGradeChange(s.enrollment_id, 'attendance_score', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number" step="0.1" min="0" max="10"
                                            disabled={isLocked}
                                            className="form-control form-control-sm grade-input mx-auto"
                                            value={s.midterm_score !== null ? s.midterm_score : ''}
                                            onChange={(e) => handleGradeChange(s.enrollment_id, 'midterm_score', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number" step="0.1" min="0" max="10"
                                            disabled={isLocked}
                                            className="form-control form-control-sm grade-input mx-auto"
                                            value={s.final_score !== null ? s.final_score : ''}
                                            onChange={(e) => handleGradeChange(s.enrollment_id, 'final_score', e.target.value)}
                                        />
                                    </td>
                                    <td className="fw-bold text-primary">{s.total_score_10 !== null ? s.total_score_10 : '-'}</td>
                                    <td className="fw-bold">{s.total_score_4 !== null ? s.total_score_4 : '-'}</td>
                                    <td><span className={`badge ${s.letter_grade === 'F' ? 'bg-danger' : 'bg-success'}`}>{s.letter_grade || '-'}</span></td>
                                    <td>
                                        <button
                                            className={`btn btn-primary btn-sm px-3 ${isLocked ? 'disabled' : ''}`}
                                            onClick={() => handleSaveGrade(s)}
                                        >
                                            <i className="bi bi-floppy me-1"></i> Lưu
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="11" className="text-center py-4 text-muted">Lớp học phần này hiện chưa có sinh viên nào đăng ký.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LecturerDashboard;
