/**
 * Khoá dòng "HS điều chỉnh NLDM" — chốt qua trao đổi trực tiếp với chủ dự
 * án: tổ hợp Chủng loại xe + Hạng (danh mục "Hạng xe" đã có) + Phân loại,
 * gấp thêm Khu vực xúc làm hậu tố cuối (đúng cách Năng suất xe/DMNL gấp
 * hậu tố khu vực vào khoá, tránh phải đổi ràng buộc duy nhất
 * `(code, effective_from)` của `MatrixDefinition` — một năm là một phiên
 * bản, nhiều khu vực xúc cùng ghi vào chung phiên bản đó ở các dòng khác
 * nhau thay vì cần nhiều phiên bản).
 *
 * Khoá đầy đủ: {@code <mã xe>_<mã hạng>_<mã phân loại>.<mã khu vực xúc>}.
 *
 * Cột là 12 tháng CỐ ĐỊNH (khác Năng suất xe/DMNL — không sinh động theo
 * lựa chọn) + 1 cột tính "HSNL điều chỉnh" = TRUNG BÌNH 12 tháng (chốt
 * qua trao đổi trực tiếp, không suy đoán từ mockup).
 */

export const MONTH_COUNT = 12;
export const MONTH_KEYS: string[] = Array.from({ length: MONTH_COUNT }, (_, i) => String(i + 1));
export const MONTH_LABELS: string[] = Array.from({ length: MONTH_COUNT }, (_, i) => `Tháng ${i + 1}`);
export const YEARLY_COL_KEY = "NAM";
export const YEARLY_COL_LABEL = "HSNL điều chỉnh";

export const rowKeyOf = (
  vehicleCode: string,
  rankCode: string,
  classificationCode: string,
  areaCode: string,
): string => `${vehicleCode}_${rankCode}_${classificationCode}.${areaCode}`;

/** Trung bình các giá trị số hợp lệ — bỏ qua ô trống/không phải số, null nếu không có ô nào. */
export function averageOf(values: (string | undefined)[]): number | null {
  const nums = values
    .map((v) => (v ?? "").trim())
    .filter((v) => v !== "")
    .map((v) => Number(v.replace(",", ".")))
    .filter((n) => !Number.isNaN(n));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
