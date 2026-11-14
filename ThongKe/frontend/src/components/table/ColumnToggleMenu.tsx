import { Columns } from "lucide-react";
import type { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Nút "Hiển thị cột": menu tick bật/tắt từng cột của bảng. Đứng RIÊNG phía trên bảng (không nằm trong ô tiêu đề
 * hay ô tick chọn dòng). Giữ menu mở sau mỗi lần tick để bật/tắt nhiều cột một lượt.
 */
export default function ColumnToggleMenu<TData>({ table }: { table: Table<TData> }) {
  const cols = table
    .getAllLeafColumns()
    .filter((c) => c.getCanHide() && c.id !== "expander");
  if (cols.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          title="Hiển thị cột"
          aria-label="Hiển thị cột"
        >
          <Columns className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {cols.map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={c.getIsVisible()}
            onCheckedChange={(v) => c.toggleVisibility(!!v)}
            onSelect={(e) => e.preventDefault()}
          >
            {c.columnDef.meta?.headerTitle ??
              (typeof c.columnDef.header === "string" ? c.columnDef.header : c.id)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
