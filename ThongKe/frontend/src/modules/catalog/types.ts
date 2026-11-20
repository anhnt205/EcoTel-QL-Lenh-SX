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
   * `monthRange` — MỘT cột chọn khoảng thời gian "từ tháng/năm - đến tháng/năm"; giá trị
   *            là chuỗi "MM/yyyy - MM/yyyy" (ở màn nhập kiểu thiết kế hiện hai ô chọn tháng)
   */
  type: "text" | "number" | "date" | "select" | "checkbox" | "monthRange";
  /** Với checkbox: giá trị lưu khi được tick (bỏ tick = để trống). Mặc định "true". */
  checkedValue?: string;
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
  /**
   * Cột ĐỊNH DANH: có trong bảng và trong file Excel, nhưng không sửa được
   * trong biểu mẫu.
   *
   * Khác {@link readOnly} ở chỗ vẫn nằm trong file. Dùng cho mã thiết bị ở
   * màn thuộc tính sản lượng: file nhập cần mã để biết ghi vào thiết bị nào,
   * nhưng bản thân mã thì không được sửa ở màn đó.
   */
  formHidden?: boolean;
  placeholder?: string;
  /**
   * Với `text` nhận nhiều giá trị cách nhau bằng dấu phẩy: hiện thành combobox ĐA CHỌN lấy lựa chọn từ danh mục
   * (`vehicleTypes` = Chủng loại xe + Chủng loại xe (NL), `cargoTypes` = Chủng loại hàng, `vehicles` = Số xe).
   * Vẫn gõ được mẫu kết thúc bằng `*`. Giá trị lưu vẫn là chuỗi "A, B"; chỗ nào chưa hỗ trợ thì hiện ô chữ như cũ.
   */
  multiSource?: "vehicleTypes" | "cargoTypes" | "vehicles";
  /** Với select: danh sách lựa chọn CỐ ĐỊNH (giá trị gửi lên + nhãn hiển thị), vd trạng thái thiết bị. */
  options?: { value: string; label: string }[];
  /** Với select tham chiếu danh mục khác: tham số lọc thêm khi tải lựa chọn, vd { group: "XE" }. */
  optionsParams?: Record<string, unknown>;
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
  /** Dòng mô tả dưới tên trang (bố cục thẻ); không đặt thì dùng "Quản lý danh mục {nounPhrase}". */
  description?: string;
  /** Bộ lọc nhóm trên thanh công cụ (thiết kế): lọc theo giá trị của cột `key` (vd "cargoGroupName"), nhãn hiển thị `label`. */
  filterField?: { key: string; label: string };
  /** Bề rộng cột (px) của bảng theo thiết kế, theo thứ tự `fields`; không đặt thì lấy từ `width` của từng trường. */
  designWidths?: number[];
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
   * Giá trị CỐ ĐỊNH của màn này: vừa dùng làm bộ lọc khi tải danh sách, vừa
   * được ghép vào payload khi lưu.
   *
   * Dùng khi một bảng backend phục vụ nhiều màn. Vd hai màn STD dùng chung
   * bảng `survey_standards`, phân biệt bằng `catalogType`; người dùng không
   * phải chọn lại giá trị đó ở mỗi dòng, và cũng không thể chọn nhầm.
   */
  fixedValues?: Record<string, unknown>;
  /**
   * Cho phép THÊM MỚI. Mặc định `true`.
   *
   * Đặt `false` cho màn chỉ bổ sung thuộc tính cho bản ghi đã có — vd thuộc
   * tính sản lượng của thiết bị: thiết bị đến từ nơi khác, màn này không tạo
   * ra thiết bị mới.
   */
  canCreate?: boolean;
  /**
   * Cho phép XOÁ. Mặc định `true`.
   *
   * Đặt `false` ở màn chỉ bổ sung thuộc tính: xoá ở đó sẽ có nghĩa là xoá cả
   * bản ghi gốc — không phải điều người dùng định làm khi đang khai báo
   * thuộc tính sản lượng cho một chiếc xe.
   */
  canDelete?: boolean;
  /**
   * Dòng lưu ý bổ sung ghi vào sheet "HuongDan" của file Excel.
   *
   * Dùng cho những cảnh báo chỉ đúng với riêng một danh mục — chỗ duy nhất
   * người dùng thực sự đọc được lúc họ sắp nhập file.
   */
  guideNotes?: string[];
  /**
   * Trường hiển thị trong câu hỏi xác nhận xoá. Mặc định là trường thứ hai.
   */
  labelKey?: string;
  /** Màn có nút Tải lên/Tải xuống (Excel). Mặc định `true`; đặt `false` cho màn chưa hỗ trợ file mẫu (vd Xe, Máy). */
  canExcel?: boolean;
  /** Thêm số liệu "giờ hoạt động lũy kế" (cột `cumulativeHours`) theo MÃ thiết bị, lấy từ Điều phối qua khung cha. */
  deviceHoursByCode?: boolean;
  /** Cột nào trống thì lấy giá trị cột khác của cùng dòng để hiển thị/sửa, vd { vehicleNumber: "code" } (Số xe trống => dùng Biển số/mã). */
  valueFallbacks?: Record<string, string>;
}
