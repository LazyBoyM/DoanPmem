import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

const LecturerTimetable = () => {
    const [scheduleItems, setScheduleItems] = useState([]);

    useEffect(() => {
        const fetchTimetable = async () => {
            try {
                const res = await axiosClient.get('/lecturer/timetable');
                if (res.success) {
                    setScheduleItems(res.data);
                }
            } catch (err) {
                console.error("Lỗi tải lịch giảng dạy:", err);
            }
        };
        fetchTimetable();
    }, []);

    const renderGrid = () => {
        const grid = {};
        for (let p = 1; p <= 10; p++) {
            grid[p] = {};
            for (let d = 2; d <= 8; d++) {
                grid[p][d] = null;
            }
        }

        scheduleItems.forEach(c => {
            for (let i = 0; i < c.total_periods; i++) {
                const period = c.start_period + i;
                if (period <= 10) {
                    grid[period][c.day_of_week] = {
                        class_code: c.class_code,
                        subject_name: c.subject_name,
                        room: c.room
                    };
                }
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
                            <div className="timetable-cell-content" style={{ borderLeftColor: '#f59e0b', background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
                                <strong style={{ color: '#92400e' }}>{cell.subject_name}</strong>
                                <div className="small" style={{ color: '#b45309' }}>Lớp: {cell.class_code}</div>
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
        <div className="lecturer-pane">
            <div className="card shadow-sm border-0 p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h4 className="fw-bold mb-1"><i className="bi bi-calendar-event text-primary me-2"></i>Lịch Giảng Dạy Tuần</h4>
                        <p className="text-muted small mb-0">Lịch phân công giảng dạy các lớp học phần hiện tại</p>
                    </div>
                    <div>
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => window.print()}>
                            <i className="bi bi-printer me-1"></i> In Lịch Giảng Dạy
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

export default LecturerTimetable;
