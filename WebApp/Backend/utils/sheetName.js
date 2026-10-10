// Tên sheet Excel: tối đa 31 ký tự, không chứa \ / : * ? [ ], không phân biệt hoa/thường, không được trùng trong cùng
// workbook. ExcelJS tự CẮT tên dài hơn 31 ký tự rồi mới kiểm tra trùng, nên 2 tên khác nhau ở phần đuôi (chỉ số lệnh,
// hậu tố "_Chi tiết") có thể thành trùng nhau sau khi bị cắt -> "Worksheet name already exists".

const MAX_LEN = 31;

const sanitize = (name) =>
    String(name ?? '')
        .replace(/[\\\/:*?\[\]]/g, '-')
        .replace(/^'+|'+$/g, '') // Excel không cho tên bắt đầu/kết thúc bằng dấu '
        .trim();

const hasName = (workbook, name) => {
    const lower = name.toLowerCase();
    return workbook.worksheets.some((ws) => ws && String(ws.name).toLowerCase() === lower);
};

/**
 * Tên sheet hợp lệ và duy nhất trong `workbook`.
 *  - `base` bị cắt để `base + suffix` không vượt 31 ký tự (hậu tố như "_Chi tiết" luôn được giữ nguyên);
 *  - nếu trùng thì thêm " (2)", " (3)"... vào cuối phần `base` (vẫn trong giới hạn 31 ký tự).
 */
const uniqueSheetName = (workbook, base, suffix = '') => {
    const tail = sanitize(suffix);
    const head = sanitize(base) || 'Sheet';
    const room = Math.max(1, MAX_LEN - tail.length);
    for (let n = 1; ; n++) {
        const mark = n === 1 ? '' : ` (${n})`;
        const candidate = head.substring(0, Math.max(1, room - mark.length)).trimEnd() + mark + tail;
        if (!hasName(workbook, candidate)) return candidate;
    }
};

module.exports = { uniqueSheetName, MAX_LEN };
