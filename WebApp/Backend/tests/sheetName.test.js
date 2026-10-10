const ExcelJS = require('exceljs');
const { uniqueSheetName } = require('../utils/sheetName');

// Tái hiện lỗi "Worksheet name already exists" khi tải Excel nhiều lệnh (cùng người, ngày, ca).
describe('uniqueSheetName', () => {
    const add = (wb, name) => wb.addWorksheet(name);

    test('tên dài 31 ký tự + hậu tố "_Chi tiết" không còn trùng với sheet chính', () => {
        const wb = new ExcelJS.Workbook();
        const main = uniqueSheetName(wb, 'pxvt4_truong8807_10-10-2026_2');
        add(wb, main);
        const detail = uniqueSheetName(wb, main, '_Chi tiết');
        expect(detail).not.toBe(main);
        expect(detail.endsWith('_Chi tiết')).toBe(true);
        expect(detail.length).toBeLessThanOrEqual(31);
        expect(() => add(wb, detail)).not.toThrow();
    });

    test('nhiều lệnh cùng người/ngày/ca (kể cả > 10 lệnh) đều ra tên khác nhau, mỗi lệnh có sheet chi tiết riêng', () => {
        const wb = new ExcelJS.Workbook();
        for (let i = 0; i < 25; i++) {
            const main = uniqueSheetName(wb, 'pxvt4_truong8807_10-10-2026_2');
            add(wb, main);
            add(wb, uniqueSheetName(wb, main, '_Chi tiết'));
        }
        const names = wb.worksheets.map((w) => w.name);
        expect(names).toHaveLength(50);
        expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(50);
        names.forEach((n) => expect(n.length).toBeLessThanOrEqual(31));
    });

    test('không phân biệt hoa/thường; bỏ ký tự cấm; tên rỗng vẫn hợp lệ', () => {
        const wb = new ExcelJS.Workbook();
        add(wb, uniqueSheetName(wb, 'Abc'));
        expect(uniqueSheetName(wb, 'ABC')).not.toBe('Abc');
        expect(uniqueSheetName(wb, 'a/b\\c:d*e?f[g]h')).toBe('a-b-c-d-e-f-g-h');
        expect(uniqueSheetName(wb, '')).toBe('Sheet');
        expect(uniqueSheetName(wb, undefined)).toBe('Sheet');
    });

    test('tên ngắn không đổi', () => {
        const wb = new ExcelJS.Workbook();
        expect(uniqueSheetName(wb, 'an_10-10-2026_1')).toBe('an_10-10-2026_1');
    });
});
