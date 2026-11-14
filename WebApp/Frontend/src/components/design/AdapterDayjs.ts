import { AdapterDayjs as BaseAdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/vi";

/**
 * Bộ chuyển đổi ngày giờ (dayjs) mặc định tiếng Việt cho mọi ô chọn ngày: tuần bắt đầu từ Thứ 2,
 * tên tháng/thứ tiếng Việt (lịch giống mẫu: "Th 2 … CN"). Ô nào truyền `adapterLocale` riêng vẫn được giữ nguyên.
 * Thay cho `AdapterDayjs` gốc của @mui/x-date-pickers — chỉ khác ngôn ngữ mặc định.
 */
export class AdapterDayjs extends BaseAdapterDayjs {
  constructor(options: any = {}) {
    super({ ...options, locale: options?.locale ?? "vi" });
  }
}

export default AdapterDayjs;
