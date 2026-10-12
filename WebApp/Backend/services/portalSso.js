// Đăng nhập một lần (SSO) từ Portal (PORTAL-PM) — Điều phối là "phần mềm con".
//
// Luồng (cùng cơ chế với QL-TAISAN, xem OtcStore.java / TaiKhoanController#exchangeCode):
//   1. Người dùng bấm thẻ phần mềm trên Portal -> Portal sinh app-token (JWT RS256 ký bằng khoá của Portal) + refresh-token,
//      lưu vào REDIS CỦA PORTAL dưới khoá `otc:<code>` = "appToken|refreshToken" (TTL 30 giây) và mở
//      <url đã đăng ký>?code=<code> (URL đăng ký phải là trang /login của Điều phối).
//   2. Trang đăng nhập Điều phối gọi POST /api/auth/portal/exchange-code { code }.
//   3. Backend lấy-và-xoá `otc:<code>` (GETDEL, dùng được đúng 1 lần), xác thực app-token bằng JWKS của Portal
//      (RS256, iss, type=app, app=<mã phần mềm>), đối chiếu `username` với tài khoản Điều phối và cấp phiên Điều phối
//      như đăng nhập thường. Phân quyền dùng mô hình của Điều phối (tài khoản/chức vụ/phòng ban), không dùng `permissions` của token.
//
// Bật khi đặt PORTAL_REDIS_HOST + PORTAL_JWKS_URI; thiếu thì endpoint trả 503 và đăng nhập thường không bị ảnh hưởng.
//   PORTAL_REDIS_HOST / PORTAL_REDIS_PORT (6379) / PORTAL_REDIS_PASSWORD  — Redis của Portal (cùng Redis với OtcStore của Portal)
//   PORTAL_JWKS_URI                                                       — vd http://portal-gateway:8888/.well-known/jwks.json
//   PORTAL_APP_CODE (mặc định dpmm)  — mã phần mềm đã đăng ký trên Portal; token của phần mềm khác bị từ chối
//   PORTAL_ISSUER   (mặc định portal-service)

const jwt = require('jsonwebtoken');

const OTC_PREFIX = 'otc:';

const settings = () => ({
    redisHost: process.env.PORTAL_REDIS_HOST || '',
    redisPort: Number(process.env.PORTAL_REDIS_PORT) || 6379,
    redisPassword: process.env.PORTAL_REDIS_PASSWORD || undefined,
    jwksUri: process.env.PORTAL_JWKS_URI || '',
    appCode: process.env.PORTAL_APP_CODE || 'dpmm',
    issuer: process.env.PORTAL_ISSUER || 'portal-service',
});

const isEnabled = () => {
    const s = settings();
    return Boolean(s.redisHost && s.jwksUri);
};

class PortalSsoError extends Error {
    constructor(message, status = 401) {
        super(message);
        this.name = 'PortalSsoError';
        this.status = status;
    }
}

/** "appToken|refreshToken" -> { appToken, refreshToken } (refresh có thể rỗng); null nếu sai định dạng. */
const parseOtcValue = (value) => {
    if (typeof value !== 'string' || !value) return null;
    const i = value.indexOf('|');
    if (i <= 0) return null;
    return { appToken: value.slice(0, i), refreshToken: value.slice(i + 1) };
};

// ---- kết nối (tạo lười, chỉ khi thật sự dùng) ----
let redisClient = null;
const getRedis = () => {
    if (!redisClient) {
        const Redis = require('ioredis');
        const s = settings();
        redisClient = new Redis({
            host: s.redisHost,
            port: s.redisPort,
            password: s.redisPassword,
            maxRetriesPerRequest: 1,
            connectTimeout: 3000,
        });
        redisClient.on('error', () => { /* lỗi hiện ra ở lần gọi; tránh unhandled 'error' event */ });
    }
    return redisClient;
};

let jwksClient = null;
const defaultGetSigningKey = async (kid) => {
    if (!jwksClient) {
        const jwksRsa = require('jwks-rsa');
        jwksClient = jwksRsa({
            jwksUri: settings().jwksUri,
            cache: true,
            cacheMaxAge: 10 * 60 * 1000,
            rateLimit: true,
            timeout: 5000,
        });
    }
    const key = await jwksClient.getSigningKey(kid);
    return key.getPublicKey();
};

/** Lấy-và-xoá mã dùng một lần từ Redis của Portal. */
const redeemCode = async (code, redis = getRedis()) => {
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(code)) {
        throw new PortalSsoError('Mã đăng nhập Portal không hợp lệ');
    }
    let value;
    try {
        value = typeof redis.getdel === 'function'
            ? await redis.getdel(OTC_PREFIX + code)
            : await redis.eval("local v=redis.call('get',KEYS[1]); if v then redis.call('del',KEYS[1]) end; return v", 1, OTC_PREFIX + code);
    } catch (e) {
        throw new PortalSsoError(`Không kết nối được Redis của Portal: ${e.message}`, 502);
    }
    const parsed = parseOtcValue(value);
    if (!parsed) throw new PortalSsoError('Mã đăng nhập Portal đã dùng, hết hạn hoặc không đúng');
    return parsed;
};

/** Xác thực app-token của Portal (RS256 + iss + type=app + app) và trả claim. */
const verifyAppToken = async (token, { getSigningKey = defaultGetSigningKey, appCode, issuer } = {}) => {
    const s = settings();
    const expectApp = appCode || s.appCode;
    const expectIssuer = issuer || s.issuer;
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header) throw new PortalSsoError('Token Portal không hợp lệ');
    let publicKey;
    try {
        publicKey = await getSigningKey(decoded.header.kid);
    } catch (e) {
        throw new PortalSsoError(`Không lấy được khoá công khai của Portal: ${e.message}`, 502);
    }
    let claims;
    try {
        claims = jwt.verify(token, publicKey, { algorithms: ['RS256'], issuer: expectIssuer });
    } catch (e) {
        throw new PortalSsoError(`Token Portal không hợp lệ: ${e.message}`);
    }
    if (claims.type !== 'app') throw new PortalSsoError('Đây không phải token phần mềm của Portal');
    if (claims.app !== expectApp) throw new PortalSsoError(`Token Portal dành cho phần mềm khác (${claims.app || 'không rõ'})`, 403);
    if (!claims.username) throw new PortalSsoError('Token Portal thiếu tên đăng nhập');
    return claims;
};

/** Mã Portal -> claim đã xác thực. */
const exchangeCode = async (code, deps = {}) => {
    const { appToken } = await redeemCode(code, deps.redis);
    return verifyAppToken(appToken, deps);
};

module.exports = {
    isEnabled,
    settings,
    parseOtcValue,
    redeemCode,
    verifyAppToken,
    exchangeCode,
    PortalSsoError,
};
