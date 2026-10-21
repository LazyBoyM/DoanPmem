const { fail } = require('./store');
const { integer, requireRow } = require('./academic');

const roomLabel = (room, building) => building.building_code === 'LEGACY' ? room.room_code : `${building.building_code} · ${room.room_code}`;
async function lockFacilities(store) {
    await store.list('buildings', {}, { lock: true });
}
async function roomsWithDetails(store) {
    const buildings = await store.list('buildings');
    const byId = new Map(buildings.map(b => [b.id, b]));
    return (await store.list('rooms')).map(room => {
        const building = byId.get(room.building_id);
        return { ...room, building_code: building?.building_code, building_name: building?.building_name,
            building_status: building?.status, location: building?.location, needs_review: building?.building_code === 'LEGACY',
            label: building ? roomLabel(room, building) : room.room_code };
    });
}
async function allocatedClasses(store, roomIds) {
    const schedules = await store.related('class_schedules', 'room_id', roomIds);
    const classes = await store.related('course_classes', 'id', schedules.map(s => s.course_class_id));
    return classes.filter(c => c.status !== 'CANCELLED');
}
async function resolveRooms(store, schedules, maxStudents) {
    const result = [];
    for (const schedule of schedules) {
        const room = await requireRow(store, 'rooms', schedule.room_id, 'Phòng học');
        const building = await requireRow(store, 'buildings', room.building_id, 'Tòa nhà');
        if (room.status !== 'ACTIVE' || building.status !== 'ACTIVE') fail(`Phòng ${roomLabel(room, building)} hoặc tòa nhà đang ngừng sử dụng.`);
        if (maxStudents > room.capacity) fail(`Phòng ${roomLabel(room, building)} chỉ có ${room.capacity} chỗ; sĩ số lớp là ${maxStudents}.`);
        result.push({ ...schedule, room_id: integer(room.id, 'Phòng'), room: roomLabel(room, building) });
    }
    return result;
}
module.exports = { roomLabel, lockFacilities, roomsWithDetails, allocatedClasses, resolveRooms };
