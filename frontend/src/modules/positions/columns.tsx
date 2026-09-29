import type { ColumnDef } from "@tanstack/react-table";
import type { Position } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";

interface ColumnOptions {
  onEdit?: (position: Position) => void;
  onDelete?: (position: Position) => void;
}

export const getPositionColumns = ({
  onEdit,
  onDelete,
}: ColumnOptions = {}): ColumnDef<Position, unknown>[] => [
  {
    accessorKey: "code",
    header: "Mã chức vụ",
    meta: { align: "left" },
    size: 150,
  },
  {
    accessorKey: "name",
    header: "Tên chức vụ",
    meta: { align: "left" },
  },
  {
    accessorKey: "departmentName",
    header: "Phòng ban",
    meta: { align: "left" },
    cell: ({ row }) => row.original.departmentName || "—",
  },
  {
    accessorKey: "permissions",
    header: "Số chức năng có quyền",
    meta: { align: "left" },
    cell: ({ row }) => row.original.permissions?.length ?? 0,
  },
  {
    id: "actions",
    header: "Thao tác",
    size: 100,
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit?.(row.original)} title="Chỉnh sửa">
          <Edit2 className="h-4 w-4 text-blue-600" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete?.(row.original)} title="Xóa">
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    ),
  },
];
