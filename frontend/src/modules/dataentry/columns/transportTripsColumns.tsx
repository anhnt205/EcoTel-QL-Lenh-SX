import type { ColumnDef } from "@tanstack/react-table";
import type { TransportRecord } from "@/modules/dataentry/types/thong-ke";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Check } from "lucide-react";

export const getTransportTripsColumns = (
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
    size: 105,
  },
  {
    accessorKey: "shift",
    id: "shift",
    meta: { headerTitle: "Ca" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-7 px-1 text-sm font-bold hover:bg-transparent"
      >
        Ca
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span>{row.original.shift || "Ca 1"}</span>
    ),
    size: 60,
  },
  {
    accessorKey: "excavationArea",
    id: "excavationArea",
    header: "Khu vực xúc",
    cell: ({ row }) => row.original.excavationArea || "Khe Chàm",
    size: 110,
  },
  {
    accessorKey: "excavatorEquipment",
    id: "excavatorEquipment",
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
        {row.original.excavatorEquipment || "KC-MX01"}
      </span>
    ),
    size: 105,
  },
  {
    accessorKey: "pickupLocation",
    id: "pickupLocation",
    header: "Nơi nhận tải",
    cell: ({ row }) => row.original.pickupLocation || "Bãi sàng",
    size: 110,
  },
  {
    accessorKey: "pickupBench",
    id: "pickupBench",
    header: "Tầng nhận tải",
    cell: ({ row }) => row.original.pickupBench || "-40",
    size: 95,
  },
  {
    accessorKey: "pickupBenchGroup",
    id: "pickupBenchGroup",
    header: "Nhóm tầng nhận tải",
    cell: ({ row }) => (
      <span className="text-gray-500">
        {row.original.pickupBenchGroup || "Nhóm -40"}
      </span>
    ),
    size: 120,
  },
  {
    accessorKey: "unloadBench",
    id: "unloadBench",
    header: "Tầng dỡ tải",
    cell: ({ row }) => row.original.unloadBench || "8",
    size: 90,
  },
  {
    accessorKey: "fullRouteDistance",
    id: "fullRouteDistance",
    header: "Cung độ toàn tuyến (km)",
    cell: ({ row }) => row.original.fullRouteDistance ?? 5.5,
    size: 175,
  },
  {
    accessorKey: "fullRouteElevate",
    id: "fullRouteElevate",
    header: "Nâng tải toàn tuyến (m)",
    cell: ({ row }) => row.original.fullRouteElevate ?? 100,
    size: 175,
  },
  {
    accessorKey: "localSlopeDist",
    id: "localSlopeDist",
    header: "Cung độ dốc cục bộ (km)",
    cell: ({ row }) => row.original.localSlopeDist ?? 1.2,
    size: 175,
  },
  {
    accessorKey: "localSlopeDegree",
    id: "localSlopeDegree",
    header: "Dốc cục bộ (m)",
    cell: ({ row }) => row.original.localSlopeDegree ?? 8,
    size: 135,
  },
  {
    accessorKey: "unloadLocationName",
    id: "unloadLocationName",
    header: "Nơi dỡ tải",
    cell: ({ row }) => row.original.unloadLocationName || "Đá",
    size: 135,
  },
  {
    accessorKey: "cargoType",
    id: "cargoType",
    header: "Loại hàng",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.cargoType || "Than"}</span>
    ),
    size: 100,
  },
  {
    accessorKey: "cargoGroup",
    id: "cargoGroup",
    header: "Nhóm hàng",
    cell: ({ row }) => row.original.cargoGroup || "Nhóm Than N",
    size: 120,
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
    accessorKey: "tripCount",
    id: "tripCount",
    meta: { headerTitle: "Số chuyến" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-7 px-1 text-sm font-bold hover:bg-transparent"
      >
        Số chuyến
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span>
        {row.original.tripCount ?? 8}
      </span>
    ),
    size: 105,
  },
  {
    accessorKey: "loadStatus",
    id: "loadStatus",
    header: "Tải trọng",
    cell: ({ row }) => (
      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
        {row.original.loadStatus || "Đủ tải"}
      </span>
    ),
    size: 105,
  },
  {
    accessorKey: "isRainyDay",
    id: "isRainyDay",
    header: "Ngày mưa",
    cell: ({ row }) => (
      <div className="flex justify-center">
        {row.original.isRainyDay ? (
          <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        ) : (
          <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-700" />
        )}
      </div>
    ),
    size: 75,
  },
  {
    accessorKey: "isTraineeVehicle",
    id: "isTraineeVehicle",
    header: "Xe bổ túc",
    cell: ({ row }) => (
      <div className="flex justify-center">
        {row.original.isTraineeVehicle ? (
          <div className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
        ) : (
          <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-700" />
        )}
      </div>
    ),
    size: 75,
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
    size: 110,
  },
  {
    accessorKey: "operatorBadgeNo",
    id: "operatorBadgeNo",
    header: "Số thẻ lương",
    cell: ({ row }) => row.original.operatorBadgeNo || "8753",
    size: 95,
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
    size: 140,
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
    size: 130,
  },
];
