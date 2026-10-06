// Kiểm tra / chuẩn hoá cấu hình giao diện (logo, tên phần mềm, tên công ty, màu chủ đạo).
// Tách riêng khỏi route để có thể test thuần (xem tests/branding.test.js).

const MAX_SOFTWARE_NAME = 120;
const MAX_COMPANY_NAME = 160;
// Logo lưu dạng data URL; frontend đã thu nhỏ ảnh (<= 256px) nên thường chỉ vài chục KB.
const MAX_LOGO_CHARS = 1000000;
const LOGO_RE = /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * body: { softwareName?, companyName?, primaryColor?, logo? }
 *  - khoá vắng mặt (undefined) -> giữ nguyên giá trị hiện tại (không có trong `changes`)
 *  - chuỗi rỗng / null          -> xoá, quay về mặc định của ứng dụng
 * Trả về { errors: string[], changes: object }.
 */
function sanitizeBranding(body) {
  const errors = [];
  const changes = {};
  const src = body && typeof body === 'object' ? body : {};

  const text = (key, label, max) => {
    if (src[key] === undefined) return;
    if (src[key] === null) {
      changes[key] = '';
      return;
    }
    if (typeof src[key] !== 'string') {
      errors.push(`${label} không hợp lệ`);
      return;
    }
    const v = src[key].trim();
    if (v.length > max) {
      errors.push(`${label} tối đa ${max} ký tự`);
      return;
    }
    changes[key] = v;
  };
  text('softwareName', 'Tên phần mềm', MAX_SOFTWARE_NAME);
  text('companyName', 'Tên công ty', MAX_COMPANY_NAME);

  if (src.primaryColor !== undefined) {
    if (src.primaryColor === null || src.primaryColor === '') {
      changes.primaryColor = '';
    } else if (typeof src.primaryColor === 'string' && COLOR_RE.test(src.primaryColor.trim())) {
      changes.primaryColor = src.primaryColor.trim().toLowerCase();
    } else {
      errors.push('Màu chủ đạo phải có dạng #RRGGBB');
    }
  }

  if (src.logo !== undefined) {
    if (src.logo === null || src.logo === '') {
      changes.logo = '';
    } else if (typeof src.logo !== 'string' || !LOGO_RE.test(src.logo)) {
      errors.push('Logo phải là ảnh PNG, JPG, WEBP, GIF hoặc SVG');
    } else if (src.logo.length > MAX_LOGO_CHARS) {
      errors.push('Logo quá lớn, vui lòng chọn ảnh nhỏ hơn');
    } else {
      changes.logo = src.logo;
    }
  }

  return { errors, changes };
}

// Bản trả về cho trình duyệt: KHÔNG chứa nội dung logo, chỉ cho biết có logo + phiên bản để cache URL.
function toPublicBranding(value) {
  const v = value || {};
  return {
    softwareName: v.softwareName || '',
    companyName: v.companyName || '',
    primaryColor: v.primaryColor || '',
    hasLogo: Boolean(v.logo),
    logoVersion: v.logo ? v.logoUpdatedAt || 1 : null,
  };
}

module.exports = {
  sanitizeBranding,
  toPublicBranding,
  MAX_SOFTWARE_NAME,
  MAX_COMPANY_NAME,
  MAX_LOGO_CHARS,
};
