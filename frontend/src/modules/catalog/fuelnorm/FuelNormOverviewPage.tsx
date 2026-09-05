import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Download, Fuel, Gauge, Grid3x3, Layers, Plus, Settings2, SquarePen } from "lucide-react";
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
import { downloadMatrixExcel } from "../matrix/matrixExcel";
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

  // ── bộ lọc ────────────────────────────────────────────────────────────────
  const [yearFilter, setYearFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [suffixFilter, setSuffixFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a), [rows]);
  const vehicles = useMemo(() => Array.from(new Set(rows.map((r) => r.vehicleCode))).sort(), [rows]);

  const filtered = rows.filter((r) => {
    if (yearFilter !== "all" && String(r.year) !== yearFilter) return false;
    if (vehicleFilter !== "all" && r.vehicleCode !== vehicleFilter) return false;
    if (suffixFilter !== "all" && r.suffix !== suffixFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      if (!r.displayCode.toLowerCase().includes(kw) && !(r.note ?? "").toLowerCase().includes(kw)) return false;
    }
    return true;
  });

  // ── KPI (tính trên TOÀN BỘ dữ liệu, không lọc) ───────────────────────────
  const totalFilled = rows.reduce((n, r) => n + r.filledCells, 0);
  const totalExpected = rows.reduce((n, r) => n + r.expectedCells, 0);
  const completion = totalExpected > 0 ? Math.round((totalFilled / totalExpected) * 100) : 0;
  const suffixCount = new Set(rows.map((r) => r.suffix)).size;

  // ── chọn dòng để xem biểu đồ ──────────────────────────────────────────────
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = filtered.find((r) => `${r.versionId}|${r.vehicleSuffixKey}` === selectedKey) ?? filtered[0];

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

  const handleExportRow = (r: FuelNormRow) => {
    const filteredGrid: MatrixGrid = {
      ...r.grid,
      cols: r.dataset.columns,
    };
    downloadMatrixExcel(filteredGrid);
  };

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

      {/* Bộ lọc */}
      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-3 sm:grid-cols-3 lg:grid-cols-6">
        <FilterSelect label="Năm áp dụng" value={yearFilter} onChange={setYearFilter} options={[{ value: "all", label: "Tất cả" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]} />
        <FilterSelect label="Chủng loại xe" value={vehicleFilter} onChange={setVehicleFilter} options={[{ value: "all", label: "Tất cả" }, ...vehicles.map((v) => ({ value: v, label: v }))]} />
        <FilterSelect label="Hậu tố" value={suffixFilter} onChange={setSuffixFilter} options={[{ value: "all", label: "Tất cả" }, { value: "CS", label: ".CS" }, { value: "KC", label: ".KC" }]} />
        <FilterSelect
          label="Trạng thái"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[{ value: "all", label: "Tất cả" }, ...(["active", "upcoming", "expired"] as FuelNormStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
        />
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Từ khoá</label>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm theo mã, mô tả..." className="h-9 text-sm" />
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        {/* Danh sách */}
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-bold">Danh sách bộ định mức nhiên liệu</h2>
          </div>
          <div className="overflow-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Đang tải…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Không có bộ định mức nào khớp bộ lọc.</p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="border-b px-2 py-2">Mã</th>
                    <th className="border-b px-2 py-2">Năm</th>
                    <th className="border-b px-2 py-2">Chủng loại xe</th>
                    <th className="border-b px-2 py-2">Hậu tố</th>
                    <th className="border-b px-2 py-2">Ngày hiệu lực</th>
                    <th className="border-b px-2 py-2">Trạng thái</th>
                    <th className="border-b px-2 py-2">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const rowKey = `${r.versionId}|${r.vehicleSuffixKey}`;
                    return (
                      <tr
                        key={rowKey}
                        onClick={() => setSelectedKey(rowKey)}
                        className={cn("cursor-pointer border-b hover:bg-blue-50/50 dark:hover:bg-blue-950/10", selectedKey === rowKey && "bg-blue-50 dark:bg-blue-950/20")}
                      >
                        <td className="px-2 py-2 font-medium">{r.displayCode}</td>
                        <td className="px-2 py-2">{r.year || "—"}</td>
                        <td className="px-2 py-2">{r.vehicleCode}</td>
                        <td className="px-2 py-2">.{r.suffix}</td>
                        <td className="px-2 py-2">{r.effectiveFrom ?? "—"}</td>
                        <td className="px-2 py-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-semibold",
                              r.status === "active" && "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300",
                              r.status === "upcoming" && "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
                              r.status === "expired" && "bg-gray-100 text-gray-600 dark:bg-gray-800",
                            )}
                          >
                            {STATUS_LABEL[r.status]}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2 text-blue-600">
                            <button
                              title="Sửa"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`${ROUTES.DANH_MUC.DINH_MUC_NHIEN_LIEU_THEM_MOI}?versionId=${r.versionId}&dataset=${encodeURIComponent(r.vehicleSuffixKey)}`);
                              }}
                            >
                              <SquarePen className="h-4 w-4" />
                            </button>
                            <button
                              title="Sao chép"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCopySource(r);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              title="Xuất Excel"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportRow(r);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Biểu đồ */}
        <div className="rounded-lg border bg-card p-3">
          <h2 className="mb-2 text-sm font-bold">Biểu đồ minh hoạ {selected ? `— ${selected.displayCode}` : ""}</h2>
          {selected ? (
            <FuelNormChartPanel grid={selected.grid} dataset={selected.dataset} />
          ) : (
            <p className="text-sm text-muted-foreground">Chọn một dòng trong danh sách để xem biểu đồ.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-3">
          <h3 className="mb-2 text-sm font-bold">Hướng dẫn sử dụng</h3>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            <li>Chọn năm, chủng loại xe, hậu tố để tra cứu hoặc xem biểu đồ.</li>
            <li>Bấm "Thêm mới" để tạo bộ định mức.</li>
            <li>Có thể nhập trực tiếp hoặc Import từ file Excel.</li>
            <li>Dữ liệu sau khi lưu hiển thị ngay trong danh sách này.</li>
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
            onClick={() => grids[0] && downloadMatrixExcel(grids[0])}
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
        <SelectTrigger className="h-9 text-sm">
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
