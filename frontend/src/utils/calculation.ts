/**
 * Logic tính toán sản lượng — giữ nguyên từ Hà Tu
 */

// Hệ số mô hình chất tải
export function getLoadingModelFactor(loadingModel: string): number {
  switch (loadingModel) {
    case 'd':
      return 1;
    case 'r':
      return 0.66;
    case 'Khác':
      return 0.5;
    default: {
      const num = parseFloat(loadingModel);
      return isNaN(num) ? 0 : num;
    }
  }
}

// Lookup mo_hinh (dung tích) theo material + deviceModel + ngày
export function getMohinhAtDate(
  capacityHistory: Array<{
    effectiveDate: string;
    value: number;
  }>,
  workingDate: string
): number {
  if (!capacityHistory || capacityHistory.length === 0) return 0;

  const sorted = [...capacityHistory].sort(
    (a, b) =>
      new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  for (const entry of sorted) {
    if (entry.effectiveDate <= workingDate) {
      return entry.value;
    }
  }

  return sorted[sorted.length - 1]?.value ?? 0;
}

// Lookup dryDensity theo material + ngày
export function getDryDensityAtDate(
  valueHistory: Array<{
    effectiveDate: string;
    dryDensity: number;
  }>,
  workingDate: string
): number {
  if (!valueHistory || valueHistory.length === 0) return 0;

  const sorted = [...valueHistory].sort(
    (a, b) =>
      new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  for (const entry of sorted) {
    if (entry.effectiveDate <= workingDate) {
      return entry.dryDensity;
    }
  }

  return sorted[sorted.length - 1]?.dryDensity ?? 0;
}

// Lookup distance (cung đường) theo excavator + loadLocation + material + dumpLocation + ngày
export function getDistanceAtDate(
  travelLogs: Array<{
    effectiveDate: string;
    distanceKm: number;
  }>,
  workingDate: string
): number {
  if (!travelLogs || travelLogs.length === 0) return 0;

  const sorted = [...travelLogs].sort(
    (a, b) =>
      new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
  );

  for (const entry of sorted) {
    if (entry.effectiveDate <= workingDate) {
      return entry.distanceKm;
    }
  }

  return sorted[sorted.length - 1]?.distanceKm ?? 0;
}

// Tính sản lượng cho 1 chuyến
export interface CalculationResult {
  cubicMeter: number;
  ton: number;
  production: number; // Tkm
}

export function calculateProduction(params: {
  moHinh: number;
  quantity: number;
  loadingModel: string;
  dryDensity: number;
  distance: number;
  totalTon: number; // tấn cân (nếu có)
}): CalculationResult {
  const { moHinh, quantity, loadingModel, dryDensity, distance, totalTon } =
    params;

  const factor = getLoadingModelFactor(loadingModel);
  const cubicMeter = moHinh * quantity * factor;
  const calculatedTon = cubicMeter * dryDensity;

  // Nếu có tấn cân > 0 thì dùng tấn cân,否则 dùng tính toán
  const ton = totalTon > 0 ? totalTon : calculatedTon;

  const production = distance * moHinh * dryDensity;

  return { cubicMeter, ton, production };
}
