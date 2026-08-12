import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
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

// ─── Width constants ────────────────────────────────────────────────────────
/** Tổng chiều rộng hiển thị của ô "Thông tin chung" trên bảng TanStack */
const COMMON_INFO_COL_WIDTH = 500;

/** Chiều rộng từng sub-field bên trong khối cuộn ẩn */
const SUB_FIELD_WIDTHS: Record<string, number> = {
  select: 40,
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

// ─── Sub-field definitions for THÔNG TIN CHUNG ──────────────────────────────
interface SubField {
  id: string;
  label: string;
  render: (item: ReconciliationItem, checked?: boolean) => React.ReactNode;
}

const COMMON_SUB_FIELDS: SubField[] = [
  {
    id: "select",
    label: "",
    render: () => null, // handled separately via checkbox in row
  },
  {
    id: "stt",
    label: "STT",
    render: (_item, _checked) => null, // row index, handled per row
  },
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
    render: (item) => (
      <span className="font-semibold">{item.commonKey.shift || "-"}</span>
    ),
  },
  {
    id: "vehicleNo",
    label: "Số xe",
    render: (item) => (
      <span className="font-bold text-gray-900 dark:text-gray-100">
        {item.commonKey.vehicleNo || "-"}
      </span>
    ),
  },
  {
    id: "excavationArea",
    label: "Khu vực xúc",
    render: (item) => item.transportRecord?.excavationArea || "-",
  },
  {
    id: "excavatorEquipment",
    label: "Máy xúc",
    render: (item) => (
      <span className="font-semibold">
        {item.transportRecord?.excavatorEquipment ||
          item.miningRecord?.mineCode ||
          "-"}
      </span>
    ),
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
    label: "Tầng nhận tải",
    render: (item) => (
      <span className="text-gray-500">
        {item.transportRecord?.pickupBenchGroup ||
          item.transportRecord?.pickupBench ||
          "-"}
      </span>
    ),
  },
  {
    id: "fullRouteDistance",
    label: "CĐ toàn tuyến (km)",
    render: (item) => item.transportRecord?.fullRouteDistance ?? "-",
  },
  {
    id: "fullRouteElevate",
    label: "Nâng tải TT (m)",
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
    label: "Nơi dỡ tải",
    render: (item) =>
      item.transportRecord?.unloadLocationName ||
      item.miningRecord?.dumpLocation ||
      "-",
  },
  {
    id: "isRainyDay",
    label: "Mưa",
    render: (item) => (
      <div className="flex items-center justify-center">
        <Checkbox checked={item.transportRecord?.isRainyDay ?? false} />
      </div>
    ),
  },
  {
    id: "isTraineeVehicle",
    label: "Xe bổ túc",
    render: (item) => (
      <div className="flex items-center justify-center">
        <Checkbox checked={item.transportRecord?.isTraineeVehicle ?? false} />
      </div>
    ),
  },
];

// ─── Scrollable sub-header row for THÔNG TIN CHUNG ──────────────────────────
interface CommonInfoSubHeaderProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}
const CommonInfoSubHeader: React.FC<CommonInfoSubHeaderProps> = ({
  scrollRef,
}) => (
  <div
    ref={scrollRef}
    className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden h-full items-center"
    style={{ scrollbarWidth: "none" }}
  >
    {COMMON_SUB_FIELDS.map((f) => (
      <div
        key={f.id}
        className="shrink-0 px-1.5 py-1.5 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0 flex items-center justify-center h-full min-h-[32px]"
        style={{ width: SUB_FIELD_WIDTHS[f.id] }}
      >
        {f.label}
      </div>
    ))}
  </div>
);

// ─── Scrollable sub-cell row for THÔNG TIN CHUNG ────────────────────────────
interface CommonInfoCellProps {
  item: ReconciliationItem;
  rowIndex: number;
  isSelected: boolean;
  onSelectToggle: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}
const CommonInfoCell: React.FC<CommonInfoCellProps> = ({
  item,
  rowIndex,
  isSelected,
  onSelectToggle,
  scrollRef,
}) => (
  <div
    ref={scrollRef}
    className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden"
    style={{ scrollbarWidth: "none" }}
  >
    {COMMON_SUB_FIELDS.map((f) => {
      let content: React.ReactNode;
      if (f.id === "select") {
        content = (
          <div className="flex items-center justify-center h-full">
            <Checkbox checked={isSelected} onCheckedChange={onSelectToggle} />
          </div>
        );
      } else if (f.id === "stt") {
        content = (
          <span className="text-gray-500 font-semibold">{rowIndex + 1}</span>
        );
      } else {
        content = f.render(item);
      }

      return (
        <div
          key={f.id}
          className="shrink-0 flex items-center justify-center px-1.5 py-2 text-xs border-r border-gray-100 dark:border-gray-800/60 last:border-r-0 whitespace-nowrap"
          style={{ width: SUB_FIELD_WIDTHS[f.id] }}
        >
          {content}
        </div>
      );
    })}
  </div>
);

// ─── Memoized Final Choice Cell ──────────────────────────────────────────────
interface FinalChoiceCellProps {
  item: ReconciliationItem;
  initialChoice: "VT" | "KT" | "OTHER" | null;
  initialCustom: { cargo: string; trips: number; loadStatus: string };
  isMatched: boolean;
  onChoiceChange: (
    id: string,
    choice: "VT" | "KT" | "OTHER",
    custom: { cargo: string; trips: number; loadStatus: string },
  ) => void;
}

const FinalChoiceCell = React.memo<FinalChoiceCellProps>(
  ({ item, initialChoice, initialCustom, onChoiceChange }) => {
    const [choice, setChoice] = useState<"VT" | "KT" | "OTHER" | null>(initialChoice);
    const [custom, setCustom] = useState(initialCustom);

    useEffect(() => {
      setChoice(initialChoice);
    }, [initialChoice]);

    useEffect(() => {
      setCustom(initialCustom);
    }, [initialCustom.cargo, initialCustom.trips, initialCustom.loadStatus]);

    const handleRadioChange = useCallback(
      (newChoice: "VT" | "KT" | "OTHER") => {
        setChoice(newChoice);
        onChoiceChange(item.id, newChoice, custom);
      },
      [item.id, custom, onChoiceChange],
    );

    const handleCustomChange = useCallback(
      (field: "cargo" | "trips" | "loadStatus", val: any) => {
        const activeChoice = choice;
        setCustom((prev) => {
          const next = { ...prev, [field]: val };
          if (activeChoice !== null) {
            onChoiceChange(item.id, activeChoice, next);
          }
          return next;
        });
      },
      [item.id, choice, onChoiceChange],
    );

    return (
      <div className="flex flex-col gap-1.5 p-1 w-full text-xs">
        {/* Radio options: styled pills with distinctive option colors */}
        <div className="flex items-center justify-between px-0.5 py-1 gap-1 border-b border-gray-200/60 dark:border-gray-800/60">
          <label
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-xs font-semibold cursor-pointer select-none transition-all border ${
              choice === "VT"
                ? "bg-emerald-100/90 text-emerald-900 border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700 shadow-2xs"
                : "border-transparent text-gray-600 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30"
            }`}
          >
            <input
              type="radio"
              name={`choice_${item.id}`}
              checked={choice === "VT"}
              onChange={() => handleRadioChange("VT")}
              className="accent-emerald-600 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Vận tải</span>
          </label>

          <label
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-xs font-semibold cursor-pointer select-none transition-all border ${
              choice === "KT"
                ? "bg-blue-100/90 text-blue-900 border-blue-400 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700 shadow-2xs"
                : "border-transparent text-gray-600 hover:bg-blue-50/60 dark:hover:bg-blue-950/30"
            }`}
          >
            <input
              type="radio"
              name={`choice_${item.id}`}
              checked={choice === "KT"}
              onChange={() => handleRadioChange("KT")}
              className="accent-blue-600 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Khai thác</span>
          </label>

          <label
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-xs font-semibold cursor-pointer select-none transition-all border ${
              choice === "OTHER"
                ? "bg-amber-100/90 text-amber-900 border-amber-400 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 shadow-2xs"
                : "border-transparent text-gray-600 hover:bg-amber-50/60 dark:hover:bg-amber-950/30"
            }`}
          >
            <input
              type="radio"
              name={`choice_${item.id}`}
              checked={choice === "OTHER"}
              onChange={() => handleRadioChange("OTHER")}
              className="accent-amber-600 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Khác</span>
          </label>
        </div>

        {/* Custom fields: 3-column grid filling 100% width cleanly */}
        {choice === "OTHER" && (
          <div className="grid grid-cols-3 gap-1.5 w-full pt-1 animate-in fade-in-50 duration-150">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-gray-500 font-semibold text-center truncate">
                Loại hàng
              </span>
              <Select
                value={custom.cargo}
                onValueChange={(v) => handleCustomChange("cargo", v)}
              >
                <SelectTrigger className="h-7 text-xs w-full px-1.5 py-0 bg-white dark:bg-gray-900 border-gray-300 shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Than">Than</SelectItem>
                  <SelectItem value="Đá">Đá</SelectItem>
                  <SelectItem value="Đất">Đất</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-gray-500 font-semibold text-center truncate">
                Số chuyến
              </span>
              <Input
                type="number"
                value={custom.trips}
                onChange={(e) =>
                  handleCustomChange("trips", Number(e.target.value))
                }
                className="h-7 text-xs w-full px-1 py-0 text-center font-bold border-gray-300 shadow-2xs"
              />
            </div>

            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[10px] text-gray-500 font-semibold text-center truncate">
                Tải trọng
              </span>
              <Select
                value={custom.loadStatus}
                onValueChange={(v) => handleCustomChange("loadStatus", v)}
              >
                <SelectTrigger className="h-7 text-xs w-full px-1 py-0 bg-white dark:bg-gray-900 border-gray-300 shadow-2xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Đủ tải">Đủ tải</SelectItem>
                  <SelectItem value="Roda (2/3)">Roda (2/3)</SelectItem>
                  <SelectItem value="Khác (1/2)">Khác (1/2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.initialChoice === next.initialChoice &&
    prev.initialCustom.cargo === next.initialCustom.cargo &&
    prev.initialCustom.trips === next.initialCustom.trips &&
    prev.initialCustom.loadStatus === next.initialCustom.loadStatus &&
    prev.isMatched === next.isMatched,
);

// ─── Main component ──────────────────────────────────────────────────────────
interface ReconciliationComparisonTablesProps {
  items: ReconciliationItem[];
  onDeleteItem?: (id: string) => void;
  onChoicesChange?: (
    choices: Record<string, "VT" | "KT" | "OTHER">,
    customFields: Record<
      string,
      { cargo: string; trips: number; loadStatus: string }
    >,
  ) => void;
}

export const ReconciliationComparisonTables: React.FC<
  ReconciliationComparisonTablesProps
> = ({ items, onDeleteItem, onChoicesChange }) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Track user choice for "DỮ LIỆU CHUẨN CUỐI": 'VT' | 'KT' | 'OTHER' (Mặc định không chọn sẵn)
  const [choices, setChoices] = useState<Record<string, "VT" | "KT" | "OTHER">>(
    () => ({}),
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

  const handleChoiceUpdate = useCallback(
    (
      id: string,
      choice: "VT" | "KT" | "OTHER",
      custom: { cargo: string; trips: number; loadStatus: string },
    ) => {
      setChoices((prev) => {
        const nextChoices = { ...prev, [id]: choice };
        setCustomFields((prevCustom) => {
          const nextCustom = { ...prevCustom, [id]: custom };
          onChoicesChange?.(nextChoices, nextCustom);
          return nextCustom;
        });
        return nextChoices;
      });
    },
    [onChoicesChange],
  );

  const isMatched = useCallback((item: ReconciliationItem) => {
    const t = item.transportRecord;
    const m = item.miningRecord;
    if (!t || !m) return false;
    const sameTrips = (t.tripCount ?? 0) === (m.tripCount ?? 0);
    const sameCargo =
      (t.cargoType || "").trim().toLowerCase() ===
      (m.material || m.loadStatus || "").trim().toLowerCase();
    return sameTrips && sameCargo;
  }, []);

  // ─── Sync scroll between sub-header and sub-cells per column ─────────────
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const cellScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const choicesRef = useRef(choices);
  const customFieldsRef = useRef(customFields);

  useEffect(() => {
    choicesRef.current = choices;
  }, [choices]);

  useEffect(() => {
    customFieldsRef.current = customFields;
  }, [customFields]);

  const syncScroll = useCallback((source: HTMLDivElement) => {
    const left = source.scrollLeft;
    if (headerScrollRef.current && headerScrollRef.current !== source) {
      headerScrollRef.current.scrollLeft = left;
    }
    cellScrollRefs.current.forEach((el) => {
      if (el && el !== source) el.scrollLeft = left;
    });
  }, []);

  const onHeaderScroll = (e: React.UIEvent<HTMLDivElement>) =>
    syncScroll(e.currentTarget);

  const onCellScroll = (e: React.UIEvent<HTMLDivElement>) =>
    syncScroll(e.currentTarget);

  // ─── Drag-to-scroll (click-hold + drag) ───────────────────────────────────
  const dragState = useRef<{
    el: HTMLDivElement;
    startX: number;
    startScrollLeft: number;
  } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    dragState.current = {
      el,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
    };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!dragState.current) return;
      const dx = e.clientX - dragState.current.startX;
      const newLeft = dragState.current.startScrollLeft - dx;
      dragState.current.el.scrollLeft = newLeft;
      syncScroll(dragState.current.el);
    },
    [syncScroll],
  );

  const onMouseUp = useCallback(() => {
    if (!dragState.current) return;
    dragState.current.el.style.cursor = "grab";
    dragState.current.el.style.userSelect = "";
    dragState.current = null;
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!dragState.current) return;
    dragState.current.el.style.cursor = "grab";
    dragState.current.el.style.userSelect = "";
    dragState.current = null;
  }, []);

  /** Tập hợp drag event props dùng chung cho header và mỗi cell */
  const dragProps = {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  } as const;

  // ─── TanStack Table Column Definitions ────────────────────────────────────
  const columns = useMemo<ColumnDef<ReconciliationItem>[]>(
    () => [
      // 1. THÔNG TIN CHUNG – single parent column, internal sub-fields rendered via flex
      {
        id: "group_common_info",
        header: () => (
          <div className="text-center font-bold text-gray-800 dark:text-gray-200 text-xs">
            THÔNG TIN CHUNG
          </div>
        ),
        // Single leaf column – renders sub-header row on depth=1
        columns: [
          {
            id: "common_info_panel",
            header: () => (
              <CommonInfoSubHeader
                scrollRef={
                  headerScrollRef as React.RefObject<HTMLDivElement | null>
                }
              />
            ),
            cell: ({ row }) => {
              const item = row.original;
              const isSelected = row.getIsSelected();
              return (
                <CommonInfoCell
                  item={item}
                  rowIndex={row.index}
                  isSelected={isSelected}
                  onSelectToggle={() => row.toggleSelected(!isSelected)}
                  scrollRef={
                    {
                      current: null,
                    } as React.RefObject<HTMLDivElement | null>
                  }
                />
              );
            },
            size: COMMON_INFO_COL_WIDTH,
          },
        ],
      },

      // 2. SỐ LIỆU BÁO CHUYẾN (VẬN TẢI) (4 cols)
      {
        id: "group_transport_data",
        header: "SỐ LIỆU BÁO CHUYẾN (VẬN TẢI)",
        columns: [
          {
            id: "transCargo",
            header: "Loại hàng",
            cell: ({ row }) =>
              row.original.transportRecord?.cargoType || "-",
            size: 95,
          },
          {
            id: "transTrips",
            header: "Số chuyến",
            cell: ({ row }) => (
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {row.original.transportRecord?.tripCount ?? "-"}
              </span>
            ),
            size: 90,
          },
          {
            id: "transLoadStatus",
            header: "Tải trọng",
            cell: ({ row }) => {
              const status = row.original.transportRecord?.loadStatus;
              return status ? (
                <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  {status}
                </span>
              ) : (
                "-"
              );
            },
            size: 95,
          },
          {
            id: "transBadgeNo",
            header: "Số thẻ lương",
            cell: ({ row }) =>
              row.original.transportRecord?.operatorBadgeNo || "-",
            size: 100,
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
              "-",
            size: 95,
          },
          {
            id: "miningTrips",
            header: "Số chuyến",
            cell: ({ row }) => (
              <span className="font-bold text-gray-900 dark:text-gray-100">
                {row.original.miningRecord?.tripCount ?? "-"}
              </span>
            ),
            size: 90,
          },
          {
            id: "miningLoadStatus",
            header: "Tải trọng",
            cell: ({ row }) => {
              const status = row.original.miningRecord?.loadStatus;
              return status ? (
                <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {status}
                </span>
              ) : (
                "-"
              );
            },
            size: 95,
          },
          {
            id: "miningBadgeNo",
            header: "Số thẻ lương",
            cell: ({ row }) =>
              row.original.miningRecord?.operatorBadgeNo || "-",
            size: 100,
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
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center mx-auto font-bold">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              ) : (
                <span className="text-gray-400 font-bold">-</span>
              ),
            size: 65,
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
            size: 75,
          },
        ],
      },

      // 5. DỮ LIỆU CHUẨN CUỐI (Chọn 1 trong 3 phương án)
      {
        id: "group_final_decision",
        header: () => (
          <div>
            <div>DỮ LIỆU CHUẨN CUỐI</div>
            <div className="text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
              (Chọn 1 trong 3 phương án)
            </div>
          </div>
        ),
        columns: [
          {
            id: "finalChoice",
            header: "Phương án chốt chuẩn",
            cell: ({ row }) => {
              const item = row.original;
              const matched = isMatched(item);
              const initialChoice = choicesRef.current[item.id] || null;
              const initialCustom = customFieldsRef.current[item.id] || {
                cargo:
                  item.miningRecord?.material ||
                  item.transportRecord?.cargoType ||
                  "Than",
                trips:
                  item.miningRecord?.tripCount ??
                  item.transportRecord?.tripCount ??
                  0,
                loadStatus:
                  item.miningRecord?.loadStatus ||
                  item.transportRecord?.loadStatus ||
                  "Đủ tải",
              };

              return (
                <FinalChoiceCell
                  item={item}
                  initialChoice={initialChoice}
                  initialCustom={initialCustom}
                  isMatched={matched}
                  onChoiceChange={handleChoiceUpdate}
                />
              );
            },
            size: 290,
          },
        ],
      },

      // 6. Action Delete
      {
        id: "actions",
        header: () => {},
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
        size: 50,
      },
    ],
    [handleChoiceUpdate, isMatched, onDeleteItem],
  );

  // ─── TanStack Table Instance ───────────────────────────────────────────────
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

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* TanStack Table Container */}
      <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto bg-white dark:bg-gray-900 shadow-sm">
        <Table
          className="text-xs border-collapse w-full"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            {table.getVisibleLeafColumns().map((column) => (
              <col
                key={column.id}
                style={{
                  width: `${(column.getSize() / table.getTotalSize()) * 100}%`,
                }}
              />
            ))}
          </colgroup>

          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-gray-200 dark:border-gray-800 text-sm font-bold"
              >
                {headerGroup.headers.map((header) => {
                  const isTopLevelGroup = header.depth === 0;
                  const isActionCol = header.column.id === "actions";
                  const isCommonInfoPanel =
                    header.column.id === "common_info_panel";

                  const colId = header.column.id;

                  // Distinct color styling ONLY for top-level group headers (row 1)
                  let colorClass = "bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
                  if (isTopLevelGroup) {
                    switch (colId) {
                      case "group_common_info":
                        colorClass = "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-r-2 border-slate-300 dark:border-slate-700";
                        break;
                      case "group_transport_data":
                        colorClass = "bg-emerald-200 dark:bg-emerald-900 text-emerald-950 dark:text-emerald-100 border-r-2 border-emerald-300 dark:border-emerald-700";
                        break;
                      case "group_mining_data":
                        colorClass = "bg-blue-200 dark:bg-blue-900 text-blue-950 dark:text-blue-100 border-r-2 border-blue-300 dark:border-blue-700";
                        break;
                      case "group_reconciliation_result":
                        colorClass = "bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 border-r-2 border-amber-300 dark:border-amber-700";
                        break;
                      case "group_final_decision":
                        colorClass = "bg-purple-200 dark:bg-purple-900 text-purple-950 dark:text-purple-100 border-r-2 border-purple-300 dark:border-purple-700";
                        break;
                      case "actions":
                        colorClass = "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300";
                        break;
                      default:
                        colorClass = "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100";
                    }
                  }

                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{
                        // Clip the inner scrollable sub-header
                        overflow: isCommonInfoPanel ? "hidden" : undefined,
                        padding: isCommonInfoPanel ? 0 : undefined,
                      }}
                      className={`px-1.5 py-2 text-center text-sm font-bold border-r border-gray-200 dark:border-gray-800 whitespace-normal break-words leading-tight ${colorClass} ${
                        isActionCol ? "text-red-600" : ""
                      }`}
                    >
                      {header.isPlaceholder ? null : isCommonInfoPanel ? (
                        // Render scrollable sub-header with sync
                        <div
                          ref={headerScrollRef}
                          onScroll={onHeaderScroll}
                          {...dragProps}
                          className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden cursor-grab select-none h-full items-center bg-gray-50 dark:bg-gray-900"
                          style={{ scrollbarWidth: "none" }}
                        >
                          {COMMON_SUB_FIELDS.map((f) => (
                            <div
                              key={f.id}
                              className="shrink-0 px-1.5 py-1.5 text-center text-sm font-bold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0 flex items-center justify-center h-full min-h-[32px]"
                              style={{ width: SUB_FIELD_WIDTHS[f.id] }}
                            >
                              {f.label}
                            </div>
                          ))}
                        </div>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
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
                const isSelected = row.getIsSelected();
                const matched = isMatched(item);
                const choice = choices[item.id] || (matched ? "VT" : "OTHER");

                let rowHighlightClass = "";
                if (isSelected) {
                  rowHighlightClass =
                    "bg-blue-100/80 dark:bg-blue-950/60 border-l-4 border-l-blue-600 font-medium";
                } else if (choice === "VT") {
                  rowHighlightClass =
                    "bg-emerald-50/75 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 border-l-4 border-l-emerald-500";
                } else if (choice === "KT") {
                  rowHighlightClass =
                    "bg-blue-50/75 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 border-l-4 border-l-blue-500";
                } else if (choice === "OTHER") {
                  rowHighlightClass =
                    "bg-amber-50/75 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-900/40 border-l-4 border-l-amber-500";
                } else {
                  rowHighlightClass =
                    row.index % 2 === 0
                      ? "bg-white dark:bg-gray-900"
                      : "bg-slate-50/40 dark:bg-gray-900/50";
                }

                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected && "selected"}
                    className={`border-b border-gray-200/80 dark:border-gray-800/80 transition-all ${rowHighlightClass}`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isCommonInfoCell =
                        cell.column.id === "common_info_panel";

                      if (isCommonInfoCell) {
                        // Render scrollable sub-cell row with sync
                        return (
                          <TableCell
                            key={cell.id}
                            style={{
                              padding: 0,
                              overflow: "hidden",
                            }}
                            className="border-r border-gray-200 dark:border-gray-700 text-xs"
                          >
                            <div
                              ref={(el) => {
                                if (el) cellScrollRefs.current.set(row.id, el);
                                else cellScrollRefs.current.delete(row.id);
                              }}
                              onScroll={onCellScroll}
                              {...dragProps}
                              className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden cursor-grab select-none"
                              style={{ scrollbarWidth: "none" }}
                            >
                              {COMMON_SUB_FIELDS.map((f) => {
                                let content: React.ReactNode;
                                if (f.id === "select") {
                                  content = (
                                    <div className="flex items-center justify-center h-full">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() =>
                                          row.toggleSelected(!isSelected)
                                        }
                                      />
                                    </div>
                                  );
                                } else if (f.id === "stt") {
                                  content = (
                                    <span className="text-gray-500 font-semibold">
                                      {row.index + 1}
                                    </span>
                                  );
                                } else {
                                  content = f.render(row.original);
                                }

                                return (
                                  <div
                                    key={f.id}
                                    className="shrink-0 flex items-center justify-center px-1.5 py-2 text-xs border-r border-gray-100 dark:border-gray-800/60 last:border-r-0 whitespace-nowrap"
                                    style={{ width: SUB_FIELD_WIDTHS[f.id] }}
                                  >
                                    {content}
                                  </div>
                                );
                              })}
                            </div>
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell
                          key={cell.id}
                          className="px-2 py-2 text-center text-xs border-r border-gray-100 dark:border-gray-800/60 whitespace-nowrap"
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
    </div>
  );
};
