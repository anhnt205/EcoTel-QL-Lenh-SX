/** Một bản ghi Mô hình đã lưu — mirror `ModelPeriodResponse` phía backend. */
export interface ModelPeriodResponse {
  id: number;
  cargoTypeId: number;
  cargoTypeCode: string;
  cargoTypeName: string;
  effectiveFrom: string;
  effectiveTo: string;
  note: string | null;
  /** Khoá `<mã chủng loại xe>.<CS|KC>` -> giá trị (m3/chuyến). */
  values: Record<string, number>;
}
