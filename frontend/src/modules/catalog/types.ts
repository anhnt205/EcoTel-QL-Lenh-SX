/** Một trường trong biểu mẫu danh mục. */
export interface CatalogField {
  /** Tên thuộc tính trong payload gửi lên backend. */
  key: string;
  label: string;
  required?: boolean;
  /**
   * `text`   — ô nhập chữ
   * `select` — combobox; nguồn lấy từ `optionsFrom` (endpoint phụ trả
   *            mảng chuỗi) hoặc `optionsService` (danh mục khác, dùng id)
   */
  type: "text" | "select";
  /** Với select: hậu tố endpoint trả mảng chuỗi, vd "seam-groups". */
  optionsFrom?: string;
  /** Với select tham chiếu danh mục khác: đường dẫn API, vd "/cargo-groups". */
  optionsPath?: string;
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
}
