import React from "react";
import { createTheme, Theme, ThemeProvider } from "@mui/material/styles";
import type {} from "@mui/x-data-grid/themeAugmentation";
import { uiSansTheme } from "./uiTheme";

// Giao diện CHUNG cho các trang danh mục của Điều phối (Phòng ban, Chức vụ, Cán bộ nhân viên, Vật liệu, Điểm đổ tải,
// Công việc, Biện pháp an toàn, Cung độ, Mô hình xe, Loại/Chủng loại thiết bị, Ca, Xe, Máy) — theo THIẾT KẾ chủ dự án
// giao 2026-11-09 (file quan_ly_chung_loai_hang_than_cao_son.html, cùng bộ giao diện với danh mục Thống kê):
// phông Arial 13px, tiêu đề navy #0b2b5e, nút bo 7px, ô nhập bo góc viền xanh nhạt, bảng đầu cột XANH (gradient
// #0860d9 → #064caf) chữ trắng đậm, dòng xen kẽ xanh nhạt #eef5ff, hover #e1eeff, kẻ ô #dce6f3.
//
// Chỉ ĐỔI KIỂU, không đổi bố cục hay chức năng của từng trang. Là theme lồng (hàm theo theme ngoài) nên màu chủ đạo
// cấu hình ở Hệ thống > Cấu hình giao diện vẫn được giữ cho phần còn lại; chỉ áp cho trang nằm trong <CatalogThemeBoundary>.

const DESIGN_FONT = 'Arial, Helvetica, sans-serif';
const NAVY = "#0b2b5e";
const BLUE = "#1263e7";
const LINE = "#8fa9cc";
const CELL_LINE = "#b4c8e2";
const HEAD_GRADIENT = "linear-gradient(180deg, #0860d9, #064caf)";
const HEAD_BORDER = "#3a83e3";
const ZEBRA = "#eef5ff";
const HOVER = "#e1eeff";
const INPUT_BORDER = "#bfd1e8";

export const catalogTheme = (outer: Theme): Theme => {
  const base = uiSansTheme(outer);
  return createTheme(base, {
    typography: { fontFamily: DESIGN_FONT, fontSize: 13 },
    palette: {
      // tiêu đề navy theo thiết kế; dòng xen kẽ xanh nhạt
      brand: { ...base.palette.brand, title: NAVY, zebra: ZEBRA },
    },
    shape: { borderRadius: 7 },
    components: {
      MuiTypography: {
        styleOverrides: {
          h3: { fontSize: 22, fontWeight: 700, lineHeight: 1.3, color: NAVY },
          h4: { fontSize: 15, fontWeight: 700, color: NAVY },
        },
      },
      MuiBreadcrumbs: {
        defaultProps: { separator: "›" },
        styleOverrides: {
          root: { fontSize: 12 },
          li: { fontSize: 12, color: "#5c7191" },
          separator: { color: "#8aa0c0" },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 7,
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          },
          containedPrimary: { backgroundColor: BLUE, "&:hover": { backgroundColor: "#0e54c4" } },
          outlinedPrimary: { borderColor: "#c2d3ea", color: "#234a86", "&:hover": { backgroundColor: ZEBRA, borderColor: "#9bbbe6" } },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 7,
            fontSize: 13,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: INPUT_BORDER },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3886f8", borderWidth: 1 },
            "&.Mui-focused": { boxShadow: "0 0 0 3px #dcecff" },
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            boxShadow: "none",
            border: `1px solid ${LINE}`,
            borderRadius: 10,
            "&:before": { display: "none" },
            "&.Mui-expanded": { margin: "0 0 16px 0" },
          },
        },
      },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: 10 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 14 } } },
      MuiDataGrid: {
        defaultProps: { rowHeight: 40, columnHeaderHeight: 43 },
        styleOverrides: {
          // `&&` nâng độ ưu tiên để thắng sx cũ rải rác trong từng trang (cỡ chữ 16, nền xen kẽ...)
          root: {
            "&&": {
              border: `1px solid ${LINE}`,
              borderRadius: 10,
              fontFamily: DESIGN_FONT,
              fontSize: 13,
            },
            // `&&&` + !important: thắng nền "inherit !important" của các cột dính trái trong từng trang (vd Lệnh sản xuất)
            "&&& .MuiDataGrid-columnHeaders, &&& .MuiDataGrid-columnHeaderRow, &&& .MuiDataGrid-filler, &&& .MuiDataGrid-scrollbarFiller--header": {
              backgroundColor: "#0760d8 !important",
              backgroundImage: `${HEAD_GRADIENT} !important`,
              borderBottom: `1px solid ${HEAD_BORDER}`,
            },
            "&&& .MuiDataGrid-columnHeader, &&& .MuiDataGrid-columnHeaderCheckbox": {
              backgroundColor: "#0760d8 !important",
              backgroundImage: `${HEAD_GRADIENT} !important`,
              color: "#ffffff !important",
              borderRight: `1px solid ${HEAD_BORDER}`,
            },
            "&&& .MuiDataGrid-columnHeaderTitle": {
              fontSize: 13,
              fontWeight: 700,
              color: "#ffffff !important",
            },
            "&& .MuiDataGrid-columnSeparator": { color: HEAD_BORDER },
            "&& .MuiDataGrid-iconButtonContainer .MuiIconButton-root, && .MuiDataGrid-menuIcon .MuiIconButton-root, && .MuiDataGrid-sortIcon, && .MuiDataGrid-columnHeader .MuiCheckbox-root": {
              color: "#ffffff",
            },
            "&& .MuiDataGrid-row:nth-of-type(odd)": { backgroundColor: "#ffffff" },
            "&& .MuiDataGrid-row:nth-of-type(even)": { backgroundColor: ZEBRA },
            "&& .MuiDataGrid-row:hover": { backgroundColor: HOVER },
            "&& .MuiDataGrid-row.Mui-selected, && .MuiDataGrid-row.Mui-selected:hover": { backgroundColor: "#d7e8ff" },
            "&& .MuiDataGrid-cell": {
              borderBottom: `1px solid ${CELL_LINE}`,
              borderRight: `1px solid ${CELL_LINE}`,
              color: "#223653",
            },
            "&& .MuiDataGrid-footerContainer": { borderTop: `1px solid ${LINE}` },
            "&& .MuiDataGrid-toolbarContainer": { padding: "6px 8px", gap: 4 },
            "&& .MuiDataGrid-toolbarContainer .MuiButton-root": { color: "#234a86", fontSize: 12.5 },
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
