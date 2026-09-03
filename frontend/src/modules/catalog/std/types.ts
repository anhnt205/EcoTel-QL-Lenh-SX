/** Một bản ghi STD — khớp `SurveyStandardResponse` phía backend. */
export interface SurveyStandardResponse {
  id: number;
  catalogType: "DAT_CN" | "DAT_SX_THAN_SX";
  seamGroupExcavatorKey: string;
  effectiveFrom: string;
  effectiveTo: string;
  earthAcceptanceProduct: string | null;
  earthM3: number | null;
  earthDesignVolume: number | null;
  earthDeviation: number | null;
  earthTon: number | null;
  earthHaulDistance: number | null;
  earthBulkDensity: number | null;
  earthTkm: number | null;
  coalAcceptanceProduct: string | null;
  coalM3: number | null;
  coalBulkDensity: number | null;
  coalTon: number | null;
  coalDesignVolume: number | null;
  coalDeviation: number | null;
  coalHaulDistance: number | null;
  coalTkm: number | null;
  note: string | null;
}
