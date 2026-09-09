import React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type {
  ReconciliationItem,
  ReconcileWorkflowStatus,
  RoleType,
} from "@/modules/dataentry/types/thong-ke";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CustomNoteTooltip } from "@/modules/reconciliation/components/CustomNoteTooltip";
import { ReconciliationHistoryPopover } from "@/modules/reconciliation/components/ReconciliationHistoryPopover";
import {
  Check,
  AlertTriangle,
  Trash2,
  Send,
  MessageSquare,
  Clock,
  FileEdit,
  Save,
  X,
} from "lucide-react";
import { ComboboxInput } from "@/components/ui/combobox-input";
import { LoadStatusRadioGroup } from "@/modules/dataentry/components/LoadStatusRadioGroup";
import { toast } from "sonner";
import type { MasterOption } from "@/modules/dataentry/hooks/useMasterData";

// ─── Width constants ────────────────────────────────────────────────────────
export const COMMON_INFO_COL_WIDTH = 530;

export const SUB_FIELD_WIDTHS: Record<string, number> = {
  select: 70,
  stt: 50,
  date: 125,
  shift: 70,
  vehicleNo: 110,
  excavationArea: 130,
  excavatorEquipment: 120,
  pickupLocation: 130,
  unloadBench: 100,
  pickupBenchGroup: 140,
  fullRouteDistance: 145,
  fullRouteElevate: 145,
  localSlopeDist: 145,
  localSlopeDegree: 130,
  unloadLocationName: 125,
  isRainyDay: 85,
  isTraineeVehicle: 85,
};

export interface SubField {
  id: string;
  label: string;
  render: (item: ReconciliationItem, checked?: boolean) => React.ReactNode;
}

export const COMMON_SUB_FIELDS: SubField[] = [
  { id: "select", label: "", render: () => null },
  { id: "stt", label: "STT", render: () => null },
  {
    id: "date",
    label: "Thời gian",
    render: (item) => {
      const day = item.commonKey.day
        ? String(item.commonKey.day).padStart(2, "0")
        : "--";
      const month = item.commonKey.month
        ? String(item.commonKey.month).padStart(2, "0")
        : "--";
      return `${day}/${month}/2026`;
    },
  },
  {
    id: "shift",
    label: "Ca",
    render: (item) => item.commonKey.shift || "-",
  },
  {
    id: "vehicleNo",
    label: "Số xe",
    render: (item) => item.commonKey.vehicleNo || "-",
  },
  {
    id: "excavationArea",
    label: "Khu vực xúc",
    render: (item) => item.transportRecord?.excavationArea || "-",
  },
  {
    id: "excavatorEquipment",
    label: "Máy xúc",
    render: (item) =>
      item.transportRecord?.excavatorEquipment ||
      item.miningRecord?.mineCode ||
      "-",
  },
  {
    id: "pickupLocation",
    label: "Nơi nhận tải",
    render: (item) =>
      item.transportRecord?.pickupLocation ||
      item.miningRecord?.pickupLocation ||
      "-",
  },
  {
    id: "unloadBench",
    label: "Tầng dỡ tải",
    render: (item) => item.transportRecord?.unloadBench || "-",
  },
  {
    id: "pickupBenchGroup",
    label: "Nhóm tầng nhận",
    render: (item) =>
      item.transportRecord?.pickupBenchGroup ||
      item.transportRecord?.pickupBench ||
      "-",
  },
  {
    id: "fullRouteDistance",
    label: "CĐ toàn tuyến (km)",
    render: (item) => item.transportRecord?.fullRouteDistance ?? "-",
  },
  {
    id: "fullRouteElevate",
    label: "Nâng tải toàn tuyến (m)",
    render: (item) => item.transportRecord?.fullRouteElevate ?? "-",
  },
  {
    id: "localSlopeDist",
    label: "CĐ dốc cục bộ (km)",
    render: (item) => item.transportRecord?.localSlopeDist ?? "-",
  },
  {
    id: "localSlopeDegree",
    label: "Dốc cục bộ (m)",
    render: (item) => item.transportRecord?.localSlopeDegree ?? "-",
  },
  {
    id: "unloadLocationName",
    label: "Vị trí dỡ tải",
    render: (item) =>
      item.transportRecord?.unloadLocationName ||
      item.miningRecord?.dumpLocation ||
      "-",
  },
  {
    id: "isRainyDay",
    label: "Ngày mưa",
    render: (item) => (
      <Checkbox
        checked={item.transportRecord?.isRainyDay ?? false}
        disabled
        className="border-gray-400 dark:border-gray-500 disabled:opacity-100 disabled:cursor-default"
      />
    ),
  },
  {
    id: "isTraineeVehicle",
    label: "Xe bổ túc",
    render: (item) => (
      <Checkbox
        checked={item.transportRecord?.isTraineeVehicle ?? false}
        disabled
        className="border-gray-400 dark:border-gray-500 disabled:opacity-100 disabled:cursor-default"
      />
    ),
  },
];

export const CommonInfoSubHeader: React.FC<{
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  dragProps?: {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
  onToggleSelectAll?: (checked: boolean) => void;
}> = ({
  scrollRef,
  onScroll,
  dragProps,
  isAllSelected,
  isSomeSelected,
  onToggleSelectAll,
}) => {
  // ponytail: cột "select" (checkbox) tách ra khỏi vùng scroll -> luôn cố định
  const scrollableFields = COMMON_SUB_FIELDS.filter((f) => f.id !== "select");
  const checkboxWidth = SUB_FIELD_WIDTHS.select;

  return (
    <div
      className="flex h-full items-stretch bg-gray-50 dark:bg-gray-900"
      style={{ width: COMMON_INFO_COL_WIDTH, maxWidth: COMMON_INFO_COL_WIDTH }}
    >
      {/* Cột checkbox - CỐ ĐỊNH, không tham gia scroll ngang */}
      <div
        className="shrink-0 flex items-center justify-center border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
        style={{ width: checkboxWidth }}
      >
        <Checkbox
          checked={
            isAllSelected ? true : isSomeSelected ? "indeterminate" : false
          }
          onCheckedChange={(checked) => onToggleSelectAll?.(Boolean(checked))}
          className="border-gray-400 dark:border-gray-500"
        />
      </div>

      {/* Các cột thông tin chung còn lại - vẫn scroll ngang như cũ */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        {...dragProps}
        className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden cursor-grab select-none items-center flex-1"
        style={{ scrollbarWidth: "none" }}
      >
        {scrollableFields.map((f) => (
          <div
            key={f.id}
            className="shrink-0 px-1.5 py-1 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0 flex items-center justify-center min-h-[32px]"
            style={{ width: SUB_FIELD_WIDTHS[f.id] }}
          >
            {f.label}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * ─────────────────────────────────────────────────────────────────────────
 * QUAN TRỌNG — vì sao dùng `metaRef` thay vì truyền trực tiếp props/callback:
 *
 * TanStack Table gọi `flexRender(cell.column.columnDef.cell, ctx)`. Nếu hàm
 * `cell` đó bị tạo MỚI (reference khác) ở lần render sau — tức là `columns`
 * bị build lại — thì React coi đây là một "component type" khác, sẽ
 * UNMOUNT + MOUNT LẠI toàn bộ DOM của ô đó. Với các ô có <Input>/<ComboboxInput>
 * đang được focus, hệ quả là: gõ 1 ký tự -> input bị remount -> mất focus ->
 * con trỏ "nhảy" sang phần tử khác.
 *
 * Trước đây `columns` được useMemo với rất nhiều dependency (currentRole,
 * canEditRecord, các callback từ component cha, availableCargoTypes,
 * availableMaterials, operatorOptions, getOperatorDetails, dragProps...).
 * Chỉ cần 1 trong số đó không ổn định về reference (rất thường gặp: hook
 * `useMasterData()` trả về array/object mới mỗi lần gọi, hoặc component cha
 * truyền callback dạng inline arrow function) là `columns` sẽ bị rebuild
 * ngay cả khi chỉ gõ 1 ký tự (vì gõ chữ -> setDirtyRows -> re-render).
 *
 * Giải pháp: `columns` chỉ được tạo ĐÚNG 1 LẦN (xem cách gọi
 * `createReconciliationColumns` với useMemo deps = [] ở component cha).
 * Mọi giá trị "hay đổi" (role, dirtyRows, master data, callbacks...) được
 * đọc qua `metaRef.current.*` ngay tại thời điểm cell được gọi để render —
 * luôn là giá trị mới nhất, nhưng KHÔNG làm đổi reference của `columns`.
 * ─────────────────────────────────────────────────────────────────────────
 */
export interface ReconciliationColumnsMeta {
  currentRole: RoleType;
  canEditRecord: (item: ReconciliationItem) => boolean;
  getDirtyRow: (item: ReconciliationItem) => ReconciliationItem;
  setDirtyField: (
    item: ReconciliationItem,
    updater: (draft: ReconciliationItem) => void,
  ) => void;
  clearDirtyRow: (id: string) => void;
  dirtyRowsRef: React.MutableRefObject<Map<string, ReconciliationItem>>;
  isMatched: (item: ReconciliationItem) => boolean;
  onDeleteItem?: (id: string) => void;
  onUpdateItem?: (updatedItem: ReconciliationItem) => void;
  onApproveItem?: (rowId: string) => void;
  onResubmitItem?: (rowId: string) => void;
  setRequestModalItem: (item: ReconciliationItem | null) => void;
  availableCargoTypes: string[];
  availableMaterials: string[];
  operatorOptions: MasterOption[];
  getOperatorDetails?: (badgeNo: string) => {
    operatorName: string;
    operatorUnit: string;
  };
  headerScrollRef: React.RefObject<HTMLDivElement | null>;
  cellScrollRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onHeaderScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onCellScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  dragProps: {
    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
  onToggleSelectAll?: (checked: boolean) => void;
}

/** @deprecated giữ lại tên cũ để không phải sửa import ở nơi khác */
export type CreateReconciliationColumnsOptions = ReconciliationColumnsMeta;

/**
 * Tạo mảng columns. Hàm này chỉ nên được gọi 1 LẦN (useMemo deps = []).
 * Mọi dữ liệu động phải đi qua `metaRef.current`, không đóng gói (closure)
 * trực tiếp giá trị truyền vào tại thời điểm gọi hàm này.
 */
export function createReconciliationColumns(
  metaRef: React.MutableRefObject<ReconciliationColumnsMeta>,
): ColumnDef<ReconciliationItem>[] {
  const meta = () => metaRef.current;

  return [
    // 1. THÔNG TIN CHUNG
    {
      id: "group_common_info",
      header: () => (
        <div className="text-center font-bold text-gray-800 dark:text-gray-200">
          THÔNG TIN CHUNG
        </div>
      ),
      columns: [
        {
          id: "common_info_panel",
          header: () => (
            <CommonInfoSubHeader
              scrollRef={
                meta().headerScrollRef as React.RefObject<HTMLDivElement | null>
              }
              onScroll={meta().onHeaderScroll}
              dragProps={meta().dragProps}
              isAllSelected={meta().isAllSelected}
              isSomeSelected={meta().isSomeSelected}
              onToggleSelectAll={meta().onToggleSelectAll}
            />
          ),
          cell: ({ row }) => {
            const item = row.original;
            const isSelected = row.getIsSelected();
            const { cellScrollRefs, onCellScroll, dragProps } = meta();
            // ponytail: cột "select" (checkbox) tách khỏi vùng scroll -> cố định
            const scrollableFields = COMMON_SUB_FIELDS.filter(
              (f) => f.id !== "select",
            );
            const checkboxWidth = SUB_FIELD_WIDTHS.select;

            return (
              <div
                className="flex items-stretch"
                style={{
                  width: COMMON_INFO_COL_WIDTH,
                  maxWidth: COMMON_INFO_COL_WIDTH,
                }}
              >
                {/* Cột checkbox - CỐ ĐỊNH, không tham gia scroll ngang */}
                <div
                  className="shrink-0 flex items-center justify-center px-1.5 py-2 border-r border-gray-100 dark:border-gray-800/60"
                  style={{ width: checkboxWidth }}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => row.toggleSelected(!isSelected)}
                    className="border-gray-400 dark:border-gray-500"
                  />
                </div>

                {/* Các cột thông tin chung còn lại - vẫn scroll ngang, đồng bộ với header */}
                <div
                  ref={(el) => {
                    if (el) cellScrollRefs.current.set(row.id, el);
                    else cellScrollRefs.current.delete(row.id);
                  }}
                  onScroll={onCellScroll}
                  {...dragProps}
                  className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden cursor-grab select-none flex-1"
                  style={{ scrollbarWidth: "none" }}
                >
                  {scrollableFields.map((f) => {
                    let content: React.ReactNode;
                    if (f.id === "stt") {
                      // hiển thị chỉ báo chấm xanh động khi dòng có yêu cầu sửa / không duyệt từ Thống kê
                      const hasNote = Boolean(item.requestNote);
                      const isChangesRequested =
                        item.reconciliationStatus === "REVISION_REQUESTED" ||
                        hasNote;

                      if (isChangesRequested) {
                        const sttIndicator = (
                          <div className="flex items-center justify-center gap-1 cursor-help font-semibold text-blue-700 dark:text-blue-400">
                            <span>{row.index + 1}</span>
                            <span
                              className="w-2 h-2 rounded-full bg-blue-500 ring-2 ring-blue-200 dark:ring-blue-900 animate-pulse shrink-0"
                              title="Có yêu cầu chỉnh sửa từ Thống kê"
                            />
                          </div>
                        );

                        content = hasNote ? (
                          <CustomNoteTooltip note={item.requestNote}>
                            {sttIndicator}
                          </CustomNoteTooltip>
                        ) : (
                          sttIndicator
                        );
                      } else {
                        content = <span>{row.index + 1}</span>;
                      }
                    } else {
                      content = f.render(item);
                    }

                    return (
                      <div
                        key={f.id}
                        className="shrink-0 flex items-center justify-center px-1.5 py-2 text-sm border-r border-gray-100 dark:border-gray-800/60 last:border-r-0 whitespace-nowrap"
                        style={{ width: SUB_FIELD_WIDTHS[f.id] }}
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          },
          size: COMMON_INFO_COL_WIDTH,
        },
      ],
    },

    // 2. SỐ LIỆU BÁO CHUYẾN (VẬN TẢI) (5 cols)
    {
      id: "group_transport_data",
      header: "SỐ LIỆU BÁO CHUYẾN (VẬN TẢI)",
      columns: [
        {
          id: "transCargo",
          header: "Loại hàng",
          cell: ({ row }) => {
            const {
              getDirtyRow,
              currentRole,
              canEditRecord,
              setDirtyField,
              availableCargoTypes,
            } = meta();
            const dirtyItem = getDirtyRow(row.original);
            const val = dirtyItem.transportRecord?.cargoType || "-";
            const editable =
              currentRole === "ROLE_TRANSPORT" && canEditRecord(row.original);
            if (editable) {
              return (
                <ComboboxInput
                  value={val === "-" ? "" : val}
                  onChange={(newCargo) => {
                    setDirtyField(row.original, (d) => {
                      if (!d.transportRecord) d.transportRecord = {} as any;
                      d.transportRecord!.cargoType = newCargo;
                    });
                  }}
                  options={availableCargoTypes}
                  className="h-7 text-xs w-full min-w-[100px]"
                />
              );
            }
            if (
              currentRole === "ROLE_TRANSPORT" &&
              !canEditRecord(row.original)
            ) {
              return (
                <span
                  className="text-gray-400 text-sm italic"
                  title="Không thuộc đơn vị của bạn"
                >
                  {val}
                </span>
              );
            }
            return <span className="text-sm">{val}</span>;
          },
          size: 125,
        },
        {
          id: "transTrips",
          header: "Số chuyến",
          cell: ({ row }) => {
            const { getDirtyRow, currentRole, canEditRecord, setDirtyField } =
              meta();
            const dirtyItem = getDirtyRow(row.original);
            const trips = dirtyItem.transportRecord?.tripCount ?? 0;
            const editable =
              currentRole === "ROLE_TRANSPORT" && canEditRecord(row.original);
            if (editable) {
              return (
                <Input
                  type="number"
                  min={1}
                  value={trips}
                  onChange={(e) => {
                    setDirtyField(row.original, (d) => {
                      if (!d.transportRecord) d.transportRecord = {} as any;
                      d.transportRecord!.tripCount = Number(e.target.value);
                    });
                  }}
                  className="h-7 text-xs w-16 text-center bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                />
              );
            }
            return (
              <span>{row.original.transportRecord?.tripCount ?? "-"}</span>
            );
          },
          size: 85,
        },
        {
          id: "transLoadStatus",
          header: "Tải trọng",
          cell: ({ row }) => {
            const { getDirtyRow, currentRole, canEditRecord, setDirtyField } =
              meta();
            const dirtyItem = getDirtyRow(row.original);
            const val = dirtyItem.transportRecord?.loadStatus;
            const note =
              (dirtyItem.transportRecord as any)?.loadStatusNote || "";
            const hasRecord = Boolean(dirtyItem.transportRecord);
            const editable =
              currentRole === "ROLE_TRANSPORT" &&
              canEditRecord(row.original) &&
              hasRecord;
            if (editable) {
              return (
                <div className="min-w-[135px] text-left">
                  <LoadStatusRadioGroup
                    value={val || "Đủ tải"}
                    note={note}
                    onChange={(newVal, newNote) => {
                      setDirtyField(row.original, (d) => {
                        if (!d.transportRecord) d.transportRecord = {} as any;
                        d.transportRecord!.loadStatus = newVal;
                        (d.transportRecord as any).loadStatusNote = newNote;
                      });
                    }}
                    onNoteChange={(newNote) => {
                      setDirtyField(row.original, (d) => {
                        if (!d.transportRecord) d.transportRecord = {} as any;
                        (d.transportRecord as any).loadStatusNote = newNote;
                      });
                    }}
                    direction="column"
                    colorScheme="emerald"
                  />
                </div>
              );
            }
            if (!val) {
              return <span className="text-sm">-</span>;
            }
            return (
              <span className="text-sm">
                {val === "Khác" && note ? `Khác (${note})` : val}
              </span>
            );
          },
          size: 145,
        },
        {
          id: "transBadgeNo",
          header: "Số thẻ lương",
          cell: ({ row }) => {
            const {
              getDirtyRow,
              currentRole,
              canEditRecord,
              setDirtyField,
              operatorOptions,
            } = meta();
            const dirtyItem = getDirtyRow(row.original);
            const val = dirtyItem.transportRecord?.operatorBadgeNo || "-";
            const editable =
              currentRole === "ROLE_TRANSPORT" && canEditRecord(row.original);
            if (editable) {
              return (
                <ComboboxInput
                  value={val === "-" ? "" : val}
                  onChange={(v) => {
                    setDirtyField(row.original, (d) => {
                      if (!d.transportRecord) d.transportRecord = {} as any;
                      d.transportRecord!.operatorBadgeNo = v;
                    });
                  }}
                  options={operatorOptions}
                  className="h-7 text-xs w-full min-w-[105px]"
                />
              );
            }
            return <span className="text-sm">{val}</span>;
          },
          size: 130,
        },
        {
          id: "transCreatedBy",
          header: "Người nhập chuyến",
          cell: ({ row }) => {
            const { getDirtyRow } = meta();
            const dirtyItem = getDirtyRow(row.original);
            const val = dirtyItem.transportRecord?.employeeFullName ?? "";
            return (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {val}
              </span>
            );
          },
          size: 130,
        },
      ],
    },

    // 3. SỐ LIỆU BÁO CHUYẾN (KHAI THÁC) (5 cols)
    {
      id: "group_mining_data",
      header: "SỐ LIỆU BÁO CHUYẾN (KHAI THÁC)",
      columns: [
        {
          id: "miningCargo",
          header: "Loại hàng",
          cell: ({ row }) => {
            const {
              getDirtyRow,
              currentRole,
              canEditRecord,
              setDirtyField,
              availableMaterials,
            } = meta();
            const dirtyItem = getDirtyRow(row.original);
            const val = dirtyItem.miningRecord?.material || "-";
            const editableMining =
              currentRole === "ROLE_MINING" && canEditRecord(row.original);
            if (editableMining) {
              return (
                <ComboboxInput
                  value={val === "-" ? "" : val}
                  onChange={(newMaterial) => {
                    setDirtyField(row.original, (d) => {
                      if (!d.miningRecord) d.miningRecord = {} as any;
                      d.miningRecord!.material = newMaterial;
                    });
                  }}
                  options={availableMaterials}
                  className="h-7 text-xs w-full min-w-[100px]"
                />
              );
            }
            if (currentRole === "ROLE_MINING" && !canEditRecord(row.original)) {
              return (
                <span
                  className="text-gray-400 text-sm italic"
                  title="Không thuộc đơn vị của bạn"
                >
                  {val}
                </span>
              );
            }
            return <span className="text-sm">{val}</span>;
          },
          size: 125,
        },
        {
          id: "miningTrips",
          header: "Số chuyến",
          cell: ({ row }) => {
            const { getDirtyRow, currentRole, canEditRecord, setDirtyField } =
              meta();
            const editableMiningTrips =
              currentRole === "ROLE_MINING" && canEditRecord(row.original);
            if (editableMiningTrips) {
              const dirtyItem = getDirtyRow(row.original);
              const trips = dirtyItem.miningRecord?.tripCount ?? 0;
              return (
                <Input
                  type="number"
                  min={1}
                  value={trips}
                  onChange={(e) => {
                    setDirtyField(row.original, (d) => {
                      if (!d.miningRecord) d.miningRecord = {} as any;
                      d.miningRecord!.tripCount = Number(e.target.value);
                    });
                  }}
                  className="h-7 text-xs w-16 text-center bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                />
              );
            }
            return <span>{row.original.miningRecord?.tripCount ?? "-"}</span>;
          },
          size: 85,
        },
        {
          id: "miningLoadStatus",
          header: "Tải trọng",
          cell: ({ row }) => {
            const { getDirtyRow, currentRole, canEditRecord, setDirtyField } =
              meta();
            const dirtyItem = getDirtyRow(row.original);
            const val = dirtyItem.miningRecord?.loadStatus;
            const note = (dirtyItem.miningRecord as any)?.loadStatusNote || "";
            const hasRecord = Boolean(dirtyItem.miningRecord);
            const editableMining =
              currentRole === "ROLE_MINING" &&
              canEditRecord(row.original) &&
              hasRecord;
            if (editableMining) {
              return (
                <div className="min-w-[135px] text-left">
                  <LoadStatusRadioGroup
                    value={val || "Đủ tải"}
                    note={note}
                    onChange={(newVal, newNote) => {
                      setDirtyField(row.original, (d) => {
                        if (!d.miningRecord) d.miningRecord = {} as any;
                        d.miningRecord!.loadStatus = newVal;
                        (d.miningRecord as any).loadStatusNote = newNote;
                      });
                    }}
                    onNoteChange={(newNote) => {
                      setDirtyField(row.original, (d) => {
                        if (!d.miningRecord) d.miningRecord = {} as any;
                        (d.miningRecord as any).loadStatusNote = newNote;
                      });
                    }}
                    direction="column"
                    colorScheme="sky"
                  />
                </div>
              );
            }
            if (!val) {
              return <span className="text-sm">-</span>;
            }
            return (
              <span className="text-sm">
                {val === "Khác" && note ? `Khác (${note})` : val}
              </span>
            );
          },
          size: 145,
        },
        {
          id: "miningBadgeNo",
          header: "Số thẻ lương",
          cell: ({ row }) => {
            const {
              getDirtyRow,
              currentRole,
              canEditRecord,
              setDirtyField,
              operatorOptions,
            } = meta();
            const dirtyItem = getDirtyRow(row.original);
            const val = dirtyItem.miningRecord?.operatorBadgeNo || "-";
            const editableMining =
              currentRole === "ROLE_MINING" && canEditRecord(row.original);
            if (editableMining) {
              return (
                <ComboboxInput
                  value={val === "-" ? "" : val}
                  onChange={(v) => {
                    setDirtyField(row.original, (d) => {
                      if (!d.miningRecord) d.miningRecord = {} as any;
                      d.miningRecord!.operatorBadgeNo = v;
                    });
                  }}
                  options={operatorOptions}
                  className="h-7 text-xs w-full min-w-[105px]"
                />
              );
            }
            return <span className="text-sm">{val}</span>;
          },
          size: 130,
        },
        {
          id: "miningCreatedBy",
          header: "Người nhập chuyến",
          cell: ({ row }) => {
            const { getDirtyRow } = meta();
            const dirtyItem = getDirtyRow(row.original);
            const val = dirtyItem.miningRecord?.employeeFullName ?? "";
            return (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {val}
              </span>
            );
          },
          size: 130,
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
            meta().isMatched(row.original) ? (
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center mx-auto font-bold">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            ) : (
              <span className="text-gray-400">-</span>
            ),
          size: 60,
        },
        {
          id: "mismatched",
          header: "Sai lệch",
          cell: ({ row }) => {
            const bRow = row.original.backendRow;
            const hasHistory =
              bRow?.transportHistoryAvailable || bRow?.excavationHistoryAvailable;
            // Dòng đã duyệt thì coi như đã chốt xong: hiện dấu tích xanh thay
            // cho cảnh báo lệch — thống kê viên đã xem và chấp nhận số liệu,
            // để nguyên tam giác vàng sẽ gây hiểu nhầm là còn việc phải xử lý.
            // Chốt 2026-09-09.
            const isApproved =
              row.original.reconciliationStatus === "APPROVED";
            return (
              <div className="flex items-center justify-center gap-1">
                {isApproved ? (
                  <div
                    className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center"
                    title="Đã duyệt"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : !meta().isMatched(row.original) ? (
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 fill-amber-500 text-amber-100" />
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
                {hasHistory && (
                  <ReconciliationHistoryPopover
                    transportReportTripId={bRow?.transportReportTripId}
                    excavationReportTripId={bRow?.excavationReportTripId}
                  />
                )}
              </div>
            );
          },
          size: 90,
        },
      ],
    },

    // 5. THAO TÁC / TRẠNG THÁI DUYỆT
    {
      id: "group_workflow_action",
      header: "THAO TÁC / TRẠNG THÁI",
      columns: [
        {
          id: "workflowAction",
          header: "Thao tác",
          cell: ({ row }) => {
            const {
              currentRole,
              onApproveItem,
              setRequestModalItem,
              onResubmitItem,
              dirtyRowsRef,
              onUpdateItem,
              clearDirtyRow,
              onDeleteItem,
            } = meta();
            const item = row.original;
            const status: ReconcileWorkflowStatus =
              item.reconciliationStatus || "PENDING";
            const bRow = (item as any).backendRow;
            // Trạng thái ĐÚNG BÊN của vai trò đang đăng nhập — KHÔNG dùng
            // `status` (trạng thái gộp cả dòng) để quyết định vai trò đơn vị
            // có "Gửi lại" hay không: 2 bên có trạng thái ĐỘC LẬP, nếu chỉ 1
            // bên bị yêu cầu sửa thì bên còn lại không nên thấy/động vào nút
            // "Gửi lại" (tránh gửi lại NHẦM sang bên không liên quan).
            const ownSideStatus =
              currentRole === "ROLE_TRANSPORT"
                ? bRow?.transportStatus
                : currentRole === "ROLE_MINING"
                  ? bRow?.excavationStatus
                  : undefined;

            // ── Vai trò THỐNG KÊ: Người Điều Hành (Gộp Duyệt, Sửa, Xóa thành icon) ──
            if (currentRole === "ROLE_STATISTICIAN") {
              const isRevisionRequested = status === "REVISION_REQUESTED";

              // ponytail: disable request button if already requested revision and waiting for units to update
              const editButton = (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRevisionRequested}
                  onClick={() =>
                    !isRevisionRequested && setRequestModalItem(item)
                  }
                  className={`h-7 w-7 p-0 rounded-lg shadow-2xs transition-all ${
                    isRevisionRequested
                      ? "opacity-50 cursor-not-allowed border-amber-200 text-amber-600 bg-amber-50/50 dark:border-amber-900/50 dark:text-amber-400 dark:bg-amber-950/20"
                      : "border-blue-200 text-blue-700 hover:bg-blue-50/70 hover:border-blue-300 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
                  }`}
                  title={
                    isRevisionRequested
                      ? "Đang chờ đơn vị sửa lại"
                      : "Yêu cầu chỉnh sửa"
                  }
                >
                  <FileEdit className="w-3.5 h-3.5" />
                </Button>
              );

              const editButtonWithTooltip = item.requestNote ? (
                <CustomNoteTooltip
                  note={item.requestNote}
                  title={
                    isRevisionRequested
                      ? "Đang chờ sửa – Ghi chú đã gửi:"
                      : "Ghi chú yêu cầu sửa:"
                  }
                >
                  {editButton}
                </CustomNoteTooltip>
              ) : (
                editButton
              );

              if (status === "APPROVED") {
                // ponytail: khi đã duyệt, ẩn nút yêu cầu chỉnh sửa, chỉ hiển thị biểu tượng đã duyệt và nút xóa
                return (
                  <div className="flex items-center justify-center gap-1.5">
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      title="Đã duyệt"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        onDeleteItem?.(item.id);
                        toast.success("Đã xóa bản ghi đối chiếu!");
                      }}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all"
                      title="Xóa bản ghi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );
              }

              return (
                <div className="flex items-center justify-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      onApproveItem?.(item.id);
                    }}
                    className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs transition-all"
                    title="Duyệt bản ghi"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </Button>

                  {editButtonWithTooltip}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onDeleteItem?.(item.id);
                      toast.success("Đã xóa bản ghi đối chiếu!");
                    }}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all"
                    title="Xóa bản ghi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            }

            // ── Vai trò NV ĐƠN VỊ (Vận tải / Khai thác) ──
            // ── Nút Lưu / Hủy khi đang chỉnh sửa (dirty) ──
            const isDirty = dirtyRowsRef.current.has(item.id);
            if (isDirty) {
              return (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      const dirtyItem = dirtyRowsRef.current.get(item.id)!;
                      await onUpdateItem?.(dirtyItem);
                      clearDirtyRow(item.id);
                    }}
                    className="h-7.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold gap-1 shadow-2xs rounded-lg transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Lưu
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => clearDirtyRow(item.id)}
                    className="h-7.5 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    title="Hủy thay đổi"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            }

            if (status === "APPROVED") {
              return (
                <div className="flex items-center justify-center">
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 h-7.5 py-1 px-3 rounded-lg font-semibold">
                    <Check className="w-3.5 h-3.5" /> Đã duyệt
                  </Badge>
                </div>
              );
            }

            if (ownSideStatus === "REVISION_REQUESTED") {
              const noteIcon = (
                <div
                  className="h-7 w-7 inline-flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-help shadow-2xs"
                  title="Xem ghi chú từ Thống kê"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
              );

              return (
                <div className="flex items-center justify-center gap-2">
                  {item.requestNote ? (
                    <CustomNoteTooltip note={item.requestNote}>
                      {noteIcon}
                    </CustomNoteTooltip>
                  ) : (
                    noteIcon
                  )}

                  <Button
                    size="sm"
                    onClick={async () => {
                      onResubmitItem?.(item.id);
                      toast.success("Đã gửi lại dữ liệu cho Thống kê!");
                    }}
                    className="h-7.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1 rounded-lg transition-all"
                  >
                    <Send className="w-3 h-3" /> Gửi lại
                  </Button>
                </div>
              );
            }

            if (status === "AWAITING_REAPPROVAL") {
              return (
                <div className="flex items-center justify-center">
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 h-7.5 py-1 px-3 rounded-lg font-semibold">
                    <Send className="w-3.5 h-3.5" /> Đã gửi lại — chờ Thống kê duyệt
                  </Badge>
                </div>
              );
            }

            return (
              <Badge
                variant="outline"
                className="bg-blue-600 text-white border-gray-300 dark:bg-gray-800 dark:text-gray-300 gap-1 font-semibold rounded-lg px-2.5 h-7.5 py-1"
              >
                <Clock className="w-3 h-3 text-white" /> Chờ đối soát
              </Badge>
            );
          },
          size: meta().currentRole === "ROLE_STATISTICIAN" ? 120 : 160,
        },
      ],
    },
  ];
}
