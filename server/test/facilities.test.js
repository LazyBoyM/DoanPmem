const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const { mockDb } = require('../src/config/db');
const snapshot = structuredClone(mockDb);
let server, base;
const tokens = {};
async function request(path, body, method, role = 'admin') {
    const response = await fetch(base + path, { method: method || (body ? 'POST' : 'GET'),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[role] || ''}` },
        ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
}
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
    for (const username of ['admin', 'gv_thuan', '74dctt25001']) tokens[username] = (await request('/auth/login', { username, password: '123456' })).body.token;
});
beforeEach(() => Object.assign(mockDb, structuredClone(snapshot)));
after(async () => { Object.assign(mockDb, snapshot); await new Promise(resolve => server.close(resolve)); });
const building = { building_code: 'B1', building_name: 'Tòa B1', location: 'Cơ sở 2' };
const room = { building_id: 1, room_code: 'NEW', room_name: 'Phòng mới', capacity: 40 };
const session = { day_of_week: 8, start_period: 1, total_periods: 3, week_from: 1, week_to: 8, room_id: 1 };
const course = { class_code: 'NEW', subject_id: 6, semester_id: 1, lecturer_id: null, max_students: 40, schedules: [session] };

test('facility routes only allow administrators', async () => {
    for (const role of ['gv_thuan', '74dctt25001']) {
        for (const resource of ['buildings', 'rooms']) {
            assert.equal((await request(`/admin/${resource}`, undefined, 'GET', role)).status, 403);
            assert.equal((await request(`/admin/${resource}`, resource === 'rooms' ? room : building, 'POST', role)).status, 403);
            assert.equal((await request(`/admin/${resource}/1`, {}, 'PUT', role)).status, 403);
            assert.equal((await request(`/admin/${resource}/1`, undefined, 'DELETE', role)).status, 403);
        }
        assert.equal((await request('/admin/classes/1/schedule', { schedules: [session] }, 'PUT', role)).status, 403);
    }
});
test('building CRUD validates unique codes, lengths and prevents deleting populated buildings', async () => {
    const res = await request('/admin/buildings', building);
    assert.equal(res.status, 200);
    const id = res.body.data.id;
    assert.equal((await request('/admin/buildings', { ...building, building_code: 'b1' })).status, 409);
    assert.equal((await request('/admin/buildings', { ...building, building_code: 'A'.repeat(31) })).status, 400);
    assert.equal((await request(`/admin/buildings/${id}`, { location: 'Địa điểm mới' }, 'PUT')).status, 200);
    assert.equal((await request('/admin/buildings/1', undefined, 'DELETE')).status, 409);
    assert.equal((await request(`/admin/buildings/${id}`, undefined, 'DELETE')).status, 200);
});
test('room CRUD validates capacity, parent and uniqueness within each building', async () => {
    const res = await request('/admin/rooms', room); assert.equal(res.status, 200);
    assert.equal((await request('/admin/rooms', { ...room, room_code: 'new' })).status, 409);
    assert.equal((await request('/admin/rooms', { ...room, building_id: 2 })).status, 200);
    for (const capacity of [0, -1, 1001, 2.5, '', 'x']) assert.equal((await request('/admin/rooms', { ...room, capacity })).status, 400);
    assert.equal((await request('/admin/rooms', { ...room, building_id: 999 })).status, 404);
    assert.equal((await request('/admin/rooms', { ...room, room_type: 'UNKNOWN' })).status, 400);
    assert.equal((await request(`/admin/rooms/${res.body.data.id}`, { capacity: 60 }, 'PUT')).status, 200);
    assert.equal((await request(`/admin/rooms/${res.body.data.id}`, undefined, 'DELETE')).status, 200);
});
test('existing allocations protect closure, deletion and reduction below class size', async () => {
    const before = structuredClone(mockDb);
    assert.equal((await request('/admin/rooms/1', undefined, 'DELETE')).status, 409);
    for (const change of [{ status: 'INACTIVE' }, { capacity: 49 }]) assert.equal((await request('/admin/rooms/1', change, 'PUT')).status, 409);
    assert.equal((await request('/admin/buildings/1', { status: 'INACTIVE' }, 'PUT')).status, 409);
    assert.deepEqual(mockDb, before);
});
test('unallocated rooms can close and inherited building closure blocks allocation', async () => {
    const res = await request('/admin/rooms', room);
    const id = res.body.data.id;
    assert.equal((await request(`/admin/rooms/${id}`, { status: 'INACTIVE' }, 'PUT')).status, 200);
    assert.equal((await request('/admin/create-class', { ...course, schedules: [{ ...session, room_id: id }] })).status, 400);
    const b = (await request('/admin/buildings', building)).body.data;
    const r = (await request('/admin/rooms', { ...room, building_id: b.id })).body.data;
    assert.equal((await request(`/admin/buildings/${b.id}`, { status: 'INACTIVE' }, 'PUT')).status, 200);
    assert.equal((await request('/admin/create-class', { ...course, schedules: [{ ...session, room_id: r.id }] })).status, 400);
});
test('allocation requires catalog ID and capacity; ignores client room labels', async () => {
    for (const schedules of [[{ ...session, room_id: undefined, room: 'FAKE' }], [{ ...session, room_id: 999 }]]) {
        assert.ok((await request('/admin/create-class', { ...course, schedules })).status >= 400);
    }
    assert.equal((await request('/admin/create-class', { ...course, max_students: 51 })).status, 400);
    const res = await request('/admin/create-class', { ...course, schedules: [{ ...session, room: 'FAKE' }] });
    assert.equal(res.status, 200);
    assert.equal(mockDb.class_schedules.find(s => s.course_class_id === res.body.data.id).room, 'A1 · 301');
});
test('same room conflicts across overlaps but accepts adjacent periods, weeks and different semesters', async () => {
    assert.equal((await request('/admin/create-class', course)).status, 200);
    assert.equal((await request('/admin/create-class', { ...course, class_code: 'OVERLAP', schedules: [{ ...session, start_period: 3 }] })).status, 400);
    assert.equal((await request('/admin/create-class', { ...course, class_code: 'ADJACENT', schedules: [{ ...session, start_period: 4 }] })).status, 200);
    assert.equal((await request('/admin/create-class', { ...course, class_code: 'WEEKS', schedules: [{ ...session, week_from: 9, week_to: 16 }] })).status, 200);
    mockDb.semesters.push({ ...mockDb.semesters[0], id: 2 });
    assert.equal((await request('/admin/create-class', { ...course, class_code: 'OTHER_TERM', semester_id: 2 })).status, 200);
    assert.equal((await request('/admin/create-class', { ...course, class_code: 'TWO_SESSIONS', schedules: [session, session] })).status, 400);
});
test('same room code in another building has independent identity', async () => {
    const r = (await request('/admin/rooms', { ...room, room_code: '301', building_id: 2 })).body.data;
    assert.equal((await request('/admin/create-class', course)).status, 200);
    assert.equal((await request('/admin/create-class', { ...course, class_code: 'OTHER_BUILDING', schedules: [{ ...session, room_id: r.id }] })).status, 200);
});
test('concurrent allocations to a room only permit one class and leave no orphan schedules', async () => {
    const results = await Promise.all([request('/admin/create-class', course), request('/admin/create-class', { ...course, class_code: 'RACE' })]);
    assert.deepEqual(results.map(r => r.status).sort(), [200, 400]);
    assert.equal(mockDb.class_schedules.length, snapshot.class_schedules.length + 1);
});
test('rename keeps room identity and timetable uses current catalog labels and location', async () => {
    assert.equal((await request('/admin/rooms/1', { room_code: '303' }, 'PUT')).status, 200);
    assert.equal((await request('/admin/buildings/1', { building_code: 'MAIN', location: 'Khu chính' }, 'PUT')).status, 200);
    const classes = (await request('/registration/my-enrollments', undefined, 'GET', '74dctt25001')).body.data;
    assert.equal(classes.find(c => c.id === 1).schedules[0].room, 'MAIN · 303');
    assert.equal(classes.find(c => c.id === 1).schedules[0].location, 'Khu chính');
    assert.equal((await request('/lecturer/timetable', undefined, 'GET', 'gv_thuan')).body.data.find(s => s.course_class_id === 1).room, 'MAIN · 303');
});
test('schedule edits preserve enrollment and reject lecturer/student conflicts atomically', async () => {
    const previous = structuredClone(mockDb.class_schedules);
    const conflict = { ...session, day_of_week: 4, start_period: 4, room_id: 3, week_to: 16 };
    assert.equal((await request('/admin/classes/1/schedule', { schedules: [conflict] }, 'PUT')).status, 400);
    assert.deepEqual(mockDb.class_schedules, previous);
    assert.equal((await request('/admin/classes/1/schedule', { schedules: [{ ...session, day_of_week: 2, start_period: 2 }] }, 'PUT')).status, 400);
    const enrollments = structuredClone(mockDb.enrollments);
    assert.equal((await request('/admin/classes/1/schedule', { schedules: [{ ...session, room_id: 3 }, { ...session, day_of_week: 7, room_id: 3 }] }, 'PUT')).status, 200);
    assert.deepEqual(mockDb.enrollments, enrollments);
    assert.equal(mockDb.class_schedules.filter(s => s.course_class_id === 1).length, 2);
    mockDb.course_classes[0].grades_locked = 1;
    assert.equal((await request('/admin/classes/1/schedule', { schedules: [session] }, 'PUT')).status, 400);
});
test('cancelled class releases room and closure no longer blocks', async () => {
    assert.equal((await request('/admin/classes/4/status', { status: 'CANCELLED' }, 'PUT')).status, 200);
    assert.equal((await request('/admin/rooms/4', { status: 'INACTIVE' }, 'PUT')).status, 200);
    assert.equal((await request('/admin/classes/4/schedule', { schedules: [session] }, 'PUT')).status, 400);
});
