import React, { useState, useEffect, useMemo } from "react";
import { getReconciliationItems } from "@/modules/dataentry/services/thongKeStorage";
import type { ReconciliationItem } from "@/modules/dataentry/types/thong-ke";
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
  FileSpreadsheet,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Download,
  RotateCw,
} from "lucide-react";
import { ReconciliationComparisonTables } from "../components/ReconciliationComparisonTables";
import { excelService } from "@/modules/report/utils/excel-exporter";
import { toast } from "sonner";

export const ReconciliationPage: React.FC = () => {
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-31");
  const [shift, setShift] = useState("ALL");
  const [vehicleNo, setVehicleNo] = useState("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [rawItems, setRawItems] = useState<ReconciliationItem[]>([]);

  const loadData = () => {
    const data = getReconciliationItems({
      month: 8,
      shift: shift === "ALL" ? undefined : shift,
      vehicleNo: vehicleNo === "ALL" ? "" : vehicleNo,
    });
    setRawItems(data);
  };

  useEffect(() => {
    loadData();
  }, [shift, vehicleNo]);

  // Unique Vehicles for Dropdown Filter
  const uniqueVehicles = useMemo(() => {
    const set = new Set<string>();
    rawItems.forEach((i) => {
      if (i.commonKey.vehicleNo) set.add(i.commonKey.vehicleNo);
    });
    return Array.from(set);
  }, [rawItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return rawItems.filter((item) => {
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
  }, [rawItems, searchKeyword]);

  // KPI Calculations
  const totalTransportTrips = useMemo(() => {
    return filteredItems.reduce(
      (sum, item) => sum + (item.transportRecord?.tripCount || 0),
      0,
    );
  }, [filteredItems]);

  const totalMiningTrips = useMemo(() => {
    return filteredItems.reduce(
      (sum, item) => sum + (item.miningRecord?.tripCount || 0),
      0,
    );
  }, [filteredItems]);

  const matchedCount = useMemo(() => {
    return filteredItems.filter((item) => {
      const t = item.transportRecord;
      const m = item.miningRecord;
      if (!t || !m) return false;
      return (
        (t.tripCount ?? 0) === (m.tripCount ?? 0) &&
        (t.cargoType || "").trim().toLowerCase() ===
          (m.material || m.loadStatus || "").trim().toLowerCase()
      );
    }).length;
  }, [filteredItems]);

  const mismatchCount = useMemo(() => {
    return filteredItems.length - matchedCount;
  }, [filteredItems, matchedCount]);

  const totalRecords = filteredItems.length || 1;
  const matchedPct = ((matchedCount / totalRecords) * 100).toFixed(2);
  const mismatchPct = ((mismatchCount / totalRecords) * 100).toFixed(2);

  const handleResetFilters = () => {
    setStartDate("2026-08-01");
    setEndDate("2026-08-31");
    setShift("ALL");
    setVehicleNo("ALL");
    setSearchKeyword("");
    toast.info("Đã làm mới các bộ lọc!");
  };

  const handleExportExcel = () => {
    excelService.exportToExcel(
      filteredItems,
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
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
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
          <div className="flex flex-col gap-1 w-37">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Ca
            </span>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger className="h-9 text-xs w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent className="w-32">
                <SelectItem value="ALL">Tất cả</SelectItem>
                <SelectItem value="Ca 1">Ca 1</SelectItem>
                <SelectItem value="Ca 2">Ca 2</SelectItem>
                <SelectItem value="Ca 3">Ca 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Số xe */}
          <div className="flex flex-col gap-1 w-44">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Số xe
            </span>
            <Select value={vehicleNo} onValueChange={setVehicleNo}>
              <SelectTrigger className="h-9 text-xs w-full bg-white dark:bg-gray-900">
                <SelectValue placeholder="Tất cả" />
              </SelectTrigger>
              <SelectContent className="w-44">
                <SelectItem value="ALL">Tất cả</SelectItem>
                {uniqueVehicles.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nút Đối chiếu cạnh Số xe */}
          <div className="flex flex-col gap-1 justify-end">
            <Button
              onClick={() => {
                loadData();
                toast.success("Đã thực hiện đối chiếu lại toàn bộ dữ liệu!");
              }}
              className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs shrink-0"
            >
              <RotateCw className="w-4 h-4" />
              Đối chiếu
            </Button>
          </div>

          {/* Right Side: Search Box & Action Buttons */}
          <div className="ml-auto flex items-end gap-3">
            <div className="flex flex-col gap-1 w-64">
              <span className="font-medium text-transparent select-none">Search</span>
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

      {/* ══ 3. KPI SUMMARY CARDS (4 METRIC CARDS) ═════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số chuyến (Vận tải) */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
              TỔNG SỐ CHUYẾN (VẬN TẢI)
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-extrabold text-blue-900 dark:text-blue-200">
                {totalTransportTrips}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                chuyến
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Tổng số chuyến (Khai thác) */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              TỔNG SỐ CHUYẾN (KHAI THÁC)
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">
                {totalMiningTrips}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                chuyến
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Khớp */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              Khớp
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {matchedCount}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                chuyến ({matchedPct}%)
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Sai lệch */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
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
              onClick={() => toast.success("Đã lưu dữ liệu đối chiếu chuẩn!")}
              className="h-9 px-6 text-xs font-semibold border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 shadow-2xs"
            >
              Lưu
            </Button>

            <Button
              onClick={handleExportExcel}
              className="h-9 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-xs"
            >
              <Download className="w-4 h-4" />
              Tải xuống (Excel)
            </Button>
          </div>
        </div>

        <ReconciliationComparisonTables
          items={filteredItems}
          onDeleteItem={handleDeleteItem}
        />
      </div>
    </div>
  );
};
