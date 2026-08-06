import type { ColumnDef } from "@tanstack/react-table";
import type { DeviceType } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";

interface GetDeviceTypeColumnsProps {
  onEdit: (deviceType: DeviceType) => void;
  isAdmin: boolean;
}

export const getDeviceTypeColumns = ({
  onEdit,
  isAdmin,
}: GetDeviceTypeColumnsProps): ColumnDef<DeviceType, unknown>[] => {
  const columns: ColumnDef<DeviceType, unknown>[] = [
    {
      accessorKey: "name",
      header: "Tên loại thiết bị",
      meta: { align: "left" },
    },
    {
      accessorKey: "group",
      header: "Nhóm thiết bị",
      meta: { align: "center" },
      size: 150,
      cell: ({ row }) => (
        <Badge variant="outline" className="font-medium">
          {row.original.group}
        </Badge>
      ),
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
            title="Sửa phân loại"
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
