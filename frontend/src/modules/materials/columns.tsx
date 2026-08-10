import type { ColumnDef } from "@tanstack/react-table";
import type { Material } from "@/types";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";

export const getMaterialColumns = (): ColumnDef<Material, unknown>[] => [
  {
    accessorKey: "name",
    header: "Tên vật liệu",
    meta: { align: "left" },
    cell: ({ row }) => (
      <div className="font-semibold text-gray-800 dark:text-gray-200">
        {row.original.name}
      </div>
    ),
  },
  {
    accessorKey: "density",
    header: "Tỷ trọng quy ẩm",
    meta: { align: "center" },
    cell: ({ row }) => {
      const mat = row.original;
      const history = mat.valueHistory?.[0];
      const val = mat.density ?? history?.density;
      return val !== undefined && val !== null ? val : "—";
    },
  },
  {
    accessorKey: "dryDensity",
    header: "Tỷ trọng không quy ẩm",
    meta: { align: "center" },
    cell: ({ row }) => {
      const mat = row.original;
      const history = mat.valueHistory?.[0];
      const val = mat.dryDensity ?? history?.dryDensity;
      return val !== undefined && val !== null ? val : "—";
    },
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
    cell: ({ row }) => {
      const mat = row.original;
      const history = mat.valueHistory?.[0];
      const time = (mat as any).startTime || history?.startTime;
      return time ? dayjs(time).format("DD/MM/YYYY") : "—";
    },
  },
  {
    accessorKey: "endTime",
    header: "Thời gian kết thúc",
    meta: { align: "center" },
    cell: ({ row }) => {
      const mat = row.original;
      const history = mat.valueHistory?.[0];
      const time = (mat as any).endTime || history?.endTime;
      return time ? dayjs(time).format("DD/MM/YYYY") : "—";
    },
  },
];
