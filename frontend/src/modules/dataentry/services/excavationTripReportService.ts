import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/config/api.config";
import type { MiningSessionDraft } from "../components/MiningBatchEntryModal";

export const excavationTripReportTripRequestSchema = z.object({
  vehicleId: z
    .number({ message: "Số xe không hợp lệ" })
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
  departmentId: z.number().nullable().optional(),
  trips: z
    .array(excavationTripReportTripRequestSchema)
    .min(1, "Cần ít nhất 1 chuyến"),
});

export type ExcavationTripReportTripRequest = z.infer<
  typeof excavationTripReportTripRequestSchema
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
  vehicleId: number;
  vehicleCode: string;
  vehicleName: string;
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
export function buildExcavationReportRequest(
  sess: MiningSessionDraft,
  masterData: {
    rawShifts: any[];
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

  // 4. Map departmentId (Đơn vị)
  let departmentId: number | undefined;
  if (sess.department && masterData.rawDepartments) {
    const dept = masterData.rawDepartments.find(
      (d) => String(d.name).trim().toLowerCase() === String(sess.department).trim().toLowerCase()
    );
    if (dept) {
      departmentId = Number(dept.id);
    }
  }

  // 5. Map danh sách chuyến (trips)
  const trips: ExcavationTripReportTripRequest[] = sess.trips.map((t) => {
    // Map vehicleId
    const vehicleItem = masterData.rawVehicles.find(
      (v) =>
        v.code === t.vehicleNo ||
        v.vehicleNumber === t.vehicleNo ||
        v.name === t.vehicleNo ||
        String(v.id) === String(t.vehicleNo),
    );
    if (!vehicleItem) {
      throw new Error(`Xe số "${t.vehicleNo}" không tồn tại trong hệ thống`);
    }
    const vehicleId = Number(vehicleItem.id);

    // Map cargoTypeId
    const cargoTypeItem = masterData.rawCargoTypes.find(
      (c) => c.name === t.material || String(c.id) === String(t.material),
    );
    if (!cargoTypeItem) {
      throw new Error(`Loại hàng "${t.material}" không tồn tại trong hệ thống`);
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
  });

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
    departmentId,
    trips,
  };
}

/**
 * Reverse Mapper: Chuyển dữ liệu ExcavationReportResponse từ backend sang MiningSessionDraft của UI Form
 */
export function mapReportResponseToDraft(
  report: ExcavationReportResponse,
): MiningSessionDraft {
  return {
    _tempId: `sess_edit_${report.id}`,
    reportId: report.id,
    workingDate: report.reportDate || "",
    shift: report.shiftName || String(report.shiftId || ""),
    department: report.departmentName || "",
    pickupLocation: report.receivingLocationName || "",
    excavator: report.excavatorDeviceCode || report.excavatorDeviceName || "",
    totalScoops: report.excavationFloor ? Number(report.excavationFloor) || "" : "",
    initialFuel: report.fuelBeginning ?? "",
    receivedFuel: report.fuelReceived ?? "",
    finalFuel: report.fuelEnding ?? "",
    operatorBadgeNo: report.employeeSalaryCode || "",
    operatorName: report.employeeFullName || "",
    operatorUnit: report.employeeDepartmentName || "",
    trips: (report.trips || []).map((t, idx) => ({
      _tempId: `trip_edit_${t.id || idx}`,
      vehicleNo: t.vehicleCode || t.vehicleName || "",
      tripCount: t.tripCount || 1,
      material: t.cargoTypeName || "",
      loadStatus:
        t.loadLevelType === "OTHER"
          ? "Khác"
          : t.loadLevelType === "RODA_2_3"
          ? "Roda (2/3)"
          : "Đủ tải",
      loadStatusNote: t.loadLevelCustomValue || "",
      vehicleManagementUnit: t.vehicleDepartmentName || "",
      vehicleType: t.vehicleCategoryName || "",
    })),
  };
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
  page?: number;
  size?: number;
}): Promise<ApiResponse<PageResponse<ExcavationReportResponse> | ExcavationReportResponse[]>> {
  const res = await api.get("/excavation-reports", { params });
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

/**
 * Gọi API DELETE /api/excavation-reports/bulk
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
