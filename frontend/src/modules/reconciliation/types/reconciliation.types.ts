// === Production Reconciliation ===

export interface ProductionReconciliationRow {
  id: string;
  workingDate: string;         // ISO date (YYYY-MM-DD)
  shift: string;
  vehicleCode: string;
  vehicleType: string;
  materialSymbol: string;
  tripCount: number;
  cubicMeter: number;
  calculatedTon: number;
  actualTon: number;
  deviationTon: number;
  deviationPercent: number | null;
  status: 'NORMAL' | 'WARNING' | 'ALERT';
  warning?: string;
}

export interface ProductionReconciliationResponse {
  data: ProductionReconciliationRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalCalculatedTon: number;
    totalActualTon: number;
    totalDeviationTon: number;
    totalDeviationPercent: number;
  };
}

export interface ProductionFilters {
  startDate: string;
  endDate: string;
  shift?: string;
  vehicleId?: string;
  materialId?: string;
  page?: number;
  limit?: number;
}

// === Fuel Reconciliation ===

export interface FuelReconciliationRow {
  id: string;
  workingDate: string;
  shift: string;
  vehicleCode: string;
  vehicleType: string;
  gasRemain: number;
  gasReceived: number;
  gasRemainEnd: number;
  actualConsumption: number;
  tkm: number;
  fuelQuota: number;
  standardConsumption: number;
  deviation: number;
  status: 'SURPLUS' | 'NORMAL' | 'DEFICIT';
}

export interface FuelReconciliationResponse {
  data: FuelReconciliationRow[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalActualConsumption: number;
    totalStandardConsumption: number;
    totalDeviation: number;
  };
}

export interface FuelFilters {
  startDate: string;
  endDate: string;
  shift?: string;
  vehicleId?: string;
  page?: number;
  limit?: number;
}

// === Dashboard ===

export interface DashboardSummary {
  totalCalculatedTon: number;
  totalActualTon: number;
  totalDeviationTon: number;
  totalDeviationPercent: number;
  totalFuelSurplus: number;
}

export interface VehicleSummary {
  vehicleCode: string;
  vehicleType: string;
  tripCount: number;
  calculatedTon: number;
  actualTon: number;
  deviationTon: number;
  deviationPercent: number;
  fuelSurplus: number;
}

export interface ShiftSummary {
  shift: string;
  tripCount: number;
  calculatedTon: number;
  actualTon: number;
  deviationTon: number;
  deviationPercent: number;
  fuelSurplus: number;
}

export interface MaterialSummary {
  materialSymbol: string;
  materialName: string;
  tripCount: number;
  calculatedTon: number;
  actualTon: number;
  deviationTon: number;
  deviationPercent: number;
}

export interface DailyProduction {
  date: string;
  calculated: number;
  actual: number;
}

export interface DailyFuel {
  date: string;
  surplus: number;
}

export interface Alert {
  id: string;
  type: 'PRODUCTION_DEVIATION' | 'FUEL_DEFICIT' | 'TREND_INCREASE';
  severity: 'WARNING' | 'CRITICAL';
  vehicleCode: string;
  message: string;
  value: number;
  threshold: number;
  link: string;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  byVehicle: VehicleSummary[];
  byShift: ShiftSummary[];
  byMaterial: MaterialSummary[];
  dailyProduction: DailyProduction[];
  dailyFuel: DailyFuel[];
  alerts: Alert[];
}

// === Common ===

export type ReconciliationStatus = 'NORMAL' | 'WARNING' | 'ALERT';
export type FuelStatus = 'SURPLUS' | 'NORMAL' | 'DEFICIT';
