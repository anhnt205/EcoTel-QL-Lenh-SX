import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/config/api.config";
import type {
  MiningSessionDraft,
  TripRow,
} from "../components/MiningBatchEntryModal";

export const excavationTripReportTripRequestSchema = z.object({
  vehicleId: z
    .number({ message: "Số xe là bắt buộc" })
    .min(1, "Số xe là bắt buộc"),
  tripCount: z.number().min(1, "Số chuyến phải >= 1"),
  cargoTypeId: z
    .number({ message: "Loại hàng không hợp lệ" })
    .min(1, "Loại hàng là bắt buộc"),
  loadLevelType: z.enum(["FULL_LOAD", "RODA_2_3", "OTHER"]),
  loadLevelCustomValue: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || /^\d+\/[1-9]\d*$/.test(val), {
      message: "Chỉ chấp nhận dạng phân số không khoảng trắng, ví dụ: 1/2, 2/3",
    }),
});

export const excavationTripReportRequestSchema = z.object({
  reportDate: z
    .string({ message: "Thời gian là bắt buộc" })
    .min(1, "Thời gian là bắt buộc"),
  shiftId: z.number({ message: "Ca là bắt buộc" }).min(1, "Ca là bắt buộc"),
  excavatorDeviceId: z
    .number({ message: "Máy xúc là bắt buộc" })
    .min(1, "Máy xúc là bắt buộc"),
  excavationFloor: z.string().nullable().optional(),
  receivingLocationId: z
    .number({ message: "Nơi chất tải là bắt buộc" })
    .min(1, "Nơi chất tải là bắt buộc"),
  fuelBeginning: z.number({ message: "Nhiên liệu tồn đầu là bắt buộc" }),
  fuelEnding: z.number({ message: "Nhiên liệu tồn cuối là bắt buộc" }),
  fuelReceived: z.number({ message: "Nhiên liệu lĩnh là bắt buộc" }),
  employeeId: z
    .number({ message: "Số thẻ lương là bắt buộc" })
    .min(1, "Số thẻ lương là bắt buộc"),
  trips: z
    .array(excavationTripReportTripRequestSchema)
    .min(1, "Cần ít nhất 1 chuyến"),
});

export type ExcavationTripReportTripRequest = z.infer<
  typeof excavationTripReportTripRequestSchema
>;

/**
 * Payload sửa 1 chuyến Khai thác — xem javadoc bản Vận tải
 * (`transportReportTripUpdateRequestSchema`) cho lý do đầy đủ. Phiếu Khai thác
 * định danh bằng (Ngày, Ca, MÁY XÚC, Số thẻ lương); `vehicleId` đã có sẵn ở
 * cấp chuyến nên không lặp lại ở đây.
 */
export const excavationTripReportTripUpdateRequestSchema =
  excavationTripReportTripRequestSchema.extend({
    reportDate: z.string().optional(),
    shiftId: z.number().optional(),
    excavatorDeviceId: z.number().optional(),
    employeeId: z.number().optional(),
  });

export type ExcavationTripReportTripUpdateRequest = z.infer<
  typeof excavationTripReportTripUpdateRequestSchema
>;
export type ExcavationTripReportRequest = z.infer<
  typeof excavationTripReportRequestSchema
>;

export interface ApiResponse<T> {
  status: number;
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ExcavationReportTripResponse {
  id: number;
  status?: "PENDING" | "APPROVED" | "REVISION_REQUESTED";
  note?: string;
  /** Ghi chú Thống kê gửi kèm khi yêu cầu sửa — chỉ có khi đang REVISION_REQUESTED. */
  revisionNote?: string | null;
  vehicleId?: number;
  vehicleCode?: string;
  vehicleName?: string;
  vehicleDepartmentName?: string;
  vehicleCategoryName?: string;
  tripCount: number;
  cargoTypeId: number;
  cargoTypeName: string;
  cargoGroupId?: number;
  cargoGroupName?: string;
  loadLevelType: "FULL_LOAD" | "RODA_2_3" | "OTHER";
  loadLevelCustomValue?: string | null;
}

export interface ExcavationReportResponse {
  id: number;
  reportDate: string;
  shiftId: number;
  shiftName: string;
  excavatorDeviceId: number;
  excavatorDeviceCode: string;
  excavatorDeviceName: string;
  excavatorDeviceDepartmentName?: string;
  vehicleId?: number;
  vehicleCode?: string;
  vehicleName?: string;
  vehicleDepartmentName?: string;
  vehicleCategoryName?: string;
  excavationFloor?: string | null;
  receivingLocationId: number;
  receivingLocationName: string;
  fuelBeginning: number;
  fuelEnding: number;
  fuelReceived: number;
  fuelUsed?: number;
  employeeId: number;
  employeeSalaryCode: string;
  employeeFullName: string;
  employeeDepartmentName?: string;
  departmentId?: number;
  departmentName?: string;
  status?: "PENDING" | "APPROVED" | "REVISION_REQUESTED";
  note?: string;
  trips: ExcavationReportTripResponse[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ExcavationReportBulkUpdateItem {
  id: number;
  data: ExcavationTripReportRequest;
}

export interface BulkDeleteResponse {
  requestedCount: number;
  deletedCount: number;
}

export interface ExcelImportResultResponse {
  totalRows: number;
  successReportCount: number;
  errorRowCount: number;
  errors: string[];
}

/**
 * Hàm hỗ trợ map dữ liệu từ 1 MiningSessionDraft (màn hình UI) thành ExcavationTripReportRequest (API Backend)
 */
export function buildExcavationTripRequestItem(
  t: TripRow,
  masterData: {
    rawVehicles: any[];
    rawCargoTypes: any[];
  },
  idx: number = 0,
): ExcavationTripReportTripRequest {
  // Map vehicleId cho từng chuyến
  const vehicleItem = masterData.rawVehicles?.find(
    (v) =>
      v.code === t.vehicleNo ||
      v.vehicleNumber === t.vehicleNo ||
      v.name === t.vehicleNo ||
      String(v.id) === String(t.vehicleNo),
  );
  if (!vehicleItem) {
    throw new Error(
      `Chuyến #${idx + 1}: Số xe "${t.vehicleNo}" không tồn tại trong hệ thống`,
    );
  }
  const vehicleId = Number(vehicleItem.id);

  // Map cargoTypeId
  const cargoTypeItem = masterData.rawCargoTypes.find(
    (c) => c.name === t.material || String(c.id) === String(t.material),
  );
  if (!cargoTypeItem) {
    throw new Error(
      `Chuyến #${idx + 1}: Loại hàng "${t.material}" không tồn tại trong hệ thống`,
    );
  }
  const cargoTypeId = Number(cargoTypeItem.id);

  // Map loadLevelType & loadLevelCustomValue
  let loadLevelType: "FULL_LOAD" | "RODA_2_3" | "OTHER" = "FULL_LOAD";
  let loadLevelCustomValue: string | null = null;

  if (t.loadStatus === "Roda (2/3)" || t.loadStatus === "RODA_2_3") {
    loadLevelType = "RODA_2_3";
  } else if (t.loadStatus === "Khác" || t.loadStatus === "OTHER") {
    loadLevelType = "OTHER";
    loadLevelCustomValue = t.loadStatusNote
      ? t.loadStatusNote.trim().replace(/\s+/g, "")
      : "1/2";
  }

  return {
    vehicleId,
    tripCount: Number(t.tripCount) || 1,
    cargoTypeId,
    loadLevelType,
    loadLevelCustomValue:
      loadLevelType === "OTHER" ? loadLevelCustomValue : null,
  };
}

/**
 * Hàm hỗ trợ map dữ liệu từ 1 MiningSessionDraft (màn hình UI) thành ExcavationTripReportRequest (API Backend)
 */
export function buildExcavationReportRequest(
  sess: MiningSessionDraft,
  masterData: {
    rawShifts: any[];
    /**
     * Danh mục "Nơi chất tải" — PHẢI là dữ liệu từ `/api/pickup-points`
     * (`rawPickupPoints` của `useMasterData`), KHÔNG PHẢI `/api/locations`.
     * Hai bảng tình cờ trùng tên vài dòng (KX1..KX4) nhưng ID khác hẳn —
     * backend xác thực `receivingLocationId` qua `pickupPointRepository`,
     * nên nhầm sang `/api/locations` sẽ khiến LƯU LUÔN 404 "Nơi chất tải
     * không tồn tại: <id sai>" (bug thật, vá ngày 2026-09-08).
     */
    rawLocations: any[];
    rawExcavators: any[];
    rawVehicles: any[];
    rawUsers: any[];
    rawCargoTypes: any[];
    rawDepartments?: any[];
  },
): ExcavationTripReportRequest {
  // 1. Map shiftId
  const shiftItem = masterData.rawShifts.find(
    (s) =>
      String(s.name) === String(sess.shift) ||
      String(s.id) === String(sess.shift),
  );
  if (!shiftItem) {
    throw new Error(
      `Ca làm việc "${sess.shift}" không hợp lệ, vui lòng chọn lại từ danh sách`,
    );
  }
  const shiftId = Number(shiftItem.id);

  // 2. Map excavatorDeviceId
  const excavatorItem = masterData.rawExcavators.find(
    (d) =>
      d.code === sess.excavator ||
      d.name === sess.excavator ||
      String(d.id) === String(sess.excavator),
  );
  if (!excavatorItem) {
    throw new Error(`Máy xúc "${sess.excavator}" không tồn tại trong hệ thống`);
  }
  const excavatorDeviceId = Number(excavatorItem.id);

  // 3. Map receivingLocationId (Nơi chất tải)
  const receivingLocItem = masterData.rawLocations.find(
    (l) =>
      l.name === sess.pickupLocation ||
      String(l.id) === String(sess.pickupLocation),
  );
  if (!receivingLocItem) {
    throw new Error(
      `Nơi chất tải "${sess.pickupLocation}" không tồn tại trong hệ thống`,
    );
  }
  const receivingLocationId = Number(receivingLocItem.id);

  // 4. Map employeeId (Người vận hành theo số thẻ lương)
  const userItem = masterData.rawUsers.find(
    (u) =>
      u.salaryCode === sess.operatorBadgeNo ||
      u.username === sess.operatorBadgeNo ||
      String(u.id) === String(sess.operatorBadgeNo),
  );
  if (!userItem) {
    throw new Error(
      `Số thẻ lương "${sess.operatorBadgeNo}" không tồn tại trong hệ thống`,
    );
  }
  const employeeId = Number(userItem.id);

  // 5. Map danh sách chuyến (trips)
  const trips: ExcavationTripReportTripRequest[] = sess.trips.map((t, idx) =>
    buildExcavationTripRequestItem(t, masterData, idx),
  );

  return {
    reportDate: sess.workingDate,
    shiftId,
    excavatorDeviceId,
    excavationFloor: sess.totalScoops !== "" ? String(sess.totalScoops) : null,
    receivingLocationId,
    fuelBeginning: Number(sess.initialFuel),
    fuelEnding: Number(sess.finalFuel),
    fuelReceived: Number(sess.receivedFuel),
    employeeId,
    trips,
  };
}

/**
 * Reverse Mapper: Chuyển dữ liệu ExcavationReportResponse từ backend sang MiningSessionDraft của UI Form
 */
export function mapReportResponseToDraft(
  report: ExcavationReportResponse,
): MiningSessionDraft {
  const fallbackVehicleNo =
    report.vehicleCode ||
    report.vehicleName ||
    "";
  const fallbackVehicleManagementUnit =
    report.vehicleDepartmentName ||
    "";
  const fallbackVehicleType =
    report.vehicleCategoryName ||
    "";

  return {
    _tempId: `sess_edit_${report.id}`,
    reportId: report.id,
    workingDate: report.reportDate || "",
    shift: report.shiftName || String(report.shiftId || ""),
    department: "",
    pickupLocation: report.receivingLocationName || "",
    excavator: report.excavatorDeviceCode || report.excavatorDeviceName || "",
    excavatorManagementUnit: report.excavatorDeviceDepartmentName || "",
    totalScoops: report.excavationFloor ? Number(report.excavationFloor) || "" : "",
    initialFuel: report.fuelBeginning ?? "",
    receivedFuel: report.fuelReceived ?? "",
    finalFuel: report.fuelEnding ?? "",
    operatorBadgeNo: report.employeeSalaryCode || "",
    operatorName: report.employeeFullName || "",
    operatorUnit: report.employeeDepartmentName || "",
    trips: (report.trips || []).map((t, idx) => ({
      _tempId: `trip_edit_${t.id || idx}`,
      vehicleNo: t.vehicleCode || t.vehicleName || fallbackVehicleNo,
      vehicleManagementUnit: t.vehicleDepartmentName || fallbackVehicleManagementUnit,
      vehicleType: t.vehicleCategoryName || fallbackVehicleType,
      tripCount: t.tripCount || 1,
      material: t.cargoTypeName || "",
      loadStatus:
        t.loadLevelType === "OTHER"
          ? "Khác"
          : t.loadLevelType === "RODA_2_3"
          ? "Roda (2/3)"
          : "Đủ tải",
      loadStatusNote: t.loadLevelCustomValue || "",
    })),
  };
}

/**
 * Reverse Mapper: Chuyển dữ liệu 1 chuyến ExcavationReportTripResponse sang MiningSessionDraft chỉ gồm chuyến đó
 */
export function mapExcavationTripResponseToDraft(
  tripRes: ExcavationReportTripResponse,
  baseRecord?: any,
): MiningSessionDraft {
  let workingDate = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
  if (baseRecord?.createdAt) {
    workingDate = baseRecord.createdAt;
  } else if (baseRecord?.year && baseRecord?.month && baseRecord?.day) {
    workingDate = `${baseRecord.year}-${String(baseRecord.month).padStart(2, "0")}-${String(baseRecord.day).padStart(2, "0")}`;
  }

  const rawShift = String(baseRecord?.shift || "1");
  const cleanShift = rawShift.replace(/^ca\s+/i, "").trim();

  return {
    _tempId: `sess_mining_trip_${tripRes.id}_${Date.now()}`,
    reportId: baseRecord?.reportId,
    singleTripId: tripRes.id,
    revisionNote: tripRes.revisionNote || undefined,
    workingDate,
    shift: cleanShift || "1",
    department: baseRecord?.departmentName || "",
    pickupLocation: baseRecord?.pickupLocation || "",
    excavator:
      baseRecord?.excavator ||
      baseRecord?.mineCode ||
      "",
    excavatorManagementUnit:
      baseRecord?.excavatorManagementUnit ||
      baseRecord?.miningUnit ||
      "",
    totalScoops:
      baseRecord?.totalScoops !== undefined && baseRecord?.totalScoops !== ""
        ? baseRecord.totalScoops
        : (baseRecord?.excavationBench ? Number(baseRecord.excavationBench) || "" : ""),
    initialFuel: baseRecord?.initialFuel ?? "",
    receivedFuel: baseRecord?.receivedFuel ?? "",
    finalFuel: baseRecord?.finalFuel ?? "",
    operatorBadgeNo: baseRecord?.operatorBadgeNo || "",
    operatorName: baseRecord?.operatorName || "",
    operatorUnit: baseRecord?.operatorUnit || "",
    trips: [
      {
        _tempId: `trip_${tripRes.id}_${Date.now()}`,
        vehicleNo:
          tripRes.vehicleCode ||
          tripRes.vehicleName ||
          baseRecord?.vehicleNo ||
          baseRecord?.transportVehicleNo ||
          "",
        vehicleManagementUnit:
          tripRes.vehicleDepartmentName ||
          baseRecord?.vehicleManagementUnit ||
          "",
        vehicleType:
          tripRes.vehicleCategoryName ||
          baseRecord?.vehicleType ||
          "",
        tripCount: tripRes.tripCount || 1,
        material: tripRes.cargoTypeName || "",
        loadStatus:
          tripRes.loadLevelType === "OTHER"
            ? "Khác"
            : tripRes.loadLevelType === "RODA_2_3"
            ? "Roda (2/3)"
            : "Đủ tải",
        loadStatusNote: tripRes.loadLevelCustomValue || "",
      },
    ],
  };
}

/**
 * Gọi API GET /api/excavation-reports/trips/{tripId} (Lấy chi tiết 1 chuyến)
 */
export async function fetchExcavationTripById(
  tripId: number,
): Promise<ApiResponse<ExcavationReportTripResponse>> {
  const res = await api.get(`/excavation-reports/trips/${tripId}`);
  return res.data;
}

/**
 * Gọi API POST /api/excavation-reports
 */
export async function createExcavationTripReport(
  payload: ExcavationTripReportRequest,
): Promise<ApiResponse<ExcavationReportResponse>> {
  const validatedPayload = excavationTripReportRequestSchema.parse(payload);
  const res = await api.post("/excavation-reports", validatedPayload);
  return res.data;
}

/**
 * Gọi API GET /api/excavation-reports
 */
export async function fetchExcavationReports(params: {
  fromDate?: string;
  toDate?: string;
  shiftIds?: number[];
  excavatorIds?: number[];
  receivingLocationIds?: number[];
  excavationFloors?: string[];
  page?: number;
  size?: number;
}): Promise<ApiResponse<PageResponse<ExcavationReportResponse> | ExcavationReportResponse[]>> {
  const res = await api.get("/excavation-reports", { params });
  return res.data;
}

/**
 * Gọi API GET /api/excavation-reports/excavation-floors — toàn bộ giá trị
 * Tầng xúc trong khoảng ngày, ĐỘC LẬP phân trang và mọi bộ lọc khác. Dùng
 * để dựng tuỳ chọn cho ô lọc "Tầng xúc": nếu gom từ danh sách chuyến đã
 * phân trang, tầng chỉ xuất hiện ở trang chưa xem thì không chọn được.
 */
export async function fetchDistinctExcavationFloors(
  fromDate: string,
  toDate: string,
): Promise<ApiResponse<string[]>> {
  const res = await api.get("/excavation-reports/excavation-floors", {
    params: { fromDate, toDate },
  });
  return res.data;
}

/**
 * Gọi API GET /api/excavation-reports/{id}
 */
export async function fetchExcavationReportById(
  id: number,
): Promise<ApiResponse<ExcavationReportResponse>> {
  const res = await api.get(`/excavation-reports/${id}`);
  return res.data;
}

/**
 * Gọi API PUT /api/excavation-reports/{id}
 */
export async function updateExcavationTripReport(
  id: number,
  payload: ExcavationTripReportRequest,
): Promise<ApiResponse<ExcavationReportResponse>> {
  const validatedPayload = excavationTripReportRequestSchema.parse(payload);
  const res = await api.put(`/excavation-reports/${id}`, validatedPayload);
  return res.data;
}

/**
 * Gọi API DELETE /api/excavation-reports/{id}
 */
export async function deleteExcavationTripReport(
  id: number,
): Promise<ApiResponse<void>> {
  const res = await api.delete(`/excavation-reports/${id}`);
  return res.data;
}

/**
 * Gọi API POST /api/excavation-reports/bulk
 */
export async function bulkCreateExcavationTripReports(
  payloads: ExcavationTripReportRequest[],
): Promise<ApiResponse<ExcavationReportResponse[]>> {
  const validatedPayloads = z
    .array(excavationTripReportRequestSchema)
    .parse(payloads);
  const res = await api.post("/excavation-reports/bulk", validatedPayloads);
  return res.data;
}

/**
 * Gọi API PUT /api/excavation-reports/bulk
 */
export async function bulkUpdateExcavationTripReports(
  items: ExcavationReportBulkUpdateItem[],
): Promise<ApiResponse<ExcavationReportResponse[]>> {
  const validatedItems = items.map((item) => ({
    id: item.id,
    data: excavationTripReportRequestSchema.parse(item.data),
  }));
  const res = await api.put("/excavation-reports/bulk", validatedItems);
  return res.data;
}

export interface ExcavationTripBulkUpdateItem {
  id: number;
  data: ExcavationTripReportTripRequest;
}

/**
 * Gọi API PUT /api/excavation-reports/trips/{tripId} (Sửa 1 chuyến)
 */
export async function updateExcavationTrip(
  tripId: number,
  payload: ExcavationTripReportTripUpdateRequest,
): Promise<ApiResponse<ExcavationReportTripResponse>> {
  const validatedPayload =
    excavationTripReportTripUpdateRequestSchema.parse(payload);
  const res = await api.put(`/excavation-reports/trips/${tripId}`, validatedPayload);
  return res.data;
}

/**
 * Gọi API DELETE /api/excavation-reports/trips/{tripId} (Xóa 1 chuyến)
 */
export async function deleteExcavationTrip(
  tripId: number,
): Promise<ApiResponse<void>> {
  const res = await api.delete(`/excavation-reports/trips/${tripId}`);
  return res.data;
}

/**
 * Gọi API PUT /api/excavation-reports/trips/bulk (Sửa nhiều chuyến)
 */
export async function bulkUpdateExcavationTrips(
  items: ExcavationTripBulkUpdateItem[],
): Promise<ApiResponse<ExcavationReportTripResponse[]>> {
  const validatedItems = items.map((item) => ({
    id: item.id,
    data: excavationTripReportTripRequestSchema.parse(item.data),
  }));
  const res = await api.put("/excavation-reports/trips/bulk", validatedItems);
  return res.data;
}

/**
 * Gọi API DELETE /api/excavation-reports/trips/bulk (Xóa nhiều chuyến)
 */
export async function bulkDeleteExcavationTrips(
  ids: number[],
): Promise<ApiResponse<BulkDeleteResponse>> {
  const res = await api.delete("/excavation-reports/trips/bulk", { data: { ids } });
  return res.data;
}

/**
 * Gọi API DELETE /api/excavation-reports/bulk (Xóa nhiều báo cáo ca)
 */
export async function bulkDeleteExcavationTripReports(
  ids: number[],
): Promise<ApiResponse<BulkDeleteResponse>> {
  const res = await api.delete("/excavation-reports/bulk", { data: { ids } });
  return res.data;
}

/**
 * Gọi API GET /api/excavation-reports/export
 */
export async function exportExcavationReports(params: {
  fromDate: string;
  toDate: string;
  shiftIds?: number[];
  excavatorIds?: number[];
  receivingLocationIds?: number[];
  excavationFloors?: string[];
}): Promise<Blob> {
  const res = await api.get("/excavation-reports/export", {
    params,
    responseType: "blob",
  });
  return res.data;
}

/**
 * Gọi API POST /api/excavation-reports/import
 */
export async function importExcavationReports(
  file: File,
): Promise<ApiResponse<ExcelImportResultResponse>> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/excavation-reports/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
}

/**
 * React Query Hooks
 */
export function useImportExcavationReportsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importExcavationReports(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useCreateExcavationTripReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ExcavationTripReportRequest) =>
      createExcavationTripReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useUpdateExcavationTripReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: ExcavationTripReportRequest;
    }) => updateExcavationTripReport(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useDeleteExcavationTripReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteExcavationTripReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useBulkCreateExcavationTripReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payloads: ExcavationTripReportRequest[]) =>
      bulkCreateExcavationTripReports(payloads),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useBulkUpdateExcavationTripReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: ExcavationReportBulkUpdateItem[]) =>
      bulkUpdateExcavationTripReports(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useBulkDeleteExcavationTripReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => bulkDeleteExcavationTripReports(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useExcavationReportsQuery(
  params: {
    fromDate?: string;
    toDate?: string;
    shiftIds?: number[];
    excavatorIds?: number[];
    receivingLocationIds?: number[];
    excavationFloors?: string[];
    page?: number;
    size?: number;
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["excavationReports", params],
    queryFn: () => fetchExcavationReports(params),
    enabled: options?.enabled ?? true,
  });
}

export function useExcavationReportByIdQuery(
  id: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["excavationReport", id],
    queryFn: () => fetchExcavationReportById(id!),
    enabled: Boolean(id) && enabled,
  });
}

// ─── Trip-level Mutation Hooks ───────────────────────────────────────────────

export function useUpdateExcavationTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tripId,
      payload,
    }: {
      tripId: number;
      payload: ExcavationTripReportTripUpdateRequest;
    }) => updateExcavationTrip(tripId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useDeleteExcavationTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tripId: number) => deleteExcavationTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useBulkUpdateExcavationTripsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: ExcavationTripBulkUpdateItem[]) =>
      bulkUpdateExcavationTrips(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useBulkDeleteExcavationTripsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => bulkDeleteExcavationTrips(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["excavationReports"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

