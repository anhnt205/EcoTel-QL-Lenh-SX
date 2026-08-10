import { transportEntrySchema, miningEntrySchema } from '../schemas/thong-ke.schema';
import type { ImportRowValidationResult, RoleType } from '@/modules/dataentry/types/thong-ke';
import { lookupVehicleInfo, lookupOperatorInfo } from './lookup';

// Map alias cột Excel tiếng Việt ↔ System Field
export const mapExcelRowToSystemFields = (row: Record<string, any>, role: RoleType): Record<string, any> => {
  const getVal = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== '') return row[k];
    }
    return undefined;
  };

  const parseNum = (val: any) => {
    if (val === undefined || val === null || val === '') return undefined;
    const n = Number(val);
    return isNaN(n) ? undefined : n;
  };

  const common = {
    month: Number(getVal('THANG', 'Tháng', 'month') ?? 5),
    day: Number(getVal('Ngày', 'Ngay', 'day') ?? 1),
    shift: String(getVal('Ca', 'ca', 'shift') ?? '1'),
    vehicleNo: String(getVal('So xe', 'Số xe', 'vehicleNo') ?? '').trim(),
    tripCount: Number(getVal('Số chuyến', 'Chuyến', 'tripCount') ?? 1),
    cargoType: String(getVal('Chủng loại hàng', 'Chủng loại', 'Loại hàng', 'cargoType') ?? 'Than').trim(),
    fleet: String(getVal('Đội xe', 'Doi xe', 'fleet') ?? 'PXVT1').trim(),
  };

  if (role === 'ROLE_TRANSPORT') {
    return {
      ...common,
      excavationArea: getVal('Khu xúc', 'Khu xuc'),
      excavatorEquipment: getVal('Máy xúc, Thiết bị máy', 'Máy xúc'),
      pickupLocation: getVal('Nơi nhận tải (via)', 'Nơi nhận tải'),
      extraLoad: parseNum(getVal('Tăng nhận')),
      totalUnload: parseNum(getVal('Tổng dỡ')),
      fullRouteDistance: parseNum(getVal('CĐ toàn tuyến (K...)')),
      fullRouteElevate: parseNum(getVal('Nâng tải toàn tuyến')),
      localSlopeDist: parseNum(getVal('CĐ dốc cục bộ (K...)')),
      localSlopeDegree: parseNum(getVal('Dốc cục bộ (t...)')),
      unloadLocationName: getVal('Tên gọi nơi dỡ tải', 'Tên nơi dỡ'),
      roda: getVal('Roda'),
      earthDeduction: parseNum(getVal('Trừ với đất')),
      initialFuel: parseNum(getVal('NL Tồn')),
      receivedFuel: parseNum(getVal('Linh', 'Lĩnh')),
      finalFuel: parseNum(getVal('Tồn')),
      _tempId: `import_trans_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
  }

  // Mapper cho Bên Khai Thác (Máy Xúc) với 24 trường mới
  const vehicleNo = common.vehicleNo || '473';
  const autoVehicle = lookupVehicleInfo(vehicleNo);
  const badgeNo = String(getVal('Số thẻ lương', 'Mã thẻ lương', 'operatorBadgeNo') ?? 'TL001');
  const autoOperator = lookupOperatorInfo(badgeNo);

  const initialFuel = parseNum(getVal('Nhiên liệu tồn đầu', 'NL Tồn đầu', 'initialFuel')) ?? 300;
  const receivedFuel = parseNum(getVal('Nhiên liệu lĩnh trong ca', 'NL Lĩnh', 'receivedFuel')) ?? 150;
  const finalFuel = parseNum(getVal('Nhiên liệu tồn cuối', 'NL Tồn cuối', 'finalFuel')) ?? 100;
  const fuelConsumption = initialFuel + receivedFuel - finalFuel;
  const fuelNorm = parseNum(getVal('Định mức', 'Dinh muc', 'fuelNorm')) ?? 380;
  const fuelDiff = fuelNorm - fuelConsumption;

  return {
    ...common,
    miningUnit: getVal('Đơn vị khai thác', 'Đơn vị', 'miningUnit') ?? 'PXKT 1',
    mineCode: String(getVal('Máy xúc', 'Mã MX', 'Ma MX', 'mineCode') ?? 'MX-01 (EKG-5A)').trim(),
    excavationBench: getVal('Tầng xúc', 'Tầng', 'excavationBench') ?? 'Tầng +15',
    pickupLocation: getVal('Nơi nhận tải', 'Nơi nhận', 'pickupLocation') ?? 'Mỏ Cao Sơn - Moong 1',
    dumpLocation: getVal('Vị trí đổ', 'Vi tri do', 'dumpLocation') ?? 'Bãi thải Nam',
    material: getVal('Vật liệu', 'Vat lieu', 'material') ?? 'Đất đá',
    loadStatus: getVal('Loại hàng (mức tải)', 'Loại hàng', 'Mức tải', 'loadStatus') ?? 'Đủ tải',
    tempVolume: parseNum(getVal('Khối lượng tạm tính (m3)', 'Khối lượng tạm tính', 'tempVolume')) ?? 45,
    tempWeight: parseNum(getVal('Trọng lượng tạm tính (tấn)', 'Trọng lượng tạm tính', 'tempWeight')) ?? 90,
    vehicleManagementUnit: getVal('Đơn vị quản lý thiết bị', 'Đơn vị quản lý xe', 'vehicleManagementUnit') ?? autoVehicle.vehicleManagementUnit,
    vehicleType: getVal('Chủng loại xe', 'Loại xe', 'vehicleType') ?? autoVehicle.vehicleType,
    initialFuel,
    receivedFuel,
    finalFuel,
    fuelConsumption,
    fuelNorm,
    fuelDiff,
    operatorBadgeNo: badgeNo,
    operatorName: getVal('Họ và tên', 'Họ tên', 'operatorName') ?? autoOperator.operatorName,
    operatorUnit: getVal('Đơn vị công tác', 'operatorUnit') ?? autoOperator.operatorUnit,
    category: getVal('Loại', 'category') ?? 'Đất SX',
    _tempId: `import_mine_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
  };
};

export const validateImportRows = <T>(
  rawRows: Record<string, any>[],
  role: RoleType
): ImportRowValidationResult<T>[] => {
  const schema = role === 'ROLE_TRANSPORT' ? transportEntrySchema : miningEntrySchema;
  const commonKeySet = new Set<string>();

  return rawRows.map((rawRow, idx) => {
    const rowData = mapExcelRowToSystemFields(rawRow, role);
    const errors: string[] = [];

    // Zod Schema Validate
    const parseResult = schema.safeParse(rowData);
    if (!parseResult.success) {
      parseResult.error.issues.forEach((issue) => {
        errors.push(issue.message);
      });
    }

    // Key duplication check trong cùng file import
    const keyString = `${rowData.month}_${rowData.day}_${rowData.shift}_${rowData.vehicleNo}_${rowData.tripCount}`;
    if (rowData.vehicleNo && commonKeySet.has(keyString)) {
      errors.push(`Dòng bị trùng lặp bộ khóa (Tháng ${rowData.month}, Ngày ${rowData.day}, Ca ${rowData.shift}, Xe ${rowData.vehicleNo}, Chuyến ${rowData.tripCount})`);
    } else if (rowData.vehicleNo) {
      commonKeySet.add(keyString);
    }

    return {
      rowIndex: idx + 1, // 1-indexed
      rowData: rowData as unknown as Partial<T>,
      isValid: errors.length === 0,
      errors,
    };
  });
};
