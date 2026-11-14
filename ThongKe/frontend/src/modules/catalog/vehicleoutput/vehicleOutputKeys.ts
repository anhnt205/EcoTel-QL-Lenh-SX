/**
 * Khoá cột lưới "Năng suất xe (996)".
 *
 * Công thức thật (`BR5` của bảng tính):
 * ```
 * MATCH( LEFT($DA5, LEN($DA5)-3) & "." & AD5, NS.CLXE, 0)
 * ```
 * `LEFT(DA5, len-3)` cắt hậu tố `.CS`/`.KC` của cột DA, tức trả về mã
 * **Chủng loại xe** trần; `AD5` là Phân loại `DAT`/`Than`. Khoá đầy đủ:
 * {@code <mã Chủng loại xe>.<DAT|Than>}, vd {@code CAT777E.DAT}.
 *
 * SỬA NGÀY 07/09/2026 (QĐ-10 + QĐ-11). Bản dựng ngày 06/09 làm khoá
 * {@code <mã chủng loại hàng>_<mã phân loại>.<CS|KC>} theo đúng chữ trên
 * mockup — sai ba chỗ so với bảng tính:
 *  1. gốc là chủng loại **XE**, không phải chủng loại **HÀNG**;
 *  2. "Phân loại" là `DAT`/`Than` TỰ SUY từ Sản phẩm nghiệm thu, không
 *     phải danh mục người dùng chọn (QĐ-10);
 *  3. khoá này KHÔNG có hậu tố khu vực.
 */

/** Phân loại — hai giá trị duy nhất công thức `AD5` sinh ra (QĐ-10). */
export type VehicleOutputClassification = "DAT" | "Than";

export const VEHICLE_OUTPUT_CLASSIFICATIONS: {
  value: VehicleOutputClassification;
  label: string;
}[] = [
  { value: "DAT", label: "DAT (Đất)" },
  { value: "Than", label: "Than" },
];

/**
 * Nhóm khu vực xúc (QĐ-13). Rỗng = "Tất cả khu vực" → khoá KHÔNG có hậu tố (hành vi cũ, mọi dữ liệu đã có).
 * Có giá trị → khoá thêm hậu tố `.CS`/`.KC`; engine (FuelCalculator.productivityNorm) tra cột riêng theo nhóm trước,
 * không có thì lùi về cột chung.
 */
export type VehicleOutputArea = "" | "CS" | "KC";

export const VEHICLE_OUTPUT_AREAS: { value: "CS" | "KC"; label: string }[] = [
  { value: "CS", label: "CS" },
  { value: "KC", label: "KC" },
];

export const vehicleClassificationKeyOf = (
  vehicleTypeCode: string,
  classification: VehicleOutputClassification,
  area: VehicleOutputArea = "",
): string => `${vehicleTypeCode}.${classification}${area ? `.${area}` : ""}`;

/** Tách khoá cột về {mã xe, phân loại, khu vực}; null nếu cột không theo quy ước. */
export function parseVehicleOutputKey(
  key: string,
): { vehicleTypeCode: string; classification: VehicleOutputClassification; area: VehicleOutputArea } | null {
  let base = key;
  let area: VehicleOutputArea = "";
  for (const a of ["CS", "KC"] as const) {
    if (base.endsWith(`.${a}`)) {
      area = a;
      base = base.slice(0, -(a.length + 1));
      break;
    }
  }
  for (const c of ["Than", "DAT"] as VehicleOutputClassification[]) {
    const tail = `.${c}`;
    if (base.endsWith(tail)) {
      return { vehicleTypeCode: base.slice(0, -tail.length), classification: c, area };
    }
  }
  return null;
}
