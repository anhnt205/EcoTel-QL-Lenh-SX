/** Một bản ghi STD — khớp `SurveyStandardResponse` phía backend. */
export interface SurveyStandardResponse {
  id: number;
  catalogType: "DAT_CN" | "DAT_SX_THAN_SX";
  seamGroupExcavatorKey: string;
  /** Sáu thành phần đã ghép nên khoá — chỉ để Xem/Sửa hiện lại đúng, có thể null (khai qua ô gõ tự do cũ). */
  seamGroup: string | null;
  benchGroup: string | null;
  excavator: string | null;
  mudMark: string | null;
  excavationArea: string | null;
  suffix: string | null;
  effectiveFrom: string;
  effectiveTo: string;
  earthAcceptanceProduct: string | null;
  earthM3: number | null;
  earthDesignVolume: number | null;
  earthDeviation: number | null;
  earthTon: number | null;
  earthHaulDistance: number | null;
  earthBulkDensity: number | null;
  earthTkm: number | null;
  coalAcceptanceProduct: string | null;
  coalM3: number | null;
  coalBulkDensity: number | null;
  coalTon: number | null;
  coalDesignVolume: number | null;
  coalDeviation: number | null;
  coalHaulDistance: number | null;
  coalTkm: number | null;
  note: string | null;
}

/**
 * Mã QUẢN LÝ ổn định của một dòng STD — dựng từ `id` (không đổi, dù sửa gì
 * đi nữa), KHÔNG dùng chuỗi khoá "Nhóm vỉa + Máy xúc" nữa.
 *
 * Trước đây bảng danh mục dùng thẳng `seamGroupExcavatorKey` làm "mã" —
 * hợp lý khi khoá đó cố định. Nhưng từ khi cho sửa lại sáu ô ghép khoá qua
 * "Sửa", chuỗi khoá của một dòng có thể ĐỔI sau khi lưu, nên không còn
 * dùng được làm định danh nhìn-là-nhận-ra-đúng-dòng nữa — người dùng có
 * thể sửa khoá xong không nhận ra đây vẫn là dòng cũ. `id` không đổi qua
 * mọi lần sửa nên dùng nó, chỉ định dạng lại cho dễ đọc.
 */
export const formatStdCode = (id: number): string => `STD${String(id).padStart(6, "0")}`;
