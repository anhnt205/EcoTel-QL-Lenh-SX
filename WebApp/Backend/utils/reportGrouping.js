const TravelLog = require("../models/TravelLog");
const Model = require("../models/Model");
const Shift = require("../models/Shift");
const mongoose = require("mongoose");
const {
  ACCEPTED_PRODUCT,
  JPS_STATUS,
  SEAL_STATUS,
} = require("../config/config");
const dayjs = require("dayjs");
let pLimit = require("p-limit");
if (pLimit.default) pLimit = pLimit.default;

async function safeQuery(fn, retries = 3, delay = 300) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (err.code === 18 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay));
      } else throw err;
    }
  }
}

// giới hạn 100 query song song
const limit = pLimit(20);

// lenh sx vh xe
async function groupTripsVehicle(trips, date, shift) {
  // Sử dụng Promise.all với map để xử lý bất đồng bộ song song (tăng tốc độ)
  const formattedTrips = await Promise.all(
    trips.map(async (t) => {
      // Chuyển quantityUpdateTimes thành mảng để lặp
      const timesArray = (t.quantityUpdateTimes || []).map((i) => i?.time);

      // 1. TÍNH TOÁN VÀ GOM timeLogs
      // Sử dụng Promise.all để tìm TravelLog song song cho mỗi mốc thời gian
      let totalDistance = 0;

      const travelLog = await getTravellog(
        shift?._id,
        date,
        t.excavator?._id,
        t.toLocation?._id,
        t.material?.acceptedProduct,
      );

      const timeLogPromises = timesArray.map(async (time) => {
        const distance = travelLog ? travelLog.fullDistanceKm || 0 : 0;

        return {
          time: time,
          distance: distance,
        };
      });

      const timeLogs = await Promise.all(timeLogPromises);

      totalDistance = timeLogs.reduce((sum, log) => sum + log.distance, 0);

      // 2. TÍNH TOÁN KHỐI LƯỢNG VÀ TẤN
      // const value = await caculatorWeight(t.material?._id, t.device?.material, t.quantity, totalDistance, date);

      // 3. TRẢ VỀ ĐỐI TƯỢNG CHUYẾN ĐI MỚI (PHẲNG)
      return {
        device: t.device,
        excavator: t.excavator,
        location: t.toLocation,
        material: t.material,
        quantity: t.quantity,
        workingDate: t.workingDate,
        shift: t.shift?.name || 1,
        // Thông tin đã tính toán
        totalCubicMeter: t?.totalCubicMeter || 0, // Đổi tên thành totalCubicMeter để nhất quán, nhưng nó là của chuyến đi này
        totalTon: t?.totalTon || 0,
        production: t?.totalProduction || 0,
        timeLogs: timeLogs, // Mảng chứa {time, distance}
      };
    }),
  );

  return formattedTrips;
}

// san luong tkm
// groupTripsVehicleProduction and related utility functions remain the same as they were not requested for review
async function groupTripsVehicleProduction(trips) {
  const enrichedTrips = await Promise.all(
    trips.map((t) =>
      limit(async () => {
        const travelLog = await safeQuery(() =>
          getTravellog(
            t.shift?._id,
            t.workingDate,
            t.excavator?._id,
            t.toLocation?._id,
            t.material?.acceptedProduct,
          ),
        );

        return {
          device: t.device, //xe
          excavator: t.excavator, // máy xúc
          location: t.toLocation, // đổ tải
          distance: travelLog?.fullDistanceKm || "", // cung độ
          excavationLevel: travelLog?.excavationLevel || "", // tầng xúc
          fullLiftHeightM: travelLog?.fullLiftHeightM || "", // độ cao nâng tải
          material: t.material, // vật liệu
          quantity: t.quantity, // số chuyến
          workingDate: t.workingDate, // ngày
          shift: t.shift?.name || 1, // ca
          production: t.totalProduction, // tkm
          totalCubicMeter: t.totalCubicMeter, // khối lượng(m3)
          totalTon: t?.totalTon, // trọng lượng(tấn)
        };
      }),
    ),
  );
  enrichedTrips.sort((a, b) => {
    const shiftA = a.shift || 1;
    const shiftB = b.shift || 1;

    return shiftA - shiftB;
  });

  const groupsMap = {};

  for (const t of enrichedTrips) {
    const product = t.material?.acceptedProduct; // LAND / COAL
    if (!product) continue;

    // ===== KEY CHỈ TIÊU (để quyết định header động, tránh trùng) =====
    const locationName = t.location?.name || "";
    const excavationLevel = t.excavationLevel || "";
    const fullLiftHeightM = t.fullLiftHeightM || "";
    const excavatorCode = t.excavator?.code || "";
    const distance = t.distance || "";
    const materialName = t.material?.name || "";

    // Nhóm ban đầu theo ca + device
    const deviceCode = t.device?.code || "";
    const shiftName = t.shift || ""; // đã là 1 / 2 / 3

    const key = [
      product,
      locationName,
      excavationLevel,
      fullLiftHeightM,
      excavatorCode,
      distance,
      materialName,
      deviceCode,
      shiftName,
    ].join("|");

    if (!groupsMap[key]) {
      groupsMap[key] = {
        product, // LAND / COAL
        locationName,
        excavationLevel,
        fullLiftHeightM,
        excavatorCode,
        distance,
        materialName,

        // các xe/ca tham gia nhóm này
        deviceCode,
        shiftName,

        // số liệu cần cộng dồn
        quantity: 0, // số chuyến
        totalCubicMeter: 0, // m3 (cho ĐẤT)
        totalTon: 0, // tấn (cho THAN)
        production: 0, // Tkm
      };
    }

    const g = groupsMap[key];
    g.deviceCode = deviceCode;
    g.shiftName = shiftName;

    const qty = t.quantity || 0;
    g.quantity += qty;
    g.totalCubicMeter += t.totalCubicMeter || 0;
    g.totalTon += t.totalTon || 0;
    g.production += t.production || t.totalProduction || 0;
  }

  const landGroups = [];
  const coalGroups = [];

  Object.values(groupsMap).forEach((g) => {
    const normalized = {
      product: g.product,
      locationName: g.locationName,
      excavationLevel: g.excavationLevel,
      fullLiftHeightM: g.fullLiftHeightM,
      excavatorCode: g.excavatorCode,
      distance: g.distance,
      materialName: g.materialName,
      // devices: Array.from(g.devices), // có thể join(', ') để show
      // shifts: Array.from(g.shifts),
      deviceCode: g.deviceCode,
      shift: g.shiftName,

      quantity: g.quantity,
      totalCubicMeter: g.totalCubicMeter,
      totalTon: g.totalTon,
      production: g.production,
    };

    if (g.product === ACCEPTED_PRODUCT.LAND) landGroups.push(normalized);
    else if (g.product === ACCEPTED_PRODUCT.COAL) coalGroups.push(normalized);
  });

  // sort cho đẹp: theo location rồi material
  landGroups.sort(
    (a, b) =>
      (a.locationName || "").localeCompare(b.locationName || "") ||
      (a.materialName || "").localeCompare(b.materialName || "") ||
      (a.deviceCode || "").localeCompare(b.deviceCode || "", undefined, {
        numeric: true,
      }),
  );

  coalGroups.sort(
    (a, b) =>
      (a.locationName || "").localeCompare(b.locationName || "") ||
      (a.materialName || "").localeCompare(b.materialName || "") ||
      (a.deviceCode || "").localeCompare(b.deviceCode || "", undefined, {
        numeric: true,
      }),
  );

  // tổng để đổ vào cột TỔNG ĐẤT / TỔNG THAN
  const totals = {
    land: {
      quantity: landGroups.reduce((s, g) => s + g.quantity, 0),
      m3: landGroups.reduce((s, g) => s + g.totalCubicMeter, 0),
      tkm: landGroups.reduce((s, g) => s + g.production, 0),
    },
    coal: {
      quantity: coalGroups.reduce((s, g) => s + g.quantity, 0),
      ton: coalGroups.reduce((s, g) => s + g.totalTon, 0),
      tkm: coalGroups.reduce((s, g) => s + g.production, 0),
    },
  };

  return { landGroups, coalGroups, totals };
}

// bao cao san luong van chuyen dat da
const _ = require("lodash");

async function groupProductionLand(trips) {
  const enrichedTrips = await Promise.all(
    trips.map((t) => ({
      deviceMaterial: t.device?.material?.name || "Khác", // Vật liệu gắn với xe (Header)
      excavatorCode: t.excavator?.code || "Không rõ", // Mã máy xúc (Dòng chi tiết)

      // --- NHÓM CẤP CAO (I, II) ---
      mainGroup: t.material?.name?.trim() || "Vật liệu khác", // Vật liệu thực tế (Cấp I/II)

      // --- NHÓM CẤP CON (1, 2, 3) ---
      subGroup: t.excavator?.material?.name?.trim() || "", // Chủng loại máy xúc

      quantity: t.quantity,
      totalCubicMeter: t.totalCubicMeter,
      production: t.totalProduction, // Tkm
      totalTon: t.totalTon || 0,
    })),
  );

  // 1. Nhóm ngoài cùng: theo deviceMaterial (Tạo cột Header)
  const groupedByDeviceMaterial = _.groupBy(enrichedTrips, "deviceMaterial");

  const result = Object.entries(groupedByDeviceMaterial).map(
    ([deviceMaterial, items]) => {
      // 🎯 THAY ĐỔI: Nhóm theo khóa tổng hợp (mainGroup + subGroup + excavatorCode)
      // Thay vì nhóm theo 'excavatorCode', chúng ta nhóm theo cả 3 cấp phân cấp.
      const groupedByHierarchy = _.groupBy(items, (item) => {
        return `${item.mainGroup}|${item.subGroup}|${item.excavatorCode}`;
      });

      // Bây giờ, 'list' sẽ là một nhóm các chuyến xe có cùng MainGroup, SubGroup, và Excavator
      const allExcavators = Object.values(groupedByHierarchy).map((list) => {
        // Lấy thông tin nhóm từ item đầu tiên (nay đã an toàn vì tất cả đều giống nhau)
        const firstItem = list[0];

        return {
          excavator: firstItem.excavatorCode, // Tên máy xúc
          deviceMaterial, // Loại xe (từ vòng lặp bên ngoài)

          // Các nhóm này giờ là duy nhất cho hàng này
          mainGroup: firstItem.mainGroup,
          subGroup: firstItem.subGroup,

          // Tính tổng CHỈ cho nhóm cụ thể này
          totalTrips: _.sumBy(list, "quantity"),
          totalM3: _.sumBy(list, "totalCubicMeter"),
          totalTkm: _.sumBy(list, "production"),
          totalTon: _.sumBy(list, "totalTon"),
        };
      });

      // 🧩 Tổng toàn nhóm vật liệu (Cấp ngoài cùng)
      const totalTrips = _.sumBy(items, "quantity");
      const totalM3 = _.sumBy(items, "totalCubicMeter");
      const totalTkm = _.sumBy(items, "production");
      const totalTon = _.sumBy(items, "totalTon");

      return {
        deviceMaterial,
        totalTrips,
        totalM3,
        totalTkm,
        totalTon,
        // Trả về danh sách máy xúc chi tiết đã được nhóm đúng
        excavators: allExcavators,
      };
    },
  );

  return (
    result
      // Sắp xếp cấp ngoài cùng theo deviceMaterial
      .sort((a, b) =>
        (a.deviceMaterial || "").localeCompare(b.deviceMaterial || ""),
      )
      .map((group) => ({
        ...group,
        // Sắp xếp tiếp danh sách excavators trong mỗi group
        excavators: group.excavators.sort(
          (x, y) =>
            (x.mainGroup || "").localeCompare(y.mainGroup || "") ||
            (x.subGroup || "").localeCompare(y.subGroup || "", undefined, {
              numeric: true,
            }) ||
            (x.excavator || "").localeCompare(y.excavator || "", undefined, {
              numeric: true,
            }),
        ),
      }))
  );
}

// nang suat dau xe
async function groupTripsVehicleProductivity(trips) {
  const result = {};

  for (const t of trips) {
    const modelName = t.device?.material?.name || "Không rõ loại xe";
    const carCode = t.device?.code || "Không rõ xe";
    const productType = t.material?.acceptedProduct; // LAND / COAL
    const workingDate = dayjs(t.workingDate).format("YYYY-MM-DD");
    const shift = t.shift?.name || 1;

    // 🔑 GỘP THEO XE + NGÀY (bỏ shift)
    const key = `${carCode}_${workingDate}`;

    const cubic = t.totalCubicMeter || 0;
    const ton = t.totalTon || 0;
    const tkm = t.totalProduction || 0;

    if (!result[modelName]) {
      result[modelName] = {
        modelName,
        vehicles: {},
        summary: {
          land: { trips: 0, m3: 0, tkm: 0 },
          coal: { trips: 0, ton: 0, tkm: 0 },
          totalTkm: 0,
        },
      };
    }

    const modelGroup = result[modelName];

    // 🔹 Tạo nhóm xe/ngày
    if (!modelGroup.vehicles[key]) {
      modelGroup.vehicles[key] = {
        carCode,
        workingDate,
        shiftSet: new Set(), // để theo dõi số ca khác nhau
        totalShifts: 0,
        land: { trips: 0, m3: 0, tkm: 0 },
        coal: { trips: 0, ton: 0, tkm: 0 },
        totalTkm: 0,
      };
    }

    const record = modelGroup.vehicles[key];

    // Ghi nhận ca
    record.shiftSet.add(shift);
    record.totalShifts = record.shiftSet.size;

    // --- Cộng dồn dữ liệu ---
    if (productType === ACCEPTED_PRODUCT.LAND) {
      record.land.trips += 1;
      record.land.m3 += cubic;
      record.land.tkm += tkm;

      modelGroup.summary.land.trips += 1;
      modelGroup.summary.land.m3 += cubic;
      modelGroup.summary.land.tkm += tkm;
    } else if (productType === ACCEPTED_PRODUCT.COAL) {
      record.coal.trips += 1;
      record.coal.ton += ton;
      record.coal.tkm += tkm;

      modelGroup.summary.coal.trips += 1;
      modelGroup.summary.coal.ton += ton;
      modelGroup.summary.coal.tkm += tkm;
    }

    record.totalTkm = record.land.tkm + record.coal.tkm;
    modelGroup.summary.totalTkm =
      modelGroup.summary.land.tkm + modelGroup.summary.coal.tkm;
  }

  return Object.values(result).map((m) => ({
    modelName: m.modelName,
    summary: m.summary,
    vehicles: Object.values(m.vehicles)
      .map((v) => ({
        carCode: v.carCode,
        workingDate: v.workingDate,
        shift: v.totalShifts, // 👉 số ca làm trong ngày
        land: v.land,
        coal: v.coal,
        totalTkm: v.totalTkm,
      }))
      .sort((a, b) => a.workingDate.localeCompare(b.workingDate)),
  }));
}

async function groupExcavator(trips, date) {
  const groups = {};

  for (const t of trips) {
    const key = `${t.device}`;
    if (!groups[key]) {
      groups[key] = {
        device: t.device,
        materials: [],
        workingDate: t.workingDate,
        shift: t.shift || 1,
        totalCubicMeter: 0,
        totalTon: 0,
      };
    }
    // const value = await caculatorWeight(t.material?._id, t.device?.material, t.quantity, 0, date)
    groups[key].totalCubicMeter += t?.totalCubicMeter || 0;
    groups[key].totalTon += t?.totalTon || 0;

    groups[key].materials.push({
      material: t.material,
      quantity: t.quantity,
      cubicMeter: t?.totalCubicMeter || 0,
      ton: t?.totalTon || 0,
      times: (t.quantityUpdateTimes || []).map((i) => i?.time),
    });
  }

  return Object.values(groups);
}
async function groupProduction(reports, shiftReport) {
  const vehicles = {};

  for (const r of reports) {
    const deviceCode = r.device?.code;
    if (!deviceCode) continue;

    if (!vehicles[deviceCode]) {
      const fuelData = (shiftReport?.vehicleSummaries || []).find(
        (v) => v.vehicle?._id.toString() === r.device._id.toString(),
      );

      vehicles[deviceCode] = {
        device: deviceCode,
        excavators: new Set(),
        coalTrip: 0,
        landTrip: 0,
        distances: [],
        fuelRemain: fuelData?.fuelRemain || "",
        fuelReceived: fuelData?.fuelReceived || "",
        fuelRemainEnd: fuelData?.fuelRemainEnd || "",
        fuelRemainUsed: fuelData
          ? fuelData.fuelRemain + fuelData.fuelReceived - fuelData.fuelRemainEnd
          : "",
        travelHours: fuelData?.travelHours || "",
        gpsStatus: fuelData?.gpsStatus === JPS_STATUS.GOOD ? true : false,
        sealStatus: fuelData?.sealStatus === SEAL_STATUS.GOOD ? true : false,
      };
    }

    const v = vehicles[deviceCode];

    // Máy xúc
    if (r.excavator?.code) v.excavators.add(r.excavator.code);

    // Than / đất
    if (r.material?.acceptedProduct === ACCEPTED_PRODUCT.COAL) {
      v.coalTrip += r.quantity || 0;
    } else if (r.material?.acceptedProduct === ACCEPTED_PRODUCT.LAND) {
      v.landTrip += r.quantity || 0;
    }

    // Cung độ

    const distanceData = await getTravellog(
      r.shift,
      r.workingDate,
      r.excavator?._id,
      r.toLocation?._id,
      r.material?.acceptedProduct,
    );

    const updateTimes = (r.quantityUpdateTimes || []).length;
    const totalDistance = (distanceData?.fullDistanceKm || 0) * updateTimes;

    if (totalDistance > 0) {
      v.distances.push(totalDistance);
    }
  }

  // Convert Set → Array
  for (const k in vehicles) {
    vehicles[k].excavators = [...vehicles[k].excavators];
  }

  return Object.values(vehicles);
}

function groupTripsExcavator(trips) {
  const groups = {};

  trips.forEach((t) => {
    const key = `${t.device?._id || t.device?.code}_${t.material?._id}`;

    if (!groups[key]) {
      groups[key] = {
        device: t.device,
        trips: [],
        summary: {},
        totalTrips: 0,
      };
    }

    const timesArray = (t?.quantityUpdateTimes || []).map((i) => i?.time);
    timesArray.forEach((time) => {
      // 🔹 Chỉ thêm nếu chưa có cùng material + time trong trips
      const alreadyExists = groups[key].trips.some(
        (trip) =>
          trip.material?._id?.toString() === t.material?._id?.toString() &&
          new Date(trip.time).getTime() === new Date(time).getTime(),
      );

      if (!alreadyExists) {
        groups[key].trips.push({
          material: t.material,
          time,
        });
      }
    });

    const materialName =
      typeof t.material === "string"
        ? t.material
        : t.material?.name || "Không rõ";

    if (!groups[key].summary[materialName]) {
      groups[key].summary[materialName] = 0;
    }
    groups[key].summary[materialName] += t.quantity;
    groups[key].totalTrips += t.quantity;
  });

  Object.values(groups).forEach((g) => {
    g.trips.sort((a, b) => new Date(a.time) - new Date(b.time));
  });

  return Object.values(groups);
}
// nhóm báo chuyến ô tô
async function groupTripsCar(trips) {
  const groups = {};

  for (const t of trips) {
    const key = `${t.device}-${t.excavator}-${t.toLocation}`;
    if (!groups[key]) {
      groups[key] = {
        device: t.device,
        excavator: t.excavator,
        toLocation: t.toLocation,
        trips: [],
        summary: {},
        totalTrips: 0,
        totalDistance: 0,
      };
    }
    const timesArray = t.quantityUpdateTimes || [];
    for (const time of timesArray) {
      const travelLog = await getTravellog(
        t.shift?._id,
        t.workingDate,
        t.excavator?._id,
        t.toLocation?._id,
        t.material?.acceptedProduct,
      );

      const distance = travelLog ? travelLog.fullDistanceKm : 0;
      groups[key].trips.push({
        material: t.material,
        time: time?.time,
        distance,
        quantity: time?.quantity || 1,
      });
      if (!groups[key].summary[t.material?.name]) {
        groups[key].summary[t.material?.name] = { count: 0, distance: 0 };
      }
      groups[key].summary[t.material?.name].count += time?.quantity;
      groups[key].summary[t.material?.name].distance += distance;

      groups[key].totalTrips += time?.quantity;
      groups[key].totalDistance += distance;
    }
  }

  Object.values(groups).forEach((g) => {
    g.trips.sort((a, b) => new Date(a.time) - new Date(b.time));
  });

  return Object.values(groups);
}

// nhóm tổng hợp ô tô
async function groupCar(trips) {
  const groups = {};

  for (const t of trips) {
    const key = `${t.excavator?.code}-${t.toLocation?.name}`;
    if (!groups[key]) {
      groups[key] = {
        excavator: t.excavator?.code,
        toLocation: t.toLocation?.name,
        materials: {},
        totalTrips: 0, // Khởi tạo biến tổng
        totalDistance: 0,
      };
    }

    const materialName = t.material?.name || "Không xác định";

    // --- KHỞI TẠO MATERIAL TẠI ĐÂY (Ngoài vòng lặp times) ---
    if (!groups[key].materials[materialName]) {
      groups[key].materials[materialName] = {
        material: t.material,
        times: [],
        distances: [],
        count: 0,
        totalDistance: 0,
      };
    }

    const timesArray = t.quantityUpdateTimes || [];

    // Nếu có dữ liệu thời gian thì mới xử lý cộng dồn
    for (const time of timesArray) {
      const travelLog = await getTravellog(
        t.shift?._id,
        t.workingDate,
        t.excavator?._id,
        t.toLocation?._id,
        t.material?.acceptedProduct,
      );

      const distance = travelLog ? travelLog.fullDistanceKm : 0;
      const quantity = time?.quantity || 0;

      const targetMat = groups[key].materials[materialName];
      targetMat.times.push(time?.time);
      targetMat.distances.push(distance);
      targetMat.count += quantity;
      targetMat.totalDistance += distance;

      groups[key].totalTrips += quantity;
      groups[key].totalDistance += distance;
    }
  }

  // Phần logic sort và format giữ nguyên
  return Object.values(groups).map((g) => {
    const materialsArray = Object.values(g.materials).map((m) => {
      const combined = m.times.map((time, i) => ({
        time,
        distance: m.distances[i],
      }));

      // Chỉ sort khi có dữ liệu thời gian
      if (combined.length > 0) {
        combined.sort((a, b) => new Date(a.time) - new Date(b.time));
        m.times = combined.map((c) => c.time);
        m.distances = combined.map((c) => c.distance);
      }
      return m;
    });

    return {
      ...g,
      materials: materialsArray,
    };
  });
}

// nhóm người nhận, phụ máy
function getCombinedUsers(order) {
  const combined = [];

  if (order.assignedTo) {
    combined.push({
      fullName: order.assignedTo.fullName,
      salaryCode: order.assignedTo.salaryCode,
    });
  }

  if (order.assistants && order.assistants.length > 0) {
    order.assistants.forEach((ast) => {
      combined.push({
        fullName: `- ${ast.fullName}`,
        salaryCode: ast.salaryCode,
      });
    });
  }

  return combined;
}

// nhóm theo máy gạt
function groupDozer(trips) {
  const groups = {};

  trips.forEach((t) => {
    const key = `${t.device}`;
    if (!groups[key]) {
      groups[key] = {
        device: t.device,
        materials: [],
      };
    }
    groups[key].materials.push({
      material: t.material,
      workingMinutes: t.workingMinutes,
    });
  });

  return Object.values(groups);
}
// nhóm theo máy khoan
function groupDrill(trips) {
  const groups = {};

  trips.forEach((t) => {
    const key = `${t.device}`;
    if (!groups[key]) {
      groups[key] = {
        device: t.device,
        materials: [],
      };
    }
    groups[key].materials.push({
      material: t.material,
      drillDepth: t.drillDepth,
      hardnessF: t.hardnessF,
    });
  });

  return Object.values(groups);
}

// khoi luong, trong luong tam tinh

// acceptedProduct (tuỳ chọn): loại sản phẩm nghiệm thu của vật liệu cần dùng để tính. Chuyến của lệnh đã hoàn thành
// truyền loại ĐÃ CHỐT (xem services/reportSnapshot.js) để việc đổi loại sản phẩm của vật liệu về sau không làm đổi
// sản lượng cũ; không truyền thì lấy theo vật liệu hiện tại như trước.
async function caculatorWeight(
  materialId,
  deviceModel,
  quantity,
  totalDistance,
  date,
  acceptedProduct,
) {
  let cubicMeter = 0;
  let ton = 0;
  let production = 0;

  const data = await Model.findOne({
    material: materialId,
    deviceModel: deviceModel,
  }).populate("material", "name acceptedProduct valueHistory");

  if (!data || !data.material) return { cubicMeter, ton, production };
  const material = data?.material;

  // 🧠 Tính tỷ trọng tại thời điểm `date`
  const dryDensity = getTyTrongAtDate(material, normalizeDateToUTC(date));
  const valueModel = getMohinhAtDate(data, normalizeDateToUTC(date));

  const product = acceptedProduct || data.material?.acceptedProduct;
  if (product === ACCEPTED_PRODUCT.COAL) {
    ton = valueModel * (quantity || 0) * dryDensity;
    production = valueModel * (totalDistance || 0) * dryDensity;
  } else if (product === ACCEPTED_PRODUCT.LAND) {
    cubicMeter = valueModel * (quantity || 0);
    production = (totalDistance || 0) * valueModel * dryDensity;
  }
  return {
    cubicMeter: Number(cubicMeter.toFixed(1)),
    ton: Number(ton.toFixed(1)),
    production: Number(production.toFixed(1)),
  };
}

function getTyTrongAtDate(material, date) {
  if (!material) return 0;

  const histories = Array.isArray(material.valueHistory)
    ? material.valueHistory
    : [];
  const target = new Date(date);

  if (histories.length === 0) return 0;

  // sắp xếp theo thời gian bắt đầu tăng dần
  const sorted = histories.sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime),
  );

  // duyệt để tìm mốc chứa ngày target
  for (const h of sorted) {
    const start = new Date(h.startTime);
    const end = new Date(h.endTime);

    if (target >= start && target <= end) {
      return h.dryDensity ?? 0;
    }
  }

  return 0;
}
function getMohinhAtDate(model, date) {
  if (!model) return 0;

  const histories = Array.isArray(model.valueHistory) ? model.valueHistory : [];
  const target = new Date(date);

  if (histories.length === 0) return 0;

  // sắp xếp theo thời gian bắt đầu tăng dần
  const sorted = histories.sort(
    (a, b) => new Date(a.startTime) - new Date(b.startTime),
  );

  // duyệt để tìm mốc chứa ngày target
  for (const h of sorted) {
    const start = new Date(h.startTime);
    const end = new Date(h.endTime);

    if (target >= start && target <= end) {
      return h.value ?? 0;
    }
  }

  return 0;
}

async function getTravellog(
  shift,
  workingDate,
  excavator,
  location,
  acceptedProduct,
) {
  const { rangeStart, rangeEnd } = rangeTime(workingDate);
  // 2. Chạy Aggregate tìm bản ghi mới nhất trong khoảng
  const logs = await TravelLog.aggregate([
    {
      $match: {
        excavator: new mongoose.Types.ObjectId(excavator),
        location: new mongoose.Types.ObjectId(location),
        acceptedProduct: acceptedProduct,
        // Chỉ quét trong phạm vi các ngày thuộc mốc (ví dụ 10-14)
        workingDate: {
          $gte: rangeStart,
          $lte: rangeEnd,
        },
      },
    },
    {
      $lookup: {
        from: "shifts",
        localField: "shift",
        foreignField: "_id",
        as: "shiftData",
      },
    },
    { $unwind: "$shiftData" },
    {
      $addFields: {
        // Chuyển tên ca thành số để sort chính xác (Ca 3 > Ca 1)
        shiftNumber: { $toInt: "$shiftData.name" },
      },
    },
    {
      $sort: {
        workingDate: -1, // Ngày mới nhất lên đầu
        shiftNumber: -1, // Trong cùng ngày, ca cao nhất lên đầu
      },
    },
    { $limit: 1 },
  ]);
  console.log(logs);

  return logs[0] || null;
}

function rangeTime(workingDate) {
  const dateObj = new Date(workingDate);
  const day = dateObj.getDate();
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();

  // 1. Xác định mốc bắt đầu (startDay) và kết thúc (endDay) của khoảng
  let startDay, endDay;

  if (day <= 4) {
    startDay = 1;
    endDay = 4;
  } else if (day <= 9) {
    startDay = 5;
    endDay = 9;
  } else if (day <= 14) {
    startDay = 10;
    endDay = 14;
  } else if (day <= 19) {
    startDay = 15;
    endDay = 19;
  } else if (day <= 24) {
    startDay = 20;
    endDay = 24;
  } else {
    startDay = 25;
    endDay = new Date(year, month + 1, 0).getDate();
  }

  const pad = (n) => n.toString().padStart(2, "0");
  const startStr = `${year}-${pad(month + 1)}-${pad(startDay)}T00:00:00.000Z`;
  const endStr = `${year}-${pad(month + 1)}-${pad(endDay)}T23:59:59.999Z`;

  const rangeStart = new Date(startStr);
  const rangeEnd = new Date(endStr);
  return {
    rangeStart,
    rangeEnd,
  };
}

function normalizeDateToUTC(date) {
  const d = new Date(date);
  // bỏ phần giờ/phút/giây để chỉ so sánh theo ngày
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

module.exports = {
  groupTripsVehicle,
  getCombinedUsers,
  groupTripsExcavator,
  groupTripsCar,
  groupExcavator,
  groupDozer,
  groupDrill,
  groupCar,
  groupProduction,
  groupTripsVehicleProduction,
  safeQuery,
  caculatorWeight,
  groupTripsVehicleProductivity,
  groupProductionLand,
  getTravellog,
  rangeTime,
};
