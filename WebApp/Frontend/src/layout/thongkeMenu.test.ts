import {
  CATALOG_PATHS_MOVED_TO_TK,
  TK_CATALOG_GROUPS,
  TK_TOP_ITEMS,
  tkPageRoute,
} from "./thongkeMenu";

describe("thongkeMenu", () => {
  const all = [...TK_TOP_ITEMS, ...TK_CATALOG_GROUPS.flatMap((g) => g.items)];

  test("mọi đường dẫn Thống kê bắt đầu bằng / và không trùng nhau", () => {
    const tos = all.map((i) => i.to);
    tos.forEach((t) => expect(t.startsWith("/")).toBe(true));
    expect(new Set(tos).size).toBe(tos.length);
  });

  test("trang Điều phối nằm dưới /tk, khác tiền tố /thong-ke của ứng dụng Thống kê", () => {
    expect(tkPageRoute("/nhap-lieu/van-tai")).toBe("/tk/nhap-lieu/van-tai");
  });

  test("chỉ danh mục đã chuyển sang Thống kê mới bị ẩn khỏi menu Điều phối", () => {
    // Các màn vận hành/DPMM-only phải KHÔNG nằm trong danh sách ẩn.
    for (const keep of ["/vehicles", "/machines", "/users", "/jobs", "/materials", "/locations", "/models", "/travelLog", "/safetyMeasures"]) {
      expect(CATALOG_PATHS_MOVED_TO_TK).not.toContain(keep);
    }
  });

  test("Tài khoản Thống kê chỉ dành cho quản trị", () => {
    const acc = all.find((i) => i.to === "/danh-muc/nguoi-dung");
    expect(acc?.adminOnly).toBe(true);
  });
});
