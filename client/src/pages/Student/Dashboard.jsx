import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useAcademic } from '../../context/academic-context';
import { useFeedback } from '../../context/feedback-context';
import SemesterSelect from '../../components/SemesterSelect';
import { Button, Input, Select, Badge, Table, Modal, DensityToggle, Skeleton, EmptyState } from '../../components/ui';

const isLocked = value => value === true || Number(value) === 1;

export default function StudentDashboard() {
  const { confirm } = useFeedback();
  const { semesterId, period, refresh } = useAcademic();
  const navigate = useNavigate();

  const [data, setData] = useState({ openClasses: [], myEnrollments: [], submission: null });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [seatFilter, setSeatFilter] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [hoveredClass, setHoveredClass] = useState(null);

  const fetchData = useCallback(async (signal) => {
    if (!semesterId) return;
    setLoading(true);
    try {
      const [classesRes, enrollmentsRes, submissionRes] = await Promise.all([
        axiosClient.get('/registration/open-classes', { params: { semester_id: semesterId }, signal }),
        axiosClient.get('/registration/my-enrollments', { params: { semester_id: semesterId }, signal }),
        axiosClient.get('/registration/submission', { params: { semester_id: semesterId }, signal })
      ]);
      if (!signal?.aborted) {
        setData({
          openClasses: classesRes.data || [],
          myEnrollments: enrollmentsRes.data || [],
          submission: submissionRes.data || null
        });
        setError('');
      }
    } catch (err) {
      if (!signal?.aborted) {
        setError(err.response?.data?.message || 'Không thể nạp dữ liệu đăng ký tín chỉ.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [semesterId]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => fetchData(controller.signal));
    return () => controller.abort();
  }, [fetchData]);

  const enrolledClassIds = useMemo(() => {
    return new Set(data.myEnrollments.map(e => e.id || e.course_class_id));
  }, [data.myEnrollments]);

  const totalCredits = useMemo(() => {
    return data.myEnrollments.reduce((sum, item) => sum + Number(item.credits || 0), 0);
  }, [data.myEnrollments]);

  const minCredits = period?.min_credits ?? 0;
  const maxCredits = period?.max_credits ?? 24;
  const isMinReached = totalCredits >= minCredits;
  const isMaxExceeded = maxCredits > 0 && totalCredits > maxCredits;

  const subjectsList = useMemo(() => {
    const map = new Map();
    data.openClasses.forEach(c => {
      if (c.subject_code && !map.has(c.subject_code)) {
        map.set(c.subject_code, c.subject_name);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ value: code, label: `${code} - ${name}` }));
  }, [data.openClasses]);

  const filteredClasses = useMemo(() => {
    return data.openClasses.filter(c => {
      const matchSearch = !search ||
        `${c.class_code} ${c.subject_name} ${c.lecturer_name || ''}`.toLowerCase().includes(search.toLowerCase());
      const matchSubject = !filterSubject || c.subject_code === filterSubject;
      const isFull = c.current_students >= c.max_students;
      const matchSeat = !seatFilter || (seatFilter === 'available' ? !isFull : isFull);
      return matchSearch && matchSubject && matchSeat;
    });
  }, [data.openClasses, search, filterSubject, seatFilter]);

  async function handleEnroll(classItem) {
    if (busy || !period) return;
    setBusy(true);
    setNotice(null);
    try {
      await axiosClient.post('/registration/enroll', { course_class_id: classItem.id });
      setNotice({ type: 'success', text: `Đã thêm ${classItem.subject_name} (${classItem.class_code}) vào kế hoạch học tập.` });
      await fetchData();
    } catch (err) {
      setNotice({ type: 'danger', text: err.response?.data?.message || 'Không thể đăng ký lớp học phần này.' });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function handleCancel(enrollment) {
    if (busy) return;
    const ok = await confirm(`Xác nhận hủy học phần ${enrollment.subject_name} (${enrollment.class_code})?`);
    if (!ok) return;

    setBusy(true);
    setNotice(null);
    try {
      await axiosClient.post('/registration/cancel', { enrollment_id: enrollment.enrollment_id });
      setNotice({ type: 'success', text: `Đã hủy học phần ${enrollment.subject_name}. Hãy chốt lại kế hoạch sau khi thay đổi.` });
      await fetchData();
    } catch (err) {
      setNotice({ type: 'danger', text: err.response?.data?.message || 'Không thể hủy học phần.' });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  async function handleFinalSubmit() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await axiosClient.post('/registration/submit', { semester_id: semesterId });
      setNotice({ type: 'success', text: res.message || 'Đã chốt kế hoạch học tập chính thức thành công.' });
      setShowConfirmModal(false);
      await fetchData();
    } catch (err) {
      setNotice({ type: 'danger', text: err.response?.data?.message || 'Không thể chốt kế hoạch đăng ký.' });
    } finally {
      setBusy(false);
      refresh();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Đăng ký tín chỉ
            </h1>
            {period ? (
              <Badge variant="success">Đang mở</Badge>
            ) : (
              <Badge variant="neutral">Chưa mở</Badge>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <SemesterSelect />
        </div>
      </div>

      {notice && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: notice.type === 'danger' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            border: `1px solid ${notice.type === 'danger' ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`,
            borderRadius: 'var(--radius-sm)',
            color: notice.type === 'danger' ? 'var(--color-danger-text)' : 'var(--color-success-text)',
            fontSize: 'var(--font-size-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
          role="status"
        >
          <span>{notice.text}</span>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} role="alert">
          <span>{error}</span>
          <Button variant="danger" size="sm" onClick={() => fetchData()}>Thử lại</Button>
        </div>
      )}

      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Tín chỉ đã chọn
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span className="tabular-nums" style={{ fontSize: '28px', fontWeight: '700', color: isMaxExceeded ? 'var(--color-danger)' : isMinReached ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {totalCredits}
              </span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                / tối thiểu {minCredits} TC · tối đa {maxCredits} TC
              </span>
            </div>
          </div>

          <div style={{ width: '200px' }}>
            <div style={{ height: '8px', backgroundColor: 'var(--color-border-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, maxCredits ? (totalCredits / maxCredits) * 100 : 0)}%`,
                  backgroundColor: isMaxExceeded ? 'var(--color-danger)' : isMinReached ? 'var(--color-success)' : 'var(--color-accent)',
                  transition: 'width 200ms ease'
                }}
              />
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>
              {isMaxExceeded ? 'Đã vượt mức tối đa cho phép' : isMinReached ? 'Đã đạt điều kiện tín chỉ tối thiểu' : `Cần thêm ít nhất ${minCredits - totalCredits} tín chỉ`}
            </span>
          </div>

          <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 'var(--space-4)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Trạng thái chốt
            </span>
            <div style={{ marginTop: '2px' }}>
              {data.submission ? (
                <Badge variant="success">Đã chốt ({data.submission.total_credits} TC)</Badge>
              ) : (
                <Badge variant="warning">Chưa chốt kế hoạch</Badge>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Button
            variant="primary"
            size="md"
            disabled={busy || !period || !isMinReached || isMaxExceeded || Boolean(data.submission)}
            onClick={() => setShowConfirmModal(true)}
          >
            {data.submission ? 'Đã chốt kế hoạch' : 'Chốt kế hoạch học tập'}
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1.2fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
                Mục lục lớp học phần mở đăng ký
              </h2>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Hiển thị {filteredClasses.length} lớp học phần theo tiêu chí
              </span>
            </div>
            <DensityToggle />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '220px' }}>
              <Input
                placeholder="Tìm mã lớp, tên môn học, giảng viên…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="sm"
                aria-label="Tìm kiếm lớp học phần"
              />
            </div>

            <div style={{ width: '200px' }}>
              <Select
                value={filterSubject}
                onChange={e => setFilterSubject(e.target.value)}
                size="sm"
                aria-label="Lọc theo môn học"
                options={[
                  { value: '', label: 'Tất cả môn học' },
                  ...subjectsList
                ]}
              />
            </div>

            <div style={{ width: '140px' }}>
              <Select
                value={seatFilter}
                onChange={e => setSeatFilter(e.target.value)}
                size="sm"
                aria-label="Lọc theo chỗ ngồi"
                options={[
                  { value: '', label: 'Tất cả chỗ' },
                  { value: 'available', label: 'Còn chỗ' },
                  { value: 'full', label: 'Đã hết chỗ' }
                ]}
              />
            </div>
          </div>

          {loading ? (
            <Skeleton.Table rows={6} cols={5} />
          ) : filteredClasses.length === 0 ? (
            <EmptyState
              title="Không tìm thấy lớp học phần"
              description="Không có lớp nào phù hợp với từ khóa hoặc bộ lọc đã chọn trong học kỳ này."
            />
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th width="32%">Môn học / Lớp</Table.Th>
                  <Table.Th width="12%">Tín chỉ</Table.Th>
                  <Table.Th width="26%">Thời khóa biểu & Phòng</Table.Th>
                  <Table.Th width="16%">Sĩ số</Table.Th>
                  <Table.Th width="14%" align="right">Thao tác</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredClasses.map(cls => {
                  const isEnrolled = enrolledClassIds.has(cls.id);
                  const isFull = cls.current_students >= cls.max_students;
                  const ratio = Math.round((cls.current_students / (cls.max_students || 1)) * 100);

                  return (
                    <Table.Tr
                      key={cls.id}
                      onMouseEnter={() => setHoveredClass(cls)}
                      onMouseLeave={() => setHoveredClass(null)}
                      style={{
                        backgroundColor: isEnrolled ? 'var(--color-surface-subtle)' : undefined
                      }}
                    >
                      <Table.Td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
                            {cls.subject_name}
                          </strong>
                          <span className="tabular-nums" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {cls.class_code} · GV: {cls.lecturer_name || 'Đang cập nhật'}
                          </span>
                        </div>
                      </Table.Td>

                      <Table.Td>
                        <Badge variant="neutral">{cls.credits} TC</Badge>
                      </Table.Td>

                      <Table.Td>
                        {Array.isArray(cls.schedules) && cls.schedules.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {cls.schedules.map((sch, sIdx) => (
                              <span key={sIdx} className="tabular-nums" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                                Thứ {sch.day_of_week === 8 ? 'CN' : sch.day_of_week} (Tiết {sch.start_period}-{sch.start_period + sch.total_periods - 1}) · Phòng {sch.room || '—'}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="tabular-nums" style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: isFull ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                            {cls.current_students} / {cls.max_students} ({ratio}%)
                          </span>
                          <div style={{ height: '6px', backgroundColor: 'var(--color-border-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
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

                      <Table.Td align="right">
                        {isEnrolled ? (
                          <Badge variant="success">Đã đăng ký</Badge>
                        ) : isFull ? (
                          <Badge variant="danger">Hết chỗ</Badge>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={busy || !period}
                            onClick={() => handleEnroll(cls)}
                          >
                            Đăng ký
                          </Button>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
                  Kế hoạch học tập đã chọn
                </h3>
                <Badge variant="neutral">{data.myEnrollments.length} lớp</Badge>
              </div>
              <span className="tabular-nums" style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-accent-text)' }}>
                {totalCredits} TC
              </span>
            </div>

            {data.myEnrollments.length === 0 ? (
              <EmptyState
                title="Chưa có học phần trong kế hoạch"
                description="Hãy chọn các lớp học phần ở danh mục bên trái để bắt đầu lập kế hoạch học tập cho học kỳ này."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '380px', overflowY: 'auto' }}>
                {data.myEnrollments.map(enr => {
                  const locked = isLocked(enr.grades_locked) || isLocked(enr.grade?.is_locked);
                  const hasGrade = enr.grade && [enr.grade.attendance_score, enr.grade.midterm_score, enr.grade.final_score].some(v => v != null);
                  const canCancel = !locked && !hasGrade && Boolean(period);

                  return (
                    <div
                      key={enr.enrollment_id}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--color-surface-subtle)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                        <strong style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
                          {enr.subject_name}
                        </strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Badge variant="neutral">{enr.credits} TC</Badge>
                          {canCancel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() => handleCancel(enr)}
                              title="Hủy học phần này"
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        <span>Lớp: {enr.class_code}</span>
                        {locked ? (
                          <span style={{ color: 'var(--color-warning)' }}>Đã khóa điểm</span>
                        ) : hasGrade ? (
                          <span style={{ color: 'var(--color-warning)' }}>Đã có điểm</span>
                        ) : null}
                      </div>

                      {Array.isArray(enr.schedules) && enr.schedules.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {enr.schedules.map((sch, sIdx) => (
                            <span key={sIdx} className="tabular-nums" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                              Thứ {sch.day_of_week === 8 ? 'CN' : sch.day_of_week} (Tiết {sch.start_period}-{sch.start_period + sch.total_periods - 1}) · P.{sch.room || '—'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
                Thời khóa biểu tuần trực quan (2D)
              </h3>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Thứ 2 - Thứ 7
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '50px repeat(6, 1fr)', gap: '2px', backgroundColor: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'var(--color-surface-subtle)', padding: '6px 4px', fontSize: 'var(--font-size-xs)', textAlign: 'center', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                Tiết
              </div>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day, idx) => (
                <div key={idx} style={{ backgroundColor: 'var(--color-surface-subtle)', padding: '6px 4px', fontSize: 'var(--font-size-xs)', textAlign: 'center', fontWeight: '600', color: 'var(--color-text-muted)' }}>
                  {day}
                </div>
              ))}

              {[
                { slot: '1-3', label: 'Sáng 1' },
                { slot: '4-6', label: 'Sáng 2' },
                { slot: '7-9', label: 'Chiều 1' },
                { slot: '10-12', label: 'Chiều 2' }
              ].map((shift, shiftIdx) => (
                <div key={shiftIdx} style={{ display: 'contents' }}>
                  <div style={{ backgroundColor: 'var(--color-surface-subtle)', padding: '8px 4px', fontSize: 'var(--font-size-xs)', textAlign: 'center', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {shift.slot}
                  </div>
                  {[2, 3, 4, 5, 6, 7].map(dayNum => {
                    const matchedEnrollment = data.myEnrollments.find(e =>
                      Array.isArray(e.schedules) && e.schedules.some(s => {
                        const shiftStart = shiftIdx === 0 ? 1 : shiftIdx === 1 ? 4 : shiftIdx === 2 ? 7 : 10;
                        return Number(s.day_of_week) === dayNum && s.start_period <= shiftStart + 2 && (s.start_period + s.total_periods - 1) >= shiftStart;
                      })
                    );

                    const isHoverMatch = hoveredClass && Array.isArray(hoveredClass.schedules) && hoveredClass.schedules.some(s => {
                      const shiftStart = shiftIdx === 0 ? 1 : shiftIdx === 1 ? 4 : shiftIdx === 2 ? 7 : 10;
                      return Number(s.day_of_week) === dayNum && s.start_period <= shiftStart + 2 && (s.start_period + s.total_periods - 1) >= shiftStart;
                    });

                    return (
                      <div
                        key={dayNum}
                        style={{
                          backgroundColor: matchedEnrollment ? 'var(--color-accent-subtle)' : isHoverMatch ? 'var(--color-warning-subtle)' : 'var(--color-surface)',
                          border: isHoverMatch && matchedEnrollment ? '1px dashed var(--color-danger)' : undefined,
                          padding: '4px',
                          minHeight: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          transition: 'background-color 150ms ease'
                        }}
                      >
                        {matchedEnrollment ? (
                          <span style={{ fontSize: '9px', fontWeight: '600', color: 'var(--color-accent-text)', lineHeight: 1.1, wordBreak: 'break-word' }}>
                            {matchedEnrollment.subject_name.slice(0, 14)}…
                          </span>
                        ) : isHoverMatch ? (
                          <span style={{ fontSize: '9px', fontWeight: '600', color: 'var(--color-warning-text)' }}>
                            Xem trước
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Ô màu xanh biểu thị lớp đã xếp vào lịch. Ô màu vàng biểu thị lịch của lớp đang rê chuột vào.
            </span>
          </div>
        </div>
      </div>

      <Modal
        open={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Xác nhận chốt kế hoạch học tập"
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Tóm tắt kế hoạch học tập:
            </span>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Tổng số học phần đã chọn: <strong>{data.myEnrollments.length} lớp</strong></li>
              <li>Tổng số tín chỉ: <strong>{totalCredits} tín chỉ</strong> (Tối thiểu: {minCredits} TC)</li>
            </ul>
          </div>

          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', margin: 0 }}>
            Sau khi chốt, kế hoạch học tập sẽ được ghi nhận vào hệ thống quản lý đào tạo. Mọi thay đổi hủy hoặc thêm lớp sau đó sẽ yêu cầu thực hiện chốt lại.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <Button
              variant="outline"
              size="md"
              disabled={busy}
              onClick={() => setShowConfirmModal(false)}
            >
              Xem lại
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={busy}
              onClick={handleFinalSubmit}
            >
              Xác nhận chốt ngay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
