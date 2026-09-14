import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';

const ManageClasses = () => {
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            // Using the existing student open-classes endpoint to list them, or there might be an admin specific one
            const res = await axiosClient.get('/registration/open-classes');
            if (res.success) {
                setClasses(res.data);
            }
        } catch (err) {
            console.error("Lỗi lấy danh sách lớp học phần:", err);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
            const res = await axiosClient.put(`/admin/classes/${id}/status`, { status: newStatus });
            if (res.success) {
                fetchClasses();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái lớp');
        }
    };

    return (
        <div className="admin-pane">
            <div className="card shadow-sm border-0 p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <h4 className="fw-bold mb-1"><i className="bi bi-collection-play text-primary me-2"></i>Quản Trị Lớp Học Phần</h4>
                        <p className="text-muted small mb-0">Mở lớp, phân công giảng viên, xếp lịch học và đóng/mở đăng ký</p>
                    </div>
                    <button className="btn btn-primary btn-sm">
                        <i className="bi bi-plus-circle me-1"></i> Mở Lớp Học Phần Mới
                    </button>
                </div>
                <div className="table-container-responsive">
                    <table className="table-modern text-center">
                        <thead>
                            <tr>
                                <th>Mã Lớp HP</th>
                                <th className="text-start">Môn Học</th>
                                <th className="text-start">Giảng Viên Phụ Trách</th>
                                <th>Đã Đăng Ký</th>
                                <th>Trạng Thái</th>
                                <th>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {classes.map(c => (
                                <tr key={c.id}>
                                    <td className="fw-bold text-primary">{c.class_code}</td>
                                    <td className="text-start fw-semibold">{c.subject_name}</td>
                                    <td className="text-start">{c.lecturer_name || 'Chưa xếp'}</td>
                                    <td>
                                        <span className={c.current_students >= c.max_students ? 'text-danger fw-bold' : ''}>
                                            {c.current_students} / {c.max_students}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${c.status === 'OPEN' ? 'bg-success' : 'bg-danger'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button 
                                            className={`btn btn-sm ${c.status === 'OPEN' ? 'btn-outline-danger' : 'btn-outline-success'} mx-1`}
                                            onClick={() => toggleStatus(c.id, c.status)}
                                            title={c.status === 'OPEN' ? 'Đóng lớp' : 'Mở lớp'}
                                        >
                                            <i className={`bi ${c.status === 'OPEN' ? 'bi-lock' : 'bi-unlock'}`}></i>
                                        </button>
                                        <button className="btn btn-sm btn-outline-primary mx-1" title="Sửa thông tin lớp">
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {classes.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">Không có dữ liệu.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManageClasses;
