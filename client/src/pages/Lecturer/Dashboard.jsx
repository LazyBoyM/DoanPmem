import { useEffect, useState, useCallback } from 'react';
import { useAcademic } from '../../context/academic-context';
import { useFeedback } from '../../context/feedback-context';
import axiosClient from '../../api/axiosClient';
import { downloadFile } from '../../api/download';
import AccessibleDialog from '../../components/AccessibleDialog';
import LoadingState from '../../components/LoadingState';
import { scoreFields, scoreLabels, scoreWeights, hasGradeChanges, invalidGrade, gradePayload, mergeSavedGrade } from './gradeBook';
import './gradeBook.css';

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
    const [focusId, setFocusId] = useState(null);
    const [inspectedId, setInspectedId] = useState(null);
    const classes = classResult.semesterId === semesterId ? classResult.data : [];
    const validSelection = classes.some(c => String(c.id) === String(selectedClass));
    const loaded = validSelection && view.classId === String(selectedClass) && view.semesterId === semesterId;
    const students = loaded ? view.students : [];
    const course = loaded ? view.course : null;
    const selected = classes.find(c => String(c.id) === String(selectedClass));
    const isLocked = locked(course?.grades_locked) || students.some(s => locked(s.is_locked));
    const dirtyStudents = students.filter(s => hasGradeChanges(s, view.saved[s.enrollment_id]));
    const filtered = students.filter(s => `${s.full_name} ${s.student_code} ${s.class_name}`.toLowerCase().includes(search.toLowerCase()));
    const focused = filtered.find(s => s.enrollment_id === focusId) || filtered[0];
    const focusedIndex = filtered.indexOf(focused);
    const inspected = students.find(s => s.enrollment_id === inspectedId);
    const classLoading = Boolean(semesterId) && classResult.semesterId !== semesterId && !classError;
    const studentLoading = validSelection && !loaded && !studentError;
    const sheetStatus = classError || studentError ? 'Không tải được dữ liệu' : classLoading || studentLoading ? 'Đang tải' : !semesterId ? 'Chưa có học kỳ' : !validSelection ? 'Chưa có lớp học phần' : isLocked ? 'Đã khóa điểm' : 'Đang nhập điểm';
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
        } catch (err) { if (!signal?.aborted) setClassError(err.response?.data?.message || 'Không tải được danh sách lớp.'); }
    }, [semesterId]);
    useEffect(() => {
        const controller = new AbortController();
        Promise.resolve().then(() => fetchClasses(controller.signal));
        return () => controller.abort();
    }, [fetchClasses]);
    const fetchStudents = useCallback(async (classId, signal) => {
        try {
            const res = await axiosClient.get(`/lecturer/class-students/${classId}`, { signal });
            if (!signal?.aborted) {
                setView({ classId: String(classId), semesterId, students: res.data, saved: Object.fromEntries(res.data.map(s => [s.enrollment_id, { ...s }])), course: res.course_class });
                setStudentError('');
            }
        } catch (err) { if (!signal?.aborted) setStudentError(err.response?.data?.message || 'Không tải được sinh viên.'); }
    }, [semesterId]);
    useEffect(() => {
        const controller = new AbortController();
        if (validSelection) Promise.resolve().then(() => fetchStudents(selectedClass, controller.signal));
        return () => controller.abort();
    }, [selectedClass, validSelection, fetchStudents]);
    useEffect(() => {
        if (!dirtyStudents.length) return;
        const prevent = event => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', prevent);
        return () => window.removeEventListener('beforeunload', prevent);
    }, [dirtyStudents.length]);

    const changeScope = async (value, semester = false) => {
        if (saving || String(value) === String(semester ? semesterId : selectedClass)) return;
        if (dirtyStudents.length && !await confirm(`Có ${dirtyStudents.length} sinh viên có điểm chưa lưu. Bỏ các thay đổi để ${semester ? 'đổi học kỳ' : 'chuyển lớp'}?`)) return;
        setNotice(null); setSearch(''); setFocusId(null); setInspectedId(null); setStudentError('');
        if (semester) { setClassError(''); setSemesterId(value); }
        else setSelectedClass(value);
    };
    const handleGradeChange = (enrollmentId, field, value) => {
        setNotice(null);
        setView(prev => ({ ...prev, students: prev.students.map(s => s.enrollment_id === enrollmentId ? { ...s, [field]: value } : s) }));
    };
    const saveGrades = async rows => {
        if (saving || isLocked || !rows.length) return;
        if (rows.some(invalidGrade)) { setNotice({ type: 'danger', text: 'Điểm phải từ 0 đến 10. Sửa ô được đánh dấu trước khi lưu.' }); return; }
        setSaving(true); setNotice(null);
        let savedCount = 0;
        try {
            for (const student of rows) {
                const res = await axiosClient.post('/lecturer/update-grades', { enrollment_id: student.enrollment_id, ...gradePayload(student) });
                if (!res.success) throw new Error(res.message || 'Không lưu được điểm.');
                setView(prev => mergeSavedGrade(prev, student.enrollment_id, res.data));
                savedCount++;
            }
            setNotice({ type: 'success', text: `Đã lưu điểm ${savedCount} sinh viên. Kết quả tổng kết đã cập nhật.` });
        } catch (err) { setNotice({ type: 'danger', text: `${savedCount ? `Đã lưu ${savedCount}/${rows.length} sinh viên. ` : ''}${err.response?.data?.message || err.message || 'Không lưu được điểm.'} Các thay đổi chưa lưu vẫn được giữ.` }); }
        finally { setSaving(false); }
    };
    const handleExport = async () => {
        if (!course || saving) return;
        try { await downloadFile(`/reports/export-class-excel/${selectedClass}`, `Danh_sach_lop_${selectedClass}.xlsx`); }
        catch { setNotice({ type: 'danger', text: 'Không thể xuất danh sách lớp. Vui lòng thử lại.' }); }
    };
    const handleToggleLock = async () => {
        if (!course || saving || dirtyStudents.length) return;
        setSaving(true); setNotice(null);
        try {
            const res = await axiosClient.put(`/lecturer/lock-grades/${selectedClass}`, { is_locked: isLocked ? 0 : 1 });
            if (res.success) {
                const value = isLocked ? 0 : 1;
                setView(prev => ({ ...prev, course: { ...prev.course, grades_locked: value }, students: prev.students.map(s => ({ ...s, is_locked: value })) }));
                setClassResult(prev => ({ ...prev, data: prev.data.map(c => String(c.id) === String(selectedClass) ? { ...c, grades_locked: value } : c) }));
                setNotice({ type: 'success', text: res.message });
            }
        } catch (err) { setNotice({ type: 'danger', text: err.response?.data?.message || 'Không đổi được trạng thái khóa.' }); }
        finally { setSaving(false); }
    };
    const renderScore = (student, field, idx, suffix) => {
        const value = student[field] ?? '';
        const changed = hasGradeChanges({ [field]: value }, { [field]: view.saved[student.enrollment_id]?.[field] });
        const invalid = value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 10);
        return <input id={`score-${suffix}-${student.enrollment_id}-${field}`} aria-label={`${scoreLabels[idx]} của ${student.full_name}`} aria-invalid={invalid} aria-describedby={invalid ? 'grade-validation' : undefined} type="number" step="0.1" min="0" max="10" disabled={isLocked || saving} className={`form-control gradebook-input ${changed ? 'is-edited' : ''}`} value={value} onChange={e => handleGradeChange(student.enrollment_id, field, e.target.value)} />;
    };
    const renderResult = student => {
        const dirty = hasGradeChanges(student, view.saved[student.enrollment_id]);
        return <div className="gradebook-result"><strong>{dirty ? '—' : resultText(student.total_score_10)}</strong><span>{dirty ? 'Chưa lưu' : `${resultText(student.total_score_4)} hệ 4`}</span><b className={student.letter_grade === 'F' ? 'is-failed' : ''}>{dirty ? '—' : resultText(student.letter_grade)}</b></div>;
    };

    return <div className="gradebook">
        <header className="gradebook-heading"><div><h1>Nhập & khóa điểm</h1><p>Sổ điểm học phần · Theo dõi từng lớp, hoàn tất từng sinh viên.</p></div><label className="gradebook-semester">Học kỳ<select className="form-select" value={semesterId} disabled={saving} onChange={e => changeScope(e.target.value, true)}>{!semesters.length && <option value="">Chưa có học kỳ</option>}{semesters.map(s => <option key={s.id} value={s.id}>{s.semester_name}</option>)}</select></label></header>
        <div className="gradebook-layout">
            <aside className="gradebook-directory" aria-label="Chọn lớp học phần"><div className="gradebook-directory-title"><h2>Lớp học phần</h2><span>{classes.length}</span></div>
                {classError ? <div className="alert alert-danger" role="alert">{classError}<button className="btn btn-sm btn-outline-danger mt-2" onClick={() => fetchClasses()}>Thử lại</button></div> : classLoading ? <LoadingState label="Đang tải lớp" /> : !classes.length ? <p className="gradebook-no-classes">Không có lớp học phần trong học kỳ này.</p> : <><label className="gradebook-mobile-class">Chọn lớp<select className="form-select" value={selectedClass} disabled={saving} onChange={e => changeScope(e.target.value)}>{classes.map(c => <option key={c.id} value={c.id}>{c.subject_name} · {c.class_code}</option>)}</select></label><div className="gradebook-class-list">{classes.map(c => <button key={c.id} className={`gradebook-class ${String(c.id) === String(selectedClass) ? 'is-current' : ''}`} aria-pressed={String(c.id) === String(selectedClass)} disabled={saving} onClick={() => changeScope(String(c.id))}><span>{c.class_code}<i aria-hidden="true" className={`bi ${locked(c.grades_locked) ? 'bi-lock' : 'bi-arrow-up-right'}`} /></span><strong>{c.subject_name}</strong><small>{c.current_students ?? '—'} sinh viên · {c.credits} tín chỉ</small></button>)}</div></>}
                <div className="gradebook-method"><h3>Cách tính điểm</h3>{scoreLabels.map((label, idx) => <div key={label}><span>{label}</span><strong>{scoreWeights[idx]}%</strong></div>)}<p>Hệ 10, hệ 4 và điểm chữ được tính lại sau khi lưu.</p></div>
            </aside>
            <section className="gradebook-ledger" aria-labelledby="gradebook-course-title" aria-busy={saving}>
                <div className="gradebook-sheet" key={`${semesterId}-${selectedClass}`}>
                    <div className="gradebook-sheet-header"><div><h2 id="gradebook-course-title">{selected?.subject_name || (classError ? 'Chưa tải được lớp học phần' : classLoading ? 'Đang tải lớp học phần' : 'Chưa có lớp học phần')}</h2><p>{selected ? `${selected.class_code} · ${selected.credits} tín chỉ` : semesterName}</p></div><span className={`gradebook-lock-status ${isLocked ? 'is-locked' : ''}`}><i aria-hidden="true" className={`bi ${isLocked ? 'bi-lock' : 'bi-pencil'}`} />{sheetStatus}</span></div>
                    <div className="gradebook-mobile-tools"><button className="btn btn-outline-secondary" disabled={!course || saving} onClick={handleExport}><i aria-hidden="true" className="bi bi-download" />Xuất Excel</button><button className="btn btn-outline-secondary" disabled={!course || saving || Boolean(dirtyStudents.length)} onClick={handleToggleLock}><i aria-hidden="true" className={`bi ${isLocked ? 'bi-unlock' : 'bi-lock'}`} />{isLocked ? 'Mở khóa' : 'Khóa điểm'}</button></div>
                    <div className="gradebook-toolbar"><div className="gradebook-roster-count"><strong>{students.length}</strong> sinh viên <span>· {markedCount} đã có tổng kết</span></div><label className="search-field"><i aria-hidden="true" className="bi bi-search" /><input aria-label="Tìm sinh viên trong bảng điểm" placeholder="Tìm tên hoặc mã sinh viên…" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
                    {notice && <div className={`gradebook-notice alert alert-${notice.type}`} role={notice.type === 'danger' ? 'alert' : 'status'}>{notice.text}</div>}
                    {studentError ? <div className="gradebook-notice alert alert-danger" role="alert">{studentError}<button className="btn btn-sm btn-outline-danger ms-2" onClick={() => fetchStudents(selectedClass)}>Thử lại</button></div> : (classLoading || studentLoading) ? <div className="p-4"><LoadingState label="Đang tải bảng điểm" /></div> : !filtered.length ? <div className="empty-state"><i aria-hidden="true" className="bi bi-journal-text" /><strong>{classError ? 'Chưa tải được danh sách lớp' : !validSelection ? 'Không có lớp học phần' : search ? 'Không tìm thấy sinh viên' : 'Chưa có sinh viên trong lớp'}</strong><span>{classError ? 'Chọn Thử lại trong danh sách lớp để tải lại.' : !semesterId ? 'Chưa có học kỳ để tra cứu. Kiểm tra kế hoạch đào tạo.' : !validSelection ? 'Học kỳ này chưa có lớp học phần để nhập điểm. Bạn có thể chọn học kỳ khác.' : search ? 'Thử tên hoặc mã sinh viên khác.' : 'Chọn lớp khác để xem bảng điểm.'}</span></div> : <>
                        <div className="gradebook-table-scroll" tabIndex={0} role="region" aria-label="Bảng điểm sinh viên"><table className="gradebook-table"><thead><tr><th scope="col">STT</th><th scope="col">Sinh viên</th>{scoreLabels.map((label, idx) => <th scope="col" key={label}>{label}<small>{scoreWeights[idx]}%</small></th>)}<th scope="col">Tổng kết<small>Hệ 10 · Hệ 4 · Chữ</small></th><th scope="col">Lưu điểm</th></tr></thead><tbody>{filtered.map((s, idx) => { const dirty = hasGradeChanges(s, view.saved[s.enrollment_id]); return <tr key={s.enrollment_id} className={dirty ? 'has-draft' : ''}><td>{idx + 1}</td><th scope="row"><button className="gradebook-student" onClick={() => setInspectedId(s.enrollment_id)}>{s.full_name}<i aria-hidden="true" className="bi bi-arrow-up-right" /></button><small>{s.student_code} · {s.class_name}</small></th>{scoreFields.map((field, fieldIdx) => <td key={field}>{renderScore(s, field, fieldIdx, 'table')}</td>)}<td>{renderResult(s)}</td><td><button className="gradebook-row-save" aria-label={`Lưu điểm ${s.full_name}`} title={dirty ? 'Lưu thay đổi của sinh viên' : 'Chưa có thay đổi'} disabled={!dirty || isLocked || saving} onClick={() => saveGrades([s])}><i aria-hidden="true" className="bi bi-floppy" /><span>{dirty ? 'Lưu' : 'Đã lưu'}</span></button></td></tr>; })}</tbody></table></div>
                        <div className="gradebook-mobile-reader"><div className="gradebook-student-switch"><label>Sinh viên<select className="form-select" value={focused?.enrollment_id || ''} onChange={e => setFocusId(Number(e.target.value))}>{filtered.map((s, idx) => <option key={s.enrollment_id} value={s.enrollment_id}>{idx + 1}. {s.full_name} · {s.student_code}</option>)}</select></label><div><button className="icon-button" disabled={focusedIndex <= 0} aria-label="Sinh viên trước" onClick={() => setFocusId(filtered[focusedIndex - 1].enrollment_id)}><i aria-hidden="true" className="bi bi-arrow-left" /></button><button className="icon-button" disabled={focusedIndex >= filtered.length - 1} aria-label="Sinh viên tiếp theo" onClick={() => setFocusId(filtered[focusedIndex + 1].enrollment_id)}><i aria-hidden="true" className="bi bi-arrow-right" /></button></div></div>
                            {focused && <div className="gradebook-student-page" key={focused.enrollment_id}><div className="gradebook-mobile-identity"><span>{focusedIndex + 1} / {filtered.length}</span><h3><button onClick={() => setInspectedId(focused.enrollment_id)}>{focused.full_name}<i aria-hidden="true" className="bi bi-arrow-up-right" /></button></h3><p>{focused.student_code} · {focused.class_name}</p></div><div className="gradebook-mobile-scores">{scoreFields.map((field, idx) => <label key={field} htmlFor={`score-mobile-${focused.enrollment_id}-${field}`}>{scoreLabels[idx]}<small>{scoreWeights[idx]}%</small>{renderScore(focused, field, idx, 'mobile')}</label>)}</div><div className="gradebook-mobile-result"><span>Kết quả đã lưu</span>{renderResult(focused)}</div><button className="btn btn-outline-primary gradebook-save-student" disabled={isLocked || saving || !hasGradeChanges(focused, view.saved[focused.enrollment_id])} onClick={() => saveGrades([focused])}><i aria-hidden="true" className="bi bi-floppy" />Lưu điểm sinh viên này</button></div>}
                        </div>
                    </>}
                    {students.some(invalidGrade) && <p className="gradebook-validation" id="grade-validation" role="alert">Điểm phải là số từ 0 đến 10.</p>}
                </div>
                <footer className="gradebook-action-shelf"><div className="gradebook-save-state" role="status"><i aria-hidden="true" className={`bi ${dirtyStudents.length ? 'bi-pencil-square' : 'bi-check2-circle'}`} /><div><strong>{saving ? 'Đang xử lý…' : dirtyStudents.length ? `${dirtyStudents.length} sinh viên chưa lưu` : 'Không có thay đổi chưa lưu'}</strong><small>{isLocked ? 'Mở khóa để chỉnh sửa điểm.' : dirtyStudents.length ? 'Lưu thay đổi trước khi khóa bảng điểm.' : 'Điểm trống được giữ nguyên, không đổi thành 0.'}</small></div></div><div className="gradebook-shelf-buttons"><button className="btn btn-outline-secondary" disabled={!course || saving} onClick={handleExport}><i aria-hidden="true" className="bi bi-download" /><span>Xuất Excel</span></button><button className="btn btn-outline-secondary" disabled={!course || saving || Boolean(dirtyStudents.length)} onClick={handleToggleLock} title={dirtyStudents.length ? 'Lưu các thay đổi trước khi khóa điểm' : undefined}><i aria-hidden="true" className={`bi ${isLocked ? 'bi-unlock' : 'bi-lock'}`} /><span>{isLocked ? 'Mở khóa' : 'Khóa điểm'}</span></button><button className="btn btn-primary" disabled={!dirtyStudents.length || saving || isLocked} onClick={() => saveGrades(dirtyStudents)}><i aria-hidden="true" className="bi bi-floppy" /><span>{saving ? 'Đang xử lý…' : `Lưu thay đổi${dirtyStudents.length ? ` (${dirtyStudents.length})` : ''}`}</span></button></div></footer>
            </section>
        </div>
        {inspected && <AccessibleDialog label={`Chi tiết điểm ${inspected.full_name}`} onClose={() => setInspectedId(null)} className="gradebook-inspector"><div className="gradebook-inspector-header"><h2>Chi tiết sinh viên</h2><button className="icon-button" aria-label="Đóng chi tiết sinh viên" onClick={() => setInspectedId(null)}><i aria-hidden="true" className="bi bi-x-lg" /></button></div><div className="gradebook-inspector-body"><h3>{inspected.full_name}</h3><p>{inspected.student_code} · {inspected.class_name}</p><h4>{selected?.subject_name}</h4><p>{selected?.class_code}</p><dl>{scoreFields.map((field, idx) => <div key={field}><dt>{scoreLabels[idx]} · {scoreWeights[idx]}%</dt><dd>{resultText(view.saved[inspected.enrollment_id]?.[field])}</dd></div>)}<div><dt>Tổng kết hệ 10</dt><dd>{resultText(view.saved[inspected.enrollment_id]?.total_score_10)}</dd></div><div><dt>Hệ 4 / điểm chữ</dt><dd>{resultText(view.saved[inspected.enrollment_id]?.total_score_4)} / {resultText(view.saved[inspected.enrollment_id]?.letter_grade)}</dd></div></dl><p className="gradebook-inspector-note">Thông tin điểm đã lưu của lớp đang chọn. {hasGradeChanges(inspected, view.saved[inspected.enrollment_id]) && 'Sinh viên này đang có thay đổi chưa lưu trong sổ điểm.'}</p></div></AccessibleDialog>}
    </div>;
}
