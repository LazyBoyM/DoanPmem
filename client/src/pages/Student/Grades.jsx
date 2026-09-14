import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

const StudentGrades = () => {
    const [enrollments, setEnrollments] = useState([]);
    
    useEffect(() => {
        const fetchEnrollments = async () => {
            try {
                const res = await axiosClient.get('/registration/my-enrollments');
                if (res.success) {
                    setEnrollments(res.data);
                }
            } catch (err) {
                console.error("Lỗi tải điểm:", err);
            }
        };
        fetchEnrollments();
    }, []);

    const calculateGpa = () => {
        let totalCredits = 0;
        let sum10 = 0;
        let sum4 = 0;
        let passedCredits = 0;

        enrollments.forEach(e => {
            if (e.grade && e.grade.total_score_10 !== null) {
                const c = e.credits || 3;
                totalCredits += c;
                sum10 += e.grade.total_score_10 * c;
                sum4 += (e.grade.total_score_4 !== null ? e.grade.total_score_4 : 0) * c;
                if (e.grade.total_score_10 >= 4.0) passedCredits += c;
            }
        });

        return {
            gpa10: totalCredits > 0 ? (sum10 / totalCredits).toFixed(2) : '0.00',
            gpa4: totalCredits > 0 ? (sum4 / totalCredits).toFixed(2) : '0.00',
            totalCredits,
            passedCredits
        };
    };

    const gpa = calculateGpa();
    const progressPercent = Math.min((gpa.passedCredits / 150) * 100, 100).toFixed(1);

    return (
        <div className="student-pane">
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <div className="kpi-card kpi-card-blue">
                        <div className="d-flex justify-content-between align-items-start">
                            <span className="kpi-title">GPA Học Kỳ (Thang 4)</span>
                            <i className="bi bi-award kpi-icon"></i>
                        </div>
                        <div className="kpi-value">{gpa.gpa4}</div>
                        <small className="opacity-75">Hệ 10: <span>{gpa.gpa10}</span></small>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="kpi-card kpi-card-teal">
                        <div className="d-flex justify-content-between align-items-start">
                            <span className="kpi-title">Tín Chỉ Tích Lũy</span>
                            <i className="bi bi-journal-bookmark kpi-icon"></i>
                        </div>
                        <div className="kpi-value">{gpa.passedCredits}</div>
                        <small className="opacity-75">/ 150 TC Yêu Cầu</small>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="kpi-card bg-white border">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <span className="kpi-title text-dark">Tiến Độ Học Tập Toàn Khóa</span>
                            <span className="badge bg-success">{progressPercent}%</span>
                        </div>
                        <div className="progress" style={{ height: '10px' }}>
                            <div className="progress-bar bg-success" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <div className="d-flex justify-content-between mt-2 small text-muted">
                            <span>Bắt đầu (0 TC)</span>
                            <span>Tốt nghiệp (150 TC)</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-header-styled">
                    <h5><i className="bi bi-table text-primary"></i> Bảng Điểm Chi Tiết</h5>
                    <button className="btn btn-sm btn-outline-light"><i className="bi bi-download"></i> Tải Bảng Điểm PDF</button>
                </div>
                <div className="p-0 table-container-responsive">
                    <table className="table-modern text-center mb-0">
                        <thead>
                            <tr>
                                <th className="text-start">Mã Lớp HP</th>
                                <th className="text-start">Tên Môn Học</th>
                                <th>TC</th>
                                <th>Chuyên Cần (10%)</th>
                                <th>Giữa Kỳ (30%)</th>
                                <th>Cuối Kỳ (60%)</th>
                                <th>Tổng Kết Hệ 10</th>
                                <th>Hệ 4</th>
                                <th>Điểm Chữ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrollments.length > 0 ? enrollments.map(e => {
                                const g = e.grade || {};
                                return (
                                    <tr key={e.enrollment_id}>
                                        <td className="text-start fw-bold text-primary">{e.class_code}</td>
                                        <td className="text-start fw-semibold text-dark">{e.subject_name}</td>
                                        <td>{e.credits}</td>
                                        <td>{g.attendance_score !== null && g.attendance_score !== undefined ? g.attendance_score : '-'}</td>
                                        <td>{g.midterm_score !== null && g.midterm_score !== undefined ? g.midterm_score : '-'}</td>
                                        <td>{g.final_score !== null && g.final_score !== undefined ? g.final_score : '-'}</td>
                                        <td className="fw-bold text-primary">{g.total_score_10 !== null && g.total_score_10 !== undefined ? g.total_score_10 : '-'}</td>
                                        <td className="fw-bold">{g.total_score_4 !== null && g.total_score_4 !== undefined ? g.total_score_4 : '-'}</td>
                                        <td><span className={`badge ${g.letter_grade === 'F' ? 'bg-danger' : 'bg-success'}`}>{g.letter_grade || '-'}</span></td>
                                    </tr>
                                );
                            }) : (
                                <tr><td colSpan="9" className="text-center text-muted py-4">Chưa có dữ liệu bảng điểm.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentGrades;
