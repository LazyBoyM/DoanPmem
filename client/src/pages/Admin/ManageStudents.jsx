import { useCallback, useEffect, useState, useMemo } from 'react';
import axiosClient from '../../api/axiosClient';
import { downloadFile } from '../../api/download';
import { useFeedback } from '../../context/feedback-context';
import { Button, Input, Select, Badge, Table, Modal, Tabs, DensityToggle, Skeleton, EmptyState } from '../../components/ui';

export default function ManageStudents() {
  const { notify, confirm } = useFeedback();

  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [adminClasses, setAdminClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [viewMode, setViewMode] = useState('list');

  const [drawerStudent, setDrawerStudent] = useState(null);
  const [drawerTab, setDrawerTab] = useState('info');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [formData, setFormData] = useState({
    student_code: '',
    full_name: '',
    gender: 'Nam',
    birth_date: '2004-01-01',
    phone: '',
    address: '',
    class_name: '',
    program_id: '1',
    academic_year: 'K74',
    email: '',
    password: '123456'
  });

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, programsRes, adminClassesRes] = await Promise.all([
        axiosClient.get('/admin/students'),
        axiosClient.get('/admin/programs'),
        axiosClient.get('/admin/administrative-classes')
      ]);
      if (studentsRes.success) setStudents(studentsRes.data || []);
      if (programsRes.success) setPrograms(programsRes.data || []);
      if (adminClassesRes.success && Array.isArray(adminClassesRes.data)) setAdminClasses(adminClassesRes.data);
    } catch {
      notify('Không thể tải dữ liệu sinh viên. Vui lòng thử lại.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    Promise.resolve().then(fetchData);
  }, [fetchData]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      student_code: '',
      full_name: '',
      gender: 'Nam',
      birth_date: '2004-01-01',
      phone: '',
      address: '',
      class_name: adminClasses[0]?.class_name || '74DCTT25',
      program_id: programs[0]?.id ? String(programs[0].id) : '1',
      academic_year: 'K74',
      email: '',
      password: '123456'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (st) => {
    setEditingId(st.id);
    setFormData({
      student_code: st.student_code,
      full_name: st.full_name,
      gender: st.gender || 'Nam',
      birth_date: st.birth_date ? st.birth_date.slice(0, 10) : '2004-01-01',
      phone: st.phone || '',
      address: st.address || '',
      class_name: st.class_name || '',
      program_id: String(st.program_id || '1'),
      academic_year: st.academic_year || 'K74',
      email: st.email || '',
      password: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (st) => {
    const ok = await confirm(`Xác nhận xóa hồ sơ sinh viên ${st.full_name} (${st.student_code})? Thao tác này sẽ dọn dẹp các đăng ký và điểm liên quan.`);
    if (!ok) return;

    try {
      const res = await axiosClient.delete(`/admin/students/${st.id}`);
      if (res.success) {
        notify('Đã xóa hồ sơ sinh viên thành công.', 'success');
        if (drawerStudent && drawerStudent.id === st.id) setDrawerStudent(null);
        fetchData();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể xóa hồ sơ sinh viên.', 'danger');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      if (editingId) {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        const res = await axiosClient.put(`/admin/students/${editingId}`, payload);
        if (res.success) {
          notify('Cập nhật hồ sơ sinh viên thành công!', 'success');
          setShowModal(false);
          fetchData();
          if (drawerStudent && drawerStudent.id === editingId) {
            setDrawerStudent(prev => ({ ...prev, ...payload }));
          }
        }
      } else {
        const res = await axiosClient.post('/admin/students', formData);
        if (res.success) {
          notify('Thêm sinh viên mới thành công!', 'success');
          setShowModal(false);
          fetchData();
        }
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Lỗi khi lưu thông tin sinh viên.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      await downloadFile('/reports/export-students-excel', 'Danh_sach_sinh_vien.xlsx');
      notify('Đã xuất file Excel thành công!', 'success');
    } catch {
      notify('Không thể xuất file Excel.', 'danger');
    } finally {
      setDownloading(false);
    }
  };

  const filtered = useMemo(() => {
    return students.filter(st => {
      const matchSearch = !search ||
        `${st.student_code} ${st.full_name} ${st.class_name || ''} ${st.email || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchProg = !filterProgram || String(st.program_id) === filterProgram;
      const matchYear = !filterYear || st.academic_year === filterYear;
      const matchClass = !filterClass || st.class_name === filterClass;
      return matchSearch && matchProg && matchYear && matchClass;
    });
  }, [students, search, filterProgram, filterYear, filterClass]);

  const yearsList = useMemo(() => {
    const set = new Set();
    students.forEach(st => { if (st.academic_year) set.add(st.academic_year); });
    return Array.from(set).sort();
  }, [students]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Hồ sơ sinh viên
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button
            variant="outline"
            size="md"
            loading={downloading}
            onClick={handleExportExcel}
          >
            Xuất Excel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
          >
            + Thêm sinh viên mới
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Bộ lọc sinh viên
            </span>
            <Badge variant="neutral">{filtered.length} sinh viên</Badge>

            <div style={{ display: 'inline-flex', backgroundColor: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '3px', marginLeft: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px 14px',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: viewMode === 'list' ? '600' : '400',
                  color: viewMode === 'list' ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                  backgroundColor: viewMode === 'list' ? 'var(--color-surface)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-xs)',
                  cursor: 'pointer'
                }}
              >
                Bảng danh sách
              </button>
              <button
                type="button"
                onClick={() => setViewMode('classes')}
                style={{
                  padding: '6px 14px',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: viewMode === 'classes' ? '600' : '400',
                  color: viewMode === 'classes' ? 'var(--color-accent-text)' : 'var(--color-text-muted)',
                  backgroundColor: viewMode === 'classes' ? 'var(--color-surface)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-xs)',
                  cursor: 'pointer'
                }}
              >
                Lớp hành chính
              </button>
            </div>
          </div>

          <DensityToggle />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 2fr) repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-2)' }}>
          <Input
            placeholder="Tìm theo MSSV, họ tên, lớp hoặc email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="sm"
            aria-label="Tìm kiếm sinh viên"
          />

          <Select
            value={filterProgram}
            onChange={e => setFilterProgram(e.target.value)}
            size="sm"
            aria-label="Lọc theo chương trình"
            options={[
              { value: '', label: 'Tất cả ngành học' },
              ...programs.map(p => ({ value: String(p.id), label: p.program_name }))
            ]}
          />

          <Select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            size="sm"
            aria-label="Lọc theo khóa"
            options={[
              { value: '', label: 'Tất cả khóa học' },
              ...yearsList.map(y => ({ value: y, label: `Khóa ${y}` }))
            ]}
          />

          <Select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            size="sm"
            aria-label="Lọc theo lớp hành chính"
            options={[
              { value: '', label: 'Tất cả lớp hành chính' },
              ...adminClasses.map(c => ({ value: c.class_name, label: c.class_name }))
            ]}
          />
        </div>

        {loading ? (
          <Skeleton.Table rows={8} cols={6} />
        ) : viewMode === 'classes' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
            {adminClasses.map(c => {
              const countInClass = students.filter(s => s.class_name === c.class_name).length;
              return (
                <div
                  key={c.class_name}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 'var(--font-size-md)', color: 'var(--color-text-primary)' }}>
                      {c.class_name}
                    </strong>
                    <Badge variant="neutral">{countInClass} SV</Badge>
                  </div>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                    Chương trình: {c.program_name || 'Công nghệ Thông tin'}
                  </span>
                  <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilterClass(c.class_name);
                        setViewMode('list');
                      }}
                    >
                      Xem danh sách lớp →
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Không tìm thấy sinh viên phù hợp"
            description="Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc ngành và khóa học."
            action={
              <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                + Thêm sinh viên mới
              </Button>
            }
          />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th width="28%">MSSV & Họ tên</Table.Th>
                <Table.Th width="16%">Lớp & Khóa</Table.Th>
                <Table.Th width="24%">Ngành đào tạo</Table.Th>
                <Table.Th width="20%">Liên lạc</Table.Th>
                <Table.Th width="12%" align="right">Thao tác</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map(st => (
                <Table.Tr key={st.id}>
                  <Table.Td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                        {st.full_name}
                      </strong>
                      <span className="tabular-nums" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent-text)', fontWeight: '600' }}>
                        {st.student_code}
                      </span>
                    </div>
                  </Table.Td>

                  <Table.Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Badge variant="neutral">{st.class_name || '—'}</Badge>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {st.academic_year || ''}
                      </span>
                    </div>
                  </Table.Td>

                  <Table.Td>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {st.program_name || programs.find(p => p.id === st.program_id)?.program_name || 'Công nghệ Thông tin'}
                    </span>
                  </Table.Td>

                  <Table.Td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                        {st.email || '—'}
                      </span>
                      <span className="tabular-nums" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {st.phone || ''}
                      </span>
                    </div>
                  </Table.Td>

                  <Table.Td align="right">
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDrawerStudent(st);
                          setDrawerTab('info');
                        }}
                      >
                        Hồ sơ
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(st)}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(st)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      {drawerStudent && (
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
          onClick={() => setDrawerStudent(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: 'var(--color-surface)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
              borderLeft: '1px solid var(--color-border)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
                  {drawerStudent.full_name}
                </h2>
                <p className="tabular-nums" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-text)', fontWeight: '600', margin: '2px 0 0 0' }}>
                  {drawerStudent.student_code} · Lớp {drawerStudent.class_name}
                </p>
              </div>

              <button
                onClick={() => setDrawerStudent(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                aria-label="Đóng hồ sơ"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)' }}>
              <Tabs
                tabs={[
                  { key: 'info', label: 'Thông tin cá nhân' },
                  { key: 'academic', label: 'Đào tạo & Học vụ' }
                ]}
                activeTab={drawerTab}
                onChange={setDrawerTab}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {drawerTab === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', padding: '18px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <div>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Giới tính</span>
                      <p style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>
                        {drawerStudent.gender || 'Nam'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Ngày sinh</span>
                      <p className="tabular-nums" style={{ fontSize: 'var(--font-size-base)', fontWeight: '600', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>
                        {drawerStudent.birth_date ? drawerStudent.birth_date.slice(0, 10) : '—'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Email</span>
                      <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>
                        {drawerStudent.email || '—'}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Số điện thoại</span>
                      <p className="tabular-nums" style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>
                        {drawerStudent.phone || '—'}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: '18px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Địa chỉ liên hệ</span>
                    <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', margin: '4px 0 0 0' }}>
                      {drawerStudent.address || 'Chưa cập nhật địa chỉ'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(drawerStudent)}
                    >
                      Chỉnh sửa hồ sơ
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(drawerStudent)}
                    >
                      Xóa hồ sơ
                    </Button>
                  </div>
                </div>
              )}

              {drawerTab === 'academic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                      Chương trình: {drawerStudent.program_name || 'Công nghệ Thông tin'}
                    </strong>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      Khóa học: {drawerStudent.academic_year} · Lớp hành chính: {drawerStudent.class_name}
                    </span>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      Khung đào tạo tiêu chuẩn: 135 tín chỉ · Thời gian thiết kế: 4.0 năm
                    </span>
                  </div>

                  <div style={{ padding: '16px', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                      Theo dõi học vụ liên lớp
                    </strong>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      Để xem tình trạng thi lại, học lại hoặc danh hiệu xuất sắc của sinh viên này cùng toàn khóa:
                    </span>
                    <a
                      href="/admin/academic"
                      style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-accent-text)', textDecoration: 'none', marginTop: '4px' }}
                    >
                      Mở bảng lọc học vụ liên lớp →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Chỉnh sửa hồ sơ sinh viên' : 'Thêm sinh viên mới'}
        size="lg"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Mã số sinh viên (MSSV) *
              </label>
              <Input
                value={formData.student_code}
                onChange={e => setFormData({ ...formData, student_code: e.target.value })}
                placeholder="VD: 74DCTT25099"
                required
                disabled={Boolean(editingId)}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Họ và tên sinh viên *
              </label>
              <Input
                value={formData.full_name}
                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="VD: Nguyễn Văn An"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Giới tính *
              </label>
              <Select
                value={formData.gender}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                options={[
                  { value: 'Nam', label: 'Nam' },
                  { value: 'Nữ', label: 'Nữ' }
                ]}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Ngày sinh *
              </label>
              <Input
                type="date"
                value={formData.birth_date}
                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Lớp hành chính *
              </label>
              <Select
                value={formData.class_name}
                onChange={e => setFormData({ ...formData, class_name: e.target.value })}
                options={[
                  ...adminClasses.map(c => ({ value: c.class_name, label: c.class_name })),
                  { value: '74DCTT25', label: '74DCTT25' },
                  { value: '74DCTT24', label: '74DCTT24' },
                  { value: '74DCTT26', label: '74DCTT26' }
                ]}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Ngành đào tạo *
              </label>
              <Select
                value={formData.program_id}
                onChange={e => setFormData({ ...formData, program_id: e.target.value })}
                options={programs.map(p => ({ value: String(p.id), label: p.program_name }))}
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Khóa học *
              </label>
              <Input
                value={formData.academic_year}
                onChange={e => setFormData({ ...formData, academic_year: e.target.value })}
                placeholder="VD: K74"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Số điện thoại
              </label>
              <Input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="VD: 0912345678"
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Email liên hệ
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="VD: an.nv@sinhvien.edu.vn"
              />
            </div>

            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                {editingId ? 'Mật khẩu mới (bỏ trống nếu không đổi)' : 'Mật khẩu khởi tạo'}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingId ? 'Giữ nguyên mật khẩu cũ' : 'Mặc định: 123456'}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Địa chỉ liên hệ
            </label>
            <Input
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="Địa chỉ thường trú hoặc tạm trú"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button variant="outline" size="md" onClick={() => setShowModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" loading={submitting}>
              {editingId ? 'Lưu thay đổi' : 'Thêm sinh viên'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
