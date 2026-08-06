import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { Table } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface TablePaginationProps<TData> {
  table: Table<TData>;
  /** Tổng số bản ghi (từ server khi dùng manualPagination, hoặc tự tính khi client-side) */
  totalCount?: number;
  rowsPerPageOptions?: number[];
}

function TablePagination<TData>({
  table,
  totalCount,
  rowsPerPageOptions = [5, 10, 25, 50, 100],
}: TablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;

  // Tổng bản ghi: ưu tiên totalCount (server) → fallback getFilteredRowModel (client)
  const total = totalCount ?? table.getFilteredRowModel().rows.length;
  const totalPages = table.getPageCount();
  const hasRows = total > 0;
  const startRow = hasRows ? pageIndex * pageSize + 1 : 0;
  const endRow = hasRows ? Math.min((pageIndex + 1) * pageSize, total) : 0;

  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-t bg-card rounded-b-lg">
      {/* Mobile: chỉ hiện Trước / Sau */}
      <div className="flex flex-1 items-center justify-between sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Trước
        </Button>
        <span className="text-sm text-muted-foreground">
          {pageIndex + 1} / {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Sau
        </Button>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        {/* Info text */}
        <p className="text-sm text-muted-foreground">
          Hiển thị <span className="font-medium">{startRow}</span>–
          <span className="font-medium">{endRow}</span> trong tổng{" "}
          <span className="font-medium">{total}</span> bản ghi
        </p>

        <div className="flex items-center gap-6 lg:gap-8">
          {/* Rows per page */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium whitespace-nowrap">Số dòng:</p>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {rowsPerPageOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page indicator */}
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Trang {pageIndex + 1} / {totalPages || 1}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Về trang đầu</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Trang trước</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Trang sau</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(totalPages - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Đến trang cuối</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TablePagination;
