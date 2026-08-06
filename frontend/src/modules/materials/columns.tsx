import type { ColumnDef } from "@tanstack/react-table";
import type { Material } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import dayjs from "dayjs";

interface GetMaterialColumnsProps {
  onEdit: (material: Material) => void;
  isAdmin: boolean;
}

export const getMaterialColumns = ({
  onEdit,
  isAdmin,
}: GetMaterialColumnsProps): ColumnDef<Material, unknown>[] => {
  const columns: ColumnDef<Material, unknown>[] = [
    {
      accessorKey: "name",
      header: "Tên vật liệu",
      meta: { align: "left" },
    },
    {
      accessorKey: "density",
      header: "Tỷ trọng quy ẩm",
      meta: { align: "center" },
      cell: ({ row }) => row.original.density ?? "—",
    },
    {
      accessorKey: "dryDensity",
      header: "Tỷ trọng không quy ẩm",
      meta: { align: "center" },
      cell: ({ row }) => row.original.dryDensity ?? "—",
    },
    {
      accessorKey: "acceptedProduct",
      header: "Sản phẩm nghiệm thu",
      meta: { align: "center" },
      cell: ({ row }) =>
        row.original.acceptedProduct ? (
          <Badge variant="outline">{row.original.acceptedProduct}</Badge>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "startTime",
      header: "Thời gian bắt đầu",
      meta: { align: "center" },
      cell: ({ row }) =>
        (row.original as any).startTime
          ? dayjs((row.original as any).startTime).format("DD/MM/YYYY")
          : "—",
    },
    {
      accessorKey: "endTime",
      header: "Thời gian kết thúc",
      meta: { align: "center" },
      cell: ({ row }) =>
        (row.original as any).endTime
          ? dayjs((row.original as any).endTime).format("DD/MM/YYYY")
          : "—",
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
            title="Sửa loại vật liệu"
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
