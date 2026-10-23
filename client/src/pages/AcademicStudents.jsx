import { useEffect, useState, useMemo } from 'react';
import useAcademicReport from '../hooks/useAcademicReport';
import { useAuth } from '../context/auth-context';
import { useAcademic } from '../context/academic-context';
import axiosClient from '../api/axiosClient';
import AcademicTranscript from '../components/AcademicTranscript';
import { Button, Input, Select, Badge, Table, DensityToggle, Skeleton, EmptyState } from '../components/ui';

export default function AcademicStudents() {
  const { user } = useAuth();
  const { semesters } = useAcademic();
  const [directory, setDirectory] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [studentId, setStudentId] = useState('');
  const [semester, setSemester] = useState('');
  const [directoryError, setDirectoryError] = useState('');
  const [directoryVersion, setDirectoryVersion] = useState(0);
  const [viewMode, setViewMode] = useState('table');

  const { report: current, error: reportError, refresh } = useAcademicReport(
    studentId ? `/academic/students/${studentId}/transcript` : null,
    semester
  );

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    axiosClient.get('/academic/students', { signal: controller.signal })
      .then(response => {
        if (active && !controller.signal.aborted) {
          setDirectory(response.data);
          setDirectoryError('');
        }
      })
      .catch(error => {
        if (active && !controller.signal.aborted) {
          setDirectoryError(error.response?.data?.message || 'Không tải được danh sách sinh viên.');
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [directoryVersion]);

  const classesList = useMemo(() => {
    if (!directory) return [];
    return [...new Set(directory.map(s => s.class_name).filter(Boolean))].sort();
  }, [directory]);

  const statusCounts = useMemo(() => {
    if (!directory) return { ALL: 0, EXCELLENT: 0, RESIT: 0, RETAKE: 0 };
    return {
      ALL: directory.length,
      EXCELLENT: directory.filter(s => s.academic_status === 'EXCELLENT').length,
      RESIT: directory.filter(s => s.academic_status === 'RESIT').length,
      RETAKE: directory.filter(s => s.academic_status === 'RETAKE').length
    };
  }, [directory]);

  const filtered = useMemo(() => {
    if (!directory) return [];
    const q = search.toLowerCase();
    return directory.filter(s => {
      const matchText = `${s.full_name} ${s.student_code} ${s.class_name}`.toLowerCase().includes(q);
      const matchClass = selectedClass ? s.class_name === selectedClass : true;
      const matchStatus = statusFilter === 'ALL'
        ? true
        : statusFilter === 'EXCELLENT'
        ? s.academic_status === 'EXCELLENT'
        : statusFilter === 'RESIT'
        ? s.academic_status === 'RESIT'
        : statusFilter === 'RETAKE'
        ? s.academic_status === 'RETAKE'
        : true;
      return matchText && matchClass && matchStatus;
    });
  }, [directory, search, selectedClass, statusFilter]);

  const error = directoryError || reportError;

  const retry = () => {
    if (directoryError) {
      setDirectoryError('');
      setDirectoryVersion(v => v + 1);
    } else {
      refresh();
    }
  };

  const getStatusBadge = (s) => {
    if (s.academic_status === 'EXCELLENT') {
      return <Badge variant="success" size="sm" dot>Xuất sắc</Badge>;
    }
    if (s.academic_status === 'RETAKE') {
      return <Badge variant="danger" size="sm" dot>Học lại</Badge>;
    }
    if (s.academic_status === 'RESIT') {
      return <Badge variant="warning" size="sm" dot>Thi lại ({s.can_resit_count} môn)</Badge>;
    }
    if (s.academic_status === 'VERY_GOOD') {
      return <Badge variant="accent" size="sm">Giỏi</Badge>;
    }
    return <Badge variant="neutral" size="sm">Đạt</Badge>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Theo dõi học vụ
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: 'var(--color-surface-hover)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
              gap: '2px'
            }}
            role="group"
            aria-label="Chế độ hiển thị"
          >
            <button
              type="button"
              aria-pressed={viewMode === 'table'}
              onClick={() => setViewMode('table')}
              style={{
                border: 'none',
                padding: '4px 10px',
                fontSize: 'var(--font-size-xs)',
                fontWeight: '600',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: viewMode === 'table' ? 'var(--color-surface)' : 'transparent',
                color: viewMode === 'table' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                boxShadow: viewMode === 'table' ? 'var(--shadow-xs)' : 'none',
                cursor: 'pointer'
              }}
              className="keyboard-focus"
            >
              Bảng tổng hợp liên lớp
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'split'}
              onClick={() => setViewMode('split')}
              style={{
                border: 'none',
                padding: '4px 10px',
                fontSize: 'var(--font-size-xs)',
                fontWeight: '600',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: viewMode === 'split' ? 'var(--color-surface)' : 'transparent',
                color: viewMode === 'split' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                boxShadow: viewMode === 'split' ? 'var(--shadow-xs)' : 'none',
                cursor: 'pointer'
              }}
              className="keyboard-focus"
            >
              Hồ sơ chi tiết
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }} role="alert">
          <span style={{ fontSize: 'var(--font-size-base)' }}>{error}</span>
          <Button variant="danger" size="sm" onClick={retry}>
            Thử lại
          </Button>
        </div>
      )}

      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <Input
                placeholder="Tìm tên sinh viên, mã SV hoặc lớp…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="sm"
                aria-label="Tìm kiếm sinh viên"
              />
            </div>

            <div style={{ width: '180px' }}>
              <Select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                size="sm"
                aria-label="Lọc theo lớp sinh hoạt"
                options={[
                  { value: '', label: 'Tất cả các lớp' },
                  ...classesList.map(c => ({ value: c, label: `Lớp ${c}` }))
                ]}
              />
            </div>

            <div style={{ width: '180px' }}>
              <Select
                value={semester}
                onChange={e => setSemester(e.target.value)}
                size="sm"
                aria-label="Phạm vi học kỳ"
                options={[
                  { value: '', label: 'Tất cả học kỳ' },
                  ...semesters.map(s => ({ value: String(s.id), label: s.semester_name }))
                ]}
              />
            </div>
          </div>

          <DensityToggle />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid var(--color-border-subtle)' }}>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-text-muted)', marginRight: '6px' }}>
            Phân loại học vụ:
          </span>

          {[
            { id: 'ALL', label: 'Tất cả', count: statusCounts.ALL, variant: 'neutral' },
            { id: 'EXCELLENT', label: 'Xuất sắc', count: statusCounts.EXCELLENT, variant: 'success' },
            { id: 'RESIT', label: 'Thi lại', count: statusCounts.RESIT, variant: 'warning' },
            { id: 'RETAKE', label: 'Học lại', count: statusCounts.RETAKE, variant: 'danger' }
          ].map(tab => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: isActive ? '650' : '500',
                  borderRadius: 'var(--radius-sm)',
                  border: isActive ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                  backgroundColor: isActive ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
                  color: isActive ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease'
                }}
                className="keyboard-focus"
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-surface-hover)',
                    color: isActive ? '#070B19' : 'var(--color-text-muted)'
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {viewMode === 'table' ? (
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Danh sách kết quả: <strong>{filtered.length}</strong> sinh viên thỏa mãn tiêu chí lọc
            </span>
          </div>

          {!directory ? (
            <Skeleton.Table rows={8} cols={7} />
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th width="50px">STT</Table.Th>
                  <Table.Th width="130px">Mã sinh viên</Table.Th>
                  <Table.Th width="24%">Họ và tên</Table.Th>
                  <Table.Th width="12%">Lớp sinh hoạt</Table.Th>
                  <Table.Th width="11%" align="center">GPA Hệ 4</Table.Th>
                  <Table.Th width="11%" align="center">GPA Hệ 10</Table.Th>
                  <Table.Th width="12%" align="center">Tín chỉ tích lũy</Table.Th>
                  <Table.Th width="15%">Tình trạng học tập</Table.Th>
                  <Table.Th width="100px" align="right">Bảng điểm</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((s, idx) => (
                  <Table.Tr key={s.id}>
                    <Table.Td>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{idx + 1}</span>
                    </Table.Td>

                    <Table.Td>
                      <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontWeight: '650', color: 'var(--color-accent-text)' }}>
                        {s.student_code}
                      </span>
                    </Table.Td>

                    <Table.Td>
                      <strong style={{ color: 'var(--color-text-primary)' }}>{s.full_name}</strong>
                    </Table.Td>

                    <Table.Td>
                      <span style={{ fontWeight: '550', color: 'var(--color-text-secondary)' }}>{s.class_name}</span>
                    </Table.Td>

                    <Table.Td align="center">
                      <strong className="tabular-nums" style={{ color: Number(s.gpa4) >= 3.6 ? 'var(--color-success-text)' : 'inherit' }}>
                        {s.gpa4}
                      </strong>
                    </Table.Td>

                    <Table.Td align="center">
                      <span className="tabular-nums">{s.gpa10}</span>
                    </Table.Td>

                    <Table.Td align="center">
                      <span className="tabular-nums" style={{ fontWeight: '600' }}>{s.passed_credits} TC</span>
                    </Table.Td>

                    <Table.Td>
                      {getStatusBadge(s)}
                    </Table.Td>

                    <Table.Td align="right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStudentId(String(s.id));
                          setViewMode('split');
                        }}
                      >
                        Chi tiết
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}

                {!filtered.length && (
                  <Table.Tr>
                    <Table.Td colSpan={9}>
                      <EmptyState
                        title="Không có hồ sơ sinh viên nào phù hợp"
                        description="Vui lòng thử lại với từ khóa khác hoặc chuyển tiêu chí lọc giữa các lớp."
                      />
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: '650', margin: 0 }}>
                Hồ sơ theo bộ lọc ({filtered.length})
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setViewMode('table')}>
                ← Về bảng
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
              {filtered.map(s => {
                const isSelected = String(s.id) === studentId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStudentId(String(s.id))}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--color-border-subtle)',
                      backgroundColor: isSelected ? 'var(--color-accent-subtle)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 120ms ease'
                    }}
                    className="keyboard-focus"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <strong style={{ fontSize: 'var(--font-size-sm)', color: isSelected ? 'var(--color-accent-text)' : 'var(--color-text-primary)' }}>
                        {s.full_name}
                      </strong>
                      {getStatusBadge(s)}
                    </div>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                      {s.student_code} · {s.class_name} · GPA: {s.gpa4}
                    </span>
                  </button>
                );
              })}

              {!filtered.length && (
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0' }}>
                  Không có sinh viên phù hợp.
                </span>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '20px', minHeight: '400px' }}>
            {current ? (
              <AcademicTranscript
                key={studentId + semester}
                report={current}
                semesterLabel={semesters.find(s => String(s.id) === semester)?.semester_name}
                onRefresh={refresh}
              />
            ) : (
              <EmptyState
                title={!directory || studentId ? 'Đang tải bảng điểm…' : 'Chọn một sinh viên để xem chi tiết học vụ'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
