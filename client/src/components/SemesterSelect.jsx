import { useAcademic } from '../context/academic-context';
export default function SemesterSelect() {
    const { semesters, semesterId, setSemesterId, error } = useAcademic();
    return <div className="mb-3 d-print-none">
        <label className="form-label">Học kỳ
            <select className="form-select" value={semesterId} onChange={e => setSemesterId(e.target.value)}>
                {!semesters.length && <option value="">Chưa có học kỳ</option>}
                {semesters.map(s => <option key={s.id} value={s.id}>{s.semester_name}</option>)}
            </select>
        </label>
        {error && <div role="alert" className="alert alert-danger">{error}</div>}
    </div>;
}
