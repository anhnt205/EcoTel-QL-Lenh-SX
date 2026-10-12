import type { ColumnDef } from "@tanstack/react-table";
import type { Shift } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

export const getShiftColumns = (): ColumnDef<Shift>[] => [
  {
    accessorKey: "name",
    header: "Tên Ca làm việc",
    cell: ({ row }) => (
      <Badge className="bg-blue-600 text-white gap-1 text-xs">
        <Clock className="w-3 h-3" /> Ca {row.original.name}
      </Badge>
    ),
  },
  {
    accessorKey: "startTime",
    header: "Giờ bắt đầu",
    cell: ({ row }) => row.original.startTime || "—",
  },
  {
    accessorKey: "endTime",
    header: "Giờ kết thúc",
    cell: ({ row }) => row.original.endTime || "—",
  },
];
