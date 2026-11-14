import { CatalogPage } from "../catalog/CatalogPage";
import { shiftConfig } from "../catalog/configs";

/** Danh mục Ca làm việc — bảng/biểu mẫu theo thiết kế, đủ Thêm mới / Chỉnh sửa / Sao chép / Xóa (backend /api/shifts). */
const Shifts = () => <CatalogPage config={shiftConfig} />;

export default Shifts;
