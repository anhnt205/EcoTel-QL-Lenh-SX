import type { ColumnDef } from "@tanstack/react-table";
import type { CargoGroup } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

export const getCargoGroupColumns = (): ColumnDef<CargoGroup>[] => [
  {
    accessorKey: "name",
    header: "Tên Nhóm hàng",
    cell: ({ row }) => (
      <div className="font-medium text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        {row.original.name}
      </div>
    ),
  },
  {
    accessorKey: "code",
    header: "Mã nhóm hàng",
    cell: ({ row }) =>
      row.original.code ? (
        <Badge variant="outline">{row.original.code}</Badge>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "description",
    header: "Mô tả",
    cell: ({ row }) => row.original.description || "—",
  },
];
