/**
 * Khoá lưới "HS điều chỉnh NLĐM".
 *
 * Công thức thật của bảng tính:
 * ```
 * DP5 = DQ5 & "_" & LEFT(DB5,1)      DQ = Chủng loại xe (NL), DB = Hạng xe
 * EA5 = DP5 & "_" & AD5              AD = Phân loại DAT/Than
 * EC5 = INDEX(...) MATCH(EA5, dòng) MATCH(D5, cột)
 * ```
 *
 * - Khoá DÒNG: {@code <mã Chủng loại xe (NL)>_<CHỮ ĐẦU mã Hạng xe>_<DAT|Than>},
 *   vd {@code CAT777E_C_DAT}.
 * - Khoá CỘT: {@code T<tháng>.<nhóm khu vực>}, vd {@code T6.CS} — 12 tháng ×
 *   2 nhóm khu vực (QĐ-12), cộng 1 cột hệ số năm = trung bình 12 tháng.
 *
 * SỬA NGÀY 07/09/2026 (QĐ-10, QĐ-12, QĐ-13). Bản dựng ngày 06/09 dùng khoá
 * dòng {@code <xe>_<mã hạng đầy đủ>_<mã phân loại>.<mã khu vực>} và cột chỉ
 * là số tháng — sai bốn chỗ: hạng xe phải lấy CHỮ ĐẦU; "Phân loại" là
 * DAT/Than tự suy chứ không phải danh mục; khu vực thuộc về CỘT chứ không
 * phải hậu tố của dòng; và cột phải so theo NHÓM khu vực, không so mã.
 */

/** Phân loại — hai giá trị duy nhất công thức `AD5` sinh ra (QĐ-10). */
export type FuelAdjustClassification = "DAT" | "Than";

export const FUEL_ADJUST_CLASSIFICATIONS: {
  value: FuelAdjustClassification;
  label: string;
}[] = [
  { value: "DAT", label: "DAT (Đất)" },
  { value: "Than", label: "Than" },
];

/** Nhóm khu vực xúc — bảng tính chỉ biết hai giá trị này (QĐ-13). */
export type AreaGroup = "CS" | "KC";

export const AREA_GROUPS: { value: AreaGroup; label: string }[] = [
  { value: "CS", label: "CS" },
  { value: "KC", label: "KC" },
];

export const MONTH_COUNT = 12;

/** 24 cột tháng × nhóm khu vực, xếp theo tháng rồi tới nhóm. */
export const MONTH_AREA_COLUMNS: { key: string; month: number; area: AreaGroup; label: string }[] =
  Array.from({ length: MONTH_COUNT }, (_, i) => i + 1).flatMap((month) =>
    AREA_GROUPS.map(({ value: area }) => ({
      key: monthColumnKeyOf(month, area),
      month,
      area,
      label: `T${month}.${area}`,
    })),
  );

export function monthColumnKeyOf(month: number, area: AreaGroup): string {
  return `T${month}.${area}`;
}

export const yearlyColumnKeyOf = (area: AreaGroup): string => `NAM.${area}`;

export const YEARLY_COL_LABEL = "HSNL điều chỉnh (năm)";

export const rowKeyOf = (
  fuelClassCode: string,
  rankCode: string,
  classification: FuelAdjustClassification,
): string => `${fuelClassCode}_${firstChar(rankCode)}_${classification}`;

/** `LEFT(x,1)` — chuỗi rỗng cho ra chuỗi rỗng, khớp hành vi backend. */
function firstChar(v: string): string {
  const t = (v ?? "").trim();
  return t === "" ? "" : t.slice(0, 1);
}

/** Trung bình các giá trị số hợp lệ — bỏ ô trống/không phải số, null nếu không có ô nào. */
export function averageOf(values: (string | undefined)[]): number | null {
  const nums = values
    .map((v) => (v ?? "").trim())
    .filter((v) => v !== "")
    .map((v) => Number(v.replace(",", ".")))
    .filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
