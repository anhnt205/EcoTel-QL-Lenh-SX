import type { ColumnDef } from "@tanstack/react-table";
import type { DeviceModel } from "@/types";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface GetDeviceModelColumnsProps {
  onEdit: (deviceModel: DeviceModel) => void;
  isAdmin: boolean;
}

export const getDeviceModelColumns = ({
  onEdit,
  isAdmin,
}: GetDeviceModelColumnsProps): ColumnDef<DeviceModel, unknown>[] => {
  const columns: ColumnDef<DeviceModel, unknown>[] = [
    {
      accessorKey: "name",
      header: "Tên chủng loại",
      meta: { align: "left" },
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
            title="Sửa chủng loại"
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
