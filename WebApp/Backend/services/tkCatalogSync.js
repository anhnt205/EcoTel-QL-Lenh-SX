const axios = require("axios");

// Đồng bộ danh mục TỪ Thống kê (THONGKE-CAOSON) VỀ Điều phối.
//
// Thống kê là NGUỒN GỐC của danh mục (đơn vị, chức vụ, ca, phân loại/chủng
// loại thiết bị, thiết bị). Điều phối giữ bản sao chỉ-đọc nhưng GIỮ NGUYÊN
// _id của bản ghi cũ — lệnh/báo cáo cũ tham chiếu danh mục bằng ObjectId nên
// không được đổi id. Vì vậy mỗi bản ghi Thống kê được GHÉP với bản ghi Điều
// phối đã có theo thứ tự: externalTkId -> khoá tự nhiên (code, rồi name); chỉ
// khi không ghép được mới tạo mới.
//
// Chỉ ghi các field "gốc". Field vận hành của Điều phối (status, coordinates,
// note, files của thiết bị) KHÔNG bao giờ bị đụng. Bản ghi chỉ có ở Điều phối
// KHÔNG bị xoá — chỉ được báo cáo lại ("onlyInDpmm").
//
// Phần tính toán (buildPlan) là hàm thuần, không đụng CSDL/mạng — để test được
// và để chạy dry-run (mặc định) cho ra báo cáo trước khi ghi thật.
//
// Cấu hình (.env):
//   TK_API_BASE_URL          ví dụ http://thongke-backend:8080  (không có /api)
//   TK_SERVICE_USERNAME      tài khoản chỉ-đọc được cấp riêng cho Điều phối
//   TK_SERVICE_PASSWORD
// Đăng nhập bằng POST /api/auth/login của Thống kê (chế độ standalone).

const PAGE_SIZE = 200;
const MAX_PAGES = 200; // chặn vòng lặp vô hạn nếu server trả totalPages sai

const GROUP_TK_TO_DPMM = { XE: "Xe", MAY: "Máy" };

const norm = (v) =>
  v === undefined || v === null ? "" : String(v).trim().toLowerCase();
const str = (v) => (v === undefined || v === null ? undefined : String(v).trim());
const idStr = (v) => (v === undefined || v === null ? undefined : String(v));

// ---------------------------------------------------------------------------
// Ghép bản ghi (thuần)
// ---------------------------------------------------------------------------

/**
 * Ghép từng bản ghi Thống kê với 1 bản ghi Điều phối.
 * @param tkRows      [{ tkId, ...fields }]
 * @param dpmmDocs    [{ _id, externalTkId, ...fields }] (lean)
 * @param naturalKeys tên field khoá tự nhiên theo thứ tự ưu tiên
 * @returns { matches: [{ tk, doc|null, by|null }], onlyInDpmm: [doc] }
 * Mỗi doc Điều phối chỉ được ghép tối đa 1 lần (tránh 2 bản ghi Thống kê dồn
 * vào cùng 1 bản ghi) — bản ghi tới sau không ghép được sẽ thành "tạo mới".
 */
function matchRecords(tkRows, dpmmDocs, naturalKeys) {
  const used = new Set();
  const byExternal = new Map();
  for (const d of dpmmDocs) {
    if (d.externalTkId) byExternal.set(String(d.externalTkId), d);
  }
  const natural = naturalKeys.map(() => new Map());
  for (const d of dpmmDocs) {
    naturalKeys.forEach((k, i) => {
      const key = norm(d[k]);
      if (key && !natural[i].has(key)) natural[i].set(key, d);
    });
  }

  const take = (doc) => {
    if (!doc) return null;
    const id = String(doc._id);
    if (used.has(id)) return null;
    used.add(id);
    return doc;
  };

  const matches = [];
  // Lượt 1: ghép theo externalTkId trước cho TẤT CẢ — để 1 bản ghi đã gắn id
  // không bị bản ghi khác "cướp" qua khoá tự nhiên.
  const pending = [];
  for (const tk of tkRows) {
    const doc = take(byExternal.get(String(tk.tkId)));
    if (doc) matches.push({ tk, doc, by: "externalTkId" });
    else pending.push(tk);
  }
  for (const tk of pending) {
    let found = null;
    let by = null;
    for (let i = 0; i < naturalKeys.length && !found; i++) {
      const key = norm(tk[naturalKeys[i]]);
      if (!key) continue;
      const cand = natural[i].get(key);
      // Bản ghi đã gắn externalTkId KHÁC thì không ghép qua khoá tự nhiên.
      if (cand && cand.externalTkId && String(cand.externalTkId) !== String(tk.tkId)) continue;
      found = take(cand);
      if (found) by = naturalKeys[i];
    }
    matches.push({ tk, doc: found, by });
  }

  const onlyInDpmm = dpmmDocs.filter((d) => !used.has(String(d._id)));
  return { matches, onlyInDpmm };
}

/** Các field trong `fields` khác với giá trị hiện có của doc. */
function diffFields(doc, fields) {
  const changed = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    const cur = doc[k];
    const same =
      cur !== null && typeof cur === "object" && cur.toString
        ? String(cur) === String(v)
        : cur === v || (cur === undefined && v === null);
    if (!same) changed[k] = v;
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Chuẩn hoá dữ liệu Thống kê -> dòng đồng bộ (thuần)
// ---------------------------------------------------------------------------

function normalizeTk({ departments, positions, shifts, devices }) {
  const deptRows = departments.map((d) => ({
    tkId: idStr(d.id),
    code: str(d.code),
    name: str(d.name),
    description: str(d.description),
  }));

  // Chức vụ bên Thống kê thuộc từng đơn vị nên cùng tên có thể lặp; Điều phối
  // chỉ có 1 danh sách phẳng -> gộp theo tên, ghi nhận phần trùng để báo cáo.
  const posByName = new Map();
  const duplicatePositionNames = [];
  for (const p of positions) {
    const key = norm(p.name);
    if (!key) continue;
    if (posByName.has(key)) {
      duplicatePositionNames.push(str(p.name));
      continue;
    }
    posByName.set(key, { tkId: idStr(p.id), name: str(p.name), note: str(p.description) });
  }

  const shiftRows = shifts.map((s) => ({
    tkId: idStr(s.id),
    name: s.name,
    startTime: str(s.startTime),
    endTime: str(s.endTime),
  }));

  // Thống kê KHÔNG có API riêng cho phân loại/chủng loại thiết bị — chúng chỉ
  // xuất hiện trong từng thiết bị. Suy ra từ danh sách thiết bị.
  const typeRows = new Map();
  const modelRows = new Map();
  for (const d of devices) {
    if (d.categoryId != null && str(d.categoryName)) {
      typeRows.set(idStr(d.categoryId), {
        tkId: idStr(d.categoryId),
        name: str(d.categoryName),
        group: GROUP_TK_TO_DPMM[d.categoryGroup],
      });
    }
    if (d.materialId != null && str(d.materialName)) {
      modelRows.set(idStr(d.materialId), { tkId: idStr(d.materialId), name: str(d.materialName) });
    }
  }

  const deviceRows = devices.map((d) => ({
    tkId: idStr(d.id),
    code: str(d.code),
    name: str(d.name),
    vehicleNumber: str(d.vehicleNumber),
    fuelType: str(d.fuelType),
    capacity: d.capacity ?? undefined,
    power: d.power ?? undefined,
    departmentTkId: idStr(d.departmentId),
    categoryTkId: idStr(d.categoryId),
    materialTkId: idStr(d.materialId),
  }));

  return {
    department: deptRows,
    position: [...posByName.values()],
    shift: shiftRows,
    deviceType: [...typeRows.values()],
    deviceModel: [...modelRows.values()],
    device: deviceRows,
    notes: { duplicatePositionNames },
  };
}

// ---------------------------------------------------------------------------
// Lập kế hoạch (thuần)
// ---------------------------------------------------------------------------

// Field Điều phối ghi từ Thống kê, theo từng danh mục (không có field vận hành).
const SPECS = {
  department: {
    naturalKeys: ["code", "name"],
    unique: ["code", "name"],
    pick: (r) => ({ code: r.code, name: r.name, description: r.description }),
  },
  position: {
    naturalKeys: ["name"],
    unique: [],
    pick: (r) => ({ name: r.name, note: r.note }),
  },
  shift: {
    naturalKeys: ["name"],
    unique: [],
    pick: (r) => ({ name: r.name, startTime: r.startTime, endTime: r.endTime }),
  },
  deviceType: {
    naturalKeys: ["name"],
    unique: [],
    pick: (r) => ({ name: r.name, group: r.group }),
  },
  deviceModel: {
    naturalKeys: ["name"],
    unique: [],
    pick: (r) => ({ name: r.name }),
  },
  device: {
    naturalKeys: ["code"],
    unique: [],
    pick: (r) => ({
      code: r.code,
      name: r.name,
      vehicleNumber: r.vehicleNumber,
      fuelType: r.fuelType,
      capacity: r.capacity,
      power: r.power,
    }),
  },
};

// Thứ tự xử lý: danh mục tham chiếu trước, thiết bị sau cùng.
const ORDER = ["department", "position", "shift", "deviceType", "deviceModel", "device"];

/**
 * @param tk     kết quả normalizeTk
 * @param dpmm   { department: [doc], position: [doc], ... } (lean)
 * @returns { plan: { [entity]: {...} }, summary }
 */
function buildPlan(tk, dpmm) {
  const plan = {};
  // tkId -> _id Điều phối đã biết (để giải tham chiếu của thiết bị)
  const refMaps = { department: new Map(), deviceType: new Map(), deviceModel: new Map() };

  for (const entity of ORDER) {
    const spec = SPECS[entity];
    const docs = dpmm[entity] || [];
    const { matches, onlyInDpmm } = matchRecords(tk[entity], docs, spec.naturalKeys);

    // Giá trị unique đang bị chiếm (kể cả bởi bản ghi sẽ được đổi) để phát
    // hiện xung đột trước khi ghi.
    const takenUnique = {};
    for (const u of spec.unique) {
      takenUnique[u] = new Map();
      for (const d of docs) if (norm(d[u])) takenUnique[u].set(norm(d[u]), String(d._id));
    }

    const out = { create: [], update: [], unchanged: 0, conflicts: [], onlyInDpmm: onlyInDpmm.map(brief) };

    for (const { tk: row, doc, by } of matches) {
      const fields = spec.pick(row);
      if (entity === "device") {
        // Tham chiếu: null nghĩa là sẽ được tạo ở bước trước nên chưa có _id.
        fields.__refs = {
          department: row.departmentTkId,
          category: row.categoryTkId,
          material: row.materialTkId,
        };
      }

      // Xung đột unique: giá trị đích đang thuộc bản ghi khác.
      const clash = spec.unique.find((u) => {
        const owner = takenUnique[u].get(norm(fields[u]));
        return owner && (!doc || owner !== String(doc._id));
      });
      if (clash) {
        out.conflicts.push({
          tkId: row.tkId,
          field: clash,
          value: fields[clash],
          reason: `Giá trị '${clash}' đã thuộc bản ghi Điều phối khác`,
        });
        continue;
      }
      for (const u of spec.unique) takenUnique[u].set(norm(fields[u]), doc ? String(doc._id) : `new:${row.tkId}`);

      if (!doc) {
        out.create.push({ tkId: row.tkId, fields });
        continue;
      }
      if (refMaps[entity]) refMaps[entity].set(row.tkId, doc._id);

      const { __refs, ...plain } = fields;
      let refPending = false;
      const changed = diffFields(doc, plain);
      // Cần gắn externalTkId cho bản ghi cũ lần đầu ghép được.
      if (String(doc.externalTkId || "") !== String(row.tkId)) changed.externalTkId = row.tkId;
      // Tham chiếu của thiết bị đổi?
      if (__refs) {
        for (const [field, tkRef] of Object.entries({ department: __refs.department, category: __refs.category, material: __refs.material })) {
          const map = refMaps[{ department: "department", category: "deviceType", material: "deviceModel" }[field]];
          const target = tkRef ? map.get(tkRef) : undefined;
          if (!tkRef) continue; // Thống kê không có giá trị -> giữ nguyên bên Điều phối
          if (!target) refPending = true; // danh mục đích sẽ được tạo ở bước trước, chưa có _id
          else if (String(doc[field] || "") !== String(target)) changed[field] = target;
        }
      }
      if (Object.keys(changed).length === 0 && !refPending) out.unchanged++;
      else out.update.push({ id: String(doc._id), tkId: row.tkId, by, set: changed, refPending });
    }
    plan[entity] = out;
  }

  const summary = {};
  for (const e of ORDER) {
    const p = plan[e];
    summary[e] = {
      create: p.create.length,
      update: p.update.length,
      unchanged: p.unchanged,
      conflicts: p.conflicts.length,
      onlyInDpmm: p.onlyInDpmm.length,
    };
  }
  summary.notes = tk.notes;
  return { plan, summary };
}

function brief(d) {
  return { id: String(d._id), code: d.code, name: d.name };
}

// ---------------------------------------------------------------------------
// Gọi API Thống kê (IO)
// ---------------------------------------------------------------------------

function config() {
  const baseUrl = process.env.TK_API_BASE_URL;
  const username = process.env.TK_SERVICE_USERNAME;
  const password = process.env.TK_SERVICE_PASSWORD;
  if (!baseUrl || !username || !password) {
    throw new Error(
      "Thiếu cấu hình TK_API_BASE_URL / TK_SERVICE_USERNAME / TK_SERVICE_PASSWORD trong .env",
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), username, password };
}

async function loginTk({ baseUrl, username, password }) {
  const { data } = await axios.post(
    `${baseUrl}/api/auth/login`,
    { username, password },
    { timeout: 15000 },
  );
  if (!data?.appToken) throw new Error("Thống kê không trả token đăng nhập");
  return data.appToken;
}

async function fetchAll(baseUrl, token, path) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await axios.get(`${baseUrl}${path}`, {
      params: { page, size: PAGE_SIZE, sort: "id,asc" },
      headers: { Authorization: `Bearer ${token}` },
      timeout: 30000,
    });
    if (!data?.success) throw new Error(data?.message || `Thống kê trả lỗi ở ${path}`);
    const body = data.data || {};
    rows.push(...(body.content || []));
    if (body.last || !body.content?.length) break;
  }
  return rows;
}

async function fetchTkCatalogs() {
  const cfg = config();
  const token = await loginTk(cfg);
  const [departments, positions, shifts, devices] = await Promise.all([
    fetchAll(cfg.baseUrl, token, "/api/departments"),
    fetchAll(cfg.baseUrl, token, "/api/positions"),
    fetchAll(cfg.baseUrl, token, "/api/shifts"),
    fetchAll(cfg.baseUrl, token, "/api/devices"),
  ]);
  return { departments, positions, shifts, devices };
}

// ---------------------------------------------------------------------------
// Chạy đồng bộ (IO)
// ---------------------------------------------------------------------------

const MODELS = () => ({
  department: require("../models/Department"),
  position: require("../models/Position"),
  shift: require("../models/Shift"),
  deviceType: require("../models/DeviceType"),
  deviceModel: require("../models/DeviceModel"),
  device: require("../models/Device"),
});

/**
 * @param {{dryRun?: boolean, tkData?: object}} opts  tkData: chỉ để test/tiêm dữ liệu
 */
async function syncCatalogsFromTk({ dryRun = true, tkData } = {}) {
  const models = MODELS();
  const raw = tkData || (await fetchTkCatalogs());
  const tk = normalizeTk(raw);

  const dpmm = {};
  for (const e of ORDER) dpmm[e] = await models[e].find({}).lean();

  const { plan, summary } = buildPlan(tk, dpmm);
  if (dryRun) return { dryRun: true, summary, plan };

  // Ghi thật theo thứ tự; giữ bảng tkId -> _id để giải tham chiếu thiết bị.
  const idMaps = { department: new Map(), deviceType: new Map(), deviceModel: new Map() };
  for (const d of dpmm.department) if (d.externalTkId) idMaps.department.set(String(d.externalTkId), d._id);
  for (const d of dpmm.deviceType) if (d.externalTkId) idMaps.deviceType.set(String(d.externalTkId), d._id);
  for (const d of dpmm.deviceModel) if (d.externalTkId) idMaps.deviceModel.set(String(d.externalTkId), d._id);

  const written = {};
  for (const entity of ORDER) {
    const Model = models[entity];
    const p = plan[entity];
    let created = 0;
    let updated = 0;

    for (const item of p.update) {
      const set = { ...item.set };
      if (entity === "device") resolveDeviceRefs(set, tk.device.find((r) => r.tkId === item.tkId), idMaps);
      if (Object.keys(set).length > 0) {
        await Model.updateOne({ _id: item.id }, { $set: set });
        updated++;
      }
      if (idMaps[entity]) idMaps[entity].set(item.tkId, item.id);
    }
    for (const item of p.create) {
      const { __refs, ...fields } = item.fields;
      const doc = { ...fields, externalTkId: item.tkId };
      if (entity === "device") {
        resolveDeviceRefs(doc, tk.device.find((r) => r.tkId === item.tkId), idMaps);
        doc.status = "available"; // trạng thái vận hành: chỉ đặt lúc tạo mới
      }
      const made = await Model.create(doc);
      if (idMaps[entity]) idMaps[entity].set(item.tkId, made._id);
      created++;
    }
    written[entity] = { created, updated };
  }
  return { dryRun: false, summary, written };
}

function resolveDeviceRefs(target, row, idMaps) {
  if (!row) return;
  const dep = row.departmentTkId && idMaps.department.get(row.departmentTkId);
  const cat = row.categoryTkId && idMaps.deviceType.get(row.categoryTkId);
  const mat = row.materialTkId && idMaps.deviceModel.get(row.materialTkId);
  if (dep) target.department = dep;
  if (cat) target.category = cat;
  if (mat) target.material = mat;
}

module.exports = {
  syncCatalogsFromTk,
  // xuất để test
  matchRecords,
  diffFields,
  normalizeTk,
  buildPlan,
  ORDER,
};
