export function registrationTime(value) {
    if (value instanceof Date) return value.getTime();
    if (!value) return NaN;
    const raw = String(value).replace(' ', 'T');
    return new Date(/Z$|[+-]\d\d:\d\d$/.test(raw) ? raw : raw.length === 10 ? `${raw}T00:00:00+07:00` : `${raw}+07:00`).getTime();
}

export const registrationStates = {
    OPEN: { code: 'OPEN', label: 'Đang mở đăng ký', variant: 'success' },
    UPCOMING: { code: 'UPCOMING', label: 'Chưa tới hạn đăng ký', variant: 'warning' },
    EXPIRED: { code: 'EXPIRED', label: 'Đã hết hạn đăng ký', variant: 'neutral' },
    DISABLED: { code: 'DISABLED', label: 'Đợt đăng ký đã tắt', variant: 'neutral' },
    NONE: { code: 'NONE', label: 'Chưa có đợt đăng ký', variant: 'neutral' },
    CLOSED: { code: 'CLOSED', label: 'Lớp đã đóng đăng ký', variant: 'neutral' },
    CANCELLED: { code: 'CANCELLED', label: 'Lớp đã hủy', variant: 'danger' },
    LOCKED: { code: 'LOCKED', label: 'Lớp đã khóa điểm', variant: 'neutral' },
    FULL: { code: 'FULL', label: 'Hết chỗ', variant: 'warning' },
    UNKNOWN: { code: 'UNKNOWN', label: 'Chưa rõ trạng thái đăng ký', variant: 'neutral' }
};

export function getPeriodStatus(period, now = Date.now()) {
    if (Number(period.is_active) !== 1) return registrationStates.DISABLED;
    const start = registrationTime(period.start_time), end = registrationTime(period.end_time);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return registrationStates.UNKNOWN;
    return registrationStates[now < start ? 'UPCOMING' : now > end ? 'EXPIRED' : 'OPEN'];
}

export function getSemesterRegistrationStatus(periods, semesterId, now = Date.now()) {
    const relevant = periods.filter(p => String(p.semester_id) === String(semesterId));
    const states = relevant.map(p => getPeriodStatus(p, now));
    for (const code of ['OPEN', 'UPCOMING', 'EXPIRED', 'UNKNOWN', 'DISABLED']) {
        if (states.some(state => state.code === code)) return registrationStates[code];
    }
    return registrationStates.NONE;
}

export function getClassRegistrationStatus(cls, periods, now = Date.now()) {
    if (cls.status === 'CANCELLED') return registrationStates.CANCELLED;
    if (Number(cls.grades_locked) === 1) return registrationStates.LOCKED;
    if (cls.status === 'CLOSED') return registrationStates.CLOSED;
    if (cls.status !== 'OPEN') return registrationStates.UNKNOWN;
    const periodStatus = getSemesterRegistrationStatus(periods, cls.semester_id, now);
    if (periodStatus.code !== 'OPEN') return periodStatus;
    return Number(cls.current_students) >= Number(cls.max_students) ? registrationStates.FULL : registrationStates.OPEN;
}

export function nextRegistrationBoundary(periods, now) {
    const times = periods.filter(p => Number(p.is_active) === 1).flatMap(p => [registrationTime(p.start_time), registrationTime(p.end_time) + 1]);
    return Math.min(...times.filter(time => Number.isFinite(time) && time > now));
}
