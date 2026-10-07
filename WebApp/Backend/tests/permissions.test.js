const {
    normalizeRows, unknownModules, clampRows, effectivePermissions, hasModulePermission,
    toTkPermissions, canAccessThongKeCustom, permissionsForClient, stripPermissionFields,
} = require('../services/permissions');
const { MODULE_KEYS, MODULE_BY_KEY, TK_RESOURCES } = require('../config/modules');

const row = (module, c, r, u, d) => ({ module, c, r, u, d });
const dept = (allowedModules) => ({ _id: 'd1', name: 'PB', code: 'PB', allowedModules });
const pos = (permissions, department) => ({ _id: 'p1', name: 'CV', permissions, department });
const usr = (o = {}) => ({ _id: 'u1', username: 'u', role: 'manager', ...o });

describe('danh sách module', () => {
    test('khoá duy nhất, mỗi module tk-* có resource Thống kê hợp lệ', () => {
        expect(new Set(MODULE_KEYS).size).toBe(MODULE_KEYS.length);
        for (const k of MODULE_KEYS) {
            const m = MODULE_BY_KEY[k];
            expect(m.label).toBeTruthy();
            if (k.startsWith('tk-')) {
                expect(m.tk && m.tk.length).toBeGreaterThan(0);
                m.tk.forEach((r) => expect(TK_RESOURCES).toContain(r));
            } else {
                expect(m.tk).toBeUndefined();
            }
        }
    });
});

describe('normalizeRows / clampRows / unknownModules', () => {
    test('bỏ module lạ, gộp trùng, C/U/D kéo theo R, bỏ dòng không quyền nào', () => {
        const r = normalizeRows([row('orders', true, false, false, false), row('orders', false, false, true, false), row('khong-co', true, true, true, true), row('jobs', false, false, false, false)]);
        expect(r).toEqual([{ module: 'orders', c: true, r: true, u: true, d: false }]);
    });
    test('clampRows giữ trong phạm vi phòng ban; allowed=null thì không giới hạn', () => {
        const rows = [row('orders', false, true, false, false), row('jobs', false, true, false, false)];
        expect(clampRows(rows, ['jobs']).map((x) => x.module)).toEqual(['jobs']);
        expect(clampRows(rows, []).map((x) => x.module)).toEqual([]);
        expect(clampRows(rows, null).length).toBe(2);
        expect(clampRows(rows, undefined).length).toBe(2);
    });
    test('unknownModules nhận ra khoá lạ', () => {
        expect(unknownModules(['orders', 'abc'])).toEqual(['abc']);
        expect(unknownModules(undefined)).toEqual([]);
    });
});

describe('effectivePermissions', () => {
    test('admin luôn toàn quyền (mode full)', () => {
        const e = effectivePermissions(usr({ role: 'admin', position: pos([], dept([])) }));
        expect(e.mode).toBe('full');
        expect(hasModulePermission(e, 'system', 'd')).toBe(true);
    });
    test('chưa cấu hình gì -> legacy (chạy theo vai trò cũ)', () => {
        expect(effectivePermissions(usr()).mode).toBe('legacy');
        expect(effectivePermissions(usr({ position: pos(undefined, dept(['orders'])) })).mode).toBe('legacy');
        expect(effectivePermissions(usr({ position: pos(null) })).mode).toBe('legacy');
        expect(effectivePermissions(null).mode).toBe('legacy');
    });
    test('ăn theo quyền chức vụ', () => {
        const e = effectivePermissions(usr({ position: pos([row('orders', true, true, false, false)]) }));
        expect(e.mode).toBe('custom');
        expect(e.source).toBe('position');
        expect(e.modules.orders).toEqual({ c: true, r: true, u: false, d: false });
        expect(hasModulePermission(e, 'orders', 'c')).toBe(true);
        expect(hasModulePermission(e, 'orders', 'd')).toBe(false);
        expect(hasModulePermission(e, 'jobs', 'r')).toBe(false);
    });
    test('chức vụ đã cấu hình nhưng rỗng = không có quyền gì (khác với chưa cấu hình)', () => {
        const e = effectivePermissions(usr({ position: pos([]) }));
        expect(e.mode).toBe('custom');
        expect(e.modules).toEqual({});
    });
    test('bật quyền riêng thì dùng quyền riêng, tắt thì ăn theo chức vụ', () => {
        const p = pos([row('orders', false, true, false, false)]);
        const mine = [row('jobs', true, true, true, true)];
        const on = effectivePermissions(usr({ position: p, customPermissions: true, permissions: mine }));
        expect(on.source).toBe('user');
        expect(Object.keys(on.modules)).toEqual(['jobs']);
        const off = effectivePermissions(usr({ position: p, customPermissions: false, permissions: mine }));
        expect(off.source).toBe('position');
        expect(Object.keys(off.modules)).toEqual(['orders']);
    });
    test('phòng ban của chức vụ giới hạn phạm vi; quyền riêng cũng bị giới hạn', () => {
        const d = dept(['orders']);
        const p = pos([row('orders', false, true, false, false), row('jobs', true, true, true, true)], d);
        expect(Object.keys(effectivePermissions(usr({ position: p })).modules)).toEqual(['orders']);
        const own = effectivePermissions(usr({ position: p, customPermissions: true, permissions: [row('jobs', true, true, true, true), row('orders', true, true, true, true)] }));
        expect(Object.keys(own.modules)).toEqual(['orders']);
    });
    test('chức vụ chưa có phòng ban thì dùng phòng ban của cán bộ; id trần (chưa populate) không làm giới hạn', () => {
        const p = pos([row('jobs', false, true, false, false)], 'chuoi-id-chua-populate');
        expect(Object.keys(effectivePermissions(usr({ position: p, department: dept(['orders']) })).modules)).toEqual([]);
        expect(Object.keys(effectivePermissions(usr({ position: p })).modules)).toEqual(['jobs']);
    });
});

describe('toTkPermissions (quyền Thống kê suy từ module)', () => {
    const eff = (rows, allowed) => effectivePermissions(usr({ position: pos(rows, dept(allowed)) }));
    test('chỉ cấp ghi cho resource của module được cấp; đọc mọi resource khi có xem 1 màn Thống kê', () => {
        const p = toTkPermissions(eff([row('tk-entry-transport', true, true, true, false)]));
        expect(p['transport-reports']).toEqual({ c: true, r: true, u: true, d: false, a: false });
        expect(p['excavation-reports']).toEqual({ c: false, r: true, u: false, d: false, a: false });
        expect(p['devices'].c).toBe(false);
    });
    test('không có module Thống kê nào -> không có quyền gì, không vào được Thống kê', () => {
        const e = eff([row('orders', true, true, true, true)]);
        expect(canAccessThongKeCustom(e)).toBe(false);
        expect(Object.values(toTkPermissions(e)).every((x) => !x.c && !x.r && !x.u && !x.d && !x.a)).toBe(true);
    });
    test('quyền mở khoá kỳ báo cáo (a) = sửa ở "Báo cáo thống kê"', () => {
        expect(toTkPermissions(eff([row('tk-stat-report', false, true, true, false)]))['report-periods'].a).toBe(true);
        expect(toTkPermissions(eff([row('tk-stat-report', false, true, false, false)]))['report-periods'].a).toBe(false);
    });
    test('hai module chung 1 resource gộp theo OR; admin toàn quyền', () => {
        const p = toTkPermissions(eff([row('tk-matrix-996', false, true, false, false), row('tk-fuel-norm', true, true, true, false)]));
        expect(p['matrix-catalogs']).toEqual({ c: true, r: true, u: true, d: false, a: false });
        const a = toTkPermissions(effectivePermissions(usr({ role: 'admin' })));
        expect(Object.values(a).every((x) => x.c && x.r && x.u && x.d && x.a)).toBe(true);
    });
    test('phòng ban không cho xem module Thống kê thì cũng không có quyền Thống kê đó', () => {
        const e = eff([row('tk-entry-mining', true, true, true, true)], ['orders']);
        expect(canAccessThongKeCustom(e)).toBe(false);
    });
});

describe('permissionsForClient / stripPermissionFields', () => {
    test('trả chế độ + quyền cho giao diện', () => {
        const c = permissionsForClient(usr({ position: pos([row('orders', false, true, false, false)]) }));
        expect(c).toMatchObject({ permissionMode: 'custom', permissionSource: 'position' });
        expect(c.permissions.orders.r).toBe(true);
        expect(permissionsForClient(usr()).permissionMode).toBe('legacy');
    });
    test('bỏ trường phân quyền khỏi body, giữ trường khác', () => {
        const body = { name: 'x', allowedModules: ['orders'], permissions: [], customPermissions: true };
        expect(stripPermissionFields(body)).toEqual({ name: 'x' });
    });
});
