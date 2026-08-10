import type { ColumnDef } from "@tanstack/react-table";
import type { CargoType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

export const getCargoTypeColumns = (): ColumnDef<CargoType>[] => [
  {
    accessorKey: "name",
    header: "Tên Loại hàng",
    cell: ({ row }) => (
      <div className="font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5 text-emerald-600" />
        {row.original.name}
      </div>
    ),
  },
  {
    accessorKey: "code",
    header: "Mã loại hàng",
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
