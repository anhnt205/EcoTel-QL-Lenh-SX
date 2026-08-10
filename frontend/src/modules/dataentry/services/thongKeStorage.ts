import type {
  TransportRecord,
  MiningRecord,
  ReconciliationItem,
} from "@/modules/dataentry/types/thong-ke";

const STORAGE_KEYS = {
  TRANSPORT: "thongke_transport_records_v4",
  MINING: "thongke_mining_records_v3",
};

// Seed Dữ liệu mẫu ban đầu cho Nhập liệu & Đối chiếu Vận tải
const SEED_TRANSPORT_RECORDS: TransportRecord[] = [
  {
    id: "trans_rec_1",
    month: 8,
    day: 5,
    shift: "Ca 1",
    vehicleNo: "505",
    vehicleType: "HD 465-7R",
    equipmentUnit: "VT7",
    operatorBadgeNo: "8753",
    operatorName: "Nguyễn Xuân Bằng",
    operatorUnit: "VT7",
    createdBy: "Trần Hồng Sơn",
    excavationArea: "Khe Chàm",
    excavatorEquipment: "KC-MX01",
    pickupLocation: "Bãi sàng",
    pickupBench: "-40",
    pickupBenchGroup: "Nhóm -40",
    unloadBench: "8",
    fullRouteDistance: 5.5,
    fullRouteElevate: 100,
    localSlopeDist: 1.2,
    localSlopeDegree: 8,
    unloadLocationName: "Đá",
    cargoType: "Than",
    cargoGroup: "Nhóm Than N",
    tripCount: 25,
    loadStatus: "Đủ tải",
    isRainyDay: false,
    isTraineeVehicle: false,
    initialFuel: 1188,
    receivedFuel: 590,
    finalFuel: 831,
    fuelConsumption: 947,
  },
  {
    id: "trans_rec_2",
    month: 8,
    day: 5,
    shift: "Ca 1",
    vehicleNo: "506",
    vehicleType: "HD 465-7R",
    equipmentUnit: "VT7",
    operatorBadgeNo: "8754",
    operatorName: "Lê Văn Hùng",
    operatorUnit: "VT7",
    createdBy: "Trần Hồng Sơn",
    excavationArea: "Khe Chàm",
    excavatorEquipment: "KC-MX01",
    pickupLocation: "Bãi sàng",
    pickupBench: "-40",
    pickupBenchGroup: "Nhóm -40",
    unloadBench: "8",
    fullRouteDistance: 5.5,
    fullRouteElevate: 100,
    localSlopeDist: 1.2,
    localSlopeDegree: 8,
    unloadLocationName: "Kho 5",
    cargoType: "Than",
    cargoGroup: "Nhóm Than N",
    tripCount: 22,
    loadStatus: "Roda (2/3)",
    isRainyDay: false,
    isTraineeVehicle: true,
    initialFuel: 1050,
    receivedFuel: 500,
    finalFuel: 720,
    fuelConsumption: 830,
  },
  {
    id: "trans_rec_3",
    month: 8,
    day: 5,
    shift: "Ca 1",
    vehicleNo: "507",
    vehicleType: "CAT 777F",
    equipmentUnit: "VT2",
    operatorBadgeNo: "8755",
    operatorName: "Phạm Minh Tuấn",
    operatorUnit: "VT2",
    createdBy: "Nguyễn Văn Hoàn",
    excavationArea: "Cao Sơn",
    excavatorEquipment: "CS-MX02",
    pickupLocation: "Tầng -20",
    pickupBench: "-20",
    pickupBenchGroup: "Nhóm -20",
    unloadBench: "15",
    fullRouteDistance: 6.2,
    fullRouteElevate: 110,
    localSlopeDist: 1.4,
    localSlopeDegree: 9,
    unloadLocationName: "Bãi thải 3",
    cargoType: "Đá",
    cargoGroup: "Đá bóc",
    tripCount: 18,
    loadStatus: "Đủ tải",
    isRainyDay: true,
    isTraineeVehicle: false,
    initialFuel: 1200,
    receivedFuel: 600,
    finalFuel: 850,
    fuelConsumption: 950,
  },
  {
    id: "trans_rec_4",
    month: 8,
    day: 5,
    shift: "Ca 2",
    vehicleNo: "508",
    vehicleType: "HD 465-7R",
    equipmentUnit: "VT7",
    operatorBadgeNo: "8756",
    operatorName: "Trần Đức Hoàng",
    operatorUnit: "VT7",
    createdBy: "Trần Hồng Sơn",
    excavationArea: "Khe Chàm",
    excavatorEquipment: "KC-MX03",
    pickupLocation: "Bãi giữa",
    pickupBench: "-10",
    pickupBenchGroup: "Nhóm -10",
    unloadBench: "8",
    fullRouteDistance: 4.8,
    fullRouteElevate: 85,
    localSlopeDist: 1.0,
    localSlopeDegree: 7,
    unloadLocationName: "Bãi sàng 2",
    cargoType: "Than",
    cargoGroup: "Nhóm Than N",
    tripCount: 20,
    loadStatus: "Đủ tải",
    isRainyDay: false,
    isTraineeVehicle: false,
    initialFuel: 980,
    receivedFuel: 450,
    finalFuel: 650,
    fuelConsumption: 780,
  },
  {
    id: "trans_rec_5",
    month: 8,
    day: 5,
    shift: "Ca 2",
    vehicleNo: "509",
    vehicleType: "CAT 777F",
    equipmentUnit: "VT2",
    operatorBadgeNo: "8757",
    operatorName: "Vũ Thanh Sơn",
    operatorUnit: "VT2",
    createdBy: "Nguyễn Văn Hoàn",
    excavationArea: "Cao Sơn",
    excavatorEquipment: "CS-MX02",
    pickupLocation: "Bãi thải 1",
    pickupBench: "-15",
    pickupBenchGroup: "Nhóm -15",
    unloadBench: "20",
    fullRouteDistance: 7.0,
    fullRouteElevate: 130,
    localSlopeDist: 1.5,
    localSlopeDegree: 10,
    unloadLocationName: "Kho đá",
    cargoType: "Đá",
    cargoGroup: "Đá phong hóa",
    tripCount: 16,
    loadStatus: "Roda (2/3)",
    isRainyDay: false,
    isTraineeVehicle: true,
    initialFuel: 1300,
    receivedFuel: 550,
    finalFuel: 900,
    fuelConsumption: 950,
  },
  {
    id: "trans_rec_6",
    month: 8,
    day: 5,
    shift: "Ca 3",
    vehicleNo: "510",
    vehicleType: "HD 465-7R",
    equipmentUnit: "VT7",
    operatorBadgeNo: "8758",
    operatorName: "Đỗ Quốc Bảo",
    operatorUnit: "VT7",
    createdBy: "Trần Hồng Sơn",
    excavationArea: "Núi Béo",
    excavatorEquipment: "NB-MX05",
    pickupLocation: "Bãi sàng 3",
    pickupBench: "-30",
    pickupBenchGroup: "Nhóm -30",
    unloadBench: "10",
    fullRouteDistance: 5.8,
    fullRouteElevate: 95,
    localSlopeDist: 1.1,
    localSlopeDegree: 8,
    unloadLocationName: "Kho than 1",
    cargoType: "Than",
    cargoGroup: "Nhóm Than N",
    tripCount: 24,
    loadStatus: "Đủ tải",
    isRainyDay: false,
    isTraineeVehicle: false,
    initialFuel: 1100,
    receivedFuel: 520,
    finalFuel: 740,
    fuelConsumption: 880,
  },
  {
    id: "trans_rec_7",
    month: 8,
    day: 5,
    shift: "Ca 3",
    vehicleNo: "511",
    vehicleType: "Komatsu HD785",
    equipmentUnit: "VT5",
    operatorBadgeNo: "8759",
    operatorName: "Hoàng Văn Long",
    operatorUnit: "VT5",
    createdBy: "Nguyễn Văn Hoàn",
    excavationArea: "Núi Béo",
    excavatorEquipment: "NB-MX05",
    pickupLocation: "Tầng -50",
    pickupBench: "-50",
    pickupBenchGroup: "Nhóm -50",
    unloadBench: "25",
    fullRouteDistance: 8.0,
    fullRouteElevate: 160,
    localSlopeDist: 1.8,
    localSlopeDegree: 12,
    unloadLocationName: "Bãi thải 5",
    cargoType: "Đá",
    cargoGroup: "Đá cứng",
    tripCount: 15,
    loadStatus: "Đủ tải",
    isRainyDay: false,
    isTraineeVehicle: false,
    initialFuel: 1400,
    receivedFuel: 700,
    finalFuel: 950,
    fuelConsumption: 1150,
  },
  {
    id: "trans_rec_8",
    month: 8,
    day: 6,
    shift: "Ca 1",
    vehicleNo: "505",
    vehicleType: "HD 465-7R",
    equipmentUnit: "VT7",
    operatorBadgeNo: "8753",
    operatorName: "Nguyễn Xuân Bằng",
    operatorUnit: "VT7",
    createdBy: "Trần Hồng Sơn",
    excavationArea: "Khe Chàm",
    excavatorEquipment: "KC-MX01",
    pickupLocation: "Bãi sàng",
    pickupBench: "-40",
    pickupBenchGroup: "Nhóm -40",
    unloadBench: "8",
    fullRouteDistance: 5.5,
    fullRouteElevate: 100,
    localSlopeDist: 1.2,
    localSlopeDegree: 8,
    unloadLocationName: "Đá",
    cargoType: "Than",
    cargoGroup: "Nhóm Than N",
    tripCount: 26,
    loadStatus: "Đủ tải",
    isRainyDay: false,
    isTraineeVehicle: false,
    initialFuel: 1150,
    receivedFuel: 600,
    finalFuel: 800,
    fuelConsumption: 950,
  },
  {
    id: "trans_rec_9",
    month: 8,
    day: 6,
    shift: "Ca 1",
    vehicleNo: "506",
    vehicleType: "HD 465-7R",
    equipmentUnit: "VT7",
    operatorBadgeNo: "8754",
    operatorName: "Lê Văn Hùng",
    operatorUnit: "VT7",
    createdBy: "Trần Hồng Sơn",
    excavationArea: "Khe Chàm",
    excavatorEquipment: "KC-MX01",
    pickupLocation: "Bãi sàng",
    pickupBench: "-40",
    pickupBenchGroup: "Nhóm -40",
    unloadBench: "8",
    fullRouteDistance: 5.5,
    fullRouteElevate: 100,
    localSlopeDist: 1.2,
    localSlopeDegree: 8,
    unloadLocationName: "Kho 5",
    cargoType: "Than",
    cargoGroup: "Nhóm Than N",
    tripCount: 24,
    loadStatus: "Đủ tải",
    isRainyDay: false,
    isTraineeVehicle: false,
    initialFuel: 1080,
    receivedFuel: 550,
    finalFuel: 750,
    fuelConsumption: 880,
  },
  {
    id: "trans_rec_10",
    month: 8,
    day: 6,
    shift: "Ca 2",
    vehicleNo: "507",
    vehicleType: "CAT 777F",
    equipmentUnit: "VT2",
    operatorBadgeNo: "8755",
    operatorName: "Phạm Minh Tuấn",
    operatorUnit: "VT2",
    createdBy: "Nguyễn Văn Hoàn",
    excavationArea: "Cao Sơn",
    excavatorEquipment: "CS-MX02",
    pickupLocation: "Tầng -20",
    pickupBench: "-20",
    pickupBenchGroup: "Nhóm -20",
    unloadBench: "15",
    fullRouteDistance: 6.2,
    fullRouteElevate: 110,
    localSlopeDist: 1.4,
    localSlopeDegree: 9,
    unloadLocationName: "Bãi thải 3",
    cargoType: "Đá",
    cargoGroup: "Đá bóc",
    tripCount: 19,
    loadStatus: "Đủ tải",
    isRainyDay: false,
    isTraineeVehicle: false,
    initialFuel: 1220,
    receivedFuel: 580,
    finalFuel: 830,
    fuelConsumption: 970,
  },
];

const SEED_MINING_RECORDS: MiningRecord[] = [
  {
    id: "mine_rec_1",
    month: 8,
    day: 5,
    shift: "Ca 1",
    transportVehicleNo: "14C-12345",
    operatorBadgeNo: "8753",
    mineCode: "EX05",
    material: "Than",
    tripCount: 25,
    loadStatus: "Đủ tải",
  },
  {
    id: "mine_rec_2",
    month: 8,
    day: 5,
    shift: "Ca 1",
    transportVehicleNo: "14C-88888",
    operatorBadgeNo: "8753",
    mineCode: "EX05",
    material: "Than",
    tripCount: 26,
    loadStatus: "Roda (2/3)",
  },
  {
    id: "mine_rec_3",
    month: 8,
    day: 5,
    shift: "Ca 1",
    transportVehicleNo: "14C-11111",
    operatorBadgeNo: "8754",
    mineCode: "EX05",
    material: "Đá",
    tripCount: 17,
    loadStatus: "Đủ tải",
  },
  {
    id: "mine_rec_4",
    month: 8,
    day: 5,
    shift: "Ca 1",
    transportVehicleNo: "14C-22222",
    operatorBadgeNo: "8753",
    mineCode: "EX03",
    material: "Than",
    tripCount: 20,
    loadStatus: "Đủ tải",
  },
  {
    id: "mine_rec_5",
    month: 8,
    day: 5,
    shift: "Ca 2",
    transportVehicleNo: "14C-33333",
    operatorBadgeNo: "8754",
    mineCode: "EX03",
    material: "Than",
    tripCount: 15,
    loadStatus: "Roda (2/3)",
  },
  {
    id: "mine_rec_6",
    month: 8,
    day: 5,
    shift: "Ca 1",
    transportVehicleNo: "14C-44444",
    operatorBadgeNo: "8754",
    mineCode: "EX07",
    material: "Than",
    tripCount: 21,
    loadStatus: "Đủ tải",
  },
  {
    id: "mine_rec_7",
    month: 8,
    day: 5,
    shift: "Ca 2",
    transportVehicleNo: "14C-55555",
    operatorBadgeNo: "8756",
    mineCode: "EX07",
    material: "Đá",
    tripCount: 1,
    loadStatus: "Đủ tải",
  },
  {
    id: "mine_rec_8",
    month: 8,
    day: 5,
    shift: "Ca 2",
    transportVehicleNo: "14C-66666",
    operatorBadgeNo: "8753",
    mineCode: "EX05",
    material: "Than",
    tripCount: 24,
    loadStatus: "Đủ tải",
  },
  {
    id: "mine_rec_9",
    month: 8,
    day: 5,
    shift: "Ca 3",
    transportVehicleNo: "14C-77777",
    operatorBadgeNo: "8754",
    mineCode: "EX05",
    material: "Than",
    tripCount: 16,
    loadStatus: "Roda (2/3)",
  },
  {
    id: "mine_rec_10",
    month: 8,
    day: 5,
    shift: "Ca 3",
    transportVehicleNo: "14C-99999",
    operatorBadgeNo: "8756",
    mineCode: "EX03",
    material: "Đá",
    tripCount: 15,
    loadStatus: "Roda (2/3)",
  },
];

export const getTransportRecords = (): TransportRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSPORT);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.TRANSPORT,
        JSON.stringify(SEED_TRANSPORT_RECORDS),
      );
      return SEED_TRANSPORT_RECORDS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_TRANSPORT_RECORDS;
  }
};

export const saveTransportRecords = (records: TransportRecord[]) => {
  const current = getTransportRecords();
  const updated = [...records, ...current];
  localStorage.setItem(STORAGE_KEYS.TRANSPORT, JSON.stringify(updated));
};

export const getMiningRecords = (): MiningRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MINING);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEYS.MINING,
        JSON.stringify(SEED_MINING_RECORDS),
      );
      return SEED_MINING_RECORDS;
    }
    return JSON.parse(raw);
  } catch {
    return SEED_MINING_RECORDS;
  }
};

export const saveMiningRecords = (records: MiningRecord[]) => {
  const current = getMiningRecords();
  const updated = [...records, ...current];
  localStorage.setItem(STORAGE_KEYS.MINING, JSON.stringify(updated));
};

export interface ReconciliationFilters {
  month?: number;
  day?: number;
  shift?: string;
  vehicleNo?: string;
  fleet?: string;
}

// Generates side-by-side matched reconciliation list
export const getReconciliationItems = (
  filters?: ReconciliationFilters,
): ReconciliationItem[] => {
  let transList = getTransportRecords();
  let mineList = getMiningRecords();

  if (filters) {
    if (filters.month) {
      transList = transList.filter((r) => r.month === filters.month);
      mineList = mineList.filter((r) => r.month === filters.month);
    }
    if (filters.day) {
      transList = transList.filter((r) => r.day === filters.day);
      mineList = mineList.filter((r) => r.day === filters.day);
    }
    if (filters.shift && filters.shift !== "ALL") {
      transList = transList.filter((r) => r.shift === filters.shift);
      mineList = mineList.filter((r) => r.shift === filters.shift);
    }
    if (filters.vehicleNo) {
      const vNo = filters.vehicleNo.trim().toLowerCase();
      transList = transList.filter((r) =>
        (r.vehicleNo || "").toLowerCase().includes(vNo),
      );
      mineList = mineList.filter((r) =>
        (r.transportVehicleNo || r.vehicleNo || "").toLowerCase().includes(vNo),
      );
    }
    if (filters.fleet && filters.fleet !== "ALL") {
      transList = transList.filter((r) => r.fleet === filters.fleet);
      mineList = mineList.filter((r) => r.fleet === filters.fleet);
    }
  }

  const makeKey = (r: {
    month?: number;
    day?: number;
    shift?: string;
    vehicleNo?: string;
    transportVehicleNo?: string;
  }) => {
    const vNo = r.vehicleNo || r.transportVehicleNo || "";
    return `${r.month ?? 0}_${r.day ?? 0}_${r.shift ?? ""}_${vNo}`;
  };

  const itemsMap = new Map<string, ReconciliationItem>();

  // Process Transport
  transList.forEach((t) => {
    const k = makeKey(t);
    itemsMap.set(k, {
      id: `rec_${k}`,
      commonKey: {
        month: t.month || 8,
        day: t.day || 5,
        shift: t.shift || "Ca 1",
        vehicleNo: t.vehicleNo || "",
        tripCount: t.tripCount || 0,
        cargoType: t.cargoType || "Than",
        fleet: t.fleet || "PXVT1",
      },
      transportRecord: t,
      status: "TRANSPORT_ONLY",
    });
  });

  // Process Mining
  mineList.forEach((m) => {
    const k = makeKey(m);
    const existing = itemsMap.get(k);
    if (existing) {
      existing.miningRecord = m;
      existing.status = "BOTH";
    } else {
      itemsMap.set(k, {
        id: `rec_${k}`,
        commonKey: {
          month: m.month || 8,
          day: m.day || 5,
          shift: m.shift || "Ca 1",
          vehicleNo: m.transportVehicleNo || "",
          tripCount: m.tripCount || 0,
          cargoType: m.material || "Than",
          fleet: "PXVT1",
        },
        miningRecord: m,
        status: "MINING_ONLY",
      });
    }
  });

  return Array.from(itemsMap.values());
};
