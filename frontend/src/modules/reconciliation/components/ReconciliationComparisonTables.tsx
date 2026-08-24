import React, { useState, useMemo, useRef, useCallback } from "react";
import type {
  ReconciliationItem,
  DepartmentTarget,
} from "@/modules/dataentry/types/thong-ke";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "sonner";
import { useRoleStore } from "@/stores/useRoleStore";
import { RequestChangeModal } from "./RequestChangeModal";
import { useAuth } from "@/auth/useAuth";
import { useMasterData } from "@/modules/dataentry/hooks/useMasterData";
import {
  createReconciliationColumns,
  COMMON_INFO_COL_WIDTH,
  type ReconciliationColumnsMeta,
} from "../columns";

interface ReconciliationComparisonTablesProps {
  items: ReconciliationItem[];
  onDeleteItem?: (id: string) => void;
  onUpdateItem?: (updatedItem: ReconciliationItem) => void;
  onRequestChangeSubmit?: (
    rowId: string,
    note: string,
    target: DepartmentTarget,
  ) => void;
  onApproveItem?: (rowId: string) => void;
  onResubmitItem?: (rowId: string) => void;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}

export const ReconciliationComparisonTables: React.FC<
  ReconciliationComparisonTablesProps
> = ({
  items,
  onDeleteItem,
  onUpdateItem,
  onRequestChangeSubmit,
  onApproveItem,
  onResubmitItem,
  rowSelection: propRowSelection,
  onRowSelectionChange: propOnRowSelectionChange,
}) => {
  const currentRole = useRoleStore((state) => state.currentRole);
  const { user } = useAuth();
  const userDepartmentId = user?.departmentId ?? null;

  const masterData = useMasterData();
  const {
    cargoTypeValues = [],
    materialValues = [],
    operatorOptions = [],
    getOperatorDetails,
  } = masterData;

  const availableCargoTypes = useMemo(() => {
    return cargoTypeValues.length
      ? cargoTypeValues
      : ["Than", "Đá mi bụi", "Đá 2x4", "Đá 4x6", "Đất"];
  }, [cargoTypeValues]);

  const availableMaterials = useMemo(() => {
    return materialValues.length
      ? materialValues
      : cargoTypeValues.length
        ? cargoTypeValues
        : ["Than", "Đá mi bụi", "Đá 2x4", "Đá 4x6", "Đất"];
  }, [materialValues, cargoTypeValues]);

  // ─── Local dirty edits per row ─────────────────────────────────────────
  const [dirtyRows, setDirtyRows] = useState<Map<string, ReconciliationItem>>(
    new Map(),
  );

  const dirtyRowsRef = useRef(dirtyRows);
  dirtyRowsRef.current = dirtyRows;

  const getDirtyRow = useCallback(
    (item: ReconciliationItem): ReconciliationItem =>
      dirtyRowsRef.current.get(item.id) ?? item,
    [],
  );

  const setDirtyField = useCallback(
    (
      item: ReconciliationItem,
      updater: (draft: ReconciliationItem) => void,
    ) => {
      setDirtyRows((prev) => {
        const next = new Map(prev);
        const current = next.get(item.id) ?? { ...item };
        const draft = JSON.parse(JSON.stringify(current)) as ReconciliationItem;
        updater(draft);
        next.set(item.id, draft);
        return next;
      });
    },
    [],
  );

  const clearDirtyRow = useCallback((id: string) => {
    setDirtyRows((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const canEditRecord = useCallback(
    (item: ReconciliationItem): boolean => {
      if (userDepartmentId === null || userDepartmentId === undefined)
        return true;
      if (currentRole === "ROLE_TRANSPORT") {
        const recDeptId = item.transportRecord?.departmentId;
        if (recDeptId === undefined || recDeptId === null) return true;
        return recDeptId === userDepartmentId;
      }
      if (currentRole === "ROLE_MINING") {
        const recDeptId = item.miningRecord?.departmentId;
        if (recDeptId === undefined || recDeptId === null) return true;
        return recDeptId === userDepartmentId;
      }
      return true;
    },
    [currentRole, userDepartmentId],
  );
  // canEditRecord đổi reference khi role/departmentId đổi — không sao, vì nó
  // chỉ được ĐỌC qua metaRef, không còn nằm trong dependency của columns.

  const [internalRowSelection, setInternalRowSelection] = useState<
    Record<string, boolean>
  >({});
  const rowSelection = propRowSelection ?? internalRowSelection;
  const setRowSelection = propOnRowSelectionChange ?? setInternalRowSelection;

  const [requestModalItem, setRequestModalItem] =
    useState<ReconciliationItem | null>(null);

  const isMatched = useCallback((item: ReconciliationItem) => {
    const t = item.transportRecord;
    const m = item.miningRecord;
    if (!t || !m) return false;
    const sameTrips = (t.tripCount ?? 0) === (m.tripCount ?? 0);
    const sameCargo =
      (t.cargoType || "").trim().toLowerCase() ===
      (m.material || "").trim().toLowerCase();
    return sameTrips && sameCargo;
  }, []);

  // ─── Sync Scroll Refs ───────────────────────────────────────────────────
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const cellScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const syncScroll = useCallback((source: HTMLDivElement) => {
    const left = source.scrollLeft;
    if (headerScrollRef.current && headerScrollRef.current !== source) {
      headerScrollRef.current.scrollLeft = left;
    }
    cellScrollRefs.current.forEach((el) => {
      if (el && el !== source) el.scrollLeft = left;
    });
  }, []);

  const onHeaderScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => syncScroll(e.currentTarget),
    [syncScroll],
  );
  const onCellScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => syncScroll(e.currentTarget),
    [syncScroll],
  );

  // ─── Drag to scroll ─────────────────────────────────────────────────────
  const dragState = useRef<{
    el: HTMLDivElement;
    startX: number;
    startScrollLeft: number;
  } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName.toLowerCase() === "input" ||
      target.tagName.toLowerCase() === "button" ||
      target.closest("button") ||
      target.closest("input") ||
      target.getAttribute("role") === "checkbox" ||
      target.closest("[role='checkbox']")
    ) {
      return;
    }

    const el = e.currentTarget;
    dragState.current = {
      el,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
    };
    el.style.cursor = "grabbing";
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      const dx = e.clientX - dragState.current.startX;
      dragState.current.el.scrollLeft = dragState.current.startScrollLeft - dx;
      syncScroll(dragState.current.el);
    },
    [syncScroll],
  );

  const onMouseUp = useCallback(() => {
    if (!dragState.current) return;
    dragState.current.el.style.cursor = "grab";
    dragState.current = null;
  }, []);

  // dragProps là object literal -> nếu để trong dependency của columns nó
  // sẽ luôn "mới" mỗi render. Giờ nó chỉ sống trong metaRef.
  const dragProps = useMemo(
    () => ({
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave: onMouseUp,
    }),
    [onMouseDown, onMouseMove, onMouseUp],
  );

  // ─── metaRef: nơi DUY NHẤT chứa các giá trị "hay đổi" mà cell cần đọc ───
  // Cập nhật ngay trong thân render (không cần useEffect) nên luôn là giá
  // trị mới nhất tại thời điểm React gọi cell() để vẽ lại UI.
  const metaRef = useRef<ReconciliationColumnsMeta>(null as any);
  metaRef.current = {
    currentRole,
    canEditRecord,
    getDirtyRow,
    setDirtyField,
    clearDirtyRow,
    dirtyRowsRef,
    isMatched,
    onDeleteItem,
    onUpdateItem,
    onApproveItem,
    onResubmitItem,
    setRequestModalItem,
    availableCargoTypes,
    availableMaterials,
    operatorOptions,
    getOperatorDetails,
    headerScrollRef,
    cellScrollRefs,
    onHeaderScroll,
    onCellScroll,
    dragProps,
  };

  // ─── Column Definitions ─────────────────────────────────────────────────
  // QUAN TRỌNG: deps = [] — columns chỉ được tạo ĐÚNG 1 LẦN cho vòng đời của
  // component. Mọi dữ liệu động (role, dirty state, master data, callbacks)
  // được đọc qua metaRef bên trong từng cell tại thời điểm render, không làm
  // đổi reference của `columns`. Nhờ vậy react-table/flexRender không bao
  // giờ coi cell là "component khác" -> input không bị unmount -> không còn
  // mất focus / nhảy sang ô khác khi gõ.
  const columns = useMemo<ColumnDef<ReconciliationItem>[]>(
    () => createReconciliationColumns(metaRef),
    [currentRole],
  );

  const table = useReactTable({
    data: items,
    columns,
    getRowId: (row) => row.id,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Gán các hàm chọn tất cả vào metaRef sau khi khởi tạo table
  metaRef.current.isAllSelected = table.getIsAllRowsSelected();
  metaRef.current.isSomeSelected = table.getIsSomeRowsSelected();
  metaRef.current.onToggleSelectAll = (checked: boolean) =>
    table.toggleAllRowsSelected(checked);

  return (
    <div className="space-y-3">
      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto  dark:bg-gray-900 shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-gray-200 dark:border-gray-800 text-sm font-bold"
              >
                {headerGroup.headers.map((header) => {
                  const isTopLevelGroup = header.depth === 0;
                  const isGroupTransport =
                    header.id === "group_transport_data" ||
                    header.column.parent?.id === "group_transport_data" ||
                    header.id.startsWith("trans");
                  const isGroupMining =
                    header.id === "group_mining_data" ||
                    header.column.parent?.id === "group_mining_data" ||
                    header.id.startsWith("mining");
                  const isGroupAction =
                    header.id === "group_workflow_action" ||
                    header.id === "actions";

                  let headerBg =
                    " dark:bg-gray-800 text-gray-900 dark:text-gray-100";

                  if (isTopLevelGroup) {
                    if (isGroupTransport) {
                      headerBg =
                        "bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-r border-emerald-200 dark:border-emerald-800";
                    } else if (isGroupMining) {
                      headerBg =
                        "bg-sky-50/90 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200 border-r border-sky-200 dark:border-sky-800";
                    } else if (isGroupAction) {
                      headerBg =
                        "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100";
                    }
                  } else {
                    if (isGroupTransport) {
                      headerBg =
                        "bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border-r border-emerald-200 dark:border-emerald-800";
                    } else if (isGroupMining) {
                      headerBg =
                        "bg-sky-50/90 dark:bg-sky-950/50 text-sky-900 dark:text-sky-200 border-r border-sky-200 dark:border-sky-800";
                    }
                  }

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={`text-center font-bold text-sm border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${headerBg} ${
                        header.id === "common_info_panel"
                          ? "p-0 overflow-hidden"
                          : "px-2 py-2.5"
                      }`}
                      style={{
                        width:
                          header.id === "common_info_panel"
                            ? COMMON_INFO_COL_WIDTH
                            : header.getSize(),
                        minWidth:
                          header.id === "common_info_panel"
                            ? COMMON_INFO_COL_WIDTH
                            : header.getSize(),
                        maxWidth:
                          header.id === "common_info_panel"
                            ? COMMON_INFO_COL_WIDTH
                            : undefined,
                      }}
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
                const item = row.original;
                const matched = isMatched(item);
                const isSelected = row.getIsSelected();
                const isChangesRequested =
                  item.reconciliationStatus === "REVISION_REQUESTED" ||
                  Boolean(item.requestNote);

                let rowBg = "";
                let rowBorder = "";
                if (isSelected) {
                  rowBg = "bg-blue-100/80 hover:bg-blue-100 dark:bg-blue-900/50 dark:hover:bg-blue-900/60";
                } else if (isChangesRequested) {
                  // ponytail: amber/blue tint + viền nổi bật cho các dòng có yêu cầu chỉnh sửa
                  rowBg = "bg-amber-50/90 hover:bg-amber-100/90 dark:bg-amber-950/40 dark:hover:bg-amber-900/50";
                  rowBorder = "border-l-4 border-l-amber-500 dark:border-l-amber-400";
                } else if (matched) {
                  // ponytail: light blue highlight for matched rows matching the check icon
                  rowBg = "bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/25 dark:hover:bg-blue-900/35";
                } else {
                  // ponytail: light amber highlight for mismatched rows matching the alert icon
                  rowBg = "bg-amber-50/80 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-900/40";
                }

                return (
                  <TableRow
                    key={row.id}
                    className={`border-b border-gray-100 dark:border-gray-800 transition-colors ${rowBg} ${rowBorder}`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const colId = cell.column.id;
                      const isCommonInfo = colId === "common_info_panel";
                      let cellBg = "";

                      return (
                        <TableCell
                          key={cell.id}
                          className={`text-center border-r border-gray-100 dark:border-gray-800/80 last:border-r-0 ${cellBg} ${
                            isCommonInfo ? "p-0 overflow-hidden" : "px-2 py-2"
                          }`}
                          style={{
                            width: isCommonInfo
                              ? COMMON_INFO_COL_WIDTH
                              : cell.column.getSize(),
                            minWidth: isCommonInfo
                              ? COMMON_INFO_COL_WIDTH
                              : cell.column.getSize(),
                            maxWidth: isCommonInfo
                              ? COMMON_INFO_COL_WIDTH
                              : undefined,
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-24 text-center text-gray-500"
                >
                  Không có dữ liệu đối chiếu
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ══ Pagination & Footer Controls ════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-sm text-gray-600 dark:text-gray-400">
        <div>
          Hiển thị{" "}
          <strong>
            {items.length > 0
              ? table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize +
                1
              : 0}{" "}
            -{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) *
                table.getState().pagination.pageSize,
              items.length,
            )}
          </strong>{" "}
          trong tổng số{" "}
          <strong className="text-gray-900 dark:text-gray-100">
            {items.length}
          </strong>{" "}
          bản ghi
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Số bản ghi trên trang</span>
            <select
              value={String(table.getState().pagination.pageSize)}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="h-7 text-xs px-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
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
                className={`h-7 w-7 p-0 text-sm font-semibold ${
                  page === table.getState().pagination.pageIndex + 1
                    ? "bg-blue-600 text-white hover:bg-blue-700"
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

      {/* Modal Yêu Cầu Sửa */}
      <RequestChangeModal
        isOpen={Boolean(requestModalItem)}
        onClose={() => setRequestModalItem(null)}
        items={requestModalItem ? [requestModalItem] : []}
        onSubmit={(requests) => {
          requests.forEach((req) => {
            onRequestChangeSubmit?.(req.rowId, req.note, req.target);
          });
          setRequestModalItem(null);
          toast.success("Đã gửi yêu cầu chỉnh sửa đến đơn vị!");
        }}
      />
    </div>
  );
};
