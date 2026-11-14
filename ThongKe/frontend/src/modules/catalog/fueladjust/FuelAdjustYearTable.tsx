import { useMemo } from "react";
import ViewGrid, { type ViewColumn } from "../design/ViewGrid";
import "@/styles/catalog-design.css";
import type { MatrixGrid } from "../matrix/matrixService";
import { versionLabelOf, type VehicleOutputYear } from "../vehicleoutput/VehicleOutputYearTable";
import { AREA_GROUPS, MONTH_COUNT, YEARLY_COL_LABEL, monthColumnKeyOf, yearlyColumnKeyOf } from "./fuelAdjustKeys";

interface AdjustRow {
  key: string;
  vehicle: string;
  rank: string;
  cls: string;
  cells: Record<string, number>;
}

/** Tách khoá dòng `<xe>_<chữ đầu hạng>_<DAT|Than>` — khoá ngoài quy ước thì hiện nguyên khoá ở cột xe. */
const splitRowKey = (key: string): { vehicle: string; rank: string; cls: string } => {
  const m = /^(.*)_([^_]*)_(DAT|Than)$/.exec(key);
  return m ? { vehicle: m[1], rank: m[2], cls: m[3] } : { vehicle: key, rank: "", cls: "" };
};

/** Bảng của MỘT phiên bản — ĐỒNG BỘ với cửa sổ Thêm mới/Sửa: mỗi dòng (Chủng loại xe (NL) + Hạng + Phân loại), mỗi nhóm khu vực một khối 12 tháng + hệ số năm. */
function VersionGrid({ grid }: { grid: MatrixGrid }) {
  const rows = useMemo<AdjustRow[]>(
    () =>
      [...grid.rows]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => ({ key: r.key, ...splitRowKey(r.key), cells: grid.cells?.[r.key] ?? {} })),
    [grid],
  );
  const colKeys = useMemo(() => new Set(grid.cols.map((c) => c.key)), [grid]);
  // chỉ hiện nhóm khu vực nào đã có cột trong lưới
  const areas = AREA_GROUPS.map((a) => a.value).filter((a) => colKeys.has(yearlyColumnKeyOf(a)) || colKeys.has(monthColumnKeyOf(1, a)));

  const areaKeys = (a: (typeof areas)[number]) => [...Array.from({ length: MONTH_COUNT }, (_, i) => monthColumnKeyOf(i + 1, a)), yearlyColumnKeyOf(a)];
  const columns = useMemo<ViewColumn[]>(
    () => [
      { key: "__vehicle", label: "Chủng loại xe (NL)", strong: true },
      { key: "__rank", label: "Hạng xe" },
      { key: "__cls", label: "Phân loại" },
      ...areas.flatMap((a) =>
        areaKeys(a).map((k, i) => ({ key: k, label: i < MONTH_COUNT ? `Tháng ${i + 1}` : YEARLY_COL_LABEL, align: "right" as const })),
      ),
    ],
    [areas.join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const columnGroups = useMemo(
    () => areas.map((a) => ({ label: `Hệ số theo tháng — ${a}`, keys: areaKeys(a) })),
    [areas.join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const textOf = (r: AdjustRow, k: string): string => {
    if (k === "__vehicle") return r.vehicle;
    if (k === "__rank") return r.rank;
    if (k === "__cls") return r.cls;
    const v = r.cells[k];
    return v == null ? "" : String(Math.round(v * 1e6) / 1e6);
  };
  return <ViewGrid columns={columns} rows={rows} textOf={textOf} storageKey="view:fuel-adjust-year" showCount={false} columnGroups={columnGroups} />;
}

/**
 * Bảng HS điều chỉnh NLĐM của một NĂM, hiện ngay dưới dòng năm khi bấm Xem (dropdown mở rộng). Năm có nhiều phiên bản thì mỗi phiên bản một
 * bảng kèm dòng tiêu đề thời gian. Chỉ XEM — sửa/sao chép/xóa ở danh sách ngoài.
 */
export function FuelAdjustYearTable({ year }: { year: VehicleOutputYear }) {
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
