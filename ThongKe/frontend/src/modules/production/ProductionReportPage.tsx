import RowsPerPage, { PageArrows } from "@/components/table/RowsPerPage";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from "@tanstack/react-table";
import { BarChart3, Download, ArrowUpDown, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ColumnToggleMenu from "@/components/table/ColumnToggleMenu";
import ColumnFilterButton from "@/components/table/ColumnFilterButton";
import { displayTextFilter, useTanstackLayout } from "@/components/table/useTanstackLayout";
import { currentMonthRange } from "@/lib/utils";
import { productionService, type ProductionReportRow } from "./productionService";
import { ALL_REPORT_COLUMNS, cellValue, formatCell } from "./productionReportColumns";
import { downloadProductionRows } from "./productionExcel";

const widthOf = (w: string): number => Number(w.match(/(\d+)px/)?.[1] ?? 120);

/**
 * Báo cáo thống kê — BẢNG XEM thống kê sản lượng sau khi đã có số liệu (cùng kiểu màn Báo chuyến):
 * không theo kỳ, không thẻ tổng hợp, chưa có bộ lọc phía trên (sẽ bổ sung sau). Tạm hiện số liệu của THÁNG HIỆN TẠI
 * theo ngày sản xuất. Số liệu do hệ thống tự tính sau khi Đối chiếu duyệt chuyến (xem `ProductionAutoRecalculateListener`).
 * Cột dùng chung với file Excel xuất ra.
 */
export default function ProductionReportPage() {
  const { from: startDate, to: endDate } = useMemo(() => currentMonthRange(), []);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["production-rows-by-date", startDate, endDate],
    queryFn: () => productionService.rowsByDate(startDate, endDate),
  });

  // Hiển thị bảng do người dùng chọn (độ rộng cột, chiều cao hàng), lưu theo từng bảng — như các bảng khác
  const layout = useTanstackLayout("production-report");

  // Cột bảng sinh từ định nghĩa dùng chung (cùng thứ tự/nhãn với file Excel)
  const columns = useMemo<ColumnDef<ProductionReportRow>[]>(
    () => [
      // Chỉ đúng các cột trong danh sách của chủ dự án — không thêm cột STT hay cột nào khác.
      ...ALL_REPORT_COLUMNS.map<ColumnDef<ProductionReportRow>>((c) => ({
        id: c.key,
        accessorFn: (row) => cellValue(row, c),
        meta: { headerTitle: c.label },
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-7 px-1 text-sm font-bold hover:bg-transparent"
            title={c.excel ? `${c.label} — cột ${c.excel} của sheet tinh toan` : c.label}
          >
            {c.label}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className={c.numeric ? "tabular-nums" : undefined}>{formatCell(getValue(), c)}</span>
        ),
        size: Math.max(widthOf(c.width), c.label.length * 9 + 56),
      })),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility, columnFilters, columnSizing: layout.columnSizing },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onColumnSizingChange: layout.setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    defaultColumn: { filterFn: displayTextFilter },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => String(row.id),
    initialState: { pagination: { pageSize: 15 } },
  });

  const filteredCount = table.getFilteredRowModel().rows.length;

  const handleExport = () => {
    // Xuất đúng các dòng đang xem (sau lọc cột), theo thứ tự đang sắp xếp
    const shown = table.getSortedRowModel().rows.map((r) => r.original);
    if (shown.length === 0) {
      toast.warning("Không có dòng thống kê nào để xuất Excel!");
      return;
    }
    downloadProductionRows(shown, startDate, endDate);
    toast.success(`Đã xuất ${shown.length} dòng ra file Excel.`);
  };

  const pageState = table.getState().pagination;

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-gray-950 min-h-screen text-slate-900 dark:text-slate-100">
      {/* ══ 1. TOP HEADER BAR ═══════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">BÁO CÁO THỐNG KÊ SẢN LƯỢNG</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Số liệu thống kê sản lượng từng chuyến sau khi đối chiếu và tính toán
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExport}
            size="sm"
            className="h-9 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Excel
          </Button>
        </div>
      </div>

      {/* ══ 2. TABLE CARD ═══════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm font-bold text-gray-900 dark:text-gray-100">
            <Table2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>BẢNG THỐNG KÊ SẢN LƯỢNG</span>
          </div>
        </div>

        {/* Thanh công cụ: nút chỉnh bảng BÊN TRÁI (Hiển thị cột, Hiển thị bảng), rồi tổng số bản ghi */}
        <div className="flex items-center gap-2">
          <ColumnToggleMenu table={table} />
          {layout.button}
          <span className="ml-1 text-xs font-semibold text-gray-500">
            Tổng số bản ghi: <strong className="text-gray-900 dark:text-gray-100">{filteredCount}</strong>
          </span>
        </div>

        <div
          ref={layout.containerRef}
          className={`${layout.rowClass} border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto bg-white dark:bg-gray-900 shadow-sm`}
        >
          <Table className="text-xs border-collapse" style={{ width: "100%", minWidth: table.getTotalSize(), tableLayout: "fixed" }}>
            <colgroup>
              {table.getVisibleLeafColumns().map((column) => (
                <col key={column.id} style={{ width: column.getSize() }} />
              ))}
            </colgroup>
            <TableHeader className="bg-blue-500 dark:bg-blue-500">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-blue-500 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-500 text-white text-sm font-bold border-b border-blue-600 dark:border-blue-600"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      data-col={header.column.id}
                      style={{ width: header.getSize(), position: "relative" }}
                      className="px-1.5 py-1.5 text-center border-r border-blue-400/60 dark:border-blue-400/60 text-white font-bold whitespace-normal break-words leading-tight align-middle min-h-[36px] overflow-hidden [&_button]:text-white [&_button]:hover:text-white [&_button]:hover:bg-blue-600/50"
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="min-w-0 truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          {header.column.getCanFilter() && <ColumnFilterButton column={header.column} table={table} />}
                        </div>
                      )}
                      {layout.resizer(header)}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`border-b border-gray-100 dark:border-gray-800/60 transition-colors ${
                      row.index % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50/50 dark:bg-gray-900/40"
                    } hover:bg-blue-50/30 dark:hover:bg-blue-950/20`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        data-col={cell.column.id}
                        style={{ width: cell.column.getSize() }}
                        className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60 whitespace-nowrap overflow-hidden text-ellipsis"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-xs text-gray-400">
                    {isLoading
                      ? "Đang tải…"
                      : rows.length === 0
                        ? "Chưa có số liệu thống kê."
                        : "Không có dòng thống kê nào phù hợp bộ lọc cột!"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1 text-xs text-gray-600 dark:text-gray-400">
          <RowsPerPage
            value={pageState.pageSize}
            onChange={(n) => table.setPageSize(n)}
            from={filteredCount ? pageState.pageIndex * pageState.pageSize + 1 : 0}
            to={Math.min((pageState.pageIndex + 1) * pageState.pageSize, filteredCount)}
            total={filteredCount}
          />
          <PageArrows
            canPrev={table.getCanPreviousPage()}
            canNext={table.getCanNextPage()}
            onPrev={() => table.previousPage()}
            onNext={() => table.nextPage()}
            onFirst={() => table.setPageIndex(0)}
            onLast={() => table.setPageIndex(Math.max(0, table.getPageCount() - 1))}
          />
        </div>
      </div>
    </div>
  );
}
