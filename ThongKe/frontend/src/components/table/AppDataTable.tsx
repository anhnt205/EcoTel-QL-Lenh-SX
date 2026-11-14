"use client";

import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  getExpandedRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type PaginationState,
  type ColumnSizingState,
  type ExpandedState,
  type Row,
  type RowData,
} from "@tanstack/react-table";

// ─── Module Augmentation: Extend TanStack TableMeta for inline editing & ColumnMeta ────────
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    editingRowId?: string | null;
    editingRowDraft?: Record<string, unknown>;
    setEditingRowId?: (id: string | null) => void;
    updateCellDraft?: (columnId: string, value: unknown) => void;
    revertRow?: () => void;
    saveRow?: () => void;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "center" | "right";
    className?: string;
    headerClassName?: string;
    headerTitle?: string;
  }
}
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import TableToolbar from "./TableToolbar";
import ColumnToggleMenu from "./ColumnToggleMenu";
import ColumnFilterButton from "./ColumnFilterButton";
import { displayTextFilter } from "./useTanstackLayout";
import TablePagination from "./TablePagination";
import TableLoading from "./TableLoading";
import TableEmpty from "./TableEmpty";
import TableFilter, {
  type FilterField,
  type FilterValue,
} from "./TableFilter";
import { cn } from "@/lib/utils";
// ─── Props
type PaginationMode =
  | {
      manualPagination: true;
      /** Tổng số trang từ server — bắt buộc khi manualPagination = true */
      pageCount: number;
      /** Tổng số bản ghi từ server — để hiển thị "X bản ghi" */
      totalCount?: number;
      page?: number;
      rowsPerPage?: number;
      onPageChange?: (page: number) => void;
      onRowsPerPageChange?: (rowsPerPage: number) => void;
    }
  | {
      manualPagination?: false;
      pageCount?: never;
      totalCount?: never;
      page?: never;
      rowsPerPage?: never;
      onPageChange?: never;
      onRowsPerPageChange?: never;
    };

type SortingMode =
  | {
      manualSorting: true;
      sorting: SortingState;
      onSortingChange: (sorting: SortingState) => void;
    }
  | {
      manualSorting?: false;
      sorting?: never;
      onSortingChange?: never;
    };

type BaseProps<TData> = {
  // Core
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  manualFiltering?: boolean;

  // Default page size khi dùng internal pagination
  defaultPageSize?: number;

  /** Khoá ổn định của dòng (mặc định: chỉ số dòng). Cần khi chọn dòng phải sống sót qua lúc tải lại dữ liệu. */
  getRowId?: (row: TData, index: number) => string;
  /** Báo ra ngoài các dòng đang được chọn (đã qua bộ lọc cột) — để nút "Xoá"/"Tải xuống" ở ngoài bảng dùng. */
  onSelectionChange?: (rows: TData[]) => void;
  /** Hàng ô lọc ngay dưới tiêu đề: mỗi cột (có accessor) một ô nhập, lọc phía client trên dữ liệu đang có. */
  showColumnFilters?: boolean;
  /** Kẻ bảng rõ: viền ô/dòng đậm hơn mặc định (cả tiêu đề lẫn thân bảng). */
  gridLines?: boolean;
  /** Thu gọn chiều dọc: ô tiêu đề và ô dữ liệu đệm mỏng hơn để một màn hình hiện được nhiều dòng hơn. */
  compact?: boolean;
  /**
   * Chiều ngang bảng vừa với nội dung (không giãn hết bề rộng trang): cột co theo chữ, ô dài tối đa 420px rồi cắt "…".
   * Cột có `size` khai rõ (tick, STT, thao tác) giữ nguyên bề rộng đó.
   */
  fitContent?: boolean;
  /**
   * Bảng "chảy theo trang": rộng hết bề ngang khung chứa (bố cục cố định, cột chia theo `size`, chữ dài cắt "…"), KHÔNG có thanh cuộn riêng —
   * cuộn dùng chung của trang; tiêu đề dính (`stickyHeader`) bám theo thanh cuộn của trang đó. Dùng cho bố cục thẻ.
   */
  flow?: boolean;
  /** Cố định số dòng mỗi trang: ẩn ô chọn "Số dòng" ở thanh phân trang. */
  fixedPageSize?: boolean;
  /** Lớp màu nền tiêu đề cột (mặc định xanh nhạt `bg-blue-500`); truyền cả hover/dark: "bg-blue-700 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-700". */
  headerBg?: string;
  /** Hiện nút sắp xếp (mũi tên) ở ô tiêu đề các cột sắp xếp được (sắp xếp phía client). */
  sortableHeaders?: boolean;
  /** `id` của phần tử DOM bên NGOÀI bảng để đặt nút "Hiển thị cột" vào (thay cho thanh `columnToggleBar`). */
  columnToggleSlotId?: string;
  /** Kiểu thanh phân trang: `card` = "Hiển thị [n] bản ghi/trang" + « ‹ 1 2 › ». */
  paginationVariant?: "card";
  /** Thanh nhỏ phía trên bảng: "Tổng số bản ghi: N" bên trái, nút "Hiển thị cột" bên phải. */
  columnToggleBar?: boolean;

  // Toolbar
  title?: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  onRefresh?: () => void;
  onAdd?: () => void;
  onImportExcel?: (file: File) => void;
  importExcelAccept?: string;
  isImporting?: boolean;
  showExport?: boolean;
  onExportCsv?: (selectedRows: TData[]) => void;
  exportCsvLabel?: string;
  onExportPdf?: () => void;
  onPrint?: () => void;

  // Filter panel
  filterFields?: FilterField[];
  filterValues?: FilterValue;
  onFilterChange?: (values: FilterValue) => void;

  // UI options
  loading?: boolean;
  bordered?: boolean;
  striped?: boolean;
  dense?: boolean;
  hoverable?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  fullHeight?: boolean;
  className?: string;
  showToolbar?: boolean;
  showColumnToggle?: boolean;
  showPagination?: boolean;
  emptyComponent?: React.ReactNode;
  renderSubComponent?: (row: Row<TData>) => React.ReactNode;
  getRowCanExpand?: (row: Row<TData>) => boolean;

  // Inline editing
  onSaveRow?: (updatedRow: TData) => void;
  onRowClick?: (row: TData) => void;
};

export type AppDataTableProps<TData> = BaseProps<TData> &
  PaginationMode &
  SortingMode;

// ─── Component ───────────────────────────────────────────────────────────────

export default AppDataTable;

/**
 * Bảng dữ liệu dùng chung. `preset="card"` = kiểu thẻ đồng bộ với CatalogPage (chủ dự án duyệt 2026-11-09): kẻ bảng rõ, dòng
 * gọn, hết bề ngang, không thanh cuộn riêng (cuộn theo trang), 15 dòng cố định, nút "Hiển thị cột" + tổng số bản ghi phía
 * trên bảng, không dòng kẻ sọc, không tên bảng. Các prop truyền vào vẫn ghi đè được (trừ chọn cột và tên bảng).
 * Dùng chung với khung trang `components/layout/CardPage`.
 */
function AppDataTable<TData>(props: AppDataTableProps<TData> & { preset?: "card" }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { preset, ...rest } = props as any;
  if (preset !== "card") return <AppDataTableImpl {...rest} />;
  return (
    <AppDataTableImpl
      gridLines
      compact
      flow
      striped={false}
      stickyHeader
      columnToggleBar
      fixedPageSize
      {...rest}
      showColumnToggle={false}
      title={undefined}
      className={cn(
        "rounded-none border-0 shadow-none [&_tbody_tr:hover]:!bg-blue-50",
        rest.className,
      )}
    />
  );
}

function AppDataTableImpl<TData>({
  columns,
  data,

  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  pageCount,
  totalCount,

  page: controlledPage,
  rowsPerPage: controlledRowsPerPage,
  onPageChange,
  onRowsPerPageChange,

  sorting: controlledSorting,
  onSortingChange: onControlledSortingChange,

  defaultPageSize = 15,

  getRowId,
  onSelectionChange,
  showColumnFilters = false,
  gridLines = false,
  compact = false,
  fitContent = false,
  flow = false,
  fixedPageSize = false,
  headerBg,
  sortableHeaders = false,
  columnToggleSlotId,
  paginationVariant,
  columnToggleBar = false,

  title,
  searchValue = "",
  searchPlaceholder,
  onSearch,
  onRefresh,
  onAdd,
  onImportExcel,
  importExcelAccept,
  isImporting = false,
  showExport,
  onExportCsv,
  exportCsvLabel,
  onExportPdf,
  onPrint,

  filterFields,
  filterValues = {},
  onFilterChange,

  loading = false,
  bordered = false,
  striped = true,
  dense = false,
  hoverable = true,
  stickyHeader = false,
  maxHeight,
  fullHeight = false,
  className,
  showToolbar = true,
  showColumnToggle = false,
  showPagination = true,
  emptyComponent,
  renderSubComponent,
  getRowCanExpand,
  onSaveRow,
  onRowClick,
}: AppDataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [internalPagination, setInternalPagination] = useState<PaginationState>(
    {
      pageIndex: 0,
      pageSize: defaultPageSize,
    },
  );

  // ─── Inline editing state ───────────────────────────────────────────────────
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowDraft, setEditingRowDraft] = useState<
    Record<string, unknown>
  >({});

  // Auto-prepend expander column nếu có renderSubComponent
  const finalColumns = React.useMemo(() => {
    if (!renderSubComponent) return columns;
    return [
      {
        id: "expander",
        header: () => null,
        cell: ({ row }: { row: Row<TData> }) =>
          row.getCanExpand() ? (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={row.getToggleExpandedHandler()}
                className="h-6 w-6 p-0 hover:bg-muted rounded-md transition-colors cursor-pointer flex items-center justify-center"
              >
                {row.getIsExpanded() ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          ) : null,
        size: 40,
        minSize: 40,
        enableResizing: false,
      },
      ...columns,
    ];
  }, [columns, renderSubComponent]);

  const sorting = controlledSorting ?? internalSorting;

  const pagination: PaginationState =
    controlledPage !== undefined
      ? {
          pageIndex: controlledPage,
          pageSize: controlledRowsPerPage ?? defaultPageSize,
        }
      : internalPagination;

  // ─── Fullscreen Page Size Adjustment ──────────────────────────────────────────
  const [preFullscreenPageSize, setPreFullscreenPageSize] = React.useState<
    number | null
  >(null);

  React.useEffect(() => {
    if (isFullscreen) {
      setPreFullscreenPageSize(pagination.pageSize);
      const nextSize = Math.max(pagination.pageSize, 25);
      if (controlledPage !== undefined) {
        onRowsPerPageChange?.(nextSize);
      } else {
        setInternalPagination((prev) => ({
          ...prev,
          pageSize: nextSize,
        }));
      }
    } else if (preFullscreenPageSize !== null) {
      const currentSize = pagination.pageSize;
      const wasAutoSized = currentSize === 25;
      const nextSize = wasAutoSized ? preFullscreenPageSize : currentSize;

      if (controlledPage !== undefined) {
        onRowsPerPageChange?.(nextSize);
      } else {
        setInternalPagination((prev) => ({
          ...prev,
          pageSize: nextSize,
        }));
      }
      setPreFullscreenPageSize(null);
    }
  }, [isFullscreen]);

  const table = useReactTable({
    data,
    columns: finalColumns,
    getRowId,
    // includesString: lọc "chứa chuỗi" cho cả cột số (mặc định của cột số là khoảng min–max, không hợp ô nhập chữ).
    defaultColumn: { minSize: 60, filterFn: displayTextFilter },

    // Pagination
    manualPagination,
    pageCount: manualPagination ? (pageCount ?? -1) : undefined,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;

      if (controlledPage !== undefined) {
        // Chỉ gọi callback khi thực sự thay đổi
        if (next.pageIndex !== pagination.pageIndex) {
          onPageChange?.(next.pageIndex);
        }
        if (next.pageSize !== pagination.pageSize) {
          onRowsPerPageChange?.(next.pageSize);
        }
      } else {
        setInternalPagination(next);
      }
    },

    // Sorting
    manualSorting,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (onControlledSortingChange) onControlledSortingChange(next);
      else setInternalSorting(next);
    },

    // Filtering
    manualFiltering,
    onColumnFiltersChange: setColumnFilters,

    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),

    onExpandedChange: setExpanded,
    // Fix: default false thay vì () => true để tránh tất cả row đều có expander
    getRowCanExpand: getRowCanExpand ?? (() => false),

    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onColumnSizingChange: setColumnSizing,

    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      columnSizing,
      expanded,
    },

    // ─── Meta: exposed to all cells for inline editing ──────────────────────
    meta: {
      editingRowId,
      editingRowDraft,
      setEditingRowId: (id: string | null) => {
        if (id !== null) {
          // Entering edit mode: snapshot the current row data into draft
          const row = data.find(
            (_, idx) =>
              String(idx) === id ||
              (data[idx] as Record<string, unknown>)["id"] === id,
          );
          if (row) {
            setEditingRowDraft({ ...(row as Record<string, unknown>) });
          }
        } else {
          setEditingRowDraft({});
        }
        setEditingRowId(id);
      },
      updateCellDraft: (columnId: string, value: unknown) => {
        setEditingRowDraft((prev) => ({ ...prev, [columnId]: value }));
      },
      revertRow: () => {
        setEditingRowDraft({});
        setEditingRowId(null);
      },
      saveRow: () => {
        if (onSaveRow && editingRowId !== null) {
          onSaveRow(editingRowDraft as TData);
        }
        setEditingRowDraft({});
        setEditingRowId(null);
      },
    },
  });

  const hasActiveFilters = Object.values(filterValues).some((v) => v !== "");
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  // Báo dòng đang chọn ra ngoài. Chỉ chạy khi chọn/dữ liệu/bộ lọc đổi (không mỗi lần render).
  // Nút "Hiển thị cột" đặt ở chỗ khác ngoài bảng (phần tử có id = columnToggleSlotId): tìm sau khi trang dựng xong.
  const [toggleSlot, setToggleSlot] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    setToggleSlot(columnToggleSlotId ? document.getElementById(columnToggleSlotId) : null);
  }, [columnToggleSlotId]);
  const selectionCbRef = React.useRef(onSelectionChange);
  selectionCbRef.current = onSelectionChange;
  React.useEffect(() => {
    selectionCbRef.current?.(
      table.getFilteredSelectedRowModel().rows.map((r) => r.original),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection, data, columnFilters]);

  const showEmptyState = !loading && data.length === 0;
  const showTable = !loading && data.length > 0;

  return (
    <div
      className={cn(
        "bg-card shadow-sm border flex flex-col w-full",
        // vừa nội dung: khung co theo bảng, nhưng không hẹp hơn thanh phân trang
        fitContent && !isFullscreen && "mx-auto w-fit max-w-full min-w-[560px]",
        fullHeight || isFullscreen ? "flex-1 min-h-0 h-full" : "h-auto",
        bordered ? "border-border" : "border-transparent",
        isFullscreen
          ? "fixed inset-0 z-50 m-0 rounded-none w-screen h-screen overflow-hidden"
          : cn("rounded-xl overflow-hidden", flow && "overflow-visible"),
        className,
      )}
    >
      {/* Toolbar */}
      {showToolbar && (
        <TableToolbar
          title={title}
          searchValue={searchValue}
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          onRefresh={onRefresh}
          onAdd={onAdd}
          onImportExcel={onImportExcel}
          importExcelAccept={importExcelAccept}
          isImporting={isImporting}
          showExport={showExport}
          onExportCsv={
            onExportCsv
              ? () => {
                  const selectedRows = table
                    .getFilteredSelectedRowModel()
                    .rows.map((r) => r.original);
                  onExportCsv(selectedRows);
                }
              : undefined
          }
          exportCsvLabel={exportCsvLabel}
          onExportPdf={onExportPdf}
          onPrint={onPrint}
          showFilter={Boolean(filterFields?.length)}
          filterActive={filterOpen || hasActiveFilters}
          onFilterToggle={() => setFilterOpen((v) => !v)}
          filterNode={
            filterFields ? (
              <TableFilter
                open={filterOpen}
                fields={filterFields}
                values={filterValues}
                onChange={(vals) => onFilterChange?.(vals)}
                onReset={() => onFilterChange?.({})}
              />
            ) : undefined
          }
          showColumnToggle={showColumnToggle}
          toggleableColumns={table
            .getAllLeafColumns()
            .filter((column) => column.getCanHide() && column.id !== "expander")
            .map((column) => ({
              id: column.id,
              label:
                column.columnDef.meta?.headerTitle ??
                (typeof column.columnDef.header === "string"
                  ? column.columnDef.header
                  : column.id),
              isVisible: column.getIsVisible(),
              onToggle: (val) => column.toggleVisibility(!!val),
            }))}
          selectedCount={selectedCount}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((v) => !v)}
        />
      )}

      {/* Thanh phía trên bảng: tổng số bản ghi + nút "Hiển thị cột" (đứng riêng, không nằm trong tiêu đề) */}
      {columnToggleSlotId && toggleSlot && createPortal(<ColumnToggleMenu table={table} />, toggleSlot)}
      {columnToggleBar && (
        <div className={cn("flex items-center justify-between gap-3 border-b bg-card px-3", compact ? "py-1" : "py-2")}>
          <span className="text-sm text-muted-foreground">
            Tổng số bản ghi:{" "}
            <span className="font-bold text-foreground">
              {totalCount ?? table.getFilteredRowModel().rows.length}
            </span>
          </span>
          <ColumnToggleMenu table={table} />
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <TableLoading rows={pagination.pageSize} columns={columns.length} />
      )}

      {/* Empty state */}
      {showEmptyState &&
        (emptyComponent || (
          <TableEmpty
            type={hasActiveFilters ? "no-results" : "empty"}
            onAction={hasActiveFilters ? undefined : onAdd}
          />
        ))}

      {/* Table Views */}
      {showTable && (
        <div className={cn("relative flex flex-col", (fullHeight || isFullscreen) && "flex-1 min-h-0")}>
          {/* Overlay loading khi đang sort/filter với data sẵn có (server-side) */}
          {loading && (
            <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <Table
            containerClassName={cn(
              "w-full overflow-x-auto",
              flow && "overflow-visible",
              (fullHeight || isFullscreen) && "flex-1 min-h-0 overflow-y-auto",
              fitContent && "w-fit max-w-full",
              gridLines && "rounded-none border-slate-400 dark:border-slate-600",
            )}
            containerStyle={{
              maxHeight: isFullscreen ? undefined : maxHeight,
            }}
            className={cn(dense && "text-xs")}
            style={
              fitContent
                ? { tableLayout: "auto", width: "auto" }
                : {
                    tableLayout: "fixed",
                    width: "100%",
                    minWidth: table.getTotalSize(),
                  }
            }
          >
            <TableHeader
              className={cn(stickyHeader && "sticky top-0 z-10 bg-blue-500", headerBg)}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className={cn("border-b border-blue-600 bg-blue-500 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-500", headerBg)}
                >
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    const align = meta?.align ?? "center";
                    const alignClass =
                      align === "left"
                        ? "text-left"
                        : align === "right"
                        ? "text-right"
                        : "text-center";

                    return (
                      <TableHead
                        key={header.id}
                        style={{
                          // vừa nội dung: chỉ cột khai `size` rõ mới bị ép bề rộng
                          width:
                            fitContent && header.column.columnDef.size === undefined
                              ? undefined
                              : header.getSize(),
                          minWidth: fitContent
                            ? undefined
                            : (header.column.columnDef as { minSize?: number })
                                .minSize,
                        }}
                        className={cn(
                          "relative px-4 py-3.5 font-bold text-white dark:text-white text-sm whitespace-nowrap border-r border-blue-400/60 last:border-r-0 overflow-hidden text-ellipsis align-middle",
                          gridLines && "border-blue-200/80",
                          compact && "h-auto px-2 py-1.5",
                          alignClass,
                          meta?.headerClassName || meta?.className
                        )}
                      >
                        {header.isPlaceholder ? null : (showColumnFilters &&
                            header.column.getCanFilter()) ||
                          (sortableHeaders && header.column.getCanSort()) ? (
                          // Sắp xếp (mũi tên) + lọc theo cột (3 chấm dọc) NGAY TRONG ô tiêu đề; bấm 3 chấm mới hiện ô nhập nội dung lọc.
                          <div className="flex items-center justify-center gap-1">
                            <span className="min-w-0 truncate">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </span>
                            {sortableHeaders && header.column.getCanSort() && (
                              <button
                                type="button"
                                title="Sắp xếp"
                                aria-label="Sắp xếp"
                                onClick={header.column.getToggleSortingHandler()}
                                className="shrink-0 rounded p-0.5 text-white/90 hover:bg-white/20"
                              >
                                {header.column.getIsSorted() === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5" />
                                ) : header.column.getIsSorted() === "desc" ? (
                                  <ArrowDown className="h-3.5 w-3.5" />
                                ) : (
                                  <ArrowUpDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                            {showColumnFilters && header.column.getCanFilter() && (
                              <ColumnFilterButton column={header.column} table={table} />
                            )}
                          </div>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )
                        )}
                        {header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              "absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none",
                              "bg-primary/20 opacity-0 hover:opacity-100 transition-opacity",
                              header.column.getIsResizing() &&
                                "bg-primary opacity-100 w-2 z-10",
                            )}
                          />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody className={cn(gridLines && "divide-slate-300 dark:divide-slate-600")}>
              {table.getRowModel().rows.map((row, index) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      "transition-colors",
                      gridLines && "border-b border-slate-300 dark:border-slate-600",
                      hoverable && "hover:bg-muted/50",
                      row.getIsSelected() && "bg-muted/80",
                      striped &&
                        index % 2 === 1 &&
                        !row.getIsSelected() &&
                        "bg-muted/20",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      const align = meta?.align ?? "center";
                      const alignClass =
                        align === "left"
                          ? "text-left"
                          : align === "right"
                          ? "text-right"
                          : "text-center";

                      return (
                        <TableCell
                          key={cell.id}
                          style={{
                            width:
                              fitContent && cell.column.columnDef.size === undefined
                                ? undefined
                                : cell.column.getSize(),
                            minWidth: fitContent
                              ? undefined
                              : (cell.column.columnDef as { minSize?: number })
                                  .minSize,
                          }}
                          className={cn(
                            "px-4 py-3 text-sm border-r last:border-r-0 overflow-hidden text-ellipsis whitespace-nowrap align-middle",
                            gridLines && "border-slate-300 dark:border-slate-600",
                            compact && "px-2 py-1",
                            fitContent && "max-w-[420px]",
                            alignClass,
                            meta?.className
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  <AnimatePresence initial={false}>
                    {row.getIsExpanded() && renderSubComponent && (
                      <TableRow>
                        <TableCell
                          colSpan={row.getVisibleCells().length}
                          className="p-0 border-b border-border bg-muted/5"
                        >
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 shadow-inner border-t border-border">
                              {renderSubComponent(row)}
                            </div>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {showPagination && !loading && data.length > 0 && (
        <TablePagination
          table={table}
          showPageSize={!fixedPageSize}
          variant={paginationVariant}
          totalCount={
            totalCount ?? (manualPagination ? undefined : data.length)
          }
        />
      )}
    </div>
  );
}
