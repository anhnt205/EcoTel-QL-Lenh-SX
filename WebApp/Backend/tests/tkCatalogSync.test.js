const { matchRecords, diffFields, normalizeTk, buildPlan } = require('../services/tkCatalogSync');

const doc = (o) => ({ _id: o._id, ...o });

describe('matchRecords', () => {
    test('ghép theo externalTkId trước, giữ nguyên _id cũ', () => {
        const docs = [doc({ _id: 'a1', externalTkId: '10', code: 'X' })];
        const { matches, onlyInDpmm } = matchRecords([{ tkId: '10', code: 'Y' }], docs, ['code']);
        expect(matches[0].doc._id).toBe('a1');
        expect(matches[0].by).toBe('externalTkId');
        expect(onlyInDpmm).toHaveLength(0);
    });

    test('ghép bản ghi cũ chưa gắn id qua khoá tự nhiên (không phân biệt hoa thường, bỏ khoảng trắng)', () => {
        const docs = [doc({ _id: 'a1', code: ' dv-01 ' })];
        const { matches } = matchRecords([{ tkId: '5', code: 'DV-01' }], docs, ['code']);
        expect(matches[0].doc._id).toBe('a1');
        expect(matches[0].by).toBe('code');
    });

    test('thử khoá tự nhiên theo thứ tự ưu tiên (code rồi name)', () => {
        const docs = [doc({ _id: 'a1', code: 'ZZ', name: 'Đơn vị A' })];
        const { matches } = matchRecords([{ tkId: '5', code: 'A', name: 'đơn vị a' }], docs, ['code', 'name']);
        expect(matches[0].doc._id).toBe('a1');
        expect(matches[0].by).toBe('name');
    });

    test('không ghép 2 bản ghi Thống kê vào cùng 1 bản ghi Điều phối', () => {
        const docs = [doc({ _id: 'a1', name: 'Lái xe' })];
        const { matches } = matchRecords(
            [{ tkId: '1', name: 'Lái xe' }, { tkId: '2', name: 'Lái xe' }],
            docs,
            ['name'],
        );
        expect(matches.filter((m) => m.doc)).toHaveLength(1);
        expect(matches.filter((m) => !m.doc)).toHaveLength(1);
    });

    test('bản ghi đã gắn externalTkId khác không bị cướp qua khoá tự nhiên', () => {
        const docs = [doc({ _id: 'a1', externalTkId: '99', name: 'Ca 1' })];
        const { matches } = matchRecords([{ tkId: '7', name: 'Ca 1' }], docs, ['name']);
        expect(matches[0].doc).toBeNull();
    });

    test('bản ghi chỉ có ở Điều phối được báo lại, không bị xoá', () => {
        const docs = [doc({ _id: 'a1', code: 'ONLY' })];
        const { onlyInDpmm } = matchRecords([], docs, ['code']);
        expect(onlyInDpmm.map((d) => d._id)).toEqual(['a1']);
    });
});

describe('diffFields', () => {
    test('chỉ trả field khác; bỏ qua undefined (không xoá giá trị Điều phối)', () => {
        const changed = diffFields({ name: 'A', note: 'giữ', power: 100 }, { name: 'B', note: undefined, power: 100 });
        expect(changed).toEqual({ name: 'B' });
    });
});

const tkData = () => ({
    departments: [{ id: 1, code: 'DV1', name: 'Đơn vị 1', description: 'mô tả' }],
    positions: [
        { id: 1, name: 'Lái xe', description: 'x', departmentId: 1 },
        { id: 2, name: 'Lái xe', description: 'x', departmentId: 2 },
    ],
    shifts: [{ id: 1, name: 1, startTime: '06:00', endTime: '14:00' }],
    devices: [
        {
            id: 100, code: 'XE-1', name: 'Xe 1', vehicleNumber: '29A', departmentId: 1,
            categoryId: 7, categoryName: 'Vận tải', categoryGroup: 'XE',
            materialId: 8, materialName: 'HD785', power: 500, status: 'BROKEN',
        },
    ],
});

describe('normalizeTk', () => {
    test('suy ra phân loại/chủng loại thiết bị từ danh sách thiết bị, đổi group XE -> Xe', () => {
        const tk = normalizeTk(tkData());
        expect(tk.deviceType).toEqual([{ tkId: '7', name: 'Vận tải', group: 'Xe' }]);
        expect(tk.deviceModel).toEqual([{ tkId: '8', name: 'HD785' }]);
    });

    test('chức vụ trùng tên giữa các đơn vị được gộp 1 và ghi nhận', () => {
        const tk = normalizeTk(tkData());
        expect(tk.position).toHaveLength(1);
        expect(tk.notes.duplicatePositionNames).toEqual(['Lái xe']);
    });

    test('không đưa status/toạ độ của Thống kê vào dòng đồng bộ thiết bị', () => {
        const row = normalizeTk(tkData()).device[0];
        expect(row).not.toHaveProperty('status');
        expect(row).not.toHaveProperty('coordinates');
    });
});

describe('buildPlan', () => {
    const emptyDpmm = () => ({ department: [], position: [], shift: [], deviceType: [], deviceModel: [], device: [] });

    test('DB Điều phối trống -> thiết bị/loại là tạo mới; phòng ban KHÔNG tạo (Điều phối quản lý hẳn)', () => {
        const { summary } = buildPlan(normalizeTk(tkData()), emptyDpmm());
        expect(summary.department).toMatchObject({ create: 0, update: 0, onlyInTk: 1 });
        expect(summary.position).toBeUndefined(); // chức vụ không đồng bộ nữa
        expect(summary.device.create).toBe(1);
        expect(summary.deviceType.create).toBe(1);
    });

    test('bản ghi cũ được ghép (giữ _id) và gắn externalTkId, không tạo trùng', () => {
        const dpmm = emptyDpmm();
        dpmm.department = [{ _id: 'd1', code: 'DV1', name: 'Đơn vị 1' }];
        const { plan } = buildPlan(normalizeTk(tkData()), dpmm);
        expect(plan.department.create).toHaveLength(0);
        expect(plan.department.update[0].id).toBe('d1');
        expect(plan.department.update[0].set.externalTkId).toBe('1');
    });

    test('idempotent: đã đồng bộ rồi thì 0 thay đổi', () => {
        const dpmm = emptyDpmm();
        dpmm.department = [{ _id: 'd1', externalTkId: '1', code: 'DV1', name: 'Đơn vị 1', description: 'mô tả' }];
        dpmm.position = [{ _id: 'p1', externalTkId: '1', name: 'Lái xe', note: 'x' }];
        dpmm.shift = [{ _id: 's1', externalTkId: '1', name: 1, startTime: '06:00', endTime: '14:00' }];
        dpmm.deviceType = [{ _id: 't1', externalTkId: '7', name: 'Vận tải', group: 'Xe' }];
        dpmm.deviceModel = [{ _id: 'm1', externalTkId: '8', name: 'HD785' }];
        dpmm.device = [{
            _id: 'v1', externalTkId: '100', code: 'XE-1', name: 'Xe 1', vehicleNumber: '29A', power: 500,
            department: 'd1', category: 't1', material: 'm1',
        }];
        const { summary } = buildPlan(normalizeTk(tkData()), dpmm);
        for (const e of ['department', 'shift', 'deviceType', 'deviceModel', 'device']) {
            expect(summary[e]).toMatchObject({ create: 0, update: 0, unchanged: 1, conflicts: 0 });
        }
    });

    test('thiết bị cũ đổi tên bên Thống kê chỉ cập nhật field gốc, không đụng status/toạ độ', () => {
        const dpmm = emptyDpmm();
        dpmm.device = [{ _id: 'v1', externalTkId: '100', code: 'XE-1', name: 'Tên cũ', status: 'in_use', coordinates: { type: 'Point', coordinates: [1, 2] } }];
        const { plan } = buildPlan(normalizeTk(tkData()), dpmm);
        const set = plan.device.update[0].set;
        expect(set.name).toBe('Xe 1');
        expect(set).not.toHaveProperty('status');
        expect(set).not.toHaveProperty('coordinates');
    });

    test('phòng ban chỉ GẮN externalTkId: không đổi tên/mã/mô tả, không tạo mới, không xung đột', () => {
        const dpmm = emptyDpmm();
        dpmm.department = [
            { _id: 'd1', code: 'DV1', name: 'Tên do Điều phối đặt', description: 'mô tả riêng' },
            { _id: 'd2', code: 'DV2', name: 'Đơn vị 1' },
        ];
        const { plan } = buildPlan(normalizeTk(tkData()), dpmm);
        expect(plan.department.create).toHaveLength(0);
        expect(plan.department.conflicts).toHaveLength(0);
        expect(plan.department.update).toHaveLength(1);
        expect(plan.department.update[0]).toMatchObject({ id: 'd1', by: 'code', set: { externalTkId: '1' } });
        expect(Object.keys(plan.department.update[0].set)).toEqual(['externalTkId']);
    });

    test('tham chiếu thiết bị chưa giải được không bị ghi null (chờ giải khi ghi thật)', () => {
        const dpmm = emptyDpmm();
        dpmm.device = [{ _id: 'v1', externalTkId: '100', code: 'XE-1', name: 'Xe 1', vehicleNumber: '29A', power: 500 }];
        const { plan } = buildPlan(normalizeTk(tkData()), dpmm);
        const item = plan.device.update[0];
        expect(item.refPending).toBe(true);
        expect(Object.values(item.set)).not.toContain(null);
    });
});

describe('vật liệu <- chủng loại hàng, điểm đổ tải <- nơi dỡ/nhận tải', () => {
    const base = () => ({ departments: [], positions: [], shifts: [], devices: [] });
    const emptyDpmm = () => ({ department: [], position: [], shift: [], material: [], location: [], deviceType: [], deviceModel: [], device: [] });

    test('acceptedProduct chỉ lấy khi tên khớp enum Điều phối (Đất/Than), không khớp thì bỏ', () => {
        const tk = normalizeTk({
            ...base(),
            cargoTypes: [
                { id: 1, name: 'Than cục', acceptanceProductName: 'than' },
                { id: 2, name: 'Đất đá', acceptanceProductName: 'Đất' },
                { id: 3, name: 'Quặng', acceptanceProductName: 'Sản phẩm lạ' },
            ],
        });
        expect(tk.material.map((m) => m.acceptedProduct)).toEqual(['Than', 'Đất', undefined]);
    });

    test('nơi dỡ + nơi nhận tải gộp theo tên, id mang tiền tố nguồn', () => {
        const tk = normalizeTk({
            ...base(),
            unloadingPoints: [{ id: 5, name: 'Bãi A' }, { id: 6, name: 'Bãi B' }],
            receivingPoints: [{ id: 5, name: 'Bãi B' }, { id: 7, name: 'Điểm C' }],
        });
        expect(tk.location.map((l) => l.tkId)).toEqual(['unloading:5', 'unloading:6', 'receiving:7']);
        expect(tk.notes.duplicateLocationNames).toEqual(['Bãi B']);
    });

    test('ghép vật liệu/điểm đổ cũ theo tên, giữ _id và không đụng tỷ trọng/khoảng cách/toạ độ', () => {
        const tk = normalizeTk({
            ...base(),
            cargoTypes: [{ id: 1, name: 'Than cục', acceptanceProductName: 'Than' }],
            unloadingPoints: [{ id: 5, name: 'Bãi A' }],
        });
        const dpmm = emptyDpmm();
        dpmm.material = [{ _id: 'm1', name: 'than cục', valueHistory: [{ density: 1.4 }] }];
        dpmm.location = [{ _id: 'l1', name: 'Bãi A', distance: 2.5, coordinates: { coordinates: [1, 2] } }];
        const { plan } = buildPlan(tk, dpmm);
        expect(plan.material.update[0].id).toBe('m1');
        expect(plan.material.update[0].set).toEqual({ name: 'Than cục', acceptedProduct: 'Than', externalTkId: '1' }); // tên theo Thống kê (gốc), không có valueHistory
        expect(plan.location.update[0].id).toBe('l1');
        expect(plan.location.update[0].set).toEqual({ externalTkId: 'unloading:5' });
        expect(plan.material.create).toHaveLength(0);
    });

    test('thiếu cargoTypes/unloadingPoints trong dữ liệu (bản cũ) vẫn chạy được', () => {
        expect(() => buildPlan(normalizeTk(base()), emptyDpmm())).not.toThrow();
    });
});
