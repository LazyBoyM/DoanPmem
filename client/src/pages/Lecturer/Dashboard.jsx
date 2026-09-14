import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

const LecturerDashboard = () => {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [students, setStudents] = useState([]);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await axiosClient.get('/lecturer/my-classes');
                if (res.success) {
                    setClasses(res.data);
                    if (res.data.length > 0) {
                        setSelectedClass(res.data[0].id);
                    }
                }
            } catch (err) {
                console.error("Lỗi khi tải danh sách lớp", err);
            }
        };
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            fetchStudents(selectedClass);
        }
    }, [selectedClass]);

    const fetchStudents = async (classId) => {
        try {
            const res = await axiosClient.get(`/lecturer/class-students/${classId}`);
            if (res.success) {
                setStudents(res.data);
            }
        } catch (err) {
            console.error("Lỗi tải danh sách sinh viên", err);
        }
    };

    const handleGradeChange = (enrollmentId, field, value) => {
        setStudents(prev => prev.map(s => {
            if (s.enrollment_id === enrollmentId) {
                return { ...s, [field]: value };
            }
            return s;
        }));
    };

    const handleSaveGrade = async (student) => {
        try {
            const res = await axiosClient.post('/lecturer/update-grades', {
                enrollment_id: student.enrollment_id,
                attendance_score: student.attendance_score !== '' ? parseFloat(student.attendance_score) : null,
                midterm_score: student.midterm_score !== '' ? parseFloat(student.midterm_score) : null,
                final_score: student.final_score !== '' ? parseFloat(student.final_score) : null
            });

            if (res.success) {
                alert('Lưu kết quả học tập thành công!');
                fetchStudents(selectedClass); // Reload to get calculated total scores
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi lưu điểm');
        }
    };

    const handleToggleLock = async () => {
        if (!selectedClass) return;
        const isLocked = students.some(s => s.is_locked === 1);
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

    const isLocked = students.length > 0 && students.some(s => s.is_locked === 1);

    return (
        <div className="lecturer-pane">
            <div className="card shadow-sm border-0 p-4 mb-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 className="fw-bold mb-1"><i className="bi bi-journal-check text-warning me-2"></i>Quản Lý Lớp & Nhập Kết Quả Học Tập</h4>
                        <p className="text-muted small mb-0">Hệ thống tự động tính điểm Hệ 10, Hệ 4 và Điểm chữ tức thời theo công thức đào tạo tín chỉ</p>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        <button className={`btn ${isLocked ? 'btn-outline-warning' : 'btn-outline-danger'}`} onClick={handleToggleLock}>
                            <i className={`bi ${isLocked ? 'bi-unlock-fill' : 'bi-lock-fill'} me-1`}></i> 
                            {isLocked ? 'Mở Khóa Bảng Điểm' : 'Khóa Bảng Điểm'}
                        </button>
                        <button className="btn btn-success" onClick={() => window.open(`http://localhost:5000/api/reports/export-class-excel/${selectedClass}?token=${localStorage.getItem('token')}`, '_blank')}>
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
