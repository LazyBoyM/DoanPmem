import { useCallback, useEffect, useState, useMemo } from 'react';
import axiosClient from '../../api/axiosClient';
import { downloadFile } from '../../api/download';
import { useFeedback } from '../../context/feedback-context';
import { Button, Input, Select, Badge, Table, Modal, Tabs, DensityToggle, Skeleton, EmptyState } from '../../components/ui';

export default function ManageClasses() {
  const { notify, confirm } = useFeedback();

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [adminClasses, setAdminClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLecturer, setFilterLecturer] = useState('');

  const [drawerClass, setDrawerClass] = useState(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchClass, setBatchClass] = useState(null);
  const [selectedAdminClass, setSelectedAdminClass] = useState('');
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  const [formData, setFormData] = useState({
    class_code: '',
    subject_id: '',
    semester_id: '',
    lecturer_id: '',
    max_students: 50,
    day_of_week: '2',
    start_period: '1',
    total_periods: '3',
    room_id: '',
    week_from: 1,
    week_to: 16
  });

  const fetchClasses = useCallback(async () => {
    try {
      const res = await axiosClient.get('/admin/classes');
      if (res.success) {
        setClasses(res.data || []);
      }
    } catch {
      notify('Không thể tải danh sách lớp học phần. Vui lòng thử lại.', 'danger');
    }
  }, [notify]);

  const fetchOptions = useCallback(async () => {
    try {
      const [subjRes, lectRes, semRes, roomRes, adminRes] = await Promise.all([
        axiosClient.get('/admin/subjects'),
        axiosClient.get('/admin/lecturers'),
        axiosClient.get('/admin/semesters'),
        axiosClient.get('/admin/rooms'),
        axiosClient.get('/admin/administrative-classes')
      ]);

      if (subjRes.success) setSubjects(subjRes.data || []);
      if (lectRes.success) setLecturers(lectRes.data || []);
      if (roomRes.success) setRooms(roomRes.data || []);
      if (adminRes.success && Array.isArray(adminRes.data)) setAdminClasses(adminRes.data);

      if (semRes.success && semRes.data) {
        setSemesters(semRes.data);
        const active = semRes.data.find(s => s.is_active) || semRes.data[0];
        if (active) {
          setFilterSemester(String(active.id));
          setFormData(prev => ({ ...prev, semester_id: String(active.id) }));
        }
      }
      if (subjRes.success && subjRes.data && subjRes.data[0]) {
        setFormData(prev => ({ ...prev, subject_id: String(subjRes.data[0].id) }));
      }
    } catch {
      notify('Không thể tải các danh mục học thuật.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchClasses();
      fetchOptions();
    });
  }, [fetchClasses, fetchOptions]);

  const loadRoster = useCallback(async (clsId) => {
    setLoadingRoster(true);
    try {
      const res = await axiosClient.get(`/admin/classes/${clsId}/students`);
      if (res.success) {
        setRoster(res.data || []);
      }
    } catch {
      setRoster([]);
    } finally {
      setLoadingRoster(false);
    }
  }, []);

  const openDrawer = (cls) => {
    setDrawerClass(cls);
    setDrawerTab('overview');
    loadRoster(cls.id);
  };

  const closeDrawer = () => {
    setDrawerClass(null);
    setRoster([]);
  };

  const toggleStatus = async (cls) => {
    try {
      const newStatus = cls.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      const res = await axiosClient.put(`/admin/classes/${cls.id}/status`, { status: newStatus });
      if (res.success) {
        notify(`Đã chuyển trạng thái lớp sang ${newStatus === 'OPEN' ? 'Đang mở' : 'Đã đóng'}.`, 'success');
        fetchClasses();
        if (drawerClass && drawerClass.id === cls.id) {
          setDrawerClass(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể đổi trạng thái lớp.', 'danger');
    }
  };

  const cancelClass = async (cls) => {
    const ok = await confirm(`Xác nhận hủy lớp học phần ${cls.class_code}? Mọi đăng ký chưa có điểm sẽ bị hủy.`);
    if (!ok) return;

    try {
      await axiosClient.put(`/admin/classes/${cls.id}/status`, { status: 'CANCELLED' });
      notify('Đã hủy lớp học phần thành công.', 'success');
      fetchClasses();
      closeDrawer();
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể hủy lớp học phần này.', 'danger');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (creating) return;
    if (!formData.class_code || !formData.subject_id || !formData.room_id) {
      notify('Vui lòng điền mã lớp, chọn môn học và chọn phòng học.', 'warning');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        class_code: formData.class_code.trim(),
        subject_id: Number(formData.subject_id),
        semester_id: Number(formData.semester_id),
        lecturer_id: formData.lecturer_id ? Number(formData.lecturer_id) : null,
        max_students: Number(formData.max_students) || 50,
        schedules: [
          {
            day_of_week: Number(formData.day_of_week),
            start_period: Number(formData.start_period),
            total_periods: Number(formData.total_periods),
            room_id: Number(formData.room_id),
            week_from: Number(formData.week_from),
            week_to: Number(formData.week_to)
          }
        ]
      };

      const res = await axiosClient.post('/admin/create-class', payload);
      if (res.success) {
        notify('Đã mở lớp học phần mới thành công!', 'success');
        setShowCreateModal(false);
        setFormData({
          class_code: '',
          subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
          semester_id: String(semesters.find(s => s.is_active)?.id || semesters[0]?.id || ''),
          lecturer_id: '',
          max_students: 50,
          day_of_week: '2',
          start_period: '1',
          total_periods: '3',
          room_id: '',
          week_from: 1,
          week_to: 16
        });
        fetchClasses();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Lỗi mở lớp học phần. Vui lòng kiểm tra xung đột phòng hoặc giảng viên.', 'danger');
    } finally {
      setCreating(false);
    }
  };

  const handleBatchEnroll = async () => {
    if (!batchClass || !selectedAdminClass) return;
    setBatchSubmitting(true);
    setBatchResult(null);

    try {
      const res = await axiosClient.post(`/admin/classes/${batchClass.id}/batch-enroll`, {
        class_name: selectedAdminClass
      });
      if (res.success) {
        setBatchResult(res.data);
        notify(res.message || 'Xếp lớp theo đoàn thành công!', 'success');
        fetchClasses();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Lỗi xếp lớp tự động.', 'danger');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleExportRoster = async (cls) => {
    try {
      await downloadFile(`/reports/export-class-excel/${cls.id}`, `Danh_sach_lop_${cls.class_code}.xlsx`);
    } catch {
      notify('Không thể xuất danh sách sinh viên của lớp.', 'danger');
    }
  };

  const filtered = useMemo(() => {
    return classes.filter(c => {
      const matchSearch = !search ||
        `${c.class_code} ${c.subject_name} ${c.lecturer_name || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchSemester = !filterSemester || String(c.semester_id) === filterSemester;
      const matchSubject = !filterSubject || String(c.subject_id) === filterSubject;
      const matchStatus = !filterStatus || c.status === filterStatus;
      const matchLecturer = !filterLecturer || String(c.lecturer_id) === filterLecturer;
      return matchSearch && matchSemester && matchSubject && matchStatus && matchLecturer;
    });
  }, [classes, search, filterSemester, filterSubject, filterStatus, filterLecturer]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Lớp học phần
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button variant="outline" size="md" onClick={fetchClasses}>
            Làm mới
          </Button>
          <Button variant="primary" size="md" onClick={() => setShowCreateModal(true)}>
            + Mở lớp học phần mới
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Bộ lọc lớp học phần
            </span>
            <Badge variant="neutral">{filtered.length} lớp</Badge>
          </div>
          <DensityToggle />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-2)' }}>
          <Input
            placeholder="Tìm mã lớp, tên môn học, giảng viên…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="sm"
            aria-label="Tìm kiếm lớp học phần"
          />

          <Select
            value={filterSemester}
            onChange={e => setFilterSemester(e.target.value)}
            size="sm"
            aria-label="Lọc theo học kỳ"
            options={[
              { value: '', label: 'Tất cả học kỳ' },
              ...semesters.map(s => ({ value: String(s.id), label: s.semester_name + (s.is_active ? ' (Hiện hành)' : '') }))
            ]}
          />

          <Select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            size="sm"
            aria-label="Lọc theo môn học"
            options={[
              { value: '', label: 'Tất cả môn học' },
              ...subjects.map(s => ({ value: String(s.id), label: `${s.subject_code} - ${s.subject_name}` }))
            ]}
          />

          <Select
            value={filterLecturer}
            onChange={e => setFilterLecturer(e.target.value)}
            size="sm"
            aria-label="Lọc theo giảng viên"
            options={[
              { value: '', label: 'Tất cả giảng viên' },
              ...lecturers.map(l => ({ value: String(l.id), label: l.full_name }))
            ]}
          />

          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            size="sm"
            aria-label="Lọc theo trạng thái"
            options={[
              { value: '', label: 'Tất cả trạng thái' },
              { value: 'OPEN', label: 'Đang mở (OPEN)' },
              { value: 'CLOSED', label: 'Đã đóng (CLOSED)' },
              { value: 'CANCELLED', label: 'Đã hủy (CANCELLED)' }
            ]}
          />
        </div>

        {loading ? (
          <Skeleton.Table rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Không tìm thấy lớp học phần phù hợp"
            description="Hãy thử thay đổi tiêu chí tìm kiếm hoặc thêm lớp học phần mới cho học kỳ này."
            action={
              <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                + Mở lớp học phần mới
              </Button>
            }
          />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th width="28%">Mã lớp & Môn học</Table.Th>
                <Table.Th width="18%">Giảng viên</Table.Th>
                <Table.Th width="24%">Lịch học & Phòng</Table.Th>
                <Table.Th width="14%">Sĩ số</Table.Th>
                <Table.Th width="10%">Trạng thái</Table.Th>
                <Table.Th width="6%" align="right">Thao tác</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map(cls => {
                const ratio = Math.round((cls.current_students / (cls.max_students || 1)) * 100);
                const isFull = cls.current_students >= cls.max_students;

                return (
                  <Table.Tr key={cls.id}>
                    <Table.Td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                          {cls.subject_name}
                        </strong>
                        <span className="tabular-nums" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          {cls.class_code} · {cls.credits} TC
                        </span>
                      </div>
                    </Table.Td>

                    <Table.Td>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                        {cls.lecturer_name || 'Chưa phân công'}
                      </span>
                    </Table.Td>

                    <Table.Td>
                      {Array.isArray(cls.schedules) && cls.schedules.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {cls.schedules.map((s, idx) => (
                            <span key={idx} className="tabular-nums" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                              Thứ {s.day_of_week === 8 ? 'CN' : s.day_of_week} (Tiết {s.start_period}-{s.start_period + s.total_periods - 1}) · P.{s.room || '—'}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                          Chưa xếp lịch
                        </span>
                      )}
                    </Table.Td>

                    <Table.Td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span className="tabular-nums" style={{ fontSize: 'var(--font-size-xs)', fontWeight: '650', color: isFull ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                          {cls.current_students} / {cls.max_students} ({ratio}%)
                        </span>
                        <div style={{ height: '4px', backgroundColor: 'var(--color-border-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(ratio, 100)}%`,
                              backgroundColor: isFull ? 'var(--color-danger)' : ratio >= 80 ? 'var(--color-warning)' : 'var(--color-accent)'
                            }}
                          />
                        </div>
                      </div>
                    </Table.Td>

                    <Table.Td>
                      {cls.status === 'OPEN' ? (
                        <Badge variant="success">Đang mở</Badge>
                      ) : cls.status === 'CLOSED' ? (
                        <Badge variant="neutral">Đã đóng</Badge>
                      ) : (
                        <Badge variant="danger">Đã hủy</Badge>
                      )}
                    </Table.Td>

                    <Table.Td align="right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDrawer(cls)}
                      >
                        Chi tiết
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </div>

      {drawerClass && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(2px)'
          }}
          onClick={closeDrawer}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: 'var(--color-surface)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
              borderLeft: '1px solid var(--color-border)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
                    {drawerClass.class_code}
                  </h2>
                  {drawerClass.status === 'OPEN' ? (
                    <Badge variant="success">Đang mở</Badge>
                  ) : (
                    <Badge variant="neutral">{drawerClass.status}</Badge>
                  )}
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                  {drawerClass.subject_name} ({drawerClass.credits} tín chỉ)
                </p>
              </div>

              <button
                onClick={closeDrawer}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                aria-label="Đóng ngăn kéo"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <Tabs
                tabs={[
                  { key: 'overview', label: 'Tổng quan lớp' },
                  { key: 'schedules', label: 'Thời khóa biểu' },
                  { key: 'roster', label: `Sinh viên (${drawerClass.current_students})` }
                ]}
                activeTab={drawerTab}
                onChange={setDrawerTab}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {drawerTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', padding: '18px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Học kỳ</span>
                      <p style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>
                        {drawerClass.semester_name || 'Kỳ hiện hành'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Giảng viên</span>
                      <p style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>
                        {drawerClass.lecturer_name || 'Chưa phân công'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Sĩ số hiện tại</span>
                      <p className="tabular-nums" style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>
                        {drawerClass.current_students} sinh viên
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Sức chứa tối đa</span>
                      <p className="tabular-nums" style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>
                        {drawerClass.max_students} chỗ
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                      Thao tác điều hành lớp
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      <Button
                        variant={drawerClass.status === 'OPEN' ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => toggleStatus(drawerClass)}
                      >
                        {drawerClass.status === 'OPEN' ? 'Đóng đăng ký lớp' : 'Mở lại đăng ký'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBatchClass(drawerClass);
                          setShowBatchModal(true);
                        }}
                      >
                        Xếp lớp theo đoàn
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportRoster(drawerClass)}
                      >
                        Xuất danh sách (Excel)
                      </Button>

                      {drawerClass.status !== 'CANCELLED' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => cancelClass(drawerClass)}
                        >
                          Hủy lớp học phần
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'schedules' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
                    Lịch học định kỳ trong tuần
                  </h3>
                  {Array.isArray(drawerClass.schedules) && drawerClass.schedules.length > 0 ? (
                    drawerClass.schedules.map((s, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          backgroundColor: 'var(--color-surface-subtle)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                          Thứ {s.day_of_week === 8 ? 'Chủ nhật' : s.day_of_week} · Tiết {s.start_period} đến {s.start_period + s.total_periods - 1}
                        </strong>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          Phòng: <strong>{s.room || 'Đang cập nhật'}</strong> · Tuần học: {s.week_from} - {s.week_to}
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="Chưa có lịch học"
                      description="Lớp học phần này chưa được xếp lịch học cụ thể."
                    />
                  )}
                </div>
              )}

              {drawerTab === 'roster' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                      Danh sách {roster.length} sinh viên đã đăng ký
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportRoster(drawerClass)}
                    >
                      Xuất Excel
                    </Button>
                  </div>

                  {loadingRoster ? (
                    <Skeleton.Table rows={6} cols={3} />
                  ) : roster.length === 0 ? (
                    <EmptyState
                      title="Chưa có sinh viên đăng ký"
                      description="Lớp học phần này hiện tại chưa có lượt đăng ký nào."
                    />
                  ) : (
                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                      <Table>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th width="30%">Mã SV</Table.Th>
                            <Table.Th width="45%">Họ và tên</Table.Th>
                            <Table.Th width="25%">Lớp HC</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {roster.map(st => (
                            <Table.Tr key={st.student_id || st.id}>
                              <Table.Td>
                                <span className="tabular-nums" style={{ fontWeight: '600', color: 'var(--color-accent-text)' }}>
                                  {st.student_code}
                                </span>
                              </Table.Td>
                              <Table.Td>
                                <span style={{ color: 'var(--color-text-primary)' }}>
                                  {st.full_name}
                                </span>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="neutral">{st.class_name || '—'}</Badge>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Mở lớp học phần mới"
        size="lg"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Môn học đào tạo *
              </label>
              <Select
                value={formData.subject_id}
                onChange={e => {
                  const subId = e.target.value;
                  const s = subjects.find(item => String(item.id) === subId);
                  setFormData(prev => ({
                    ...prev,
                    subject_id: subId,
                    class_code: s ? `LHP_${s.subject_code}_01` : prev.class_code
                  }));
                }}
                required
                options={subjects.map(s => ({ value: String(s.id), label: `${s.subject_code} - ${s.subject_name}` }))}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Mã lớp học phần *
              </label>
              <Input
                value={formData.class_code}
                onChange={e => setFormData({ ...formData, class_code: e.target.value })}
                placeholder="VD: LHP_INT1004_02"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Học kỳ tổ chức *
              </label>
              <Select
                value={formData.semester_id}
                onChange={e => setFormData({ ...formData, semester_id: e.target.value })}
                required
                options={semesters.map(s => ({ value: String(s.id), label: s.semester_name }))}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Giảng viên phụ trách
              </label>
              <Select
                value={formData.lecturer_id}
                onChange={e => setFormData({ ...formData, lecturer_id: e.target.value })}
                options={[
                  { value: '', label: 'Chưa phân công' },
                  ...lecturers.map(l => ({ value: String(l.id), label: `${l.lecturer_code} - ${l.full_name}` }))
                ]}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Sĩ số tối đa *
              </label>
              <Input
                type="number"
                min="10"
                max="200"
                value={formData.max_students}
                onChange={e => setFormData({ ...formData, max_students: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Phòng học *
              </label>
              <Select
                value={formData.room_id}
                onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                required
                options={[
                  { value: '', label: 'Chọn phòng học' },
                  ...rooms.map(r => ({ value: String(r.id), label: `${r.building_code || ''} - P.${r.room_code || r.room_name} (Sức chứa: ${r.capacity})` }))
                ]}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '650', display: 'block', marginBottom: '8px' }}>
              Xếp lịch học ban đầu
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', fontWeight: '500' }}>Thứ trong tuần</label>
                <Select
                  size="sm"
                  value={formData.day_of_week}
                  onChange={e => setFormData({ ...formData, day_of_week: e.target.value })}
                  options={[
                    { value: '2', label: 'Thứ Hai' },
                    { value: '3', label: 'Thứ Ba' },
                    { value: '4', label: 'Thứ Tư' },
                    { value: '5', label: 'Thứ Năm' },
                    { value: '6', label: 'Thứ Sáu' },
                    { value: '7', label: 'Thứ Bảy' }
                  ]}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', fontWeight: '500' }}>Tiết bắt đầu</label>
                <Select
                  size="sm"
                  value={formData.start_period}
                  onChange={e => setFormData({ ...formData, start_period: e.target.value })}
                  options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => ({ value: String(p), label: `Tiết ${p}` }))}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', fontWeight: '500' }}>Số tiết</label>
                <Select
                  size="sm"
                  value={formData.total_periods}
                  onChange={e => setFormData({ ...formData, total_periods: e.target.value })}
                  options={[
                    { value: '2', label: '2 tiết' },
                    { value: '3', label: '3 tiết' },
                    { value: '4', label: '4 tiết' }
                  ]}
                />
              </div>

              <div>
                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', fontWeight: '500' }}>Tuần học</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Input
                    size="sm"
                    type="number"
                    value={formData.week_from}
                    onChange={e => setFormData({ ...formData, week_from: e.target.value })}
                    style={{ width: '50px' }}
                  />
                  <span>-</span>
                  <Input
                    size="sm"
                    type="number"
                    value={formData.week_to}
                    onChange={e => setFormData({ ...formData, week_to: e.target.value })}
                    style={{ width: '50px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button variant="outline" size="md" onClick={() => setShowCreateModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" loading={creating}>
              Xác nhận mở lớp
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showBatchModal}
        onClose={() => {
          setShowBatchModal(false);
          setBatchClass(null);
          setBatchResult(null);
        }}
        title={`Xếp lớp theo đoàn · ${batchClass?.class_code || ''}`}
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
              Chọn lớp hành chính nguồn *
            </label>
            <Select
              value={selectedAdminClass}
              onChange={e => setSelectedAdminClass(e.target.value)}
              options={[
                { value: '', label: 'Chọn lớp hành chính' },
                ...adminClasses.map(c => ({ value: c.class_name, label: `${c.class_name} (${c.total_students} sinh viên)` }))
              ]}
            />
          </div>

          {batchResult && (
            <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)' }}>
              <strong>Kết quả xử lý:</strong>
              <p style={{ margin: '4px 0 0 0', color: 'var(--color-success-text)' }}>
                Đã thêm thành công: <strong>{batchResult.enrolledCount}</strong> sinh viên.
              </p>
              {batchResult.skippedCount > 0 && (
                <p style={{ margin: '2px 0 0 0', color: 'var(--color-warning-text)' }}>
                  Bỏ qua (đã có trong lớp hoặc xung đột): {batchResult.skippedCount} sinh viên.
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setShowBatchModal(false);
                setBatchClass(null);
              }}
            >
              Đóng
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!selectedAdminClass}
              loading={batchSubmitting}
              onClick={handleBatchEnroll}
            >
              Xác nhận xếp lớp
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
