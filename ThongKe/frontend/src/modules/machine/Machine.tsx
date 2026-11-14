import DeviceCatalogPage from "../catalog/design/DeviceCatalogPage";
import { machineConfig } from "../catalog/configs";

/** Danh mục Máy — bảng/biểu mẫu theo thiết kế (gồm thuộc tính sản lượng), đủ Thêm/Sửa/Sao chép/Xóa; nút mắt mở hồ sơ tài sản. */
const Machines = () => <DeviceCatalogPage config={machineConfig} />;

export default Machines;
