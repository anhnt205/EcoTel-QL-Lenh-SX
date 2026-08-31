/** Một trường trong biểu mẫu danh mục. */
export interface CatalogField {
  /** Tên thuộc tính trong payload gửi lên backend. */
  key: string;
  label: string;
  required?: boolean;
  /**
   * `text`   — ô nhập chữ
   * `number` — ô nhập số; payload gửi lên dạng SỐ, không phải chuỗi
   * `date`   — ô chọn ngày, payload dạng ISO yyyy-MM-dd
   * `select` — combobox; nguồn lấy từ `optionsFrom` (endpoint phụ trả
   *            mảng chuỗi) hoặc `optionsPath` (danh mục khác, dùng id)
   */
  type: "text" | "number" | "date" | "select";
  /** Với select: hậu tố endpoint trả mảng chuỗi, vd "seam-groups". */
  optionsFrom?: string;
  /** Với select tham chiếu danh mục khác: đường dẫn API, vd "/cargo-groups". */
  optionsPath?: string;
  /**
   * Cột CHỈ ĐỌC: hiện trong bảng nhưng không có trong biểu mẫu và không có
   * trong file Excel.
   *
   * Dùng cho giá trị kéo theo từ danh mục khác (vd Nhóm CLH / SPNT / TTL CLH
   * kéo theo Chủng loại hàng). Cho sửa ở đây chính là nhập trùng dữ liệu của
   * danh mục gốc; đưa vào file Excel thì file nhập lại được sẽ sai.
   */
  readOnly?: boolean;
  placeholder?: string;
  /** Bề rộng cột trong bảng nhập nhiều dòng (tailwind class). */
  width?: string;
}

/** Cấu hình đầy đủ của một màn danh mục. */
export interface CatalogConfig {
  /** Đường dẫn API, vd "/excavation-areas". */
  basePath: string;
  /** Tiêu đề trang, vd "Khu vực xúc". */
  title: string;
  /** Cụm từ dùng trong câu, vd "khu vực xúc" (viết thường). */
  nounPhrase: string;
  /** Nhánh breadcrumb, vd ["Danh mục", "Khai thác"]. */
  breadcrumb: string[];
  /** Gợi ý cho ô tìm kiếm. */
  searchPlaceholder: string;
  fields: CatalogField[];
  /**
   * Trường đóng vai trò MÃ duy nhất, dùng để chặn trùng khi nhập Excel.
   *
   * Mặc định là trường đầu tiên — đúng với hầu hết danh mục. Đặt `null` cho
   * danh mục không có mã (vd Kỳ báo cáo: trường đầu là "Năm", nhiều kỳ cùng
   * năm là chuyện bình thường, coi nó là mã sẽ báo trùng oan).
   */
  uniqueCodeKey?: string | null;
  /**
   * Trường hiển thị trong câu hỏi xác nhận xoá. Mặc định là trường thứ hai.
   */
  labelKey?: string;
}
