/**
 * Dịch vụ kiểm tra xung đột thời khóa biểu và tính toán học tập
 */

/**
 * Kiểm tra xem 2 buổi học có bị trùng lịch không.
 * Điều kiện trùng:
 * 1. Cùng thứ trong tuần (day_of_week)
 * 2. Giao nhau về tuần học: max(week_from_1, week_from_2) <= min(week_to_1, week_to_2)
 * 3. Giao nhau về tiết học: max(start_1, start_2) < min(start_1 + len_1, start_2 + len_2)
 */
function isScheduleOverlap(s1, s2) {
    if (s1.day_of_week !== s2.day_of_week) {
        return false;
    }

    const weekFromMax = Math.max(s1.week_from || 1, s2.week_from || 1);
    const weekToMin = Math.min(s1.week_to || 16, s2.week_to || 16);
    if (weekFromMax > weekToMin) {
        return false;
    }

    const start1 = s1.start_period;
    const end1 = s1.start_period + s1.total_periods;
    const start2 = s2.start_period;
    const end2 = s2.start_period + s2.total_periods;

    return Math.max(start1, start2) < Math.min(end1, end2);
}

/**
 * Kiểm tra một lớp học phần mới có bị trùng lịch với danh sách các lớp đã đăng ký không
 */
function checkScheduleConflicts(candidateSchedules, enrolledClassesWithSchedules) {
    for (const cand of candidateSchedules) {
        for (const enrolled of enrolledClassesWithSchedules) {
            for (const sched of enrolled.schedules) {
                if (isScheduleOverlap(cand, sched)) {
                    const days = ['', '', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
                    return {
                        hasConflict: true,
                        conflictWith: enrolled.class_code,
                        subjectName: enrolled.subject_name,
                        detail: `Trùng lịch vào ${days[cand.day_of_week]}, tiết ${cand.start_period}-${cand.start_period + cand.total_periods - 1} với lớp [${enrolled.class_code}] ${enrolled.subject_name} (phòng ${sched.room}).`
                    };
                }
            }
        }
    }

    return { hasConflict: false };
}

/**
 * Quy đổi điểm hệ 10 sang thang điểm 4 và điểm chữ theo chuẩn đào tạo tín chỉ
 */
function convertGrade(attendance, midterm, final) {
    if (attendance === null || midterm === null || final === null) {
        return { total10: null, total4: null, letter: null };
    }

    const total10 = parseFloat((attendance * 0.1 + midterm * 0.3 + final * 0.6).toFixed(1));
    let total4 = 0.0;
    let letter = 'F';

    if (total10 >= 8.5) {
        total4 = 4.0;
        letter = 'A';
    } else if (total10 >= 8.0) {
        total4 = 3.5;
        letter = 'B+';
    } else if (total10 >= 7.0) {
        total4 = 3.0;
        letter = 'B';
    } else if (total10 >= 6.5) {
        total4 = 2.5;
        letter = 'C+';
    } else if (total10 >= 5.5) {
        total4 = 2.0;
        letter = 'C';
    } else if (total10 >= 5.0) {
        total4 = 1.5;
        letter = 'D+';
    } else if (total10 >= 4.0) {
        total4 = 1.0;
        letter = 'D';
    } else {
        total4 = 0.0;
        letter = 'F';
    }

    return { total10, total4, letter };
}

module.exports = {
    isScheduleOverlap,
    checkScheduleConflicts,
    convertGrade
};
