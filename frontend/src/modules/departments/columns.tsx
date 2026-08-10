import type { ColumnDef } from "@tanstack/react-table";
import type { Department } from "@/types";
export const columns: ColumnDef<Department, unknown>[] = [
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
