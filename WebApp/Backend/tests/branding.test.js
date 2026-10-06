const { sanitizeBranding, toPublicBranding, MAX_LOGO_CHARS } = require('../utils/branding');

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('sanitizeBranding', () => {
    test('body rỗng -> không đổi gì, không lỗi', () => {
        expect(sanitizeBranding({})).toEqual({ errors: [], changes: {} });
        expect(sanitizeBranding(undefined)).toEqual({ errors: [], changes: {} });
    });

    test('nhận giá trị hợp lệ và chuẩn hoá (cắt khoảng trắng, màu chữ thường)', () => {
        const { errors, changes } = sanitizeBranding({
            softwareName: '  Điều phối thiết bị  ',
            companyName: 'Công ty ABC',
            primaryColor: '#1D6FF2',
            logo: PNG,
        });
        expect(errors).toEqual([]);
        expect(changes).toEqual({
            softwareName: 'Điều phối thiết bị',
            companyName: 'Công ty ABC',
            primaryColor: '#1d6ff2',
            logo: PNG,
        });
    });

    test('chuỗi rỗng hoặc null -> xoá về mặc định', () => {
        const { errors, changes } = sanitizeBranding({ softwareName: '', companyName: null, primaryColor: '', logo: null });
        expect(errors).toEqual([]);
        expect(changes).toEqual({ softwareName: '', companyName: '', primaryColor: '', logo: '' });
    });

    test('khoá vắng mặt thì giữ nguyên (không nằm trong changes)', () => {
        const { changes } = sanitizeBranding({ companyName: 'X' });
        expect(Object.keys(changes)).toEqual(['companyName']);
    });

    test.each(['red', '#fff', '#12345', '#gggggg', 123])('từ chối màu sai: %p', (bad) => {
        const { errors } = sanitizeBranding({ primaryColor: bad });
        expect(errors).toHaveLength(1);
    });

    test('từ chối logo không phải ảnh cho phép (html, javascript, http)', () => {
        for (const bad of ['data:text/html;base64,PGgxPg==', 'javascript:alert(1)', 'http://x/y.png', 'data:image/png;base64,@@@', 42]) {
            expect(sanitizeBranding({ logo: bad }).errors).toHaveLength(1);
        }
    });

    test('từ chối logo quá lớn', () => {
        const huge = 'data:image/png;base64,' + 'A'.repeat(MAX_LOGO_CHARS);
        expect(sanitizeBranding({ logo: huge }).errors).toHaveLength(1);
    });

    test('từ chối tên quá dài và kiểu dữ liệu sai', () => {
        expect(sanitizeBranding({ softwareName: 'a'.repeat(121) }).errors).toHaveLength(1);
        expect(sanitizeBranding({ companyName: 'a'.repeat(161) }).errors).toHaveLength(1);
        expect(sanitizeBranding({ companyName: { $ne: null } }).errors).toHaveLength(1);
    });
});

describe('toPublicBranding', () => {
    test('không bao giờ trả nội dung logo, chỉ có cờ và phiên bản', () => {
        const out = toPublicBranding({ logo: PNG, logoUpdatedAt: 1700000000000, softwareName: 'A' });
        expect(out).toEqual({ softwareName: 'A', companyName: '', primaryColor: '', hasLogo: true, logoVersion: 1700000000000 });
        expect(JSON.stringify(out)).not.toContain('base64');
    });

    test('chưa cấu hình thì toàn giá trị rỗng', () => {
        expect(toPublicBranding(undefined)).toEqual({ softwareName: '', companyName: '', primaryColor: '', hasLogo: false, logoVersion: null });
    });
});
