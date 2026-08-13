import React, { useState, useEffect, useMemo } from "react";
import type { ReconciliationItem } from "@/modules/dataentry/types/thong-ke";
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
  FileSpreadsheet,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
  RotateCw,
} from "lucide-react";
import { ReconciliationComparisonTables } from "../components/ReconciliationComparisonTables";
import { excelService } from "@/modules/report/utils/excel-exporter";
import { toast } from "sonner";

import { useMasterData } from "@/modules/dataentry/hooks/useMasterData";
import {
  reconciliationService,
  useReconciliationSearchQuery,
  mapRowResponseToReconciliationItem,
  type ReconciliationDecisionRequest,
} from "../services/reconciliation.service";

type CardFilterType = "all" | "transport" | "mining" | "matched" | "mismatch";

// ponytail: helper function to check if reconciliation item is matched
const isMatchedItem = (item: ReconciliationItem) => {
  const t = item.transportRecord;
  const m = item.miningRecord;
  if (!t || !m) return false;
  return (
    (t.tripCount ?? 0) === (m.tripCount ?? 0) &&
    (t.cargoType || "").trim().toLowerCase() ===
      (m.material || m.loadStatus || "").trim().toLowerCase()
  );
};

export const ReconciliationPage: React.FC = () => {
  const shiftAnchorRef = useComboboxAnchor();
  const vehicleAnchorRef = useComboboxAnchor();

  const masterData = useMasterData();
  const { rawShifts = [], rawVehicles = [] } = masterData;

  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-31");
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  // ponytail: active KPI card filter state
  const [cardFilter, setCardFilter] = useState<CardFilterType>("all");

  const [rawItems, setRawItems] = useState<ReconciliationItem[]>([]);

  // Map selected Shift names to Shift IDs for API
  const shiftIds = useMemo(() => {
    if (selectedShifts.length === 0) return undefined;
    return rawShifts
      .filter(
        (s) =>
          selectedShifts.includes(`Ca ${s.name}`) ||
          selectedShifts.includes(String(s.name)),
      )
      .map((s) => s.id);
  }, [selectedShifts, rawShifts]);

  // Map selected Vehicle numbers to Device IDs for API
  const deviceIds = useMemo(() => {
    if (selectedVehicles.length === 0) return undefined;
    return rawVehicles
      .filter(
        (v) =>
          selectedVehicles.includes(v.code) ||
          (v.vehicleNumber && selectedVehicles.includes(v.vehicleNumber)),
      )
      .map((v) => v.id);
  }, [selectedVehicles, rawVehicles]);

  // Connect Backend Query API
  const {
    data: apiResponse,
    isLoading: isApiLoading,
    refetch: refetchApi,
  } = useReconciliationSearchQuery({
    fromDate: startDate,
    toDate: endDate,
    shiftIds,
    deviceIds,
    finalizedOnly: false,
  });

  useEffect(() => {
    if (apiResponse?.content) {
      const mapped = apiResponse.content.map((row, idx) =>
        mapRowResponseToReconciliationItem(row, idx)
      );
      setRawItems(mapped);
    } else {
      setRawItems([]);
    }
  }, [apiResponse]);

  // Unique Shifts for Dropdown Filter (lấy từ Master Data + dữ liệu thực tế)
  const availableShifts = useMemo(() => {
    const set = new Set<string>();
    if (rawShifts && rawShifts.length > 0) {
      rawShifts.forEach((s) => set.add(`Ca ${s.name}`));
    } else {
      ["Ca 1", "Ca 2", "Ca 3"].forEach((s) => set.add(s));
    }
    rawItems.forEach((i) => {
      if (i.commonKey.shift) set.add(i.commonKey.shift);
    });
    return Array.from(set);
  }, [rawShifts, rawItems]);

  // Unique Vehicles for Dropdown Filter (lấy từ Master Data + dữ liệu thực tế)
  const availableVehicles = useMemo(() => {
    const set = new Set<string>();
    if (rawVehicles && rawVehicles.length > 0) {
      rawVehicles.forEach((v) => {
        if (v.code) set.add(v.code);
        if (v.vehicleNumber) set.add(v.vehicleNumber);
      });
    }
    rawItems.forEach((i) => {
      if (i.commonKey.vehicleNo) set.add(i.commonKey.vehicleNo);
    });
    return Array.from(set);
  }, [rawVehicles, rawItems]);

  // Base Filtered Items (by Date, Shift, Vehicle, Keyword)
  const baseFilteredItems = useMemo(() => {
    return rawItems.filter((item) => {
      // 1. Shift filter (Multi-select)
      if (selectedShifts.length > 0) {
        const itemShift = item.commonKey.shift || "";
        if (!selectedShifts.includes(itemShift)) return false;
      }

      // 2. Vehicle filter (Multi-select)
      if (selectedVehicles.length > 0) {
        const itemVehicle = item.commonKey.vehicleNo || "";
        if (!selectedVehicles.includes(itemVehicle)) return false;
      }

      // 3. Search keyword filter
      const v = (item.commonKey.vehicleNo || "").toLowerCase();
      const badge = (
        item.transportRecord?.operatorBadgeNo ||
        item.miningRecord?.operatorBadgeNo ||
        ""
      ).toLowerCase();
      const kw = searchKeyword.toLowerCase().trim();

      if (kw && !v.includes(kw) && !badge.includes(kw)) {
        return false;
      }
      return true;
    });
  }, [rawItems, selectedShifts, selectedVehicles, searchKeyword]);

  // ponytail: display items after applying KPI card filter
  const displayItems = useMemo(() => {
    if (cardFilter === "transport") {
      return baseFilteredItems.filter((i) => Boolean(i.transportRecord));
    }
    if (cardFilter === "mining") {
      return baseFilteredItems.filter((i) => Boolean(i.miningRecord));
    }
    if (cardFilter === "matched") {
      return baseFilteredItems.filter(isMatchedItem);
    }
    if (cardFilter === "mismatch") {
      return baseFilteredItems.filter((i) => !isMatchedItem(i));
    }
    return baseFilteredItems;
  }, [baseFilteredItems, cardFilter]);

  // KPI Calculations (based on baseFilteredItems)
  const totalTransportTrips = useMemo(() => {
    return baseFilteredItems.reduce(
      (sum, item) => sum + (item.transportRecord?.tripCount || 0),
      0,
    );
  }, [baseFilteredItems]);

  const totalMiningTrips = useMemo(() => {
    return baseFilteredItems.reduce(
      (sum, item) => sum + (item.miningRecord?.tripCount || 0),
      0,
    );
  }, [baseFilteredItems]);

  const matchedCount = useMemo(() => {
    return baseFilteredItems.filter(isMatchedItem).length;
  }, [baseFilteredItems]);

  const mismatchCount = useMemo(() => {
    return baseFilteredItems.length - matchedCount;
  }, [baseFilteredItems, matchedCount]);

  const totalRecords = baseFilteredItems.length || 1;
  const matchedPct = ((matchedCount / totalRecords) * 100).toFixed(2);
  const mismatchPct = ((mismatchCount / totalRecords) * 100).toFixed(2);

  const handleCardClick = (type: CardFilterType) => {
    setCardFilter((prev) => (prev === type ? "all" : type));
  };

  const handleResetFilters = () => {
    setStartDate("2026-08-01");
    setEndDate("2026-08-31");
    setSelectedShifts([]);
    setSelectedVehicles([]);
    setSearchKeyword("");
    setCardFilter("all");
    toast.info("Đã làm mới các bộ lọc!");
  };

  const [tableChoices, setTableChoices] = useState<Record<string, "VT" | "KT" | "OTHER">>({});
  const [tableCustomFields, setTableCustomFields] = useState<
    Record<string, { cargo: string; trips: number; loadStatus: string }>
  >({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  const handleChoicesChange = (
    choices: Record<string, "VT" | "KT" | "OTHER">,
    customFields: Record<string, { cargo: string; trips: number; loadStatus: string }>
  ) => {
    setTableChoices(choices);
    setTableCustomFields(customFields);
  };

  const handleBatchSave = async () => {
    const selectedItemIds = Object.keys(tableChoices);
    if (selectedItemIds.length === 0) {
      toast.warning("Vui lòng chọn phương án chốt cho ít nhất một bản ghi trước khi bấm Lưu!");
      return;
    }

    setIsSavingBatch(true);
    toast.info(`Đang lưu ${selectedItemIds.length} bản ghi quyết định...`);

    const decisionsPayload: ReconciliationDecisionRequest[] = selectedItemIds
      .map((itemId): ReconciliationDecisionRequest | null => {
        const choice = tableChoices[itemId];
        const custom = tableCustomFields[itemId] || { cargo: "Than", trips: 0, loadStatus: "Đủ tải" };
        const item = rawItems.find((i) => i.id === itemId) || displayItems.find((i) => i.id === itemId);
        if (!item) return null;

        const backendRow = (item as any).backendRow;
        const transportReportTripId = backendRow?.transportReportTripId;
        const excavationReportTripId = backendRow?.excavationReportTripId;

        const finalOption: "TRANSPORT" | "EXCAVATION" | "OTHER" =
          choice === "VT" ? "TRANSPORT" : choice === "KT" ? "EXCAVATION" : "OTHER";

        let customCargoTypeId: number | undefined = undefined;
        let customTripCount: number | undefined = undefined;
        let customLoadLevelType: "FULL_LOAD" | "RODA_2_3" | "OTHER" | undefined = undefined;
        let customLoadLevelCustomValue: string | undefined = undefined;

        if (choice === "OTHER") {
          customCargoTypeId = custom.cargo === "Đá" ? 2 : custom.cargo === "Đất" ? 3 : 1;
          customTripCount = custom.trips;
          customLoadLevelType = custom.loadStatus === "Roda (2/3)" ? "RODA_2_3" : custom.loadStatus.includes("Khác") ? "OTHER" : "FULL_LOAD";
          if (customLoadLevelType === "OTHER") {
            customLoadLevelCustomValue = custom.loadStatus.replace(/^Khác\s*\(?|\)?$/g, '') || "1/2";
          }
        }

        return {
          transportReportTripId,
          excavationReportTripId,
          finalOption,
          customCargoTypeId,
          customTripCount,
          customLoadLevelType,
          customLoadLevelCustomValue,
        };
      })
      .filter((d): d is ReconciliationDecisionRequest => d !== null);

    if (decisionsPayload.length === 0) {
      setIsSavingBatch(false);
      toast.error("Không có bản ghi hợp lệ để lưu!");
      return;
    }

    try {
      await reconciliationService.saveDecisionsBulk({ decisions: decisionsPayload });
      toast.success(`Đã lưu thành công ${decisionsPayload.length} bản ghi quyết định!`);

      // Refetch updated reconciliation data from server
      const res = await refetchApi();
      if (res.data?.content) {
        const mapped = res.data.content.map((row, idx) =>
          mapRowResponseToReconciliationItem(row, idx)
        );
        setRawItems(mapped);
      }

      setTableChoices({});
      setTableCustomFields({});
    } catch (err) {
      console.error("Error saving bulk decisions:", err);
      toast.error("Lỗi khi lưu quyết định đối chiếu!");
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleExportExcel = () => {
    excelService.exportToExcel(
      displayItems,
      "DoiChieu_BaoChuyen",
      "ĐỐI CHIẾU",
    );
    toast.success("Đã xuất báo cáo đối chiếu ra file Excel!");
  };

  const handleDeleteItem = (id: string) => {
    setRawItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="p-6 space-y-5 bg-slate-50/50 dark:bg-gray-950 min-h-screen">
      {/* ══ 1. TOP HEADER BAR ═════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 ">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1e293b] dark:text-gray-100 tracking-tight">
              ĐỐI CHIẾU & TỔNG HỢP DỮ LIỆU BÁO CHUYẾN
            </h1>
          </div>
        </div>
      </div>

      {/* ══ 2. TOP FILTER BAR ═════════════════════════════════════════════ */}
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
              items={availableShifts}
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
              items={availableVehicles}
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

          {/* Nút Đối chiếu cạnh Số xe */}
          <div className="flex flex-col gap-1 justify-end">
            <Button
              onClick={async () => {
                const res = await refetchApi();
                if (res.data?.content) {
                  const mapped = res.data.content.map((row, idx) =>
                    mapRowResponseToReconciliationItem(row, idx),
                  );
                  setRawItems(mapped);
                }
                toast.success("Đã kết nối và đối chiếu lại dữ liệu từ API!");
              }}
              disabled={isApiLoading}
              className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-xs shrink-0"
            >
              <RotateCw className={`w-4 h-4 ${isApiLoading ? "animate-spin" : ""}`} />
              {isApiLoading ? "Đang tải..." : "Đối chiếu"}
            </Button>
          </div>

          {/* Right Side: Search Box & Action Buttons */}
          <div className="ml-auto flex items-end gap-3">
            <div className="flex flex-col gap-1 w-64">
              <span className="font-medium text-transparent select-none">Tìm kiếm</span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm số xe, số thẻ lương..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="h-9 text-xs pl-8 pr-3 w-full"
                />
              </div>
            </div>

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

      {/* ══ 3. KPI SUMMARY CARDS (4 METRIC CARDS) ═════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số chuyến (Vận tải) */}
        <div
          onClick={() => handleCardClick("transport")}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 select-none ${
            cardFilter === "transport"
              ? "bg-emerald-50/90 dark:bg-emerald-950/70 border-emerald-500 ring-2 ring-emerald-500/40 shadow-md scale-[1.01]"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs hover:border-emerald-300 hover:shadow-md"
          }`}
          title="Click để lọc bản ghi có dữ liệu Vận tải"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              TỔNG SỐ CHUYẾN (VẬN TẢI)
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">
                {totalTransportTrips}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                chuyến
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Tổng số chuyến (Khai thác) */}
        <div
          onClick={() => handleCardClick("mining")}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 select-none ${
            cardFilter === "mining"
              ? "bg-blue-50/90 dark:bg-blue-950/70 border-blue-500 ring-2 ring-blue-500/40 shadow-md scale-[1.01]"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs hover:border-blue-300 hover:shadow-md"
          }`}
          title="Click để lọc bản ghi có dữ liệu Khai thác"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              TỔNG SỐ CHUYẾN (KHAI THÁC)
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-extrabold text-blue-900 dark:text-blue-200">
                {totalMiningTrips}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                chuyến
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Khớp */}
        <div
          onClick={() => handleCardClick("matched")}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 select-none ${
            cardFilter === "matched"
              ? "bg-blue-50/90 dark:bg-blue-950/70 border-blue-600 ring-2 ring-blue-600/40 shadow-md scale-[1.01]"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs hover:border-blue-400 hover:shadow-md"
          }`}
          title="Click để lọc danh sách bản ghi khớp"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              Khớp
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-blue-700 dark:text-blue-300">
                {matchedCount}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                chuyến ({matchedPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Sai lệch */}
        <div
          onClick={() => handleCardClick("mismatch")}
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 select-none ${
            cardFilter === "mismatch"
              ? "bg-orange-50/90 dark:bg-orange-950/70 border-orange-500 ring-2 ring-orange-500/40 shadow-md scale-[1.01]"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs hover:border-orange-400 hover:shadow-md"
          }`}
          title="Click để lọc danh sách bản ghi sai lệch"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-500 dark:text-orange-400" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-orange-900 dark:text-orange-300">
              SAI LỆCH
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-orange-600 dark:text-orange-400">
                {mismatchCount}
              </span>
              <span className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                chuyến ({mismatchPct}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ 4. RECONCILIATION TABLE ═══════════════════════════════════════ */}
      <div className="space-y-3">
        {/* Table Top Bar: Header & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Bảng danh sách kết quả đối chiếu
          </span>

          <div className="flex items-center gap-2.5 ml-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={isSavingBatch}
              onClick={handleBatchSave}
              className="h-9 px-6 text-xs font-semibold border-blue-600 text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 shadow-2xs"
            >
              {isSavingBatch ? "Đang lưu..." : "Lưu"}
            </Button>

            <Button
              onClick={handleExportExcel}
              className="h-9 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-xs"
            >
              <Download className="w-4 h-4" />
              Tải xuống (Excel)
            </Button>
          </div>
        </div>

        <ReconciliationComparisonTables
          items={displayItems}
          onDeleteItem={handleDeleteItem}
          onChoicesChange={handleChoicesChange}
        />
      </div>
    </div>
  );
};
