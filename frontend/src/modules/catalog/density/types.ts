/** Một bản ghi tỷ trọng — khớp `DensityParameterResponse` phía backend. */
export interface DensityParameterResponse {
  id: number;
  cargoTypeId: number;
  cargoTypeCode: string;
  cargoTypeName: string;
  cargoGroupName?: string | null;
  acceptanceProduct?: string | null;
  ttlClh?: string | null;
  excavationAreaId: number | null;
  /** "Tất cả khu vực" khi bản ghi không gắn khu vực cụ thể — backend tự tính sẵn. */
  excavationAreaName: string;
  effectiveFrom: string;
  effectiveTo: string;
  densityWet: number;
  densityDry: number;
  note: string | null;
}

/**
 * Một LÔ tỷ trọng: mọi mã hàng cùng chia sẻ một khoảng thời gian + khu vực
 * xúc — đúng đơn vị mà popup "Thêm mới tỷ trọng" tạo ra trong một lần lưu.
 *
 * Bảng danh mục ngoài không liệt kê từng bản ghi phẳng (một dòng/mã hàng)
 * như trước — nó gom các bản ghi có cùng (Thời gian, Khu vực xúc) thành một
 * LÔ, để "Xem"/"Sửa" mở lại đúng cái phiếu người dùng đã nhập, thay vì rã
 * rời từng dòng mất hết ngữ cảnh của lần nhập đó.
 */
export interface DensityBatch {
  /** `effectiveFrom|effectiveTo|excavationAreaId` — khoá gộp, không phải id lưu trong DB. */
  key: string;
  effectiveFrom: string;
  effectiveTo: string;
  excavationAreaId: number | null;
  excavationAreaName: string;
  records: DensityParameterResponse[];
}

export const batchKey = (
  effectiveFrom: string,
  effectiveTo: string,
  excavationAreaId: number | null,
) => `${effectiveFrom}|${effectiveTo}|${excavationAreaId ?? "null"}`;

/** Gom một danh sách bản ghi phẳng thành các LÔ theo (Thời gian, Khu vực xúc). */
export function groupIntoBatches(
  records: DensityParameterResponse[],
): DensityBatch[] {
  const map = new Map<string, DensityBatch>();
  for (const r of records) {
    const key = batchKey(r.effectiveFrom, r.effectiveTo, r.excavationAreaId);
    let b = map.get(key);
    if (!b) {
      b = {
        key,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo,
        excavationAreaId: r.excavationAreaId,
        excavationAreaName: r.excavationAreaName,
        records: [],
      };
      map.set(key, b);
    }
    b.records.push(r);
  }
  return [...map.values()].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}
