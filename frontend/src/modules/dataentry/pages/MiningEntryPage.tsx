import React, { useEffect, useState, useMemo, useRef } from "react";
import type { MiningRecord } from "@/modules/dataentry/types/thong-ke";
import {
  getMiningRecords,
  saveMiningRecords,
} from "@/modules/dataentry/services/thongKeStorage";
import { validateImportRows } from "@/modules/dataentry/utils/importValidator";
import { excelService } from "@/modules/report/utils/excel-exporter";
import { BatchEntryModal } from "@/modules/dataentry/components/BatchEntryModal.tsx";
import { MiningTripsDataTable } from "@/modules/dataentry/components/MiningTripsDataTable";
import { MiningFuelDataTable } from "@/modules/dataentry/components/MiningFuelDataTable";
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
  Upload,
  Download,
  Plus,
  Pencil,
  Search,
  RefreshCw,
  Trash2,
  Filter,
  FileSpreadsheet,
  Truck,
  Fuel,
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

          {/* Edit Trip Button */}
          <Button
            onClick={() => {
              if (selectedTripIds.size === 0 && selectedFuelIds.size === 0) {
                toast.info("Vui lòng chọn bản ghi cần chỉnh sửa hoặc mở cửa sổ nhập liệu");
              }
              setIsEntryModalOpen(true);
            }}
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
          <div className="flex flex-col gap-1 min-w-[130px]">
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
          <div className="flex flex-col gap-1 min-w-[160px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Nơi nhận tải
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
          <div className="flex flex-col gap-1 min-w-[160px]">
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
          <div className="flex flex-col gap-1 min-w-[150px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Tầng xúc
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

          {/* Right section: Search Box + Filter / Reset Buttons */}
          <div className="ml-auto flex items-end gap-3">
            {/* Search Box */}
            <div className="w-[220px] flex flex-col gap-1">
              <span className="font-medium text-transparent select-none">
                Search
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
      </div>

      {/* ══ BẢNG 1: BẢNG BÁO CHUYẾN ══════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden space-y-3 p-4">
        {/* Table Title */}
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
          <Fuel className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
          loadData();
          setIsEntryModalOpen(false);
        }}
      />

      {ConfirmDialogComponent}
    </div>
  );
};
