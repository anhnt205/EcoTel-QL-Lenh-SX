import type { ColumnDef } from "@tanstack/react-table";
import type { TransportRecord } from "@/modules/dataentry/types/thong-ke";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

export const getTransportFuelColumns = (
  selectedIds: Set<string>,
  onToggleSelectAll: (checked: boolean) => void,
  onToggleSelectRow: (id: string) => void,
): ColumnDef<TransportRecord>[] => [
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
    size: 70,
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "stt",
    header: "STT",
    cell: ({ row }) => (
      <span className="text-gray-500">{row.index + 1}</span>
    ),
    size: 45,
    enableSorting: false,
  },
  {
    accessorFn: (row) => {
      if (row.month && row.day) {
        const d = String(row.day).padStart(2, "0");
        const m = String(row.month).padStart(2, "0");
        return `${d}/${m}/2026 06:00`;
      }
      return "05/08/2026 06:00";
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
    size: 130,
  },
  {
    accessorKey: "shift",
    id: "shift",
    header: "Ca",
    cell: ({ row }) => (
      <span>{row.original.shift || "Ca 1"}</span>
    ),
    size: 70,
  },
  {
    accessorKey: "vehicleNo",
    id: "vehicleNo",
    meta: { headerTitle: "Số xe" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-7 px-1 text-sm font-bold hover:bg-transparent"
      >
        Số xe
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span>
        {row.original.vehicleNo || "505"}
      </span>
    ),
    size: 90,
  },
  {
    accessorKey: "initialFuel",
    id: "initialFuel",
    header: "Nhiên liệu tồn đầu (lít)",
    cell: ({ row }) => (
      <span>
        {row.original.initialFuel
          ? Number(row.original.initialFuel).toLocaleString("vi-VN")
          : "1,188"}
      </span>
    ),
    size: 175,
  },
  {
    accessorKey: "receivedFuel",
    id: "receivedFuel",
    header: "Nhiên liệu lĩnh (lít)",
    cell: ({ row }) => (
      <span>
        {row.original.receivedFuel
          ? Number(row.original.receivedFuel).toLocaleString("vi-VN")
          : "590"}
      </span>
    ),
    size: 160,
  },
  {
    accessorKey: "finalFuel",
    id: "finalFuel",
    header: "Nhiên liệu tồn cuối (lít)",
    cell: ({ row }) => (
      <span>
        {row.original.finalFuel
          ? Number(row.original.finalFuel).toLocaleString("vi-VN")
          : "831"}
      </span>
    ),
    size: 175,
  },
  {
    id: "fuelConsumption",
    header: "Nhiên liệu tiêu thụ (lít)",
    cell: ({ row }) => {
      const fuelUsed =
        row.original.fuelConsumption ??
        Math.max(
          0,
          (Number(row.original.initialFuel) || 1188) +
            (Number(row.original.receivedFuel) || 590) -
            (Number(row.original.finalFuel) || 831),
        );
      return (
        <span>
          {Number(fuelUsed).toLocaleString("vi-VN")}
        </span>
      );
    },
    size: 130,
  },
  {
    accessorKey: "equipmentUnit",
    id: "equipmentUnit",
    header: "Đơn vị quản lý thiết bị",
    cell: ({ row }) => row.original.equipmentUnit || "VT7",
    size: 160,
  },
  {
    accessorKey: "vehicleType",
    id: "vehicleType",
    header: "Chủng loại xe",
    cell: ({ row }) => row.original.vehicleType || "HD 465-7R",
    size: 115,
  },
  {
    accessorKey: "operatorBadgeNo",
    id: "operatorBadgeNo",
    header: "Số thẻ lương",
    cell: ({ row }) => row.original.operatorBadgeNo || "8753",
    size: 105,
  },
  {
    accessorKey: "departmentName",
    id: "departmentName",
    header: "Đơn vị (Báo cáo)",
    cell: ({ row }) => row.original.departmentName || "-",
    size: 160,
  },
  {
    accessorKey: "operatorUnit",
    id: "operatorUnit",
    header: "Đơn vị công tác",
    cell: ({ row }) => row.original.operatorUnit || "VT7",
    size: 160,
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
    size: 160,
  },
];
