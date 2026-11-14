import { useMemo } from "react";
import ViewGrid, { type ViewColumn } from "../design/ViewGrid";
import "@/styles/catalog-design.css";
import type { MatrixGrid } from "../matrix/matrixService";

/** Một NĂM năng suất xe: gom các phiên bản lưới (đủ dòng/cột/ô) có ngày hiệu lực bắt đầu trong năm đó. */
export interface VehicleOutputYear {
  key: string;
  year: number;
  versions: MatrixGrid[];
}

/** Gom các phiên bản thành danh sách theo NĂM (năm của ngày bắt đầu), năm mới nhất lên đầu; phiên bản trong năm theo thời gian. */
export function groupIntoYears(grids: MatrixGrid[]): VehicleOutputYear[] {
  const map = new Map<string, VehicleOutputYear>();
  for (const g of grids) {
    const y = (g.effectiveFrom ?? "").slice(0, 4) || "0";
    let item = map.get(y);
    if (!item) {
      item = { key: y, year: Number(y), versions: [] };
      map.set(y, item);
    }
    item.versions.push(g);
  }
  const out = [...map.values()];
  out.forEach((y) => y.versions.sort((a, b) => (a.effectiveFrom ?? "").localeCompare(b.effectiveFrom ?? "")));
  return out.sort((a, b) => b.year - a.year);
}

/** "09/2026" — chỉ dùng để phân biệt các phiên bản trong cùng một năm (hiển thị chính vẫn theo NĂM). */
export const fmtMonthYear = (s: string | null) => {
  if (!s) return "";
  const [y, m] = s.split("-");
  return `${m}/${y}`;
};

/** Nhãn một phiên bản trong năm có nhiều phiên bản: "Phiên bản 2 (09/2026 – 09/2026)". */
export const versionLabelOf = (g: MatrixGrid, index: number) =>
  `Phiên bản ${index + 1} (${fmtMonthYear(g.effectiveFrom)} – ${fmtMonthYear(g.effectiveTo)})`;

interface DistanceRow {
  key: string;
  label: string;
  cells: Record<string, number>;
}

/** Bảng của MỘT phiên bản: dòng = Cung độ, cột = chủng loại xe + phân loại (+ khu vực). */
function VersionGrid({ grid }: { grid: MatrixGrid }) {
  const rows = useMemo<DistanceRow[]>(
    () =>
      [...grid.rows]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => ({ key: r.key, label: r.label || r.key, cells: grid.cells?.[r.key] ?? {} })),
    [grid],
  );
  const cols = useMemo(() => [...grid.cols].sort((a, b) => a.sortOrder - b.sortOrder), [grid]);
  const columns = useMemo<ViewColumn[]>(
    () => [
      { key: "__dist", label: "Cung độ (km)", strong: true },
      ...cols.map((c) => ({ key: c.key, label: c.label || c.key, align: "right" as const })),
    ],
    [cols],
  );
  const textOf = (r: DistanceRow, k: string): string => {
    if (k === "__dist") return r.label;
    const v = r.cells[k];
    return v == null ? "" : String(v);
  };
  // tiêu đề nhóm giống cửa sổ Thêm mới/Sửa: "Chủng loại xe + Phân loại" phía trên các cột dữ liệu
  return (
    <ViewGrid
      columns={columns}
      rows={rows}
      textOf={textOf}
      storageKey="view:vehicle-output"
      showCount={false}
      columnGroups={[{ label: "Chủng loại xe + Phân loại", keys: cols.map((c) => c.key) }]}
    />
  );
}

/**
 * Bảng năng suất xe của một NĂM, hiện ngay dưới dòng năm khi bấm Xem (dropdown mở rộng). Năm có nhiều phiên bản thì mỗi phiên bản một bảng
 * kèm dòng tiêu đề thời gian. Chỉ XEM — sửa/sao chép/xóa ở danh sách ngoài.
 */
export function VehicleOutputYearTable({ year }: { year: VehicleOutputYear }) {
  return (
    <div className="tkc-modal-overlay vg-inline">
      {year.versions.map((g, i) => (
        <div key={g.versionId}>
          {year.versions.length > 1 && <div className="vg-version-title">{`Năm ${year.year} — ${versionLabelOf(g, i)}`}</div>}
          <VersionGrid grid={g} />
        </div>
      ))}
    </div>
  );
}
