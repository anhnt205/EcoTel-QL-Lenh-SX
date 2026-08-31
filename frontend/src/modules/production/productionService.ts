import api from "@/config/api.config";

export interface ProductionReportRow {
  id: number;
  transportTripId: number | null;
  productionDate: string | null;
  shiftName: string | null;
  vehicleCode: string | null;
  excavatorCode: string | null;
  excavationAreaName: string | null;
  loadingPointName: string | null;
  unloadingPointName: string | null;
  cargoTypeName: string | null;
  cargoGroupName: string | null;
  tripCount: number | null;
  routeDistanceKm: number | null;
  seamGroupExcavatorKey: string | null;
  acceptanceProduct: string | null;
  totalM3: number | null;
  totalTon: number | null;
  totalTkm: number | null;
  surveyM3: number | null;
  surveyTon: number | null;
  surveyTkm: number | null;
  finalTon: number | null;
  finalTkm: number | null;
  densityUsed: number | null;
  modelUsed: number | null;
  bulkDensityUsed: number | null;
  hsM3: number | null;
  hsTon: number | null;
  hsTkm: number | null;
  tkeMode: boolean;
  cargoCode: string | null;
  cargoTtlCode: string | null;
  seamKpmb: string | null;
  fuelNorm: number | null;
  fuelBaseConsumption: number | null;
  fuelTotalBeforeAdjustment: number | null;
  fuelCurrentNorm: number | null;
  productivityNorm: number | null;
}

export interface ProductionReportSummary {
  periodId: number;
  periodName: string;
  fromDate: string;
  toDate: string;
  dayCount: number;
  /** 0 nghĩa là kỳ CHƯA được tính lần nào — khác với đã tính và ra 0. */
  rowCount: number;
  calculatedAt: string | null;
  tkeMode: boolean | null;
  totalM3: number;
  totalTon: number;
  totalTkm: number;
  surveyM3: number;
  surveyTon: number;
  surveyTkm: number;
  finalTon: number;
  finalTkm: number;
}

export interface CalculationSummary {
  tripCount: number;
  coefficientRowCount: number;
  tkeMode: boolean;
  warnings: string[];
}

export interface ReportPeriodOption {
  id: number;
  year: number;
  month: number;
  periodIndex: number;
  fromDate: string;
  toDate: string;
  displayName: string;
  dayCount: number;
}

export interface SurveyCoefficientRow {
  id: number;
  kind: "AP_TDIA" | "AP_TKM";
  seamGroupExcavatorKey: string;
  acceptanceProduct: string;
  totalM3: number | null;
  totalTon: number | null;
  totalTkm: number | null;
  surveyM3: number | null;
  surveyTon: number | null;
  surveyTkm: number | null;
  hsM3: number | null;
  hsTon: number | null;
  hsTkm: number | null;
  tripCount: number | null;
}

const unwrap = <T,>(res: { data?: { data?: T } }): T => res.data?.data as T;

export const productionService = {
  periodsOfMonth: async (year: number, month: number): Promise<ReportPeriodOption[]> =>
    unwrap(await api.get("/report-periods/by-month", { params: { year, month } })) ?? [],

  summary: async (periodId: number): Promise<ProductionReportSummary> =>
    unwrap(await api.get("/production/summary", { params: { periodId } })),

  rows: async (periodId: number, keyword: string, page: number, size: number) => {
    const res = await api.get("/production/results", {
      params: { periodId, keyword, page, size },
    });
    return unwrap<{
      content: ProductionReportRow[];
      totalElements: number;
      totalPages: number;
    }>(res);
  },

  allRows: async (periodId: number): Promise<ProductionReportRow[]> =>
    unwrap(await api.get("/production/results/all", { params: { periodId } })) ?? [],

  coefficients: async (periodId: number): Promise<SurveyCoefficientRow[]> =>
    unwrap(await api.get("/production/survey-coefficients", { params: { periodId } })) ?? [],

  calculate: async (periodId: number, tkeMode: boolean): Promise<CalculationSummary> =>
    unwrap(await api.post("/production/calculate", null, { params: { periodId, tkeMode } })),
};
