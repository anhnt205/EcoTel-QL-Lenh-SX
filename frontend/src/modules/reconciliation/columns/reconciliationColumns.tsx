import type { ColumnDef } from "@tanstack/react-table";
import type { ReconciliationItem } from "@/modules/dataentry/types/thong-ke";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export interface GetReconciliationColumnsOptions {
  onSelectItem?: (item: ReconciliationItem) => void;
}

export const getReconciliationColumns = (
  options?: GetReconciliationColumnsOptions,
): ColumnDef<ReconciliationItem>[] => [
  {
    accessorFn: (row) => row.commonKey.month,
    id: "month",
    header: "Tháng",
    cell: (info) => (
      <div className="text-center">{info.getValue<number>()}</div>
    ),
  },
  {
    accessorFn: (row) => row.commonKey.day,
    id: "day",
    header: "Ngày",
    cell: (info) => (
      <div className="text-center">{info.getValue<number>()}</div>
    ),
  },
  {
    accessorFn: (row) => row.commonKey.shift,
    id: "shift",
    header: "Ca",
    cell: (info) => (
      <div className="text-center">
        {info.getValue<string>()}
      </div>
    ),
  },
  {
    accessorFn: (row) => row.commonKey.vehicleNo,
    id: "vehicleNo",
    header: "Số xe",
    cell: (info) => (
      <div className="text-blue-700 dark:text-blue-400">
        {info.getValue<string>()}
      </div>
    ),
  },
  {
    accessorFn: (row) => row.status,
    id: "status",
    header: "Trạng thái",
    cell: (info) => {
      const status = info.getValue<ReconciliationItem["status"]>();

      if (status === "BOTH") {
        return (
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className="min-w-24 justify-center rounded-md border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/60 dark:text-blue-300"
            >
              Khớp
            </Badge>
          </div>
        );
      }

      const label = status === "TRANSPORT_ONLY" ? "Lệch VT" : "Lệch KT";

      return (
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className="min-w-24 justify-center rounded-md border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-300"
          >
            {label}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorFn: (row) => row.commonKey.tripCount,
    id: "tripCount",
    header: "Chuyến",
    cell: (info) => (
      <div className="text-center font-medium">
        {info.getValue<number>()}
      </div>
    ),
  },
  {
    accessorFn: (row) => row.commonKey.cargoType,
    id: "cargoType",
    header: "Chủng loại",
  },
  {
    accessorFn: (row) => row.commonKey.fleet,
    id: "fleet",
    header: "Đội xe",
  },
  {
    accessorFn: (row) => row.transportRecord?.excavatorEquipment,
    id: "transExcavator",
    header: "Máy xúc (VT)",
    cell: (info) =>
      info.getValue<string>() || (
        <span className="text-gray-400 italic">-</span>
      ),
  },
  {
    accessorFn: (row) => row.transportRecord?.unloadLocationName,
    id: "transUnload",
    header: "Nơi dỡ tải (VT)",
    cell: (info) =>
      info.getValue<string>() || (
        <span className="text-gray-400 italic">-</span>
      ),
  },
  {
    accessorFn: (row) => row.transportRecord?.fullRouteDistance,
    id: "transDistance",
    header: "CĐ toàn tuyến (VT)",
    cell: (info) => {
      const val = info.getValue<number>();
      return val ? (
        `${val} Km`
      ) : (
        <span className="text-gray-400 italic">-</span>
      );
    },
  },
  {
    accessorFn: (row) => row.transportRecord?.finalFuel,
    id: "transFuel",
    header: "Nhiên liệu (VT)",
    cell: (info) => {
      const val = info.getValue<number>();
      return val ? (
        `${val} L`
      ) : (
        <span className="text-gray-400 italic">-</span>
      );
    },
  },
  {
    accessorFn: (row) => row.miningRecord?.mineCode,
    id: "miningMineCode",
    header: "Mã MX (KT)",
    cell: (info) =>
      info.getValue<string>() || (
        <span className="text-gray-400 italic">-</span>
      ),
  },
  {
    accessorFn: (row) => row.miningRecord?.dumpLocation,
    id: "miningDump",
    header: "Vị trí đổ (KT)",
    cell: (info) =>
      info.getValue<string>() || (
        <span className="text-gray-400 italic">-</span>
      ),
  },
  {
    accessorFn: (row) => row.miningRecord?.contractCode,
    id: "miningContract",
    header: "Mã C/T (KT)",
    cell: (info) =>
      info.getValue<string>() || (
        <span className="text-gray-400 italic">-</span>
      ),
  },
  {
    accessorFn: (row) => row.miningRecord?.vehicleTypeDetail,
    id: "miningVehicleType",
    header: "Loại xe (KT)",
    cell: (info) =>
      info.getValue<string>() || (
        <span className="text-gray-400 italic">-</span>
      ),
  },
  {
    id: "action",
    header: "Xem chi tiết",
    cell: ({ row }) => (
      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            options?.onSelectItem?.(row.original);
          }}
          className="h-7 px-2 text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-1 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" /> Xem
        </Button>
      </div>
    ),
  },
];
