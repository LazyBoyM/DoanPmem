const { endpoint, fail } = require('../services/store');
const { text, integer, requireRow } = require('../services/academic');
const { lockFacilities, roomsWithDetails, allocatedClasses } = require('../services/facilities');

function bounded(value, label, max) {
    const result = text(value, label);
    if (result.length > max) fail(`${label} không được vượt quá ${max} ký tự.`);
    return result;
}
function status(value) {
    if (!['ACTIVE', 'INACTIVE'].includes(value)) fail('Trạng thái phải là đang sử dụng hoặc ngừng sử dụng.');
    return value;
}
function code(value, label) {
    const result = bounded(value, label, 30).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(result)) fail(`${label} chỉ gồm chữ Latin, số, dấu chấm, gạch ngang hoặc gạch dưới.`);
    return result;
}
const getBuildings = endpoint(async (_req, store) => {
    const rooms = await store.list('rooms');
    return { data: (await store.list('buildings')).map(b => ({ ...b, room_count: rooms.filter(r => r.building_id === b.id).length })) };
});
const getRooms = endpoint(async (_req, store) => ({ data: await roomsWithDetails(store) }));
function saveBuilding(edit) {
    return endpoint(async (req, store) => {
        await lockFacilities(store);
        const current = edit ? await requireRow(store, 'buildings', req.params.id, 'Tòa nhà') : {};
        const b = { ...current, ...req.body };
        const data = { building_code: code(b.building_code, 'Mã tòa'), building_name: bounded(b.building_name, 'tên tòa nhà', 100),
            location: String(b.location ?? '').trim(), status: status(b.status ?? 'ACTIVE') };
        if (data.location.length > 200) fail('Địa chỉ không được vượt quá 200 ký tự.');
        if ((await store.list('buildings')).some(row => row.id !== current.id && row.building_code.toUpperCase() === data.building_code)) fail('Mã tòa nhà đã được sử dụng.', 409);
        const rooms = await store.list('rooms', { building_id: current.id || 0 });
        if (data.status === 'INACTIVE' && (await allocatedClasses(store, rooms.map(r => r.id))).length) fail('Tòa nhà còn lịch học. Hãy chuyển phòng hoặc hủy lớp trước khi ngừng sử dụng.', 409);
        if (edit) { await store.update('buildings', current.id, data); return { data: { ...current, ...data }, message: 'Đã cập nhật tòa nhà.' }; }
        return { data: await store.insert('buildings', data), message: 'Đã thêm tòa nhà.' };
    }, true);
}
function saveRoom(edit) {
    return endpoint(async (req, store) => {
        await lockFacilities(store);
        const current = edit ? await requireRow(store, 'rooms', req.params.id, 'Phòng học') : {};
        const b = { ...current, ...req.body };
        const building = await requireRow(store, 'buildings', b.building_id, 'Tòa nhà');
        const data = { building_id: building.id, room_code: code(b.room_code, 'Mã phòng'), room_name: bounded(b.room_name, 'tên phòng', 100),
            capacity: integer(b.capacity, 'Sức chứa', 1, 1000), floor: integer(b.floor ?? 0, 'Tầng', -5, 100),
            room_type: b.room_type ?? 'LECTURE', status: status(b.status ?? 'ACTIVE') };
        if (!['LECTURE', 'COMPUTER', 'LAB'].includes(data.room_type)) fail('Loại phòng không hợp lệ.');
        if ((await store.list('rooms', { building_id: data.building_id })).some(r => r.id !== current.id && r.room_code.toUpperCase() === data.room_code)) fail('Mã phòng đã tồn tại trong tòa nhà này.', 409);
        const allocated = current.id ? await allocatedClasses(store, [current.id]) : [];
        if (allocated.length && (data.status !== 'ACTIVE' || building.status !== 'ACTIVE')) fail('Phòng còn lịch học. Hãy chuyển phòng hoặc hủy lớp trước khi ngừng sử dụng.', 409);
        if (allocated.some(c => c.max_students > data.capacity)) fail('Sức chứa mới nhỏ hơn sĩ số tối đa của lớp đã xếp tại phòng.', 409);
        if (edit) { await store.update('rooms', current.id, data); return { data: { ...current, ...data }, message: 'Đã cập nhật phòng học.' }; }
        return { data: await store.insert('rooms', data), message: 'Đã thêm phòng học.' };
    }, true);
}
const deleteBuilding = endpoint(async (req, store) => {
    await lockFacilities(store);
    const building = await requireRow(store, 'buildings', req.params.id, 'Tòa nhà');
    if ((await store.list('rooms', { building_id: building.id })).length) fail('Tòa nhà còn phòng học; không thể xóa.', 409);
    await store.remove('buildings', { id: building.id });
    return { message: 'Đã xóa tòa nhà.' };
}, true);
const deleteRoom = endpoint(async (req, store) => {
    await lockFacilities(store);
    const room = await requireRow(store, 'rooms', req.params.id, 'Phòng học');
    if ((await store.list('class_schedules', { room_id: room.id })).length) fail('Phòng đã được dùng trong lịch học; chỉ có thể chỉnh sửa hoặc ngừng sử dụng khi không còn lịch.', 409);
    await store.remove('rooms', { id: room.id });
    return { message: 'Đã xóa phòng học.' };
}, true);
module.exports = { getBuildings, getRooms, createBuilding: saveBuilding(false), updateBuilding: saveBuilding(true),
    createRoom: saveRoom(false), updateRoom: saveRoom(true), deleteBuilding, deleteRoom };
