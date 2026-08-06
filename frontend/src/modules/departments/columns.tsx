import type { ColumnDef } from "@tanstack/react-table";
import type { Department } from "@/types";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface GetDepartmentColumnsProps {
  onEdit: (department: Department) => void;
  isAdmin: boolean;
}

export const getDepartmentColumns = ({
  onEdit,
  isAdmin,
}: GetDepartmentColumnsProps): ColumnDef<Department, unknown>[] => {
  const columns: ColumnDef<Department, unknown>[] = [
    {
      accessorKey: "code",
      header: "Mã đơn vị",
      meta: { align: "left" },
      size: 150,
    },
    {
      accessorKey: "name",
      header: "Tên đơn vị",
      meta: { align: "left" },
    },
    {
      accessorKey: "description",
      header: "Chức năng",
      meta: { align: "left" },
      cell: ({ row }) => row.original.description || "—",
    },
  ];

  if (isAdmin) {
    columns.push({
      id: "actions",
      header: "Thao tác",
      meta: { align: "center" },
      size: 80,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(row.original)}
            title="Sửa đơn vị"
            className="h-8 w-8 text-primary hover:text-primary/80"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return columns;
};
