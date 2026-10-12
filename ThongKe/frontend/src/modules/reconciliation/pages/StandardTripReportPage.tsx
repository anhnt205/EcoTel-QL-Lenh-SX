import React, { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DatePickerString } from "@/components/common/DatePickerString";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Combobox,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxChip,
  ComboboxValue,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { FilterResetButton } from "@/modules/dataentry/components/FilterResetButton";
import {
  FileCheck,
  Download,
  Search,
  ArrowUpDown,
  Columns3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { currentMonthRange } from "@/lib/utils";
import { excelService } from "@/modules/report/utils/excel-exporter";
import { ApprovalStatusBadge } from "@/modules/dataentry/components/ApprovalStatusBadge";
import type { ApprovalStatus } from "@/modules/dataentry/types/thong-ke";
import { useMasterData } from "@/modules/dataentry/hooks/useMasterData";
import {
  useReconciliationSearchQuery,
  mapRowResponseToStandardTripReport,
} from "../services/reconciliation.service";

export interface StandardTripReport {
  id: string;
  reportDate: string;
  shift: string;
  vehicleNo: string;
  excavationArea?: string;
  excavatorEquipment: string;
  pickupLocation: string;
  pickupBench?: string;
  unloadLocationName: string;
  unloadBench?: string;
  fullRouteDistance?: number;
  fullRouteElevate?: number;
  localSlopeDist?: number;
  localSlopeDegree?: number;
  operatorBadgeNo?: string;
  isRainyDay?: boolean;
  isTraineeVehicle?: boolean;
  finalOption: "TRANSPORT" | "EXCAVATION" | "OTHER";
  finalOptionLabel: string;
  cargoType: string;
  tripCount: number;
  loadStatus: string;
  approvedAt: string;
  status: ApprovalStatus;
}

export const StandardTripReportPage: React.FC = () => {
  // Mặc định = tháng hiện tại (trước đây cứng "2026-08-01".."2026-08-31" —
  // dữ liệu ở tháng khác "biến mất" khỏi màn này; cùng lỗi thật vừa gặp ở
  // màn Khai thác, 2026-09-08).
  const defaultDateRange = currentMonthRange();
  const [startDate, setStartDate] = useState(defaultDateRange.from);
  const [endDate, setEndDate] = useState(defaultDateRange.to);
  const [reports, setReports] = useState<StandardTripReport[]>([]);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [selectedExcavators, setSelectedExcavators] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const shiftAnchorRef = useComboboxAnchor();
  const vehicleAnchorRef = useComboboxAnchor();
  const excavatorAnchorRef = useComboboxAnchor();

  const masterData = useMasterData();
  const { rawShifts = [], rawVehicles = [], rawExcavators = [] } = masterData;

  // Map selected Shift names to Shift IDs for API
  const shiftIds = useMemo(() => {
    if (selectedShifts.length === 0) return undefined;
    return rawShifts
      .filter((s) => {
        const rawName = String(s.name ?? "").trim();
        const cleanNum = rawName.replace(/^ca\s+/i, "").trim();
        return (
          selectedShifts.includes(rawName) ||
          selectedShifts.includes(cleanNum) ||
          selectedShifts.includes(`Ca ${cleanNum}`) ||
          selectedShifts.includes(String(s.id))
        );
      })
      .map((s) => s.id);
  }, [selectedShifts, rawShifts]);

  // Map selected Vehicle numbers to Device IDs for API (Số xe)
  const deviceIds = useMemo(() => {
    if (selectedVehicles.length === 0) return undefined;
    const ids: number[] = [];
    rawVehicles.forEach((v) => {
      if (
        (v.code && selectedVehicles.includes(v.code)) ||
        (v.vehicleNumber && selectedVehicles.includes(v.vehicleNumber))
      ) {
        ids.push(v.id);
      }
    });
    return ids.length > 0 ? ids : undefined;
  }, [selectedVehicles, rawVehicles]);

  // Map selected Excavators to Excavator IDs for API (Máy xúc - giống bên khai thác)
  const excavatorIds = useMemo(() => {
    if (selectedExcavators.length === 0) return undefined;
    const ids: number[] = [];
    rawExcavators.forEach((e) => {
      if (
        (e.code && selectedExcavators.includes(e.code)) ||
        (e.name && selectedExcavators.includes(e.name))
      ) {
        ids.push(e.id);
      }
    });
    return ids.length > 0 ? ids : undefined;
  }, [selectedExcavators, rawExcavators]);

  const {
    data: apiResponse,
  } = useReconciliationSearchQuery({
    fromDate: startDate,
    toDate: endDate,
    shiftIds,
    deviceIds,
    excavatorIds,
    status: "APPROVED",
  });

  useEffect(() => {
    if (apiResponse?.content) {
      const mapped = apiResponse.content.map((row, idx) =>
        mapRowResponseToStandardTripReport(row, idx),
      );
      setReports(mapped);
    } else {
      setReports([]);
    }
  }, [apiResponse]);

  const handleResetFilters = () => {
    setSelectedShifts([]);
    setSelectedVehicles([]);
    setSelectedExcavators([]);
    setSearchKeyword("");
    toast.info("Đã đặt lại các bộ lọc tìm kiếm!");
  };

  // Master data for filters (combining master data and data from current reports)
  const uniqueShifts = useMemo(() => {
    const set = new Set<string>();
    if (rawShifts && rawShifts.length > 0) {
      rawShifts.forEach((s) => set.add(`Ca ${s.name}`));
    }
    reports.forEach((r) => {
      if (r.shift) set.add(r.shift);
    });
    return Array.from(set);
  }, [rawShifts, reports]);

  const uniqueVehicles = useMemo(() => {
    const set = new Set<string>();
    if (rawVehicles && rawVehicles.length > 0) {
      rawVehicles.forEach((v) => {
        if (v.code) set.add(v.code);
        if (v.vehicleNumber) set.add(v.vehicleNumber);
      });
    }
    reports.forEach((r) => {
      if (r.vehicleNo) set.add(r.vehicleNo);
    });
    return Array.from(set);
  }, [rawVehicles, reports]);

  const uniqueExcavators = useMemo(() => {
    const set = new Set<string>();
    if (rawExcavators && rawExcavators.length > 0) {
      rawExcavators.forEach((e) => {
        if (e.code) set.add(e.code);
        if (e.name) set.add(e.name);
      });
    }
    reports.forEach((r) => {
      if (r.excavatorEquipment) set.add(r.excavatorEquipment);
    });
    return Array.from(set);
  }, [rawExcavators, reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedShifts.length > 0 && !selectedShifts.includes(r.shift)) {
        return false;
      }
      if (
        selectedVehicles.length > 0 &&
        !selectedVehicles.includes(r.vehicleNo)
      ) {
        return false;
      }
      if (
        selectedExcavators.length > 0 &&
        !selectedExcavators.includes(r.excavatorEquipment)
      ) {
        return false;
      }
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const match =
          r.vehicleNo.toLowerCase().includes(kw) ||
          r.excavatorEquipment.toLowerCase().includes(kw) ||
          r.cargoType.toLowerCase().includes(kw) ||
          r.shift.toLowerCase().includes(kw) ||
          r.pickupLocation.toLowerCase().includes(kw) ||
          r.unloadLocationName.toLowerCase().includes(kw) ||
          (r.excavationArea && r.excavationArea.toLowerCase().includes(kw));
        if (!match) return false;
      }
      return true;
    });
  }, [
    reports,
    selectedShifts,
    selectedVehicles,
    selectedExcavators,
    searchKeyword,
  ]);

  const handleExportExcel = () => {
    if (filteredReports.length === 0) {
      toast.warning("Không có bản ghi báo chuyến nào để xuất Excel!");
      return;
    }

    const exportData = filteredReports.map((r, idx) => ({
      STT: idx + 1,
      "Ngày báo chuyến": r.reportDate,
      Ca: r.shift,
      "Số xe": r.vehicleNo,
      "Khu vực xúc": r.excavationArea || "-",
      "Máy xúc / Thiết bị": r.excavatorEquipment,
      "Nơi nhận tải": r.pickupLocation,
      "Tầng nhận tải": r.pickupBench || "-",
      "Nơi dỡ tải": r.unloadLocationName,
      "Tầng dỡ tải": r.unloadBench || "-",
      "CĐ toàn tuyến (km)": r.fullRouteDistance ?? "-",
      "Nâng tải (m)": r.fullRouteElevate ?? "-",
      "Thẻ Lái xe": r.operatorBadgeNo || "-",
      "Ngày mưa": r.isRainyDay ? "Có" : "Không",
      "Xe bổ túc": r.isTraineeVehicle ? "Có" : "Không",
      "Loại hàng chuẩn": r.cargoType,
      "Số chuyến chuẩn": r.tripCount,
      "Mức tải chuẩn": r.loadStatus,
      "Thời gian chốt": r.approvedAt,
      "Trạng thái": r.status,
    }));

    excelService.exportToExcel(
      exportData,
      "DanhSach_BaoChuyen_Chuan",
      "BÁO CHUYẾN CHUẨN",
    );
    toast.success("Đã xuất báo cáo Báo chuyến ra file Excel!");
  };

  // TanStack columns definition matching project conventions
  const columns: ColumnDef<StandardTripReport>[] = useMemo(
    () => [
      {
        id: "stt",
        header: "STT",
        cell: ({ row }) => (
          <span className="text-gray-500">{row.index + 1}</span>
        ),
        size: 50,
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "reportDate",
        id: "reportDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-7 px-1 text-sm font-bold hover:bg-transparent"
          >
            Thời gian
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue<string>()}</span>
        ),
        size: 110,
      },
      {
        accessorKey: "shift",
        id: "shift",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-7 px-1 text-sm font-bold hover:bg-transparent"
          >
            Ca
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => <span>{getValue<string>()}</span>,
        size: 70,
      },
      {
        accessorKey: "vehicleNo",
        id: "vehicleNo",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-7 px-1 text-sm font-bold hover:bg-transparent"
          >
            Số xe
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="font-semibold">{getValue<string>()}</span>
        ),
        size: 90,
      },
      {
        accessorKey: "excavationArea",
        id: "excavationArea",
        header: "Khu vực xúc",
        cell: ({ getValue }) => <span>{getValue<string>() || "-"}</span>,
        size: 110,
      },
      {
        accessorKey: "excavatorEquipment",
        id: "excavatorEquipment",
        header: "Máy xúc",
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue<string>()}</span>
        ),
        size: 100,
      },
      {
        accessorKey: "pickupLocation",
        id: "pickupLocation",
        header: "Nơi nhận tải",
        cell: ({ getValue }) => <span>{getValue<string>()}</span>,
        size: 130,
      },
      {
        accessorKey: "pickupBench",
        id: "pickupBench",
        header: "Tầng nhận",
        cell: ({ getValue }) => <span>{getValue<string>() || "-"}</span>,
        size: 85,
      },
      {
        accessorKey: "unloadLocationName",
        id: "unloadLocationName",
        header: "Nơi dỡ tải",
        cell: ({ getValue }) => <span>{getValue<string>()}</span>,
        size: 130,
      },
      {
        accessorKey: "unloadBench",
        id: "unloadBench",
        header: "Tầng dỡ",
        cell: ({ getValue }) => <span>{getValue<string>() || "-"}</span>,
        size: 85,
      },
      {
        accessorKey: "fullRouteDistance",
        id: "fullRouteDistance",
        header: "CĐ tuyến (km)",
        cell: ({ getValue }) => <span>{getValue<number>() ?? "-"}</span>,
        size: 95,
      },
      {
        accessorKey: "fullRouteElevate",
        id: "fullRouteElevate",
        header: "Nâng tải (m)",
        cell: ({ getValue }) => <span>{getValue<number>() ?? "-"}</span>,
        size: 95,
      },
      {
        accessorKey: "operatorBadgeNo",
        id: "operatorBadgeNo",
        header: "Thẻ Lái xe",
        cell: ({ getValue }) => <span>{getValue<string>() || "-"}</span>,
        size: 95,
      },
      {
        accessorKey: "isRainyDay",
        id: "isRainyDay",
        header: "Ngày mưa",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={row.original.isRainyDay ?? false}
              disabled
              className="border-gray-400 dark:border-gray-500 disabled:opacity-100 disabled:cursor-default"
            />
          </div>
        ),
        size: 75,
      },
      {
        accessorKey: "isTraineeVehicle",
        id: "isTraineeVehicle",
        header: "Xe bổ túc",
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Checkbox
              checked={row.original.isTraineeVehicle ?? false}
              disabled
              className="border-gray-400 dark:border-gray-500 disabled:opacity-100 disabled:cursor-default"
            />
          </div>
        ),
        size: 75,
      },
      {
        accessorKey: "cargoType",
        id: "cargoType",
        header: "Loại hàng",
        cell: ({ getValue }) => <span>{getValue<string>()}</span>,
        size: 110,
      },
      {
        accessorKey: "tripCount",
        id: "tripCount",
        header: "Số chuyến",
        cell: ({ getValue }) => (
          <span className="font-bold text-blue-600 dark:text-blue-400">
            {getValue<number>()}
          </span>
        ),
        size: 85,
      },
      {
        accessorKey: "loadStatus",
        id: "loadStatus",
        header: "Mức tải",
        cell: ({ getValue }) => <span>{getValue<string>()}</span>,
        size: 85,
      },
      {
        accessorKey: "status",
        id: "status",
        header: "Trạng thái",
        cell: ({ row }) => (
          <ApprovalStatusBadge status={row.original.status} />
        ),
        size: 110,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredReports,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row, relativeIndex) => `${row.id || "std"}_t_${relativeIndex}`,
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-gray-950 min-h-screen text-slate-900 dark:text-slate-100">
      {/* ══ 1. TOP HEADER BAR ═══════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
              DANH SÁCH BÁO CHUYẾN CHUẨN
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Dữ liệu báo chuyến chính thức sau khi đối chiếu và tổng hợp
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportExcel}
            size="sm"
            className="h-9 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Tải Excel
          </Button>
        </div>
      </div>

      {/* ══ 2. FILTER BAR ═══════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-wrap items-end gap-3 text-xs">
          {/* Thời gian bắt đầu */}
          <div className="flex flex-col gap-1">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Thời gian bắt đầu
            </span>
            <DatePickerString
              value={startDate}
              onChange={(v) => setStartDate(v)}
              className="w-36"
            />
          </div>

          <span className="pb-2 text-gray-400 font-bold">-</span>

          {/* Thời gian kết thúc */}
          <div className="flex flex-col gap-1">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Thời gian kết thúc
            </span>
            <DatePickerString
              value={endDate}
              onChange={(v) => setEndDate(v)}
              className="w-36"
            />
          </div>

          {/* Ca */}
          <div className="flex flex-col gap-1 min-w-[150px] max-w-[240px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Ca
            </span>
            <Combobox
              items={uniqueShifts}
              multiple
              value={selectedShifts}
              onValueChange={setSelectedShifts}
            >
              <ComboboxChips
                ref={shiftAnchorRef}
                className="min-h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs py-1"
              >
                <ComboboxValue placeholder="Tất cả ca">
                  {selectedShifts.map((item) => (
                    <ComboboxChip key={item} className="text-xs py-0.5">
                      {item}
                    </ComboboxChip>
                  ))}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder={selectedShifts.length === 0 ? "Chọn ca..." : ""}
                  className="text-xs"
                />
              </ComboboxChips>
              <ComboboxContent
                anchor={shiftAnchorRef}
                sideOffset={4}
                align="start"
              >
                <ComboboxEmpty className="text-xs py-2 text-gray-400">
                  Không tìm thấy ca
                </ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem
                      key={item}
                      value={item}
                      className="text-xs py-1.5"
                    >
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Số xe */}
          <div className="flex flex-col gap-1 min-w-[170px] max-w-[260px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Số xe
            </span>
            <Combobox
              items={uniqueVehicles}
              multiple
              value={selectedVehicles}
              onValueChange={setSelectedVehicles}
            >
              <ComboboxChips
                ref={vehicleAnchorRef}
                className="min-h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs py-1"
              >
                <ComboboxValue placeholder="Tất cả xe">
                  {selectedVehicles.map((item) => (
                    <ComboboxChip key={item} className="text-xs py-0.5">
                      {item}
                    </ComboboxChip>
                  ))}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder={
                    selectedVehicles.length === 0 ? "Chọn số xe..." : ""
                  }
                  className="text-xs"
                />
              </ComboboxChips>
              <ComboboxContent
                anchor={vehicleAnchorRef}
                sideOffset={4}
                align="start"
              >
                <ComboboxEmpty className="text-xs py-2 text-gray-400">
                  Không tìm thấy xe
                </ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem
                      key={item}
                      value={item}
                      className="text-xs py-1.5"
                    >
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Máy xúc */}
          <div className="flex flex-col gap-1 min-w-[170px] max-w-[260px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Máy xúc
            </span>
            <Combobox
              items={uniqueExcavators}
              multiple
              value={selectedExcavators}
              onValueChange={setSelectedExcavators}
            >
              <ComboboxChips
                ref={excavatorAnchorRef}
                className="min-h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs py-1"
              >
                <ComboboxValue placeholder="Tất cả máy xúc">
                  {selectedExcavators.map((item) => (
                    <ComboboxChip key={item} className="text-xs py-0.5">
                      {item}
                    </ComboboxChip>
                  ))}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder={
                    selectedExcavators.length === 0 ? "Chọn máy xúc..." : ""
                  }
                  className="text-xs"
                />
              </ComboboxChips>
              <ComboboxContent
                anchor={excavatorAnchorRef}
                sideOffset={4}
                align="start"
              >
                <ComboboxEmpty className="text-xs py-2 text-gray-400">
                  Không tìm thấy máy xúc
                </ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem
                      key={item}
                      value={item}
                      className="text-xs py-1.5"
                    >
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Tìm kiếm */}
          <div className="flex-1 min-w-[200px] flex flex-col gap-1">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Tìm kiếm
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm xe, máy xúc, loại hàng, nơi nhận/dỡ..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-9 text-xs pl-8 pr-3"
              />
            </div>
          </div>

          {/* Reset button */}
          <FilterResetButton onReset={handleResetFilters} />
        </div>
      </div>

      {/* ══ 3. TABLE CARD ═══════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3 p-4">
        {/* Table Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm font-bold text-gray-900 dark:text-gray-100">
            <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>BẢNG BÁO CHUYẾN</span>
          </div>
        </div>

        {/* Top Toolbar (Column visibility toggle) */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500">
            Tổng số bản ghi:{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {filteredReports.length}
            </strong>
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5 bg-white dark:bg-gray-900"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>Hiển thị cột</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const headerText =
                    typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id;
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-xs"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {headerText}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Main Data Table */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto bg-white dark:bg-gray-900 shadow-sm">
          <Table
            className="text-xs border-collapse"
            style={{
              width: "100%",
              minWidth: table.getTotalSize(),
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              {table.getVisibleLeafColumns().map((column) => (
                <col key={column.id} style={{ width: column.getSize() }} />
              ))}
            </colgroup>
            <TableHeader className="bg-blue-500 dark:bg-blue-500">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-blue-500 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-500 text-white text-sm font-bold border-b border-blue-600 dark:border-blue-600"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{ width: header.getSize() }}
                      className="px-1.5 py-1.5 text-center border-r border-blue-400/60 dark:border-blue-400/60 text-white font-bold whitespace-normal break-words leading-tight align-middle min-h-[36px] overflow-hidden [&_button]:text-white [&_button]:hover:text-white [&_button]:hover:bg-blue-600/50"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={`border-b border-gray-100 dark:border-gray-800/60 transition-colors ${
                      row.index % 2 === 0
                        ? "bg-white dark:bg-gray-950"
                        : "bg-gray-50/50 dark:bg-gray-900/40"
                    } hover:bg-blue-50/30 dark:hover:bg-blue-950/20`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        style={{ width: cell.column.getSize() }}
                        className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60 whitespace-nowrap overflow-hidden text-ellipsis"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-xs text-gray-400"
                  >
                    Không có bản ghi báo chuyến nào phù hợp bộ lọc!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-7 text-xs w-28 bg-white dark:bg-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span>
              trên tổng số{" "}
              <strong className="text-gray-900 dark:text-gray-100">
                {filteredReports.length}
              </strong>{" "}
              chuyến
            </span>
          </div>

          {/* Page controls */}
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

            <span className="px-2 text-xs font-semibold">
              Trang {table.getState().pagination.pageIndex + 1} /{" "}
              {table.getPageCount() || 1}
            </span>

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
