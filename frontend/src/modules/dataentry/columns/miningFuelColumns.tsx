import type { ColumnDef } from "@tanstack/react-table";
import type { MiningRecord } from "@/modules/dataentry/types/thong-ke";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { ApprovalStatusBadge } from "@/modules/dataentry/components/ApprovalStatusBadge";

export const getMiningFuelColumns = (
  selectedIds: Set<string>,
  onToggleSelectAll: (checked: boolean) => void,
  onToggleSelectRow: (id: string) => void,
): ColumnDef<MiningRecord>[] => [
  {
    id: "select",
    header: ({ table }) => {
      const pageRows = table.getRowModel().rows;
      const isAllSelected =
        pageRows.length > 0 &&
        pageRows.every((r) => r.original.id && selectedIds.has(r.original.id));
      const isSomeSelected =
        pageRows.some((r) => r.original.id && selectedIds.has(r.original.id)) &&
        !isAllSelected;

      return (
        <div className="flex justify-center">
          <Checkbox
            checked={
              isAllSelected ? true : isSomeSelected ? "indeterminate" : false
            }
            onCheckedChange={(v) => onToggleSelectAll(!!v)}
            aria-label="Select all"
            className="border-white data-[state=checked]:bg-white data-[state=checked]:text-blue-600 dark:border-white"
          />
        </div>
      );
    },
    cell: ({ row }) => {
      const rowId = row.original.id;
      return (
        <div className="flex justify-center">
          <Checkbox
            checked={!!(rowId && selectedIds.has(rowId))}
            onCheckedChange={() => rowId && onToggleSelectRow(rowId)}
            aria-label="Select row"
          />
        </div>
      );
    },
    size: 60,
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "stt",
    header: "STT",
    cell: ({ row }) => (
      <span className="text-gray-500">{row.index + 1}</span>
    ),
    size: 50,
    enableSorting: false,
  },
  {
    accessorFn: (row) => {
      if (row.month && row.day) {
        const d = String(row.day).padStart(2, "0");
        const m = String(row.month).padStart(2, "0");
        return `${d}/${m}/2026`;
      }
      return "05/08/2026";
    },
    id: "date",
    meta: { headerTitle: "Thời gian" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-7 px-1 text-sm font-bold hover:bg-transparent"
      >
        Thời gian
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ getValue }) => (
      <span className="font-medium">{getValue<string>()}</span>
    ),
    size: 135,
  },
  {
    accessorKey: "shift",
    id: "shift",
    header: "Ca",
    cell: ({ row }) => (
      <span>{row.original.shift || "Ca 1"}</span>
    ),
    size: 90,
  },
  {
    accessorKey: "pickupLocation",
    id: "pickupLocation",
    header: "Nơi chất tải",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.pickupLocation || "KX1"}
      </span>
    ),
    size: 125,
  },
  {
    accessorKey: "mineCode",
    id: "mineCode",
    meta: { headerTitle: "Máy xúc" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-7 px-1 text-sm font-bold hover:bg-transparent"
      >
        Máy xúc
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.mineCode || "P15"}
      </span>
    ),
    size: 120,
  },
  {
    accessorKey: "excavationBench",
    id: "excavationBench",
    header: "Tầng xúc",
    cell: ({ row }) => row.original.excavationBench || "300",
    size: 115,
  },
  {
    accessorKey: "vehicleManagementUnit",
    id: "vehicleManagementUnit",
    header: "Đơn vị quản lý thiết bị",
    cell: ({ row }) => row.original.vehicleManagementUnit || "VT7",
    size: 150,
  },
  {
    accessorKey: "operatorBadgeNo",
    id: "operatorBadgeNo",
    header: "Số thẻ lương",
    cell: ({ row }) => row.original.operatorBadgeNo || "8753",
    size: 125,
  },
  {
    accessorKey: "operatorName",
    id: "operatorName",
    header: "Họ và tên",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.operatorName || "Nguyễn Xuân Bằng"}
      </span>
    ),
    size: 190,
  },
  {
    accessorKey: "operatorUnit",
    id: "operatorUnit",
    header: "Đơn vị",
    cell: ({ row }) => row.original.operatorUnit || "VT7",
    size: 160,
  },
  {
    accessorKey: "initialFuel",
    id: "initialFuel",
    header: "Nhiên liệu tồn đầu (lít)",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.initialFuel ?? 150}</span>
    ),
    size: 175,
  },
  {
    accessorKey: "receivedFuel",
    id: "receivedFuel",
    header: "Nhiên liệu lĩnh (lít)",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.receivedFuel ?? 200}</span>
    ),
    size: 160,
  },
  {
    accessorKey: "finalFuel",
    id: "finalFuel",
    header: "Nhiên liệu tồn cuối (lít)",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.finalFuel ?? 120}</span>
    ),
    size: 175,
  },
  {
    id: "fuelConsumption",
    header: "Nhiên liệu sử dụng (lít)",
    cell: ({ row }) => {
      const fuelUsed =
        row.original.fuelConsumption ??
        Math.max(
          0,
          (Number(row.original.initialFuel) || 150) +
            (Number(row.original.receivedFuel) || 200) -
            (Number(row.original.finalFuel) || 120),
        );
      return (
        <span>
          {fuelUsed}
        </span>
      );
    },
    size: 135,
  },
  {
    accessorKey: "createdBy",
    id: "createdBy",
    header: "Người nhập chuyến",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.createdBy || "Trần Hồng Sơn"}
      </span>
    ),
    size: 150,
  },
  {
    accessorKey: "status",
    id: "status",
    header: "Trạng thái",
    cell: ({ row }) => (
      <div className="flex justify-center">
        <ApprovalStatusBadge
          status={row.original.status}
          note={row.original.changeRequestNote}
        />
      </div>
    ),
    size: 115,
  },
];
