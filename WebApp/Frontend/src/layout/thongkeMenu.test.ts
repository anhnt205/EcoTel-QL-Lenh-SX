import {
  buildMergedCatalog,
  canSeeThongKe,
  canSeeTkModule,
  CATALOG_PATHS_MOVED_TO_TK,
  TK_CATALOG_GROUPS,
  TK_NAV_AFTER_CATALOG,
  TK_NAV_BEFORE_CATALOG,
  TK_TOP_ITEMS,
  tkPageRoute,
} from "./thongkeMenu";
import { allowAction, allowModule, hasPermission, permissionMode, setAction, showModule } from "../permissions/access";

// người dùng chưa cấu hình quyền mới (chạy theo vai trò cũ)
const legacy = (role: string) => ({ role, permissionMode: "legacy", permissions: {} });
// người dùng đã cấu hình quyền mới
const custom = (role: string, perms: Record<string, Partial<{ c: boolean; r: boolean; u: boolean; d: boolean }>>) => ({
  role,
  permissionMode: "custom",
  permissions: Object.fromEntries(
    Object.entries(perms).map(([k, v]) => [k, { c: false, r: false, u: false, d: false, ...v }]),
  ),
});

describe("thongkeMenu", () => {
  const all = [...TK_TOP_ITEMS, ...TK_CATALOG_GROUPS.flatMap((g) => g.items)];

  test("mọi đường dẫn Thống kê bắt đầu bằng / , không trùng nhau, và mọi mục có module riêng", () => {
    const tos = all.map((i) => i.to);
    tos.forEach((t) => expect(t.startsWith("/")).toBe(true));
    expect(new Set(tos).size).toBe(tos.length);
    all.forEach((i) => expect(i.module.startsWith("tk-")).toBe(true));
    expect(new Set(all.map((i) => i.module)).size).toBe(all.length);
  });

  test("trang Điều phối nằm dưới /tk, khác tiền tố /thong-ke của ứng dụng Thống kê", () => {
    expect(tkPageRoute("/nhap-lieu/van-tai")).toBe("/tk/nhap-lieu/van-tai");
  });

  test("chỉ danh mục đã chuyển sang Thống kê mới bị ẩn khỏi menu cũ; Phòng ban/Chức vụ do Điều phối quản lý hẳn", () => {
    for (const keep of ["/vehicles", "/machines", "/users", "/jobs", "/materials", "/locations", "/models", "/travelLog", "/safetyMeasures", "/departments", "/positions"]) {
      expect(CATALOG_PATHS_MOVED_TO_TK).not.toContain(keep);
    }
  });

  test("Thống kê KHÔNG còn trang Phòng ban / Chức vụ / Tài khoản trong menu", () => {
    const tos = all.map((i) => i.to);
    for (const gone of ["/danh-muc/don-vi", "/danh-muc/chuc-vu", "/danh-muc/nguoi-dung"]) {
      expect(tos).not.toContain(gone);
    }
  });
});

describe("menu Danh mục gộp (Thống kê + Điều phối)", () => {
  const paths = (user: any) => buildMergedCatalog(user).flatMap((g) => g.items.map((i) => i.path));

  test("mục Thống kê đứng ngoài, không lặp lại trong menu Danh mục gộp", () => {
    const p = paths(legacy("admin"));
    for (const i of [...TK_NAV_BEFORE_CATALOG, ...TK_NAV_AFTER_CATALOG]) {
      expect(p).not.toContain(tkPageRoute(i.to));
    }
    expect(TK_NAV_BEFORE_CATALOG.map((i) => i.text)).toEqual(["Nhập liệu Khai thác", "Nhập liệu Vận tải"]);
    expect(TK_NAV_AFTER_CATALOG.map((i) => i.text)).toEqual([
      "Định mức nhiên liệu",
      "Áp Trắc Địa",
      "Đối chiếu",
      "Thống kê sản lượng",
    ]);
  });

  test("admin (chưa cấu hình) thấy cả danh mục Thống kê lẫn danh mục chỉ có ở Điều phối, gồm Phòng ban/Chức vụ/Cán bộ", () => {
    const p = paths(legacy("admin"));
    for (const x of ["/tk/danh-muc/chung-loai-hang", "/materials", "/locations", "/vehicles", "/departments", "/positions", "/users", "/jobs", "/safetyMeasures", "/travelLog", "/models"]) {
      expect(p).toContain(x);
    }
  });

  test("điều độ viên cũ giữ đúng quyền cũ (không thấy Vật liệu, Điểm đổ, Công việc, Chức vụ...)", () => {
    const p = paths(legacy("dispatcher"));
    expect(p).toEqual(expect.arrayContaining(["/vehicles", "/machines", "/users", "/models", "/departments"]));
    for (const x of ["/materials", "/locations", "/jobs", "/safetyMeasures", "/travelLog", "/positions"]) {
      expect(p).not.toContain(x);
    }
  });

  test("nhân viên cũ không thấy menu danh mục nào", () => {
    expect(buildMergedCatalog(legacy("employee"))).toEqual([]);
    expect(canSeeThongKe(legacy("employee"))).toBe(false);
    expect(canSeeThongKe(legacy("dispatcher"))).toBe(true);
  });

  test("người đã được cấu hình quyền mới chỉ thấy mục có quyền Xem (không theo vai trò cũ)", () => {
    const u = custom("employee", { users: { r: true }, "tk-cargo-types": { r: true }, jobs: { c: true, r: true } });
    expect(paths(u).sort()).toEqual(["/jobs", "/tk/danh-muc/chung-loai-hang", "/users"].sort());
  });

  test("admin (mode full) thấy mọi mục dù vai trò", () => {
    const u = { role: "admin", permissionMode: "full", permissions: {} };
    expect(paths(u)).toContain("/positions");
    expect(paths(u)).toContain("/tk/danh-muc/ty-trong");
  });

  test("không có đường dẫn nào lặp trong menu gộp", () => {
    const p = paths(legacy("admin"));
    expect(new Set(p).size).toBe(p.length);
  });

  test("mục Thống kê ngoài thanh menu và tab báo cáo theo quyền module", () => {
    const u = custom("manager", { "tk-entry-transport": { r: true } });
    expect(canSeeTkModule(u, "tk-entry-transport")).toBe(true);
    expect(canSeeTkModule(u, "tk-entry-mining")).toBe(false);
    expect(canSeeThongKe(u)).toBe(true);
    expect(canSeeThongKe(custom("manager", { jobs: { r: true } }))).toBe(false);
  });
});

describe("permissions/access", () => {
  test("chế độ và quyền", () => {
    expect(permissionMode(undefined)).toBe("legacy");
    expect(permissionMode({ permissionMode: "custom" })).toBe("custom");
    expect(permissionMode({ permissionMode: "lạ" })).toBe("legacy");
    const u = custom("manager", { orders: { c: true, r: true } });
    expect(hasPermission(u, "orders", "c")).toBe(true);
    expect(hasPermission(u, "orders", "d")).toBe(false);
    expect(hasPermission(u, "jobs", "r")).toBe(false);
    expect(hasPermission({ permissionMode: "full" }, "bat-ky", "d")).toBe(true);
  });

  test("allowModule: legacy theo vai trò; custom theo quyền Xem", () => {
    expect(allowModule(legacy("manager"), "jobs", ["admin", "manager"])).toBe(true);
    expect(allowModule(legacy("dispatcher"), "jobs", ["admin", "manager"])).toBe(false);
    expect(allowModule(custom("dispatcher", { jobs: { r: true } }), "jobs", ["admin"])).toBe(true);
    expect(allowModule(custom("admin", {}), "jobs", ["admin"])).toBe(false);
  });

  test("showModule: người chưa cấu hình luôn thấy Tổng quan/Lệnh; đã cấu hình theo quyền Xem", () => {
    expect(showModule(undefined, "dashboard")).toBe(true);
    expect(showModule(legacy("employee"), "orders")).toBe(true);
    expect(showModule(custom("employee", { orders: { r: true } }), "dashboard")).toBe(false);
    expect(showModule(custom("employee", { orders: { r: true } }), "orders")).toBe(true);
  });

  test("allowAction: chưa cấu hình giữ quyết định cũ; đã cấu hình theo C/U/D", () => {
    expect(allowAction(legacy("admin"), "users", "d", true)).toBe(true);
    expect(allowAction(legacy("manager"), "users", "d", false)).toBe(false);
    expect(allowAction(custom("manager", { users: { r: true, d: true } }), "users", "d", false)).toBe(true);
    expect(allowAction(custom("admin", { users: { r: true } }), "users", "d", true)).toBe(false);
  });

  test("setAction: bật C/U/D tự bật Xem; tắt Xem tắt hết", () => {
    const base = { module: "x", c: false, r: false, u: false, d: false };
    expect(setAction(base, "u", true)).toMatchObject({ u: true, r: true });
    expect(setAction({ module: "x", c: true, r: true, u: true, d: true }, "r", false)).toMatchObject({
      c: false, r: false, u: false, d: false,
    });
  });
});

describe("admin giữ đúng menu cũ", () => {
  test("allowModule với admin (mode full) theo vai trò cũ: không thấy 'Công việc của tôi' (chỉ quản lý)", () => {
    const admin = { role: "admin", permissionMode: "full", permissions: {} };
    expect(allowModule(admin, "my-tasks", ["manager"])).toBe(false);
    expect(allowModule(admin, "system", ["admin"])).toBe(true);
    expect(showModule(admin, "dashboard")).toBe(true);
  });
});
