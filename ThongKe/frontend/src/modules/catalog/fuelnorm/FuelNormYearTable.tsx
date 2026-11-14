import { useMemo } from "react";
import ViewGrid, { type ViewColumn } from "../design/ViewGrid";
import type { MatrixGrid } from "../matrix/matrixService";
import type { VehicleOutputYear } from "../vehicleoutput/VehicleOutputYearTable";
import { FuelNormInterpolationPanel } from "./FuelNormInterpolationPanel";
import { groupColumnsByVehicleSuffix, parseColumnKey } from "./fuelNormKeys";
import "@/styles/catalog-design.css";

/** Một dòng của bảng xem — cùng cấu trúc với bảng ở cửa sổ Thêm mới: Thời gian | Cung độ | Độ dốc | các cột `<xe>.<phân loại>_<cung độ>`. */
interface ViewRow {
  id: string;
  time: string;
  distance: string;
  slope: string;
  cells: Record<string, number>;
}

/** "Tháng 1/2026" từ ngày yyyy-MM-dd. */
const monthYear = (iso: string | null) => (iso ? `Tháng ${Number(iso.slice(5, 7))}/${iso.slice(0, 4)}` : "");

/** Dựng các dòng của MỘT phiên bản: dòng = độ dốc; cột Cung độ hiện danh sách cung độ theo thứ tự cạnh Độ dốc (như Excel / cửa sổ Thêm mới). */
function rowsOfVersion(g: MatrixGrid): ViewRow[] {
  const slopes = [...g.rows].sort((a, b) => (a.numericValue ?? a.sortOrder) - (b.numericValue ?? b.sortOrder));
  const distances = [
    ...new Set(
      g.cols
        .map((c) => parseColumnKey(c.key)?.distance)
        .filter((d): d is number => d !== undefined && !Number.isNaN(d)),
    ),
  ].sort((a, b) => a - b);
  const time = `${monthYear(g.effectiveFrom)} – ${monthYear(g.effectiveTo)}`;
  const n = Math.max(slopes.length, distances.length);
  return Array.from({ length: n }, (_, i) => ({
    id: `${g.versionId}-${i}`,
    time,
    distance: distances[i] != null ? String(distances[i]) : "",
    slope: slopes[i] ? slopes[i].label || slopes[i].key : "",
    cells: slopes[i] ? (g.cells?.[slopes[i].key] ?? {}) : {},
  }));
}

/**
 * Bảng định mức nhiên liệu của một NĂM, hiện ngay dưới dòng năm khi bấm Xem — ĐỒNG BỘ với bảng ở cửa sổ Thêm mới: mỗi dòng một độ dốc kèm
 * Thời gian (tháng/năm) và Cung độ; các cột dữ liệu là mọi nhóm Chủng loại xe + Phân loại, mỗi nhóm trải theo cung độ (`<xe>.<phân loại>_<cung độ>`).
 * Năm có nhiều khoảng thời gian thì các khoảng nối tiếp nhau trong cùng một bảng. Nút ⋮ ở tiêu đề nhóm cột để lọc bớt nhóm Chủng loại xe + Phân loại khi có quá nhiều nhóm.
 */
export function FuelNormYearTable({ year }: { year: VehicleOutputYear }) {
  const datasetKeys = useMemo(() => {
    const set = new Set<string>();
    year.versions.forEach((v) => groupColumnsByVehicleSuffix(v).forEach((d) => set.add(d.vehicleSuffixKey)));
    return [...set].sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
  }, [year]);

  const rows = useMemo(() => year.versions.flatMap(rowsOfVersion), [year]);

  /** Cột dữ liệu: nhóm theo xe + phân loại, cung độ tăng dần; gộp mọi phiên bản trong năm. */
  const dataKeys = useMemo(() => {
    const byDataset = new Map<string, Map<string, number>>();
    year.versions.forEach((v) =>
      groupColumnsByVehicleSuffix(v).forEach((d) => {
        const m = byDataset.get(d.vehicleSuffixKey) ?? new Map<string, number>();
        d.columns.forEach((c) => m.set(c.key, c.distance));
        byDataset.set(d.vehicleSuffixKey, m);
      }),
    );
    return [...byDataset.keys()]
      .sort((a, b) => a.localeCompare(b, "vi", { numeric: true }))
      .flatMap((k) => [...byDataset.get(k)!.entries()].sort((a, b) => a[1] - b[1]).map(([key]) => key));
  }, [year]);

  const columns = useMemo<ViewColumn[]>(
    () => [
      ...(year.versions.length > 1 ? [{ key: "time", label: "Thời gian", align: "center" as const }] : []),
      { key: "distance", label: "Cung độ", strong: true },
      { key: "slope", label: "Độ dốc", strong: true },
      ...dataKeys.map((k) => ({ key: k, label: k, align: "right" as const })),
    ],
    [dataKeys, year.versions.length],
  );

  const textOf = (r: ViewRow, k: string): string => {
    if (k === "time") return r.time;
    if (k === "distance") return r.distance;
    if (k === "slope") return r.slope;
    const v = r.cells[k];
    return v == null ? "" : String(v);
  };

  return (
    <div className="tkc-modal-overlay vg-inline">
      {datasetKeys.length > 0 && <FuelNormInterpolationPanel versions={year.versions} datasetKeys={datasetKeys} />}
      {rows.length === 0 ? (
        <p style={{ padding: "8px 14px 12px" }}>Chưa có dữ liệu định mức.</p>
      ) : (
        <ViewGrid columns={columns} rows={rows} textOf={textOf} storageKey="view:fuel-norm-year-all" showCount={false}
          groupHeader={{ label: "Chủng loại xe. Phân loại_Cung độ", keys: dataKeys, groupOf: (k) => parseColumnKey(k)?.vehicleSuffixKey ?? k }}
        />
      )}
    </div>
  );
}
