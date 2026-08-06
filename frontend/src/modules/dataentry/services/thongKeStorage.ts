import type { TransportRecord, MiningRecord, ReconciliationItem } from '@/modules/dataentry/types/thong-ke';

const STORAGE_KEYS = {
  TRANSPORT: 'thongke_transport_records_v3',
  MINING: 'thongke_mining_records_v3',
};

// Seed Dữ liệu mẫu ban đầu để Màn hình Đối chiếu có dữ liệu trải nghiệm ngay
const SEED_TRANSPORT_RECORDS: TransportRecord[] = [
  {
    id: 'trans_rec_1',
    month: 8,
    day: 5,
    shift: 'Ca 1',
    vehicleNo: '14C-12345',
    operatorBadgeNo: '8753',
    excavationArea: 'Khe Chàm',
    excavatorEquipment: 'EX05',
    pickupLocation: 'Bãi sàng',
    unloadBench: '-145',
    pickupBenchGroup: '-25',
    fullRouteDistance: 5.5,
    fullRouteElevate: 100,
    localSlopeDist: 1.2,
    localSlopeDegree: 8,
    unloadLocationName: 'Kho than 5',
    isRainyDay: false,
    cargoType: 'Than',
    tripCount: 25,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'trans_rec_2',
    month: 8,
    day: 5,
    shift: 'Ca 1',
    vehicleNo: '14C-88888',
    operatorBadgeNo: '8753',
    excavationArea: 'Khe Chàm',
    excavatorEquipment: 'EX05',
    pickupLocation: 'Bãi sàng',
    unloadBench: '-145',
    pickupBenchGroup: '-25',
    fullRouteDistance: 5.5,
    fullRouteElevate: 100,
    localSlopeDist: 1.2,
    localSlopeDegree: 8,
    unloadLocationName: 'Kho than 5',
    isRainyDay: false,
    cargoType: 'Than',
    tripCount: 26,
    loadStatus: 'Roda (2/3)',
  },
  {
    id: 'trans_rec_3',
    month: 8,
    day: 5,
    shift: 'Ca 1',
    vehicleNo: '14C-11111',
    operatorBadgeNo: '8754',
    excavationArea: 'Khe Chàm',
    excavatorEquipment: 'EX05',
    pickupLocation: 'Bãi sàng',
    unloadBench: '-130',
    pickupBenchGroup: '-10',
    fullRouteDistance: 6.0,
    fullRouteElevate: 120,
    localSlopeDist: 1.3,
    localSlopeDegree: 10,
    unloadLocationName: 'Kho than 5',
    isRainyDay: true,
    cargoType: 'Đá',
    tripCount: 18,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'trans_rec_4',
    month: 8,
    day: 5,
    shift: 'Ca 1',
    vehicleNo: '14C-22222',
    operatorBadgeNo: '8753',
    excavationArea: 'Khe Chàm',
    excavatorEquipment: 'EX03',
    pickupLocation: 'Bãi sàng',
    unloadBench: '-130',
    pickupBenchGroup: '-10',
    fullRouteDistance: 6.0,
    fullRouteElevate: 120,
    localSlopeDist: 1.3,
    localSlopeDegree: 10,
    unloadLocationName: 'Kho than 5',
    isRainyDay: false,
    cargoType: 'Than',
    tripCount: 20,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'trans_rec_5',
    month: 8,
    day: 5,
    shift: 'Ca 2',
    vehicleNo: '14C-33333',
    operatorBadgeNo: '8754',
    excavationArea: 'Khe Chàm',
    excavatorEquipment: 'EX03',
    pickupLocation: 'Bãi giữa',
    unloadBench: '-130',
    pickupBenchGroup: '-10',
    fullRouteDistance: 6.0,
    fullRouteElevate: 120,
    localSlopeDist: 1.3,
    localSlopeDegree: 10,
    unloadLocationName: 'Kho than 5',
    isRainyDay: false,
    cargoType: 'Than',
    tripCount: 15,
    loadStatus: 'Roda (2/3)',
  },
  {
    id: 'trans_rec_6',
    month: 8,
    day: 5,
    shift: 'Ca 1',
    vehicleNo: '14C-44444',
    operatorBadgeNo: '8754',
    excavationArea: 'Khe Chàm',
    excavatorEquipment: 'EX07',
    pickupLocation: 'Bãi sàng',
    unloadBench: '-160',
    pickupBenchGroup: '-20',
    fullRouteDistance: 6.5,
    fullRouteElevate: 120,
    localSlopeDist: 1.4,
    localSlopeDegree: 12,
    unloadLocationName: 'Kho than 1',
    isRainyDay: true,
    cargoType: 'Than',
    tripCount: 22,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'trans_rec_7',
    month: 8,
    day: 5,
    shift: 'Ca 2',
    vehicleNo: '14C-55555',
    operatorBadgeNo: '8756',
    excavationArea: 'Khe Chàm',
    excavatorEquipment: 'EX07',
    pickupLocation: 'Bãi giữa',
    unloadBench: '-160',
    pickupBenchGroup: '-20',
    fullRouteDistance: 6.5,
    fullRouteElevate: 120,
    localSlopeDist: 1.4,
    localSlopeDegree: 12,
    unloadLocationName: 'Kho than 1',
    isRainyDay: false,
    cargoType: 'Đá',
    tripCount: 0,
    loadStatus: '-',
  },
  {
    id: 'trans_rec_8',
    month: 8,
    day: 5,
    shift: 'Ca 2',
    vehicleNo: '14C-66666',
    operatorBadgeNo: '8753',
    excavationArea: 'Khe Chàm',
    excavatorEquipment: 'EX05',
    pickupLocation: 'Bãi sàng',
    unloadBench: '-145',
    pickupBenchGroup: '-15',
    fullRouteDistance: 5.5,
    fullRouteElevate: 100,
    localSlopeDist: 1.2,
    localSlopeDegree: 8,
    unloadLocationName: 'Kho than 5',
    isRainyDay: false,
    cargoType: 'Than',
    tripCount: 24,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'trans_rec_9',
    month: 8,
    day: 5,
    shift: 'Ca 3',
    vehicleNo: '14C-77777',
    operatorBadgeNo: '8754',
    excavationArea: 'Núi Béo',
    excavatorEquipment: 'EX05',
    pickupLocation: 'Kho than 5',
    unloadBench: '-120',
    pickupBenchGroup: '-10',
    fullRouteDistance: 7.2,
    fullRouteElevate: 150,
    localSlopeDist: 1.3,
    localSlopeDegree: 12,
    unloadLocationName: 'Kho than 5',
    isRainyDay: false,
    cargoType: 'Than',
    tripCount: 16,
    loadStatus: 'Roda (2/3)',
  },
  {
    id: 'trans_rec_10',
    month: 8,
    day: 5,
    shift: 'Ca 3',
    vehicleNo: '14C-99999',
    operatorBadgeNo: '8756',
    excavationArea: 'Núi Béo',
    excavatorEquipment: 'EX03',
    pickupLocation: 'Kho than 1',
    unloadBench: '-120',
    pickupBenchGroup: '-10',
    fullRouteDistance: 7.2,
    fullRouteElevate: 150,
    localSlopeDist: 1.3,
    localSlopeDegree: 12,
    unloadLocationName: 'Kho than 1',
    isRainyDay: false,
    cargoType: 'Đá',
    tripCount: 14,
    loadStatus: 'Roda (2/3)',
  },
];

const SEED_MINING_RECORDS: MiningRecord[] = [
  {
    id: 'mine_rec_1',
    month: 8,
    day: 5,
    shift: 'Ca 1',
    transportVehicleNo: '14C-12345',
    operatorBadgeNo: '8753',
    mineCode: 'EX05',
    material: 'Than',
    tripCount: 25,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'mine_rec_2',
    month: 8,
    day: 5,
    shift: 'Ca 1',
    transportVehicleNo: '14C-88888',
    operatorBadgeNo: '8753',
    mineCode: 'EX05',
    material: 'Than',
    tripCount: 26,
    loadStatus: 'Roda (2/3)',
  },
  {
    id: 'mine_rec_3',
    month: 8,
    day: 5,
    shift: 'Ca 1',
    transportVehicleNo: '14C-11111',
    operatorBadgeNo: '8754',
    mineCode: 'EX05',
    material: 'Đá',
    tripCount: 17,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'mine_rec_4',
    month: 8,
    day: 5,
    shift: 'Ca 1',
    transportVehicleNo: '14C-22222',
    operatorBadgeNo: '8753',
    mineCode: 'EX03',
    material: 'Than',
    tripCount: 20,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'mine_rec_5',
    month: 8,
    day: 5,
    shift: 'Ca 2',
    transportVehicleNo: '14C-33333',
    operatorBadgeNo: '8754',
    mineCode: 'EX03',
    material: 'Than',
    tripCount: 15,
    loadStatus: 'Roda (2/3)',
  },
  {
    id: 'mine_rec_6',
    month: 8,
    day: 5,
    shift: 'Ca 1',
    transportVehicleNo: '14C-44444',
    operatorBadgeNo: '8754',
    mineCode: 'EX07',
    material: 'Than',
    tripCount: 21,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'mine_rec_7',
    month: 8,
    day: 5,
    shift: 'Ca 2',
    transportVehicleNo: '14C-55555',
    operatorBadgeNo: '8756',
    mineCode: 'EX07',
    material: 'Đá',
    tripCount: 1,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'mine_rec_8',
    month: 8,
    day: 5,
    shift: 'Ca 2',
    transportVehicleNo: '14C-66666',
    operatorBadgeNo: '8753',
    mineCode: 'EX05',
    material: 'Than',
    tripCount: 24,
    loadStatus: 'Đủ tải',
  },
  {
    id: 'mine_rec_9',
    month: 8,
    day: 5,
    shift: 'Ca 3',
    transportVehicleNo: '14C-77777',
    operatorBadgeNo: '8754',
    mineCode: 'EX05',
    material: 'Than',
    tripCount: 16,
    loadStatus: 'Roda (2/3)',
  },
  {
    id: 'mine_rec_10',
    month: 8,
    day: 5,
    shift: 'Ca 3',
    transportVehicleNo: '14C-99999',
    operatorBadgeNo: '8756',
    mineCode: 'EX03',
    material: 'Đá',
    tripCount: 15,
    loadStatus: 'Roda (2/3)',
  },
];

export const getTransportRecords = (): TransportRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSPORT);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSPORT, JSON.stringify(SEED_TRANSPORT_RECORDS));
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
      localStorage.setItem(STORAGE_KEYS.MINING, JSON.stringify(SEED_MINING_RECORDS));
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
export const getReconciliationItems = (filters?: ReconciliationFilters): ReconciliationItem[] => {
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
    if (filters.shift && filters.shift !== 'ALL') {
      transList = transList.filter((r) => r.shift === filters.shift);
      mineList = mineList.filter((r) => r.shift === filters.shift);
    }
    if (filters.vehicleNo) {
      const vNo = filters.vehicleNo.trim().toLowerCase();
      transList = transList.filter((r) => (r.vehicleNo || '').toLowerCase().includes(vNo));
      mineList = mineList.filter((r) => (r.transportVehicleNo || r.vehicleNo || '').toLowerCase().includes(vNo));
    }
    if (filters.fleet && filters.fleet !== 'ALL') {
      transList = transList.filter((r) => r.fleet === filters.fleet);
      mineList = mineList.filter((r) => r.fleet === filters.fleet);
    }
  }

  const makeKey = (r: { month?: number; day?: number; shift?: string; vehicleNo?: string; transportVehicleNo?: string }) => {
    const vNo = r.vehicleNo || r.transportVehicleNo || '';
    return `${r.month ?? 0}_${r.day ?? 0}_${r.shift ?? ''}_${vNo}`;
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
        shift: t.shift || 'Ca 1',
        vehicleNo: t.vehicleNo || '',
        tripCount: t.tripCount || 0,
        cargoType: t.cargoType || 'Than',
        fleet: t.fleet || 'PXVT1',
      },
      transportRecord: t,
      status: 'TRANSPORT_ONLY',
    });
  });

  // Process Mining
  mineList.forEach((m) => {
    const k = makeKey(m);
    const existing = itemsMap.get(k);
    if (existing) {
      existing.miningRecord = m;
      existing.status = 'BOTH';
    } else {
      itemsMap.set(k, {
        id: `rec_${k}`,
        commonKey: {
          month: m.month || 8,
          day: m.day || 5,
          shift: m.shift || 'Ca 1',
          vehicleNo: m.transportVehicleNo || '',
          tripCount: m.tripCount || 0,
          cargoType: m.material || 'Than',
          fleet: 'PXVT1',
        },
        miningRecord: m,
        status: 'MINING_ONLY',
      });
    }
  });

  return Array.from(itemsMap.values());
};
