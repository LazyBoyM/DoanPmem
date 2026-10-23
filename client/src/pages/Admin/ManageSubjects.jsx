import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useFeedback } from '../../context/feedback-context';
import { Button, Input, Select, Badge, Table, Modal, Tabs, DensityToggle, Skeleton, EmptyState } from '../../components/ui';

export default function ManageSubjects() {
  const { notify, confirm } = useFeedback();
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCredits, setFilterCredits] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailSubject, setDetailSubject] = useState(null);
  const [detailTab, setDetailTab] = useState('info');

  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    credits: 3,
    theory_periods: 30,
    practice_periods: 15,
    department_id: '1',
    prerequisite_ids: []
  });

  const fetchData = useCallback(async () => {
    try {
      const [subRes, deptRes, classRes] = await Promise.all([
        axiosClient.get('/admin/subjects'),
        axiosClient.get('/admin/departments'),
        axiosClient.get('/admin/classes').catch(() => ({ data: [] }))
      ]);
      if (subRes.success || Array.isArray(subRes.data)) setSubjects(subRes.data || []);
      if (deptRes.success || Array.isArray(deptRes.data)) setDepartments(deptRes.data || []);
      if (classRes.success || Array.isArray(classRes.data)) setClasses(classRes.data || []);
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể tải danh mục học phần.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) fetchData();
    });
    return () => { active = false; };
  }, [fetchData]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      subject_code: '',
      subject_name: '',
      credits: 3,
      theory_periods: 30,
      practice_periods: 15,
      department_id: departments.length > 0 ? String(departments[0].id) : '1',
      prerequisite_ids: []
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (sub) => {
    setIsEditing(true);
    setCurrentId(sub.id);
    setFormData({
      subject_code: sub.subject_code,
      subject_name: sub.subject_name,
      credits: sub.credits ?? 3,
      theory_periods: sub.theory_periods ?? 30,
      practice_periods: sub.practice_periods ?? 15,
      department_id: String(sub.department_id || (departments[0]?.id || 1)),
      prerequisite_ids: (sub.prerequisite_ids || []).map(String)
    });
    setShowFormModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing) {
        const res = await axiosClient.put(`/admin/subjects/${currentId}`, formData);
        if (res.success || res.message) {
          notify('Cập nhật thông tin học phần thành công.', 'success');
          setShowFormModal(false);
          await fetchData();
        }
      } else {
        const res = await axiosClient.post('/admin/subjects', formData);
        if (res.success || res.message) {
          notify('Tạo học phần mới thành công.', 'success');
          setShowFormModal(false);
          await fetchData();
        }
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Có lỗi xảy ra khi lưu học phần.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sub) => {
    if (!await confirm(`Bạn có chắc chắn muốn xóa học phần "${sub.subject_name}" (${sub.subject_code})?`)) return;
    try {
      const res = await axiosClient.delete(`/admin/subjects/${sub.id}`);
      if (res.success || res.message) {
        notify('Đã xóa học phần thành công.', 'success');
        if (detailSubject?.id === sub.id) setDetailSubject(null);
        await fetchData();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể xóa học phần đang có lớp phụ thuộc.', 'danger');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredSubjects.map(s => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!await confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.size} học phần đã chọn?`)) return;
    let deletedCount = 0;
    for (const id of selectedIds) {
      try {
        await axiosClient.delete(`/admin/subjects/${id}`);
        deletedCount++;
      } catch {
        continue;
      }
    }
    notify(`Đã xử lý xóa thành công ${deletedCount}/${selectedIds.size} học phần.`, 'success');
    setSelectedIds(new Set());
    await fetchData();
  };

  const filteredSubjects = subjects.filter(s => {
    const query = searchTerm.toLowerCase();
    const matchSearch = (s.subject_code || '').toLowerCase().includes(query) ||
                        (s.subject_name || '').toLowerCase().includes(query);
    const matchDept = filterDept ? String(s.department_id) === filterDept : true;
    const matchCredits = filterCredits ? String(s.credits) === filterCredits : true;
    return matchSearch && matchDept && matchCredits;
  });

  const subjectClasses = detailSubject
    ? classes.filter(c => c.subject_id === detailSubject.id)
    : [];

  const dependentSubjects = detailSubject
    ? subjects.filter(s => (s.prerequisite_ids || []).includes(detailSubject.id))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Môn học
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
          >
            + Thêm học phần mới
          </Button>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <Input
                placeholder="Tìm mã hoặc tên học phần…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                size="sm"
                aria-label="Tìm kiếm học phần"
              />
            </div>

            <div style={{ width: '190px' }}>
              <Select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                size="sm"
                aria-label="Lọc theo khoa"
                options={[
                  { value: '', label: 'Tất cả khoa / bộ môn' },
                  ...departments.map(d => ({ value: String(d.id), label: d.department_name }))
                ]}
              />
            </div>

            <div style={{ width: '130px' }}>
              <Select
                value={filterCredits}
                onChange={e => setFilterCredits(e.target.value)}
                size="sm"
                aria-label="Lọc theo tín chỉ"
                options={[
                  { value: '', label: 'Số tín chỉ' },
                  { value: '1', label: '1 tín chỉ' },
                  { value: '2', label: '2 tín chỉ' },
                  { value: '3', label: '3 tín chỉ' },
                  { value: '4', label: '4 tín chỉ' }
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedIds.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--color-accent-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-accent-border)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-accent-text)' }}>
                  Đã chọn {selectedIds.size}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  Xóa mục chọn
                </Button>
              </div>
            )}
            <DensityToggle />
          </div>
        </div>

        {loading ? (
          <Skeleton.Table rows={8} cols={7} />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th width="40px">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả học phần"
                    checked={filteredSubjects.length > 0 && selectedIds.size === filteredSubjects.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </Table.Th>
                <Table.Th width="130px">Mã môn</Table.Th>
                <Table.Th width="30%">Tên học phần</Table.Th>
                <Table.Th width="90px" align="center">Tín chỉ</Table.Th>
                <Table.Th width="150px">Lý thuyết / Thực hành</Table.Th>
                <Table.Th width="20%">Khoa phụ trách</Table.Th>
                <Table.Th width="18%">Môn tiên quyết</Table.Th>
                <Table.Th width="120px" align="right">Thao tác</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredSubjects.map(sub => {
                const isSelected = selectedIds.has(sub.id);
                const isDetailActive = detailSubject?.id === sub.id;
                return (
                  <Table.Tr
                    key={sub.id}
                    active={isDetailActive}
                    onClick={() => setDetailSubject(sub)}
                  >
                    <Table.Td onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Chọn học phần ${sub.subject_code}`}
                        checked={isSelected}
                        onChange={() => handleToggleSelect(sub.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </Table.Td>

                    <Table.Td>
                      <span className="tabular-nums" style={{ fontWeight: '650', color: 'var(--color-accent-text)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}>
                        {sub.subject_code}
                      </span>
                    </Table.Td>

                    <Table.Td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '650', color: 'var(--color-text-primary)' }}>
                          {sub.subject_name}
                        </span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {classes.filter(c => c.subject_id === sub.id).length} lớp đang mở
                        </span>
                      </div>
                    </Table.Td>

                    <Table.Td align="center">
                      <Badge variant="accent" size="sm">
                        {sub.credits} TC
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {sub.theory_periods} LT · {sub.practice_periods} TH
                      </span>
                    </Table.Td>

                    <Table.Td>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {sub.department_name || 'Khoa Công nghệ Thông tin'}
                      </span>
                    </Table.Td>

                    <Table.Td>
                      {sub.prerequisites && sub.prerequisites.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {sub.prerequisites.map((pName, pIdx) => (
                            <Badge key={pIdx} variant="warning" size="sm">
                              {pName}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </Table.Td>

                    <Table.Td align="right" onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(sub)}
                          aria-label={`Sửa học phần ${sub.subject_code}`}
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="danger-subtle"
                          size="sm"
                          onClick={() => handleDelete(sub)}
                          aria-label={`Xóa học phần ${sub.subject_code}`}
                        >
                          Xóa
                        </Button>
                      </div>
                    </Table.Td>
                  </Table.Tr>
                );
              })}

              {!filteredSubjects.length && (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <EmptyState
                      title="Không có học phần nào phù hợp"
                      description="Vui lòng thử lại với từ khóa tìm kiếm khác hoặc xóa bộ lọc theo khoa và tín chỉ."
                    />
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', paddingTop: '8px' }}>
          <span>Hiển thị {filteredSubjects.length} / {subjects.length} học phần</span>
          <span>Bấm vào dòng để xem chi tiết lớp học & tài liệu</span>
        </div>
      </div>

      <Modal
        open={Boolean(detailSubject)}
        onClose={() => setDetailSubject(null)}
        title={detailSubject ? `${detailSubject.subject_name} (${detailSubject.subject_code})` : ''}
        size="lg"
        drawer
        footer={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const sub = detailSubject;
                setDetailSubject(null);
                handleOpenEdit(sub);
              }}
            >
              Chỉnh sửa thông tin
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setDetailSubject(null)}
            >
              Đóng
            </Button>
          </div>
        }
      >
        {detailSubject && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Tabs
              tabs={[
                { id: 'info', label: 'Thông tin học phần' },
                { id: 'classes', label: 'Lớp đang mở', count: subjectClasses.length },
                { id: 'prereq', label: 'Tiên quyết & Phụ thuộc' },
                { id: 'materials', label: 'Đề cương & Tài liệu' }
              ]}
              activeTab={detailTab}
              onChange={setDetailTab}
            />

            {detailTab === 'info' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ padding: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Mã học phần</span>
                  <strong style={{ display: 'block', fontSize: 'var(--font-size-base)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                    {detailSubject.subject_code}
                  </strong>
                </div>

                <div style={{ padding: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Số tín chỉ</span>
                  <strong style={{ display: 'block', fontSize: 'var(--font-size-base)', marginTop: '4px' }}>
                    {detailSubject.credits} Tín chỉ
                  </strong>
                </div>

                <div style={{ padding: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Phân bổ số tiết</span>
                  <strong style={{ display: 'block', fontSize: 'var(--font-size-base)', marginTop: '4px' }}>
                    {detailSubject.theory_periods} Lý thuyết / {detailSubject.practice_periods} Thực hành
                  </strong>
                </div>

                <div style={{ padding: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Khoa quản lý chuyên môn</span>
                  <strong style={{ display: 'block', fontSize: 'var(--font-size-base)', marginTop: '4px' }}>
                    {detailSubject.department_name || 'Khoa Công nghệ Thông tin'}
                  </strong>
                </div>
              </div>
            )}

            {detailTab === 'classes' && (
              <div>
                {subjectClasses.length === 0 ? (
                  <EmptyState
                    compact
                    title="Chưa mở lớp học phần trong học kỳ này"
                    description="Bạn có thể tạo lớp học phần mới cho môn này tại phân hệ Quản lý Lớp học phần."
                  />
                ) : (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Mã lớp</Table.Th>
                        <Table.Th>Giảng viên</Table.Th>
                        <Table.Th>Sĩ số</Table.Th>
                        <Table.Th align="right">Trạng thái</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {subjectClasses.map(cls => (
                        <Table.Tr key={cls.id}>
                          <Table.Td>
                            <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{cls.class_code}</span>
                          </Table.Td>
                          <Table.Td>{cls.lecturer_name || 'Chưa phân công'}</Table.Td>
                          <Table.Td>{cls.current_students} / {cls.max_students}</Table.Td>
                          <Table.Td align="right">
                            <Badge variant={cls.status === 'OPEN' ? 'success' : 'neutral'} size="sm">
                              {cls.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </div>
            )}

            {detailTab === 'prereq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Môn tiên quyết cần đạt trước
                  </span>
                  {detailSubject.prerequisites && detailSubject.prerequisites.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {detailSubject.prerequisites.map((p, i) => (
                        <Badge key={i} variant="warning" size="md">
                          {p} (≥ 4.0 điểm)
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      Không yêu cầu môn tiên quyết. Sinh viên có thể đăng ký tự do.
                    </span>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    Các môn học xem môn này là điều kiện tiên quyết
                  </span>
                  {dependentSubjects.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {dependentSubjects.map(s => (
                        <Badge key={s.id} variant="neutral" size="md">
                          {s.subject_code} - {s.subject_name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                      Chưa có môn học nào yêu cầu môn này làm tiên quyết.
                    </span>
                  )}
                </div>
              </div>
            )}

            {detailTab === 'materials' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', margin: '0 0 4px 0' }}>Mục tiêu học phần</h4>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Cung cấp cho người học khối kiến thức cốt lõi và năng lực thực hành chuyên sâu tương ứng với {detailSubject.credits} tín chỉ chuẩn đầu ra.
                  </p>
                </div>

                <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', margin: '0 0 4px 0' }}>Hình thức đánh giá học phần</h4>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Đánh giá liên tục: Chuyên cần (10%), Kiểm tra giữa kỳ (30%), Thi kết thúc học phần (60%). Điểm tổng kết hệ 10 quy đổi thang 4 và điểm chữ.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={isEditing ? 'Chỉnh sửa học phần' : 'Thêm học phần mới'}
        size="md"
        footer={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowFormModal(false)}
              disabled={submitting}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={submitting}
              onClick={handleSubmit}
            >
              {isEditing ? 'Lưu thay đổi' : 'Tạo học phần'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
            <Input
              label="Mã học phần *"
              placeholder="VD: INT1006"
              disabled={isEditing}
              required
              value={formData.subject_code}
              onChange={e => setFormData({ ...formData, subject_code: e.target.value.toUpperCase() })}
            />

            <Input
              label="Tên học phần *"
              placeholder="VD: An toàn và bảo mật hệ thống"
              required
              value={formData.subject_name}
              onChange={e => setFormData({ ...formData, subject_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Input
              type="number"
              label="Số tín chỉ *"
              min="1"
              max="10"
              required
              value={formData.credits}
              onChange={e => setFormData({ ...formData, credits: e.target.value })}
            />

            <Input
              type="number"
              label="Tiết lý thuyết"
              min="0"
              value={formData.theory_periods}
              onChange={e => setFormData({ ...formData, theory_periods: e.target.value })}
            />

            <Input
              type="number"
              label="Tiết thực hành"
              min="0"
              value={formData.practice_periods}
              onChange={e => setFormData({ ...formData, practice_periods: e.target.value })}
            />
          </div>

          <Select
            label="Khoa / Bộ môn phụ trách *"
            value={formData.department_id}
            onChange={e => setFormData({ ...formData, department_id: e.target.value })}
            options={departments.map(d => ({ value: String(d.id), label: d.department_name }))}
          />

          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
              Môn học tiên quyết (chọn để thêm điều kiện)
            </label>
            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {subjects.filter(s => s.id !== currentId).map(s => {
                const isChecked = formData.prerequisite_ids.includes(String(s.id));
                return (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-xs)', padding: '4px 6px', borderRadius: 'var(--radius-xs)', cursor: 'pointer', backgroundColor: isChecked ? 'var(--color-surface-hover)' : 'transparent' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        const idStr = String(s.id);
                        const next = e.target.checked
                          ? [...formData.prerequisite_ids, idStr]
                          : formData.prerequisite_ids.filter(x => x !== idStr);
                        setFormData({ ...formData, prerequisite_ids: next });
                      }}
                    />
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{s.subject_code}</strong>
                    <span>{s.subject_name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
