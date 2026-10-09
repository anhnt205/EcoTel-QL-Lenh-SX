/**
 * Thoát các ký tự đặc biệt của RegExp (.*+?^${}()|[]\)
 * Giúp tránh lỗi cú pháp RegExp (ví dụ: người dùng gõ "+15", "(HN)", "*abc"...)
 * và ngăn ngừa tấn công ReDoS.
 *
 * @param {string|any} string
 * @returns {string}
 */
const escapeRegex = (string = '') => {
  if (typeof string !== 'string') {
    if (Array.isArray(string)) {
      string = string[0] || '';
    } else {
      string = String(string || '');
    }
  }
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Tạo đối tượng RegExp an toàn từ chuỗi đầu vào.
 * Không bao giờ quăng lỗi SyntaxError ngay cả khi chuỗi chứa ký tự regex không hợp lệ.
 *
 * @param {string|any} string - Chuỗi tìm kiếm
 * @param {string} [flags='i'] - Cờ regex (mặc định: 'i')
 * @returns {RegExp|null}
 */
const safeRegex = (string, flags = 'i') => {
  if (string === undefined || string === null) return null;
  try {
    return new RegExp(escapeRegex(string), flags);
  } catch (err) {
    return null;
  }
};

module.exports = {
  escapeRegex,
  safeRegex,
};
