import type { ColumnDef } from "@tanstack/react-table";
import type { TravelLog } from "@/types";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import dayjs from "dayjs";

interface GetTravelLogColumnsProps {
  onEdit: (log: TravelLog) => void;
  isAdmin: boolean;
  page?: number;
  pageSize?: number;
}

export const getTravelLogColumns = ({
  onEdit,
  isAdmin,
  page = 0,
  pageSize = 50,
}: GetTravelLogColumnsProps): ColumnDef<TravelLog, unknown>[] => {
  const columns: ColumnDef<TravelLog, unknown>[] = [
    {
      id: "stt",
      header: "STT",
      meta: { align: "center" },
      size: 50,
      cell: ({ row }) => page * pageSize + row.index + 1,
    },
    {
      id: "excavator",
      header: "Máy xúc",
      meta: { align: "left" },
      cell: ({ row }) => {
        const exc = row.original.excavator as any;
        return typeof exc === "object" ? exc?.code || "—" : exc || "—";
      },
    },
    {
      accessorKey: "area",
      header: "Khu vực",
      meta: { align: "left" },
      cell: ({ row }) => row.original.area || "—",
    },
    {
      accessorKey: "excavationLevel",
      header: "Tầng xúc",
      meta: { align: "left" },
      cell: ({ row }) => row.original.excavationLevel || "—",
    },
    {
      accessorKey: "dumpHeightActual",
      header: "Độ cao nơi đổ",
      meta: { align: "center" },
      cell: ({ row }) => row.original.dumpHeightActual || "—",
    },
    {
      accessorKey: "fullDistanceKm",
      header: "Toàn tuyến (km)",
      meta: { align: "center" },
      cell: ({ row }) => row.original.fullDistanceKm ?? "—",
    },
    {
      accessorKey: "fullLiftHeightM",
      header: "H N.tải (m)",
      meta: { align: "center" },
      cell: ({ row }) => row.original.fullLiftHeightM ?? "—",
    },
    {
      accessorKey: "localMinHeightM",
      header: "H min (m)",
      meta: { align: "center" },
      cell: ({ row }) => row.original.localMinHeightM ?? "—",
    },
    {
      accessorKey: "localMaxHeightM",
      header: "H max (m)",
      meta: { align: "center" },
      cell: ({ row }) => row.original.localMaxHeightM ?? "—",
    },
    {
      accessorKey: "localDistanceKm",
      header: "C.độ cục bộ (km)",
      meta: { align: "center" },
      cell: ({ row }) => row.original.localDistanceKm ?? "—",
    },
    {
      accessorKey: "localLiftHeightM",
      header: "H N.tải cục bộ (m)",
      meta: { align: "center" },
      cell: ({ row }) => row.original.localLiftHeightM ?? "—",
    },
    {
      id: "location",
      header: "Điểm đổ tải",
      meta: { align: "left" },
      cell: ({ row }) => {
        const loc = row.original.location as any;
        return typeof loc === "object" ? loc?.name || "—" : loc || "—";
      },
    },
    {
      id: "shift",
      header: "Ca",
      meta: { align: "center" },
      size: 60,
      cell: ({ row }) => {
        const s = row.original.shift as any;
        return typeof s === "object" ? `Ca ${s?.name}` : s ? `Ca ${s}` : "—";
      },
    },
    {
      accessorKey: "workingDate",
      header: "Ngày",
      meta: { align: "center" },
      cell: ({ row }) =>
        row.original.workingDate
          ? dayjs(row.original.workingDate).format("DD/MM/YYYY")
          : "—",
    },
  ];

  if (isAdmin) {
    columns.push({
      id: "actions",
      header: "Sửa",
      meta: { align: "center" },
      size: 60,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(row.original)}
          title="Sửa cung độ"
          className="h-8 w-8 text-primary hover:text-primary/80"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    });
  }

  return columns;
};
