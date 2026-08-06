import React, { useEffect, useState, useMemo, useRef } from "react";
import type { TransportRecord } from "@/modules/dataentry/types/thong-ke";
import {
  getTransportRecords,
  saveTransportRecords,
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
  Pencil,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export const TransportEntryPage: React.FC = () => {
  const role = "ROLE_TRANSPORT";
  const [records, setRecords] = useState<TransportRecord[]>([]);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Main Top Filters ─────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-31");
  const [filterShift, setFilterShift] = useState("ALL");
  const [filterVehicle, setFilterVehicle] = useState("ALL");
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

  // ── Pagination states ────────────────────────────────────────────────────
  const [tripPageSize, setTripPageSize] = useState(20);
  const [tripPageIndex, setTripPageIndex] = useState(1);
  const [fuelPageSize, setFuelPageSize] = useState(20);
  const [fuelPageIndex, setFuelPageIndex] = useState(1);

  const loadData = () => {
    const list = getTransportRecords();
    setRecords(list);
  };

  useEffect(() => {
    loadData();
  }, []);

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

      // Shift filter
      if (filterShift !== "ALL") {
        const s = (r.shift || "").toLowerCase();
        const f = filterShift.toLowerCase();
        if (!s.includes(f) && s !== f) return false;
      }

      // Vehicle filter
      if (filterVehicle !== "ALL") {
        if (r.vehicleNo !== filterVehicle) return false;
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
    filterShift,
    filterVehicle,
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
  const uniqueVehicles = useMemo(() => {
    const set = new Set(records.map((r) => r.vehicleNo).filter(Boolean));
    return Array.from(set);
  }, [records]);

  const handleResetFilters = () => {
    setStartDate("2026-08-01");
    setEndDate("2026-08-31");
    setFilterShift("ALL");
    setFilterVehicle("ALL");
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
  const paginatedTrips = useMemo(() => {
    const start = (tripPageIndex - 1) * tripPageSize;
    return tripRows.slice(start, start + tripPageSize);
  }, [tripRows, tripPageIndex, tripPageSize]);

  const paginatedFuel = useMemo(() => {
    const start = (fuelPageIndex - 1) * fuelPageSize;
    return fuelRows.slice(start, start + fuelPageSize);
  }, [fuelRows, fuelPageIndex, fuelPageSize]);

  const totalTripPages = Math.ceil(tripRows.length / tripPageSize) || 1;
  const totalFuelPages = Math.ceil(fuelRows.length / fuelPageSize) || 1;

  // ── Selection Handlers ───────────────────────────────────────────────────
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
        "thongke_transport_records_v3",
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
      "DanhSach_BaoChuyen_VanTai",
      "BÁO CHUYẾN",
    );
    toast.success("Đã xuất danh sách báo chuyến Vận tải ra file Excel!");
  };

  const formatDateDisplay = (r: TransportRecord) => {
    if (!r.day || !r.month) return "05/08/2026";
    const d = String(r.day).padStart(2, "0");
    const m = String(r.month).padStart(2, "0");
    return `${d}/${m}/2026`;
  };

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-gray-950 min-h-screen">
      {/* ══ TOP HEADER BAR ═══════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 ">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              DANH SÁCH BÁO CHUYẾN PHÂN XƯỞNG VẬN TẢI
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Quản lý và theo dõi danh sách báo chuyến xe xúc và nhiên liệu
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

          {/* Edit Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400"
          >
            <Pencil className="w-3.5 h-3.5" />
            Chỉnh sửa
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

      {/* ══ TOP FILTER BAR ═══════════════════════════════════════════════ */}
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

          {/* Số xe */}
          <div className="flex flex-col gap-1 min-w-[120px]">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Số xe
            </span>
            <Select value={filterVehicle} onValueChange={setFilterVehicle}>
              <SelectTrigger className="h-9 text-xs w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tất cả</SelectItem>
                {uniqueVehicles.map((v) => (
                  <SelectItem key={v} value={v!}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search Box */}
          <div className="flex-1 min-w-[220px] flex flex-col gap-1">
            <span className="font-medium text-transparent">Search</span>
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

          {/* Filter & Reset buttons */}
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
          <table className="w-full text-xs border-collapse min-w-[2400px]">
            <thead>
              {/* Header Title Row */}
              <tr className="bg-gray-50 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 text-[11px] font-semibold border-b border-gray-200 dark:border-gray-800">
                <th className="px-2 py-2 text-center w-10 border-r border-gray-200 dark:border-gray-800">
                  <Checkbox
                    checked={
                      selectedTripIds.size === paginatedTrips.length &&
                      paginatedTrips.length > 0
                    }
                    onCheckedChange={toggleSelectAllTrips}
                  />
                </th>
                <th className="px-2 py-2 text-center w-10 border-r border-gray-200 dark:border-gray-800">STT</th>
                <th className="px-2 py-2 text-center min-w-[95px] border-r border-gray-200 dark:border-gray-800">Thời gian</th>
                <th className="px-2 py-2 text-center min-w-[65px] border-r border-gray-200 dark:border-gray-800">Ca</th>
                <th className="px-2 py-2 text-center min-w-[95px] border-r border-gray-200 dark:border-gray-800">Khu vực xúc</th>
                <th className="px-2 py-2 text-center min-w-[90px] border-r border-gray-200 dark:border-gray-800">Máy xúc</th>
                <th className="px-2 py-2 text-center min-w-[95px] border-r border-gray-200 dark:border-gray-800">Nơi nhận tải</th>
                <th className="px-2 py-2 text-center min-w-[80px] border-r border-gray-200 dark:border-gray-800">Tầng nhận tải</th>
                <th className="px-2 py-2 text-center min-w-[95px] border-r border-gray-200 dark:border-gray-800">Nhóm tầng nhận tải</th>
                <th className="px-2 py-2 text-center min-w-[70px] border-r border-gray-200 dark:border-gray-800">Tầng dỡ tải</th>
                <th className="px-2 py-2 text-center min-w-[95px] border-r border-gray-200 dark:border-gray-800">Cung độ toàn tuyến (km)</th>
                <th className="px-2 py-2 text-center min-w-[95px] border-r border-gray-200 dark:border-gray-800">Nâng tải toàn tuyến (m)</th>
                <th className="px-2 py-2 text-center min-w-[95px] border-r border-gray-200 dark:border-gray-800">Cung độ dốc cục bộ (km)</th>
                <th className="px-2 py-2 text-center min-w-[75px] border-r border-gray-200 dark:border-gray-800">Dốc cục bộ (m)</th>
                <th className="px-2 py-2 text-center min-w-[95px] border-r border-gray-200 dark:border-gray-800">Nơi dỡ tải</th>
                <th className="px-2 py-2 text-center min-w-[85px] border-r border-gray-200 dark:border-gray-800">Loại hàng</th>
                <th className="px-2 py-2 text-center min-w-[110px] border-r border-gray-200 dark:border-gray-800">Nhóm hàng</th>
                <th className="px-2 py-2 text-center min-w-[75px] border-r border-gray-200 dark:border-gray-800">Số xe</th>
                <th className="px-2 py-2 text-center min-w-[75px] border-r border-gray-200 dark:border-gray-800">Số chuyến</th>
                <th className="px-2 py-2 text-center min-w-[95px] border-r border-gray-200 dark:border-gray-800">Tải trọng</th>
                <th className="px-2 py-2 text-center min-w-[55px] border-r border-gray-200 dark:border-gray-800">Ngày mưa</th>
                <th className="px-2 py-2 text-center min-w-[55px] border-r border-gray-200 dark:border-gray-800">Xe bổ túc</th>
                <th className="px-2 py-2 text-center min-w-[100px] border-r border-gray-200 dark:border-gray-800">Đơn vị QL thiết bị</th>
                <th className="px-2 py-2 text-center min-w-[100px] border-r border-gray-200 dark:border-gray-800">Chủng loại xe</th>
                <th className="px-2 py-2 text-center min-w-[85px] border-r border-gray-200 dark:border-gray-800">Số thẻ lương</th>
                <th className="px-2 py-2 text-left min-w-[120px] border-r border-gray-200 dark:border-gray-800">Họ và tên</th>
                <th className="px-2 py-2 text-center min-w-[80px] border-r border-gray-200 dark:border-gray-800">Đơn vị</th>
                <th className="px-2 py-2 text-left min-w-[120px]">Người nhập chuyến</th>
              </tr>
            </thead>

            <tbody>
              {paginatedTrips.map((row, idx) => {
                const globalIdx = (tripPageIndex - 1) * tripPageSize + idx + 1;
                const isSelected = selectedTripIds.has(row.id!);

                return (
                  <tr
                    key={row.id || `trans_trip_${idx}`}
                    className={`border-b border-gray-100 dark:border-gray-800/60 transition-colors ${
                      isSelected
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30"
                        : idx % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-slate-50/40 dark:bg-gray-900/50"
                    } hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20`}
                  >
                    {/* Checkbox */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectTrip(row.id!)}
                      />
                    </td>

                    {/* STT */}
                    <td className="px-2 py-2 text-center text-gray-500 font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {globalIdx}
                    </td>

                    {/* Thời gian */}
                    <td className="px-2 py-2 text-center font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {formatDateDisplay(row)}
                    </td>

                    {/* Ca */}
                    <td className="px-2 py-2 text-center font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {row.shift || "Ca 1"}
                    </td>

                    {/* Khu vực xúc */}
                    <td className="px-2 py-2 text-center font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {row.excavationArea || "Khe Chàm"}
                    </td>

                    {/* Máy xúc */}
                    <td className="px-2 py-2 text-center font-semibold text-emerald-700 dark:text-emerald-400 border-r border-gray-100 dark:border-gray-800/60">
                      {row.excavatorEquipment || "KC-MX01"}
                    </td>

                    {/* Nơi nhận tải */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.pickupLocation || "Bãi sàng"}
                    </td>

                    {/* Tầng nhận tải */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.pickupBench || "-40"}
                    </td>

                    {/* Nhóm tầng nhận tải */}
                    <td className="px-2 py-2 text-center text-gray-500 border-r border-gray-100 dark:border-gray-800/60">
                      {row.pickupBenchGroup || "Nhóm -40"}
                    </td>

                    {/* Tầng dỡ tải */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.unloadBench || "8"}
                    </td>

                    {/* Cung độ toàn tuyến (km) */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.fullRouteDistance ?? 5.5}
                    </td>

                    {/* Nâng tải toàn tuyến (m) */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.fullRouteElevate ?? 100}
                    </td>

                    {/* Cung độ dốc cục bộ (km) */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.localSlopeDist ?? 1.2}
                    </td>

                    {/* Dốc cục bộ (m) */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.localSlopeDegree ?? 8}
                    </td>

                    {/* Nơi dỡ tải */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.unloadLocationName || "Đá"}
                    </td>

                    {/* Loại hàng */}
                    <td className="px-2 py-2 text-center font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {row.cargoType || "Than"}
                    </td>

                    {/* Nhóm hàng */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.cargoGroup || "Nhóm Than N"}
                    </td>

                    {/* Số xe */}
                    <td className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-800/60">
                      {row.vehicleNo || "505"}
                    </td>

                    {/* Số chuyến */}
                    <td className="px-2 py-2 text-center font-bold text-emerald-700 dark:text-emerald-300 border-r border-gray-100 dark:border-gray-800/60">
                      {row.tripCount ?? 8}
                    </td>

                    {/* Tải trọng */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                        {row.loadStatus || "Đủ tải"}
                      </span>
                    </td>

                    {/* Ngày mưa */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.isRainyDay ? (
                        <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center mx-auto">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-700 mx-auto" />
                      )}
                    </td>

                    {/* Xe bổ túc */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.isTraineeVehicle ? (
                        <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center mx-auto">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-700 mx-auto" />
                      )}
                    </td>

                    {/* Đơn vị QL thiết bị */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.equipmentUnit || "VT7"}
                    </td>

                    {/* Chủng loại xe */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.vehicleType || "HD 465-7R"}
                    </td>

                    {/* Số thẻ lương */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorBadgeNo || "8753"}
                    </td>

                    {/* Họ và tên */}
                    <td className="px-2 py-2 text-left font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorName || "Nguyễn Xuân Bằng"}
                    </td>

                    {/* Đơn vị */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorUnit || "VT7"}
                    </td>

                    {/* Người nhập chuyến */}
                    <td className="px-2 py-2 text-left font-medium">
                      {row.createdBy || "Trần Hồng Sơn"}
                    </td>
                  </tr>
                );
              })}

              {paginatedTrips.length === 0 && (
                <tr>
                  <td
                    colSpan={28}
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
          <div>
            Hiển thị{" "}
            <strong>
              {tripRows.length > 0 ? (tripPageIndex - 1) * tripPageSize + 1 : 0}{" "}
              - {Math.min(tripPageIndex * tripPageSize, tripRows.length)}
            </strong>{" "}
            trong tổng số{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {tripRows.length}
            </strong>{" "}
            bản ghi
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Số bản ghi trên trang</span>
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
            </div>

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
          <table className="w-full text-xs border-collapse min-w-[1500px]">
            <thead>
              {/* Header Title Row */}
              <tr className="bg-gray-50 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 text-[11px] font-semibold border-b border-gray-200 dark:border-gray-800">
                <th className="px-2 py-2 text-center w-10 border-r border-gray-200 dark:border-gray-800">
                  <Checkbox
                    checked={
                      selectedFuelIds.size === paginatedFuel.length &&
                      paginatedFuel.length > 0
                    }
                    onCheckedChange={toggleSelectAllFuel}
                  />
                </th>
                <th className="px-2 py-2 text-center w-10 border-r border-gray-200 dark:border-gray-800">
                  STT
                </th>
                <th className="px-2 py-2 text-center min-w-[120px] border-r border-gray-200 dark:border-gray-800">
                  Thời gian
                </th>
                <th className="px-2 py-2 text-center min-w-[65px] border-r border-gray-200 dark:border-gray-800">
                  Ca
                </th>
                <th className="px-2 py-2 text-center min-w-[75px] border-r border-gray-200 dark:border-gray-800">
                  Số xe
                </th>
                <th className="px-2 py-2 text-center min-w-[110px] border-r border-gray-200 dark:border-gray-800">
                  Nhiên liệu tồn đầu (lít)
                </th>
                <th className="px-2 py-2 text-center min-w-[110px] border-r border-gray-200 dark:border-gray-800">
                  Nhiên liệu lĩnh (lít)
                </th>
                <th className="px-2 py-2 text-center min-w-[110px] border-r border-gray-200 dark:border-gray-800">
                  Nhiên liệu tồn cuối (lít)
                </th>
                <th className="px-2 py-2 text-center min-w-[120px] border-r border-gray-200 dark:border-gray-800">
                  Nhiên liệu tiêu thụ (lít)
                </th>
                <th className="px-2 py-2 text-center min-w-[100px] border-r border-gray-200 dark:border-gray-800">
                  Đơn vị QL thiết bị
                </th>
                <th className="px-2 py-2 text-center min-w-[100px] border-r border-gray-200 dark:border-gray-800">
                  Chủng loại xe
                </th>
                <th className="px-2 py-2 text-center min-w-[85px] border-r border-gray-200 dark:border-gray-800">
                  Số thẻ lương
                </th>
                <th className="px-2 py-2 text-center min-w-[80px] border-r border-gray-200 dark:border-gray-800">
                  Đơn vị
                </th>
                <th className="px-2 py-2 text-left min-w-[120px]">
                  Người nhập chuyến
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
                    key={row.id || `trans_fuel_${idx}`}
                    className={`border-b border-gray-100 dark:border-gray-800/60 transition-colors ${
                      isSelected
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30"
                        : idx % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-slate-50/40 dark:bg-gray-900/50"
                    } hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20`}
                  >
                    {/* Checkbox */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectFuel(row.id!)}
                      />
                    </td>

                    {/* STT */}
                    <td className="px-2 py-2 text-center text-gray-500 font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {globalIdx}
                    </td>

                    {/* Thời gian */}
                    <td className="px-2 py-2 text-center font-medium border-r border-gray-100 dark:border-gray-800/60">
                      {formatDateDisplay(row)} 06:00
                    </td>

                    {/* Ca */}
                    <td className="px-2 py-2 text-center font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {row.shift || "Ca 1"}
                    </td>

                    {/* Số xe */}
                    <td className="px-2 py-2 text-center font-bold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-800/60">
                      {row.vehicleNo || "505"}
                    </td>

                    {/* Nhiên liệu tồn đầu */}
                    <td className="px-2 py-2 text-center font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {row.initialFuel
                        ? Number(row.initialFuel).toLocaleString("vi-VN")
                        : "1,188"}
                    </td>

                    {/* Nhiên liệu lĩnh */}
                    <td className="px-2 py-2 text-center font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {row.receivedFuel
                        ? Number(row.receivedFuel).toLocaleString("vi-VN")
                        : "590"}
                    </td>

                    {/* Nhiên liệu tồn cuối */}
                    <td className="px-2 py-2 text-center font-semibold border-r border-gray-100 dark:border-gray-800/60">
                      {row.finalFuel
                        ? Number(row.finalFuel).toLocaleString("vi-VN")
                        : "831"}
                    </td>

                    {/* Nhiên liệu tiêu thụ */}
                    <td className="px-2 py-2 text-center font-bold text-emerald-700 dark:text-emerald-300 border-r border-gray-100 dark:border-gray-800/60">
                      {fuelUsed
                        ? Number(fuelUsed).toLocaleString("vi-VN")
                        : "947"}
                    </td>

                    {/* Đơn vị QL thiết bị */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.equipmentUnit || "VT7"}
                    </td>

                    {/* Chủng loại xe */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.vehicleType || "HD 465-7R"}
                    </td>

                    {/* Số thẻ lương */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorBadgeNo || "8753"}
                    </td>

                    {/* Đơn vị */}
                    <td className="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800/60">
                      {row.operatorUnit || "VT7"}
                    </td>

                    {/* Người nhập chuyến */}
                    <td className="px-2 py-2 text-left font-medium">
                      {row.createdBy || "Trần Hồng Sơn"}
                    </td>
                  </tr>
                );
              })}

              {paginatedFuel.length === 0 && (
                <tr>
                  <td
                    colSpan={14}
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
          <div>
            Hiển thị{" "}
            <strong>
              {fuelRows.length > 0 ? (fuelPageIndex - 1) * fuelPageSize + 1 : 0}{" "}
              - {Math.min(fuelPageIndex * fuelPageSize, fuelRows.length)}
            </strong>{" "}
            trong tổng số{" "}
            <strong className="text-gray-900 dark:text-gray-100">
              {fuelRows.length}
            </strong>{" "}
            bản ghi
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Số bản ghi trên trang</span>
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
            </div>

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
