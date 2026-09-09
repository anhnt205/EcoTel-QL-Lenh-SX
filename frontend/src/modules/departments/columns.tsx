import type { ColumnDef } from "@tanstack/react-table";
import type { Department } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";

interface ColumnOptions {
  onEdit?: (department: Department) => void;
  onDelete?: (department: Department) => void;
}

export const getDepartmentColumns = ({
  onEdit,
  onDelete,
}: ColumnOptions = {}): ColumnDef<Department, unknown>[] => [
  {
    accessorKey: "code",
    header: "Mã phòng ban",
    meta: { align: "left" },
    size: 150,
  },
  {
    accessorKey: "name",
    header: "Tên phòng ban",
    meta: { align: "left" },
  },
  {
    accessorKey: "description",
    header: "Mô tả",
    meta: { align: "left" },
    cell: ({ row }) => row.original.description || "—",
  },
  {
    accessorKey: "allowedResources",
    header: "Số chức năng được phép",
    meta: { align: "left" },
    cell: ({ row }) => row.original.allowedResources?.length ?? 0,
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
