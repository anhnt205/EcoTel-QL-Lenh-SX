import React, { useMemo, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator, Download, RotateCcw, TriangleAlert } from "lucide-react";
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
  formatCell,
} from "./productionReportColumns";
import { productionService } from "./productionService";

const PAGE_SIZE = 20;

/**
 * Màn "Báo cáo thống kê" — đầu ra cuối cùng, tương ứng sheet `tinh toan`.
 *
 * Mỗi dòng là một chuyến đã đối soát. Cột gom thành 6 nhóm theo trình tự
 * nghiệp vụ, ba cột đầu đóng băng khi cuộn ngang.
 */
export function ProductionReportPage() {
  const queryClient = useQueryClient();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [periodId, setPeriodId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [tkeMode, setTkeMode] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

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

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["production-rows", effectivePeriodId, keyword, page],
    queryFn: () =>
      productionService.rows(effectivePeriodId!, keyword, page, PAGE_SIZE),
    enabled: !!effectivePeriodId,
    placeholderData: keepPreviousData,
  });

  const rows = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 0;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["production-summary"] });
    queryClient.invalidateQueries({ queryKey: ["production-rows"] });
  };

  const handleCalculate = async () => {
    if (!effectivePeriodId) return;
    setCalculating(true);
    setWarnings([]);
    try {
      const res = await productionService.calculate(effectivePeriodId, tkeMode);
      setWarnings(res.warnings ?? []);
      setPage(0);
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

  const handleExport = async () => {
    if (!effectivePeriodId || !summary) return;
    try {
      const all = await productionService.allRows(effectivePeriodId);
      if (all.length === 0) {
        toast.error("Kỳ này chưa có kết quả để xuất. Bấm “Tính lại kỳ” trước.");
        return;
      }
      downloadProductionReport(summary, all);
      toast.success(`Đã xuất ${all.length} dòng.`);
    } catch {
      toast.error("Xuất Excel thất bại.");
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4 md:p-6">
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
            Báo cáo thống kê
          </h1>
          <p className="text-xs text-muted-foreground">
            Mỗi dòng là một chuyến đã đối soát. Sản lượng được tính theo KỲ —
            hệ số trắc địa phụ thuộc tổng của cả kỳ.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
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
              onChange={(e) => {
                setPeriodId(Number(e.target.value));
                setPage(0);
              }}
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
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={refresh}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExport}>
            <Download className="h-4 w-4" /> Xuất Excel
          </Button>
        </div>
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

      {summary && <SummaryBar summary={summary} />}

      <div className="flex items-center gap-2">
        <Input
          placeholder="Tìm theo khoá Nhóm vỉa + Máy xúc, sản phẩm nghiệm thu…"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(0);
          }}
          className="h-9 max-w-[420px]"
        />
        <span className="text-xs text-muted-foreground">
          {pageData?.totalElements ?? 0} dòng
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              {REPORT_COLUMN_GROUPS.map((g) => (
                <th
                  key={g.title}
                  colSpan={g.columns.length}
                  className={cn(
                    "sticky top-0 z-20 border-b border-r px-2 py-1.5 text-center font-bold",
                    g.tone,
                  )}
                >
                  {g.title}
                </th>
              ))}
            </tr>
            <tr>
              {ALL_REPORT_COLUMNS.map((c, i) => (
                <th
                  key={c.key}
                  className={cn(
                    "sticky top-[29px] z-20 border-b border-r bg-muted px-2 py-1.5 font-semibold",
                    c.width,
                    c.numeric ? "text-right" : "text-left",
                    i < FROZEN_COLUMN_COUNT && "left-0 z-30",
                  )}
                  style={i < FROZEN_COLUMN_COUNT ? { left: frozenOffset(i) } : undefined}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={ALL_REPORT_COLUMNS.length} className="p-6 text-center text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={ALL_REPORT_COLUMNS.length} className="p-8 text-center text-muted-foreground">
                  {summary && summary.rowCount === 0
                    ? "Kỳ này chưa được tính. Bấm “Tính lại kỳ” để bắt đầu."
                    : "Không có dòng nào khớp từ khoá."}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/40">
                {ALL_REPORT_COLUMNS.map((c, i) => (
                  <td
                    key={c.key}
                    className={cn(
                      "whitespace-nowrap border-b border-r px-2 py-1",
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

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <span className="text-muted-foreground">
            Trang {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}>
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}

/** Bề rộng cố định của các cột đóng băng, khớp `min-w` khai trong cấu hình. */
const FROZEN_WIDTHS = [110, 80, 90];
const frozenOffset = (index: number) =>
  FROZEN_WIDTHS.slice(0, index).reduce((a, b) => a + b, 0);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function SummaryBar({
  summary,
}: {
  summary: import("./productionService").ProductionReportSummary;
}) {
  const fmt = (v: number, scale = 3) =>
    v.toLocaleString("vi-VN", { minimumFractionDigits: scale, maximumFractionDigits: scale });

  if (summary.rowCount === 0) {
    return (
      <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
        Kỳ <b>{summary.periodName}</b> ({summary.fromDate} → {summary.toDate},{" "}
        {summary.dayCount} ngày) chưa được tính lần nào.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md border bg-muted/40 px-3 py-2 text-xs">
      <span>
        Kỳ <b>{summary.periodName}</b> · {summary.dayCount} ngày ·{" "}
        {summary.rowCount} chuyến
      </span>
      <span className={summary.tkeMode ? "font-semibold text-amber-700" : ""}>
        Chế độ: {summary.tkeMode ? "TKE (không áp hệ số trắc địa)" : "Trắc địa"}
      </span>
      <span>Tổng m3: <b>{fmt(summary.totalM3)}</b></span>
      <span>Tổng tấn: <b>{fmt(summary.totalTon)}</b></span>
      <span>Tấn cuối: <b className="text-emerald-700 dark:text-emerald-400">{fmt(summary.finalTon)}</b></span>
      <span>Tkm cuối: <b className="text-emerald-700 dark:text-emerald-400">{fmt(summary.finalTkm, 4)}</b></span>
    </div>
  );
}

export default ProductionReportPage;
