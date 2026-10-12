import type { ColumnDef } from "@tanstack/react-table";
import type { Device } from "@/types";
import { StatusDeviceEnum } from "@/enums";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil } from "lucide-react";

interface GetMachineColumnsProps {
  onEdit: (device: Device) => void;
  onView: (device: Device) => void;
  isAdmin: boolean;
}

export const getMachineColumns = ({
  onEdit,
  onView,
  isAdmin,
}: GetMachineColumnsProps): ColumnDef<Device, unknown>[] => {
  const columns: ColumnDef<Device, unknown>[] = [
    {
      id: "stt",
      header: "STT",
      meta: { align: "center" },
      size: 60,
      cell: ({ row }) => row.index + 1,
    },
    {
      accessorKey: "code",
      header: "Biển số",
      meta: { align: "left" },
      size: 120,
    },
    {
      accessorKey: "name",
      header: "Tên máy",
      meta: { align: "left" },
    },
    {
      accessorKey: "vehicleNumber",
      header: "Số máy",
      meta: { align: "left" },
      cell: ({ row }) => row.original.vehicleNumber || "—",
    },
    {
      id: "category",
      header: "Loại máy",
      meta: { align: "left" },
      cell: ({ row }) => {
        const dev = row.original as any;
        return dev.categoryName || (typeof dev.category === "object" ? dev.category?.name : dev.category) || "—";
      },
    },
    {
      id: "material",
      header: "Chủng loại",
      meta: { align: "left" },
      cell: ({ row }) => {
        const dev = row.original as any;
        return dev.materialName || (typeof dev.material === "object" ? dev.material?.name : dev.material) || "—";
      },
    },
    {
      accessorKey: "fuelType",
      header: "Nhiên liệu",
      meta: { align: "left" },
      cell: ({ row }) => row.original.fuelType || "—",
    },
    {
      id: "coordinates",
      header: "Vị trí",
      meta: { align: "center" },
      cell: ({ row }) => {
        const dev = row.original as any;
        if (dev.longitude !== undefined && dev.latitude !== undefined) {
          return `${dev.longitude}, ${dev.latitude}`;
        }
        const coordsData = row.original.coordinates as any;
        const coords = coordsData?.coordinates;
        if (Array.isArray(coords) && coords.length === 2) {
          return `${coords[1]}, ${coords[0]}`;
        }
        return "Không có tọa độ";
      },
    },
    {
      id: "department",
      header: "Đơn vị",
      meta: { align: "left" },
      cell: ({ row }) => {
        const dev = row.original as any;
        return dev.departmentName || (typeof dev.department === "object" ? dev.department?.name : dev.department) || "Chưa có";
      },
    },
    {
      accessorKey: "status",
      header: "Trạng thái",
      meta: { align: "center" },
      size: 140,
      cell: ({ row }) => {
        const s = row.original.status;
        let label = s;
        let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

        if (s === StatusDeviceEnum.IN_USE) {
          label = "Đang hoạt động" as any;
          variant = "destructive";
        } else if (s === StatusDeviceEnum.MAINTENANCE) {
          label = "SC; BD" as any;
          variant = "secondary";
        } else if (s === StatusDeviceEnum.RETIRED) {
          label = "Niêm cất" as any;
          variant = "outline";
        } else if (s === StatusDeviceEnum.AVAILABLE) {
          label = "Chờ điều động" as any;
          variant = "default";
        }

        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      id: "view",
      header: "Xem",
      meta: { align: "center" },
      size: 60,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onView(row.original)}
          title="Xem hồ sơ tài sản"
          className="h-8 w-8 text-blue-600 hover:text-blue-700"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
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
          title="Sửa thông tin máy"
          className="h-8 w-8 text-primary hover:text-primary/80"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    });
  }

  return columns;
};
