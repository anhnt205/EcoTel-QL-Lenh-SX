import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/config/api.config";
import ViewGrid, { type ViewColumn } from "../design/ViewGrid";
import "@/styles/catalog-design.css";
import type { MatrixGrid } from "../matrix/matrixService";
import { type VehicleOutputYear } from "../vehicleoutput/VehicleOutputYearTable";
import { AREA_GROUPS, MONTH_COUNT, YEARLY_COL_LABEL, averageOf, classificationKeyOf, monthColumnKeyOf, yearlyColumnKeyOf } from "./fuelAdjustKeys";

interface AdjustRow {
  key: string;
  vehicle: string;
  rank: string;
  cls: string;
  cells: Record<string, number>;
}

/** Tách khoá dòng `<xe>_<chữ đầu hạng>_<DAT|Than>` — khoá ngoài quy ước thì hiện nguyên khoá ở cột xe. */
const splitRowKey = (key: string): { vehicle: string; rank: string; cls: string } => {
  const m = /^(.*)_([^_]*)_([^_]+)$/.exec(key);
  return m ? { vehicle: m[1], rank: m[2], cls: m[3] } : { vehicle: key, rank: "", cls: "" };
};

/** Bảng của MỘT phiên bản — ĐỒNG BỘ với cửa sổ Thêm mới/Sửa: mỗi dòng (Chủng loại xe (NL) + Chất lượng + Phân loại), mỗi nhóm khu vực một khối 12 tháng + hệ số năm. */
function VersionGrid({ grid }: { grid: MatrixGrid }) {
  // Phân loại hiện TÊN theo danh mục Phân loại (đồng bộ với form nhập); mã chưa có trong danh mục hiện nguyên giá trị
  const { data: classes = [] } = useQuery({
    queryKey: ["classifications-options"],
    queryFn: async () => {
      const res = await api.get("/classifications", { params: { size: 500 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as { id: number; code: string; name: string }[];
    },
  });
  const classNameOf = (v: string) => classes.find((c) => classificationKeyOf(c.code) === v)?.name || v;

  const rows = useMemo<AdjustRow[]>(
    () =>
      [...grid.rows]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => ({ key: r.key, ...splitRowKey(r.key), cells: grid.cells?.[r.key] ?? {} })),
    [grid],
  );
  // chỉ hiện nhóm khu vực nào đã có cột trong lưới — bất kỳ tháng nào (lưới cũ chỉ có 1 tháng, vd T9.CS) hoặc cột hệ số năm
  const areas = AREA_GROUPS.map((a) => a.value).filter((a) =>
    grid.cols.some((c) => c.key === yearlyColumnKeyOf(a) || c.key.endsWith(`.${a}`)),
  );

  const areaKeys = (a: (typeof areas)[number]) => [yearlyColumnKeyOf(a), ...Array.from({ length: MONTH_COUNT }, (_, i) => monthColumnKeyOf(i + 1, a))];
  const columns = useMemo<ViewColumn[]>(
    () => [
      { key: "__vehicle", label: "Chủng loại xe (NL)", strong: true },
      { key: "__rank", label: "Chất lượng" },
      { key: "__cls", label: "Phân loại" },
      ...areas.flatMap((a) =>
        areaKeys(a).map((k, i) => ({ key: k, label: i === 0 ? YEARLY_COL_LABEL : `Tháng ${i}`, align: "right" as const })),
      ),
    ],
    [areas.join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const columnGroups = useMemo(
    () => areas.map((a) => ({ label: `Hệ số - ${a}`, keys: areaKeys(a) })),
    [areas.join(",")], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const textOf = (r: AdjustRow, k: string): string => {
    if (k === "__vehicle") return r.vehicle;
    if (k === "__rank") return r.rank;
    if (k === "__cls") return classNameOf(r.cls);
    let v: number | undefined = r.cells[k];
    // hệ số năm chưa lưu (lưới cũ) → hiện trung bình các tháng đã có, đồng bộ với form nhập (tự tính trung bình)
    if (v == null && k.startsWith("NAM.")) {
      const a = k.slice(4) as (typeof AREA_GROUPS)[number]["value"];
      v = averageOf(Array.from({ length: MONTH_COUNT }, (_, i) => (r.cells[monthColumnKeyOf(i + 1, a)] == null ? "" : String(r.cells[monthColumnKeyOf(i + 1, a)])))) ?? undefined;
    }
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
      {year.versions.map((g) => (
        <div key={g.versionId}>
          <VersionGrid grid={g} />
        </div>
      ))}
    </div>
  );
}
