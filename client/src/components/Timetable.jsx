import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAcademic } from '../context/academic-context';
import SemesterSelect from './SemesterSelect';
import LoadingState from './LoadingState';

const dayName = day => day === 8 ? 'Chủ nhật' : `Thứ ${day}`;
function WeekTable({ lecturer, semesterId }) {
    const [week, setWeek] = useState(1);
    const [items, setItems] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        if (semesterId) axiosClient.get(lecturer ? '/lecturer/timetable' : '/registration/my-enrollments', {
            params: { semester_id: semesterId }, signal: controller.signal
        }).then(response => {
            if (controller.signal.aborted) return;
            setItems(lecturer ? response.data : response.data.flatMap(c => c.schedules.map(s => ({ ...c, ...s, course_class_id: c.id }))));
            setLoaded(true); setError('');
        }).catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Không tải được lịch.'); });
        return () => controller.abort();
    }, [lecturer, semesterId, version]);
    const maxWeek = Math.max(16, ...items.map(s => Number(s.week_to) || 16));
    const visible = items.filter(s => Number(s.week_from) <= week && Number(s.week_to) >= week);
    const loading = Boolean(semesterId) && !loaded && !error;
    return <div className="schedule-layout"><aside className="schedule-index"><h2>Tra cứu lịch</h2><label className="form-label d-print-none" htmlFor="schedule-week">Tuần học<select id="schedule-week" className="form-select" value={week} onChange={e => setWeek(Number(e.target.value))}>{Array.from({ length: maxWeek }, (_, i) => <option value={i + 1} key={i}>Tuần {i + 1}</option>)}</select></label><div className="schedule-week-stepper d-print-none"><button className="icon-button" disabled={week <= 1} aria-label="Tuần trước" onClick={() => setWeek(w => w - 1)}><i aria-hidden="true" className="bi bi-arrow-left" /></button><strong>Tuần {week}</strong><button className="icon-button" disabled={week >= maxWeek} aria-label="Tuần tiếp theo" onClick={() => setWeek(w => w + 1)}><i aria-hidden="true" className="bi bi-arrow-right" /></button></div><p className="schedule-index-note">Lịch được trình bày theo tiết học. Chọn tuần để xem các buổi thuộc phạm vi học kỳ.</p></aside>
        <section className="schedule-sheet" aria-label={`Lịch tuần ${week}`}><header className="schedule-sheet-title"><h2>Tuần {week}</h2><span>{loading ? 'Đang tải lịch' : error ? 'Chưa tải được lịch' : `${visible.length} buổi học`}</span></header>
        {error && <div className="alert alert-danger m-3" role="alert">{error}<button className="btn btn-outline-danger btn-sm ms-2" onClick={() => { setError(''); setVersion(v => v + 1); }}>Thử lại</button></div>}
        {loading ? <div className="p-4"><LoadingState label="Đang tải lịch học" /></div> : !error && <>
            <div className="table-responsive schedule-calendar"><table className="timetable-table"><thead><tr><th scope="col">Tiết</th>{Array.from({ length: 7 }, (_, i) => <th scope="col" key={i}>{dayName(i + 2)}</th>)}</tr></thead><tbody>{Array.from({ length: 12 }, (_, i) => <tr key={i}><th scope="row">{i + 1}</th>{Array.from({ length: 7 }, (_, day) => <td key={day}>{visible.filter(s => Number(s.day_of_week) === day + 2 && Number(s.start_period) <= i + 1 && i + 1 < Number(s.start_period) + Number(s.total_periods)).map((s, index) => <div className="timetable-cell-content mb-1" key={`${s.course_class_id}-${s.id}-${index}`}>{i + 1 === Number(s.start_period) ? <><strong>{s.subject_name}</strong><div>{s.class_code}</div><small>{s.room}</small>{lecturer && <div className="small">{s.lecturer_name}</div>}</> : <span className="timetable-continuation" title={s.subject_name}><i aria-hidden="true" className="bi bi-arrow-return-right me-1" />{s.class_code}</span>}</div>)}</td>)}</tr>)}</tbody></table></div>
            <div className="schedule-agenda">{Array.from({ length: 7 }, (_, i) => i + 2).filter(day => visible.some(s => Number(s.day_of_week) === day)).map(day => <section className="schedule-agenda-day" key={day}><h3>{dayName(day)}</h3>{visible.filter(s => Number(s.day_of_week) === day).sort((a, b) => Number(a.start_period) - Number(b.start_period)).map((s, index) => <article className="schedule-agenda-event" key={`${s.course_class_id}-${s.id}-${index}`}><strong>{s.subject_name}</strong><p>Tiết {s.start_period}–{Number(s.start_period) + Number(s.total_periods) - 1} · {s.room || 'Chưa có phòng'}</p><p>{s.class_code}{lecturer && s.lecturer_name ? ` · ${s.lecturer_name}` : ''}</p></article>)}</section>)}</div>
            {!visible.length && <div className="empty-state"><i aria-hidden="true" className="bi bi-calendar-check" /><strong>{semesterId ? 'Không có lịch trong tuần này' : 'Chưa có học kỳ để xem lịch'}</strong><span>Chọn học kỳ hoặc tuần học khác để tra cứu.</span></div>}
        </>}
        </section></div>;
}
export default function Timetable({ lecturer = false }) {
    const { semesterId } = useAcademic();
    return <div className="schedule-page"><header className="academic-page-header"><div><h1>{lecturer ? 'Lịch giảng dạy' : 'Thời khóa biểu học tập'}</h1><p>{lecturer ? 'Sổ lịch theo tuần của các lớp được phân công.' : 'Theo dõi các buổi học trong kế hoạch đã đăng ký.'}</p></div><div><SemesterSelect /><button className="btn btn-outline-primary d-print-none" onClick={() => window.print()}><i aria-hidden="true" className="bi bi-printer me-2" />In / Lưu PDF</button></div></header><WeekTable key={semesterId} semesterId={semesterId} lecturer={lecturer} /></div>;
}
