const axios = require("axios");
const Device = require("../models/Device");
const DeviceType = require("../models/DeviceType");

// Đồng bộ danh mục thiết bị từ QL-TAISAN (nguồn gốc duy nhất cho thiết bị/xe
// máy) — QL-TAISAN là bên tạo/sửa thông tin gốc (tên, loại, công suất...),
// Điều phối chỉ đọc về và tự quản riêng phần vận hành (trạng thái đang dùng/
// rảnh, toạ độ GPS, file đính kèm) không đụng tới khi đồng bộ lại.
//
// Xác thực bằng X-Service-Key (service-to-service, không nhân danh user cụ
// thể) — xem ServiceKeyAuthFilter bên QL-TAISAN.
//
// Cấu hình cần có trong .env:
//   TAISAN_API_BASE_URL   ví dụ http://118.70.151.69:7755
//   TAISAN_SERVICE_KEY    key được QL-TAISAN cấp riêng cho Điều phối (SERVICE_KEY_DPMM)
//   TAISAN_ID_CONG_TY     idCongTy bên QL-TAISAN ứng với đơn vị đang chạy Điều phối này

async function fetchTaiSanList() {
  const baseUrl = process.env.TAISAN_API_BASE_URL;
  const serviceKey = process.env.TAISAN_SERVICE_KEY;
  const idCongTy = process.env.TAISAN_ID_CONG_TY;

  if (!baseUrl || !serviceKey || !idCongTy) {
    throw new Error(
      "Thiếu cấu hình TAISAN_API_BASE_URL / TAISAN_SERVICE_KEY / TAISAN_ID_CONG_TY trong .env",
    );
  }

  const { data } = await axios.get(`${baseUrl}/api/taisan`, {
    params: { idcongty: idCongTy },
    headers: { "X-Service-Key": serviceKey },
    timeout: 15000,
  });

  if (!data?.success) {
    throw new Error(data?.message || "QL-TAISAN trả về lỗi không xác định");
  }
  return Array.isArray(data.data) ? data.data : [];
}

// congSuat bên TaiSan là chuỗi tự do (vd. "150 HP", "12 tấn") — chỉ lấy được
// số nếu chuỗi đó parse thẳng ra number, còn lại giữ nguyên dạng text ở note
// thay vì cố ép về number rồi sai lệch đơn vị.
function parsePowerNumber(congSuat) {
  if (!congSuat) return undefined;
  const n = Number(String(congSuat).trim());
  return Number.isFinite(n) ? n : undefined;
}

async function upsertDeviceType(tenNhom, idNhomTaiSan) {
  if (!tenNhom) return undefined;
  const type = await DeviceType.findOneAndUpdate(
    { externalNhomTaiSanId: idNhomTaiSan },
    { $set: { name: tenNhom, externalNhomTaiSanId: idNhomTaiSan } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return type._id;
}

/**
 * Chạy đồng bộ 1 lần. Trả về thống kê để hiện cho người bấm nút biết kết quả
 * thật (không chỉ "thành công" chung chung).
 */
async function syncDevicesFromTaiSan() {
  const list = await fetchTaiSanList();

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const ts of list) {
    if (!ts.id) {
      skipped++;
      continue;
    }

    const categoryId = await upsertDeviceType(ts.tenNhom, ts.idNhomTaiSan);
    const power = parsePowerNumber(ts.congSuat);

    // CHỈ set các trường "gốc" lấy từ Tài sản — KHÔNG đụng tới status/
    // coordinates/files (Điều phối tự quản vận hành), khớp đúng quyết định
    // đã chốt: đồng bộ phần gốc, giữ riêng phần vận hành.
    const masterFields = {
      externalTaiSanId: ts.id,
      name: ts.tenTaiSan,
      code: ts.soKyHieu || ts.kyHieu || ts.id,
      vehicleNumber: ts.kyHieu,
    };
    if (categoryId) masterFields.category = categoryId;
    if (power !== undefined) masterFields.power = power;

    const result = await Device.updateOne(
      { externalTaiSanId: ts.id },
      {
        $set: masterFields,
        // status mặc định chỉ áp dụng lúc TẠO MỚI — thiết bị đã có giữ
        // nguyên trạng thái vận hành hiện tại.
        $setOnInsert: { status: "available" },
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) created++;
    else if (result.modifiedCount > 0) updated++;
  }

  return { total: list.length, created, updated, skipped };
}

module.exports = { syncDevicesFromTaiSan };
