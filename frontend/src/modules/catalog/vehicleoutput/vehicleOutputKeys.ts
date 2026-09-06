/**
 * Khoá cột "Năng suất xe" — chốt qua trao đổi trực tiếp với chủ dự án
 * (mockup ghi "Chủng loại hàng + Phân loại" cho 2 dropdown mỗi nhóm cột,
 * xác nhận lấy đúng chữ trên mockup dù nhãn cấu hình sẵn trong DB
 * (`col_axis_label`) và dữ liệu cột cũ đang có ("CAT777E.Than") gợi ý
 * khác — dữ liệu cũ coi như dữ liệu nháp/test, không phải chuẩn áp dụng).
 *
 * Khu vực xúc gấp vào làm hậu tố cuối, đúng quy ước `.CS`/`.KC` đã dùng ở
 * DMNL/Mô hình — mockup chỉ hiện MỘT "Khu vực xúc" ở trên nên một lượt
 * "Thêm mới" chỉ nhập cho MỘT khu vực; muốn đủ cả hai thì thêm lượt thứ 2
 * chọn khu vực còn lại, cột mới tự nối thêm vào lưới đã có.
 *
 * Khoá đầy đủ: {@code <mã chủng loại hàng>_<mã phân loại>.<CS|KC>}.
 */

export type VehicleOutputArea = "CS" | "KC";

export const VEHICLE_OUTPUT_AREAS: { value: VehicleOutputArea; label: string }[] = [
  { value: "CS", label: "CS (Cao Sơn)" },
  { value: "KC", label: "KC (Ngoài khu vực)" },
];

export const cargoClassificationKeyOf = (
  cargoTypeCode: string,
  classificationCode: string,
  area: VehicleOutputArea,
): string => `${cargoTypeCode}_${classificationCode}.${area}`;
