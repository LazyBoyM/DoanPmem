import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAcademic } from '../../context/academic-context';
import { useFeedback } from '../../context/feedback-context';
import { Button, Input, Select, Badge, Table, Modal, Tabs, DensityToggle, Skeleton, EmptyState } from '../../components/ui';
import RegistrationPlans from '../../components/RegistrationPlans';
import { CurriculumEditor } from '../../components/TrainingEditor';

function getPeriodStatus(rp) {
  if (Number(rp.is_active) !== 1) {
    return {
      label: 'ĐÃ TẮT',
      variant: 'neutral',
      detail: 'Đã tắt thủ công'
    };
  }
  const parse = (val) => {
    if (!val) return new Date(NaN);
    const raw = String(val).replace(' ', 'T');
    return new Date(/Z$|[+-]\d\d:\d\d$/.test(raw) ? raw : raw.length === 10 ? `${raw}T00:00:00+07:00` : `${raw}+07:00`);
  };
  const now = new Date();
  const start = parse(rp.start_time);
  const end = parse(rp.end_time);

  if (now < start) {
    return {
      label: 'CHƯA TỚI HẠN',
      variant: 'warning',
      detail: 'Chưa tới giờ mở cổng'
    };
  }
  if (now > end) {
    return {
      label: 'ĐÃ HẾT HẠN',
      variant: 'danger',
      detail: 'Tự động đóng cổng'
    };
  }
  return {
    label: 'ĐANG MỞ CỔNG',
    variant: 'success',
    detail: 'Đang tiếp nhận đăng ký'
  };
}

export default function ManageSemesters() {
  const { notify } = useFeedback();
  const { refresh } = useAcademic();

  const [activeTab, setActiveTab] = useState('periods');
  const [semesters, setSemesters] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [curriculumProgram, setCurriculumProgram] = useState(null);
  const [planSemester, setPlanSemester] = useState(null);

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const fetchAllData = useCallback(async () => {
    try {
      const [semRes, periodRes, progRes, deptRes] = await Promise.all([
        axiosClient.get('/admin/semesters'),
        axiosClient.get('/admin/registration-periods'),
        axiosClient.get('/admin/programs'),
        axiosClient.get('/admin/departments')
      ]);
      if (semRes.success) setSemesters(semRes.data || []);
      if (periodRes.success) setPeriods(periodRes.data || []);
      if (progRes.success) setPrograms(progRes.data || []);
      if (deptRes.success) setDepartments(deptRes.data || []);
    } catch {
      notify('Không thể tải dữ liệu đào tạo. Vui lòng thử lại.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    Promise.resolve().then(fetchAllData);
  }, [fetchAllData]);

  const handleTogglePeriod = async (id) => {
    try {
      const res = await axiosClient.put(`/admin/registration-periods/${id}/toggle`);
      if (res.success) {
        notify('Đã cập nhật trạng thái đợt đăng ký.', 'success');
        refresh();
        fetchAllData();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể đổi trạng thái đợt đăng ký.', 'danger');
    }
  };

  const handleSetActiveSemester = async (id) => {
    try {
      const res = await axiosClient.put(`/admin/semesters/${id}/active`);
      if (res.success) {
        notify('Đã kích hoạt học kỳ hiện hành thành công!', 'success');
        refresh();
        fetchAllData();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Không thể kích hoạt học kỳ.', 'danger');
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axiosClient.post('/admin/registration-periods', periodForm);
      if (res.success) {
        notify('Tạo đợt đăng ký tín chỉ mới thành công!', 'success');
        setShowPeriodModal(false);
        refresh();
        fetchAllData();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Lỗi khi tạo đợt đăng ký.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSemester = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axiosClient.post('/admin/semesters', semesterForm);
      if (res.success) {
        notify('Thêm học kỳ mới thành công!', 'success');
        setShowSemesterModal(false);
        refresh();
        fetchAllData();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Lỗi khi tạo học kỳ.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axiosClient.post('/admin/programs', programForm);
      if (res.success) {
        notify('Thêm chương trình đào tạo mới thành công!', 'success');
        setShowProgramModal(false);
        refresh();
        fetchAllData();
      }
    } catch (err) {
      notify(err.response?.data?.message || 'Lỗi khi tạo chương trình.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: '650', color: 'var(--color-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Học kỳ & Đợt đăng ký
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button variant="outline" size="md" onClick={fetchAllData}>
            Làm mới
          </Button>

          {activeTab === 'periods' && (
            <Button variant="primary" size="md" onClick={() => setShowPeriodModal(true)}>
              + Tạo đợt đăng ký mới
            </Button>
          )}

          {activeTab === 'semesters' && (
            <Button variant="primary" size="md" onClick={() => setShowSemesterModal(true)}>
              + Thêm học kỳ mới
            </Button>
          )}

          {activeTab === 'programs' && (
            <Button variant="primary" size="md" onClick={() => setShowProgramModal(true)}>
              + Thêm chương trình mới
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
        <Tabs
          tabs={[
            { key: 'periods', label: `Đợt đăng ký tín chỉ (${periods.length})` },
            { key: 'semesters', label: `Danh mục học kỳ (${semesters.length})` },
            { key: 'programs', label: `Chương trình đào tạo (${programs.length})` }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
        <DensityToggle />
      </div>

      {loading ? (
        <Skeleton.Table rows={6} cols={5} />
      ) : activeTab === 'periods' ? (
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {periods.length === 0 ? (
            <EmptyState
              title="Chưa có đợt đăng ký nào"
              description="Hãy thiết lập đợt mở đăng ký tín chỉ để sinh viên bắt đầu chọn học phần."
              action={
                <Button variant="primary" size="sm" onClick={() => setShowPeriodModal(true)}>
                  + Tạo đợt đăng ký mới
                </Button>
              }
            />
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th width="28%">Tên đợt đăng ký</Table.Th>
                  <Table.Th width="18%">Học kỳ</Table.Th>
                  <Table.Th width="24%">Thời gian mở / đóng cổng</Table.Th>
                  <Table.Th width="14%">Ngưỡng tín chỉ</Table.Th>
                  <Table.Th width="16%" align="right">Trạng thái & Thao tác</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {periods.map(rp => {
                  const status = getPeriodStatus(rp);
                  return (
                    <Table.Tr key={rp.id}>
                      <Table.Td>
                        <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                          {rp.name}
                        </strong>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="neutral">
                          {rp.semester_name || semesters.find(s => s.id === rp.semester_id)?.semester_name || 'Học kỳ'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 'var(--font-size-xs)' }}>
                          <span className="tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                            Từ: {rp.start_time}
                          </span>
                          <span className="tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>
                            Đến: {rp.end_time}
                          </span>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        <span className="tabular-nums" style={{ fontSize: 'var(--font-size-xs)', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                          Tối thiểu: {rp.min_credits} TC · Tối đa: {rp.max_credits} TC
                        </span>
                      </Table.Td>
                      <Table.Td align="right">
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Button
                            variant={Number(rp.is_active) === 1 ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => handleTogglePeriod(rp.id)}
                          >
                            {Number(rp.is_active) === 1 ? 'Tắt' : 'Bật'}
                          </Button>
                        </div>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </div>
      ) : activeTab === 'semesters' ? (
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th width="25%">Mã học kỳ</Table.Th>
                <Table.Th width="30%">Tên học kỳ</Table.Th>
                <Table.Th width="15%">Năm học</Table.Th>
                <Table.Th width="15%">Trạng thái</Table.Th>
                <Table.Th width="15%" align="right">Thao tác</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {semesters.map(sem => (
                <Table.Tr key={sem.id}>
                  <Table.Td>
                    <span className="tabular-nums" style={{ fontWeight: '600', color: 'var(--color-accent-text)' }}>
                      {sem.semester_code}
                    </span>
                  </Table.Td>
                  <Table.Td>
                    <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                      {sem.semester_name}
                    </strong>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="neutral">{sem.academic_year}</Badge>
                  </Table.Td>
                  <Table.Td>
                    {sem.is_active ? (
                      <Badge variant="success">Học kỳ hiện hành</Badge>
                    ) : (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        Đã đóng
                      </span>
                    )}
                  </Table.Td>
                  <Table.Td align="right">
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      {!sem.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActiveSemester(sem.id)}
                        >
                          Kích hoạt
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPlanSemester(sem)}
                      >
                        Kế hoạch SV
                      </Button>
                    </div>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th width="20%">Mã ngành</Table.Th>
                <Table.Th width="35%">Tên chương trình đào tạo</Table.Th>
                <Table.Th width="15%">Tổng tín chỉ</Table.Th>
                <Table.Th width="15%">Thời gian</Table.Th>
                <Table.Th width="15%" align="right">Thao tác</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {programs.map(prog => (
                <Table.Tr key={prog.id}>
                  <Table.Td>
                    <span className="tabular-nums" style={{ fontWeight: '600', color: 'var(--color-accent-text)' }}>
                      {prog.program_code}
                    </span>
                  </Table.Td>
                  <Table.Td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-primary)' }}>
                        {prog.program_name}
                      </strong>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Khoa: {prog.department_name || departments.find(d => d.id === prog.department_id)?.department_name || 'Khoa CNTT'}
                      </span>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <span className="tabular-nums" style={{ fontWeight: '600' }}>
                      {prog.total_credits} TC
                    </span>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="neutral">{prog.duration_years || 4.0} năm</Badge>
                  </Table.Td>
                  <Table.Td align="right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurriculumProgram(prog)}
                    >
                      Khung CTĐT
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}

      {curriculumProgram && (
        <Modal
          open={Boolean(curriculumProgram)}
          onClose={() => setCurriculumProgram(null)}
          title={`Khung chương trình đào tạo · ${curriculumProgram.program_name}`}
          description={`Mã chương trình: ${curriculumProgram.program_code} · Tổng số ${curriculumProgram.total_credits} tín chỉ`}
          size="xl"
        >
          <CurriculumEditor program={curriculumProgram} onClose={() => setCurriculumProgram(null)} />
        </Modal>
      )}

      {planSemester && (
        <Modal
          open={Boolean(planSemester)}
          onClose={() => setPlanSemester(null)}
          title={`Kế hoạch đăng ký sinh viên · ${planSemester.semester_name}`}
          size="xl"
        >
          <RegistrationPlans semester={planSemester} onClose={() => setPlanSemester(null)} />
        </Modal>
      )}

      <Modal
        open={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        title="Tạo đợt đăng ký tín chỉ mới"
        size="md"
      >
        <form onSubmit={handleCreatePeriod} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Tên đợt đăng ký *
            </label>
            <Input
              value={periodForm.name}
              onChange={e => setPeriodForm({ ...periodForm, name: e.target.value })}
              placeholder="VD: Đợt 1: Đăng ký học phần chính thức HK1"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Học kỳ áp dụng *
            </label>
            <Select
              value={periodForm.semester_id}
              onChange={e => setPeriodForm({ ...periodForm, semester_id: e.target.value })}
              options={semesters.map(s => ({ value: String(s.id), label: s.semester_name }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Thời gian mở cổng *
              </label>
              <Input
                value={periodForm.start_time}
                onChange={e => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                placeholder="YYYY-MM-DD HH:MM:SS"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Thời gian đóng cổng *
              </label>
              <Input
                value={periodForm.end_time}
                onChange={e => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                placeholder="YYYY-MM-DD HH:MM:SS"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Tín chỉ tối thiểu *
              </label>
              <Input
                type="number"
                min="0"
                max="50"
                value={periodForm.min_credits}
                onChange={e => setPeriodForm({ ...periodForm, min_credits: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Tín chỉ tối đa *
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={periodForm.max_credits}
                onChange={e => setPeriodForm({ ...periodForm, max_credits: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button variant="outline" size="md" onClick={() => setShowPeriodModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" loading={submitting}>
              Tạo đợt đăng ký
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showSemesterModal}
        onClose={() => setShowSemesterModal(false)}
        title="Thêm học kỳ mới"
        size="md"
      >
        <form onSubmit={handleCreateSemester} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Mã học kỳ *
            </label>
            <Input
              value={semesterForm.semester_code}
              onChange={e => setSemesterForm({ ...semesterForm, semester_code: e.target.value })}
              placeholder="VD: HK2_2026_2027"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Tên học kỳ *
            </label>
            <Input
              value={semesterForm.semester_name}
              onChange={e => setSemesterForm({ ...semesterForm, semester_name: e.target.value })}
              placeholder="VD: Học kỳ 2 - 2026-2027"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Năm học *
            </label>
            <Input
              value={semesterForm.academic_year}
              onChange={e => setSemesterForm({ ...semesterForm, academic_year: e.target.value })}
              placeholder="VD: 2026-2027"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Ngày bắt đầu
              </label>
              <Input
                type="date"
                value={semesterForm.start_date}
                onChange={e => setSemesterForm({ ...semesterForm, start_date: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Ngày kết thúc
              </label>
              <Input
                type="date"
                value={semesterForm.end_date}
                onChange={e => setSemesterForm({ ...semesterForm, end_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button variant="outline" size="md" onClick={() => setShowSemesterModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" loading={submitting}>
              Tạo học kỳ
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showProgramModal}
        onClose={() => setShowProgramModal(false)}
        title="Thêm chương trình đào tạo"
        size="md"
      >
        <form onSubmit={handleCreateProgram} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Mã chương trình *
            </label>
            <Input
              value={programForm.program_code}
              onChange={e => setProgramForm({ ...programForm, program_code: e.target.value })}
              placeholder="VD: 7480201"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Tên chương trình đào tạo *
            </label>
            <Input
              value={programForm.program_name}
              onChange={e => setProgramForm({ ...programForm, program_name: e.target.value })}
              placeholder="VD: Công nghệ Thông tin"
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
              Khoa quản lý *
            </label>
            <Select
              value={programForm.department_id}
              onChange={e => setProgramForm({ ...programForm, department_id: e.target.value })}
              options={departments.map(d => ({ value: String(d.id), label: d.department_name }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Tổng số tín chỉ khung
              </label>
              <Input
                type="number"
                min="60"
                max="250"
                value={programForm.total_credits}
                onChange={e => setProgramForm({ ...programForm, total_credits: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                Thời gian đào tạo (năm)
              </label>
              <Input
                type="number"
                step="0.5"
                min="2"
                max="7"
                value={programForm.duration_years}
                onChange={e => setProgramForm({ ...programForm, duration_years: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            <Button variant="outline" size="md" onClick={() => setShowProgramModal(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="md" loading={submitting}>
              Tạo chương trình
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
