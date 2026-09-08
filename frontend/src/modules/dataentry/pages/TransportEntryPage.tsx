import React, { useState, useMemo } from "react";
import type {
  ApprovalStatus,
  TransportRecord,
} from "@/modules/dataentry/types/thong-ke";
import {
  useTransportReportsQuery,
  fetchTransportReportById,
  mapReportResponseToDraft,
  fetchTransportTripById,
  mapTransportTripResponseToDraft,
  useBulkDeleteTransportReportMutation,
  useBulkDeleteTransportTripsMutation,
  importTransportReports,
  exportTransportReports,
  type TransportReportResponse,
} from "@/modules/dataentry/services/transportTripReportService";
import { useTransportDraftStore } from "@/modules/dataentry/store/useTransportDraftStore";
import { BatchEntryModal } from "@/modules/dataentry/components/BatchEntryModal.tsx";
import { TransportTripsDataTable } from "@/modules/dataentry/components/TransportTripsDataTable";
import { TransportFuelDataTable } from "@/modules/dataentry/components/TransportFuelDataTable";
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

export const TransportEntryPage: React.FC = () => {
  const role = "ROLE_TRANSPORT";
  const shiftAnchorRef = useComboboxAnchor();
  const vehicleAnchorRef = useComboboxAnchor();

  // ── Main Top Filters ─────────────────────────────────────────────────────
  // Mặc định = tháng hiện tại (trước đây cứng "2026-08-01".."2026-08-31" —
  // bản ghi nhập ở tháng khác "biến mất" khỏi danh sách mặc định, hiểu nhầm
  // thành lưu thất bại — cùng lỗi vừa gặp thật ở màn Khai thác, 2026-09-08).
  // `useState` chỉ đọc giá trị khởi tạo ở lần render đầu, nên tháng không tự
  // nhảy khi đồng hồ máy khách sang ngày mới giữa phiên làm việc.
  const defaultDateRange = currentMonthRange();
  const [startDate, setStartDate] = useState(defaultDateRange.from);
  const [endDate, setEndDate] = useState(defaultDateRange.to);
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  const masterData = useMasterData();
  const { rawShifts = [], rawVehicles = [] } = masterData;

  const shiftIds = useMemo(() => {
    if (!selectedShifts.length) return;

    return rawShifts
        .filter(({ name, id }) => {
          const rawName = String(name ?? "").trim();
          const cleanNum = rawName.replace(/^ca\s+/i, "").trim();

          return [rawName, cleanNum, `Ca ${cleanNum}`, String(id)]
              .some((val) => selectedShifts.includes(val));
        })
        .map((s) => s.id);
  }, [selectedShifts, rawShifts]);

  const deviceIds = useMemo(() => {
    if (!selectedVehicles.length) return;

    const ids = rawVehicles
        .filter(({ code, vehicleNumber, name }) =>
            [code, vehicleNumber, name].some((val) =>
                val ? selectedVehicles.includes(val) : false
            )
        )
        .map((v) => v.id);

    return ids.length ? ids : undefined;
  }, [selectedVehicles, rawVehicles]);


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

  // ── Query Backend API ───────────────────────────────────────────────────
  const { data: apiResponse, refetch } = useTransportReportsQuery({
    fromDate: startDate,
    toDate: endDate,
    shiftIds,
    deviceIds,
  });

  const bulkDeleteReportMutation = useBulkDeleteTransportReportMutation();
  const bulkDeleteTripsMutation = useBulkDeleteTransportTripsMutation();
  const { loadSessionsForEdit } = useTransportDraftStore();

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
      const year = !isNaN(d.getTime()) ? d.getFullYear() : undefined;
      const month = !isNaN(d.getTime()) ? d.getMonth() + 1 : undefined;
      const day = !isNaN(d.getTime()) ? d.getDate() : undefined;
      const rawShift = String(report.shiftName || report.shiftId || "");
      const shiftStr = rawShift.replace(/^ca\s+/i, "").trim();

      (report.trips || []).forEach((t, tIdx) => {
        const record: TransportRecord = {
          id: t.id ? `trip_${t.id}` : `rep_${report.id}_trip_${tIdx}`,
          reportId: report.id,
          tripId: t.id,
          status: t.status || "PENDING",
          note: t.note,
          year,
          month,
          day,
          shift: shiftStr,
          vehicleNo:
            report.vehicleCode ||
            report.vehicleName ||
            t.vehicleCode ||
            t.vehicleName ||
            "",
          vehicleType:
            report.vehicleCategoryName || t.vehicleCategoryName || "",
          equipmentUnit:
            report.vehicleDepartmentName || t.vehicleDepartmentName || "",
          operatorBadgeNo: report.employeeSalaryCode || "",
          operatorName: report.employeeFullName || "",
          operatorUnit: report.employeeDepartmentName || "",
          departmentId: report.departmentId,
          departmentName: report.departmentName,
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
          createdAt: report.reportDate,
        };
        list.push(record);
      });
    });

    return list;
  }, [reportsList]);

  // ── Filtered Records ─────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Date range filter
      if (r.month && r.day) {
        const rYear = r.year || new Date().getFullYear();
        const rDateStr = `${rYear}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;
        if (startDate && rDateStr < startDate) return false;
        if (endDate && rDateStr > endDate) return false;
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
  const handleResetFilters = async () => {
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
    await refetch();
    toast.info("Đã làm mới các bộ lọc!");
  };

  // ── Table 1 Rows (Báo chuyến) ────────────────────────────────────────────
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

  // ── Table 2 Rows (Báo nhiên liệu - deduplicated by date, shift, vehicleNo) ──
  const fuelRows = useMemo(() => {
    const map = new Map<string, TransportRecord>();
    filteredRecords.forEach((r) => {
      const key = `${r.month}_${r.day}_${r.shift}_${r.vehicleNo}`;
      if (!map.has(key)) {
        map.set(key, {
          ...r,
          id: `fuel_${r.reportId || r.id}`,
        });
      }
    });
    return Array.from(map.values());
  }, [filteredRecords]);

  // ── Common Entry Page Logic Hook ──────────────────────────────────────────
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
    title: "Vận tải",
    filePrefix: "Bao-cao-van-tai",
    startDate,
    endDate,
    tripRows,
    fuelRows,
    fetchReportById: fetchTransportReportById,
    mapReportResponseToDraft,
    fetchTripById: fetchTransportTripById,
    mapTripResponseToDraft: mapTransportTripResponseToDraft,
    bulkDeleteReport: bulkDeleteReportMutation.mutateAsync,
    bulkDeleteTrips: bulkDeleteTripsMutation.mutateAsync,
    refetch,
    importReports: importTransportReports,
    exportReports: (params) =>
      exportTransportReports({
        ...params,
        shiftIds,
        deviceIds,
      }),
    loadSessionsForEdit,
    deleteDialogTitle: "Xác nhận xóa báo cáo Vận tải",
    deleteDialogDescription: (count) =>
      `Bạn có chắc chắn muốn xóa ${count} báo cáo đã chọn? Hành động này không thể hoàn tác trên CSDL.`,
  });

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-gray-950 min-h-screen">
      {/* ══ TOP HEADER BAR ═══════════════════════════════════════════════ */}
      <EntryPageHeader
        title="DANH SÁCH BÁO CHUYẾN PHÂN XƯỞNG VẬN TẢI"
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

          {/* Số xe (Combobox Chọn nhiều) */}
          <div className="flex flex-col gap-1 min-w-[210px] max-w-[340px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Số xe
            </span>
            <Combobox
              items={rawVehicles.map((v) => v.name || String(v.id))}
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
                  Không tìm thấy xe nào
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
                placeholder="Tìm kiếm số xe, người nhập chuyến..."
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

        {/* Table 1 Content */}
        <TransportTripsDataTable
          data={displayedTripRows}
          selectedIds={tripSelection.selectedIds}
          onToggleSelectAll={tripSelection.toggleSelectAll}
          onToggleSelectRow={tripSelection.toggleSelect}
          onEditRow={handleEditRow}
          statusFilterValue={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      {/* ══ BẢNG: BẢNG BÁO NHIÊN LIỆU ═════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3 p-4">
        {/* Table Title */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          <Fuel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>BẢNG BÁO NHIÊN LIỆU</span>
        </div>

        {/* Table 2 Content */}
        <TransportFuelDataTable
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
