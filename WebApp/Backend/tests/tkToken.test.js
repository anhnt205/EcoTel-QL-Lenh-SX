const jwt = require('jsonwebtoken');
const { permissionsFor, canAccessThongKe, buildTkClaims, signTkToken, TK_RESOURCES, ENTRY_RESOURCES } = require('../services/tkToken');

const user = (role, extra = {}) => ({ _id: '6ac4dcefcb0d742426bbccbd', username: 'u1', fullName: 'Nguyễn A', role, department: { externalTkId: '104' }, ...extra });

describe('tkToken: quyền Thống kê theo vai trò Điều phối', () => {
    test('chỉ admin/manager/dispatcher được vào Thống kê', () => {
        expect(['admin', 'manager', 'dispatcher'].every(canAccessThongKe)).toBe(true);
        expect(canAccessThongKe('employee')).toBe(false);
        expect(canAccessThongKe(undefined)).toBe(false);
    });

    test('admin toàn quyền trên mọi resource, kể cả mở khoá (a)', () => {
        const p = permissionsFor('admin');
        expect(Object.keys(p).sort()).toEqual([...TK_RESOURCES].sort());
        for (const r of TK_RESOURCES) expect(p[r]).toEqual({ c: true, r: true, u: true, d: true, a: true });
    });

    test('manager: xem tất cả, nhập liệu đủ c/u/d, danh mục gốc chỉ đọc, không có quyền a', () => {
        const p = permissionsFor('manager');
        for (const r of ENTRY_RESOURCES) expect(p[r]).toEqual({ c: true, r: true, u: true, d: true, a: false });
        expect(p['departments']).toEqual({ c: false, r: true, u: false, d: false, a: false });
        expect(Object.values(p).every((x) => x.r)).toBe(true);
        expect(Object.values(p).some((x) => x.a)).toBe(false);
    });

    test('dispatcher: nhập liệu thêm/sửa nhưng không xoá; danh mục gốc chỉ đọc', () => {
        const p = permissionsFor('dispatcher');
        for (const r of ENTRY_RESOURCES) expect(p[r]).toEqual({ c: true, r: true, u: true, d: false, a: false });
        expect(p['devices']).toEqual({ c: false, r: true, u: false, d: false, a: false });
    });

    test('vai trò lạ: không có quyền gì (fail-closed)', () => {
        const p = permissionsFor('employee');
        expect(Object.values(p).every((x) => !x.c && !x.r && !x.u && !x.d && !x.a)).toBe(true);
    });
});

describe('tkToken: claim và chữ ký', () => {
    test('claim đúng bộ Thống kê đọc: sub số, typ=access, hạn 8 giờ', () => {
        const c = buildTkClaims(user('admin'), 1000);
        expect(c.typ).toBe('access');
        expect(c.sub).toMatch(/^\d+$/);
        expect(Number.isSafeInteger(Number(c.sub))).toBe(true);
        expect(c.exp - c.iat).toBe(8 * 3600);
        expect(c.companyId).toBeNull();
        expect(c.app).toBe('tkcs');
    });

    test('sub ổn định theo người dùng và khác nhau giữa 2 người', () => {
        const a = buildTkClaims(user('admin'), 1).sub;
        expect(buildTkClaims(user('admin'), 99).sub).toBe(a);
        expect(buildTkClaims(user('admin', { _id: '6ac4dcefcb0d742426bbccbe' }), 1).sub).not.toBe(a);
    });

    test('phạm vi dữ liệu: admin + điều độ xem toàn bộ, quản lý theo đơn vị đã gắn với Thống kê', () => {
        expect(buildTkClaims(user('admin')).fullDataScope).toBe(true);
        expect(buildTkClaims(user('dispatcher')).fullDataScope).toBe(true);
        const m = buildTkClaims(user('manager'));
        expect(m.fullDataScope).toBe(false);
        expect(m.departmentId).toBe(104);
    });

    test('quản lý chưa gắn đơn vị với Thống kê -> departmentId null (fail-closed)', () => {
        expect(buildTkClaims(user('manager', { department: {} })).departmentId).toBeNull();
        expect(buildTkClaims(user('manager', { department: undefined })).departmentId).toBeNull();
    });

    test('token ký HS256 bằng khoá chung, xác minh lại được; sai khoá thì hỏng', () => {
        const { token, expiresIn } = signTkToken(user('manager'), 'secret-for-test-only');
        const decoded = jwt.verify(token, 'secret-for-test-only', { algorithms: ['HS256'] });
        expect(decoded.username).toBe('u1');
        expect(decoded.permissions['excavation-reports'].d).toBe(true);
        expect(expiresIn).toBe(8 * 3600);
        expect(() => jwt.verify(token, 'khac', { algorithms: ['HS256'] })).toThrow();
        expect(jwt.decode(token, { complete: true }).header).toEqual({ alg: 'HS256', typ: 'JWT' });
    });

    test('thiếu khoá -> báo lỗi rõ ràng, không ký bằng khoá rỗng', () => {
        expect(() => signTkToken(user('admin'), undefined)).toThrow(/TK_AUTH_JWT_SECRET/);
    });
});
