import { createTheme } from "@mui/material/styles";
import appTheme from "./index";

// Font giao diện (menu, bộ lọc, thẻ số liệu) của các màn thiết kế lại. Nội dung
// biểu mẫu báo cáo vẫn dùng theme gốc (Times New Roman) để in ra đúng mẫu giấy.
export const UI_FONT =
  '"Inter","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

const uiTheme = createTheme(appTheme, {
  typography: { fontFamily: UI_FONT },
});

// Theme gốc cố định phông Times New Roman cho TỪNG kiểu chữ (h1…button…), nên đổi mỗi
// typography.fontFamily ở trên không có tác dụng. Bản này ghi đè từng kiểu chữ để thật sự
// ra phông không chân; chỉ dùng cho màn nào cần giao diện không chân (hiện: Lệnh sản xuất).
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
export const uiSansTheme = createTheme(appTheme, {
  typography: {
    fontFamily: UI_FONT,
    ...Object.fromEntries(
      TYPOGRAPHY_VARIANTS.map((v) => [v, { fontFamily: UI_FONT }]),
    ),
  } as any,
});

export default uiTheme;
