import * as XLSX from "xlsx";
import {
  ALL_REPORT_COLUMNS,
  REPORT_COLUMN_GROUPS,
  formatCell,
} from "./productionReportColumns";
import type { ProductionReportRow, ProductionReportSummary } from "./productionService";

/**
 * Xuất màn Báo cáo thống kê ra Excel, giữ nguyên cấu trúc cột lồng hai tầng
 * như trên màn hình: dòng 1 là tên nhóm (đã gộp ô), dòng 2 là tên cột.
 *
 * Dùng chung định nghĩa cột với bảng hiển thị, nên file và màn hình không
 * bao giờ lệch nhau về thứ tự hay nhãn.
 */
export function downloadProductionReport(
  summary: ProductionReportSummary,
  rows: ProductionReportRow[],
): void {
  const groupRow: string[] = [];
  const merges: XLSX.Range[] = [];
  let col = 0;
  for (const g of REPORT_COLUMN_GROUPS) {
    groupRow.push(g.title);
    for (let i = 1; i < g.columns.length; i++) groupRow.push("");
    if (g.columns.length > 1) {
      merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + g.columns.length - 1 } });
    }
    col += g.columns.length;
  }

  const headerRow = ALL_REPORT_COLUMNS.map((c) => c.label);

  // Ô số xuất ra dạng SỐ THẬT, không phải chuỗi đã định dạng — người nhận
  // file còn phải cộng/lọc trên đó.
  const body = rows.map((r) =>
    ALL_REPORT_COLUMNS.map((c) => {
      const v = r[c.key];
      if (v === null || v === undefined) return "";
      return c.numeric ? Number(v) : String(v);
    }),
  );

  const sheet = XLSX.utils.aoa_to_sheet([groupRow, headerRow, ...body]);
  sheet["!merges"] = merges;
  sheet["!cols"] = ALL_REPORT_COLUMNS.map((c) => ({
    wch: Math.max(c.label.length + 2, 12),
  }));
  // Đóng băng hai dòng tiêu đề và ba cột đầu, giống hành vi trên màn hình.
  sheet["!freeze"] = { xSplit: 3, ySplit: 2 };

  const info = XLSX.utils.aoa_to_sheet([
    ["BÁO CÁO THỐNG KÊ SẢN LƯỢNG"],
    [],
    ["Kỳ", summary.periodName],
    ["Từ ngày", summary.fromDate],
    ["Đến ngày", summary.toDate],
    ["Số ngày của kỳ", summary.dayCount],
    ["Số chuyến", summary.rowCount],
    ["Chế độ", summary.tkeMode ? "TKE (không áp hệ số trắc địa)" : "Trắc địa"],
    ["Tính lúc", summary.calculatedAt ?? ""],
    [],
    ["Tổng m3", summary.totalM3],
    ["Tổng KLVC (tấn)", summary.totalTon],
    ["Tổng Tkm", summary.totalTkm],
    ["m3 trắc địa", summary.surveyM3],
    ["tấn trắc địa", summary.surveyTon],
    ["tkm trắc địa", summary.surveyTkm],
    ["Tấn cuối cùng", summary.finalTon],
    ["Tkm cuối cùng", summary.finalTkm],
    [],
    ["Lưu ý:"],
    ["- Số ngày của kỳ được ghi kèm vì kỳ cuối tháng ngắn hơn các kỳ khác;"],
    ["  so sản lượng tuyệt đối giữa các kỳ mà bỏ qua số ngày sẽ gây hiểu nhầm."],
  ]);
  info["!cols"] = [{ wch: 24 }, { wch: 46 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, info, "ThongTin");
  XLSX.utils.book_append_sheet(wb, sheet, "BaoCaoThongKe");
  XLSX.writeFile(wb, `bao-cao-thong-ke_${summary.fromDate}_${summary.toDate}.xlsx`);
}

/** Chuỗi hiển thị của một ô — dùng lại logic định dạng của bảng. */
export const cellText = formatCell;
