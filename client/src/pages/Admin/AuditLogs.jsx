import { useEffect, useState, useMemo } from 'react';
import axiosClient from '../../api/axiosClient';
import { Button, Input, Select, Badge, Table, Modal, DensityToggle, Skeleton, EmptyState } from '../../components/ui';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (active) setLoading(true);
    });
    axiosClient.get('/admin/audit-logs', { signal: controller.signal })
      .then(res => {
        if (active && !controller.signal.aborted) {
          setLogs(res.data || []);
          setError('');
        }
      })
      .catch(err => {
        if (active && !controller.signal.aborted) {
          setError(err.response?.data?.message || 'Không thể tải lịch sử cập nhật hệ thống.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [version]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logs.filter(l => {
      const matchSearch = `${l.user_name} ${l.action} ${l.target_table} ${l.record_id} ${l.detail}`.toLowerCase().includes(q);
      const matchAction = actionFilter ? l.action === actionFilter : true;
      const matchTable = tableFilter ? l.target_table === tableFilter : true;
      return matchSearch && matchAction && matchTable;
    });
  }, [logs, search, actionFilter, tableFilter]);

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE':
        return <Badge variant="success" size="sm" dot>Thêm mới</Badge>;
      case 'UPDATE':
        return <Badge variant="accent" size="sm" dot>Cập nhật</Badge>;
      case 'DELETE':
        return <Badge variant="danger" size="sm" dot>Xóa bỏ</Badge>;
      case 'RESIT':
        return <Badge variant="warning" size="sm" dot>Thi lại</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{action}</Badge>;
    }
  };

  const getTableLabel = (tableName) => {
    switch (tableName) {
      case 'grades':
        return 'Sổ điểm & Đánh giá';
      case 'course_classes':
        return 'Lớp học phần';
      case 'students':
        return 'Hồ sơ sinh viên';
      case 'subjects':
        return 'Danh mục môn học';
      case 'resit_attempts':
        return 'Lượt đăng ký thi lại';
      default:
        return tableName;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Nhật ký kiểm toán
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="outline"
            size="md"
            onClick={() => setVersion(v => v + 1)}
          >
            Làm mới nhật ký
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

      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <Input
                placeholder="Tìm người sửa, đối tượng hoặc nội dung…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                size="sm"
                aria-label="Tìm kiếm nhật ký"
              />
            </div>

            <div style={{ width: '160px' }}>
              <Select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                size="sm"
                aria-label="Lọc theo loại hành động"
                options={[
                  { value: '', label: 'Tất cả hành động' },
                  { value: 'UPDATE', label: 'Cập nhật' },
                  { value: 'CREATE', label: 'Thêm mới' },
                  { value: 'DELETE', label: 'Xóa bỏ' },
                  { value: 'RESIT', label: 'Thi lại' }
                ]}
              />
            </div>

            <div style={{ width: '180px' }}>
              <Select
                value={tableFilter}
                onChange={e => setTableFilter(e.target.value)}
                size="sm"
                aria-label="Lọc theo đối tượng bảng"
                options={[
                  { value: '', label: 'Tất cả bảng đối tượng' },
                  { value: 'grades', label: 'Sổ điểm' },
                  { value: 'course_classes', label: 'Lớp học phần' },
                  { value: 'students', label: 'Sinh viên' },
                  { value: 'subjects', label: 'Môn học' },
                  { value: 'resit_attempts', label: 'Thi lại' }
                ]}
              />
            </div>
          </div>

          <DensityToggle />
        </div>

        {loading ? (
          <Skeleton.Table rows={8} cols={6} />
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th width="160px">Thời gian</Table.Th>
                <Table.Th width="20%">Người thực hiện</Table.Th>
                <Table.Th width="110px">Hành động</Table.Th>
                <Table.Th width="160px">Đối tượng</Table.Th>
                <Table.Th width="40%">Chi tiết thay đổi</Table.Th>
                <Table.Th width="80px" align="right">Xem</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map(log => (
                <Table.Tr key={log.id} onClick={() => setSelectedLog(log)}>
                  <Table.Td>
                    <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      {log.created_at}
                    </span>
                  </Table.Td>

                  <Table.Td>
                    <strong style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
                      {log.user_name}
                    </strong>
                  </Table.Td>

                  <Table.Td>
                    {getActionBadge(log.action)}
                  </Table.Td>

                  <Table.Td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600' }}>
                        {getTableLabel(log.target_table)}
                      </span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        Mã: {log.record_id}
                      </span>
                    </div>
                  </Table.Td>

                  <Table.Td>
                    <span style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
                      {log.detail}
                    </span>
                  </Table.Td>

                  <Table.Td align="right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(log);
                      }}
                    >
                      Chi tiết
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}

              {!filtered.length && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <EmptyState
                      title="Không tìm thấy bản ghi lịch sử cập nhật nào"
                      description="Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc theo hành động và bảng dữ liệu."
                    />
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', paddingTop: '6px' }}>
          <span>Hiển thị {filtered.length} / {logs.length} bản ghi nhật ký</span>
          <span>Hệ thống ghi nhận vết thay đổi tự động</span>
        </div>
      </div>

      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Chi tiết vết thay đổi dữ liệu"
        description={`Mã nhật ký: #${selectedLog?.id} · Ghi nhận lúc ${selectedLog?.created_at}`}
        size="md"
        footer={
          <Button variant="primary" size="sm" onClick={() => setSelectedLog(null)}>
            Đóng
          </Button>
        }
      >
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: '600' }}>Tài khoản thực hiện</span>
                <strong style={{ display: 'block', fontSize: 'var(--font-size-base)', marginTop: '4px' }}>
                  {selectedLog.user_name}
                </strong>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: '600' }}>Hành động</span>
                <div style={{ marginTop: '6px' }}>
                  {getActionBadge(selectedLog.action)}
                </div>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: '600' }}>Bảng dữ liệu</span>
                <strong style={{ display: 'block', fontSize: 'var(--font-size-base)', marginTop: '4px' }}>
                  {getTableLabel(selectedLog.target_table)} ({selectedLog.target_table})
                </strong>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: '600' }}>Mã định danh bản ghi</span>
                <strong style={{ display: 'block', fontSize: 'var(--font-size-base)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {selectedLog.record_id}
                </strong>
              </div>
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                Diễn giải chi tiết
              </span>
              <p style={{ margin: 0, fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
                {selectedLog.detail}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
