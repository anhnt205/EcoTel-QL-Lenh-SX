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
import { ChevronRight, ChevronDown } from "lucide-react";
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

  // Toolbar
  title?: string;
  searchValue?: string;
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

function AppDataTable<TData>({
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

  defaultPageSize = 10,

  title,
  searchValue = "",
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
    defaultColumn: { minSize: 60 },

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

  const showEmptyState = !loading && data.length === 0;
  const showTable = !loading && data.length > 0;

  return (
    <div
      className={cn(
        "bg-card shadow-sm border flex flex-col w-full",
        fullHeight || isFullscreen ? "flex-1 min-h-0 h-full" : "h-auto",
        bordered ? "border-border" : "border-transparent",
        isFullscreen
          ? "fixed inset-0 z-50 m-0 rounded-none w-screen h-screen overflow-hidden"
          : "rounded-xl overflow-hidden",
        className,
      )}
    >
      {/* Toolbar */}
      {showToolbar && (
        <TableToolbar
          title={title}
          searchValue={searchValue}
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
            containerClassName={cn("w-full overflow-x-auto", (fullHeight || isFullscreen) && "flex-1 min-h-0")}
            containerStyle={{
              maxHeight: isFullscreen ? undefined : maxHeight,
            }}
            className={cn(dense && "text-xs")}
            style={{
              tableLayout: "fixed",
              width: "100%",
              minWidth: table.getTotalSize(),
            }}
          >
            <TableHeader
              className={cn(stickyHeader && "sticky top-0 z-10 bg-card")}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-border bg-slate-100/90 dark:bg-slate-900/90 hover:bg-slate-100/90"
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
                          width: header.getSize(),
                          minWidth: (
                            header.column.columnDef as { minSize?: number }
                          ).minSize,
                        }}
                        className={cn(
                          "relative px-4 py-3.5 font-bold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider whitespace-nowrap border-r border-border/70 last:border-r-0 overflow-hidden text-ellipsis align-middle",
                          alignClass,
                          meta?.headerClassName || meta?.className
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
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

            <TableBody>
              {table.getRowModel().rows.map((row, index) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      "transition-colors",
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
                            width: cell.column.getSize(),
                            minWidth: (
                              cell.column.columnDef as { minSize?: number }
                            ).minSize,
                          }}
                          className={cn(
                            "px-4 py-3 text-sm border-r last:border-r-0 overflow-hidden text-ellipsis whitespace-nowrap align-middle",
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
          totalCount={
            totalCount ?? (manualPagination ? undefined : data.length)
          }
        />
      )}
    </div>
  );
}
