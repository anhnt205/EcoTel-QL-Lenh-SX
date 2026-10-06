const mongoose = require('mongoose');
const {
    REPORT_REF_KEYS,
    buildReportFrozenData,
    staleReportKeys,
    applyFrozenReport,
    applyFrozenReportAll,
    buildReportDataFromOrder,
} = require('../services/reportSnapshot');
const { buildFrozenData, buildShiftDevices, applyFrozen, shapeLike } = require('../services/orderSnapshot');

const oid = () => new mongoose.Types.ObjectId();

const deptX = { _id: oid(), code: 'X', name: 'Đơn vị X' };
const modelA = { _id: oid(), name: 'HD785' };
const modelB = { _id: oid(), name: 'MODEL-MỚI' };
const catTruck = { _id: oid(), name: 'Vận tải', group: 'Xe' };
const xe = { _id: oid(), code: 'XE-101', name: 'Xe 101', department: deptX, category: catTruck, material: modelA };
const mayXuc = { _id: oid(), code: 'MX-01', name: 'Máy xúc 1', department: deptX, category: { _id: oid(), name: 'Máy xúc', group: 'Xúc' }, material: { _id: oid(), name: 'PC1250' } };
const diemDo = { _id: oid(), name: 'Bãi thải Nam', distance: 3 };
const dat = { _id: oid(), name: 'Đất đá', acceptedProduct: 'land' };
const than = { _id: oid(), name: 'Than', acceptedProduct: 'coal' };

// chuyến đã populate như khi đọc từ CSDL
const populatedReport = () => ({
    _id: oid(),
    orderId: oid(),
    device: xe,
    excavator: mayXuc,
    toLocation: diemDo,
    material: dat,
    quantity: 7,
});

const freeze = (report) => ({ at: new Date('2026-09-30T00:00:00Z'), source: 'completion', data: buildReportFrozenData(report) });

describe('buildReportFrozenData', () => {
    test('chụp các tham chiếu đã populate, bỏ qua tham chiếu không có', () => {
        const data = buildReportFrozenData(populatedReport());
        expect(Object.keys(data).sort()).toEqual(['device', 'excavator', 'material', 'toLocation']); // không có fromLocation
        expect(data.device.code).toBe('XE-101');
        expect(data.device.material.name).toBe('HD785');
        expect(data.toLocation.name).toBe('Bãi thải Nam');
        expect(data.material.acceptedProduct).toBe('land');
    });

    test('id trần (chưa populate) hoặc null không được chụp', () => {
        const data = buildReportFrozenData({ device: oid(), excavator: null, material: dat });
        expect(Object.keys(data)).toEqual(['material']);
    });
});

describe('applyFrozenReport — dữ liệu gốc đổi sau khi lệnh hoàn thành', () => {
    test('báo cáo vẫn hiện mã xe / loại / model / tên địa điểm / loại sản phẩm lúc chốt', () => {
        const rep = populatedReport();
        const frozen = freeze(rep);
        // sau đó: xe đổi mã + sang đơn vị khác + đổi model, địa điểm đổi tên, vật liệu đổi loại sản phẩm
        const live = {
            ...rep,
            frozen,
            device: { ...xe, code: 'XE-101-MỚI', department: { ...deptX, code: 'Y' }, material: modelB },
            toLocation: { ...diemDo, name: 'Bãi thải Bắc' },
            material: { ...dat, acceptedProduct: 'coal' },
        };
        const out = applyFrozenReport(live);
        expect(out.device.code).toBe('XE-101');
        expect(out.device.department.code).toBe('X');
        expect(out.device.material.name).toBe('HD785');
        expect(out.toLocation.name).toBe('Bãi thải Nam');
        expect(out.material.acceptedProduct).toBe('land');
        expect(out.quantity).toBe(7); // trường không phải tham chiếu giữ nguyên
        expect(out.frozen).toBeUndefined(); // không đẩy bản chụp ra ngoài
        expect(out.frozenAt).toEqual(frozen.at);
    });

    test('chuyến chưa chốt được trả về NGUYÊN BẢN (cùng tham chiếu)', () => {
        const rep = populatedReport();
        expect(applyFrozenReport(rep)).toBe(rep);
        const docLike = { frozen: undefined, toObject: () => ({}) };
        expect(applyFrozenReport(docLike)).toBe(docLike);
        expect(applyFrozenReport(null)).toBeNull();
    });

    test('đối tượng trả về vẫn có toObject() (các hàm xuất file gọi) và không kéo theo `frozen`', () => {
        const rep = populatedReport();
        const out = applyFrozenReport({ ...rep, frozen: freeze(rep) });
        expect(typeof out.toObject).toBe('function');
        const copy = { ...out.toObject(), workingDate: 'x' };
        expect(copy.device.code).toBe('XE-101');
        expect(copy.frozen).toBeUndefined();
        expect(Object.keys(out)).not.toContain('toObject'); // không lọt vào JSON / spread
    });

    test('nhận cả document Mongoose (toObject) lẫn mảng', () => {
        const rep = populatedReport();
        const frozen = freeze(rep);
        const doc = { frozen, toObject: () => ({ ...rep, frozen, device: { ...xe, code: 'ĐÃ-ĐỔI' } }) };
        expect(applyFrozenReport(doc).device.code).toBe('XE-101');
        expect(applyFrozenReportAll([rep, null]).length).toBe(2);
        expect(applyFrozenReportAll(undefined)).toBeUndefined();
    });

    test('chỉ phủ lên trường đã populate: id trần giữ nguyên', () => {
        const rep = populatedReport();
        const rawId = oid();
        const out = applyFrozenReport({ ...rep, frozen: freeze(rep), excavator: rawId });
        expect(out.excavator).toBe(rawId);
        expect(out.device.code).toBe('XE-101');
    });

    test('thiết bị đã bị xoá khỏi dữ liệu gốc (populate ra null) vẫn hiện đúng theo bản chụp', () => {
        const rep = populatedReport();
        const out = applyFrozenReport({ ...rep, frozen: freeze(rep), device: null });
        expect(out.device.code).toBe('XE-101');
    });

    test('không lộ thêm trường ngoài những gì truy vấn populate trả về', () => {
        const rep = populatedReport();
        const live = { ...rep, frozen: freeze(rep), device: { _id: xe._id, code: 'XE-ĐỔI' } }; // populate "code"
        const out = applyFrozenReport(live);
        expect(Object.keys(out.device).sort()).toEqual(['_id', 'code']);
        expect(out.device.code).toBe('XE-101');
    });
});

describe('chuyến bị sửa sau khi lệnh hoàn thành', () => {
    test('đổi sang vật liệu khác: tham chiếu mới đọc dữ liệu hiện tại, tham chiếu khác giữ bản chụp', () => {
        const rep = populatedReport();
        const frozen = freeze(rep);
        const edited = { ...rep, frozen, material: than, device: { ...xe, code: 'XE-101-MỚI' } };
        const out = applyFrozenReport(edited);
        expect(out.material.name).toBe('Than'); // vật liệu mới, không bị bản chụp cũ (Đất đá) đè lại
        expect(out.material.acceptedProduct).toBe('coal');
        expect(out.device.code).toBe('XE-101'); // xe không đổi nên vẫn theo bản chụp
    });

    test('staleReportKeys chỉ ra đúng trường cần chụp lại', () => {
        const rep = populatedReport();
        const data = buildReportFrozenData(rep);
        expect(staleReportKeys(rep, data)).toEqual([]);
        expect(staleReportKeys({ ...rep, material: than }, data)).toEqual(['material']);
        // chuyến mới thêm tham chiếu chưa từng chụp
        expect(staleReportKeys({ ...rep, fromLocation: diemDo }, data)).toEqual(['fromLocation']);
        // chưa có bản chụp nào: mọi tham chiếu đã populate đều cần chụp
        expect(staleReportKeys(rep, undefined).sort()).toEqual(['device', 'excavator', 'material', 'toLocation']);
        // id trần / null không có gì để chụp
        expect(staleReportKeys({ device: oid(), material: null }, data)).toEqual([]);
    });
});

describe('tính lại sản lượng theo thông tin đã chốt', () => {
    test('thiết bị populate "code material": material là id model xe lúc chốt, không phải model hiện tại', () => {
        const rep = populatedReport();
        const frozen = freeze(rep);
        // truy vấn của cron: device populate "code material" -> material là id trần; xe đã đổi model sau đó
        const live = { ...rep, frozen, device: { _id: xe._id, code: 'XE-101', material: modelB._id } };
        const out = applyFrozenReport(live);
        expect(String(out.device.material)).toBe(String(modelA._id));
        expect(out.device.material).not.toBe(modelB._id);
    });

    test('vật liệu: acceptedProduct lúc chốt', () => {
        const rep = populatedReport();
        const out = applyFrozenReport({ ...rep, frozen: freeze(rep), material: { ...dat, acceptedProduct: 'coal' } });
        expect(out.material.acceptedProduct).toBe('land');
    });
});

describe('shapeLike với id trần', () => {
    test('live là id trần, bản chụp là đối tượng: trả về id đã chụp', () => {
        const snap = { _id: modelA._id, name: 'HD785' };
        expect(shapeLike(snap, modelB._id)).toBe(modelA._id);
    });
    test('không có bản sống (undefined / null): giữ bản chụp đầy đủ như trước', () => {
        const snap = { _id: modelA._id, name: 'HD785' };
        expect(shapeLike(snap, undefined)).toEqual(snap);
        expect(shapeLike(snap, null)).toEqual(snap);
    });
});

describe('khôi phục chuyến cũ từ bản chụp của lệnh', () => {
    const order = () => ({
        device: [xe],
        excavator: [{ _id: oid(), device: mayXuc, status: true }],
        location: [diemDo],
        material: [dat],
        repairVehicles: [],
        assignedVehicles: [],
    });

    test('tham chiếu có trong lệnh lấy từ bản chụp của lệnh (đúng lúc hoàn thành), không lấy dữ liệu hiện tại', () => {
        const orderData = buildFrozenData(order());
        const rep = {
            ...populatedReport(),
            device: { ...xe, code: 'XE-101-MỚI' }, // dữ liệu hiện tại đã đổi
            toLocation: { ...diemDo, name: 'Bãi thải Bắc' },
        };
        const { data, source } = buildReportDataFromOrder(rep, orderData);
        expect(source).toBe('order');
        expect(data.device.code).toBe('XE-101');
        expect(data.excavator.code).toBe('MX-01');
        expect(data.toLocation.name).toBe('Bãi thải Nam');
        expect(data.material.name).toBe('Đất đá');
    });

    test('tham chiếu không có trong lệnh dùng dữ liệu hiện tại; không có gì từ lệnh thì source = backfill', () => {
        const orderData = buildFrozenData({ ...order(), device: [], excavator: [], location: [], material: [] });
        const rep = { ...populatedReport(), device: { ...xe, code: 'XE-101-MỚI' } };
        const { data, source } = buildReportDataFromOrder(rep, orderData);
        expect(source).toBe('backfill');
        expect(data.device.code).toBe('XE-101-MỚI');
    });

    test('mọi khoá chụp đều thuộc REPORT_REF_KEYS', () => {
        expect(Object.keys(buildReportFrozenData(populatedReport())).every((k) => REPORT_REF_KEYS.includes(k))).toBe(true);
    });
});

describe('báo cáo ca: thiết bị theo thời gian', () => {
    const shiftReport = () => ({
        _id: oid(),
        handoverNotes: 'ổn',
        vehicleSummaries: [{ _id: oid(), vehicle: xe, travelHours: 5 }],
        vehicleRepair: [{ _id: oid(), device: mayXuc, status: 'completed' }],
    });
    const orderWithShiftReport = () => ({
        _id: oid(),
        status: 'completed',
        assignedTo: null,
        shiftReport: shiftReport(),
    });

    test('buildShiftDevices gom thiết bị trong vehicleSummaries và vehicleRepair theo id', () => {
        const map = buildShiftDevices(shiftReport());
        expect(Object.keys(map).sort()).toEqual([String(xe._id), String(mayXuc._id)].sort());
        expect(map[String(xe._id)].code).toBe('XE-101');
        expect(buildShiftDevices(null)).toEqual({});
        expect(buildShiftDevices({ vehicleSummaries: [{ vehicle: oid() }] })).toEqual({}); // id trần
    });

    test('lệnh đã chốt: mã xe trong báo cáo ca theo bản chụp dù mã hiện tại đã đổi', () => {
        const order = orderWithShiftReport();
        const frozen = { at: new Date(), source: 'completion', data: buildFrozenData(order) };
        const live = {
            ...order,
            frozen,
            shiftReport: {
                ...order.shiftReport,
                vehicleSummaries: [{ ...order.shiftReport.vehicleSummaries[0], vehicle: { _id: xe._id, code: 'XE-101-MỚI' } }],
                vehicleRepair: [{ ...order.shiftReport.vehicleRepair[0], device: { _id: mayXuc._id, code: 'MX-ĐỔI' } }],
            },
        };
        const out = applyFrozen(live);
        expect(out.shiftReport.vehicleSummaries[0].vehicle.code).toBe('XE-101');
        expect(out.shiftReport.vehicleRepair[0].device.code).toBe('MX-01');
        expect(out.shiftReport.vehicleSummaries[0].travelHours).toBe(5); // phần nội dung báo cáo giữ nguyên
        expect(out.shiftReport.handoverNotes).toBe('ổn');
    });

    test('thiết bị chưa có bản chụp (báo cáo ca sửa sau) và id trần giữ nguyên', () => {
        const order = orderWithShiftReport();
        const frozen = { at: new Date(), source: 'completion', data: buildFrozenData(order) };
        const newVehicle = { _id: oid(), code: 'XE-MỚI-THÊM' };
        const rawId = oid();
        const out = applyFrozen({
            ...order,
            frozen,
            shiftReport: {
                ...order.shiftReport,
                vehicleSummaries: [{ vehicle: newVehicle }, { vehicle: rawId }],
                vehicleRepair: [],
            },
        });
        expect(out.shiftReport.vehicleSummaries[0].vehicle.code).toBe('XE-MỚI-THÊM');
        expect(out.shiftReport.vehicleSummaries[1].vehicle).toBe(rawId);
    });

    test('lệnh chưa chốt: báo cáo ca đọc dữ liệu hiện tại (trả nguyên bản)', () => {
        const order = { ...orderWithShiftReport(), status: 'in_progress' };
        expect(applyFrozen(order)).toBe(order);
    });
});
