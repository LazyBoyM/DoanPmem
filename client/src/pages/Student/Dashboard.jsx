import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const StudentRegistration = () => {
    const [openClasses, setOpenClasses] = useState([]);
    const [filteredClasses, setFilteredClasses] = useState([]);
    const [myEnrollments, setMyEnrollments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [classesRes, enrollmentsRes] = await Promise.all([
                axiosClient.get('/registration/open-classes'),
                axiosClient.get('/registration/my-enrollments')
            ]);
            
            if (classesRes.success) {
                setOpenClasses(classesRes.data);
                setFilteredClasses(classesRes.data);
            }
            if (enrollmentsRes.success) {
                setMyEnrollments(enrollmentsRes.data);
            }
        } catch (err) {
            console.error("Lỗi khi tải dữ liệu đăng ký:", err);
        }
    };

    const handleSearch = (e) => {
        const term = e.target.value.toLowerCase();
        setSearchTerm(term);
        const filtered = openClasses.filter(c => 
            c.class_code.toLowerCase().includes(term) ||
            c.subject_name.toLowerCase().includes(term) ||
            (c.lecturer_name && c.lecturer_name.toLowerCase().includes(term))
        );
        setFilteredClasses(filtered);
    };

    const handleEnroll = async (classId) => {
        try {
            const res = await axiosClient.post('/registration/enroll', { class_id: classId });
            if (res.success) {
                alert('Đăng ký học phần thành công!');
                fetchData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi đăng ký học phần');
        }
    };

    const handleCancelEnrollment = async (enrollmentId) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy đăng ký lớp học phần này?')) return;
        try {
            const res = await axiosClient.post(`/registration/cancel`, { enrollment_id: enrollmentId });
            if (res.success) {
                alert('Đã hủy đăng ký thành công.');
                fetchData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi hủy đăng ký');
        }
    };

    const totalCredits = myEnrollments.reduce((sum, item) => sum + item.credits, 0);
    const progressPercent = Math.min((totalCredits / 24) * 100, 100);

    return (
        <div className="student-pane">
            <div className="row g-4">
                {/* Cột danh sách lớp mở */}
                <div className="col-lg-8">
                    <div className="card shadow-sm border-0">
                        <div className="card-header-styled">
                            <h5><i className="bi bi-collection-play text-primary"></i> Các Lớp Học Phần Đang Mở Đăng Ký</h5>
                            <span className="badge-soft-primary">{filteredClasses.length} Lớp</span>
                        </div>
                        <div className="p-3">
                            <div className="input-group mb-3">
                                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="Tìm theo mã lớp, tên môn học, giảng viên phụ trách..." 
                                    value={searchTerm}
                                    onChange={handleSearch}
                                />
                            </div>

                            <div className="table-container-responsive">
                                <table className="table-modern">
                                    <thead>
                                        <tr>
                                            <th>Mã Lớp HP</th>
                                            <th>Tên Học Phần</th>
                                            <th>Số TC</th>
                                            <th>Giảng Viên</th>
                                            <th>Lịch Học</th>
                                            <th>Sĩ Số / Slot</th>
                                            <th className="text-center">Thao Tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClasses.length > 0 ? filteredClasses.map(c => {
                                            const isEnrolled = myEnrollments.some(e => e.class_id === c.id);
                                            const isFull = c.current_students >= c.max_students;
                                            
                                            let btnClass = 'btn-outline-primary';
                                            let btnText = 'Đăng Ký';
                                            let disabled = false;

                                            if (isEnrolled) {
                                                btnClass = 'btn-success disabled';
                                                btnText = 'Đã ĐK';
                                                disabled = true;
                                            } else if (isFull) {
                                                btnClass = 'btn-secondary disabled';
                                                btnText = 'Hết Chỗ';
                                                disabled = true;
                                            }

                                            return (
                                                <tr key={c.id}>
                                                    <td className="fw-bold text-primary">{c.class_code}</td>
                                                    <td className="fw-semibold">{c.subject_name}</td>
                                                    <td>{c.credits}</td>
                                                    <td>{c.lecturer_name || 'Chưa xếp'}</td>
                                                    <td>Thứ {c.day_of_week}, Tiết {c.start_period}-{c.start_period + c.total_periods - 1} <br/> <small className="text-muted">{c.room}</small></td>
                                                    <td><span className={isFull ? 'text-danger fw-bold' : ''}>{c.current_students} / {c.max_students}</span></td>
                                                    <td className="text-center">
                                                        <button 
                                                            className={`btn btn-sm px-3 fw-semibold ${btnClass}`}
                                                            disabled={disabled}
                                                            onClick={() => handleEnroll(c.id)}
                                                        >
                                                            {btnText}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan="7" className="text-center text-muted py-4">Không tìm thấy lớp học phần nào.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cột giỏ môn học đã đăng ký */}
                <div className="col-lg-4">
                    <div className="card shadow-sm border-0 sticky-top" style={{ top: '90px' }}>
                        <div className="card-header-styled">
                            <h5><i className="bi bi-cart-check text-success"></i> Giỏ Môn Đã Đăng Ký</h5>
                            <span className="badge bg-primary">{totalCredits} / 24 TC</span>
                        </div>
                        <div className="p-3">
                            <div className="d-flex justify-content-between small text-muted mb-2">
                                <span>Giới hạn: Tối thiểu 12 TC</span>
                                <span>Tối đa: 24 TC</span>
                            </div>
                            <div className="progress mb-3" style={{ height: '8px' }}>
                                <div className={`progress-bar ${totalCredits >= 12 ? 'bg-success' : 'bg-warning'}`} style={{ width: `${progressPercent}%` }}></div>
                            </div>

                            <div className="list-group list-group-flush mb-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {myEnrollments.length > 0 ? myEnrollments.map(e => (
                                    <div className="list-group-item px-0 py-3 border-bottom" key={e.enrollment_id}>
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <h6 className="mb-1 fw-bold text-dark">{e.subject_name}</h6>
                                                <div className="small text-muted mb-1">
                                                    Mã Lớp: <span className="text-primary">{e.class_code}</span> • {e.credits} TC
                                                </div>
                                                <div className="small text-muted">
                                                    <i className="bi bi-clock"></i> Thứ {e.day_of_week} (Tiết {e.start_period}-{e.start_period + e.total_periods - 1})
                                                </div>
                                            </div>
                                            <button 
                                                className="btn btn-outline-danger btn-sm rounded-circle p-1" 
                                                title="Hủy đăng ký"
                                                onClick={() => handleCancelEnrollment(e.enrollment_id)}
                                            >
                                                <i className="bi bi-x-lg"></i>
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center text-muted py-4">Giỏ môn học trống.</div>
                                )}
                            </div>

                            <div className="d-grid gap-2">
                                <button className="btn btn-outline-primary btn-sm" onClick={() => navigate('/student/timetable')}>
                                    <i className="bi bi-calendar3-week me-1"></i> Xem Thời Khóa Biểu Tuần
                                </button>
                                <button className="btn btn-outline-success btn-sm" onClick={() => navigate('/student/grades')}>
                                    <i className="bi bi-award me-1"></i> Xem Kết Quả Học Tập
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentRegistration;
