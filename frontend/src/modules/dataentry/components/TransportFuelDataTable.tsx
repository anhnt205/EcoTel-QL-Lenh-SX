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
import type { TransportRecord } from "@/modules/dataentry/types/thong-ke";
import { getTransportFuelColumns } from "@/modules/dataentry/columns/transportFuelColumns";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
} from "lucide-react";

interface TransportFuelDataTableProps {
  data: TransportRecord[];
  selectedIds: Set<string>;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectRow: (id: string) => void;
}

export const TransportFuelDataTable: React.FC<TransportFuelDataTableProps> = ({
  data,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectRow,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = React.useMemo(
    () =>
      getTransportFuelColumns(
        selectedIds,
        onToggleSelectAll,
        onToggleSelectRow,
      ),
    [selectedIds, onToggleSelectAll, onToggleSelectRow],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row, relativeIndex) => `${row.id || "tr_fuel"}_f_${relativeIndex}`,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <div className="space-y-3">
      {/* Top Toolbar (Column visibility toggle) */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">
          Tổng số bản ghi:{" "}
          <strong className="text-gray-900 dark:text-gray-100">
            {data.length}
          </strong>
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 bg-white dark:bg-gray-900"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Hiển thị cột</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 max-h-64 overflow-y-auto"
          >
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

      {/* Main Data Table */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto bg-white dark:bg-gray-900 shadow-sm">
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
                    style={{ width: header.getSize() }}
                    className="px-1.5 py-1.5 text-center border-r border-blue-400/60 dark:border-blue-400/60 text-white font-bold whitespace-normal break-words leading-tight align-middle min-h-[40px] overflow-hidden [&_button]:text-white [&_button]:hover:text-white [&_button]:hover:bg-blue-600/50"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, idx) => {
                const isSelected = selectedIds.has(row.original.id || "");
                return (
                  <TableRow
                    key={row.id}
                    className={`border-b border-gray-100 dark:border-gray-800/60 transition-colors ${
                      isSelected
                        ? "bg-blue-50/60 dark:bg-blue-950/30"
                        : idx % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-slate-50/40 dark:bg-gray-900/50"
                    } hover:bg-blue-50/30 dark:hover:bg-blue-950/20`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
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
                  Không có bản ghi báo nhiên liệu nào phù hợp bộ lọc!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span>Hiển thị</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-7 text-xs w-40 bg-white dark:bg-gray-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span>
            trên tổng số{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {data.length}
            </strong>{" "}
            bản ghi
          </span>
        </div>

        {/* Page controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.setPageIndex(0)}
            className="h-7 w-7 p-0"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            className="h-7 w-7 p-0"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <span className="px-2 text-xs font-semibold">
            Trang {table.getState().pagination.pageIndex + 1} /{" "}
            {table.getPageCount() || 1}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            className="h-7 w-7 p-0"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            className="h-7 w-7 p-0"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
