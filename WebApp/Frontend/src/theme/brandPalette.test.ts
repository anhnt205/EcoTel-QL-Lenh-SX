import { getContrastRatio } from "@mui/material/styles";
import theme, { brandHeaderBg, brandOnColor, buildAppTheme, buildBrandPalette, DEFAULT_PRIMARY } from "./index";

describe("buildBrandPalette", () => {
  test("màu mặc định giữ ĐÚNG các sắc cũ (không đổi giao diện khi chưa tuỳ chỉnh)", () => {
    expect(buildBrandPalette(DEFAULT_PRIMARY)).toEqual({
      title: "blue",
      zebra: "#e3f2fd",
      strong: "#1d4ed8",
      tint: "#e8f0fe",
      border: "#93b4f5",
      chipBg: "#eef2ff",
      chipText: "#3b5bdb",
      solid: "#1d5fd1",
      solidHover: "#174fb0",
      onSolid: "#fff",
    });
    expect(buildBrandPalette()).toEqual(buildBrandPalette(DEFAULT_PRIMARY));
    // so sánh không phân biệt hoa/thường như phần còn lại của cấu hình
    expect(buildBrandPalette("#1976D2").title).toBe("blue");
  });

  test("màu tuỳ chỉnh: mọi thành phần suy ra từ màu đã chọn, không còn sắc xanh cũ", () => {
    const p = buildBrandPalette("#c62828");
    expect(p.solid).toBe("#c62828");
    expect(p.title).not.toBe("blue");
    expect(p.zebra).not.toBe("#e3f2fd");
    expect(p.strong).not.toBe("#1d4ed8");
    expect(p.chipBg).not.toBe("#eef2ff");
  });

  test("chữ làm bằng màu chủ đạo đọc được trên nền trắng dù chọn màu rất nhạt (vàng)", () => {
    const p = buildBrandPalette("#ffeb3b");
    expect(getContrastRatio(p.title, "#fff")).toBeGreaterThanOrEqual(3);
    expect(getContrastRatio(p.strong, "#fff")).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(p.chipText, "#fff")).toBeGreaterThanOrEqual(4.5);
  });

  test("màu đã đủ đậm thì giữ nguyên làm chữ tiêu đề", () => {
    expect(buildBrandPalette("#0d47a1").title).toBe("#0d47a1");
  });

  test("chữ trên nút đặc: trắng với nền đậm, tối với nền sáng", () => {
    expect(buildBrandPalette("#0d47a1").onSolid).toBe("#fff");
    expect(buildBrandPalette("#ffeb3b").onSolid).toBe("#0f172a");
  });
});

describe("theme", () => {
  test("theme chứa bảng màu thương hiệu theo màu chính để dùng qua sx (color=\"brand.title\")", () => {
    expect(theme.palette.brand.zebra).toBe("#e3f2fd");
    expect(buildAppTheme("#2e7d32").palette.brand.solid).toBe("#2e7d32");
    expect(buildAppTheme("#2e7d32").palette.primary.main).toBe("#2e7d32");
  });
});

describe("màu thanh đầu trang (Header)", () => {
  test("mặc định giữ navy đã duyệt", () => {
    expect(brandHeaderBg(DEFAULT_PRIMARY)).toBe("#0f2a55");
    expect(brandOnColor("#0f2a55")).toBe("#fff");
  });

  test("màu tuỳ chỉnh: nền Header LÀ đúng màu đã chọn (không bị làm đậm gần như trùng màu mặc định)", () => {
    expect(brandHeaderBg("#258cf4")).toBe("#258cf4");
    expect(brandHeaderBg("#c62828")).toBe("#c62828");
    expect(brandHeaderBg("#258cf4")).not.toBe(brandHeaderBg(DEFAULT_PRIMARY));
  });

  test("chữ trên Header: trắng với nền đậm / vừa, tối với nền quá sáng", () => {
    expect(brandOnColor("#258cf4")).toBe("#fff");
    expect(brandOnColor("#c62828")).toBe("#fff");
    expect(brandOnColor("#ffeb3b")).toBe("#0f172a");
  });
});
