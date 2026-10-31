import { test } from 'node:test';
import assert from 'node:assert/strict';
import academic from '../../../server/src/services/academic.js';
import { getPeriodStatus, getSemesterRegistrationStatus, getClassRegistrationStatus, registrationTime, nextRegistrationBoundary } from './registrationStatus.js';

const period = { semester_id: 1, is_active: 1, start_time: '2026-10-01 08:00:00', end_time: '2026-10-31 17:00:00' };
const cls = { semester_id: 1, status: 'OPEN', current_students: 5, max_students: 40, grades_locked: 0 };
const start = registrationTime(period.start_time), end = registrationTime(period.end_time);

test('period status matches server rules at Vietnam time boundaries and with manual disable', () => {
    for (const candidate of [period, { ...period, is_active: '1' }, { ...period, is_active: 0 }, { ...period, start_time: '2026-10-01T01:00:00Z', end_time: '2026-10-31T10:00:00Z' }, { ...period, start_time: 'invalid' }]) {
        for (const now of [start - 1, start, start + 1, end, end + 1]) {
            assert.equal(getPeriodStatus(candidate, now).code === 'OPEN', academic.isPeriodOpen(candidate, new Date(now)));
        }
    }
    assert.equal(getPeriodStatus(period, end + 1).code, 'EXPIRED');
    assert.equal(getPeriodStatus(period, start - 1).code, 'UPCOMING');
    assert.equal(nextRegistrationBoundary([period], start), end + 1);
    assert.equal(nextRegistrationBoundary([period], end + 1), Infinity);
});

test('class registration combines semester window, manual status, grade lock and capacity', () => {
    assert.equal(getClassRegistrationStatus(cls, [period], start).code, 'OPEN');
    assert.equal(getClassRegistrationStatus(cls, [period], end + 1).code, 'EXPIRED');
    assert.equal(getClassRegistrationStatus(cls, [period], start - 1).code, 'UPCOMING');
    assert.equal(getClassRegistrationStatus(cls, [{ ...period, semester_id: 2 }], start).code, 'NONE');
    assert.equal(getClassRegistrationStatus(cls, [{ ...period, is_active: 0 }], start).code, 'DISABLED');
    assert.equal(getClassRegistrationStatus({ ...cls, status: 'CLOSED' }, [period], start).code, 'CLOSED');
    assert.equal(getClassRegistrationStatus({ ...cls, status: 'CANCELLED' }, [period], start).code, 'CANCELLED');
    assert.equal(getClassRegistrationStatus({ ...cls, grades_locked: '1' }, [period], start).code, 'LOCKED');
    assert.equal(getClassRegistrationStatus({ ...cls, current_students: 40 }, [period], start).code, 'FULL');
    assert.equal(getClassRegistrationStatus({ ...cls, grades_locked: '0' }, [period], start).code, 'OPEN');
});

test('an expired period does not close another open period or another semester', () => {
    const future = { ...period, start_time: '2026-11-01', end_time: '2026-11-30' };
    assert.equal(getSemesterRegistrationStatus([period, future], 1, end + 1).code, 'UPCOMING');
    assert.equal(getSemesterRegistrationStatus([period, future], 1, registrationTime('2026-11-02')).code, 'OPEN');
    assert.equal(getSemesterRegistrationStatus([period], 2, start).code, 'NONE');
});
