import { useMemo } from "react";
import ViewGrid, { type ViewColumn } from "../design/ViewGrid";
import "@/styles/catalog-design.css";
import type { DensityBatch, DensityParameterResponse } from "./types";

/** Một NĂM tỷ trọng: gom mọi lô (khoảng thời gian × khu vực xúc) bắt đầu trong năm đó. */
export interface DensityYear {
  key: string;
  year: number;
  batches: DensityBatch[];
  records: DensityParameterResponse[];
}

/** Gom các lô thành danh sách theo NĂM (năm của ngày bắt đầu), năm mới nhất lên đầu. */
export function groupIntoYears(batches: DensityBatch[]): DensityYear[] {
  const map = new Map<string, DensityYear>();
  for (const b of batches) {
    const y = b.effectiveFrom.slice(0, 4);
    let item = map.get(y);
    if (!item) {
      item = { key: y, year: Number(y), batches: [], records: [] };
      map.set(y, item);
    }
    item.batches.push(b);
    item.records.push(...b.records);
  }
  return [...map.values()].sort((a, b) => b.year - a.year);
}

/** Cột "Thời gian" của bảng hiện dạng tháng/năm (MM/yyyy). */
const fmt = (s: string) => {
  const [y, m] = s.split("-");
  return `${m}/${y}`;
};

const COLS: ViewColumn[] = [
  { key: "time", label: "Thời gian", align: "center" },
  // khu vực xúc chọn ở cửa sổ Thêm mới/Sửa (chung cả bảng hoặc riêng từng dòng) — phải hiện ở bảng xem để đồng bộ
  { key: "area", label: "Khu vực xúc" },
  { key: "code", label: "Mã chủng loại hàng", strong: true },
  { key: "name", label: "Chủng loại hàng" },
  { key: "group", label: "Nhóm chủng loại hàng" },
  { key: "spnt", label: "Sản phẩm nghiệm thu" },
  { key: "ttl", label: "TTL CLH" },
  { key: "dry", label: "Tỷ trọng (không QA)", align: "right" },
  { key: "wet", label: "Tỷ trọng (QA)", align: "right" },
  { key: "note", label: "Ghi chú" },
];

interface Row {
  r: DensityParameterResponse;
  b: DensityBatch;
}

const textOf = (x: Row, k: string): string => {
  switch (k) {
    case "time":
      return `${fmt(x.r.effectiveFrom)} – ${fmt(x.r.effectiveTo)}`;
    case "area":
      return x.r.excavationAreaName || "Tất cả khu vực";
    case "code":
      return x.r.cargoTypeCode;
    case "name":
      return x.r.cargoTypeName;
    case "group":
      return x.r.cargoGroupName ?? "";
    case "spnt":
      return x.r.acceptanceProduct ?? "";
    case "ttl":
      return x.r.ttlClh ?? "";
    case "dry":
      return String(x.r.densityDry);
    case "wet":
      return String(x.r.densityWet);
    default:
      return x.r.note ?? "";
  }
};

/**
 * Bảng tỷ trọng của một NĂM, hiện ngay dưới dòng năm khi bấm Xem (dropdown mở rộng, không cửa sổ): mọi bản ghi của năm
 * (mỗi dòng một mã hàng × khoảng thời gian), bảng gọn có lọc cột / hiển thị cột / chỉnh bảng. Chỉ XEM — sửa/sao chép/xóa ở danh sách ngoài.
 */
export function DensityYearTable({ year }: { year: DensityYear }) {
  // xếp theo mã hàng rồi theo ngày bắt đầu để các khoảng của cùng một mã đứng liền nhau (gộp vào một STT)
  const rows = useMemo<Row[]>(
    () =>
      year.batches
        .flatMap((b) => b.records.map((r) => ({ r, b })))
        .sort((a, c) => a.r.cargoTypeCode.localeCompare(c.r.cargoTypeCode, "vi", { numeric: true }) || a.r.effectiveFrom.localeCompare(c.r.effectiveFrom)),
    [year],
  );
  return (
    <div className="tkc-modal-overlay vg-inline">
      <ViewGrid
        columns={COLS}
        rows={rows}
        textOf={textOf}
        storageKey="view:density-year"
        groupBy={(x) => x.r.cargoTypeCode}
        groupKeys={["code", "name", "group", "spnt", "ttl"]}
        showCount={false}
      />
    </div>
  );
}
