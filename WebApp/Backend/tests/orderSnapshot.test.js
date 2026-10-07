const mongoose = require('mongoose');
const {
    collectIds,
    sameIdSet,
    changedProtectedFields,
    buildFrozenData,
    applyFrozen,
    applyFrozenAll,
    shapeLike,
    mergeHistoryIntoData,
    applyCreationDepartment,
} = require('../services/orderSnapshot');
const { departmentAt } = require('../utils/departmentAt');

const oid = () => new mongoose.Types.ObjectId();

const deptX = { _id: oid(), code: 'X', name: 'Đơn vị X' };
const deptY = { _id: oid(), code: 'Y', name: 'Đơn vị Y' };
const userA = { _id: oid(), username: 'a', fullName: 'Nguyễn Văn A', salaryCode: 'A01', phone: '0900', signature: 'sig-key', department: deptX, position: { _id: oid(), name: 'Lái xe' } };
const xe = { _id: oid(), code: 'XE-101', name: 'Xe 101', department: deptX, category: { _id: oid(), name: 'Vận tải', group: 'Xe' }, material: { _id: oid(), name: 'HD785' }, capacity: 90 };
const job = { _id: oid(), name: 'Lái xe', type: 'Vận hành xe', content: 'c' };

// Lệnh đã populate như khi đọc từ CSDL
const populatedOrder = () => ({
    _id: oid(),
    status: 'completed',
    assignedTo: userA,
    createdBy: { ...userA, _id: oid(), fullName: 'Điều độ' },
    assistants: [],
    job,
    shift: { _id: oid(), name: 1, startTime: '06:00', endTime: '14:00' },
    department: deptX,
    device: [xe],
    assignedVehicles: [],
    excavator: [{ _id: oid(), device: xe, status: true }],
    repairVehicles: [{ _id: oid(), device: xe, note: 'ghi chú' }],
    location: [{ _id: oid(), name: 'Bãi thải', distance: 3 }],
    material: [{ _id: oid(), name: 'Đất đá', acceptedProduct: 'x' }],
});

describe('collectIds / sameIdSet', () => {
    test('nhận id trần, ObjectId, đối tượng populate và phần tử { device }', () => {
        const a = oid();
        const b = oid();
        expect([...collectIds(String(a))]).toEqual([String(a)]);
        expect([...collectIds({ _id: a, code: 'x' })]).toEqual([String(a)]);
        expect([...collectIds([{ _id: oid(), device: b, note: 'n' }])]).toEqual([String(b)]);
    });

    test('so sánh tập id không phụ thuộc thứ tự và dạng biểu diễn', () => {
        const a = oid();
        const b = oid();
        expect(sameIdSet([a, b], [String(b), { _id: a, code: 'x' }])).toBe(true);
        expect(sameIdSet([a], [a, b])).toBe(false);
        expect(sameIdSet(undefined, [])).toBe(true);
    });
});

describe('changedProtectedFields', () => {
    const existing = { ...populatedOrder(), workContent: 'A', workingDate: new Date('2026-10-01T00:00:00Z'), shiftHour: '1' };

    test('gửi lại nguyên giá trị cũ thì không có gì thay đổi', () => {
        const body = {
            assignedTo: String(existing.assignedTo._id),
            device: existing.device.map((d) => String(d._id)),
            excavator: [{ device: String(xe._id), status: true }],
            workContent: 'A',
            workingDate: '2026-10-01T00:00:00.000Z',
            note: 'ghi chú khác không bị chặn',
        };
        expect(changedProtectedFields(existing, body)).toEqual([]);
    });

    test('phát hiện đổi người nhận, thiết bị, đơn vị, ngày làm việc, nội dung', () => {
        const body = {
            assignedTo: String(oid()),
            device: [String(oid())],
            department: String(oid()),
            workingDate: '2026-10-02T00:00:00.000Z',
            workContent: 'B',
        };
        expect(changedProtectedFields(existing, body).sort()).toEqual(['assignedTo', 'department', 'device', 'workContent', 'workingDate']);
    });

    test('ngày gửi dạng khác (chỉ YYYY-MM-DD, khoảng trắng thừa) cùng thời điểm thì không bị coi là đổi', () => {
        expect(changedProtectedFields(existing, { workingDate: '2026-10-01', workContent: ' A ' })).toEqual([]);
        expect(changedProtectedFields(existing, { workingDate: new Date('2026-10-01T00:00:00Z') })).toEqual([]);
    });

    test('trường vắng mặt trong body = giữ nguyên, không tính là đổi', () => {
        expect(changedProtectedFields(existing, { note: 'x' })).toEqual([]);
    });
});

describe('applyFrozen — tình huống nhân viên đổi đơn vị', () => {
    test('lệnh đã chốt vẫn hiển thị đơn vị / thông tin lúc hoàn thành dù dữ liệu gốc đã đổi', () => {
        const order = populatedOrder();
        const frozen = { at: new Date(), source: 'completion', data: buildFrozenData(order) };

        // Sau đó: nhân viên chuyển sang đơn vị Y, xe đổi sang đơn vị Y và đổi model, công việc đổi tên
        const liveAfterChange = {
            ...order,
            frozen,
            assignedTo: { ...userA, department: deptY, fullName: 'Nguyễn Văn A (đã đổi)' },
            device: [{ ...xe, department: deptY, material: { _id: xe.material._id, name: 'MODEL-MỚI' } }],
            job: { ...job, name: 'Tên công việc mới' },
        };

        const out = applyFrozen(liveAfterChange);
        expect(out.assignedTo.department.code).toBe('X');
        expect(out.assignedTo.fullName).toBe('Nguyễn Văn A');
        expect(out.device[0].department.code).toBe('X');
        expect(out.device[0].material.name).toBe('HD785');
        expect(out.job.name).toBe('Lái xe');
        expect(out.frozenAt).toEqual(frozen.at);
        expect(out.frozen).toBeUndefined(); // không đẩy bản chụp nặng ra API
    });

    test('lệnh chưa chốt đọc dữ liệu hiện tại (thay đổi chỉ áp dụng từ lúc đổi)', () => {
        const order = { ...populatedOrder(), status: 'in_progress', assignedTo: { ...userA, department: deptY } };
        expect(applyFrozen(order).assignedTo.department.code).toBe('Y');
    });

    test('chỉ phủ lên trường đã populate, id trần giữ nguyên', () => {
        const order = populatedOrder();
        const frozen = { at: new Date(), source: 'completion', data: buildFrozenData(order) };
        const rawId = oid();
        const out = applyFrozen({ ...order, frozen, job: rawId, device: [oid()] });
        expect(out.job).toBe(rawId);
        expect(out.device[0]).toBeInstanceOf(mongoose.Types.ObjectId);
        expect(out.assignedTo.department.code).toBe('X'); // trường populate vẫn được phủ
    });

    test('không lộ thêm trường ngoài những gì truy vấn populate trả về', () => {
        const order = populatedOrder();
        const frozen = { at: new Date(), source: 'completion', data: buildFrozenData(order) };
        // truy vấn chỉ select fullName + salaryCode (như các route xuất file)
        const live = { ...order, frozen, assignedTo: { _id: userA._id, fullName: 'x', salaryCode: 'y' } };
        const out = applyFrozen(live);
        expect(Object.keys(out.assignedTo).sort()).toEqual(['_id', 'fullName', 'salaryCode']);
        expect(out.assignedTo.fullName).toBe('Nguyễn Văn A');
    });

    test('nhân viên đã bị xoá (populate ra null) vẫn hiện đúng theo bản chụp', () => {
        const order = populatedOrder();
        const frozen = { at: new Date(), source: 'completion', data: buildFrozenData(order) };
        const out = applyFrozen({ ...order, frozen, assignedTo: null });
        expect(out.assignedTo.fullName).toBe('Nguyễn Văn A');
    });

    test('nhận cả document Mongoose (toObject) lẫn đối tượng thường, và mảng', () => {
        const order = populatedOrder();
        const frozen = { at: new Date(), source: 'completion', data: buildFrozenData(order) };
        const doc = { frozen, toObject: () => ({ ...order, frozen }) };
        expect(applyFrozen(doc).assignedTo.department.code).toBe('X');
        expect(applyFrozenAll([order, null]).length).toBe(2);
        expect(applyFrozen(null)).toBeNull();
    });

    test('lệnh chưa chốt được trả về NGUYÊN BẢN (cùng tham chiếu), không bị chuyển dạng', () => {
        const order = { ...populatedOrder(), status: 'in_progress' };
        expect(applyFrozen(order)).toBe(order);
        const docNoFrozen = { status: 'pending', toObject: () => ({}) };
        expect(applyFrozen(docNoFrozen)).toBe(docNoFrozen);
    });
});

describe('shapeLike', () => {
    test('phần tử mảng không có bản sống thì giữ bản chụp đầy đủ', () => {
        const snap = [{ _id: 'a1', name: 'N', distance: 5 }];
        expect(shapeLike(snap, [])).toEqual(snap);
    });
});

describe('khôi phục lệnh cũ', () => {
    test('mergeHistoryIntoData: bản chụp History (đúng lúc hoàn thành) thắng dữ liệu hiện tại', () => {
        const live = buildFrozenData({
            ...populatedOrder(),
            assignedTo: { ...userA, department: deptY },
            device: [{ ...xe, code: 'XE-101-MỚI' }],
        });
        const hist = {
            status: 'completed',
            assignedTo: { _id: userA._id, fullName: 'Nguyễn Văn A', department: { _id: deptX._id, code: 'X' } },
            device: [{ _id: xe._id, code: 'XE-101' }],
        };
        const merged = mergeHistoryIntoData(live, hist);
        expect(merged.assignedTo.department.code).toBe('X');
        expect(merged.device[0].code).toBe('XE-101');
        expect(merged.device[0].category.name).toBe('Vận tải'); // trường History không có thì lấy từ dữ liệu hiện tại
    });

    test('applyCreationDepartment: dùng đơn vị lưu trên lệnh làm đơn vị của người nhận', () => {
        const data = buildFrozenData({ ...populatedOrder(), assignedTo: { ...userA, department: deptY }, department: deptX });
        expect(applyCreationDepartment(data).assignedTo.department.code).toBe('X');
    });
});

describe('departmentAt', () => {
    const dX = { _id: deptX._id };
    const histories = [
        { createdAt: new Date('2026-10-01T00:00:00Z'), snapshot: { department: dX } }, // 01/10 chuyển X -> Y
    ];
    test('trước ngày chuyển: đơn vị cũ; sau ngày chuyển: đơn vị hiện tại', () => {
        expect(departmentAt(histories, deptY._id, new Date('2026-09-15T00:00:00Z'))).toBe(String(deptX._id));
        expect(departmentAt(histories, deptY._id, new Date('2026-10-20T00:00:00Z'))).toBe(String(deptY._id));
    });
    test('chưa từng chuyển thì luôn là đơn vị hiện tại', () => {
        expect(departmentAt([], deptX._id, new Date('2020-01-01'))).toBe(String(deptX._id));
        expect(departmentAt(undefined, null, new Date())).toBeNull();
    });
    test('nhiều lần chuyển: lấy đúng lần chuyển đầu tiên sau thời điểm hỏi', () => {
        const dZ = { _id: oid() };
        const h = [
            { createdAt: new Date('2026-03-01T00:00:00Z'), snapshot: { department: dX } }, // 03: X -> Z
            { createdAt: new Date('2026-10-01T00:00:00Z'), snapshot: { department: dZ } }, // 10: Z -> Y
        ];
        expect(departmentAt(h, deptY._id, new Date('2026-02-01T00:00:00Z'))).toBe(String(deptX._id));
        expect(departmentAt(h, deptY._id, new Date('2026-06-01T00:00:00Z'))).toBe(String(dZ._id));
        expect(departmentAt(h, deptY._id, new Date('2026-11-01T00:00:00Z'))).toBe(String(deptY._id));
    });
});

describe('thời hạn sửa lệnh đã hoàn thành (48 giờ)', () => {
    const { frozenEditDecision, isEditWindowOpen, editWindowHours } = require('../services/orderSnapshot');
    const HOUR = 3600 * 1000;
    const now = new Date('2026-10-10T12:00:00Z').getTime();
    const asst = oid();
    const mk = (hoursAgo, extra = {}) => ({
        status: 'completed',
        endTime: new Date(now - hoursAgo * HOUR),
        assistants: [asst],
        device: [oid()],
        shift: oid(),
        ...extra,
    });

    afterEach(() => { delete process.env.ORDER_EDIT_WINDOW_HOURS; });

    test('mặc định 48 giờ; đổi được bằng ORDER_EDIT_WINDOW_HOURS; giá trị rác quay về 48', () => {
        expect(editWindowHours()).toBe(48);
        process.env.ORDER_EDIT_WINDOW_HOURS = '24';
        expect(editWindowHours()).toBe(24);
        process.env.ORDER_EDIT_WINDOW_HOURS = 'abc';
        expect(editWindowHours()).toBe(48);
        process.env.ORDER_EDIT_WINDOW_HOURS = '-5';
        expect(editWindowHours()).toBe(48);
    });

    test('trong 48 giờ: thêm/sửa phụ máy được phép, ghi nhận trường bị đổi để chụp lại bản chốt', () => {
        const d = frozenEditDecision(mk(10), { assistants: [asst, oid()] }, { now });
        expect(d.blocked).toBe(false);
        expect(d.inWindow).toBe(true);
        expect(d.editKeys).toEqual(['assistants']);
    });

    test('đúng mốc 48 giờ vẫn còn hạn; quá 48 giờ thì khoá và nêu lý do expired', () => {
        expect(frozenEditDecision(mk(48), { assistants: [] }, { now }).blocked).toBe(false);
        const d = frozenEditDecision(mk(48.01), { assistants: [asst, oid()] }, { now });
        expect(d.blocked).toBe(true);
        expect(d.reason).toBe('expired');
        expect(d.fields).toEqual(['assistants']);
    });

    test('quá hạn nhưng gửi lại đúng giá trị cũ (app gửi nguyên lệnh) thì KHÔNG bị chặn', () => {
        const o = mk(100);
        const d = frozenEditDecision(o, { assistants: [asst], device: o.device, shift: o.shift, endTime: o.endTime }, { now });
        expect(d.blocked).toBe(false);
        expect(d.editKeys).toEqual([]);
    });

    test('giờ kết thúc luôn khoá kể cả trong hạn (tránh kéo dài hạn sửa)', () => {
        const d = frozenEditDecision(mk(1), { endTime: new Date(now) }, { now });
        expect(d.blocked).toBe(true);
        expect(d.reason).toBe('endTime');
        expect(d.fields).toEqual(['endTime']);
    });

    test('mở lại / đổi trạng thái lệnh đã hoàn thành luôn bị chặn, kể cả trong hạn', () => {
        const d = frozenEditDecision(mk(1), {}, { status: 'in_progress', now });
        expect(d.blocked).toBe(true);
        expect(d.reason).toBe('reopen');
        expect(d.fields).toEqual(['status']);
        expect(frozenEditDecision(mk(1), {}, { status: 'completed', now }).blocked).toBe(false);
    });

    test('lệnh thiếu endTime coi như đã quá hạn (khoá) — an toàn với dữ liệu cũ', () => {
        const o = mk(1);
        delete o.endTime;
        expect(isEditWindowOpen(o, now)).toBe(false);
        const d = frozenEditDecision(o, { assistants: [] }, { now });
        expect(d.blocked).toBe(true);
        expect(d.reason).toBe('expired');
    });

    test('admin gửi forceEditFrozen vẫn sửa được lệnh đã khoá, và vẫn ghi nhận trường để chụp lại', () => {
        const d = frozenEditDecision(mk(500), { assistants: [] }, { adminForce: true, now });
        expect(d.blocked).toBe(false);
        expect(d.reason).toBe('expired');
        expect(d.editKeys).toEqual(['assistants']);
    });

    test('đổi giờ làm việc (workingDate) trong hạn được phép; ngoài hạn bị chặn', () => {
        const body = { workingDate: '2026-10-11' };
        expect(frozenEditDecision(mk(5, { workingDate: '2026-10-10' }), body, { now }).blocked).toBe(false);
        expect(frozenEditDecision(mk(60, { workingDate: '2026-10-10' }), body, { now }).blocked).toBe(true);
    });
});
