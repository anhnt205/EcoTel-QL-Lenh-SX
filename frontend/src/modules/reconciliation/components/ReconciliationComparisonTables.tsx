import React, { useState, useMemo } from "react";
import type { ReconciliationItem } from "@/modules/dataentry/types/thong-ke";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "sonner";

interface ReconciliationComparisonTablesProps {
  items: ReconciliationItem[];
  onDeleteItem?: (id: string) => void;
}

export const ReconciliationComparisonTables: React.FC<
  ReconciliationComparisonTablesProps
> = ({ items, onDeleteItem }) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Track user choice for "DỮ LIỆU CHUẨN CUỐI": 'VT' | 'KT' | 'OTHER'
  const [choices, setChoices] = useState<Record<string, "VT" | "KT" | "OTHER">>(
    () => {
      const initial: Record<string, "VT" | "KT" | "OTHER"> = {};
      items.forEach((item) => {
        const t = item.transportRecord;
        const m = item.miningRecord;
        const isMismatch =
          !t ||
          !m ||
          (t.tripCount ?? 0) !== (m.tripCount ?? 0) ||
          (t.cargoType || "") !== (m.material || m.loadStatus || "");

        if (isMismatch) {
          initial[item.id] = "OTHER";
        } else {
          initial[item.id] = "VT";
        }
      });
      return initial;
    },
  );

  // Track custom fields when 'OTHER' is chosen
  const [customFields, setCustomFields] = useState<
    Record<string, { cargo: string; trips: number; loadStatus: string }>
  >(() => {
    const initial: Record<
      string,
      { cargo: string; trips: number; loadStatus: string }
    > = {};
    items.forEach((item) => {
      const m = item.miningRecord;
      const t = item.transportRecord;
      initial[item.id] = {
        cargo: m?.material || t?.cargoType || "Than",
        trips: m?.tripCount ?? t?.tripCount ?? 0,
        loadStatus: m?.loadStatus || t?.loadStatus || "Đủ tải",
      };
    });
    return initial;
  });

  const handleChoiceChange = (id: string, val: "VT" | "KT" | "OTHER") => {
    setChoices((prev) => ({ ...prev, [id]: val }));
  };

  const handleCustomFieldChange = (
    id: string,
    field: "cargo" | "trips" | "loadStatus",
    val: any,
  ) => {
    setCustomFields((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { cargo: "Than", trips: 0, loadStatus: "Đủ tải" }),
        [field]: val,
      },
    }));
  };

  const isMatched = (item: ReconciliationItem) => {
    const t = item.transportRecord;
    const m = item.miningRecord;
    if (!t || !m) return false;
    const sameTrips = (t.tripCount ?? 0) === (m.tripCount ?? 0);
    const sameCargo =
      (t.cargoType || "").trim().toLowerCase() ===
      (m.material || m.loadStatus || "").trim().toLowerCase();
    return sameTrips && sameCargo;
  };

  // TanStack Table Column Definitions (2-level grouped headers)
  const columns = useMemo<ColumnDef<ReconciliationItem>[]>(
    () => [
      // 1. THÔNG TIN CHUNG (19 cols)
      {
        id: "group_common_info",
        header: "THÔNG TIN CHUNG",
        columns: [
          {
            id: "select",
            header: ({ table }) => (
              <div className="flex justify-center">
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                  }
                  onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                  }
                  aria-label="Select all"
                />
              </div>
            ),
            cell: ({ row }) => (
              <div className="flex justify-center">
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Select row"
                />
              </div>
            ),
            size: 30,
          },
          {
            id: "stt",
            header: "STT",
            cell: ({ row }) => (
              <span className="text-gray-500 font-semibold">
                {row.index + 1}
              </span>
            ),
            size: 35,
          },
          {
            id: "date",
            header: "Thời gian",
            cell: ({ row }) => {
              const item = row.original;
              const day = item.commonKey.day
                ? String(item.commonKey.day).padStart(2, "0")
                : "05";
              const month = item.commonKey.month
                ? String(item.commonKey.month).padStart(2, "0")
                : "08";
              return `${day}/${month}/2026`;
            },
            size: 75,
          },
          {
            id: "shift",
            header: "Ca",
            cell: ({ row }) => (
              <span className="font-semibold">
                {row.original.commonKey.shift || "Ca 1"}
              </span>
            ),
            size: 45,
          },
          {
            id: "vehicleNo",
            header: "Số xe",
            cell: ({ row }) => (
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {row.original.commonKey.vehicleNo || "14C-12345"}
              </span>
            ),
            size: 75,
          },
          {
            id: "badgeNo",
            header: "Số thẻ lương",
            cell: ({ row }) =>
              row.original.transportRecord?.operatorBadgeNo ||
              row.original.miningRecord?.operatorBadgeNo ||
              "8753",
            size: 65,
          },
          {
            id: "excavationArea",
            header: "Khu vực xúc",
            cell: ({ row }) =>
              row.original.transportRecord?.excavationArea || "Khe Chàm",
            size: 70,
          },
          {
            id: "excavatorEquipment",
            header: "Máy xúc",
            cell: ({ row }) => (
              <span className="font-semibold">
                {row.original.transportRecord?.excavatorEquipment ||
                  row.original.miningRecord?.mineCode ||
                  "EX05"}
              </span>
            ),
            size: 55,
          },
          {
            id: "pickupLocation",
            header: "Nơi nhận tải",
            cell: ({ row }) =>
              row.original.transportRecord?.pickupLocation ||
              row.original.miningRecord?.pickupLocation ||
              "Bãi sàng",
            size: 65,
          },
          {
            id: "unloadBench",
            header: "Tầng dỡ tải",
            cell: ({ row }) =>
              row.original.transportRecord?.unloadBench || "-145",
            size: 55,
          },
          {
            id: "pickupBenchGroup",
            header: "Tầng/nhóm tầng",
            cell: ({ row }) => (
              <span className="text-gray-500">
                {row.original.transportRecord?.pickupBenchGroup || "-25"}
              </span>
            ),
            size: 65,
          },
          {
            id: "fullRouteDistance",
            header: "CĐ toàn tuyến (km)",
            cell: ({ row }) =>
              row.original.transportRecord?.fullRouteDistance ?? 5.5,
            size: 65,
          },
          {
            id: "fullRouteElevate",
            header: "Nâng tải (m)",
            cell: ({ row }) =>
              row.original.transportRecord?.fullRouteElevate ?? 100,
            size: 60,
          },
          {
            id: "localSlopeDist",
            header: "CĐ dốc (km)",
            cell: ({ row }) =>
              row.original.transportRecord?.localSlopeDist ?? 1.2,
            size: 60,
          },
          {
            id: "localSlopeDegree",
            header: "Dốc (m)",
            cell: ({ row }) =>
              row.original.transportRecord?.localSlopeDegree ?? 8,
            size: 50,
          },
          {
            id: "unloadLocationName",
            header: "Nơi dỡ tải",
            cell: ({ row }) =>
              row.original.transportRecord?.unloadLocationName ||
              row.original.miningRecord?.dumpLocation ||
              "Kho than 5",
            size: 70,
          },
          {
            id: "isRainyDay",
            header: "Ngày mưa",
            cell: ({ row }) => (
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={row.original.transportRecord?.isRainyDay ?? false}
                />
              </div>
            ),
            size: 55,
          },
          {
            id: "isTraineeVehicle",
            header: "Xe bổ túc",
            cell: ({ row }) => (
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={
                    row.original.transportRecord?.isTraineeVehicle ?? false
                  }
                />
              </div>
            ),
            size: 55,
          },
          {
            id: "cargoType",
            header: "Loại hàng",
            cell: ({ row }) =>
              row.original.transportRecord?.cargoType ||
              row.original.miningRecord?.material ||
              "Than",
            size: 60,
          },
        ],
      },

      // 2. SỐ LIỆU BÁO CHUYẾN (VẬN TẢI) (3 cols)
      {
        id: "group_transport_data",
        header: "SỐ LIỆU BÁO CHUYẾN (VẬN TẢI)",
        columns: [
          {
            id: "transTrips",
            header: "Số chuyến",
            cell: ({ row }) => (
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {row.original.transportRecord?.tripCount ?? 0}
              </span>
            ),
            size: 50,
          },
          {
            id: "transLoadStatus",
            header: "Tải trọng",
            cell: ({ row }) => {
              const status = row.original.transportRecord?.loadStatus;
              return status ? (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  {status}
                </span>
              ) : (
                "-"
              );
            },
            size: 65,
          },
          {
            id: "transBadgeNo",
            header: "Số thẻ lương",
            cell: ({ row }) =>
              row.original.transportRecord?.operatorBadgeNo || "8753",
            size: 65,
          },
        ],
      },

      // 3. SỐ LIỆU BÁO CHUYẾN (KHAI THÁC) (4 cols)
      {
        id: "group_mining_data",
        header: "SỐ LIỆU BÁO CHUYẾN (KHAI THÁC)",
        columns: [
          {
            id: "miningCargo",
            header: "Loại hàng",
            cell: ({ row }) =>
              row.original.miningRecord?.material ||
              row.original.miningRecord?.loadStatus ||
              "Than",
            size: 60,
          },
          {
            id: "miningTrips",
            header: "Số chuyến",
            cell: ({ row }) => (
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {row.original.miningRecord?.tripCount ?? 0}
              </span>
            ),
            size: 50,
          },
          {
            id: "miningLoadStatus",
            header: "Tải trọng",
            cell: ({ row }) => {
              const status = row.original.miningRecord?.loadStatus;
              return status ? (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {status}
                </span>
              ) : (
                "-"
              );
            },
            size: 65,
          },
          {
            id: "miningBadgeNo",
            header: "Số thẻ lương",
            cell: ({ row }) =>
              row.original.miningRecord?.operatorBadgeNo || "8753",
            size: 65,
          },
        ],
      },

      // 4. KẾT QUẢ ĐỐI CHIẾU (2 cols)
      {
        id: "group_reconciliation_result",
        header: "KẾT QUẢ ĐỐI CHIẾU",
        columns: [
          {
            id: "matched",
            header: "Khớp",
            cell: ({ row }) =>
              isMatched(row.original) ? (
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto font-bold">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <span className="text-gray-400 font-bold">-</span>
              ),
            size: 40,
          },
          {
            id: "mismatched",
            header: "Sai lệch",
            cell: ({ row }) =>
              !isMatched(row.original) ? (
                <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-3.5 h-3.5 fill-amber-500 text-amber-100" />
                </div>
              ) : (
                <span className="text-gray-400 font-bold">-</span>
              ),
            size: 45,
          },
        ],
      },

      // 5. DỮ LIỆU CHUẨN CUỐI (Chọn 1 trong 3 phương án)
      {
        id: "group_final_decision",
        header: "DỮ LIỆU CHUẨN CUỐI (Chọn 1 trong 3 phương án)",
        columns: [
          {
            id: "finalChoice",
            header: "Phương án chốt chuẩn",
            cell: ({ row }) => {
              const item = row.original;
              const t = item.transportRecord;
              const m = item.miningRecord;
              const matched = isMatched(item);

              const currentChoice =
                choices[item.id] || (matched ? "VT" : "OTHER");
              const currentCustom = customFields[item.id] || {
                cargo: m?.material || t?.cargoType || "Than",
                trips: m?.tripCount ?? t?.tripCount ?? 0,
                loadStatus: m?.loadStatus || t?.loadStatus || "Đủ tải",
              };

              return (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name={`choice_${item.id}`}
                      checked={currentChoice === "VT"}
                      onChange={() => handleChoiceChange(item.id, "VT")}
                      className="accent-emerald-600 w-3.5 h-3.5"
                    />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Vận tải
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name={`choice_${item.id}`}
                      checked={currentChoice === "KT"}
                      onChange={() => handleChoiceChange(item.id, "KT")}
                      className="accent-emerald-600 w-3.5 h-3.5"
                    />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Khai thác
                    </span>
                  </label>

                  <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name={`choice_${item.id}`}
                      checked={currentChoice === "OTHER"}
                      onChange={() => handleChoiceChange(item.id, "OTHER")}
                      className="accent-emerald-600 w-3.5 h-3.5"
                    />
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Khác
                    </span>
                  </label>

                  {currentChoice === "OTHER" && (
                    <div className="flex items-end gap-2 ml-1 animate-in fade-in-50 duration-150">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 font-semibold leading-none">
                          Loại hàng
                        </span>
                        <Select
                          value={currentCustom.cargo}
                          onValueChange={(v) =>
                            handleCustomFieldChange(item.id, "cargo", v)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-20 px-2 py-0 bg-white dark:bg-gray-900 border-gray-300 shadow-2xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Than">Than</SelectItem>
                            <SelectItem value="Đá">Đá</SelectItem>
                            <SelectItem value="Đất">Đất</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 font-semibold leading-none">
                          Số chuyến
                        </span>
                        <Input
                          type="number"
                          value={currentCustom.trips}
                          onChange={(e) =>
                            handleCustomFieldChange(
                              item.id,
                              "trips",
                              Number(e.target.value),
                            )
                          }
                          className="h-7 text-xs w-14 px-1 py-0 text-center font-bold border-gray-300 shadow-2xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 font-semibold leading-none">
                          Tải trọng
                        </span>
                        <Select
                          value={currentCustom.loadStatus}
                          onValueChange={(v) =>
                            handleCustomFieldChange(item.id, "loadStatus", v)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs w-24 px-2 py-0 bg-white dark:bg-gray-900 border-gray-300 shadow-2xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Đủ tải">Đủ tải</SelectItem>
                            <SelectItem value="Roda (2/3)">
                              Roda (2/3)
                            </SelectItem>
                            <SelectItem value="Khác (1/2)">
                              Khác (1/2)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              );
            },
            size: 250,
          },
        ],
      },

      // 6. Action Delete
      {
        id: "actions",
        header: () => <span>🗑</span>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDeleteItem?.(row.original.id);
                toast.success("Đã xóa bản ghi đối chiếu!");
              }}
              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ),
        size: 30,
      },
    ],
    [choices, customFields, onDeleteItem],
  );

  // TanStack Table Instance
  const table = useReactTable({
    data: items,
    columns,
    state: {
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <div className="space-y-3">
      {/* TanStack Table Container using shadcn UI components */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto bg-white dark:bg-gray-900 shadow-sm">
        <Table className="w-full text-xs border-collapse min-w-[1700px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className={
                  headerGroup.depth === 0
                    ? "bg-gray-100/90 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 text-[10px] font-bold border-b border-gray-200 dark:border-gray-800"
                    : "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-[10px] font-semibold border-b border-gray-200 dark:border-gray-800"
                }
              >
                {headerGroup.headers.map((header) => {
                  const isTopLevelGroup = header.depth === 0;
                  const isActionCol = header.column.id === "actions";

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={`px-1 py-1.5 text-center border-r border-gray-200 dark:border-gray-800 ${
                        isTopLevelGroup
                          ? "border-r border-gray-300 dark:border-gray-700"
                          : ""
                      } ${isActionCol ? "w-8 text-red-600" : ""}`}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isSelected = row.getIsSelected();

                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected && "selected"}
                    className={`border-b border-gray-100 dark:border-gray-800/60 transition-colors ${
                      isSelected
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30"
                        : row.index % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-slate-50/40 dark:bg-gray-900/50"
                    } hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-1 py-1.5 text-center border-r border-gray-100 dark:border-gray-800/60"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={30}
                  className="h-24 text-center text-xs text-gray-400"
                >
                  Không có bản ghi đối chiếu nào phù hợp bộ lọc!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* TanStack Table Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-gray-600 dark:text-gray-400">
        <div>
          Hiển thị{" "}
          <strong>
            {table.getFilteredRowModel().rows.length > 0
              ? table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                1
              : 0}{" "}
            -{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length,
            )}
          </strong>{" "}
          trong tổng số{" "}
          <strong className="text-gray-900 dark:text-gray-100">
            {table.getFilteredRowModel().rows.length}
          </strong>{" "}
          bản ghi
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Số bản ghi trên trang</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => {
                table.setPageSize(Number(v));
              }}
            >
              <SelectTrigger className="h-7 text-xs w-16 bg-white dark:bg-gray-900 border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
              className="h-7 w-7 p-0"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            {Array.from(
              { length: Math.min(5, table.getPageCount()) },
              (_, i) => i + 1,
            ).map((page) => (
              <Button
                key={page}
                variant={
                  page === table.getState().pagination.pageIndex + 1
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={() => table.setPageIndex(page - 1)}
                className={`h-7 w-7 p-0 text-xs font-semibold ${
                  page === table.getState().pagination.pageIndex + 1
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : ""
                }`}
              >
                {page}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              className="h-7 w-7 p-0"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
