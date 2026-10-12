import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Edit2, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ColumnOptions {
  onEdit?: (user: User) => void;
  isAdmin?: boolean;
}

export const getUserColumns = ({
  onEdit,
  isAdmin,
}: ColumnOptions): ColumnDef<User>[] => [
  {
    accessorKey: "username",
    header: "Tên tài khoản",
    cell: ({ row }) => (
      <div className="font-semibold text-blue-700 dark:text-blue-400">
        {row.original.username}
      </div>
    ),
  },
  {
    accessorKey: "fullName",
    header: "Họ và tên",
    cell: ({ row }) => row.original.fullName || "—",
  },
  {
    accessorKey: "salaryCode",
    header: "Số thẻ lương",
    cell: ({ row }) => row.original.salaryCode || "—",
  },
  {
    accessorKey: "departmentName",
    header: "Đơn vị",
    cell: ({ row }) => row.original.departmentName || row.original.department || "—",
  },
  {
    accessorKey: "positionName",
    header: "Chức vụ",
    cell: ({ row }) => row.original.positionName || row.original.position || "—",
  },
  {
    accessorKey: "gender",
    header: "Giới tính",
    cell: ({ row }) => row.original.gender || "—",
  },
  {
    accessorKey: "phone",
    header: "Số điện thoại",
    cell: ({ row }) => row.original.phone || "—",
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || "—",
  },
  {
    accessorKey: "active",
    header: "Trạng thái",
    cell: ({ row }) =>
      row.original.active !== false ? (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 gap-1">
          <CheckCircle className="w-3 h-3" /> Hoạt động
        </Badge>
      ) : (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" /> Tạm khóa
        </Badge>
      ),
  },
  ...(isAdmin
    ? [
        {
          id: "actions",
          header: "Thao tác",
          cell: ({ row }: any) => (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit?.(row.original)}
                title="Chỉnh sửa"
              >
                <Edit2 className="w-4 h-4 text-blue-600" />
              </Button>
            </div>
          ),
        },
      ]
    : []),
];
