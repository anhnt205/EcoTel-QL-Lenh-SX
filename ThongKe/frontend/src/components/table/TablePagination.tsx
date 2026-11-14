import type { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import RowsPerPage, { PageArrows, ROW_OPTIONS } from "./RowsPerPage";

interface TablePaginationProps<TData> {
  table: Table<TData>;
  /** Tổng số bản ghi (từ server khi dùng manualPagination, hoặc tự tính khi client-side) */
  totalCount?: number;
  rowsPerPageOptions?: number[];
  /** Hiện ô chọn "Số dòng" (mặc định có). Tắt khi bảng cố định số dòng mỗi trang. */
  showPageSize?: boolean;
  /** Giữ để tương thích: mọi bảng dùng chung MỘT kiểu chân trang (mẫu bảng Lệnh sản xuất). */
  variant?: "card";
}

/**
 * Chân trang dùng chung — đúng mẫu bảng Lệnh sản xuất, căn phải:
 * "Số dòng: [15 ▾]   Hiển thị 1–15 trong tổng N bản ghi   ‹ ›".
 */
function TablePagination<TData>({
  table,
  totalCount,
  rowsPerPageOptions = ROW_OPTIONS,
  showPageSize = true,
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
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          Trước
        </Button>
        <span className="text-sm text-muted-foreground">
          {pageIndex + 1} / {totalPages || 1}
        </span>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Sau
        </Button>
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-end">
        <RowsPerPage
          value={pageSize}
          onChange={(n) => table.setPageSize(n)}
          from={startRow}
          to={endRow}
          total={total}
          options={showPageSize ? rowsPerPageOptions : [pageSize]}
        />
        <PageArrows
          canPrev={table.getCanPreviousPage()}
          canNext={table.getCanNextPage()}
          onPrev={() => table.previousPage()}
          onNext={() => table.nextPage()}
          onFirst={() => table.setPageIndex(0)}
          onLast={() => table.setPageIndex(Math.max(0, totalPages - 1))}
        />
      </div>
    </div>
  );
}

export default TablePagination;
