import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileCheck,
  Download,
  RefreshCw,
  Truck,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getApprovedTripReports,
  type StandardTripReport,
} from "@/modules/dataentry/services/thongKeStorage";
import { excelService } from "@/modules/report/utils/excel-exporter";

export const StandardTripReportPage: React.FC = () => {
  const [reports, setReports] = useState<StandardTripReport[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");

  const loadData = () => {
    const list = getApprovedTripReports();
    setReports(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    loadData();
    toast.info("Đã cập nhật danh sách báo chuyến!");
  };

  // Filtered items
  const filteredReports = useMemo(() => {
    if (!searchKeyword.trim()) return reports;
    const kw = searchKeyword.trim().toLowerCase();
    return reports.filter(
      (r) =>
        r.vehicleNo.toLowerCase().includes(kw) ||
        r.excavatorEquipment.toLowerCase().includes(kw) ||
        r.cargoType.toLowerCase().includes(kw) ||
        r.shift.toLowerCase().includes(kw) ||
        r.pickupLocation.toLowerCase().includes(kw) ||
        r.unloadLocationName.toLowerCase().includes(kw),
    );
  }, [reports, searchKeyword]);

  // Statistics KPIs
  const totalReports = filteredReports.length;
  const totalTrips = useMemo(
    () => filteredReports.reduce((acc, cur) => acc + (cur.tripCount || 0), 0),
    [filteredReports],
  );
  const transportOptionCount = useMemo(
    () => filteredReports.filter((r) => r.finalOption === "TRANSPORT").length,
    [filteredReports],
  );
  const miningOptionCount = useMemo(
    () => filteredReports.filter((r) => r.finalOption === "EXCAVATION").length,
    [filteredReports],
  );
  const otherOptionCount = useMemo(
    () => filteredReports.filter((r) => r.finalOption === "OTHER").length,
    [filteredReports],
  );

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
      "Phương án chốt": r.finalOptionLabel,
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

  return (
    <div className="space-y-5 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen text-slate-900 dark:text-slate-100">
      {/* ══ 1. HEADER BAR ═══════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              DANH SÁCH BÁO CHUYẾN CHUẨN
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-semibold text-xs"
              >
                {totalReports} Bản ghi đã chốt
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tổng hợp đầy đủ thông tin báo chuyến chuẩn hóa cuối cùng sau khi hoàn tất đối chiếu ca
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9 gap-1.5 text-xs border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </Button>

          <Button
            onClick={handleExportExcel}
            size="sm"
            className="h-9 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* ══ 2. KPI SUMMARY CARDS ═════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Tổng bản ghi báo chuyến
            </span>
            <FileCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {totalReports}
            </span>
            <span className="text-xs text-slate-500">bản ghi</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Tổng số chuyến chuẩn
            </span>
            <Truck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {totalTrips}
            </span>
            <span className="text-xs text-slate-500">chuyến</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Chốt theo Vận tải
            </span>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-0 font-bold text-[10px]">
              {transportOptionCount}
            </Badge>
          </div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            Chiếm{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {totalReports ? ((transportOptionCount / totalReports) * 100).toFixed(1) : 0}%
            </span>{" "}
            tổng số quyết định
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Chốt Khai thác / Khác
            </span>
            <div className="flex gap-1">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border-0 font-bold text-[10px]">
                KT: {miningOptionCount}
              </Badge>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-0 font-bold text-[10px]">
                Khác: {otherOptionCount}
              </Badge>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            Tổng cộng{" "}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {miningOptionCount + otherOptionCount}
            </span>{" "}
            bản ghi điều chỉnh
          </div>
        </div>
      </div>

      {/* ══ 3. TABLE CONTAINER & SEARCH ═════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Tìm theo xe, máy xúc, khu vực, loại hàng..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 self-end sm:self-auto">
            Hiển thị <span className="font-bold text-slate-900 dark:text-slate-100">{filteredReports.length}</span> / {reports.length} bản ghi
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="px-3 py-2.5 text-center w-10">STT</th>
                <th className="px-3 py-2.5">Ngày báo chuyến</th>
                <th className="px-3 py-2.5 text-center">Ca</th>
                <th className="px-3 py-2.5">Số xe</th>
                <th className="px-3 py-2.5">Khu vực xúc</th>
                <th className="px-3 py-2.5">Máy xúc</th>
                <th className="px-3 py-2.5">Nơi nhận tải</th>
                <th className="px-3 py-2.5 text-center">Tầng nhận</th>
                <th className="px-3 py-2.5">Nơi dỡ tải</th>
                <th className="px-3 py-2.5 text-center">Tầng dỡ</th>
                <th className="px-3 py-2.5 text-right">CĐ tuyến (km)</th>
                <th className="px-3 py-2.5 text-right">Nâng tải (m)</th>
                <th className="px-3 py-2.5 text-center">Thẻ Lái xe</th>
                <th className="px-3 py-2.5 text-center">Mưa / Bổ túc</th>
                <th className="px-3 py-2.5 text-center">Phương án chốt</th>
                <th className="px-3 py-2.5">Loại hàng chuẩn</th>
                <th className="px-3 py-2.5 text-center">Số chuyến</th>
                <th className="px-3 py-2.5 text-center">Mức tải</th>
                <th className="px-3 py-2.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={19}
                    className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileCheck className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-semibold text-sm">
                        Chưa có bản ghi báo chuyến chuẩn nào!
                      </p>
                      <p className="text-xs">
                        Hãy sang trang <strong>Đối chiếu</strong> chọn phương án chốt và bấm <strong>Lưu</strong> để tổng hợp dữ liệu chuẩn vào đây.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-center text-slate-500 font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      {item.reportDate}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium">
                      {item.shift}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                      {item.vehicleNo}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                      {item.excavationArea || "-"}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                      {item.excavatorEquipment}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {item.pickupLocation}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-400">
                      {item.pickupBench || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {item.unloadLocationName}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-400">
                      {item.unloadBench || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800 dark:text-slate-200">
                      {item.fullRouteDistance ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800 dark:text-slate-200">
                      {item.fullRouteElevate ?? "-"}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium text-slate-600 dark:text-slate-400">
                      {item.operatorBadgeNo || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.isRainyDay && (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 px-1 py-0">
                            Mưa
                          </Badge>
                        )}
                        {item.isTraineeVehicle && (
                          <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 px-1 py-0">
                            Bổ túc
                          </Badge>
                        )}
                        {!item.isRainyDay && !item.isTraineeVehicle && "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge
                        variant="outline"
                        className={`font-semibold text-[11px] px-2 py-0.5 border ${
                          item.finalOption === "TRANSPORT"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
                            : item.finalOption === "EXCAVATION"
                            ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800"
                            : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {item.finalOptionLabel}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                      {item.cargoType}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-blue-600 dark:text-blue-400">
                      {item.tripCount}
                    </td>
                    <td className="px-3 py-2.5 text-center font-medium text-slate-700 dark:text-slate-300">
                      {item.loadStatus}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge
                        variant="ghost"
                        className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 font-bold text-[10px] gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Đã chốt
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
