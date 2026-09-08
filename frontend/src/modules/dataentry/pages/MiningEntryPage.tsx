import React, { useState, useMemo, useEffect } from "react";
import type { ApprovalStatus, MiningRecord } from "../types/thong-ke";
import {
  useExcavationReportsQuery,
  fetchExcavationReportById,
  mapReportResponseToDraft,
  fetchExcavationTripById,
  mapExcavationTripResponseToDraft,
  useBulkDeleteExcavationTripReportMutation,
  useBulkDeleteExcavationTripsMutation,
  importExcavationReports,
  exportExcavationReports,
  fetchDistinctExcavationFloors,
  type ExcavationReportResponse,
} from "@/modules/dataentry/services/excavationTripReportService";
import { useMiningDraftStore } from "@/modules/dataentry/store/useMiningDraftStore";
import { BatchEntryModal } from "@/modules/dataentry/components/BatchEntryModal.tsx";
import { MiningTripsDataTable } from "@/modules/dataentry/components/MiningTripsDataTable";
import { MiningFuelDataTable } from "@/modules/dataentry/components/MiningFuelDataTable";
import { EntryPageHeader } from "@/modules/dataentry/components/EntryPageHeader";
import { FilterResetButton } from "@/modules/dataentry/components/FilterResetButton";
import { useEntryPageLogic } from "@/modules/dataentry/hooks/useEntryPageLogic";
import { useMasterData } from "@/modules/dataentry/hooks/useMasterData";
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
import { Search, Truck, Fuel } from "lucide-react";
import { toast } from "sonner";
import { currentMonthRange } from "@/lib/utils";

export const MiningEntryPage: React.FC = () => {
  const role = "ROLE_MINING";
  const shiftAnchorRef = useComboboxAnchor();
  const excavatorAnchorRef = useComboboxAnchor();
  const pickupAnchorRef = useComboboxAnchor();
  const benchAnchorRef = useComboboxAnchor();

  // ── Filters state ────────────────────────────────────────────────────────
  // Mặc định = tháng hiện tại (trước đây cứng "2026-08-01".."2026-08-31" —
  // bản ghi nhập ở tháng khác "biến mất" khỏi danh sách mặc định, hiểu nhầm
  // thành lưu thất bại; sự cố thật ngày 2026-09-08). `useState` chỉ đọc giá
  // trị khởi tạo Ở LẦN RENDER ĐẦU, nên tháng không tự nhảy khi đồng hồ máy
  // khách sang ngày mới giữa phiên làm việc — người dùng tự đổi lại nếu cần
  // xem tháng khác.
  const defaultDateRange = currentMonthRange();
  const [startDate, setStartDate] = useState(defaultDateRange.from);
  const [endDate, setEndDate] = useState(defaultDateRange.to);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedExcavators, setSelectedExcavators] = useState<string[]>([]);
  const [selectedPickupLocations, setSelectedPickupLocations] = useState<
    string[]
  >([]);
  const [selectedBenches, setSelectedBenches] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  const masterData = useMasterData();
  const {
    rawShifts = [],
    rawExcavators = [],
    // "Nơi chất tải" của Khai thác PHẢI dùng danh mục Pickup Point
    // (/api/pickup-points), KHÔNG PHẢI /api/locations — hai bảng tình cờ
    // trùng tên vài dòng (KX1..KX4) nhưng ID khác hẳn; backend xác thực
    // receivingLocationId qua pickupPointRepository (bug thật, vá 2026-09-08,
    // xem masterDataService.ts).
    rawPickupPoints = [],
  } = masterData;

  // Map selected Shift names to Shift IDs for Backend API
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

  // Map selected Excavator codes/names to Device IDs for Backend API
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

  // Map tên "Nơi chất tải" đã chọn sang Pickup Point ID cho Backend API
  const receivingLocationIds = useMemo(() => {
    if (selectedPickupLocations.length === 0) return undefined;
    const ids = rawPickupPoints
      .filter((l) => selectedPickupLocations.includes(String(l.name ?? "")))
      .map((l) => l.id);
    return ids.length > 0 ? ids : undefined;
  }, [selectedPickupLocations, rawPickupPoints]);

  // "Tầng xúc" là chuỗi tự do -> gửi thẳng giá trị
  const excavationFloors = useMemo(() => {
    return selectedBenches.length > 0 ? selectedBenches : undefined;
  }, [selectedBenches]);

  // ── Query Backend API ───────────────────────────────────────────────────
  const { data: apiResponse, refetch } = useExcavationReportsQuery({
    fromDate: startDate,
    toDate: endDate,
    shiftIds,
    excavatorIds,
    receivingLocationIds,
    excavationFloors,
  });

  const bulkDeleteReportMutation = useBulkDeleteExcavationTripReportMutation();
  const bulkDeleteTripsMutation = useBulkDeleteExcavationTripsMutation();
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
      const year = !isNaN(d.getTime()) ? d.getFullYear() : undefined;
      const m = !isNaN(d.getTime()) ? d.getMonth() + 1 : undefined;
      const day = !isNaN(d.getTime()) ? d.getDate() : undefined;
      (report.trips || []).forEach((t, tIdx) => {
        list.push({
          id: t.id ? `trip_${t.id}` : `rep_${report.id}_trip_${tIdx}`,
          reportId: report.id,
          tripId: t.id,
          status: t.status || "PENDING",
          note: t.note,
          year,
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
            t.vehicleCode ||
            t.vehicleName ||
            (t.vehicleId ? String(t.vehicleId) : "") ||
            report.vehicleCode ||
            report.vehicleName ||
            "",
          vehicleNo:
            t.vehicleCode ||
            t.vehicleName ||
            (t.vehicleId ? String(t.vehicleId) : "") ||
            report.vehicleCode ||
            report.vehicleName ||
            "",
          vehicleType:
            t.vehicleCategoryName || report.vehicleCategoryName || "",
          vehicleManagementUnit:
            t.vehicleDepartmentName || report.vehicleDepartmentName || "",
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
          departmentId: report.departmentId,
          departmentName: report.departmentName,
          createdAt: report.reportDate,
        });
      });
    });
    return list;
  }, [reportsList]);

  // "Nơi chất tải" lấy thẳng từ danh mục Pickup Point — độc lập với kết quả
  // lọc nên không bị co lại khi người dùng đã chọn.
  const pickupLocationOptions = useMemo(() => {
    return Array.from(
      new Set(
        rawPickupPoints.map((l) => String(l.name ?? "").trim()).filter(Boolean),
      ),
    ).sort();
  }, [rawPickupPoints]);

  // "Tầng xúc" là chuỗi tự do, không có danh mục — phải gom từ dữ liệu.
  //
  // TRƯỚC ĐÂY gom bằng cách tích luỹ giá trị thấy được từ `records` (danh
  // sách chuyến ĐÃ PHÂN TRANG từ backend, `search()` không truyền page/size
  // nên chỉ đọc được trang đang xem). Hệ quả (phát hiện qua Quality Gate của
  // Codex, 2026-09-07): tầng xúc chỉ xuất hiện ở những trang CHƯA từng xem
  // không bao giờ vào được danh sách, nên không chọn được — người dùng phải
  // lật hết mọi trang thì mới "tích luỹ" đủ, điều không ai làm trong thực tế.
  //
  // Sửa bằng nguồn RIÊNG, độc lập phân trang: `findDistinctExcavationFloors`
  // (backend) chỉ lọc theo khoảng ngày, không lọc theo ca/máy xúc/nơi nhận
  // tải/chính tầng xúc — giống hệt cách `pickupLocationOptions` ở trên lấy
  // từ danh mục Vị trí thay vì từ `records`, để không bị co lại khi người
  // dùng đã chọn bớt bộ lọc khác.
  const [benchOptions, setBenchOptions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!startDate || !endDate) {
      setBenchOptions([]);
      return;
    }
    fetchDistinctExcavationFloors(startDate, endDate)
      .then((res) => {
        if (cancelled) return;
        const floors = res.data ?? [];
        setBenchOptions(
          [...floors].sort((a, b) => Number(b) - Number(a) || a.localeCompare(b)),
        );
      })
      .catch(() => {
        if (!cancelled) setBenchOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  // ── Filtered Records ─────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    // Ca, Máy xúc, Nơi chất tải, Tầng xúc đều đã lọc ở Backend — chỉ còn lọc
    // theo khoảng ngày (an toàn) và tìm kiếm từ khoá ở client.
    return records.filter((r) => {
      // Date filter
      if (r.month && r.day) {
        const rYear = r.year || new Date().getFullYear();
        const rDateStr = `${rYear}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;
        if (startDate && rDateStr < startDate) return false;
        if (endDate && rDateStr > endDate) return false;
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
    searchKeyword,
  ]);
  // Reset filters
  const handleResetFilters = async () => {
    setStartDate("2026-08-01");
    setEndDate("2026-08-31");
    setSelectedShifts([]);
    setSelectedExcavators([]);
    setSelectedPickupLocations([]);
    setSelectedBenches([]);
    setSearchKeyword("");
    await refetch();
    toast.info("Đã làm mới các bộ lọc!");
  };

  // ── Table 1 Data: Báo chuyến ──────────────────────────────────────────────
  const tripRows = filteredRecords;

  // Bộ lọc trạng thái dạng checkbox (Tất cả/Đã gửi/Chờ duyệt/Cần sửa) — chỉ
  // lọc phần HIỂN THỊ của Bảng báo chuyến, không đụng gì tới selection
  // (tripSelection vẫn giữ nguyên toàn bộ tripRows như trước). Set rỗng =
  // đang xem "Tất cả".
  const [statusFilter, setStatusFilter] = useState<Set<ApprovalStatus>>(
    new Set(),
  );
  const displayedTripRows = useMemo(() => {
    if (statusFilter.size === 0) return tripRows;
    return tripRows.filter((r) =>
      statusFilter.has((r.status || "PENDING") as ApprovalStatus),
    );
  }, [tripRows, statusFilter]);

  // Đếm theo trạng thái từ TOÀN BỘ tripRows (không phải displayedTripRows đã
  // lọc) — để số đếm cạnh mỗi nhãn luôn ổn định, không co lại khi đang lọc.
  const statusCounts = useMemo(() => {
    const counts = { all: tripRows.length, APPROVED: 0, PENDING: 0, REVISION_REQUESTED: 0 };
    tripRows.forEach((r) => {
      const status = (r.status || "PENDING") as ApprovalStatus;
      counts[status] = (counts[status] ?? 0) + 1;
    });
    return counts;
  }, [tripRows]);

  // ── Table 2 Data: Báo nhiên liệu ──────────────────────────────────────────
  // Deduplicate records for Table 2 by (date, shift, pickupLocation, mineCode, operatorBadgeNo)
  const fuelRows = useMemo(() => {
    const map = new Map<string, MiningRecord>();
    filteredRecords.forEach((r) => {
      const key = `${r.month}_${r.day}_${r.shift}_${r.pickupLocation}_${r.mineCode}_${r.operatorBadgeNo}`;
      if (!map.has(key)) {
        map.set(key, {
          ...r,
          id: `fuel_${r.reportId || r.id}`,
        });
      }
    });
    return Array.from(map.values());
  }, [filteredRecords]);

  // ── Common Entry Page Logic Hook
  const {
    isEntryModalOpen,
    entryModalMode,
    setIsEntryModalOpen,
    handleAddNew,
    handleEditSelected,
    handleEditRow,
    handleDeleteSelected,
    tripSelection,
    fuelSelection,
    selectedCount,
    excel,
    ConfirmDialogComponent,
  } = useEntryPageLogic({
    title: "Khai thác",
    filePrefix: "bao-cao-khai-thac",
    startDate,
    endDate,
    tripRows,
    fuelRows,
    fetchReportById: fetchExcavationReportById,
    mapReportResponseToDraft,
    fetchTripById: fetchExcavationTripById,
    mapTripResponseToDraft: mapExcavationTripResponseToDraft,
    bulkDeleteReport: bulkDeleteReportMutation.mutateAsync,
    bulkDeleteTrips: bulkDeleteTripsMutation.mutateAsync,
    refetch,
    importReports: importExcavationReports,
    exportReports: (params) =>
      exportExcavationReports({
        ...params,
        shiftIds,
        excavatorIds,
        receivingLocationIds,
        excavationFloors,
      }),
    loadSessionsForEdit,
    initDrafts,
    deleteDialogTitle: "Xác nhận xóa bản ghi",
    deleteDialogDescription: (count) =>
      `Bạn có chắc chắn muốn xóa ${count} báo cáo đã chọn? Hành động này không thể hoàn tác.`,
  });

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-gray-950 min-h-screen">
      {/* ══ TOP HEADER BAR ═══════════════════════════════════════════════ */}
      <EntryPageHeader
        title="DANH SÁCH BÁO CHUYẾN CÔNG TRƯỜNG KHAI THÁC"
        subtitle="Quản lý và theo dõi danh sách chuyến xe xúc và nhiên liệu"
        fileInputRef={excel.fileInputRef}
        onFileInputChange={excel.handleDirectFileUpload}
        onUpload={excel.triggerUpload}
        onExport={excel.handleExportData}
        onAddNew={handleAddNew}
        onEdit={handleEditSelected}
        onDelete={handleDeleteSelected}
        selectedCount={selectedCount}
        isImporting={excel.isImporting}
        isExporting={excel.isExporting}
      />

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
              items={rawShifts.map((s) => s.name || String(s.id))}
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
              items={pickupLocationOptions}
              multiple
              value={selectedPickupLocations}
              onValueChange={setSelectedPickupLocations}
            >
              <ComboboxChips
                ref={pickupAnchorRef}
                className="min-h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs py-1"
              >
                <ComboboxValue placeholder="Tất cả nơi chất tải">
                  {selectedPickupLocations.map((item) => (
                    <ComboboxChip key={item} className="text-xs py-0.5">
                      {item}
                    </ComboboxChip>
                  ))}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder={
                    selectedPickupLocations.length === 0
                      ? "Chọn nơi chất tải..."
                      : ""
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
              items={rawExcavators.map((e) => e.code || String(e.id))}
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
          <div className="flex flex-col gap-1 min-w-[150px] max-w-[240px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Tầng xúc
            </span>
            <Combobox
              items={benchOptions}
              multiple
              value={selectedBenches}
              onValueChange={setSelectedBenches}
            >
              <ComboboxChips
                ref={benchAnchorRef}
                className="min-h-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-xs py-1"
              >
                <ComboboxValue placeholder="Tất cả tầng xúc">
                  {selectedBenches.map((item) => (
                    <ComboboxChip key={item} className="text-xs py-0.5">
                      {item}
                    </ComboboxChip>
                  ))}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder={
                    selectedBenches.length === 0 ? "Chọn tầng xúc..." : ""
                  }
                  className="text-xs"
                />
              </ComboboxChips>
              <ComboboxContent
                anchor={benchAnchorRef}
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

          {/* Search Box */}
          <div className="flex-1 min-w-[220px] flex flex-col gap-1">
            <span className="font-medium text-transparent select-none">
              Tìm kiếm
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm máy xúc, số xe, người vận hành..."
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

      {/* ══ BẢNG: BẢNG BÁO CHUYẾN ══════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3 p-4">
        {/* Table Title */}
        <div className="flex items-center gap-2.5 text-sm font-bold text-gray-900 dark:text-gray-100">
          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>BẢNG BÁO CHUYẾN</span>
        </div>

        {/* Table 1 Content using TanStack DataTable */}
        <MiningTripsDataTable
          data={displayedTripRows}
          selectedIds={tripSelection.selectedIds}
          onToggleSelectAll={tripSelection.toggleSelectAll}
          onToggleSelectRow={tripSelection.toggleSelect}
          onEditRow={handleEditRow}
          statusFilterValue={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusCounts={statusCounts}
        />
      </div>

      {/* ══ BẢNG: BẢNG BÁO NHIÊN LIỆU ═════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3 p-4">
        {/* Table Title */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          <Fuel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>BẢNG BÁO NHIÊN LIỆU</span>
        </div>

        {/* Table 2 Content using TanStack DataTable */}
        <MiningFuelDataTable
          data={fuelRows}
          selectedIds={fuelSelection.selectedIds}
          onToggleSelectAll={fuelSelection.toggleSelectAll}
          onToggleSelectRow={fuelSelection.toggleSelect}
        />
      </div>

      {/* Entry Modal */}
      <BatchEntryModal
        role={role}
        isOpen={isEntryModalOpen}
        mode={entryModalMode}
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
