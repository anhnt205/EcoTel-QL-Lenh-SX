import { useMemo } from "react";
import ViewGrid, { type ViewColumn } from "../design/ViewGrid";
import "@/styles/catalog-design.css";
import type { ModelPeriodResponse } from "./types";

/** Một NĂM mô hình: gom mọi bản ghi `ModelPeriod` có ngày bắt đầu trong năm đó. */
export interface ModelYear {
  key: string;
  year: number;
  records: ModelPeriodResponse[];
}

/** Gom bản ghi phẳng thành danh sách theo NĂM (năm của ngày bắt đầu), năm mới nhất lên đầu. */
export function groupIntoYears(records: ModelPeriodResponse[]): ModelYear[] {
  const map = new Map<string, ModelYear>();
  for (const r of records) {
    const y = r.effectiveFrom.slice(0, 4);
    let item = map.get(y);
    if (!item) {
      item = { key: y, year: Number(y), records: [] };
      map.set(y, item);
    }
    item.records.push(r);
  }
  return [...map.values()].sort((a, b) => b.year - a.year);
}

/** Cột "Thời gian" của bảng hiện dạng tháng/năm (MM/yyyy). */
const fmt = (s: string) => {
  const [y, m] = s.split("-");
  return `${m}/${y}`;
};

/**
 * Bảng mô hình của một NĂM, hiện ngay dưới dòng năm khi bấm Xem (dropdown mở rộng): mỗi mã chủng loại hàng một STT, các khoảng thời gian
 * của mã đó trải dọc (cột Mã / Chủng loại hàng gộp ô); mỗi chủng loại xe là một cột ngang (`<mã xe>.CS` / `.KC`).
 * Bảng gọn có sắp xếp / lọc cột / hiển thị cột / chỉnh bảng. Chỉ XEM — sửa/sao chép/xóa ở danh sách ngoài.
 */
export function ModelYearTable({ year }: { year: ModelYear }) {
  const rows = useMemo(
    () =>
      [...year.records].sort(
        (a, b) => a.cargoTypeCode.localeCompare(b.cargoTypeCode, "vi", { numeric: true }) || a.effectiveFrom.localeCompare(b.effectiveFrom),
      ),
    [year],
  );
  const vehicleKeys = useMemo(() => {
    const set = new Set<string>();
    year.records.forEach((r) => Object.keys(r.values).forEach((k) => set.add(k)));
    return [...set].sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [year]);
  const columns = useMemo<ViewColumn[]>(
    () => [
      { key: "time", label: "Thời gian", align: "center" },
      { key: "code", label: "Mã chủng loại hàng", strong: true },
      { key: "name", label: "Chủng loại hàng" },
      ...vehicleKeys.map((k) => ({ key: k, label: k, align: "right" as const })),
      { key: "note", label: "Ghi chú" },
    ],
    [vehicleKeys],
  );
  const textOf = (r: ModelPeriodResponse, k: string): string => {
    if (k === "code") return r.cargoTypeCode;
    if (k === "name") return r.cargoTypeName;
    if (k === "time") return `${fmt(r.effectiveFrom)} – ${fmt(r.effectiveTo)}`;
    if (k === "note") return r.note ?? "";
    const v = r.values[k];
    return v == null ? "" : String(v);
  };
  return (
    <div className="tkc-modal-overlay vg-inline">
      <ViewGrid
        columns={columns}
        rows={rows}
        textOf={textOf}
        storageKey="view:model-year"
        groupBy={(r) => r.cargoTypeCode}
        groupKeys={["code", "name"]}
        showCount={false}
      />
    </div>
  );
}
