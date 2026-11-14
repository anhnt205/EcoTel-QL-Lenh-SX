import DeviceCatalogPage from "../catalog/design/DeviceCatalogPage";
import { vehicleConfig } from "../catalog/configs";

/** Danh mục Xe — bảng/biểu mẫu theo thiết kế (gồm thuộc tính sản lượng), đủ Thêm/Sửa/Sao chép/Xóa; nút mắt mở hồ sơ tài sản. */
const Vehicles = () => <DeviceCatalogPage config={vehicleConfig} />;

export default Vehicles;
