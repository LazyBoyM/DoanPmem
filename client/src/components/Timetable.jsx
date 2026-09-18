import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAcademic } from '../context/academic-context';
import SemesterSelect from './SemesterSelect';

function WeekTable({ lecturer, semesterId }) {
    const [week, setWeek] = useState(1);
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        if (semesterId) axiosClient.get(lecturer ? '/lecturer/timetable' : '/registration/my-enrollments', {
            params: { semester_id: semesterId }, signal: controller.signal
        }).then(response => {
            setItems(lecturer ? response.data : response.data.flatMap(c => c.schedules.map(s => ({ ...c, ...s, course_class_id: c.id }))));
            setError('');
        }).catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.message || 'Không tải được lịch.'); });
        return () => controller.abort();
    }, [lecturer, semesterId]);
    const maxWeek = Math.max(16, ...items.map(s => Number(s.week_to)));
    const visible = items.filter(s => Number(s.week_from) <= week && Number(s.week_to) >= week);
    return <>
        <label className="form-label d-print-none">Tuần học
            <select className="form-select" value={week} onChange={e => setWeek(Number(e.target.value))}>
                {Array.from({ length: maxWeek }, (_, i) => <option value={i+1} key={i}>Tuần {i+1}</option>)}
            </select>
        </label>
        <h5>Tuần {week}</h5>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <div className="table-responsive">
            <table className="table table-bordered text-center">
                <thead><tr><th>Tiết</th>{Array.from({ length: 7 }, (_, i) => <th key={i}>{i === 6 ? 'Chủ nhật' : `Thứ ${i+2}`}</th>)}</tr></thead>
                <tbody>{Array.from({ length: 12 }, (_, i) => <tr key={i}>
                    <th scope="row">{i+1}</th>
                    {Array.from({ length: 7 }, (_, day) => <td key={day}>
                        {visible.filter(s => Number(s.day_of_week) === day+2 && Number(s.start_period) <= i+1 && i+1 < Number(s.start_period)+Number(s.total_periods)).map((s,index) =>
                            <div className="timetable-cell-content mb-1" key={`${s.course_class_id}-${s.id}-${index}`}>
                                <strong>{s.subject_name}</strong><div>{s.class_code}</div><small>{s.room}</small>
                                {lecturer && <div className="small">{s.lecturer_name}</div>}
                            </div>)}
                    </td>)}
                </tr>)}</tbody>
            </table>
        </div>
        {!visible.length && <p>Không có lịch trong tuần này.</p>}
    </>;
}
export default function Timetable({ lecturer = false }) {
    const { semesterId, semester } = useAcademic();
    return <div className="card p-4">
        <h4>{lecturer ? 'Lịch giảng dạy' : 'Thời khóa biểu học tập'}</h4>
        <p>{semester?.semester_name}</p>
        <SemesterSelect />
        <button className="btn btn-outline-primary align-self-start mb-3 d-print-none" onClick={() => window.print()}>In / Lưu PDF</button>
        <WeekTable key={semesterId} semesterId={semesterId} lecturer={lecturer} />
    </div>;
}
