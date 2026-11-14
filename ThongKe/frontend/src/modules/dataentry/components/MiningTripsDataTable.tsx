import RowsPerPage, { PageArrows } from "@/components/table/RowsPerPage";
import { displayTextFilter, useTanstackLayout } from "@/components/table/useTanstackLayout";
import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import type {
  ApprovalStatus,
  MiningRecord,
} from "@/modules/dataentry/types/thong-ke";
import { getMiningTripsColumns } from "@/modules/dataentry/columns/miningTripsColumns";
import { EntryStatusFilter } from "@/modules/dataentry/components/EntryStatusFilter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Columns3,
} from "lucide-react";

interface MiningTripsDataTableProps {
  data: MiningRecord[];
  selectedIds: Set<string>;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectRow: (id: string) => void;
  onEditRow: (row: MiningRecord) => void;
  statusFilterValue: Set<ApprovalStatus>;
  onStatusFilterChange: (next: Set<ApprovalStatus>) => void;
  statusCounts: { all: number; APPROVED: number; PENDING: number; REVISION_REQUESTED: number };
}

export const MiningTripsDataTable: React.FC<MiningTripsDataTableProps> = ({
  data,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
  onEditRow,
  statusFilterValue,
  onStatusFilterChange,
  statusCounts,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = React.useMemo(
    () =>
      getMiningTripsColumns(
        selectedIds,
        onToggleSelectAll,
        onToggleSelectRow,
        onEditRow,
      ),
    [selectedIds, onToggleSelectAll, onToggleSelectRow, onEditRow],
  );

  const layout = useTanstackLayout("mining-trips");
  const table = useReactTable({
    data,
    columns,
    state: {
      columnSizing: layout.columnSizing,
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnSizingChange: layout.setColumnSizing,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    // lọc theo cột (nút ba chấm ở tiêu đề): so khớp chứa, không phân biệt hoa thường, dùng được cho cả cột số
    defaultColumn: { filterFn: displayTextFilter },
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row, relativeIndex) => `${row.id || "trip"}_t_${relativeIndex}`,
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  return (
    <div className="space-y-3">
      {/* Bộ lọc trạng thái (checkbox) — nằm trên toolbar "Hiển thị cột" */}
      <div className="flex justify-end">
        <EntryStatusFilter
          value={statusFilterValue}
          onChange={onStatusFilterChange}
          counts={statusCounts}
        />
      </div>

      {/* Top Toolbar (Column visibility toggle) */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">
          Tổng số bản ghi:{" "}
          <strong className="text-gray-900 dark:text-gray-100">
            {data.length}
          </strong>
        </span>

        <div className="flex items-center gap-2">
        {layout.button}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 bg-white dark:bg-gray-900"
              title="Hiển thị cột"
              aria-label="Hiển thị cột"
            >
              <Columns3 className="w-3.5 h-3.5" />

            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                const headerText =
                  typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id;
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize text-xs"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {headerText}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* Main Data Table */}
      <div ref={layout.containerRef} className={`${layout.rowClass} border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto bg-white dark:bg-gray-900 shadow-sm`}>
        <Table
          className="text-xs border-collapse"
          style={{ width: "100%", minWidth: table.getTotalSize(), tableLayout: "fixed" }}
        >
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
                    style={{ width: header.getSize(), position: "relative", paddingRight: header.column.getCanFilter() ? 22 : undefined }}
                    data-col={header.column.id}
                    className="px-1.5 py-1.5 text-center border-r border-blue-400/60 dark:border-blue-400/60 text-white font-bold whitespace-normal break-words leading-tight align-middle min-h-[36px] overflow-hidden [&_button]:text-white [&_button]:hover:text-white [&_button]:hover:bg-blue-600/50"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    {layout.filterButton(header)}
                    {layout.resizer(header)}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isSelected = selectedIds.has(row.original.id || "");
                return (
                  <TableRow
                    key={row.id}
                    className={`border-b border-gray-100 dark:border-gray-800/60 transition-colors ${
                      isSelected
                        ? "bg-blue-50/60 dark:bg-blue-950/30"
                        : row.index % 2 === 0
                          ? "bg-white dark:bg-gray-950"
                          : "bg-gray-50/50 dark:bg-gray-900/40"
                    } hover:bg-blue-50/30 dark:hover:bg-blue-950/20`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        data-col={cell.column.id}
                        className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60 whitespace-nowrap overflow-hidden text-ellipsis"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-xs text-gray-400"
                >
                  Không có bản ghi báo chuyến nào phù hợp bộ lọc!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1 text-xs text-gray-600 dark:text-gray-400">
        <RowsPerPage
          value={table.getState().pagination.pageSize}
          onChange={(n) => table.setPageSize(n)}
          from={table.getFilteredRowModel().rows.length ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0}
          to={Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}
          total={table.getFilteredRowModel().rows.length}
        />

        <PageArrows canPrev={table.getCanPreviousPage()} canNext={table.getCanNextPage()} onPrev={() => table.previousPage()} onNext={() => table.nextPage()} onFirst={() => table.setPageIndex(0)} onLast={() => table.setPageIndex(Math.max(0, table.getPageCount() - 1))} />
      </div>
    </div>
  );
};
