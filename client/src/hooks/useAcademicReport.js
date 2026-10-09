import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

/** Share cancellation, stale-response protection and retry handling for transcripts. */
export default function useAcademicReport(endpoint, semester = '') {
    const requestKey = JSON.stringify([endpoint, semester]);
    const [result, setResult] = useState(null);
    const [failure, setFailure] = useState(null);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        if (!endpoint) return;
        const controller = new AbortController();
        axiosClient.get(endpoint, {
            params: semester ? { semester_id: semester } : {},
            signal: controller.signal,
        }).then(report => {
            if (!controller.signal.aborted) {
                setResult({ requestKey, report });
                setFailure(null);
            }
        }).catch(error => {
            if (!controller.signal.aborted) {
                setFailure({ requestKey, message: error.response?.data?.message || 'Không tải được kết quả học tập.' });
            }
        });
        return () => controller.abort();
    }, [endpoint, semester, requestKey, version]);

    const refresh = () => {
        setFailure(null);
        setVersion(value => value + 1);
    };
    return {
        report: result?.requestKey === requestKey ? result.report : null,
        error: failure?.requestKey === requestKey ? failure.message : '',
        refresh,
    };
}
