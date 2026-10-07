import {
  buildMergedCatalog,
  canSeeThongKe,
  TK_NAV_AFTER_CATALOG,
  TK_NAV_BEFORE_CATALOG,
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

describe("menu Danh mục gộp (Thống kê + Điều phối)", () => {
  const paths = (role: string) =>
    buildMergedCatalog(role).flatMap((g) => g.items.map((i) => i.path));

  test("mục Thống kê đứng ngoài, không lặp lại trong menu Danh mục gộp", () => {
    const all = paths("admin");
    for (const i of [...TK_NAV_BEFORE_CATALOG, ...TK_NAV_AFTER_CATALOG]) {
      expect(all).not.toContain(tkPageRoute(i.to));
    }
    expect(TK_NAV_BEFORE_CATALOG.map((i) => i.text)).toEqual(["Nhập liệu Khai thác", "Nhập liệu Vận tải"]);
    expect(TK_NAV_AFTER_CATALOG.map((i) => i.text)).toEqual([
      "Định mức nhiên liệu",
      "Áp Trắc Địa",
      "Đối chiếu",
      "Báo chuyến",
    ]);
  });

  test("admin thấy cả danh mục Thống kê lẫn danh mục chỉ có ở Điều phối", () => {
    const all = paths("admin");
    for (const p of ["/tk/danh-muc/don-vi", "/tk/danh-muc/chung-loai-hang", "/materials", "/locations", "/vehicles", "/users", "/jobs", "/safetyMeasures", "/travelLog", "/models"]) {
      expect(all).toContain(p);
    }
    expect(all).toContain("/tk/danh-muc/nguoi-dung"); // tài khoản Thống kê: chỉ admin
  });

  test("điều độ viên giữ đúng quyền cũ của Điều phối (không thấy Vật liệu, Điểm đổ, Công việc...)", () => {
    const all = paths("dispatcher");
    expect(all).toEqual(expect.arrayContaining(["/vehicles", "/machines", "/users", "/models"]));
    for (const p of ["/materials", "/locations", "/jobs", "/safetyMeasures", "/travelLog", "/tk/danh-muc/nguoi-dung"]) {
      expect(all).not.toContain(p);
    }
  });

  test("nhân viên không thấy menu danh mục nào; chỉ admin/manager/dispatcher thấy Thống kê", () => {
    expect(buildMergedCatalog("employee")).toEqual([]);
    expect(canSeeThongKe("employee")).toBe(false);
    expect(canSeeThongKe("dispatcher")).toBe(true);
  });

  test("không có đường dẫn nào lặp trong menu gộp", () => {
    const all = paths("admin");
    expect(new Set(all).size).toBe(all.length);
  });
});
