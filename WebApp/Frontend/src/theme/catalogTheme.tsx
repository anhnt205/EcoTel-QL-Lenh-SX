import React from "react";
import { createTheme, Theme, ThemeProvider } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";
import { UI_FONT, uiSansTheme } from "./uiTheme";

// Giao diện CHUNG cho các trang danh mục của Điều phối (Phòng ban, Chức vụ, Cán bộ nhân viên, Vật liệu, Điểm đổ tải,
// Công việc, Biện pháp an toàn, Cung độ, Mô hình xe, Loại/Chủng loại thiết bị, Ca, Xe, Máy) — lấy trang
// "Chủng loại hàng" của phần mềm Thống kê làm CHUẨN: phông không chân, tiêu đề xanh đậm gọn, đường dẫn nhỏ xám
// "Danh mục › ...", nút bo 8px không viết hoa, ô nhập bo góc, khung form phẳng viền mảnh, bảng đầu cột xám nhạt chữ
// in hoa nhỏ, dòng trắng viền mảnh (không xen kẽ màu), chân trang "Hiển thị x–y trong tổng n bản ghi".
//
// Chỉ ĐỔI KIỂU, không đổi bố cục hay chức năng của từng trang. Là theme lồng (hàm theo theme ngoài) nên màu chủ đạo
// cấu hình ở Hệ thống > Cấu hình giao diện vẫn được giữ; chỉ áp cho trang nằm trong <CatalogThemeBoundary>.

const BORDER = "#e5e9f0";
const HAIRLINE = "#eef1f6";
const HEAD_BG = "#f8fafc";

export const catalogTheme = (outer: Theme): Theme => {
  const base = uiSansTheme(outer);
  const primary = base.palette.primary.main;
  return createTheme(base, {
    typography: { fontFamily: UI_FONT },
    palette: {
      // màu tiêu đề / nhấn lấy theo màu chủ đạo, không dùng "blue" cứng; bỏ nền xen kẽ của bảng
      brand: { ...base.palette.brand, title: primary, zebra: "#ffffff" },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiTypography: {
        styleOverrides: {
          h3: { fontSize: 22, fontWeight: 700, lineHeight: 1.3 },
          h4: { fontSize: 15, fontWeight: 700 },
        },
      },
      MuiBreadcrumbs: {
        defaultProps: { separator: "›" },
        styleOverrides: {
          root: { fontSize: 12 },
          li: { fontSize: 12, color: "#64748b" },
          separator: { color: "#94a3b8" },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          },
        },
      },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8, fontSize: 14 } } },
      MuiAccordion: {
        styleOverrides: {
          root: {
            boxShadow: "none",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            "&:before": { display: "none" },
            "&.Mui-expanded": { margin: "0 0 16px 0" },
          },
        },
      },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: 8 } } },
      MuiDataGrid: {
        defaultProps: { rowHeight: 40, columnHeaderHeight: 42 },
        styleOverrides: {
          // `&&` nâng độ ưu tiên để thắng sx cũ rải rác trong từng trang (cỡ chữ 16, nền xen kẽ...)
          root: {
            "&&": {
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              fontFamily: UI_FONT,
              fontSize: 13,
            },
            "&& .MuiDataGrid-columnHeaders": {
              backgroundColor: HEAD_BG,
              borderBottom: `1px solid ${BORDER}`,
            },
            "&& .MuiDataGrid-columnHeader": { backgroundColor: HEAD_BG },
            "&& .MuiDataGrid-columnHeaderTitle": {
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              color: "#334155",
            },
            "&& .MuiDataGrid-row:nth-of-type(odd), && .MuiDataGrid-row:nth-of-type(even)": {
              backgroundColor: "#ffffff",
            },
            "&& .MuiDataGrid-row:hover": { backgroundColor: HEAD_BG },
            "&& .MuiDataGrid-cell": {
              borderBottom: `1px solid ${HAIRLINE}`,
              color: "#1e293b",
            },
            "&& .MuiDataGrid-footerContainer": { borderTop: `1px solid ${BORDER}` },
            "&& .MuiDataGrid-toolbarContainer": { padding: "6px 8px", gap: 4 },
            "&& .MuiDataGrid-toolbarContainer .MuiButton-root": { color: "#475569", fontSize: 12.5 },
          },
        },
      },
    },
  });
};

/** Bọc một trang danh mục để dùng giao diện chung ở trên. */
export const CatalogThemeBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={catalogTheme}>{children}</ThemeProvider>
);

export default CatalogThemeBoundary;
