import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export const getModelColumns = (
  deviceModels: any[],
): ColumnDef<any, unknown>[] => {
  const staticCols: ColumnDef<any, unknown>[] = [
    {
      accessorKey: "material",
      header: "Vật liệu",
      meta: { align: "left" },
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
  ];

  const dynamicCols: ColumnDef<any, unknown>[] = deviceModels.map((d: any) => ({
    id: d._id,
    accessorKey: d._id,
    header: d.name,
    meta: { align: "center" },
    cell: ({ row }) => row.original[d._id] ?? "—",
  }));

  return [...staticCols, ...dynamicCols];
};
