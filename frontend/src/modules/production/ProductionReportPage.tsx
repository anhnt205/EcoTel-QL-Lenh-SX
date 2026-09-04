import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpDown,
  Calculator,
  Columns3,
  Download,
  LayoutGrid,
  Menu,
  RotateCcw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { downloadProductionReport } from "./productionExcel";
import {
  ALL_REPORT_COLUMNS,
  FROZEN_COLUMN_COUNT,
  REPORT_COLUMN_GROUPS,
  classifyEarthCoal,
  formatCell,
  type ReportColumn,
} from "./productionReportColumns";
import { productionService, type ProductionReportRow } from "./productionService";

const VISIBLE_COLUMNS_KEY = "production-report-visible-columns";
const DENSITY_KEY = "production-report-density";
const PAGE_SIZES = [20, 50, 100, 200];

/**
 * Màn "Báo cáo thống kê" — đầu ra cuối cùng, tương ứng sheet `tinh toan`.
 *
 * Dựng lại theo mockup chủ dự án đưa (bảng kiểu Excel: cột theo nhóm màu,
 * bảng chọn cột hiện/ẩn, thẻ mã số tổng quan, ngăn kéo xem chi tiết một
 * dòng). Mockup liệt kê 207 cột theo đúng chữ cái cột của bảng tính gốc —
 * NHƯNG hệ thống hiện chỉ thật sự lưu và tính ra ~34 cột (xem
 * `productionReportColumns.ts`), phần còn lại là các cột trung gian của
 * Excel chưa được đưa vào mô hình dữ liệu. Không tự bịa thêm 170+ cột
 * rỗng cho khớp số — dựng đúng GIAO DIỆN/CÁCH TƯƠNG TÁC của mockup (màu
 * nhóm, chọn cột, mật độ, ngăn kéo chi tiết, lọc, sắp xếp) trên đúng tập
 * cột THẬT đang có; hỏi lại nếu chủ dự án cần thêm cột nào trong số còn
 * thiếu.
 *
 * Mỗi dòng là một chuyến đã đối soát. Sản lượng được tính theo KỲ — hệ số
 * trắc địa phụ thuộc tổng của cả kỳ.
 */
export function ProductionReportPage() {
  const queryClient = useQueryClient();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [tkeMode, setTkeMode] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // ── Lọc & tìm kiếm (chạy trên toàn bộ dòng của kỳ, không phải một trang) ──
  const [keyword, setKeyword] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [classFilter, setClassFilter] = useState<"" | "Đất" | "Than">("");

  // ── Cột hiển thị, mật độ, sắp xếp, trang ──────────────────────────────────
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(VISIBLE_COLUMNS_KEY) ?? "null");
      if (Array.isArray(saved) && saved.length > 0) return new Set(saved);
    } catch {
      /* bỏ qua, dùng mặc định */
    }
    return new Set(ALL_REPORT_COLUMNS.map((c) => c.key as string));
  });
  const [compact, setCompact] = useState(
    () => localStorage.getItem(DENSITY_KEY) === "compact",
  );
  const [sortKey, setSortKey] = useState<keyof ProductionReportRow | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [columnPanelOpen, setColumnPanelOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");
  const [drawerRow, setDrawerRow] = useState<ProductionReportRow | null>(null);

  useEffect(() => {
    localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify([...visibleKeys]));
  }, [visibleKeys]);
  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, compact ? "compact" : "comfortable");
  }, [compact]);

  const { data: periods = [] } = useQuery({
    queryKey: ["report-periods", year, month],
    queryFn: () => productionService.periodsOfMonth(year, month),
  });

  // Chọn sẵn kỳ đầu tiên của tháng để màn hình không mở ra trống trơn.
  const effectivePeriodId = useMemo(() => {
    if (periodId && periods.some((p) => p.id === periodId)) return periodId;
    return periods[0]?.id ?? null;
  }, [periodId, periods]);

  const { data: summary } = useQuery({
    queryKey: ["production-summary", effectivePeriodId],
    queryFn: () => productionService.summary(effectivePeriodId!),
    enabled: !!effectivePeriodId,
  });

  // Nạp TOÀN BỘ dòng của kỳ một lần (giống hệt nguồn dữ liệu xuất Excel) —
  // kỳ chỉ 3–8 ngày, số dòng đủ nhỏ để lọc/sắp xếp/phân trang ngay trên
  // trình duyệt, không cần gọi lại API mỗi khi đổi trang hay đổi bộ lọc.
  const { data: allRows = [], isLoading } = useQuery({
    queryKey: ["production-all-rows", effectivePeriodId],
    queryFn: () => productionService.allRows(effectivePeriodId!),
    enabled: !!effectivePeriodId,
  });

  useEffect(() => setPage(0), [effectivePeriodId, keyword, dayFilter, shiftFilter, areaFilter, classFilter]);

  const dayOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.productionDate).filter(Boolean))).sort() as string[],
    [allRows],
  );
  const shiftOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.shiftName).filter(Boolean))).sort() as string[],
    [allRows],
  );
  const areaOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.excavationAreaName).filter(Boolean))).sort() as string[],
    [allRows],
  );
  const vehicleCount = useMemo(
    () => new Set(allRows.map((r) => r.vehicleCode).filter(Boolean)).size,
    [allRows],
  );

  const filteredRows = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return allRows.filter((r) => {
      if (dayFilter && r.productionDate !== dayFilter) return false;
      if (shiftFilter && r.shiftName !== shiftFilter) return false;
      if (areaFilter && r.excavationAreaName !== areaFilter) return false;
      if (classFilter && classifyEarthCoal(r.acceptanceProduct) !== classFilter) return false;
      if (kw) {
        const hit = ALL_REPORT_COLUMNS.some((c) =>
          String(r[c.key] ?? "").toLowerCase().includes(kw),
        );
        if (!hit) return false;
      }
      return true;
    });
  }, [allRows, keyword, dayFilter, shiftFilter, areaFilter, classFilter]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
      return String(av ?? "").localeCompare(String(bv ?? ""), "vi", { numeric: true }) * sortDir;
    });
    return copy;
  }, [filteredRows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageRows = sortedRows.slice(page * pageSize, page * pageSize + pageSize);

  const visibleColumns = useMemo(
    () => ALL_REPORT_COLUMNS.filter((c) => visibleKeys.has(c.key as string)),
    [visibleKeys],
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["production-summary"] });
    queryClient.invalidateQueries({ queryKey: ["production-all-rows"] });
  };

  const handleCalculate = async () => {
    if (!effectivePeriodId) return;
    setCalculating(true);
    setWarnings([]);
    try {
      const res = await productionService.calculate(effectivePeriodId, tkeMode);
      setWarnings(res.warnings ?? []);
      refresh();
      toast.success(
        `Đã tính ${res.tripCount} chuyến, sinh ${res.coefficientRowCount} dòng hệ số.`,
      );
    } catch (e: unknown) {
      const r = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(r?.data?.message ?? "Tính sản lượng thất bại.");
    } finally {
      setCalculating(false);
    }
  };

  const handleExport = () => {
    if (!summary) return;
    if (allRows.length === 0) {
      toast.error("Kỳ này chưa có kết quả để xuất. Bấm “Tính lại kỳ” trước.");
      return;
    }
    downloadProductionReport(summary, allRows);
    toast.success(`Đã xuất ${allRows.length} dòng.`);
  };

  const resetFilters = () => {
    setKeyword("");
    setDayFilter("");
    setShiftFilter("");
    setAreaFilter("");
    setClassFilter("");
  };

  const sortBy = (key: keyof ProductionReportRow) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const toggleColumn = (key: string, on: boolean) =>
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  const toggleGroupColumns = (cols: ReportColumn[], on: boolean) =>
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      cols.forEach((c) => (on ? next.add(c.key as string) : next.delete(c.key as string)));
      return next;
    });
  const setPreset = (kind: "all" | "none" | "main") => {
    if (kind === "all") setVisibleKeys(new Set(ALL_REPORT_COLUMNS.map((c) => c.key as string)));
    else if (kind === "none") setVisibleKeys(new Set());
    else setVisibleKeys(new Set(REPORT_COLUMN_GROUPS[0].columns.map((c) => c.key as string)));
  };

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Thống kê sản lượng</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Báo cáo thống kê</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">
            Bảng tính sản lượng {summary ? summary.periodName.toLowerCase() : ""}
          </h1>
          <p className="text-xs text-muted-foreground">
            {allRows.length.toLocaleString("vi-VN")} dòng dữ liệu · {visibleColumns.length}/
            {ALL_REPORT_COLUMNS.length} cột hiển thị · Sản lượng tính theo KỲ, hệ số trắc địa
            phụ thuộc tổng của cả kỳ.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExport}>
          <Download className="h-4 w-4" /> Xuất Excel
        </Button>
      </div>

      {/* ── Thanh kỳ báo cáo ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <Field label="Năm">
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 w-[90px]"
          />
        </Field>
        <Field label="Tháng">
          <Input
            type="number"
            min={1}
            max={12}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-9 w-[80px]"
          />
        </Field>
        <Field label="Kỳ">
          <select
            value={effectivePeriodId ?? ""}
            onChange={(e) => setPeriodId(Number(e.target.value))}
            className="h-9 min-w-[220px] rounded-md border bg-transparent px-2 text-sm"
          >
            {periods.length === 0 && <option value="">— chưa có kỳ nào —</option>}
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} ({p.dayCount} ngày)
              </option>
            ))}
          </select>
        </Field>

        <label className="flex h-9 items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-blue-600"
            checked={tkeMode}
            onChange={(e) => setTkeMode(e.target.checked)}
          />
          Chế độ TKE
        </label>

        <Button
          size="sm"
          className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
          disabled={!effectivePeriodId || calculating}
          onClick={handleCalculate}
        >
          <Calculator className="h-4 w-4" />
          {calculating ? "Đang tính…" : "Tính lại kỳ"}
        </Button>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0" title="Làm mới" onClick={refresh}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            <TriangleAlert className="h-4 w-4" />
            {warnings.length} cảnh báo khi tính
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Thẻ số tổng quan ─────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Số chuyến" value={summary.rowCount.toLocaleString("vi-VN")} hint={`${vehicleCount} xe hoạt động`} />
          <Kpi label="Tổng m³" value={fmt(summary.totalM3, 1)} hint="Trước áp hệ số trắc địa" />
          <Kpi label="KLVC cuối" value={`${fmt(summary.finalTon, 1)} tấn`} hint="Đã áp hệ số trắc địa" />
          <Kpi label="Tổng T.km cuối" value={fmt(summary.finalTkm, 0)} hint="Khối lượng vận chuyển" />
          <Kpi label="Số trắc địa" value={fmt(summary.surveyTon, 1)} hint="Tổng tấn tra từ danh mục STD" />
          <Kpi
            label="Chế độ tính"
            value={summary.tkeMode ? "TKE" : "Trắc địa"}
            hint={summary.tkeMode ? "Không áp hệ số trắc địa" : "Có áp hệ số trắc địa"}
          />
        </div>
      )}
      {!summary && effectivePeriodId && (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Kỳ này chưa được tính lần nào. Bấm “Tính lại kỳ” để bắt đầu.
        </div>
      )}

      {/* ── Bộ lọc theo thuộc tính dòng ──────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <Field label="Ngày">
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="h-9 min-w-[130px] rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="">Tất cả ngày</option>
            {dayOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>
        <Field label="Ca">
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="h-9 min-w-[110px] rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="">Tất cả ca</option>
            {shiftOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Khu vực xúc">
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="h-9 min-w-[150px] rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="">Tất cả</option>
            {areaOptions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </Field>
        <Field label="Phân loại">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value as "" | "Đất" | "Than")}
            className="h-9 min-w-[120px] rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="">Đất & Than</option>
            <option value="Đất">Đất</option>
            <option value="Than">Than</option>
          </select>
        </Field>
        <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs" onClick={resetFilters}>
          <RotateCcw className="h-3.5 w-3.5" /> Đặt lại bộ lọc
        </Button>
      </div>

      {/* ── Bảng dữ liệu ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-2.5">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm trong tất cả các dòng đang tải…"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setColumnPanelOpen(true)}>
            <Columns3 className="h-3.5 w-3.5" /> Cột hiển thị{" "}
            <b>{visibleColumns.length}/{ALL_REPORT_COLUMNS.length}</b>
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setPreset("main")}>
            Cột chính
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setPreset("all")}>
            Tất cả cột
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            title={compact ? "Chuyển sang dòng thoáng" : "Chuyển sang dòng gọn"}
            onClick={() => setCompact((v) => !v)}
          >
            {compact ? <Menu className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            Mật độ
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b px-3 py-1.5 text-[11px] text-muted-foreground">
          {REPORT_COLUMN_GROUPS.map((g) => (
            <span key={g.title} className="flex items-center gap-1.5 whitespace-nowrap">
              <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: g.color }} />
              {g.title}
            </span>
          ))}
        </div>

        <div className="overflow-auto" style={{ maxHeight: "60vh" }}>
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="sticky left-0 top-0 z-30 border-b border-r bg-muted px-2 py-1.5 text-left font-bold"
                  style={{ minWidth: 90 }}
                >
                  Mã dòng
                </th>
                {REPORT_COLUMN_GROUPS.map((g) => {
                  const cols = g.columns.filter((c) => visibleKeys.has(c.key as string));
                  if (cols.length === 0) return null;
                  return (
                    <th
                      key={g.title}
                      colSpan={cols.length}
                      className="sticky top-0 z-20 border-b border-r px-2 py-1.5 text-center font-bold"
                      style={{ background: `color-mix(in srgb, ${g.color} 16%, white)` }}
                    >
                      {g.title}
                    </th>
                  );
                })}
              </tr>
              <tr>
                {visibleColumns.map((c, i) => {
                  const gIdx = REPORT_COLUMN_GROUPS.findIndex((g) => g.columns.includes(c));
                  const g = REPORT_COLUMN_GROUPS[gIdx];
                  const frozen = i < FROZEN_COLUMN_COUNT;
                  return (
                    <th
                      key={c.key}
                      onClick={() => sortBy(c.key)}
                      className={cn(
                        "sticky top-[29px] z-20 cursor-pointer select-none whitespace-nowrap border-b border-r px-2 py-1.5 text-left font-semibold",
                        c.width,
                        frozen && "z-30",
                      )}
                      style={{
                        background: `color-mix(in srgb, ${g.color} 6%, white)`,
                        left: frozen ? frozenOffset(i) : undefined,
                      }}
                      title={`${g.title} · ${c.label}`}
                    >
                      {c.label}
                      {sortKey === c.key && (
                        <ArrowUpDown className="ml-1 inline h-3 w-3 text-blue-600" />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-6 text-center text-muted-foreground">
                    Đang tải…
                  </td>
                </tr>
              )}
              {!isLoading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-8 text-center text-muted-foreground">
                    {summary && summary.rowCount === 0
                      ? "Kỳ này chưa được tính. Bấm “Tính lại kỳ” để bắt đầu."
                      : "Không có dòng nào khớp bộ lọc."}
                  </td>
                </tr>
              )}
              {pageRows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setDrawerRow(r)}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 border-b border-r bg-card font-semibold text-blue-600 hover:underline",
                      compact ? "px-2 py-1" : "px-2 py-2",
                    )}
                  >
                    BC-{String(r.id).padStart(4, "0")}
                  </td>
                  {visibleColumns.map((c, i) => (
                    <td
                      key={c.key}
                      className={cn(
                        "whitespace-nowrap border-b border-r",
                        compact ? "px-2 py-1" : "px-2 py-2",
                        c.numeric ? "text-right tabular-nums" : "text-left",
                        i < FROZEN_COLUMN_COUNT && "sticky z-10 bg-card",
                      )}
                      style={i < FROZEN_COLUMN_COUNT ? { left: frozenOffset(i) } : undefined}
                    >
                      {formatCell(r[c.key], c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
          <span>
            Hiển thị {sortedRows.length === 0 ? 0 : page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, sortedRows.length)} / {sortedRows.length} dòng
            {sortedRows.length !== allRows.length ? ` (đã lọc từ ${allRows.length})` : ""}
          </span>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="h-7 rounded-md border bg-transparent px-1.5 text-xs"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}/trang</option>
              ))}
            </select>
            <Button variant="outline" size="sm" className="h-7 px-2" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Trước
            </Button>
            <span>Trang {page + 1}/{totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>

      {(columnPanelOpen || drawerRow) && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => {
            setColumnPanelOpen(false);
            setDrawerRow(null);
          }}
        />
      )}

      {columnPanelOpen && (
        <ColumnPanel
          search={columnSearch}
          onSearch={setColumnSearch}
          visibleKeys={visibleKeys}
          onToggleColumn={toggleColumn}
          onToggleGroup={toggleGroupColumns}
          onPreset={setPreset}
          onClose={() => setColumnPanelOpen(false)}
        />
      )}

      {drawerRow && <DetailDrawer row={drawerRow} onClose={() => setDrawerRow(null)} />}
    </div>
  );
}

const FROZEN_WIDTHS = [90, 110, 80];
const frozenOffset = (index: number) =>
  FROZEN_WIDTHS.slice(0, index).reduce((a, b) => a + b, 0);

const fmt = (v: number, scale = 3) =>
  v.toLocaleString("vi-VN", { minimumFractionDigits: scale, maximumFractionDigits: scale });

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[11px] font-bold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-[11px] text-emerald-600 dark:text-emerald-400">{hint}</div>
    </div>
  );
}

function ColumnPanel({
  search,
  onSearch,
  visibleKeys,
  onToggleColumn,
  onToggleGroup,
  onPreset,
  onClose,
}: {
  search: string;
  onSearch: (v: string) => void;
  visibleKeys: Set<string>;
  onToggleColumn: (key: string, on: boolean) => void;
  onToggleGroup: (cols: ReportColumn[], on: boolean) => void;
  onPreset: (kind: "all" | "none" | "main") => void;
  onClose: () => void;
}) {
  const q = search.toLowerCase();
  return (
    <aside className="fixed right-4 top-20 z-50 flex h-[min(760px,calc(100vh-110px))] w-[min(480px,calc(100vw-30px))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <b>Thiết lập cột hiển thị</b>
          <div className="text-xs text-muted-foreground">Bật/tắt từng cột hoặc cả nhóm nghiệp vụ</div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b p-3">
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Tìm tên hoặc mã cột…"
          className="h-8 w-full text-xs"
        />
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onPreset("all")}>
          Chọn tất cả
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onPreset("none")}>
          Bỏ tất cả
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onPreset("main")}>
          Chỉ cột chính
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {REPORT_COLUMN_GROUPS.map((g) => {
          const cols = g.columns.filter((c) => (c.key + " " + c.label).toLowerCase().includes(q));
          if (cols.length === 0) return null;
          const allOn = cols.every((c) => visibleKeys.has(c.key as string));
          return (
            <div key={g.title} className="border-b py-2 last:border-b-0">
              <label className="flex items-center gap-2 py-1 font-semibold">
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={(e) => onToggleGroup(cols, e.target.checked)}
                  className="h-4 w-4"
                  style={{ accentColor: g.color }}
                />
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: g.color }} />
                {g.title} <span className="font-normal text-muted-foreground">({cols.length})</span>
              </label>
              {cols.map((c) => (
                <label
                  key={c.key}
                  className="grid grid-cols-[20px_44px_1fr] items-center gap-2 rounded px-1 py-1 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={visibleKeys.has(c.key as string)}
                    onChange={(e) => onToggleColumn(c.key as string, e.target.checked)}
                    className="h-4 w-4"
                  />
                  <code className="text-[11px]" style={{ color: g.color }}>{c.key}</code>
                  <span className="truncate text-xs">{c.label}</span>
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function DetailDrawer({ row, onClose }: { row: ProductionReportRow; onClose: () => void }) {
  return (
    <aside className="fixed right-0 top-0 z-50 h-screen w-[min(640px,95vw)] overflow-auto border-l bg-card shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-blue-900 p-4 text-white">
        <div>
          <b>Chi tiết chuyến BC-{String(row.id).padStart(4, "0")}</b>
          <div className="text-xs text-blue-200">Nguồn: sheet “tinh toan” · id chuyến gốc {row.transportTripId ?? "—"}</div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10 hover:text-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4">
        {REPORT_COLUMN_GROUPS.map((g) => (
          <section key={g.title} className="mb-3 overflow-hidden rounded-lg border">
            <h4
              className="m-0 px-3 py-2 text-sm font-bold"
              style={{ background: `color-mix(in srgb, ${g.color} 14%, white)` }}
            >
              {g.title}
            </h4>
            <div className="grid grid-cols-1 gap-x-3 p-3 sm:grid-cols-2">
              {g.columns.map((c) => (
                <div key={c.key} className="border-b py-1.5 last:border-b-0">
                  <small className="block text-muted-foreground">
                    <code style={{ color: g.color }}>{c.key}</code> · {c.label}
                  </small>
                  <b className="text-sm">{formatCell(row[c.key], c) || "—"}</b>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

export default ProductionReportPage;
