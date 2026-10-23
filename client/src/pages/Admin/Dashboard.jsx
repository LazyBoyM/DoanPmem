import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { downloadFile } from '../../api/download';
import ClassSchedule from '../../components/ClassSchedule';
import { Button, Input, Select, Badge, Table, DensityToggle, Skeleton, EmptyState } from '../../components/ui';

const letters = ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];
const count = value => Number(value || 0).toLocaleString('vi-VN');

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      axiosClient.get('/admin/stats', { signal: controller.signal }),
      axiosClient.get('/reports/academic-stats', { signal: controller.signal })
    ])
      .then(([stats, report]) => {
        if (!controller.signal.aborted) {
          setData({ stats: stats.stats, report: report.data });
          setError('');
        }
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setError(err.response?.data?.message || 'Không tải được dữ liệu tổng quan. Vui lòng thử lại.');
        }
      });
    return () => controller.abort();
  }, [version]);

  async function exportStudents() {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadFile('/reports/export-students-excel', 'Danh_sach_sinh_vien.xlsx');
    } catch {
      setDownloadError('Không thể xuất danh sách sinh viên. Vui lòng thử lại.');
    } finally {
      setDownloading(false);
    }
  }

  const stats = data?.stats;
  const report = data?.report;
  const allClasses = report?.classOccupancy || [];

  const filtered = allClasses
    .filter(c => (!status || c.status === status) &&
      `${c.subject_name} ${c.class_code} ${c.lecturer_name}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortAsc ? a.current_students - b.current_students : b.current_students - a.current_students);

  const shown = filtered.slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Tổng quan
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button
            variant="outline"
            size="md"
            onClick={() => setVersion(v => v + 1)}
          >
            Làm mới dữ liệu
          </Button>

          <Button
            variant="primary"
            size="md"
            loading={downloading}
            onClick={exportStudents}
          >
            Xuất danh sách sinh viên (Excel)
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger-text)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }} role="alert">
          <span style={{ fontSize: 'var(--font-size-base)' }}>{error}</span>
          <Button variant="danger" size="sm" onClick={() => setVersion(v => v + 1)}>
            Thử lại
          </Button>
        </div>
      )}

      {downloadError && (
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger-text)', fontSize: 'var(--font-size-sm)' }} role="alert">
          {downloadError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        {[
          { label: 'Tổng sinh viên', value: stats?.total_students, path: '/admin/students', hint: 'Toàn hệ thống' },
          { label: 'Giảng viên', value: stats?.total_lecturers, path: '/admin/lecturers', hint: 'Đang công tác' },
          { label: 'Học phần / Môn', value: stats?.total_subjects, path: '/admin/subjects', hint: 'Trong chương trình' },
          { label: 'Lớp học phần', value: stats?.total_classes, path: '/admin/classes', hint: 'Kỳ hiện tại' },
          { label: 'Lượt đăng ký', value: stats?.total_enrollments, path: '/admin/classes', hint: 'Đang có hiệu lực' }
        ].map((item, idx) => (
          <Link
            key={idx}
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 16px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              transition: 'border-color 140ms ease, box-shadow 140ms ease'
            }}
            className="keyboard-focus"
          >
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {item.label}
            </span>
            <strong className="tabular-nums" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '700', color: 'var(--color-text-primary)', margin: '8px 0 4px 0', lineHeight: 1.1 }}>
              {stats ? count(item.value) : '—'}
            </strong>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {item.hint}
            </span>
          </Link>
        ))}
      </div>

      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ display: 'inline-flex', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }}></span>
            <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
              Hạng mục cần xử lý
            </h2>
            <Badge variant="neutral">Kỳ hiện hành</Badge>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
          <Link
            to="/admin/academic"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none'
            }}
            className="keyboard-focus"
          >
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Rà soát sinh viên thi lại & học lại
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-accent-text)', whiteSpace: 'nowrap' }}>
              Kiểm tra →
            </span>
          </Link>

          <Link
            to="/admin/classes"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none'
            }}
            className="keyboard-focus"
          >
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Rà soát phòng học & lịch lớp học phần
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-accent-text)', whiteSpace: 'nowrap' }}>
              Điều phối →
            </span>
          </Link>

          <Link
            to="/admin/audit-logs"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none'
            }}
            className="keyboard-focus"
          >
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Nhật ký kiểm toán
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-accent-text)', whiteSpace: 'nowrap' }}>
              Xem nhật ký →
            </span>
          </Link>

          <Link
            to="/admin/semesters"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none'
            }}
            className="keyboard-focus"
          >
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-text-primary)' }}>
              Tiến độ đợt đăng ký tín chỉ
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-accent-text)', whiteSpace: 'nowrap' }}>
              Cấu hình →
            </span>
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: 'var(--space-5)', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
                Lớp học phần & Sĩ số thực tế
              </h2>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Hiển thị {shown.length} / {filtered.length} lớp học phần phù hợp
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <DensityToggle />
              <Link
                to="/admin/classes"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: '600',
                  color: 'var(--color-accent-text)',
                  textDecoration: 'none',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--color-accent-subtle)'
                }}
              >
                Quản lý chi tiết →
              </Link>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '220px' }}>
              <Input
                placeholder="Tìm lớp, môn học hoặc giảng viên…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="sm"
                aria-label="Tìm kiếm lớp học phần"
              />
            </div>

            <div style={{ width: '150px' }}>
              <Select
                value={status}
                onChange={e => setStatus(e.target.value)}
                size="sm"
                aria-label="Lọc trạng thái lớp"
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'OPEN', label: 'Đang mở' },
                  { value: 'CLOSED', label: 'Đã đóng' }
                ]}
              />
            </div>
          </div>

          {!data && !error ? (
            <Skeleton.Table rows={6} cols={5} />
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th width="32%">Môn học / Mã lớp</Table.Th>
                  <Table.Th width="22%">Giảng viên phụ trách</Table.Th>
                  <Table.Th width="24%">Lịch & Phòng</Table.Th>
                  <Table.Th
                    width="12%"
                    sortable
                    sortDirection={sortAsc ? 'asc' : 'desc'}
                    onSort={() => setSortAsc(!sortAsc)}
                  >
                    Sĩ số
                  </Table.Th>
                  <Table.Th width="10%" align="right">Trạng thái</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {shown.map(c => {
                  const percent = Math.min(100, Math.round((c.current_students / (c.max_students || 1)) * 100));
                  const isFull = c.current_students >= c.max_students;
                  return (
                    <Table.Tr key={c.id}>
                      <Table.Td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                            {c.subject_name || c.class_code}
                          </span>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {c.class_code} · {c.credits} tín chỉ
                          </span>
                        </div>
                      </Table.Td>

                      <Table.Td>
                        <span style={{ color: c.lecturer_name ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                          {c.lecturer_name || 'Chưa phân công'}
                        </span>
                      </Table.Td>

                      <Table.Td>
                        <ClassSchedule schedules={c.schedules} />
                      </Table.Td>

                      <Table.Td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: '600' }}>
                            {c.current_students} / {c.max_students}
                          </span>
                          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--color-border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${percent}%`,
                                height: '100%',
                                backgroundColor: isFull ? 'var(--color-danger)' : percent >= 80 ? 'var(--color-warning)' : 'var(--color-accent)'
                              }}
                            />
                          </div>
                        </div>
                      </Table.Td>

                      <Table.Td align="right">
                        <Badge
                          variant={c.status === 'OPEN' ? 'success' : 'neutral'}
                          size="sm"
                          dot
                        >
                          {c.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}

                {!shown.length && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <EmptyState
                        compact
                        title="Không tìm thấy lớp học phần phù hợp"
                        description="Thử đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc trạng thái để xem thêm kết quả."
                      />
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
                Chất lượng học tập & Phổ điểm
              </h2>
              <Badge variant="info" size="sm">
                Toàn hệ thống
              </Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '16px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Tỷ lệ đạt học phần</span>
                <strong className="tabular-nums" style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', color: 'var(--color-success-text)' }}>
                  {report?.gradedCount ? `${Number(report.passRate).toFixed(1)}%` : '—'}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Học phần chưa đạt (F)</span>
                <strong className="tabular-nums" style={{ fontSize: 'var(--font-size-xl)', fontWeight: '700', color: Number(report?.failedCount) > 0 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                  {report ? count(report.failedCount) : '—'}
                </strong>
              </div>
            </div>

            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '10px' }}>
              Phân bố điểm chữ ({report ? count(report.gradedCount) : 0} kết quả)
            </span>

            {!data && !error ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Skeleton height="14px" />
                <Skeleton height="14px" />
                <Skeleton height="14px" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {letters.map(letter => {
                  const val = report?.gradeDistribution ? report.gradeDistribution[letter] || 0 : 0;
                  const total = report?.gradedCount || 1;
                  const pct = Math.round((val / total) * 100);
                  const isFail = letter === 'F';
                  return (
                    <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--font-size-xs)' }}>
                      <span style={{ width: '22px', fontWeight: '700', color: isFail ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                        {letter}
                      </span>
                      <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--color-border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: isFail ? 'var(--color-danger)' : letter === 'A' ? 'var(--color-success)' : 'var(--color-accent)'
                          }}
                        />
                      </div>
                      <span className="tabular-nums" style={{ width: '42px', textAlign: 'right', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
                        {count(val)}
                      </span>
                      <span className="tabular-nums" style={{ width: '36px', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link
                to="/admin/grades"
                style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-accent-text)', textDecoration: 'none' }}
              >
                Vào Sổ điểm & Khóa điểm →
              </Link>

              <Link
                to="/admin/students"
                style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textDecoration: 'none' }}
              >
                Lọc thi lại / học lại
              </Link>
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0 }}>
              Truy cập nhanh nghiệp vụ
            </h3>

            {[
              { title: 'Quản lý sinh viên & hồ sơ', path: '/admin/students' },
              { title: 'Đợt đăng ký & học kỳ', path: '/admin/semesters' },
              { title: 'Giảng viên & phân công', path: '/admin/lecturers' }
            ].map((nav, i) => (
              <Link
                key={i}
                to={nav.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  backgroundColor: 'var(--color-surface-hover)',
                  border: '1px solid var(--color-border-subtle)',
                  transition: 'background-color 120ms ease'
                }}
                className="keyboard-focus"
              >
                <strong style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
                  {nav.title}
                </strong>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-accent-text)', fontWeight: '600' }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
