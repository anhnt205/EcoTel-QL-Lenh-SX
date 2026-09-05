import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Download, Fuel, Gauge, Grid3x3, Layers, Maximize, Minimize, Plus, Settings2, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { matrixService, type MatrixGrid } from "../matrix/matrixService";
import { downloadFuelNormExcel } from "./fuelNormExcelImport";
import {
  STATUS_LABEL,
  buildColumnKey,
  deriveDisplayCode,
  groupColumnsByVehicleSuffix,
  statusOf,
  type FuelNormDataset,
  type FuelNormStatus,
} from "./fuelNormKeys";
import { FuelNormAddDatasetModal } from "./FuelNormAddDatasetModal";
import { FuelNormChartPanel } from "./FuelNormChartPanel";

const DMNL_CODE = "DMNL";

interface FuelNormRow {
  versionId: number;
  vehicleSuffixKey: string;
  vehicleCode: string;
  suffix: string;
  year: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  note: string | null;
  status: FuelNormStatus;
  displayCode: string;
  filledCells: number;
  expectedCells: number;
  dataset: FuelNormDataset;
  grid: MatrixGrid;
}

/** Màu nhóm cột theo bộ dữ liệu (Chủng loại xe + Hậu tố) — cố định để Tailwind JIT nhận diện được. */
const GROUP_COLORS = [
  { header: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200", cell: "bg-blue-50/50 dark:bg-blue-950/10" },
  { header: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200", cell: "bg-green-50/50 dark:bg-green-950/10" },
  { header: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200", cell: "bg-amber-50/50 dark:bg-amber-950/10" },
  { header: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200", cell: "bg-purple-50/50 dark:bg-purple-950/10" },
  { header: "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-200", cell: "bg-pink-50/50 dark:bg-pink-950/10" },
  { header: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200", cell: "bg-cyan-50/50 dark:bg-cyan-950/10" },
  { header: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-200", cell: "bg-orange-50/50 dark:bg-orange-950/10" },
  { header: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200", cell: "bg-teal-50/50 dark:bg-teal-950/10" },
];

export default function FuelNormOverviewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: versions = [], isLoading: loadingVersions } = useQuery({
    queryKey: ["matrix-versions", DMNL_CODE],
    queryFn: () => matrixService.versions(DMNL_CODE),
  });

  const { data: grids = [], isLoading: loadingGrids } = useQuery({
    queryKey: ["matrix-all-grids", DMNL_CODE, versions.map((v) => v.versionId).join(",")],
    queryFn: () => Promise.all(versions.map((v) => matrixService.getGrid(DMNL_CODE, v.versionId))),
    enabled: versions.length > 0,
  });

  // Danh sách phẳng (version × bộ dữ liệu) — dùng cho KPI, sidebar, và tra
  // cứu nhanh một bộ dữ liệu cụ thể (sao chép/biểu đồ), KHÔNG dùng để hiển
  // thị trực tiếp nữa (xem bảng tổng hợp bên dưới).
  const rows: FuelNormRow[] = useMemo(() => {
    const out: FuelNormRow[] = [];
    for (const grid of grids) {
      const datasets = groupColumnsByVehicleSuffix(grid);
      for (const ds of datasets) {
        let filled = 0;
        for (const row of grid.rows) {
          for (const col of ds.columns) {
            if (grid.cells[row.key]?.[col.key] !== undefined) filled++;
          }
        }
        out.push({
          versionId: grid.versionId,
          vehicleSuffixKey: ds.vehicleSuffixKey,
          vehicleCode: ds.vehicleCode,
          suffix: ds.suffix,
          year: grid.effectiveFrom ? Number(grid.effectiveFrom.slice(0, 4)) : 0,
          effectiveFrom: grid.effectiveFrom,
          effectiveTo: grid.effectiveTo,
          note: grid.note ?? null,
          status: statusOf(grid.effectiveFrom, grid.effectiveTo),
          displayCode: deriveDisplayCode(ds.vehicleCode, ds.suffix, grid.effectiveFrom),
          filledCells: filled,
          expectedCells: grid.rows.length * ds.columns.length,
          dataset: ds,
          grid,
        });
      }
    }
    return out.sort((a, b) => (b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? ""));
  }, [grids]);

  // ── bộ lọc (áp lên bộ dữ liệu TRONG kỳ đang chọn, không áp lên danh sách phẳng nữa) ──
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [suffixFilter, setSuffixFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a), [rows]);
  const vehicles = useMemo(() => Array.from(new Set(rows.map((r) => r.vehicleCode))).sort(), [rows]);

  // ── KPI (tính trên TOÀN BỘ dữ liệu, không lọc) ───────────────────────────
  const totalFilled = rows.reduce((n, r) => n + r.filledCells, 0);
  const totalExpected = rows.reduce((n, r) => n + r.expectedCells, 0);
  const completion = totalExpected > 0 ? Math.round((totalFilled / totalExpected) * 100) : 0;
  const suffixCount = new Set(rows.map((r) => r.suffix)).size;

  // ── chọn KỲ (phiên bản) để xem bảng tổng hợp ─────────────────────────────
  // "Bảng tổng của cả năm": mỗi kỳ (MatrixDefinition) là một bộ định mức
  // đầy đủ cho khoảng thời gian đó — chọn đúng kỳ rồi hiện TOÀN BỘ bộ dữ
  // liệu (mọi Chủng loại xe + Hậu tố) của kỳ đó trong MỘT bảng, thay vì một
  // dòng riêng cho từng bộ dữ liệu như trước.
  const visibleVersions = versions.filter(
    (v) => statusFilter === "all" || statusOf(v.effectiveFrom, v.effectiveTo) === statusFilter,
  );
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const activeVersionId = visibleVersions.some((v) => v.versionId === selectedVersionId)
    ? selectedVersionId
    : visibleVersions[0]?.versionId ?? null;

  const yearGrid = grids.find((g) => g.versionId === activeVersionId);
  const yearDatasets = useMemo(() => (yearGrid ? groupColumnsByVehicleSuffix(yearGrid) : []), [yearGrid]);
  const visibleDatasets = yearDatasets.filter((d) => {
    if (vehicleFilter !== "all" && d.vehicleCode !== vehicleFilter) return false;
    if (suffixFilter !== "all" && d.suffix !== suffixFilter) return false;
    if (keyword.trim() && !d.vehicleSuffixKey.toLowerCase().includes(keyword.trim().toLowerCase())) return false;
    return true;
  });

  const versionLabelOf = (v: { versionLabel: string | null; effectiveFrom: string | null; effectiveTo: string | null }) =>
    v.versionLabel || `${v.effectiveFrom ?? "từ đầu"} → ${v.effectiveTo ?? "nay"}`;

  // ── mở rộng toàn màn hình bảng tổng hợp — đây là nội dung chính của trang ──
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── sao chép 1 bộ dữ liệu sang chủng loại xe/hậu tố khác (cùng phiên bản) ─
  const [copySource, setCopySource] = useState<FuelNormRow | null>(null);
  const [copying, setCopying] = useState(false);

  const doCopy = async (targetKey: string) => {
    if (!copySource) return;
    setCopying(true);
    try {
      const { grid, dataset } = copySource;
      const newCols = dataset.columns.map((c) => ({ key: buildColumnKey(targetKey, c.distance), label: buildColumnKey(targetKey, c.distance) }));
      await matrixService.addCols(grid.code, grid.versionId, newCols);
      const cellPayload: { rowKey: string; colKey: string; value: number }[] = [];
      for (const row of grid.rows) {
        for (const c of dataset.columns) {
          const v = grid.cells[row.key]?.[c.key];
          if (v !== undefined) {
            cellPayload.push({ rowKey: row.key, colKey: buildColumnKey(targetKey, c.distance), value: v });
          }
        }
      }
      if (cellPayload.length > 0) {
        await matrixService.saveCells(grid.code, grid.versionId, cellPayload);
      }
      toast.success(`Đã sao chép sang "${targetKey}".`);
      queryClient.invalidateQueries({ queryKey: ["matrix-all-grids", DMNL_CODE] });
      queryClient.invalidateQueries({ queryKey: ["matrix-versions", DMNL_CODE] });
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Sao chép thất bại.");
    } finally {
      setCopying(false);
      setCopySource(null);
    }
  };

  const handleExportDataset = (grid: MatrixGrid, dataset: FuelNormDataset) => {
    const filteredGrid: MatrixGrid = { ...grid, cols: dataset.columns };
    downloadFuelNormExcel(filteredGrid);
  };

  const goToEdit = (versionId: number, vehicleSuffixKey: string) =>
    navigate(`${ROUTES.DANH_MUC.DINH_MUC_NHIEN_LIEU_THEM_MOI}?versionId=${versionId}&dataset=${encodeURIComponent(vehicleSuffixKey)}`);

  const recentUpdates = [...versions]
    .sort((a, b) => new Date(b.effectiveFrom ?? 0).getTime() - new Date(a.effectiveFrom ?? 0).getTime())
    .slice(0, 5);

  const yearStats = years.map((y) => ({
    year: y,
    count: rows.filter((r) => r.year === y).length,
  }));
  const maxYearCount = Math.max(1, ...yearStats.map((s) => s.count));

  const isLoading = loadingVersions || loadingGrids;

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Danh mục</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Định mức nhiên liệu</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">Định mức nhiên liệu</h1>
          <p className="text-xs text-muted-foreground">
            Quản lý, tra cứu bộ định mức nhiên liệu theo chủng loại xe, hậu tố và năm áp dụng.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-9 gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700" onClick={() => navigate(ROUTES.DANH_MUC.DINH_MUC_NHIEN_LIEU_THEM_MOI)}>
            <Plus className="h-4 w-4" /> Thêm mới
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => navigate(ROUTES.DANH_MUC.DINH_MUC_NHIEN_LIEU_LUOI)}>
            <Settings2 className="h-3.5 w-3.5" /> Chỉnh sửa toàn bộ lưới (nâng cao)
          </Button>
        </div>
      </div>

      {/* Bộ lọc — áp lên bộ dữ liệu của kỳ đang chọn bên dưới */}
      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-3 sm:grid-cols-4">
        <FilterSelect label="Chủng loại xe" value={vehicleFilter} onChange={setVehicleFilter} options={[{ value: "all", label: "Tất cả" }, ...vehicles.map((v) => ({ value: v, label: v }))]} />
        <FilterSelect label="Hậu tố" value={suffixFilter} onChange={setSuffixFilter} options={[{ value: "all", label: "Tất cả" }, { value: "CS", label: ".CS" }, { value: "KC", label: ".KC" }]} />
        <FilterSelect
          label="Trạng thái kỳ"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: "all", label: "Tất cả" }, ...(["active", "upcoming", "expired"] as FuelNormStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
        />
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Từ khoá (bộ dữ liệu)</label>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="vd HD785-7.CS" className="h-9 text-sm" />
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={<Fuel className="h-5 w-5" />} label="Tổng số bộ định mức" value={rows.length} />
        <Kpi icon={<Layers className="h-5 w-5" />} label="Số chủng loại xe" value={vehicles.length} />
        <Kpi icon={<Grid3x3 className="h-5 w-5" />} label="Số hậu tố" value={suffixCount} />
        <Kpi icon={<Gauge className="h-5 w-5" />} label="Năm áp dụng" value={years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : "—"} />
        <Kpi icon={<Grid3x3 className="h-5 w-5" />} label="Tổng số điểm dữ liệu" value={totalFilled} />
        <Kpi icon={<Gauge className="h-5 w-5" />} label="Tỷ lệ hoàn thiện" value={`${completion}%`} />
      </div>

      {/* Bảng tổng hợp — nội dung chính của trang, chọn kỳ rồi hiện toàn bộ
          Chủng loại xe + Hậu tố của kỳ đó trong 1 bảng */}
      <div
        className={cn(
          "flex min-h-0 flex-col rounded-lg border bg-card",
          isFullscreen && "fixed inset-0 z-[100] flex-1 rounded-none",
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-bold">Bảng tổng hợp định mức nhiên liệu</h2>
            <p className="text-xs text-muted-foreground">
              Dữ liệu điền ở "Thêm mới"/"Sửa" hiện ngay ở đây — cùng một nguồn, không phải bảng riêng.
            </p>
          </div>
          <button
            title={isFullscreen ? "Thu nhỏ" : "Mở rộng toàn màn hình"}
            onClick={() => setIsFullscreen((v) => !v)}
            className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>

        {/* Chọn kỳ */}
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
          {isLoading ? (
            <span className="text-xs text-muted-foreground">Đang tải…</span>
          ) : visibleVersions.length === 0 ? (
            <span className="text-xs text-muted-foreground">Chưa có kỳ nào khớp bộ lọc trạng thái.</span>
          ) : (
            visibleVersions.map((v) => (
              <button
                key={v.versionId}
                onClick={() => setSelectedVersionId(v.versionId)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs",
                  activeVersionId === v.versionId
                    ? "border-blue-400 bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/30"
                    : "bg-white dark:bg-gray-900",
                )}
              >
                {versionLabelOf(v)}
                <span
                  className={cn(
                    "ml-1.5 rounded px-1 py-0.5 text-[10px] font-semibold",
                    statusOf(v.effectiveFrom, v.effectiveTo) === "active" && "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
                    statusOf(v.effectiveFrom, v.effectiveTo) === "upcoming" && "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
                    statusOf(v.effectiveFrom, v.effectiveTo) === "expired" && "bg-gray-100 text-gray-600 dark:bg-gray-800",
                  )}
                >
                  {STATUS_LABEL[statusOf(v.effectiveFrom, v.effectiveTo)]}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Bảng tổng hợp của kỳ đang chọn */}
        {!yearGrid ? (
          <p className="p-4 text-sm text-muted-foreground">Chưa có kỳ nào — bấm "Thêm mới" để tạo.</p>
        ) : visibleDatasets.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Kỳ này chưa có bộ dữ liệu nào khớp bộ lọc.</p>
        ) : (
          <div
            className={cn("min-h-0 overflow-auto", isFullscreen ? "flex-1" : "")}
            style={isFullscreen ? undefined : { maxHeight: "75vh" }}
          >
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th rowSpan={2} className="sticky left-0 top-0 z-30 min-w-[90px] border-b border-r bg-muted px-2 py-2 text-left font-semibold">
                    {yearGrid.rowAxisLabel}
                  </th>
                  {visibleDatasets.map((ds, idx) => {
                    const color = GROUP_COLORS[idx % GROUP_COLORS.length];
                    return (
                      <th
                        key={ds.vehicleSuffixKey}
                        colSpan={ds.columns.length}
                        className={cn("sticky top-0 z-20 border-b border-r px-2 py-1.5 text-center font-semibold", color.header)}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{ds.vehicleSuffixKey}</span>
                          <button title="Sửa" onClick={() => goToEdit(yearGrid.versionId, ds.vehicleSuffixKey)}>
                            <SquarePen className="h-3.5 w-3.5" />
                          </button>
                          <button
                            title="Sao chép"
                            onClick={() => {
                              const r = rows.find((x) => x.versionId === yearGrid.versionId && x.vehicleSuffixKey === ds.vehicleSuffixKey);
                              if (r) setCopySource(r);
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button title="Xuất Excel" onClick={() => handleExportDataset(yearGrid, ds)}>
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {visibleDatasets.map((ds, idx) => {
                    const color = GROUP_COLORS[idx % GROUP_COLORS.length];
                    return ds.columns.map((c) => (
                      <th key={c.key} className={cn("sticky top-[33px] z-10 min-w-[64px] border-b border-r px-1.5 py-1 text-center font-medium", color.header)}>
                        {c.distance}
                      </th>
                    ));
                  })}
                </tr>
              </thead>
              <tbody>
                {yearGrid.rows.map((r) => (
                  <tr key={r.key}>
                    <th className="sticky left-0 z-10 border-b border-r bg-card px-2 py-1 text-left font-medium">{r.label}</th>
                    {visibleDatasets.map((ds, idx) => {
                      const color = GROUP_COLORS[idx % GROUP_COLORS.length];
                      return ds.columns.map((c) => {
                        const v = yearGrid.cells[r.key]?.[c.key];
                        return (
                          <td key={c.key} className={cn("border-b border-r px-1.5 py-1 text-right", color.cell)}>
                            {v === undefined ? "" : v}
                          </td>
                        );
                      });
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Biểu đồ — phụ, chỉ minh hoạ nhanh nên để nhỏ, không chiếm hết chiều ngang */}
      {!isFullscreen && (
        <div className="max-w-md rounded-lg border bg-card p-2.5">
          <h2 className="mb-1.5 text-xs font-bold">Biểu đồ minh hoạ — các chủng loại xe trong bảng</h2>
          {yearGrid && visibleDatasets.length > 0 ? (
            <FuelNormChartPanel grid={yearGrid} datasets={visibleDatasets} />
          ) : (
            <p className="text-xs text-muted-foreground">Chưa có bộ dữ liệu nào để vẽ.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <h3 className="mb-2 text-sm font-bold">Hướng dẫn sử dụng</h3>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            <li>Chọn kỳ ở bảng tổng hợp để xem toàn bộ dữ liệu của kỳ đó.</li>
            <li>Bấm "Thêm mới" để tạo bộ định mức, hoặc bấm biểu tượng sửa trên từng cột nhóm.</li>
            <li>Có thể nhập trực tiếp hoặc Import từ file Excel.</li>
            <li>Dữ liệu sau khi lưu hiển thị ngay trong bảng tổng hợp này.</li>
          </ol>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <h3 className="mb-2 text-sm font-bold">Tải file mẫu</h3>
          <p className="mb-2 text-xs text-muted-foreground">Xuất lưới của phiên bản mới nhất làm định dạng mẫu.</p>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={grids.length === 0}
            onClick={() => grids[0] && downloadFuelNormExcel(grids[0])}
          >
            <Download className="h-3.5 w-3.5" /> Tải file mẫu
          </Button>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <h3 className="mb-2 text-sm font-bold">Cập nhật gần đây</h3>
          <div className="space-y-1.5 text-xs">
            {recentUpdates.length === 0 && <p className="text-muted-foreground">Chưa có dữ liệu.</p>}
            {recentUpdates.map((v) => (
              <div key={v.versionId} className="flex justify-between border-b py-1 last:border-0">
                <span>{v.versionLabel || v.effectiveFrom || `#${v.versionId}`}</span>
                <span className="text-muted-foreground">{v.effectiveFrom ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <h3 className="mb-2 text-sm font-bold">Thống kê theo năm</h3>
          <div className="flex h-[110px] items-end gap-4 border-b border-l pb-1 pl-1">
            {yearStats.map((s) => (
              <div key={s.year} className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-semibold">{s.count}</span>
                <div className="w-6 rounded-t bg-blue-600" style={{ height: `${(s.count / maxYearCount) * 80 + 4}px` }} />
                <span className="text-[10px] text-muted-foreground">{s.year}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {copySource && (
        <FuelNormAddDatasetModal
          existingKeys={new Set(groupColumnsByVehicleSuffix(copySource.grid).map((d) => d.vehicleSuffixKey))}
          onClose={() => setCopySource(null)}
          onConfirm={(key) => {
            if (!copying) doCopy(key);
          }}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30">
        {icon}
      </div>
      <div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-lg font-bold">{value}</div>
      </div>
    </div>
  );
}
