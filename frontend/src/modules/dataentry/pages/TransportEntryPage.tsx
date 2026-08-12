import React, { useEffect, useState, useMemo, useRef } from "react";
import type { TransportRecord } from "@/modules/dataentry/types/thong-ke";
import {
  saveTransportRecords,
} from "@/modules/dataentry/services/thongKeStorage";
import {
  useTransportReportsQuery,
  fetchTransportReportById,
  mapReportResponseToDraft,
  useDeleteTransportReportMutation,
  type TransportReportResponse,
} from "@/modules/dataentry/services/transportTripReportService";
import { useTransportDraftStore } from "@/modules/dataentry/store/useTransportDraftStore";
import { validateImportRows } from "@/modules/dataentry/utils/importValidator";
import { excelService } from "@/modules/report/utils/excel-exporter";
import { BatchEntryModal } from "@/modules/dataentry/components/BatchEntryModal.tsx";
import { TransportTripsDataTable } from "@/modules/dataentry/components/TransportTripsDataTable";
import { TransportFuelDataTable } from "@/modules/dataentry/components/TransportFuelDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { DatePickerString } from "@/components/common/DatePickerString";
import {
  Upload,
  Download,
  Plus,
  Pencil,
  Search,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  Truck,
  Fuel,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export const TransportEntryPage: React.FC = () => {
  const role = "ROLE_TRANSPORT";
  const shiftAnchorRef = useComboboxAnchor();
  const vehicleAnchorRef = useComboboxAnchor();

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Main Top Filters ─────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-31");
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  // ── Table 1 Inline Header Filters ─────────────────────────────────────────
  const [colArea, setColArea] = useState("ALL");
  const [colExcavator, setColExcavator] = useState("ALL");
  const [colPickup, setColPickup] = useState("ALL");
  const [colUnload, setColUnload] = useState("ALL");
  const [colCargo, setColCargo] = useState("ALL");
  const [colVehicle, setColVehicle] = useState("ALL");
  const [colLoadStatus, setColLoadStatus] = useState("ALL");
  const [colEquipmentUnit, setColEquipmentUnit] = useState("ALL");
  const [colVehicleType, setColVehicleType] = useState("ALL");
  const [colOperatorUnit, setColOperatorUnit] = useState("ALL");
  const [colCreatedBy, setColCreatedBy] = useState("ALL");

  // ── Row selection states ──────────────────────────────────────────────────
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedFuelIds, setSelectedFuelIds] = useState<Set<string>>(
    new Set(),
  );

  // ── Query Backend API ───────────────────────────────────────────────────
  const {
    data: apiResponse,
    refetch,
  } = useTransportReportsQuery({
    fromDate: startDate,
    toDate: endDate,
  });

  const deleteReportMutation = useDeleteTransportReportMutation();
  const { loadSessionForEdit } = useTransportDraftStore();

  const reportsList = useMemo<TransportReportResponse[]>(() => {
    const raw = apiResponse?.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return raw.content || [];
  }, [apiResponse]);

  // Convert TransportReportResponse items to TransportRecord format for table display
  const records = useMemo<TransportRecord[]>(() => {
    if (!reportsList || reportsList.length === 0) return [];
    const list: TransportRecord[] = [];

    reportsList.forEach((report) => {
      const d = new Date(report.reportDate);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const rawShift = String(report.shiftName || report.shiftId || "");
      const shiftStr = rawShift.replace(/^ca\s+/i, "").trim();

      (report.trips || []).forEach((t) => {
        const record: TransportRecord = {
          id: String(report.id),
          month,
          day,
          shift: shiftStr,
          vehicleNo: t.vehicleCode || t.vehicleName || "",
          vehicleType: t.vehicleCategoryName || "",
          equipmentUnit: t.vehicleDepartmentName || "",
          operatorBadgeNo: report.employeeSalaryCode || "",
          operatorName: report.employeeFullName || "",
          operatorUnit: report.employeeDepartmentName || "",
          isRainyDay: Boolean(t.rainyDay),
          isTraineeVehicle: Boolean(t.supplementaryVehicle),
          initialFuel: report.fuelBeginning ?? 0,
          receivedFuel: report.fuelReceived ?? 0,
          finalFuel: report.fuelEnding ?? 0,
          fuelConsumption:
            report.fuelUsed ??
            Math.max(
              0,
              (report.fuelBeginning || 0) +
                (report.fuelReceived || 0) -
                (report.fuelEnding || 0),
            ),
          excavationArea: t.excavationAreaName || "",
          excavatorEquipment: t.excavatorDeviceName || "",
          pickupLocation: t.loadingPointName || "",
          pickupBench: t.receivingFloor != null ? String(t.receivingFloor) : "",
          pickupBenchGroup:
            t.receivingFloorGroup != null ? t.receivingFloorGroup : "",
          unloadLocationName: t.unloadingPointName || "",
          unloadBench: t.unloadingFloor || "",
          fullRouteDistance: t.totalRouteDistanceKm ?? 0,
          fullRouteElevate: t.totalRouteLiftM ?? 0,
          localSlopeDist: t.localSlopeDistanceKm ?? 0,
          localSlopeDegree: t.localSlopeM ?? 0,
          cargoType: t.cargoTypeName || "",
          cargoGroup: t.cargoGroupName || "",
          tripCount: t.tripCount || 1,
          loadStatus:
            t.loadLevelType === "OTHER"
              ? `Khác${t.loadLevelCustomValue ? ` (${t.loadLevelCustomValue})` : ""}`
              : t.loadLevelType === "RODA_2_3"
              ? "Roda (2/3)"
              : "Đủ tải",
          createdBy: report.employeeFullName || report.employeeSalaryCode || "",
        };
        list.push(record);
      });
    });

    return list;
  }, [reportsList]);

  // F3 shortcut to open Add Trip modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        setIsEntryModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Filtered Records ─────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Date range filter
      if (r.month && r.day) {
        const rYear = 2026;
        const rDateStr = `${rYear}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;
        if (startDate && rDateStr < startDate) return false;
        if (endDate && rDateStr > endDate) return false;
      }

      // Shift filter (Multi-select)
      if (selectedShifts.length > 0) {
        const s = r.shift || "";
        if (!selectedShifts.includes(s)) return false;
      }

      // Vehicle filter (Multi-select)
      if (selectedVehicles.length > 0) {
        const v = r.vehicleNo || "";
        if (!selectedVehicles.includes(v)) return false;
      }

      // Inline column filters
      if (colArea !== "ALL" && r.excavationArea !== colArea) return false;
      if (colExcavator !== "ALL" && r.excavatorEquipment !== colExcavator)
        return false;
      if (colPickup !== "ALL" && r.pickupLocation !== colPickup) return false;
      if (colUnload !== "ALL" && r.unloadLocationName !== colUnload)
        return false;
      if (colCargo !== "ALL" && r.cargoType !== colCargo) return false;
      if (colVehicle !== "ALL" && r.vehicleNo !== colVehicle) return false;
      if (colLoadStatus !== "ALL" && r.loadStatus !== colLoadStatus)
        return false;
      if (colEquipmentUnit !== "ALL" && r.equipmentUnit !== colEquipmentUnit)
        return false;
      if (colVehicleType !== "ALL" && r.vehicleType !== colVehicleType)
        return false;
      if (colOperatorUnit !== "ALL" && r.operatorUnit !== colOperatorUnit)
        return false;
      if (colCreatedBy !== "ALL" && r.createdBy !== colCreatedBy) return false;

      // Global Keyword Search
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const vehicle = (r.vehicleNo || "").toLowerCase();
        const creator = (r.createdBy || "").toLowerCase();
        const opName = (r.operatorName || "").toLowerCase();
        const badge = (r.operatorBadgeNo || "").toLowerCase();
        if (
          !vehicle.includes(kw) &&
          !creator.includes(kw) &&
          !opName.includes(kw) &&
          !badge.includes(kw)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    records,
    startDate,
    endDate,
    selectedShifts,
    selectedVehicles,
    colArea,
    colExcavator,
    colPickup,
    colUnload,
    colCargo,
    colVehicle,
    colLoadStatus,
    colEquipmentUnit,
    colVehicleType,
    colOperatorUnit,
    colCreatedBy,
    searchKeyword,
  ]);

  // Unique values for filter dropdowns
  const uniqueShifts = useMemo(() => {
    const set = new Set(records.map((r) => r.shift).filter(Boolean));
    return Array.from(set).map(String);
  }, [records]);

  const uniqueVehicles = useMemo(() => {
    const set = new Set(records.map((r) => r.vehicleNo).filter(Boolean));
    return Array.from(set).map(String);
  }, [records]);

  const handleResetFilters = () => {
    setStartDate("2026-08-01");
    setEndDate("2026-08-31");
    setSelectedShifts([]);
    setSelectedVehicles([]);
    setColArea("ALL");
    setColExcavator("ALL");
    setColPickup("ALL");
    setColUnload("ALL");
    setColCargo("ALL");
    setColVehicle("ALL");
    setColLoadStatus("ALL");
    setColEquipmentUnit("ALL");
    setColVehicleType("ALL");
    setColOperatorUnit("ALL");
    setColCreatedBy("ALL");
    setSearchKeyword("");
    refetch();
    toast.info("Đã làm mới các bộ lọc!");
  };

  // ── Table 1 Rows (Báo chuyến) ────────────────────────────────────────────
  const tripRows = filteredRecords;

  // ── Table 2 Rows (Báo nhiên liệu - deduplicated by date, shift, vehicleNo) ──
  const fuelRows = useMemo(() => {
    const map = new Map<string, TransportRecord>();
    filteredRecords.forEach((r) => {
      const key = `${r.month}_${r.day}_${r.shift}_${r.vehicleNo}`;
      if (!map.has(key)) {
        map.set(key, r);
      }
    });
    return Array.from(map.values());
  }, [filteredRecords]);

  // Paginated Rows
  // ── Selection Handlers ───────────────────────────────────────────────────
  const toggleSelectAllTrips = (checked?: boolean) => {
    if (
      checked === false ||
      (selectedTripIds.size === tripRows.length && tripRows.length > 0)
    ) {
      setSelectedTripIds(new Set());
    } else {
      setSelectedTripIds(new Set(tripRows.map((r) => r.id!).filter(Boolean)));
    }
  };

  const toggleSelectTrip = (id: string) => {
    setSelectedTripIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFuel = (checked?: boolean) => {
    if (
      checked === false ||
      (selectedFuelIds.size === fuelRows.length && fuelRows.length > 0)
    ) {
      setSelectedFuelIds(new Set());
    } else {
      setSelectedFuelIds(new Set(fuelRows.map((r) => r.id!).filter(Boolean)));
    }
  };

  const toggleSelectFuel = (id: string) => {
    setSelectedFuelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Edit Selected Record ───────────────────────────────────────────────
  const handleEditSelected = async () => {
    const selectedIdsArray = Array.from(
      new Set([...selectedTripIds, ...selectedFuelIds]),
    );

    if (selectedIdsArray.length === 0) {
      setIsEntryModalOpen(true);
      return;
    }

    const firstId = Number(selectedIdsArray[0]);
    if (isNaN(firstId)) {
      setIsEntryModalOpen(true);
      return;
    }

    try {
      toast.info("Đang tải dữ liệu báo cáo từ máy chủ...");
      const res = await fetchTransportReportById(firstId);
      if (res.success && res.data) {
        const draft = mapReportResponseToDraft(res.data);
        loadSessionForEdit(draft);
        setIsEntryModalOpen(true);
        toast.success(`Đã mở báo cáo ID #${firstId} để chỉnh sửa`);
      } else {
        toast.error("Không tìm thấy dữ liệu báo cáo trên hệ thống!");
      }
    } catch (err: any) {
      console.error("[Fetch Edit Error]", err);
      toast.error(
        `Lỗi khi tải dữ liệu báo cáo: ${err.message || "Không thể truy vấn API"}`,
      );
    }
  };

  // ── Delete Selected Records ──────────────────────────────────────────────
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const handleDeleteSelected = async () => {
    const selectedIdsArray = Array.from(
      new Set([...selectedTripIds, ...selectedFuelIds]),
    );

    if (selectedIdsArray.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 dòng để xóa!");
      return;
    }

    const numericIds = Array.from(
      new Set(selectedIdsArray.map((id) => Number(id)).filter((n) => !isNaN(n))),
    );

    const isConfirmed = await confirm({
      title: "Xác nhận xóa báo cáo Vận tải",
      description: `Bạn có chắc chắn muốn xóa ${numericIds.length > 0 ? numericIds.length : selectedIdsArray.length} báo cáo đã chọn? Hành động này không thể hoàn tác trên CSDL.`,
      confirmText: "Xóa báo cáo",
      cancelText: "Hủy bỏ",
      variant: "destructive",
    });

    if (isConfirmed) {
      try {
        if (numericIds.length > 0) {
          for (const id of numericIds) {
            await deleteReportMutation.mutateAsync(id);
          }
          toast.success(`Đã xóa thành công ${numericIds.length} báo cáo từ CSDL!`);
        } else {
          toast.success(`Đã xóa các bản ghi tạm khỏi giao diện!`);
        }
        setSelectedTripIds(new Set());
        setSelectedFuelIds(new Set());
        refetch();
      } catch (err: any) {
        console.error("[Delete Report Error]", err);
        const msg =
          err.response?.data?.message || err.message || "Lỗi khi xóa báo cáo";
        toast.error(`Xóa thất bại: ${msg}`);
      }
    }
  };

  // ── Excel Import / Export ────────────────────────────────────────────────
  const handleDirectFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
      e.target.value = "";
      return;
    }

    setIsImporting(true);
    try {
      const rawRows = await excelService.parseExcelFile(file);
      if (!rawRows || rawRows.length === 0) {
        toast.error("File Excel không chứa bản ghi dữ liệu nào!");
        return;
      }

      const results = validateImportRows<TransportRecord>(rawRows, role);
      const validRows = results
        .filter((r) => r.isValid)
        .map((r) => ({
          ...r.rowData,
          id: `imp_trans_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          createdAt: new Date().toISOString(),
        }));

      if (validRows.length === 0) {
        toast.error("Không tìm thấy dòng dữ liệu hợp lệ nào trong file Excel!");
        return;
      }

      saveTransportRecords(validRows as TransportRecord[]);
      refetch();
      toast.success(
        `Đã nạp thành công ${validRows.length}/${results.length} bản ghi từ file "${file.name}"!`,
      );
    } catch (err: any) {
      toast.error(
        `Lỗi đọc file Excel: ${err.message || "Không thể xử lý file"}`,
      );
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const handleExportData = () => {
    excelService.exportToExcel(
      filteredRecords,
      "DanhSach_BaoChuyen_VanTai",
      "BÁO CHUYẾN",
    );
    toast.success("Đã xuất danh sách báo chuyến Vận tải ra file Excel!");
  };

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-gray-950 min-h-screen">
      {/* ══ TOP HEADER BAR ═══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 ">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              DANH SÁCH BÁO CHUYẾN PHÂN XƯỞNG VẬN TẢI
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Upload Excel */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            onChange={handleDirectFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="h-9 text-xs gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
          >
            <Upload className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            Tải lên (Excel)
          </Button>

          {/* Export Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            className="h-9 text-xs gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
          >
            <Download className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            Tải xuống (Excel)
          </Button>

          {/* Add Trip Modal Trigger */}
          <Button
            onClick={() => setIsEntryModalOpen(true)}
            className="h-9 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Thêm chuyến (F3)
          </Button>

          {/* Edit Trip Button */}
          <Button
            onClick={handleEditSelected}
            className="h-9 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
            Chỉnh sửa
          </Button>

          {/* Delete Selected Rows */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteSelected}
            className="h-9 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-950 dark:hover:bg-red-950/30 font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa chuyến {selectedTripIds.size + selectedFuelIds.size > 0 ? `(${selectedTripIds.size + selectedFuelIds.size})` : ""}
          </Button>
        </div>
      </div>

      {/* ══ TOP FILTER BAR ═══════════════════════════════════════════════ */}
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

          {/* Ca (Combobox Chọn nhiều) */}
          <div className="flex flex-col gap-1 min-w-[170px] max-w-[280px]">
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
              <ComboboxContent anchor={shiftAnchorRef} sideOffset={4} align="start">
                <ComboboxEmpty className="text-xs py-2 text-gray-400">
                  Không tìm thấy ca
                </ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item} value={item} className="text-xs py-1.5">
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Số xe (Combobox Chọn nhiều) */}
          <div className="flex flex-col gap-1 min-w-[210px] max-w-[340px]">
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
                  placeholder={selectedVehicles.length === 0 ? "Chọn số xe..." : ""}
                  className="text-xs"
                />
              </ComboboxChips>
              <ComboboxContent anchor={vehicleAnchorRef} sideOffset={4} align="start">
                <ComboboxEmpty className="text-xs py-2 text-gray-400">
                  Không tìm thấy xe nào
                </ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem key={item} value={item} className="text-xs py-1.5">
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {/* Search Box */}
          <div className="flex-1 min-w-[220px] flex flex-col gap-1">
            <span className="font-medium text-transparent">Tìm kiếm</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm số xe, người nhập chuyến..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-9 text-xs pl-8 pr-3"
              />
            </div>
          </div>

          {/* Reset button */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              title="Làm mới bộ lọc"
              className="h-9 w-9 p-0 border-gray-300 dark:border-gray-700"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </Button>
          </div>
        </div>
      </div>

      {/* ══ BẢNG 1: BẢNG BÁO CHUYẾN ══════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3 p-4">
        {/* Table Title */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>1. BẢNG BÁO CHUYẾN</span>
        </div>

        {/* Table 1 Content */}
        <TransportTripsDataTable
          data={tripRows}
          selectedIds={selectedTripIds}
          onToggleSelectAll={toggleSelectAllTrips}
          onToggleSelectRow={toggleSelectTrip}
        />
      </div>

      {/* ══ BẢNG 2: BẢNG BÁO NHIÊN LIỆU ═════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3 p-4">
        {/* Table Title */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          <Fuel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>2. BẢNG BÁO NHIÊN LIỆU</span>
        </div>

        {/* Table 2 Content */}
        <TransportFuelDataTable
          data={fuelRows}
          selectedIds={selectedFuelIds}
          onToggleSelectAll={toggleSelectAllFuel}
          onToggleSelectRow={toggleSelectFuel}
        />
      </div>

      {/* Entry Modal */}
      <BatchEntryModal
        role={role}
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSuccess={() => {
          refetch();
          setIsEntryModalOpen(false);
        }}
      />

      {ConfirmDialogComponent}
    </div>
  );
};
