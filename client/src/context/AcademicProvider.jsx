import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { AcademicContext } from './academic-context';
import { useAuth } from './auth-context';

export default function AcademicProvider({ children }) {
    const { user } = useAuth();
    const [data, setData] = useState({ semesters: [], periods: [], activeSemester: null, program: null });
    const [semesterId, setSemesterId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        if (!user) return;
        try {
            const response = await axiosClient.get('/academic/context');
            setData(response.data);
            setSemesterId(previous => response.data.semesters.some(s => String(s.id) === previous) ? previous : String(response.data.activeSemester?.id || response.data.semesters[0]?.id || ''));
            setError('');
        } catch (err) { setError(err.response?.data?.message || 'Không tải được thông tin học kỳ.'); }
        finally { setLoading(false); }
    }, [user]);
    useEffect(() => {
        // State updates occur after the HTTP response, not synchronously in this effect.
        // eslint-disable-next-line react/set-state-in-effect
        refresh();
        const timer = setInterval(refresh, 30000);
        window.addEventListener('focus', refresh);
        return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
    }, [refresh]);
    const semester = data.semesters.find(s => String(s.id) === semesterId) || null;
    const period = data.periods.find(p => String(p.semester_id) === semesterId && p.is_open) || null;
    return <AcademicContext.Provider value={{ ...data, semesterId, setSemesterId, semester, period, refresh, error, loading }}>{children}</AcademicContext.Provider>;
}
