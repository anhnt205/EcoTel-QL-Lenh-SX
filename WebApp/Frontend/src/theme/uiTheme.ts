import { createTheme, Theme } from "@mui/material/styles";

// Font giao diện (menu, bộ lọc, thẻ số liệu) của các màn thiết kế lại. Nội dung
// biểu mẫu báo cáo vẫn dùng theme gốc (Times New Roman) để in ra đúng mẫu giấy.
export const UI_FONT =
  '"Inter","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
const TIMES_FONT = '"Times New Roman", Times, serif';

// Các theme dưới đây là HÀM theo theme ngoài (ThemeProvider nhận cả dạng hàm): chỉ đổi phần phông,
// còn bảng màu (kể cả màu chủ đạo cấu hình ở Hệ thống > Cấu hình giao diện) lấy từ theme gốc nên
// không bị theme lồng nhau đè mất.

const uiTheme = (outer: Theme): Theme =>
  createTheme(outer, { typography: { fontFamily: UI_FONT } });

// Theme gốc cố định phông Times New Roman cho TỪNG kiểu chữ (h1…button…), nên đổi mỗi
// typography.fontFamily ở trên không có tác dụng. Hai hàm dưới ghi đè từng kiểu chữ để thật sự
// đổi phông: uiSansTheme = không chân (Lệnh sản xuất điều độ viên, Header);
// appFontTheme = trả lại Times New Roman cho form/hộp thoại cũ nằm trong màn không chân.
const TYPOGRAPHY_VARIANTS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "subtitle1",
  "subtitle2",
  "body1",
  "body2",
  "button",
  "caption",
  "overline",
];
const withFont = (family: string) => (outer: Theme): Theme =>
  createTheme(outer, {
    typography: {
      fontFamily: family,
      ...Object.fromEntries(
        TYPOGRAPHY_VARIANTS.map((v) => [v, { fontFamily: family }]),
      ),
    } as any,
  });

export const uiSansTheme = withFont(UI_FONT);
export const appFontTheme = withFont(TIMES_FONT);

export default uiTheme;
