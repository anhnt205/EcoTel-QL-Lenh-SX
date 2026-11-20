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
  seamGroupName: string | null;
  benchGroup: string | null;
  mudMark: string | null;
  seamGroupExcavatorKey: string | null;
  acceptanceProduct: string | null;
  totalM3: number | null;
  totalTon: number | null;
  totalTkm: number | null;
  surveyM3: number | null;
  surveyTon: number | null;
  surveyTkm: number | null;
  densityUsed: number | null;
  modelUsed: number | null;
  bulkDensityUsed: number | null;
  hsM3: number | null;
  hsTon: number | null;
  hsTkm: number | null;
  densityOriginal: number | null;
  densityNoMoisture: number | null;
  totalM3Original: number | null;
  totalTonNoMoisture: number | null;
  totalTkmNoMoisture: number | null;
  cargoCode: string | null;
  cargoTtlCode: string | null;
  seamKpmb: string | null;
  receivingFloor: number | null;
  unloadingFloor: string | null;
  routeLiftM: number | null;
  localSlopeDistanceKm: number | null;
  weighedWeightTon: number | null;
  provisionalModel: number | null;
  provisionalDensity: number | null;
  deductionAmount: number | null;
  ctnbFactor: number | null;
  wasteRockTon: number | null;
  wasteRockM3: number | null;
  totalTonOriginalBeforeWaste: number | null;
  totalKmTransport: number | null;
  apHsM3: number | null;
  apHsTon: number | null;
  apHsTkm: number | null;
  fuelPaymentLift: number | null;
  rainyDay: boolean;
  supplementaryVehicle: boolean;
  loadLevel: string | null;
  cargoSpntCn: string | null;
  vehicleNumber: string | null;
  vehicleCarRenovation: string | null;
  vehicleTypeName: string | null;
  vehicleCategoryClassName: string | null;
  vehicleRankName: string | null;
  vehicleRankGroupName: string | null;
  vehicleDepartmentName: string | null;
  vehicleFuelClassName: string | null;
  vehicleTypeRankGroupKey: string | null;
  vehicleFuelNormKey: string | null;
  excavatorNumber: string | null;
  excavatorTypeName: string | null;
  excavatorRankName: string | null;
  excavatorBucketName: string | null;
  excavatorDepartmentName: string | null;
  fuelHb: number | null;
  fuelHa: number | null;
  fuelH1: number | null;
  fuelH2: number | null;
  fuelNbH1: number | null;
  fuelNbH2: number | null;
  fuelNb: number | null;
  fuelNaH1: number | null;
  fuelNaH2: number | null;
  fuelNa: number | null;
  fuelNt: number | null;
  fuelNormSeasonal: number | null;
  fuelNormVehicleClass: number | null;
  fuelNormCarRenovation: number | null;
  fuelCoalCnNkFactor: number | null;
  bsnlRoda: number | null;
  bsnlRainyDay: number | null;
  bsnlSupplementary: number | null;
  bsnlMaintenance: number | null;
  bsnlOther: number | null;
  bsnlSpnt: number | null;
  bsnlMud: number | null;
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
  /** QĐ-25: số chuyến Vận tải của kỳ KHÔNG nằm trong số liệu vì chưa duyệt đối chiếu. */
  unapprovedTripCount?: number;
  totalM3: number;
  totalTon: number;
  totalTkm: number;
  surveyM3: number;
  surveyTon: number;
  surveyTkm: number;
}

export interface CalculationSummary {
  tripCount: number;
  coefficientRowCount: number;
  warnings: string[];
  /** QĐ-25: số chuyến chưa duyệt bị bỏ qua khi tính ở chế độ "chỉ tính chuyến đã duyệt". */
  excludedTripCount?: number;
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
  /** Đã chốt — không tính lại được cho tới khi mở khoá (QĐ-03). */
  locked: boolean;
  /** Vừa mở khoá, kết quả đang hiện coi như lỗi thời cho tới khi chốt lại (QĐ-03). */
  stale: boolean;
}

export interface ReportPeriodAudit {
  id: number;
  action: "LOCK" | "UNLOCK";
  performedByUsername: string;
  performedByFullName: string | null;
  performedAt: string;
  reason: string | null;
  totalM3: number | null;
  totalTon: number | null;
  totalTkm: number | null;
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

/**
 * Một dòng danh mục "AP Tdia (m3-tấn-tkm)" (chỉ xem) — khớp
 * `AreaApplicationRowResponse` phía backend. Gộp theo tháng, PIVOT ba khối
 * Đất CN / Đất SX / Than từ các dòng `SurveyCoefficient` (kind AP_TDIA) mà
 * "Tính lại kỳ" ở màn Báo cáo thống kê đã sinh sẵn — không tính lại gì mới.
 */
export interface AreaApplicationRow {
  year: number;
  month: number;
  excavatorCode: string | null;
  seamGroupExcavatorKey: string;
  earthCnTotalM3: number | null;
  earthCnTotalTon: number | null;
  earthCnTotalTkm: number | null;
  earthSxTotalM3: number | null;
  earthSxTotalTon: number | null;
  earthSxTotalTkm: number | null;
  coalTotalM3: number | null;
  coalTotalTon: number | null;
  coalTotalTkm: number | null;
  earthCnSurveyM3: number | null;
  earthCnSurveyTon: number | null;
  earthCnSurveyTkm: number | null;
  earthSxSurveyM3: number | null;
  earthSxSurveyTon: number | null;
  earthSxSurveyTkm: number | null;
  coalSurveyM3: number | null;
  coalSurveyTon: number | null;
  coalSurveyTkm: number | null;
  earthCnHsM3: number | null;
  earthCnHsTon: number | null;
  earthCnHsTkm: number | null;
  earthSxHsM3: number | null;
  earthSxHsTon: number | null;
  earthSxHsTkm: number | null;
  coalHsM3: number | null;
  coalHsTon: number | null;
  coalHsTkm: number | null;
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

  /** Dòng thống kê theo khoảng NGÀY sản xuất (không theo kỳ) — bảng xem Báo cáo thống kê. */
  rowsByDate: async (fromDate: string, toDate: string): Promise<ProductionReportRow[]> =>
    unwrap(await api.get("/production/results/by-date", { params: { fromDate, toDate } })) ?? [],

  coefficients: async (periodId: number): Promise<SurveyCoefficientRow[]> =>
    unwrap(await api.get("/production/survey-coefficients", { params: { periodId } })) ?? [],

  calculate: async (
    periodId: number,
    onlyApproved = false,
  ): Promise<CalculationSummary> =>
    unwrap(await api.post("/production/calculate", null, { params: { periodId, onlyApproved } })),

  /** Chốt kỳ (QĐ-03) — đóng băng kết quả, chặn "Tính lại" cho tới khi mở khoá. */
  lockPeriod: async (periodId: number): Promise<ReportPeriodOption> =>
    unwrap(await api.post(`/report-periods/${periodId}/lock`)),

  /** Mở khoá kỳ đã chốt — bắt buộc lý do (QĐ-03), chỉ ADMIN. */
  unlockPeriod: async (periodId: number, reason: string): Promise<ReportPeriodOption> =>
    unwrap(await api.post(`/report-periods/${periodId}/unlock`, { reason })),

  periodAudits: async (periodId: number): Promise<ReportPeriodAudit[]> =>
    unwrap(await api.get(`/report-periods/${periodId}/audits`)) ?? [],

  apTracDia: async (
    year: number,
    month: number,
    excavatorCode?: string,
    key?: string,
  ): Promise<AreaApplicationRow[]> =>
    unwrap(
      await api.get("/production/ap-tracdia", {
        params: { year, month, excavatorCode: excavatorCode || undefined, key: key || undefined },
      }),
    ) ?? [],
};
