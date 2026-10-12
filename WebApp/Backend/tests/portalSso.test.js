const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const sso = require('../services/portalSso');

// Khoá RSA giả lập khoá ký của Portal
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const otherKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

const sign = (claims, key = privateKey, opts = {}) =>
    jwt.sign(claims, key, { algorithm: 'RS256', keyid: 'k1', issuer: 'portal-service', expiresIn: '5m', ...opts });
const appToken = (extra = {}) => sign({ type: 'app', app: 'dpmm', username: 'admin', fullName: 'Quản trị', permissions: {}, ...extra });
const keys = async (kid) => {
    if (kid !== 'k1') throw new Error('kid lạ');
    return pubPem;
};
const fakeRedis = (store) => ({
    getdel: async (k) => { const v = store[k]; delete store[k]; return v === undefined ? null : v; },
});

describe('portalSso: bật/tắt theo biến môi trường', () => {
    const OLD = { h: process.env.PORTAL_REDIS_HOST, j: process.env.PORTAL_JWKS_URI };
    afterEach(() => {
        if (OLD.h === undefined) delete process.env.PORTAL_REDIS_HOST; else process.env.PORTAL_REDIS_HOST = OLD.h;
        if (OLD.j === undefined) delete process.env.PORTAL_JWKS_URI; else process.env.PORTAL_JWKS_URI = OLD.j;
    });
    test('thiếu biến -> tắt; đủ cả hai -> bật', () => {
        delete process.env.PORTAL_REDIS_HOST; delete process.env.PORTAL_JWKS_URI;
        expect(sso.isEnabled()).toBe(false);
        process.env.PORTAL_REDIS_HOST = 'portal-redis';
        expect(sso.isEnabled()).toBe(false);
        process.env.PORTAL_JWKS_URI = 'http://portal-gateway:8888/.well-known/jwks.json';
        expect(sso.isEnabled()).toBe(true);
    });
});

describe('portalSso.parseOtcValue', () => {
    test('tách appToken|refreshToken (refresh có thể chứa dấu |)', () => {
        expect(sso.parseOtcValue('a.b.c|r1|r2')).toEqual({ appToken: 'a.b.c', refreshToken: 'r1|r2' });
        expect(sso.parseOtcValue('a.b.c|')).toEqual({ appToken: 'a.b.c', refreshToken: '' });
    });
    test('sai định dạng -> null', () => {
        for (const v of [null, undefined, '', 'khongcoPipe', '|abc', 123]) expect(sso.parseOtcValue(v)).toBeNull();
    });
});

describe('portalSso.redeemCode', () => {
    const code = 'a'.repeat(32);
    test('lấy được 1 lần rồi mất (GETDEL)', async () => {
        const store = { ['otc:' + code]: 'tok|ref' };
        const redis = fakeRedis(store);
        await expect(sso.redeemCode(code, redis)).resolves.toEqual({ appToken: 'tok', refreshToken: 'ref' });
        await expect(sso.redeemCode(code, redis)).rejects.toMatchObject({ status: 401 });
    });
    test('mã sai định dạng bị từ chối trước khi chạm Redis (chống chèn khoá)', async () => {
        const redis = { getdel: jest.fn() };
        for (const bad of ['', 'ab', 'x'.repeat(200), 'abc def ghi jkl', '../../x', undefined, 42]) {
            await expect(sso.redeemCode(bad, redis)).rejects.toMatchObject({ status: 401 });
        }
        expect(redis.getdel).not.toHaveBeenCalled();
    });
    test('Redis lỗi -> 502', async () => {
        const redis = { getdel: async () => { throw new Error('ECONNREFUSED'); } };
        await expect(sso.redeemCode(code, redis)).rejects.toMatchObject({ status: 502 });
    });
});

describe('portalSso.verifyAppToken', () => {
    test('token hợp lệ -> claim', async () => {
        const c = await sso.verifyAppToken(appToken(), { getSigningKey: keys });
        expect(c.username).toBe('admin');
        expect(c.app).toBe('dpmm');
    });
    test('ký bằng khoá khác -> từ chối', async () => {
        const t = sign({ type: 'app', app: 'dpmm', username: 'admin' }, otherKey.privateKey);
        await expect(sso.verifyAppToken(t, { getSigningKey: keys })).rejects.toMatchObject({ status: 401 });
    });
    test('token HS256 tự ký (không phải RS256) bị từ chối', async () => {
        const t = jwt.sign({ type: 'app', app: 'dpmm', username: 'admin' }, pubPem, { algorithm: 'HS256', issuer: 'portal-service', keyid: 'k1' });
        await expect(sso.verifyAppToken(t, { getSigningKey: keys })).rejects.toMatchObject({ status: 401 });
    });
    test('sai issuer, hết hạn, sai type -> 401', async () => {
        await expect(sso.verifyAppToken(appToken({}), { getSigningKey: keys, issuer: 'ai-khac' })).rejects.toMatchObject({ status: 401 });
        const expired = sign({ type: 'app', app: 'dpmm', username: 'admin' }, privateKey, { expiresIn: -10 });
        await expect(sso.verifyAppToken(expired, { getSigningKey: keys })).rejects.toMatchObject({ status: 401 });
        await expect(sso.verifyAppToken(appToken({ type: 'portal' }), { getSigningKey: keys })).rejects.toMatchObject({ status: 401 });
    });
    test('token của phần mềm khác -> 403', async () => {
        await expect(sso.verifyAppToken(appToken({ app: 'qlts' }), { getSigningKey: keys })).rejects.toMatchObject({ status: 403 });
    });
    test('thiếu username -> 401; rác -> 401; không lấy được khoá -> 502', async () => {
        await expect(sso.verifyAppToken(appToken({ username: undefined }), { getSigningKey: keys })).rejects.toMatchObject({ status: 401 });
        await expect(sso.verifyAppToken('khong.phai.jwt', { getSigningKey: keys })).rejects.toMatchObject({ status: 401 });
        const t = sign({ type: 'app', app: 'dpmm', username: 'admin' }, privateKey, { keyid: 'kxx' });
        await expect(sso.verifyAppToken(t, { getSigningKey: keys })).rejects.toMatchObject({ status: 502 });
    });
});

describe('portalSso.exchangeCode (đầu-cuối trong bộ nhớ)', () => {
    test('mã -> app-token -> claim; dùng lại mã thất bại', async () => {
        const code = 'b'.repeat(32);
        const store = { ['otc:' + code]: `${appToken({ username: 'thu.quyen' })}|refresh` };
        const deps = { redis: fakeRedis(store), getSigningKey: keys };
        const c = await sso.exchangeCode(code, deps);
        expect(c.username).toBe('thu.quyen');
        await expect(sso.exchangeCode(code, deps)).rejects.toMatchObject({ status: 401 });
    });
});
