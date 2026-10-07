const { lockCatalogWrites, lockDeviceCatalogWrites, LOCKED_MESSAGE } = require('../middleware/catalogLock');

const run = (mw, method, path, body) => {
    const req = { method, path, body };
    const res = { statusCode: 200, sent: undefined, status(c) { this.statusCode = c; return this; }, send(b) { this.sent = b; return this; } };
    let nexted = false;
    mw(req, res, () => { nexted = true; });
    return { req, res, nexted };
};

describe('catalogLock', () => {
    const OLD = process.env.CATALOG_MASTER;
    afterEach(() => { process.env.CATALOG_MASTER = OLD; if (OLD === undefined) delete process.env.CATALOG_MASTER; });

    test('cờ tắt -> không chặn gì (hành vi cũ)', () => {
        delete process.env.CATALOG_MASTER;
        expect(run(lockCatalogWrites, 'POST', '/').nexted).toBe(true);
        expect(run(lockDeviceCatalogWrites, 'POST', '/').nexted).toBe(true);
    });

    describe('cờ bật (thongke)', () => {
        beforeEach(() => { process.env.CATALOG_MASTER = 'thongke'; });

        test.each(['POST', 'PUT', 'DELETE', 'PATCH'])('chặn %s trên danh mục', (m) => {
            const { res, nexted } = run(lockCatalogWrites, m, '/123');
            expect(nexted).toBe(false);
            expect(res.statusCode).toBe(403);
            expect(res.sent.message).toBe(LOCKED_MESSAGE);
        });

        test('GET vẫn mở để lệnh/dropdown chạy bình thường', () => {
            expect(run(lockCatalogWrites, 'GET', '/').nexted).toBe(true);
        });

        test('xuất file (POST chỉ đọc) không bị chặn', () => {
            expect(run(lockCatalogWrites, 'POST', '/exportFile').nexted).toBe(true);
        });

        test('nhập file bị chặn', () => {
            expect(run(lockCatalogWrites, 'POST', '/importFile').nexted).toBe(false);
        });

        test('thiết bị: tạo/xoá/nhập file/sync Tài sản bị chặn', () => {
            expect(run(lockDeviceCatalogWrites, 'POST', '/').res.statusCode).toBe(403);
            expect(run(lockDeviceCatalogWrites, 'DELETE', '/').res.statusCode).toBe(403);
            expect(run(lockDeviceCatalogWrites, 'POST', '/importFile').res.statusCode).toBe(403);
            expect(run(lockDeviceCatalogWrites, 'POST', '/sync-from-taisan').res.statusCode).toBe(403);
        });

        test('thiết bị: phần vận hành vẫn chạy (update_status, file đính kèm, xuất file)', () => {
            expect(run(lockDeviceCatalogWrites, 'POST', '/update_status').nexted).toBe(true);
            expect(run(lockDeviceCatalogWrites, 'POST', '/abc123/files').nexted).toBe(true);
            expect(run(lockDeviceCatalogWrites, 'DELETE', '/abc123/files/f1').nexted).toBe(true);
            expect(run(lockDeviceCatalogWrites, 'POST', '/exportFile').nexted).toBe(true);
        });

        test('thiết bị: PUT /:id chỉ giữ field vận hành, bỏ field danh mục gốc', () => {
            const coords = { lng: 105, lat: 21 };
            const { req, nexted } = run(lockDeviceCatalogWrites, 'PUT', '/abc123', {
                name: 'Đổi tên', code: 'X', category: 'c1', department: 'd1', power: 9,
                coordinates: coords, note: 'ghi chú', status: 'in_use',
            });
            expect(nexted).toBe(true);
            expect(req.body).toEqual({ coordinates: coords, note: 'ghi chú', status: 'in_use' });
        });
    });
});

describe('catalogLock: vật liệu và điểm đổ tải (khoá một phần)', () => {
    const { lockMaterialCatalogWrites, lockLocationCatalogWrites } = require('../middleware/catalogLock');
    const OLD = process.env.CATALOG_MASTER;
    beforeEach(() => { process.env.CATALOG_MASTER = 'thongke'; });
    afterEach(() => { process.env.CATALOG_MASTER = OLD; if (OLD === undefined) delete process.env.CATALOG_MASTER; });

    test('vật liệu: tạo/xoá/nhập file bị chặn, xuất file và tỷ trọng theo khung giờ vẫn chạy', () => {
        expect(run(lockMaterialCatalogWrites, 'POST', '/').res.statusCode).toBe(403);
        expect(run(lockMaterialCatalogWrites, 'DELETE', '/').res.statusCode).toBe(403);
        expect(run(lockMaterialCatalogWrites, 'POST', '/importFile').res.statusCode).toBe(403);
        expect(run(lockMaterialCatalogWrites, 'POST', '/exportFile').nexted).toBe(true);
        expect(run(lockMaterialCatalogWrites, 'POST', '/save-timeslot').nexted).toBe(true);
        expect(run(lockMaterialCatalogWrites, 'DELETE', '/timeslots').nexted).toBe(true);
    });

    test('vật liệu: PUT chỉ giữ valueHistory (tỷ trọng), bỏ tên và sản phẩm nghiệm thu', () => {
        const vh = [{ density: 1.5 }];
        const { req, nexted } = run(lockMaterialCatalogWrites, 'PUT', '/abc', { name: 'Đổi', acceptedProduct: 'Than', valueHistory: vh });
        expect(nexted).toBe(true);
        expect(req.body).toEqual({ valueHistory: vh });
    });

    test('điểm đổ tải: tạo/xoá bị chặn; PUT chỉ giữ distance + coordinates', () => {
        expect(run(lockLocationCatalogWrites, 'POST', '/').res.statusCode).toBe(403);
        expect(run(lockLocationCatalogWrites, 'DELETE', '/').res.statusCode).toBe(403);
        const coords = { lng: 1, lat: 2 };
        const { req, nexted } = run(lockLocationCatalogWrites, 'PUT', '/abc', { name: 'Đổi', distance: 3.5, coordinates: coords });
        expect(nexted).toBe(true);
        expect(req.body).toEqual({ distance: 3.5, coordinates: coords });
    });

    test('cờ tắt: không đổi gì', () => {
        delete process.env.CATALOG_MASTER;
        const { req, nexted } = run(lockMaterialCatalogWrites, 'PUT', '/abc', { name: 'Đổi' });
        expect(nexted).toBe(true);
        expect(req.body).toEqual({ name: 'Đổi' });
    });
});
