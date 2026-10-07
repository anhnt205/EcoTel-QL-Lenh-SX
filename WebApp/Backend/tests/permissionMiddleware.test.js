// Kiểm tra middleware phân quyền với dữ liệu giả (không cần MongoDB).
jest.mock('../models/User', () => ({ findById: jest.fn() }));
jest.mock('../models/Position', () => ({ findById: jest.fn() }));
jest.mock('../models/Department', () => ({ findById: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ verify: jest.fn(() => ({ userId: 'u1' })) }));

const User = require('../models/User');
const Position = require('../models/Position');
const Department = require('../models/Department');
const { enforceWrites, enforceRead, permissionFieldsGuard } = require('../middleware/permission');

// User.findById(...).populate(...).populate(...) -> resolve actor
const actorIs = (actor) => {
    const chain = { populate: jest.fn(() => chain), then: (res, rej) => Promise.resolve(actor).then(res, rej) };
    User.findById.mockReturnValue(chain);
};
const selectable = (doc) => ({ select: jest.fn(() => Promise.resolve(doc)) });

const mkReq = (method, path, body, withToken = true) => ({
    method, path, body, headers: withToken ? { authorization: 'Bearer abc' } : {}, logger: { warn: jest.fn() },
});
const mkRes = () => {
    const res = { statusCode: 200, body: undefined };
    res.status = (c) => { res.statusCode = c; return res; };
    res.send = (b) => { res.body = b; return res; };
    return res;
};
const run = async (mw, req) => {
    const res = mkRes();
    let nexted = false;
    let err;
    await mw(req, res, (e) => { nexted = true; err = e; });
    return { res, nexted, err };
};

const row = (module, c, r, u, d) => ({ module, c, r, u, d });
const actorWith = (role, permissions, extra = {}) => ({
    _id: 'u1', username: 'u', role, active: true, position: { _id: 'p1', name: 'CV', permissions }, ...extra,
});

beforeEach(() => { jest.clearAllMocks(); });

describe('enforceWrites', () => {
    const mw = enforceWrites('jobs', 'Công việc');

    test('GET không bị chặn (đọc danh sách dùng cho ô chọn của web/Mobile)', async () => {
        actorIs(actorWith('manager', [row('orders', false, true, false, false)]));
        expect((await run(mw, mkReq('GET', '/', {}))).nexted).toBe(true);
    });
    test('người chưa cấu hình quyền (legacy) đi qua như cũ', async () => {
        actorIs({ _id: 'u1', username: 'u', role: 'employee', active: true });
        expect((await run(mw, mkReq('POST', '/', {}))).nexted).toBe(true);
    });
    test('admin luôn qua', async () => {
        actorIs(actorWith('admin', []));
        expect((await run(mw, mkReq('DELETE', '/', {}))).nexted).toBe(true);
    });
    test('đã cấu hình mà thiếu quyền Thêm -> 403 có nêu mục', async () => {
        actorIs(actorWith('manager', [row('jobs', false, true, true, false)]));
        const r = await run(mw, mkReq('POST', '/', {}));
        expect(r.nexted).toBe(false);
        expect(r.res.statusCode).toBe(403);
        expect(r.res.body.message).toContain('Công việc');
    });
    test('đúng quyền thì qua: PUT cần U, DELETE cần D', async () => {
        actorIs(actorWith('manager', [row('jobs', false, true, true, false)]));
        expect((await run(mw, mkReq('PUT', '/abc', {}))).nexted).toBe(true);
        expect((await run(mw, mkReq('DELETE', '/', {}))).res.statusCode).toBe(403);
    });
    test('skip: đường dẫn bỏ qua không bị kiểm', async () => {
        actorIs(actorWith('manager', []));
        const m = enforceWrites('jobs', 'Công việc', { skip: (req) => req.path === '/exportFile' });
        expect((await run(m, mkReq('POST', '/exportFile', {}))).nexted).toBe(true);
        expect((await run(m, mkReq('POST', '/', {}))).res.statusCode).toBe(403);
    });
    test('không có token / token sai -> cho qua để verifyToken của route trả 401', async () => {
        const r = await run(mw, mkReq('POST', '/', {}, false));
        expect(r.nexted).toBe(true);
        expect(User.findById).not.toHaveBeenCalled();
    });
    test('quyền chức vụ ngoài phạm vi phòng ban không có hiệu lực', async () => {
        const a = actorWith('manager', [row('jobs', true, true, true, true)]);
        a.position.department = { _id: 'd1', name: 'PB', allowedModules: ['orders'] };
        actorIs(a);
        expect((await run(mw, mkReq('POST', '/', {}))).res.statusCode).toBe(403);
    });
});

describe('enforceRead', () => {
    test('đã cấu hình thiếu quyền Xem báo cáo -> 403; có quyền -> qua; legacy -> qua', async () => {
        const mw = enforceRead('reports', 'Báo cáo');
        actorIs(actorWith('manager', [row('orders', false, true, false, false)]));
        expect((await run(mw, mkReq('POST', '/x', {}))).res.statusCode).toBe(403);
        actorIs(actorWith('manager', [row('reports', false, true, false, false)]));
        expect((await run(mw, mkReq('GET', '/x', {}))).nexted).toBe(true);
        actorIs({ _id: 'u1', role: 'dispatcher', active: true });
        expect((await run(mw, mkReq('GET', '/x', {}))).nexted).toBe(true);
    });
});

describe('permissionFieldsGuard', () => {
    test('không phải admin: bỏ hết trường phân quyền, không báo lỗi', async () => {
        actorIs(actorWith('manager', []));
        const req = mkReq('PUT', '/update/aaaaaaaaaaaaaaaaaaaaaaaa', { fullName: 'x', permissions: [row('jobs', true, true, true, true)], customPermissions: true, allowedModules: ['jobs'] });
        const r = await run(permissionFieldsGuard('user'), req);
        expect(r.nexted).toBe(true);
        expect(req.body).toEqual({ fullName: 'x' });
    });
    test('body không có trường phân quyền -> không làm gì, không tra CSDL', async () => {
        const req = mkReq('PUT', '/abc', { name: 'x' });
        const r = await run(permissionFieldsGuard('department'), req);
        expect(r.nexted).toBe(true);
        expect(User.findById).not.toHaveBeenCalled();
    });
    test('admin: module lạ -> 400', async () => {
        actorIs({ _id: 'a', username: 'a', role: 'admin', active: true });
        const r = await run(permissionFieldsGuard('department'), mkReq('POST', '/', { allowedModules: ['orders', 'khong-co'] }));
        expect(r.nexted).toBe(false);
        expect(r.res.statusCode).toBe(400);
        expect(r.res.body.message).toContain('khong-co');
    });
    test('admin: quyền chức vụ bị giới hạn theo phòng ban được chọn, chuẩn hoá C/U/D => R', async () => {
        actorIs({ _id: 'a', username: 'a', role: 'admin', active: true });
        Department.findById.mockReturnValue(selectable({ allowedModules: ['jobs'] }));
        const deptId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
        const req = mkReq('POST', '/', { name: 'CV', department: deptId, permissions: [row('jobs', true, false, false, false), row('orders', true, true, true, true)] });
        const r = await run(permissionFieldsGuard('position'), req);
        expect(r.nexted).toBe(true);
        expect(req.body.permissions).toEqual([{ module: 'jobs', c: true, r: true, u: false, d: false }]);
    });
    test('admin: sửa chức vụ không gửi department thì lấy phòng ban hiện có của chức vụ để giới hạn', async () => {
        actorIs({ _id: 'a', username: 'a', role: 'admin', active: true });
        Position.findById.mockReturnValue(selectable({ department: 'cccccccccccccccccccccccc' }));
        Department.findById.mockReturnValue(selectable({ allowedModules: ['orders'] }));
        const req = mkReq('PUT', '/aaaaaaaaaaaaaaaaaaaaaaaa', { permissions: [row('jobs', false, true, false, false), row('orders', false, true, false, false)] });
        await run(permissionFieldsGuard('position'), req);
        expect(req.body.permissions.map((p) => p.module)).toEqual(['orders']);
    });
    test('admin: permissions=null nghĩa là xoá cấu hình (giữ nguyên null)', async () => {
        actorIs({ _id: 'a', username: 'a', role: 'admin', active: true });
        const req = mkReq('PUT', '/aaaaaaaaaaaaaaaaaaaaaaaa', { permissions: null, allowedModules: null });
        const r = await run(permissionFieldsGuard('position'), req);
        expect(r.nexted).toBe(true);
        expect(req.body.permissions).toBeNull();
        expect(req.body.allowedModules).toBeNull();
    });
});
