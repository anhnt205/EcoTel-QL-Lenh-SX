import type { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";
import type { StatisticRow } from "@/modules/dataentry/types/statistic.types";
import { formatDate, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export interface StatisticsColumnActions {
  onEdit: (id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  rows: StatisticRow[];
}

export const getStatisticsColumns = ({
  onEdit,
  selectedIds,
  onSelectionChange,
  rows,
}: StatisticsColumnActions): ColumnDef<StatisticRow, unknown>[] => [
  {
    id: "select",
    header: () => (
      <Checkbox
        checked={rows.length > 0 && selectedIds.length === rows.length}
        onCheckedChange={() => {
          if (selectedIds.length === rows.length) {
            onSelectionChange([]);
          } else {
            onSelectionChange(rows.map((r) => r._id));
          }
        }}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={selectedIds.includes(row.original._id)}
        onCheckedChange={() => {
          const id = row.original._id;
          onSelectionChange(
            selectedIds.includes(id)
              ? selectedIds.filter((i) => i !== id)
              : [...selectedIds, id]
          );
        }}
      />
    ),
    size: 40,
    minSize: 40,
    meta: { align: "center" },
  },
  {
    accessorKey: "workingDate",
    header: "Ngày",
    meta: { align: "left" },
    cell: ({ row }) => formatDate(row.original.workingDate),
  },
  {
    accessorKey: "shift",
    header: "Ca",
    meta: { align: "center" },
    cell: ({ row }) => {
      const shift = row.original.shift;
      const shiftName = typeof shift === "object" ? shift.name : shift;
      return (
        <Badge
          variant="outline"
          className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-card-foreground border-border"
        >
          {shiftName}
        </Badge>
      );
    },
  },
  {
    id: "deviceCode",
    header: "Số xe",
    meta: { align: "left" },
    cell: ({ row }) => (
      <span className="font-semibold text-card-foreground">
        {row.original.device?.code}
      </span>
    ),
  },
  {
    id: "driverName",
    header: "Lái xe",
    meta: { align: "left" },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.driver?.fullName}
      </span>
    ),
  },
  {
    id: "materialName",
    header: "Loại hàng",
    meta: { align: "center" },
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-card-foreground border-border"
      >
        {row.original.material?.name}
      </Badge>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Số chuyến",
    meta: { align: "right" },
    cell: ({ row }) => row.original.quantity,
  },
  {
    accessorKey: "ton",
    header: "Tấn",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-semibold text-card-foreground">
        {formatNumber(row.original.ton ?? 0)}
      </span>
    ),
  },
  {
    accessorKey: "production",
    header: "Tkm",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatNumber(row.original.production ?? 0)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    meta: { align: "right" },
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onEdit(row.original._id)}
        className="rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
        title="Chỉnh sửa"
      >
        <Pencil className="h-4 w-4" />
      </Button>
    ),
    size: 50,
  },
];
