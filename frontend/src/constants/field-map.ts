export interface FieldDef {
  key: string;
  label: string;
  width: number;
  type: 'number' | 'string';
  group: string;
  description: string;
  formula?: string;
}

export const FIELD_MAP: FieldDef[] = [
  // 1. THÔNG TIN CƠ BẢN (6)
  { key: 'ngay', label: 'ngay', width: 95, type: 'string', group: 'Cơ bản', description: 'Ngày làm việc' },
  { key: 'ca', label: 'ca', width: 60, type: 'string', group: 'Cơ bản', description: 'Ca làm việc (Ca 1/2/3)' },
  { key: 'soxe', label: 'soxe', width: 85, type: 'string', group: 'Cơ bản', description: 'Mã số xe' },
  { key: 'loai', label: 'loai', width: 100, type: 'string', group: 'Cơ bản', description: 'Loại xe (model)' },
  { key: 'c_lg', label: 'c_lg', width: 60, type: 'string', group: 'Cơ bản', description: 'Chất lượng xe (A/B/C)' },
  { key: 'ms_lai', label: 'ms_lai', width: 85, type: 'string', group: 'Cơ bản', description: 'Mã lái xe' },

  // 2. HÀNG HÓA (2)
  { key: 'hangluu', label: 'hangluu', width: 85, type: 'string', group: 'Hàng hóa', description: 'Ký hiệu hàng hóa' },
  { key: 'hang', label: 'hang', width: 100, type: 'string', group: 'Hàng hóa', description: 'Tên loại hàng' },

  // 3. SẢN LƯỢNG (11)
  { key: 'chuyen', label: 'chuyen', width: 75, type: 'number', group: 'Sản lượng', description: 'Số chuyến' },
  { key: 'c_do', label: 'c_do', width: 70, type: 'number', group: 'Sản lượng', description: 'Cự ly (km)' },
  { key: 'rod', label: 'rod', width: 60, type: 'string', group: 'Sản lượng', description: 'Mô hình xếp' },
  { key: 'xuc', label: 'xuc', width: 85, type: 'string', group: 'Sản lượng', description: 'Mã máy xúc' },
  { key: 'm3', label: 'm3', width: 85, type: 'number', group: 'Sản lượng', description: 'Khối lượng (m³)' },
  { key: 'tan_th', label: 'tan_th', width: 85, type: 'number', group: 'Sản lượng', description: 'Tấn tính toán' },
  { key: 'tan_can', label: 'tan_can', width: 85, type: 'number', group: 'Sản lượng', description: 'Tấn cân thực tế' },
  { key: 'tan', label: 'tan', width: 85, type: 'number', group: 'Sản lượng', description: 'Tấn chính thức' },
  { key: 'tan_truda', label: 'tan_truda', width: 90, type: 'number', group: 'Sản lượng', description: 'Tấn trừ đá' },
  { key: 'tan_buam', label: 'tan_buam', width: 90, type: 'number', group: 'Sản lượng', description: 'Tấn bù ẩm' },
  { key: 'tkm', label: 'tkm', width: 90, type: 'number', group: 'Sản lượng', description: 'Tấn.km' },

  // 4. NHIÊN LIỆU (7)
  { key: 'gas_d', label: 'gas_d', width: 75, type: 'number', group: 'Nhiên liệu', description: 'Gas đầu ca (L)' },
  { key: 'gas_c', label: 'gas_c', width: 75, type: 'number', group: 'Nhiên liệu', description: 'Gas cuối ca (L)' },
  { key: 'gas_l', label: 'gas_l', width: 75, type: 'number', group: 'Nhiên liệu', description: 'Gas lĩnh (L)' },
  { key: 'gas_tt', label: 'gas_tt', width: 75, type: 'number', group: 'Nhiên liệu', description: 'Gas tiêu thụ' },
  { key: 'gas_bq', label: 'gas_bq', width: 80, type: 'number', group: 'Nhiên liệu', description: 'Gas bình quân' },
  { key: 'dau_l', label: 'dau_l', width: 75, type: 'number', group: 'Nhiên liệu', description: 'Dầu lĩnh (L)' },
  { key: 'dau_bq', label: 'dau_bq', width: 80, type: 'number', group: 'Nhiên liệu', description: 'Dầu bình quân' },

  // 5. HIỆU SUẤT (5)
  { key: 'km', label: 'km', width: 70, type: 'number', group: 'Hiệu suất', description: 'Tổng km' },
  { key: 'h_may', label: 'h_may', width: 70, type: 'number', group: 'Hiệu suất', description: 'Giờ máy' },
  { key: 'h_dd', label: 'h_dd', width: 70, type: 'number', group: 'Hiệu suất', description: 'Giờ di dời' },
  { key: 'h', label: 'h', width: 65, type: 'number', group: 'Hiệu suất', description: 'Tổng giờ' },
  { key: 'tan_h', label: 'tan_h', width: 75, type: 'number', group: 'Hiệu suất', description: 'Tấn / giờ' },

  // 6. NHÂN SỰ (2)
  { key: 'hoten', label: 'hoten', width: 150, type: 'string', group: 'Nhân sự', description: 'Họ tên lái xe' },
  { key: 'ms_cb', label: 'ms_cb', width: 85, type: 'string', group: 'Nhân sự', description: 'Mã số cán bộ' },

  // 7. NL TÍNH TOÁN (5)
  { key: 'gas_dd', label: 'gas_dd', width: 75, type: 'number', group: 'NL tính toán', description: 'Gas định mức' },
  { key: 'gas_tp', label: 'gas_tp', width: 75, type: 'number', group: 'NL tính toán', description: 'Gas điều chỉnh' },
  { key: 'dmuc_g', label: 'dmuc_g', width: 80, type: 'number', group: 'NL tính toán', description: 'Định mức gas' },
  { key: 'tieuchuan', label: 'tieuchuan', width: 90, type: 'number', group: 'NL tính toán', description: 'Tiêu chuẩn NL' },
  { key: 'dinhmuc', label: 'dinhmuc', width: 80, type: 'number', group: 'NL tính toán', description: 'Định mức nhiên liệu' },

  // 8. PHÂN LOẠI (6)
  { key: 'doixe', label: 'doixe', width: 110, type: 'string', group: 'Phân loại', description: 'Đội xe' },
  { key: 'doi_lai', label: 'doi_lai', width: 90, type: 'string', group: 'Phân loại', description: 'Đội lái' },
  { key: 'mo', label: 'mo', width: 70, type: 'string', group: 'Phân loại', description: 'Mỏ' },
  { key: 'thang', label: 'thang', width: 65, type: 'number', group: 'Phân loại', description: 'Tháng' },
  { key: 'quy', label: 'quy', width: 60, type: 'number', group: 'Phân loại', description: 'Quý' },
  { key: 'nam', label: 'nam', width: 65, type: 'number', group: 'Phân loại', description: 'Năm' },

  // 9. BẢO DƯỠNG (2)
  { key: 'ngay_cn', label: 'ngay_cn', width: 85, type: 'string', group: 'Bảo dưỡng', description: 'Công nhật' },
  { key: 'ngay_sc', label: 'ngay_sc', width: 85, type: 'string', group: 'Bảo dưỡng', description: 'Sửa chữa' },

  // 10. ĐIỀU CHỈNH (2)
  { key: 'tanggiam', label: 'tanggiam', width: 85, type: 'number', group: 'Điều chỉnh', description: 'Nhiên liệu tăng/giảm' },
  { key: 'timkiem', label: 'timkiem', width: 100, type: 'string', group: 'Điều chỉnh', description: 'Từ khóa' },

  // 11. NL CHI TIẾT (3)
  { key: 'dau_dm', label: 'dau_dm', width: 75, type: 'number', group: 'NL chi tiết', description: 'Dầu định mức' },
  { key: 'dau_ad', label: 'dau_ad', width: 75, type: 'number', group: 'NL chi tiết', description: 'Dầu thực tế' },
  { key: 'mo_may', label: 'mo_may', width: 75, type: 'number', group: 'NL chi tiết', description: 'Mỡ máy' },

  // 12. VỊ TRÍ (3)
  { key: 'chat_tai', label: 'chat_tai', width: 120, type: 'string', group: 'Vị trí', description: 'Vị trí chất tải' },
  { key: 'do_tailuu', label: 'do_tailuu', width: 100, type: 'string', group: 'Vị trí', description: 'Ký hiệu đổ tải' },
  { key: 'do_tai', label: 'do_tai', width: 120, type: 'string', group: 'Vị trí', description: 'Vị trí đổ tải' },

  // 13. ĐIỀU CHỈNH THỂ TÍCH (6)
  { key: 'truvoi', label: 'truvoi', width: 75, type: 'number', group: 'ĐC thể tích', description: 'Trừ voi' },
  { key: 'cong', label: 'cong', width: 75, type: 'number', group: 'ĐC thể tích', description: 'Cộng tải' },
  { key: 'dinhben', label: 'dinhben', width: 75, type: 'number', group: 'ĐC thể tích', description: 'Đính ben' },
  { key: 'tru_n_d', label: 'tru_n_d', width: 80, type: 'number', group: 'ĐC thể tích', description: 'Trừ nước đá' },
  { key: 'thetich', label: 'thetich', width: 80, type: 'number', group: 'ĐC thể tích', description: 'Thể tích thùng' },
  { key: 'tyledodac', label: 'tyledodac', width: 85, type: 'number', group: 'ĐC thể tích', description: 'Tỷ lệ đo đạc' },

  // 14. TÀI CHÍNH (4)
  { key: 'dongia', label: 'dongia', width: 85, type: 'number', group: 'Tài chính', description: 'Đơn giá' },
  { key: 'thanhtien', label: 'thanhtien', width: 95, type: 'number', group: 'Tài chính', description: 'Thành tiền' },
  { key: 'nsd', label: 'nsd', width: 85, type: 'string', group: 'Tài chính', description: 'Người sử dụng' },
  { key: 'dvt', label: 'dvt', width: 65, type: 'string', group: 'Tài chính', description: 'Đơn vị tính' },
];
