import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const StudentTimetable = () => {
    const [enrollments, setEnrollments] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEnrollments = async () => {
            try {
                const res = await axiosClient.get('/registration/my-enrollments');
                if (res.success) {
                    setEnrollments(res.data);
                }
            } catch (err) {
                console.error("Lỗi khi tải dữ liệu thời khóa biểu:", err);
            }
        };
        fetchEnrollments();
    }, []);

    // Tạo mảng 2 chiều 10 tiết x 7 ngày (thứ 2 - chủ nhật)
    const renderGrid = () => {
        const grid = {};
        for (let p = 1; p <= 10; p++) {
            grid[p] = {};
            for (let d = 2; d <= 8; d++) {
                grid[p][d] = null;
            }
        }

        enrollments.forEach(c => {
            if (c.schedules) {
                c.schedules.forEach(s => {
                    for (let i = 0; i < s.total_periods; i++) {
                        const period = s.start_period + i;
                        if (period <= 10) {
                            grid[period][s.day_of_week] = {
                                class_code: c.class_code,
                                subject_name: c.subject_name,
                                room: s.room
                            };
                        }
                    }
                });
            }
        });

        const rows = [];
        for (let p = 1; p <= 10; p++) {
            const cells = [];
            for (let d = 2; d <= 8; d++) {
                const cell = grid[p][d];
                if (cell) {
                    cells.push(
                        <td key={d}>
                            <div className="timetable-cell-content">
                                <strong>{cell.subject_name}</strong>
                                <div className="small">Lớp: {cell.class_code}</div>
                                <div className="small text-muted"><i className="bi bi-geo-alt"></i> {cell.room}</div>
                            </div>
                        </td>
                    );
                } else {
                    cells.push(<td key={d}></td>);
                }
            }
            rows.push(
                <tr key={p}>
                    <td className="timetable-period-label">Tiết {p}</td>
                    {cells}
                </tr>
            );
        }
        return rows;
    };

    return (
        <div className="student-pane">
            <div className="card shadow-sm border-0 p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h4 className="fw-bold mb-1"><i className="bi bi-calendar3-week text-primary me-2"></i>Thời Khóa Biểu Học Tập Tuần</h4>
                        <p className="text-muted small mb-0">Lịch học chi tiết theo tuần học từ Thứ Hai đến Chủ Nhật (10 tiết học / ngày)</p>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}>
                            <i className="bi bi-printer me-1"></i> In Lịch Học
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/student/registration')}>
                            <i className="bi bi-arrow-left me-1"></i> Đăng Ký Môn
                        </button>
                    </div>
                </div>

                <div className="timetable-wrapper mt-2">
                    <table className="timetable-table w-100">
                        <thead>
                            <tr>
                                <th className="timetable-period-label">Tiết</th>
                                <th>Thứ Hai</th>
                                <th>Thứ Ba</th>
                                <th>Thứ Tư</th>
                                <th>Thứ Năm</th>
                                <th>Thứ Sáu</th>
                                <th>Thứ Bảy</th>
                                <th>Chủ Nhật</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renderGrid()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentTimetable;
