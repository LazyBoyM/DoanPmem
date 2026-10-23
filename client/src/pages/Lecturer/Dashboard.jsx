import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAcademic } from '../../context/academic-context';
import { useFeedback } from '../../context/feedback-context';
import axiosClient from '../../api/axiosClient';
import { downloadFile } from '../../api/download';
import { Button, Input, Select, Badge, Table, Modal, DensityToggle, Skeleton, EmptyState } from '../../components/ui';
import { scoreFields, scoreLabels, scoreWeights, hasGradeChanges, invalidGrade, gradePayload, mergeSavedGrade } from './gradeBook';

const locked = value => Number(value) === 1;
const resultText = value => value ?? '—';

export default function LecturerDashboard() {
  const { semesterId, semesters, setSemesterId } = useAcademic();
  const { confirm } = useFeedback();
  const [classResult, setClassResult] = useState({ semesterId: '', data: [] });
  const [selectedClass, setSelectedClass] = useState('');
  const [view, setView] = useState({ classId: '', semesterId: '', students: [], saved: {}, course: null });
  const [classError, setClassError] = useState('');
  const [studentError, setStudentError] = useState('');
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [inspectedId, setInspectedId] = useState(null);

  const classes = classResult.semesterId === semesterId ? classResult.data : [];
  const validSelection = classes.some(c => String(c.id) === String(selectedClass));
  const loaded = validSelection && view.classId === String(selectedClass) && view.semesterId === semesterId;
  const students = loaded ? view.students : [];
  const course = loaded ? view.course : null;
  const selected = classes.find(c => String(c.id) === String(selectedClass));
  const isLocked = locked(course?.grades_locked) || students.some(s => locked(s.is_locked));
  const dirtyStudents = students.filter(s => hasGradeChanges(s, view.saved[s.enrollment_id]));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = loaded ? view.students : [];
    return list.filter(s => `${s.full_name} ${s.student_code} ${s.class_name}`.toLowerCase().includes(q));
  }, [loaded, view.students, search]);

  const inspected = students.find(s => s.enrollment_id === inspectedId);
  const classLoading = Boolean(semesterId) && classResult.semesterId !== semesterId && !classError;
  const studentLoading = validSelection && !loaded && !studentError;
  const markedCount = students.filter(s => s.total_score_10 != null).length;
  const semesterName = semesters.find(s => String(s.id) === String(semesterId))?.semester_name;

  const fetchClasses = useCallback(async signal => {
    if (!semesterId) return;
    try {
      const res = await axiosClient.get('/lecturer/my-classes', { params: { semester_id: semesterId }, signal });
      if (!signal?.aborted) {
        setClassResult({ semesterId, data: res.data });
        setSelectedClass(String(res.data[0]?.id || ''));
        setClassError('');
      }
    } catch (err) {
      if (!signal?.aborted) setClassError(err.response?.data?.message || 'Không tải được danh sách lớp học phần.');
    }
  }, [semesterId]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (active) fetchClasses(controller.signal);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [fetchClasses]);

  const fetchStudents = useCallback(async (classId, signal) => {
    try {
      const res = await axiosClient.get(`/lecturer/class-students/${classId}`, { signal });
      if (!signal?.aborted) {
        setView({
          classId: String(classId),
          semesterId,
          students: res.data,
          saved: Object.fromEntries(res.data.map(s => [s.enrollment_id, { ...s }])),
          course: res.course_class
        });
        setStudentError('');
      }
    } catch (err) {
      if (!signal?.aborted) setStudentError(err.response?.data?.message || 'Không tải được danh sách sinh viên.');
    }
  }, [semesterId]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (validSelection) {
      Promise.resolve().then(() => {
        if (active) fetchStudents(selectedClass, controller.signal);
      });
    }
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedClass, validSelection, fetchStudents]);

  useEffect(() => {
    if (!dirtyStudents.length) return;
    const prevent = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirtyStudents.length]);

  const changeScope = async (value, isSemester = false) => {
    if (saving || String(value) === String(isSemester ? semesterId : selectedClass)) return;
    if (dirtyStudents.length && !await confirm(`Có ${dirtyStudents.length} sinh viên có điểm chưa lưu. Bỏ các thay đổi để ${isSemester ? 'đổi học kỳ' : 'chuyển lớp'}?`)) return;
    setNotice(null);
    setSearch('');
    setInspectedId(null);
    setStudentError('');
    if (isSemester) {
      setClassError('');
      setSemesterId(value);
    } else {
      setSelectedClass(value);
    }
  };

  const handleGradeChange = (enrollmentId, field, val) => {
    setNotice(null);
    setView(prev => ({
      ...prev,
      students: prev.students.map(s => s.enrollment_id === enrollmentId ? { ...s, [field]: val } : s)
    }));
  };

  const saveGrades = async rows => {
    if (saving || isLocked || !rows.length) return;
    if (rows.some(invalidGrade)) {
      setNotice({ type: 'danger', text: 'Điểm số phải nằm trong khoảng từ 0.0 đến 10.0. Vui lòng kiểm tra lại ô có viền đỏ.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    let savedCount = 0;
    try {
      for (const student of rows) {
        const res = await axiosClient.post('/lecturer/update-grades', {
          enrollment_id: student.enrollment_id,
          ...gradePayload(student)
        });
        if (!res.success) throw new Error(res.message || 'Không lưu được điểm.');
        setView(prev => mergeSavedGrade(prev, student.enrollment_id, res.data));
        savedCount++;
      }
      setNotice({ type: 'success', text: `Đã lưu thành công điểm của ${savedCount} sinh viên. Điểm tổng kết hệ 4 và điểm chữ đã tự động cập nhật.` });
    } catch (err) {
      setNotice({ type: 'danger', text: `${savedCount ? `Đã lưu ${savedCount}/${rows.length} sinh viên. ` : ''}${err.response?.data?.message || err.message || 'Không lưu được điểm.'}` });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!course || saving) return;
    try {
      await downloadFile(`/reports/export-class-excel/${selectedClass}`, `Danh_sach_diem_${selectedClass}.xlsx`);
    } catch {
      setNotice({ type: 'danger', text: 'Không thể xuất danh sách lớp học phần.' });
    }
  };

  const handleToggleLock = async () => {
    if (!course || saving || dirtyStudents.length) return;
    const actionName = isLocked ? 'mở khóa' : 'khóa sổ điểm';
    if (!await confirm(`Bạn có chắc chắn muốn ${actionName} lớp học phần này?`)) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await axiosClient.put(`/lecturer/lock-grades/${selectedClass}`, { is_locked: isLocked ? 0 : 1 });
      if (res.success) {
        const value = isLocked ? 0 : 1;
        setView(prev => ({
          ...prev,
          course: { ...prev.course, grades_locked: value },
          students: prev.students.map(s => ({ ...s, is_locked: value }))
        }));
        setClassResult(prev => ({
          ...prev,
          data: prev.data.map(c => String(c.id) === String(selectedClass) ? { ...c, grades_locked: value } : c)
        }));
        setNotice({ type: 'success', text: res.message });
      }
    } catch (err) {
      setNotice({ type: 'danger', text: err.response?.data?.message || 'Không đổi được trạng thái khóa sổ điểm.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '1600px', margin: '0 auto', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Bảng điểm học phần
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: '220px' }}>
            <Select
              label="Học kỳ"
              value={semesterId}
              disabled={saving}
              onChange={e => changeScope(e.target.value, true)}
              options={semesters.map(s => ({ value: String(s.id), label: s.semester_name }))}
            />
          </div>
        </div>
      </div>

      {notice && (
        <div style={{ padding: '12px 16px', backgroundColor: notice.type === 'danger' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)', border: `1px solid ${notice.type === 'danger' ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`, borderRadius: 'var(--radius-sm)', color: notice.type === 'danger' ? 'var(--color-danger-text)' : 'var(--color-success-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} role="alert">
          <span style={{ fontSize: 'var(--font-size-base)' }}>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {studentError && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} role="alert">
          <span style={{ fontSize: 'var(--font-size-base)' }}>{studentError}</span>
          <Button variant="danger" size="sm" onClick={() => fetchStudents(selectedClass)}>Thử lại</Button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) minmax(0, 1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
              Lớp học phần phụ trách
            </h2>
            <Badge variant="neutral" size="sm">{classes.length}</Badge>
          </div>

          {classLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Skeleton height="54px" />
              <Skeleton height="54px" />
            </div>
          ) : !classes.length ? (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', padding: '16px 0', textAlign: 'center' }}>
              Không có lớp học phần nào trong học kỳ này.
            </span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: 'calc(100vh - 360px)', overflowY: 'auto' }}>
              {classes.map(c => {
                const isCurrent = String(c.id) === String(selectedClass);
                const isClassLocked = locked(c.grades_locked);
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={saving}
                    onClick={() => changeScope(String(c.id))}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: isCurrent ? '1px solid var(--color-accent)' : '1px solid var(--color-border-subtle)',
                      backgroundColor: isCurrent ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 120ms ease'
                    }}
                    className="keyboard-focus"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', fontSize: 'var(--font-size-xs)', color: isCurrent ? 'var(--color-accent-text)' : 'var(--color-text-secondary)' }}>
                        {c.class_code}
                      </span>
                      <Badge variant={isClassLocked ? 'danger' : 'success'} size="sm">
                        {isClassLocked ? 'Đã khóa' : 'Mở'}
                      </Badge>
                    </div>
                    <strong style={{ fontSize: 'var(--font-size-base)', color: isCurrent ? 'var(--color-accent-text)' : 'var(--color-text-primary)', marginTop: '4px' }}>
                      {c.subject_name}
                    </strong>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {c.current_students ?? 0} sinh viên · {c.credits} tín chỉ
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Trọng số đánh giá
            </span>
            {scoreLabels.map((label, idx) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                <span>{label}</span>
                <strong className="tabular-nums">{scoreWeights[idx]}%</strong>
              </div>
            ))}
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: '1.5' }}>
              Điểm tổng kết hệ 10, hệ 4 và điểm chữ được tự động quy đổi khi lưu.
            </span>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
                  {selected?.subject_name || 'Bảng điểm học phần'}
                </h2>
                <Badge variant={isLocked ? 'danger' : 'success'} size="sm" dot>
                  {isLocked ? 'Đã khóa điểm' : 'Đang mở nhập điểm'}
                </Badge>
              </div>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {selected ? `${selected.class_code} · ${selected.credits} tín chỉ` : semesterName} · <strong>{students.length}</strong> sinh viên ({markedCount} đã có điểm)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={!course || saving}
                onClick={handleExport}
              >
                Xuất Excel
              </Button>

              <Button
                variant={isLocked ? 'secondary' : 'danger-subtle'}
                size="sm"
                disabled={!course || saving || Boolean(dirtyStudents.length)}
                onClick={handleToggleLock}
              >
                {isLocked ? 'Mở khóa điểm' : 'Khóa sổ điểm'}
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <Input
                placeholder="Tìm tên hoặc mã sinh viên trong bảng điểm…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="sm"
                aria-label="Tìm kiếm sinh viên trong bảng điểm"
              />
            </div>
            <DensityToggle />
          </div>

          {studentLoading ? (
            <Skeleton.Table rows={8} cols={7} />
          ) : !filtered.length ? (
            <EmptyState
              title={classError ? 'Không tải được danh sách' : !validSelection ? 'Chưa chọn lớp học phần' : 'Không có sinh viên trong lớp'}
              description="Chọn lớp học phần bên trái hoặc kiểm tra lại điều kiện lọc tìm kiếm."
            />
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th width="40px">STT</Table.Th>
                  <Table.Th width="24%">Sinh viên</Table.Th>
                  {scoreLabels.map((lbl, idx) => (
                    <Table.Th key={lbl} width="11%" align="center">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span>{lbl}</span>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>{scoreWeights[idx]}%</span>
                      </div>
                    </Table.Th>
                  ))}
                  <Table.Th width="18%" align="center">Tổng kết (10 / 4 / Chữ)</Table.Th>
                  <Table.Th width="90px" align="right">Trạng thái</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((s, idx) => {
                  const dirty = hasGradeChanges(s, view.saved[s.enrollment_id]);
                  const isFail = s.letter_grade === 'F';
                  return (
                    <Table.Tr key={s.enrollment_id} active={dirty}>
                      <Table.Td>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{idx + 1}</span>
                      </Table.Td>

                      <Table.Td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <button
                            type="button"
                            onClick={() => setInspectedId(s.enrollment_id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              textAlign: 'left',
                              color: 'var(--color-text-primary)',
                              fontWeight: '600',
                              fontSize: 'var(--font-size-base)',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                          >
                            {s.full_name}
                          </button>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                            {s.student_code} · {s.class_name}
                          </span>
                        </div>
                      </Table.Td>

                      {scoreFields.map((field) => {
                        const val = s[field] ?? '';
                        const isChanged = hasGradeChanges({ [field]: val }, { [field]: view.saved[s.enrollment_id]?.[field] });
                        const isInvalid = val !== '' && (!Number.isFinite(Number(val)) || Number(val) < 0 || Number(val) > 10);
                        return (
                          <Table.Td key={field} align="center">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              disabled={isLocked || saving}
                              value={val}
                              onChange={e => handleGradeChange(s.enrollment_id, field, e.target.value)}
                              aria-label={`${field} của ${s.full_name}`}
                              style={{
                                width: '64px',
                                height: '34px',
                                textAlign: 'center',
                                borderRadius: 'var(--radius-sm)',
                                border: `1px solid ${isInvalid ? 'var(--color-danger)' : isChanged ? 'var(--color-accent)' : 'var(--color-border)'}`,
                                backgroundColor: isLocked ? 'var(--color-surface-hover)' : isChanged ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
                                color: isInvalid ? 'var(--color-danger)' : 'var(--color-text-primary)',
                                fontWeight: isChanged ? '700' : '500',
                                fontSize: 'var(--font-size-base)',
                                outline: 'none'
                              }}
                              className="tabular-nums keyboard-focus"
                            />
                          </Table.Td>
                        );
                      })}

                      <Table.Td align="center">
                        {dirty ? (
                          <Badge variant="warning" size="sm">Chưa lưu</Badge>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <strong className="tabular-nums" style={{ fontSize: 'var(--font-size-base)', color: isFail ? 'var(--color-danger)' : 'inherit' }}>
                              {resultText(s.total_score_10)}
                            </strong>
                            <span className="tabular-nums" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                              ({resultText(s.total_score_4)})
                            </span>
                            <Badge variant={isFail ? 'danger' : 'neutral'} size="sm">
                              {resultText(s.letter_grade)}
                            </Badge>
                          </div>
                        )}
                      </Table.Td>

                      <Table.Td align="right">
                        {dirty ? (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isLocked || saving}
                            onClick={() => saveGrades([s])}
                          >
                            Lưu
                          </Button>
                        ) : (
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Đã lưu</span>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}

          {dirtyStudents.length > 0 && (
            <div
              style={{
                position: 'sticky',
                bottom: '16px',
                zIndex: 10,
                backgroundColor: 'var(--color-text-primary)',
                color: '#ffffff',
                padding: '12px 18px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-modal)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }} />
                <span style={{ fontSize: 'var(--font-size-base)', fontWeight: '600' }}>
                  Có {dirtyStudents.length} sinh viên có điểm chưa lưu
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="primary"
                  size="md"
                  loading={saving}
                  onClick={() => saveGrades(dirtyStudents)}
                  style={{ backgroundColor: 'var(--color-accent-text)' }}
                >
                  Lưu tất cả ({dirtyStudents.length})
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(inspected)}
        onClose={() => setInspectedId(null)}
        title="Hồ sơ kết quả sinh viên"
        description={`${inspected?.full_name} (${inspected?.student_code})`}
        size="sm"
        footer={
          <Button variant="primary" size="sm" onClick={() => setInspectedId(null)}>
            Đóng
          </Button>
        }
      >
        {inspected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Lớp học phần</span>
                <strong style={{ display: 'block', fontSize: 'var(--font-size-base)', marginTop: '4px' }}>{selected?.class_code}</strong>
              </div>
              <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-hover)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Lớp sinh hoạt</span>
                <strong style={{ display: 'block', fontSize: 'var(--font-size-base)', marginTop: '4px' }}>{inspected.class_name}</strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scoreFields.map((f, i) => (
                <div key={f} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)' }}>
                  <span>{scoreLabels[i]} ({scoreWeights[i]}%)</span>
                  <strong className="tabular-nums">{view.saved[inspected.enrollment_id]?.[f] ?? '—'}</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-base)', borderTop: '1px dashed var(--color-border)', paddingTop: '6px' }}>
                <span style={{ fontWeight: '600' }}>Tổng kết hệ 10:</span>
                <strong className="tabular-nums">{view.saved[inspected.enrollment_id]?.total_score_10 ?? '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-base)' }}>
                <span style={{ fontWeight: '600' }}>Hệ 4 / Chữ:</span>
                <strong className="tabular-nums">
                  {view.saved[inspected.enrollment_id]?.total_score_4 ?? '—'} ({view.saved[inspected.enrollment_id]?.letter_grade ?? '—'})
                </strong>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
