import type { ColumnDef } from "@tanstack/react-table";
import type { Location } from "@/types";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface GetLocationColumnsProps {
  onEdit: (location: Location) => void;
  isAdmin: boolean;
}

export const getLocationColumns = ({
  onEdit,
  isAdmin,
}: GetLocationColumnsProps): ColumnDef<Location, unknown>[] => {
  const columns: ColumnDef<Location, unknown>[] = [
    {
      accessorKey: "name",
      header: "Tên vị trí",
      meta: { align: "left" },
    },
    {
      id: "coordinates",
      header: "Tọa độ",
      meta: { align: "center" },
      size: 200,
      cell: ({ row }) => {
        const loc = row.original;
        const coords = (loc as any).coordinates?.coordinates;
        if (Array.isArray(coords) && coords.length === 2) {
          return `${coords[0]} , ${coords[1]}`;
        }
        if (
          (loc as any).longitude !== undefined &&
          (loc as any).latitude !== undefined
        ) {
          return `${(loc as any).longitude} , ${(loc as any).latitude}`;
        }
        if (
          loc.coordinates?.lat !== undefined &&
          loc.coordinates?.lng !== undefined
        ) {
          return `${loc.coordinates.lng} , ${loc.coordinates.lat}`;
        }
        return "Không có tọa độ";
      },
    },
    {
      accessorKey: "distance",
      header: "Phạm vi nhận diện (m)",
      meta: { align: "center" },
      size: 180,
      cell: ({ row }) => row.original.distance ?? 0,
    },
  ];

  if (isAdmin) {
    columns.push({
      id: "actions",
      header: "Thao tác",
      meta: { align: "center" },
      size: 80,
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(row.original)}
            title="Sửa vị trí"
            className="h-8 w-8 text-primary hover:text-primary/80"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return columns;
};
