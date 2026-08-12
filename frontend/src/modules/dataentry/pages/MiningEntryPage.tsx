import {
  useExcavationReportsQuery,
  fetchExcavationReportById,
  mapReportResponseToDraft,
  useBulkDeleteExcavationTripReportMutation,
  type ExcavationReportResponse,
} from "@/modules/dataentry/services/excavationTripReportService";
import { useMiningDraftStore } from "@/modules/dataentry/store/useMiningDraftStore";
import { validateImportRows } from "@/modules/dataentry/utils/importValidator";
import { excelService } from "@/modules/report/utils/excel-exporter";
import { BatchEntryModal } from "@/modules/dataentry/components/BatchEntryModal.tsx";
import { MiningTripsDataTable } from "@/modules/dataentry/components/MiningTripsDataTable";
import { MiningFuelDataTable } from "@/modules/dataentry/components/MiningFuelDataTable";
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
import { useEffect, useMemo, useRef, useState } from "react";
import type { MiningRecord } from "../types/thong-ke";
import { saveMiningRecords } from "../services/thongKeStorage";

export const MiningEntryPage: React.FC = () => {
  const role = "ROLE_MINING";
  const shiftAnchorRef = useComboboxAnchor();
  const pickupAnchorRef = useComboboxAnchor();
  const excavatorAnchorRef = useComboboxAnchor();
  const scoopAnchorRef = useComboboxAnchor();

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Filters state ────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-31");
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedPickups, setSelectedPickups] = useState<string[]>([]);
  const [selectedExcavators, setSelectedExcavators] = useState<string[]>([]);
  const [selectedScoops, setSelectedScoops] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

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
  } = useExcavationReportsQuery({
    fromDate: startDate,
    toDate: endDate,
  });

  const bulkDeleteReportMutation = useBulkDeleteExcavationTripReportMutation();
  const { loadSessionsForEdit, initDrafts } = useMiningDraftStore();

  const reportsList = useMemo<ExcavationReportResponse[]>(() => {
    const raw = apiResponse?.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return raw.content || [];
  }, [apiResponse]);

  // Convert ExcavationReportResponse items to MiningRecord format for table display
  const records = useMemo<MiningRecord[]>(() => {
    if (!reportsList || reportsList.length === 0) return [];
    const list: MiningRecord[] = [];
    reportsList.forEach((report) => {
      const d = new Date(report.reportDate);
      const m = isNaN(d.getTime()) ? undefined : d.getMonth() + 1;
      const day = isNaN(d.getTime()) ? undefined : d.getDate();
      (report.trips || []).forEach((t) => {
        list.push({
          id: String(report.id),
          month: m,
          day: day,
          shift: report.shiftName || String(report.shiftId),
          mineCode:
            report.excavatorDeviceCode ||
            report.excavatorDeviceName ||
            String(report.excavatorDeviceId),
          excavationBench: report.excavationFloor || "",
          pickupLocation:
            report.receivingLocationName || String(report.receivingLocationId),
          transportVehicleNo:
            t.vehicleCode || t.vehicleName || String(t.vehicleId),
          vehicleNo: t.vehicleCode || t.vehicleName || String(t.vehicleId),
          vehicleType: t.vehicleCategoryName || "",
          vehicleManagementUnit: t.vehicleDepartmentName || "",
          tripCount: t.tripCount || 1,
          material: t.cargoTypeName || String(t.cargoTypeId),
          loadStatus:
            t.loadLevelType === "OTHER"
              ? t.loadLevelCustomValue || "Khác"
              : t.loadLevelType === "RODA_2_3"
                ? "Roda (2/3)"
                : "Đủ tải",
          initialFuel: report.fuelBeginning,
          receivedFuel: report.fuelReceived,
          finalFuel: report.fuelEnding,
          fuelConsumption:
            report.fuelUsed ??
            report.fuelBeginning + report.fuelReceived - report.fuelEnding,
          operatorBadgeNo:
            report.employeeSalaryCode || String(report.employeeId),
          operatorName: report.employeeFullName || "",
          operatorUnit: report.employeeDepartmentName || "",
          createdAt: report.reportDate,
        });
      });
    });
    return list;
  }, [reportsList]);

  // F3 keyboard shortcut to open Add Trip modal
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
      // Date filter
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

      // Pickup location filter (Multi-select)
      if (selectedPickups.length > 0) {
        const p = r.pickupLocation || "";
        if (!selectedPickups.includes(p)) return false;
      }

      // Excavator filter (Multi-select)
      if (selectedExcavators.length > 0) {
        const m = r.mineCode || "";
        if (!selectedExcavators.includes(m)) return false;
      }

      // Total scoops filter (Multi-select)
      if (selectedScoops.length > 0) {
        const s = String(r.excavationBench || "");
        if (!selectedScoops.includes(s)) return false;
      }

      // Keyword search (vehicle, excavator, badge, operator name)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const vehicle = (r.transportVehicleNo || "").toLowerCase();
        const excavator = (r.mineCode || "").toLowerCase();
        const badge = (r.operatorBadgeNo || "").toLowerCase();
        const name = (r.operatorName || "").toLowerCase();
        const unit = (r.operatorUnit || "").toLowerCase();
        if (
          !vehicle.includes(kw) &&
          !excavator.includes(kw) &&
          !badge.includes(kw) &&
          !name.includes(kw) &&
          !unit.includes(kw)
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
    selectedPickups,
    selectedExcavators,
    selectedScoops,
    searchKeyword,
  ]);

  // Unique lists for filter dropdowns
  const uniqueShifts = useMemo(() => {
    const set = new Set(records.map((r) => r.shift).filter(Boolean));
    return Array.from(set).map(String);
  }, [records]);

  const uniquePickups = useMemo(() => {
    const set = new Set(records.map((r) => r.pickupLocation).filter(Boolean));
    return Array.from(set).map(String);
  }, [records]);

  const uniqueExcavators = useMemo(() => {
    const set = new Set(records.map((r) => r.mineCode).filter(Boolean));
    return Array.from(set).map(String);
  }, [records]);

  const uniqueScoops = useMemo(() => {
    const set = new Set(records.map((r) => r.excavationBench).filter(Boolean));
    return Array.from(set).map(String);
  }, [records]);

  // Reset filters
  const handleResetFilters = () => {
    setStartDate("2026-08-01");
    setEndDate("2026-08-31");
    setSelectedShifts([]);
    setSelectedPickups([]);
    setSelectedExcavators([]);
    setSelectedScoops([]);
    setSearchKeyword("");
    toast.info("Đã làm mới các bộ lọc!");
  };

  // ── Table 1 Data: Báo chuyến ──────────────────────────────────────────────
  const tripRows = filteredRecords; // Each MiningRecord represents a trip

  // ── Table 2 Data: Báo nhiên liệu ──────────────────────────────────────────
  // Deduplicate records for Table 2 by (date, shift, pickupLocation, mineCode, operatorBadgeNo)
  const fuelRows = useMemo(() => {
    const map = new Map<string, MiningRecord>();
    filteredRecords.forEach((r) => {
      const key = `${r.month}_${r.day}_${r.shift}_${r.pickupLocation}_${r.mineCode}_${r.operatorBadgeNo}`;
      if (!map.has(key)) {
        map.set(key, r);
      }
    });
    return Array.from(map.values());
  }, [filteredRecords]);

  // ── Row Selection Handlers ────────────────────────────────────────────────
  const toggleSelectAllTrips = (checked: boolean) => {
    if (checked) {
      setSelectedTripIds(new Set(tripRows.map((r) => r.id!).filter(Boolean)));
    } else {
      setSelectedTripIds(new Set());
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

  const toggleSelectAllFuel = (checked: boolean) => {
    if (checked) {
      setSelectedFuelIds(new Set(fuelRows.map((r) => r.id!).filter(Boolean)));
    } else {
      setSelectedFuelIds(new Set());
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

  // ── Delete Selected Records ──────────────────────────────────────────────
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const handleAddNew = () => {
    initDrafts();
    setIsEntryModalOpen(true);
  };

  const handleEditSelected = async () => {
    const selectedIdsArray = Array.from(
      new Set([...selectedTripIds, ...selectedFuelIds]),
    )
      .map(Number)
      .filter((id) => Boolean(id) && !isNaN(id));

    if (selectedIdsArray.length === 0) {
      toast.warning("Vui lòng chọn bản ghi để chỉnh sửa!");
      return;
    }

    try {
      toast.loading(
        selectedIdsArray.length === 1
          ? "Đang tải dữ liệu chi tiết báo cáo..."
          : `Đang tải dữ liệu ${selectedIdsArray.length} báo cáo...`,
        { id: "fetch-detail" },
      );

      const responses = await Promise.all(
        selectedIdsArray.map((id) =>
          fetchExcavationReportById(id).catch((err) => {
            console.error(`Lỗi tải báo cáo #${id}:`, err);
            return null;
          }),
        ),
      );

      toast.dismiss("fetch-detail");

      const drafts = responses
        .filter((res) => Boolean(res?.data))
        .map((res) => mapReportResponseToDraft(res!.data!));

      if (drafts.length === 0) {
        toast.error("Không tải được thông tin chi tiết của bản ghi nào!");
        return;
      }

      loadSessionsForEdit(drafts);
      setIsEntryModalOpen(true);
    } catch (err: any) {
      toast.dismiss("fetch-detail");
      toast.error(
        `Không thể tải chi tiết báo cáo: ${err.message || "Lỗi máy chủ"}`,
      );
    }
  };

  const handleDeleteSelected = async () => {
    const selectedIdsArray = Array.from(
      new Set([...selectedTripIds, ...selectedFuelIds]),
    )
      .map(Number)
      .filter((id) => Boolean(id) && !isNaN(id));

    if (selectedIdsArray.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 dòng để xóa!");
      return;
    }

    const isConfirmed = await confirm({
      title: "Xác nhận xóa bản ghi",
      description: `Bạn có chắc chắn muốn xóa ${selectedIdsArray.length} báo cáo đã chọn? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa bản ghi",
      cancelText: "Hủy bỏ",
      variant: "destructive",
    });

    if (isConfirmed) {
      try {
        const res = await bulkDeleteReportMutation.mutateAsync(selectedIdsArray);
        setSelectedTripIds(new Set());
        setSelectedFuelIds(new Set());
        const deletedCount = res.data?.deletedCount ?? selectedIdsArray.length;
        toast.success(`Đã xóa thành công ${deletedCount} báo cáo!`);
        refetch();
      } catch (err: any) {
        console.error("Lỗi xóa bản ghi bulk:", err);
        toast.error(`Lỗi khi xóa bản ghi: ${err.response?.data?.message || err.message || "Lỗi máy chủ"}`);
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

      const results = validateImportRows<MiningRecord>(rawRows, role);
      const validRows = results
        .filter((r) => r.isValid)
        .map((r) => ({
          ...r.rowData,
          id: `imp_mine_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          createdAt: new Date().toISOString(),
        }));

      if (validRows.length === 0) {
        toast.error("Không tìm thấy dòng dữ liệu hợp lệ nào trong file Excel!");
        return;
      }

      saveMiningRecords(validRows as MiningRecord[]);
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
      "DanhSach_BaoChuyen_KhaiThac",
      "BÁO CHUYẾN",
    );
    toast.success("Đã xuất danh sách báo chuyến Khai thác ra file Excel!");
  };

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-gray-950 min-h-screen">
      {/* ══ TOP HEADER BAR ═══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 dark:border-gray-800">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              DANH SÁCH BÁO CHUYẾN CÔNG TRƯỜNG KHAI THÁC
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
            onClick={handleAddNew}
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
            Xóa chuyến{" "}
            {selectedTripIds.size + selectedFuelIds.size > 0
              ? `(${selectedTripIds.size + selectedFuelIds.size})`
              : ""}
          </Button>
        </div>
      </div>

      {/* ══ FILTER BAR ═══════════════════════════════════════════════════ */}
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

          {/* Nơi chất tải (Combobox Chọn nhiều) */}
          <div className="flex flex-col gap-1 min-w-[180px] max-w-[300px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Nơi chất tải
            </span>
            <Combobox
              items={uniquePickups}
              multiple
              value={selectedPickups}
              onValueChange={setSelectedPickups}
            >
              <ComboboxChips
                ref={pickupAnchorRef}
                className="min-h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs py-1"
              >
                <ComboboxValue placeholder="Tất cả nơi chất tải">
                  {selectedPickups.map((item) => (
                    <ComboboxChip key={item} className="text-xs py-0.5">
                      {item}
                    </ComboboxChip>
                  ))}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder={
                    selectedPickups.length === 0 ? "Chọn nơi chất tải..." : ""
                  }
                  className="text-xs"
                />
              </ComboboxChips>
              <ComboboxContent
                anchor={pickupAnchorRef}
                sideOffset={4}
                align="start"
              >
                <ComboboxEmpty className="text-xs py-2 text-gray-400">
                  Không tìm thấy nơi chất tải
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

          {/* Máy xúc (Combobox Chọn nhiều) */}
          <div className="flex flex-col gap-1 min-w-[180px] max-w-[300px]">
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

          {/* Tầng xúc (Combobox Chọn nhiều) */}
          <div className="flex flex-col gap-1 min-w-[170px] max-w-[280px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Tầng xúc
            </span>
            <Combobox
              items={uniqueScoops}
              multiple
              value={selectedScoops}
              onValueChange={setSelectedScoops}
            >
              <ComboboxChips
                ref={scoopAnchorRef}
                className="min-h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs py-1"
              >
                <ComboboxValue placeholder="Tất cả tầng xúc">
                  {selectedScoops.map((item) => (
                    <ComboboxChip key={item} className="text-xs py-0.5">
                      {item}
                    </ComboboxChip>
                  ))}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder={
                    selectedScoops.length === 0 ? "Chọn tầng xúc..." : ""
                  }
                  className="text-xs"
                />
              </ComboboxChips>
              <ComboboxContent
                anchor={scoopAnchorRef}
                sideOffset={4}
                align="start"
              >
                <ComboboxEmpty className="text-xs py-2 text-gray-400">
                  Không tìm thấy tầng xúc
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

          {/* Right section: Search Box + Filter / Reset Buttons */}
          <div className="ml-auto flex items-end gap-3">
            {/* Search Box */}
            <div className="w-[220px] flex flex-col gap-1">
              <span className="font-medium text-transparent select-none">
                Tìm kiếm
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm..."
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
      </div>

      {/* ══ BẢNG 1: BẢNG BÁO CHUYẾN ══════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3 p-4">
        {/* Table Title */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>1. BẢNG BÁO CHUYẾN</span>
        </div>

        {/* Table 1 Content using TanStack DataTable */}
        <MiningTripsDataTable
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

        {/* Table 2 Content using TanStack DataTable */}
        <MiningFuelDataTable
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
