import React, { useEffect, useState } from 'react';
import { useAcademic } from '../../context/academic-context';
import axiosClient from '../../api/axiosClient';

const ManageSemesters = () => {
    const { refresh } = useAcademic();
    const [activeTab, setActiveTab] = useState('periods'); // 'periods' | 'semesters' | 'programs'

    // Data lists
    const [semesters, setSemesters] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [programs, setPrograms] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Modals
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [showSemesterModal, setShowSemesterModal] = useState(false);
    const [showProgramModal, setShowProgramModal] = useState(false);

    // Form inputs
    const [periodForm, setPeriodForm] = useState({
        semester_id: '1',
        name: '',
        start_time: '2026-09-01 00:00:00',
        end_time: '2026-10-30 23:59:59',
        min_credits: 12,
        max_credits: 24
    });

    const [semesterForm, setSemesterForm] = useState({
        semester_code: '',
        semester_name: '',
        academic_year: '2026-2027',
        start_date: '2026-09-01',
        end_date: '2027-01-15'
    });

    const [programForm, setProgramForm] = useState({
        program_code: '',
        program_name: '',
        department_id: '1',
        total_credits: 135,
        duration_years: 4.0
    });

    async function fetchAllData() {
        try {
            const [semRes, periodRes, progRes, deptRes] = await Promise.all([
                axiosClient.get('/admin/semesters'),
                axiosClient.get('/admin/registration-periods'),
                axiosClient.get('/admin/programs'),
                axiosClient.get('/admin/departments')
            ]);
            if (semRes.success) setSemesters(semRes.data);
            if (periodRes.success) setPeriods(periodRes.data);
            if (progRes.success) setPrograms(progRes.data);
            if (deptRes.success) setDepartments(deptRes.data);
        } catch (err) {
            console.error('Lỗi lấy dữ liệu cấu hình đào tạo:', err);
        }
    };

    useEffect(() => {
        // State updates occur after the HTTP response, not synchronously in this effect.
        // eslint-disable-next-line react/set-state-in-effect
        fetchAllData();
    }, []);

    // Toggle đợt đăng ký
    const handleTogglePeriod = async (id) => {
        try {
            const res = await axiosClient.put(`/admin/registration-periods/${id}/toggle`);
            if (res.success) {
                refresh();
                fetchAllData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi thay đổi trạng thái đợt đăng ký.');
        }
    };

    // Active học kỳ
    const handleSetActiveSemester = async (id) => {
        try {
            const res = await axiosClient.put(`/admin/semesters/${id}/active`);
            if (res.success) {
                refresh();
                alert('Đã kích hoạt học kỳ hiện hành thành công.');
                fetchAllData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi kích hoạt học kỳ.');
        }
    };

    // Submit Create Period
    const handleCreatePeriod = async (e) => {
        e.preventDefault();
        try {
            const res = await axiosClient.post('/admin/registration-periods', periodForm);
            if (res.success) {
                refresh();
                alert('Tạo đợt đăng ký học phần thành công!');
                setShowPeriodModal(false);
                fetchAllData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi tạo đợt đăng ký.');
        }
    };

    // Submit Create Semester
    const handleCreateSemester = async (e) => {
        e.preventDefault();
        try {
            const res = await axiosClient.post('/admin/semesters', semesterForm);
            if (res.success) {
                refresh();
                alert('Tạo học kỳ mới thành công!');
                setShowSemesterModal(false);
                fetchAllData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi tạo học kỳ.');
        }
    };

    // Submit Create Program
    const handleCreateProgram = async (e) => {
        e.preventDefault();
        try {
            const res = await axiosClient.post('/admin/programs', programForm);
            if (res.success) {
                refresh();
                alert('Tạo chương trình đào tạo thành công!');
                setShowProgramModal(false);
                fetchAllData();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Lỗi tạo chương trình.');
        }
    };

    return (
        <div className="admin-pane">
            <div className="card shadow-sm border-0 p-4">
                {/* Header */}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 className="fw-bold mb-1">
                            <i className="bi bi-calendar2-range text-primary me-2"></i>Quản Lý Năm Học, Học Kỳ & Đợt Đăng Ký
                        </h4>
                        <p className="text-muted small mb-0">
                            Cấu hình học kỳ hiện hành, đóng/mở đợt đăng ký tín chỉ và chương trình đào tạo
                        </p>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <ul className="nav nav-pills mb-4 border-bottom pb-3">
                    <li className="nav-item me-2">
                        <button
                            className={`nav-link ${activeTab === 'periods' ? 'active' : 'bg-light text-dark'}`}
                            onClick={() => setActiveTab('periods')}
                        >
                            <i className="bi bi-toggle-on me-2"></i>Đợt Đăng Ký Học Phần
                        </button>
                    </li>
                    <li className="nav-item me-2">
                        <button
                            className={`nav-link ${activeTab === 'semesters' ? 'active' : 'bg-light text-dark'}`}
                            onClick={() => setActiveTab('semesters')}
                        >
                            <i className="bi bi-calendar3 me-2"></i>Năm Học & Học Kỳ
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'programs' ? 'active' : 'bg-light text-dark'}`}
                            onClick={() => setActiveTab('programs')}
                        >
                            <i className="bi bi-diagram-3 me-2"></i>Chương Trình Đào Tạo
                        </button>
                    </li>
                </ul>

                {/* TAB 1: ĐỢT ĐĂNG KÝ HỌC PHẦN */}
                {activeTab === 'periods' && (
                    <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="badge bg-light text-dark border px-3 py-2">
                                Tổng cộng: <b>{periods.length}</b> đợt đăng ký
                            </span>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowPeriodModal(true)}>
                                <i className="bi bi-plus-circle me-1"></i> Tạo Đợt ĐKHP Mới
                            </button>
                        </div>
                        <div className="table-container-responsive">
                            <table className="table-modern text-center align-middle">
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th className="text-start">Tên Đợt Đăng Ký</th>
                                        <th>Học Kỳ Áp Dụng</th>
                                        <th>Thời Gian Bắt Đầu - Kết Thúc</th>
                                        <th>Hạn Mức Tín Chỉ</th>
                                        <th>Cổng Đăng Ký</th>
                                        <th>Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {periods.map((rp, idx) => (
                                        <tr key={rp.id}>
                                            <td className="fw-semibold text-muted">{idx + 1}</td>
                                            <td className="text-start fw-bold text-dark">{rp.name}</td>
                                            <td>
                                                <span className="badge bg-primary-subtle text-primary px-2 py-1">
                                                    {rp.semester_name || 'Học kỳ hiện tại'}
                                                </span>
                                            </td>
                                            <td className="small text-muted">
                                                <div><i className="bi bi-clock me-1 text-success"></i>{rp.start_time}</div>
                                                <div><i className="bi bi-clock-history me-1 text-danger"></i>{rp.end_time}</div>
                                            </td>
                                            <td>
                                                <span className="badge bg-secondary-subtle text-secondary px-2 py-1">
                                                    Min: {rp.min_credits} | Max: {rp.max_credits} TC
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${rp.is_active === 1 ? 'bg-success' : 'bg-secondary'}`}>
                                                    {rp.is_active === 1 ? 'ĐANG MỞ CỔNG' : 'ĐÃ ĐÓNG CỔNG'}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className={`btn btn-sm ${rp.is_active === 1 ? 'btn-outline-danger' : 'btn-outline-success'}`}
                                                    onClick={() => handleTogglePeriod(rp.id)}
                                                >
                                                    <i className={`bi ${rp.is_active === 1 ? 'bi-toggle-on' : 'bi-toggle-off'} me-1`}></i>
                                                    {rp.is_active === 1 ? 'Đóng Đợt' : 'Mở Đợt'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: NĂM HỌC & HỌC KỲ */}
                {activeTab === 'semesters' && (
                    <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="badge bg-light text-dark border px-3 py-2">
                                Danh mục các kỳ học trong trường
                            </span>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowSemesterModal(true)}>
                                <i className="bi bi-plus-circle me-1"></i> Tạo Học Kỳ Mới
                            </button>
                        </div>
                        <div className="table-container-responsive">
                            <table className="table-modern text-center align-middle">
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Mã Học Kỳ</th>
                                        <th className="text-start">Tên Học Kỳ</th>
                                        <th>Năm Học</th>
                                        <th>Thời Gian Bắt Đầu - Kết Thúc</th>
                                        <th>Trạng Thái</th>
                                        <th>Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {semesters.map((s, idx) => (
                                        <tr key={s.id}>
                                            <td className="fw-semibold text-muted">{idx + 1}</td>
                                            <td><code>{s.semester_code}</code></td>
                                            <td className="text-start fw-bold">{s.semester_name}</td>
                                            <td><span className="badge bg-light text-dark border">{s.academic_year}</span></td>
                                            <td className="small text-muted">
                                                {s.start_date ? s.start_date.slice(0, 10) : '---'} đến {s.end_date ? s.end_date.slice(0, 10) : '---'}
                                            </td>
                                            <td>
                                                <span className={`badge ${s.is_active === 1 ? 'bg-success' : 'bg-light text-muted border'}`}>
                                                    {s.is_active === 1 ? 'Học kỳ hiện tại' : 'Không kích hoạt'}
                                                </span>
                                            </td>
                                            <td>
                                                {s.is_active !== 1 && (
                                                    <button
                                                        className="btn btn-outline-primary btn-sm"
                                                        onClick={() => handleSetActiveSemester(s.id)}
                                                    >
                                                        <i className="bi bi-check2-circle me-1"></i> Đặt Làm Hiện Hành
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: CHƯƠNG TRÌNH ĐÀO TẠO */}
                {activeTab === 'programs' && (
                    <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="badge bg-light text-dark border px-3 py-2">
                                Các chuyên ngành đào tạo chính quy
                            </span>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowProgramModal(true)}>
                                <i className="bi bi-plus-circle me-1"></i> Tạo Chương Trình Mới
                            </button>
                        </div>
                        <div className="table-container-responsive">
                            <table className="table-modern text-center align-middle">
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Mã Ngành</th>
                                        <th className="text-start">Tên Ngành / Chương Trình</th>
                                        <th>Khoa Trực Thuộc</th>
                                        <th>Tổng Tín Chỉ</th>
                                        <th>Thời Gian Đào Tạo</th>
                                        <th>Số Sinh Viên</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {programs.map((p, idx) => (
                                        <tr key={p.id}>
                                            <td className="fw-semibold text-muted">{idx + 1}</td>
                                            <td><span className="badge bg-secondary-subtle text-secondary">{p.program_code}</span></td>
                                            <td className="text-start fw-bold text-dark">{p.program_name}</td>
                                            <td>{p.department_name || 'Khoa CNTT'}</td>
                                            <td><span className="badge bg-primary-subtle text-primary fs-6">{p.total_credits || 135} TC</span></td>
                                            <td>{p.duration_years || 4.0} năm</td>
                                            <td><span className="badge bg-info text-dark">{p.total_students || 0} SV</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Tạo Đợt Đăng Ký */}
            {showPeriodModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-plus-circle text-primary me-2"></i>Tạo Đợt Đăng Ký Học Phần Mới
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowPeriodModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreatePeriod}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Tên Đợt Đăng Ký *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="VD: Đợt 1: Đăng ký chính thức HK1"
                                            required
                                            value={periodForm.name}
                                            onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Học Kỳ Áp Dụng *</label>
                                        <select
                                            className="form-select"
                                            value={periodForm.semester_id}
                                            onChange={(e) => setPeriodForm({ ...periodForm, semester_id: e.target.value })}
                                        >
                                            {semesters.map(s => (
                                                <option key={s.id} value={s.id}>{s.semester_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Bắt Đầu *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={periodForm.start_time}
                                                onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Kết Thúc *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={periodForm.end_time}
                                                onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Số Tín Chỉ Tối Thiểu</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={periodForm.min_credits}
                                                onChange={(e) => setPeriodForm({ ...periodForm, min_credits: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Số Tín Chỉ Tối Đa</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={periodForm.max_credits}
                                                onChange={(e) => setPeriodForm({ ...periodForm, max_credits: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPeriodModal(false)}>Hủy</button>
                                    <button type="submit" className="btn btn-primary btn-sm px-4">Tạo Đợt Đăng Ký</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tạo Học Kỳ */}
            {showSemesterModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-calendar-plus text-primary me-2"></i>Tạo Học Kỳ Mới
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowSemesterModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateSemester}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Mã Học Kỳ *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="VD: HK2_2026_2027"
                                            required
                                            value={semesterForm.semester_code}
                                            onChange={(e) => setSemesterForm({ ...semesterForm, semester_code: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Tên Học Kỳ *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="VD: Học kỳ 2 - 2026-2027"
                                            required
                                            value={semesterForm.semester_name}
                                            onChange={(e) => setSemesterForm({ ...semesterForm, semester_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Năm Học *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="2026-2027"
                                            required
                                            value={semesterForm.academic_year}
                                            onChange={(e) => setSemesterForm({ ...semesterForm, academic_year: e.target.value })}
                                        />
                                    </div>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Ngày Bắt Đầu</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={semesterForm.start_date}
                                                onChange={(e) => setSemesterForm({ ...semesterForm, start_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Ngày Kết Thúc</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                value={semesterForm.end_date}
                                                onChange={(e) => setSemesterForm({ ...semesterForm, end_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSemesterModal(false)}>Hủy</button>
                                    <button type="submit" className="btn btn-primary btn-sm px-4">Tạo Học Kỳ</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tạo Chương Trình */}
            {showProgramModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-diagram-3 text-primary me-2"></i>Thêm Chương Trình Đào Tạo
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowProgramModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreateProgram}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Mã Ngành Đào Tạo *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="VD: 7480201"
                                            required
                                            value={programForm.program_code}
                                            onChange={(e) => setProgramForm({ ...programForm, program_code: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Tên Ngành / Chương Trình *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="VD: Công nghệ Thông tin"
                                            required
                                            value={programForm.program_name}
                                            onChange={(e) => setProgramForm({ ...programForm, program_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-bold">Khoa Phụ Trách</label>
                                        <select
                                            className="form-select"
                                            value={programForm.department_id}
                                            onChange={(e) => setProgramForm({ ...programForm, department_id: e.target.value })}
                                        >
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.department_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Tổng Số Tín Chỉ</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={programForm.total_credits}
                                                onChange={(e) => setProgramForm({ ...programForm, total_credits: Number(e.target.value) })}
                                            />
                                        </div>
                                        <div className="col-6">
                                            <label className="form-label small fw-bold">Thời Gian Đào Tạo (Năm)</label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                className="form-control"
                                                value={programForm.duration_years}
                                                onChange={(e) => setProgramForm({ ...programForm, duration_years: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowProgramModal(false)}>Hủy</button>
                                    <button type="submit" className="btn btn-primary btn-sm px-4">Tạo Chương Trình</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageSemesters;
