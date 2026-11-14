import { useMemo, useRef, useState } from "react";
import { EllipsisVertical } from "lucide-react";
import type { Column, Table } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import ExcelFilterPopup, { distinctSorted } from "./ExcelFilterPopup";
import { cellDisplayText } from "./useTanstackLayout";

/**
 * Nút lọc theo cột (3 chấm dọc trong ô tiêu đề) — hộp lọc KIỂU EXCEL, cùng mẫu với cột của Lệnh sản xuất / Nhập liệu:
 * tìm kiếm + danh sách chữ đang hiển thị của cột, tick để lọc. Danh sách thu hẹp theo bộ lọc của CÁC cột khác (như Excel).
 * Có lọc đang bật thì nút được tô sáng.
 */
export default function ColumnFilterButton<TData, TValue>({
  column,
  table,
}: {
  column: Column<TData, TValue>;
  table: Table<TData>;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const current = column.getFilterValue();
  const selected = Array.isArray(current) ? (current as string[]) : null;
  const metaTitle = (column.columnDef.meta as { headerTitle?: string } | undefined)?.headerTitle;
  const label =
    typeof column.columnDef.header === "string" ? column.columnDef.header : (metaTitle ?? column.id);

  const values = useMemo(() => {
    if (!open) return [] as string[];
    const others = table.getState().columnFilters.filter((f) => f.id !== column.id);
    const rows = table.getPreFilteredRowModel().rows;
    const list: string[] = [];
    for (const row of rows) {
      // giống Excel: chỉ liệt kê giá trị của những dòng còn lại sau khi áp bộ lọc của các cột KHÁC
      const okOthers = others.every((f) => {
        const col = table.getColumn(f.id);
        const fn = col?.getFilterFn();
        return !fn || fn(row as never, f.id, f.value, () => undefined);
      });
      if (okOthers) list.push(cellDisplayText(row as never, column.id));
    }
    return distinctSorted(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`Lọc theo ${label}`}
        title={selected ? `Đang lọc ${selected.length} giá trị — bấm để sửa` : "Lọc"}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "shrink-0 rounded p-0.5 text-white hover:bg-blue-600/70",
          (selected || (typeof current === "string" && current)) && "bg-white text-blue-700 hover:bg-white",
        )}
      >
        <EllipsisVertical className="h-4 w-4" />
      </button>
      {open && btnRef.current && (
        <ExcelFilterPopup
          anchor={btnRef.current}
          title={label}
          values={values}
          selected={selected}
          onApply={(sel) => {
            column.setFilterValue(sel ?? undefined);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
