import React, { useEffect, useState, useMemo, useRef } from "react";
import type { MiningRecord } from "@/modules/dataentry/types/thong-ke";
import {
  getMiningRecords,
  saveMiningRecords,
} from "@/modules/dataentry/services/thongKeStorage";
import { validateImportRows } from "@/modules/dataentry/utils/importValidator";
import { excelService } from "@/modules/report/utils/excel-exporter";
import { BatchEntryModal } from "@/modules/dataentry/components/BatchEntryModal.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Filter,
  FileSpreadsheet,
  Truck,
  Fuel,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export const MiningEntryPage: React.FC = () => {
  const role = "ROLE_MINING";
  const [records, setRecords] = useState<MiningRecord[]>([]);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Filters state ────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-31");
  const [filterShift, setFilterShift] = useState("ALL");
  const [filterPickup, setFilterPickup] = useState("ALL");
  const [filterExcavator, setFilterExcavator] = useState("ALL");
  const [filterTotalScoops, setFilterTotalScoops] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  // ── Row selection states ──────────────────────────────────────────────────
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedFuelIds, setSelectedFuelIds] = useState<Set<string>>(
    new Set(),
  );

  // ── Pagination states ────────────────────────────────────────────────────
  const [tripPageSize, setTripPageSize] = useState(20);
  const [tripPageIndex, setTripPageIndex] = useState(1);
  const [fuelPageSize, setFuelPageSize] = useState(20);
  const [fuelPageIndex, setFuelPageIndex] = useState(1);

  const loadData = () => {
    const list = getMiningRecords();
    setRecords(list);
  };

  useEffect(() => {
    loadData();
  }, []);

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

      // Shift filter
      if (filterShift !== "ALL") {
        const s = (r.shift || "").toLowerCase();
        const f = filterShift.toLowerCase();
        if (!s.includes(f) && s !== f) return false;
      }

      // Pickup location filter
      if (filterPickup !== "ALL") {
        if (r.pickupLocation !== filterPickup) return false;
      }

      // Excavator filter
      if (filterExcavator !== "ALL") {
        if (r.mineCode !== filterExcavator) return false;
      }

      // Total scoops filter
      if (filterTotalScoops !== "ALL") {
        if (String(r.excavationBench || "") !== filterTotalScoops) return false;
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
    filterShift,
    filterPickup,
    filterExcavator,
    filterTotalScoops,
    searchKeyword,
  ]);

  // Unique lists for filter dropdowns
  const uniquePickups = useMemo(() => {
    const set = new Set(records.map((r) => r.pickupLocation).filter(Boolean));
    return Array.from(set);
  }, [records]);

  const uniqueExcavators = useMemo(() => {
    const set = new Set(records.map((r) => r.mineCode).filter(Boolean));
    return Array.from(set);
  }, [records]);

  const uniqueScoops = useMemo(() => {
    const set = new Set(records.map((r) => r.excavationBench).filter(Boolean));
    return Array.from(set);
  }, [records]);

  // Reset filters
  const handleResetFilters = () => {
    setStartDate("2026-08-01");
    setEndDate("2026-08-31");
    setFilterShift("ALL");
    setFilterPickup("ALL");
    setFilterExcavator("ALL");
    setFilterTotalScoops("ALL");
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

  // Paginated Trip Rows
  const paginatedTrips = useMemo(() => {
    const start = (tripPageIndex - 1) * tripPageSize;
    return tripRows.slice(start, start + tripPageSize);
  }, [tripRows, tripPageIndex, tripPageSize]);

  // Paginated Fuel Rows
  const paginatedFuel = useMemo(() => {
    const start = (fuelPageIndex - 1) * fuelPageSize;
    return fuelRows.slice(start, start + fuelPageSize);
  }, [fuelRows, fuelPageIndex, fuelPageSize]);

  const totalTripPages = Math.ceil(tripRows.length / tripPageSize) || 1;
  const totalFuelPages = Math.ceil(fuelRows.length / fuelPageSize) || 1;

  // ── Row Selection Handlers ────────────────────────────────────────────────
  const toggleSelectAllTrips = () => {
    if (
      selectedTripIds.size === paginatedTrips.length &&
      paginatedTrips.length > 0
    ) {
      setSelectedTripIds(new Set());
    } else {
      setSelectedTripIds(
        new Set(paginatedTrips.map((r) => r.id!).filter(Boolean)),
      );
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

  const toggleSelectAllFuel = () => {
    if (
      selectedFuelIds.size === paginatedFuel.length &&
      paginatedFuel.length > 0
    ) {
      setSelectedFuelIds(new Set());
    } else {
      setSelectedFuelIds(
        new Set(paginatedFuel.map((r) => r.id!).filter(Boolean)),
      );
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

  const handleDeleteSelected = async () => {
    const selectedCount = selectedTripIds.size + selectedFuelIds.size;
    if (selectedCount === 0) {
      toast.error("Vui lòng chọn ít nhất 1 dòng để xóa!");
      return;
    }

    const isConfirmed = await confirm({
      title: "Xác nhận xóa bản ghi",
      description: `Bạn có chắc chắn muốn xóa ${selectedCount} bản ghi đã chọn? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa bản ghi",
      cancelText: "Hủy bỏ",
      variant: "destructive",
    });

    if (isConfirmed) {
      const idsToDelete = new Set([...selectedTripIds, ...selectedFuelIds]);
      const updated = records.filter((r) => !idsToDelete.has(r.id!));
      localStorage.setItem(
        "thongke_mining_records_v3",
        JSON.stringify(updated),
      );
      setRecords(updated);
      setSelectedTripIds(new Set());
      setSelectedFuelIds(new Set());
      toast.success(`Đã xóa thành công ${selectedCount} bản ghi!`);
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
      loadData();
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

  // Format date display
  const formatDateDisplay = (r: MiningRecord) => {
    if (!r.day || !r.month) return "05/08/2026";
    const d = String(r.day).padStart(2, "0");
    const m = String(r.month).padStart(2, "0");
    return `${d}/${m}/2026`;
  };

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-gray-950 min-h-screen">
      {/* ══ TOP HEADER BAR ═══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 dark:border-gray-800">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              DANH SÁCH BÁO CHUYẾN CÔNG TRƯỜNG KHAI THÁC
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Quản lý và theo dõi danh sách chuyến xe xúc và nhiên liệu
            </p>
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
            className="h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Thêm chuyến (F3)
          </Button>

          {/* Delete Selected Rows */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteSelected}
            className="h-9 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-950 dark:hover:bg-red-950/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa chuyến
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
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-xs w-36"
            />
          </div>

          <span className="pb-2 text-gray-400 font-bold">-</span>

          {/* Thời gian kết thúc */}
          <div className="flex flex-col gap-1">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Thời gian kết thúc
            </span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-xs w-36"
            />
          </div>

          {/* Ca */}
          <div className="flex flex-col gap-1 min-w-[100px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Ca
            </span>
            <Select value={filterShift} onValueChange={setFilterShift}>
              <SelectTrigger className="h-9 text-xs w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                <SelectItem value="Ca 1">Ca 1</SelectItem>
                <SelectItem value="Ca 2">Ca 2</SelectItem>
                <SelectItem value="Ca 3">Ca 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nơi chất tải */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Nơi chất tải
            </span>
            <Select value={filterPickup} onValueChange={setFilterPickup}>
              <SelectTrigger className="h-9 text-xs w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                {uniquePickups.map((p) => (
                  <SelectItem key={p} value={p!}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Máy xúc */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Máy xúc
            </span>
            <Select value={filterExcavator} onValueChange={setFilterExcavator}>
              <SelectTrigger className="h-9 text-xs w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                {uniqueExcavators.map((m) => (
                  <SelectItem key={m} value={m!}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tổng xúc */}
          <div className="flex flex-col gap-1 min-w-[110px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Tổng xúc
            </span>
            <Select
              value={filterTotalScoops}
              onValueChange={setFilterTotalScoops}
            >
              <SelectTrigger className="h-9 text-xs w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                {uniqueScoops.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Box */}
          <div className="flex-1 min-w-[200px] flex flex-col gap-1">
            <span className="font-medium text-transparent">Search</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Tìm kiếm số xe, máy xúc, người vận hành..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-9 text-xs pl-8 pr-3"
              />
            </div>
          </div>

          {/* Filter button & Reset button */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1 border-gray-300 dark:border-gray-700"
            >
              <Filter className="w-3.5 h-3.5" />
              Bộ lọc
            </Button>

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
          <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>1. BẢNG BÁO CHUYẾN</span>
        </div>

        {/* Table 1 Content */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 text-[11px] font-semibold border-b border-gray-200 dark:border-gray-800">
                <th className="px-3 py-2.5 text-center w-10 border-r border-gray-200 dark:border-gray-800">
                  <Checkbox
                    checked={
                      selectedTripIds.size === paginatedTrips.length &&
                      paginatedTrips.length > 0
                    }
                    onCheckedChange={toggleSelectAllTrips}
                  />
                </th>
                <th className="px-3 py-2.5 text-center w-12 border-r border-gray-200 dark:border-gray-800">
                  STT
                </th>
                <th className="px-3 py-2.5 text-center min-w-[100px] border-r border-gray-200 dark:border-gray-800">
                  Thời gian
                </th>
                <th className="px-3 py-2.5 text-center min-w-[70px] border-r border-gray-200 dark:border-gray-800">
                  Ca
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px] border-r border-gray-200 dark:border-gray-800">
                  Nơi chất tải
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px] border-r border-gray-200 dark:border-gray-800">
                  Máy xúc
                </th>
                <th className="px-3 py-2.5 text-center min-w-[80px] border-r border-gray-200 dark:border-gray-800">
                  Tổng xúc
                </th>
                <th className="px-3 py-2.5 text-center min-w-[80px] border-r border-gray-200 dark:border-gray-800">
                  Số xe
                </th>
                <th className="px-3 py-2.5 text-center min-w-[80px] border-r border-gray-200 dark:border-gray-800">
                  Số chuyến
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px] border-r border-gray-200 dark:border-gray-800">
                  Loại hàng
                </th>
                <th className="px-3 py-2.5 text-center min-w-[100px] border-r border-gray-200 dark:border-gray-800">
                  Tải trọng
                </th>
                <th className="px-3 py-2.5 text-center min-w-[110px] border-r border-gray-200 dark:border-gray-800">
                  Đơn vị quản lý thiết bị
                </th>
                <th className="px-3 py-2.5 text-center min-w-[110px] border-r border-gray-200 dark:border-gray-800">
                  Chủng loại xe
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px] border-r border-gray-200 dark:border-gray-800">
                  Số thẻ lương
                </th>
                <th className="px-3 py-2.5 text-left min-w-[130px] border-r border-gray-200 dark:border-gray-800">
                  Họ và tên
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px]">Đơn vị</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrips.map((row, idx) => {
                const globalIdx = (tripPageIndex - 1) * tripPageSize + idx + 1;
                const isSelected = selectedTripIds.has(row.id!);

                return (
                  <tr
                    key={row.id || `trip_${idx}`}
                    className={`border-b border-gray-100 dark:border-gray-800/60 transition-colors ${
                      isSelected
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30"
                        : idx % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-slate-50/40 dark:bg-gray-900/50"
                    } hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectTrip(row.id!)}
                      />
                    </td>

                    {/* STT */}
                    <td className="px-3 py-2.5 text-center text-gray-500 font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {globalIdx}
                    </td>

                    {/* Thời gian */}
                    <td className="px-3 py-2.5 text-center font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {formatDateDisplay(row)}
                    </td>

                    {/* Ca */}
                    <td className="px-3 py-2.5 text-center font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {row.shift || "Ca 1"}
                    </td>

                    {/* Nơi chất tải */}
                    <td className="px-3 py-2.5 text-center font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {row.pickupLocation || "KX1"}
                    </td>

                    {/* Máy xúc */}
                    <td className="px-3 py-2.5 text-center font-semibold text-emerald-700 dark:text-emerald-400 border-r border-gray-100 dark:border-gray-800/60">
                      {row.mineCode || "P15"}
                    </td>

                    {/* Tổng xúc */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.excavationBench || "300"}
                    </td>

                    {/* Số xe */}
                    <td className="px-3 py-2.5 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-800/60">
                      {row.transportVehicleNo || "473"}
                    </td>

                    {/* Số chuyến */}
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-700 dark:text-emerald-300 border-r border-gray-100 dark:border-gray-800/60">
                      {row.tripCount ?? 6}
                    </td>

                    {/* Loại hàng */}
                    <td className="px-3 py-2.5 text-center font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {row.material || "Than"}
                    </td>

                    {/* Tải trọng */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        {row.loadStatus || "Đủ tải"}
                      </span>
                    </td>

                    {/* Đơn vị QL thiết bị */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.vehicleManagementUnit || "VT7"}
                    </td>

                    {/* Chủng loại xe */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.vehicleType || "HD785-7"}
                    </td>

                    {/* Số thẻ lương */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorBadgeNo || "8753"}
                    </td>

                    {/* Họ và tên */}
                    <td className="px-3 py-2.5 text-left font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorName || "Nguyễn Xuân Bằng"}
                    </td>

                    {/* Đơn vị */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorUnit || "VT7"}
                    </td>
                  </tr>
                );
              })}

              {paginatedTrips.length === 0 && (
                <tr>
                  <td
                    colSpan={16}
                    className="py-8 text-center text-xs text-gray-400"
                  >
                    Không có bản ghi báo chuyến nào phù hợp bộ lọc!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table 1 Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <Select
              value={String(tripPageSize)}
              onValueChange={(v) => {
                setTripPageSize(Number(v));
                setTripPageIndex(1);
              }}
            >
              <SelectTrigger className="h-7 text-xs w-16 bg-white dark:bg-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>
              trên tổng số{" "}
              <strong className="text-gray-900 dark:text-gray-100">
                {tripRows.length}
              </strong>{" "}
              chuyến
            </span>
          </div>

          {/* Page controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={tripPageIndex === 1}
              onClick={() => setTripPageIndex(1)}
              className="h-7 w-7 p-0"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={tripPageIndex === 1}
              onClick={() => setTripPageIndex((p) => Math.max(1, p - 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            {Array.from(
              { length: Math.min(5, totalTripPages) },
              (_, i) => i + 1,
            ).map((page) => (
              <Button
                key={page}
                variant={page === tripPageIndex ? "default" : "outline"}
                size="sm"
                onClick={() => setTripPageIndex(page)}
                className={`h-7 w-7 p-0 text-xs font-semibold ${
                  page === tripPageIndex
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
              disabled={tripPageIndex === totalTripPages}
              onClick={() =>
                setTripPageIndex((p) => Math.min(totalTripPages, p + 1))
              }
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={tripPageIndex === totalTripPages}
              onClick={() => setTripPageIndex(totalTripPages)}
              className="h-7 w-7 p-0"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ══ BẢNG 2: BẢNG BÁO NHIÊN LIỆU ═════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3 p-4">
        {/* Table Title */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          <Fuel className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>2. BẢNG BÁO NHIÊN LIỆU</span>
        </div>

        {/* Table 2 Content */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 text-[11px] font-semibold border-b border-gray-200 dark:border-gray-800">
                <th className="px-3 py-2.5 text-center w-10 border-r border-gray-200 dark:border-gray-800">
                  <Checkbox
                    checked={
                      selectedFuelIds.size === paginatedFuel.length &&
                      paginatedFuel.length > 0
                    }
                    onCheckedChange={toggleSelectAllFuel}
                  />
                </th>
                <th className="px-3 py-2.5 text-center w-12 border-r border-gray-200 dark:border-gray-800">
                  STT
                </th>
                <th className="px-3 py-2.5 text-center min-w-[100px] border-r border-gray-200 dark:border-gray-800">
                  Thời gian
                </th>
                <th className="px-3 py-2.5 text-center min-w-[70px] border-r border-gray-200 dark:border-gray-800">
                  Ca
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px] border-r border-gray-200 dark:border-gray-800">
                  Nơi chất tải
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px] border-r border-gray-200 dark:border-gray-800">
                  Máy xúc
                </th>
                <th className="px-3 py-2.5 text-center min-w-[80px] border-r border-gray-200 dark:border-gray-800">
                  Tổng xúc
                </th>
                <th className="px-3 py-2.5 text-center min-w-[110px] border-r border-gray-200 dark:border-gray-800">
                  Đơn vị quản lý thiết bị
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px] border-r border-gray-200 dark:border-gray-800">
                  Số thẻ lương
                </th>
                <th className="px-3 py-2.5 text-left min-w-[130px] border-r border-gray-200 dark:border-gray-800">
                  Họ và tên
                </th>
                <th className="px-3 py-2.5 text-center min-w-[90px] border-r border-gray-200 dark:border-gray-800">
                  Đơn vị
                </th>
                <th className="px-3 py-2.5 text-center min-w-[110px] border-r border-gray-200 dark:border-gray-800">
                  Nhiên liệu tồn đầu (lít)
                </th>
                <th className="px-3 py-2.5 text-center min-w-[110px] border-r border-gray-200 dark:border-gray-800">
                  Nhiên liệu lĩnh (lít)
                </th>
                <th className="px-3 py-2.5 text-center min-w-[110px] border-r border-gray-200 dark:border-gray-800">
                  Nhiên liệu tồn cuối (lít)
                </th>
                <th className="px-3 py-2.5 text-center min-w-[120px]">
                  Nhiên liệu sử dụng (lít)
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedFuel.map((row, idx) => {
                const globalIdx = (fuelPageIndex - 1) * fuelPageSize + idx + 1;
                const isSelected = selectedFuelIds.has(row.id!);
                const fuelUsed =
                  row.fuelConsumption ??
                  Math.max(
                    0,
                    (Number(row.initialFuel) || 0) +
                      (Number(row.receivedFuel) || 0) -
                      (Number(row.finalFuel) || 0),
                  );

                return (
                  <tr
                    key={row.id || `fuel_${idx}`}
                    className={`border-b border-gray-100 dark:border-gray-800/60 transition-colors ${
                      isSelected
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30"
                        : idx % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-slate-50/40 dark:bg-gray-900/50"
                    } hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectFuel(row.id!)}
                      />
                    </td>

                    {/* STT */}
                    <td className="px-3 py-2.5 text-center text-gray-500 font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {globalIdx}
                    </td>

                    {/* Thời gian */}
                    <td className="px-3 py-2.5 text-center font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {formatDateDisplay(row)}
                    </td>

                    {/* Ca */}
                    <td className="px-3 py-2.5 text-center font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {row.shift || "Ca 1"}
                    </td>

                    {/* Nơi chất tải */}
                    <td className="px-3 py-2.5 text-center font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {row.pickupLocation || "KX1"}
                    </td>

                    {/* Máy xúc */}
                    <td className="px-3 py-2.5 text-center font-semibold text-emerald-700 dark:text-emerald-400 border-r border-gray-100 dark:border-gray-800/60">
                      {row.mineCode || "P15"}
                    </td>

                    {/* Tổng xúc */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.excavationBench || "300"}
                    </td>

                    {/* Đơn vị QL thiết bị */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.vehicleManagementUnit || "VT7"}
                    </td>

                    {/* Số thẻ lương */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorBadgeNo || "8753"}
                    </td>

                    {/* Họ và tên */}
                    <td className="px-3 py-2.5 text-left font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorName || "Nguyễn Xuân Bằng"}
                    </td>

                    {/* Đơn vị */}
                    <td className="px-3 py-2.5 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorUnit || "VT7"}
                    </td>

                    {/* Nhiên liệu tồn đầu */}
                    <td className="px-3 py-2.5 text-center font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {row.initialFuel
                        ? Number(row.initialFuel).toLocaleString("vi-VN")
                        : "1,188"}
                    </td>

                    {/* Nhiên liệu lĩnh */}
                    <td className="px-3 py-2.5 text-center font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {row.receivedFuel
                        ? Number(row.receivedFuel).toLocaleString("vi-VN")
                        : "590"}
                    </td>

                    {/* Nhiên liệu tồn cuối */}
                    <td className="px-3 py-2.5 text-center font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {row.finalFuel
                        ? Number(row.finalFuel).toLocaleString("vi-VN")
                        : "831"}
                    </td>

                    {/* Nhiên liệu sử dụng */}
                    <td className="px-3 py-2.5 text-center font-bold text-emerald-700 dark:text-emerald-300">
                      {fuelUsed
                        ? Number(fuelUsed).toLocaleString("vi-VN")
                        : "947"}
                    </td>
                  </tr>
                );
              })}

              {paginatedFuel.length === 0 && (
                <tr>
                  <td
                    colSpan={15}
                    className="py-8 text-center text-xs text-gray-400"
                  >
                    Không có bản ghi báo nhiên liệu nào phù hợp bộ lọc!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table 2 Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <Select
              value={String(fuelPageSize)}
              onValueChange={(v) => {
                setFuelPageSize(Number(v));
                setFuelPageIndex(1);
              }}
            >
              <SelectTrigger className="h-7 text-xs w-16 bg-white dark:bg-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>
              trên tổng số{" "}
              <strong className="text-gray-900 dark:text-gray-100">
                {fuelRows.length}
              </strong>{" "}
              bản ghi nhiên liệu
            </span>
          </div>

          {/* Page controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={fuelPageIndex === 1}
              onClick={() => setFuelPageIndex(1)}
              className="h-7 w-7 p-0"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={fuelPageIndex === 1}
              onClick={() => setFuelPageIndex((p) => Math.max(1, p - 1))}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            {Array.from(
              { length: Math.min(5, totalFuelPages) },
              (_, i) => i + 1,
            ).map((page) => (
              <Button
                key={page}
                variant={page === fuelPageIndex ? "default" : "outline"}
                size="sm"
                onClick={() => setFuelPageIndex(page)}
                className={`h-7 w-7 p-0 text-xs font-semibold ${
                  page === fuelPageIndex
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
              disabled={fuelPageIndex === totalFuelPages}
              onClick={() =>
                setFuelPageIndex((p) => Math.min(totalFuelPages, p + 1))
              }
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={fuelPageIndex === totalFuelPages}
              onClick={() => setFuelPageIndex(totalFuelPages)}
              className="h-7 w-7 p-0"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Entry Modal */}
      <BatchEntryModal
        role={role}
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSuccess={() => {
          loadData();
          setIsEntryModalOpen(false);
        }}
      />

      {ConfirmDialogComponent}
    </div>
  );
};
