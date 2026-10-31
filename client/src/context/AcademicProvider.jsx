import { useCallback, useEffect, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { AcademicContext } from './academic-context';
import { useAuth } from './auth-context';
import { getPeriodStatus, getSemesterRegistrationStatus, getClassRegistrationStatus, nextRegistrationBoundary, registrationStates } from '../utils/registrationStatus';

export default function AcademicProvider({ children }) {
    const { user } = useAuth();
    const [data, setData] = useState({ semesters: [], periods: [], activeSemester: null, program: null });
    const [semesterId, setSemesterId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(Date.now);
    const serverOffset = useRef(0);
    const refresh = useCallback(async () => {
        if (!user) return;
        try {
            const response = await axiosClient.get('/academic/context');
            const serverTime = Date.parse(response.data.server_time);
            serverOffset.current = Number.isFinite(serverTime) ? serverTime - Date.now() : 0;
            setNow(Date.now() + serverOffset.current);
            setData(response.data);
            setSemesterId(previous => response.data.semesters.some(s => String(s.id) === previous) ? previous : String(response.data.activeSemester?.id || response.data.semesters[0]?.id || ''));
            setError('');
        } catch (err) { setError(err.response?.data?.message || 'Không tải được thông tin học kỳ.'); }
        finally { setLoading(false); }
    }, [user]);
    useEffect(() => {
        Promise.resolve().then(refresh);
        const timer = setInterval(refresh, 30000);
        window.addEventListener('focus', refresh);
        return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
    }, [refresh]);
    useEffect(() => {
        const current = Date.now() + serverOffset.current;
        const boundary = nextRegistrationBoundary(data.periods, now);
        if (!Number.isFinite(boundary)) return;
        const timer = setTimeout(() => setNow(Date.now() + serverOffset.current), Math.min(Math.max(1, boundary - current), 2147483647));
        return () => clearTimeout(timer);
    }, [data.periods, now]);
    const semester = data.semesters.find(s => String(s.id) === semesterId) || null;
    const period = !loading && !error ? data.periods.find(p => String(p.semester_id) === semesterId && getPeriodStatus(p, now).code === 'OPEN') || null : null;
    const registrationStatus = loading || error ? registrationStates.UNKNOWN : getSemesterRegistrationStatus(data.periods, semesterId, now);
    const registrationStatusFor = useCallback(cls => loading || error ? registrationStates.UNKNOWN : getClassRegistrationStatus(cls, data.periods, now), [loading, error, data.periods, now]);
    return <AcademicContext.Provider value={{ ...data, semesterId, setSemesterId, semester, period, registrationStatus, registrationStatusFor, now, refresh, error, loading }}>{children}</AcademicContext.Provider>;
}
