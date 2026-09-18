export default function ClassSchedule({ schedules = [] }) {
    if (!schedules.length) return <span>Chưa xếp lịch</span>;
    return schedules.map((s, index) => (
        <div key={s.id ?? index}>
            {Number(s.day_of_week) === 8 ? 'Chủ nhật' : `Thứ ${s.day_of_week}`}, Tiết {s.start_period}-{Number(s.start_period) + Number(s.total_periods) - 1}
            <small className="text-muted d-block">{s.room} · Tuần {s.week_from}–{s.week_to}</small>
        </div>
    ));
}
