import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/config/api.config";
import type { TransportSessionDraft } from "../components/TransportHeaderDetailModal";

export const transportReportTripRequestSchema = z.object({
  vehicleId: z
    .number({ message: "Số xe không hợp lệ" })
    .min(1, "Số xe là bắt buộc"),
  rainyDay: z.boolean().optional(),
  supplementaryVehicle: z.boolean().optional(),
  excavationAreaId: z
    .number({ message: "Khu vực xúc không hợp lệ" })
    .min(1, "Khu vực xúc là bắt buộc"),
  excavatorDeviceId: z
    .number({ message: "Máy xúc không hợp lệ" })
    .min(1, "Máy xúc là bắt buộc"),
  loadingPointId: z
    .number({ message: "Nơi nhận tải không hợp lệ" })
    .min(1, "Nơi nhận tải là bắt buộc"),
  receivingFloor: z.number().nullable().optional(),
  unloadingFloor: z.string().nullable().optional(),
  totalRouteDistanceKm: z.number().nullable().optional(),
  totalRouteLiftM: z.number().nullable().optional(),
  localSlopeDistanceKm: z.number().nullable().optional(),
  localSlopeM: z.number().nullable().optional(),
  unloadingPointId: z
    .number({ message: "Nơi dỡ tải không hợp lệ" })
    .min(1, "Nơi dỡ tải là bắt buộc"),
  cargoTypeId: z
    .number({ message: "Loại hàng không hợp lệ" })
    .min(1, "Loại hàng là bắt buộc"),
  tripCount: z.number().min(1, "Số chuyến phải >= 1"),
  loadLevelType: z.enum(["FULL_LOAD", "RODA_2_3", "OTHER"]),
  loadLevelCustomValue: z
    .string()
    .nullable()
    .optional()
    .refine((val) => !val || /^\d+\/[1-9]\d*$/.test(val), {
      message: "Chỉ chấp nhận dạng phân số không khoảng trắng, ví dụ: 1/2, 2/3",
    }),
});

export const transportReportRequestSchema = z.object({
  reportDate: z
    .string({ message: "Thời gian là bắt buộc" })
    .min(1, "Thời gian là bắt buộc"),
  shiftId: z.number({ message: "Ca là bắt buộc" }).min(1, "Ca là bắt buộc"),
  employeeId: z
    .number({ message: "Số thẻ lương là bắt buộc" })
    .min(1, "Số thẻ lương là bắt buộc"),
  fuelBeginning: z.number({ message: "Nhiên liệu tồn đầu là bắt buộc" }),
  fuelEnding: z.number({ message: "Nhiên liệu tồn cuối là bắt buộc" }),
  fuelReceived: z.number({ message: "Nhiên liệu lĩnh là bắt buộc" }),
  trips: z
    .array(transportReportTripRequestSchema)
    .min(1, "Cần ít nhất 1 chuyến"),
});

export type TransportReportTripRequest = z.infer<
  typeof transportReportTripRequestSchema
>;
export type TransportReportRequest = z.infer<
  typeof transportReportRequestSchema
>;

export interface ApiResponse<T> {
  status: number;
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface TransportReportTripResponse {
  id: number;
  vehicleId: number;
  vehicleCode: string;
  vehicleName: string;
  vehicleDepartmentName?: string;
  vehicleCategoryName?: string;
  rainyDay?: boolean;
  supplementaryVehicle?: boolean;
  excavationAreaId: number;
  excavationAreaName: string;
  excavatorDeviceId: number;
  excavatorDeviceName: string;
  loadingPointId: number;
  loadingPointName: string;
  receivingFloor?: number | null;
  receivingFloorGroup?: number | null;
  unloadingFloor?: string | null;
  totalRouteDistanceKm?: number | null;
  totalRouteLiftM?: number | null;
  localSlopeDistanceKm?: number | null;
  localSlopeM?: number | null;
  unloadingPointId: number;
  unloadingPointName: string;
  cargoTypeId: number;
  cargoTypeName: string;
  cargoGroupId?: number;
  cargoGroupName?: string;
  tripCount: number;
  loadLevelType: "FULL_LOAD" | "RODA_2_3" | "OTHER";
  loadLevelCustomValue?: string | null;
}

export interface TransportReportResponse {
  id: number;
  reportDate: string;
  shiftId: number;
  shiftName: number | string;
  employeeId: number;
  employeeSalaryCode: string;
  employeeFullName: string;
  employeeDepartmentName?: string;
  fuelBeginning: number;
  fuelEnding: number;
  fuelReceived: number;
  fuelUsed?: number;
  trips: TransportReportTripResponse[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface TransportReportBulkUpdateItem {
  id: number;
  data: TransportReportRequest;
}

export interface BulkDeleteResponse {
  requestedCount: number;
  deletedCount: number;
}

/**
 * Hàm hỗ trợ map dữ liệu từ TransportSessionDraft (UI Form) thành TransportReportRequest (API Backend)
 */
export function buildTransportReportRequest(
  sess: TransportSessionDraft,
  masterData: {
    rawShifts: any[];
    rawLocations: any[];
    rawExcavators: any[];
    rawVehicles: any[];
    rawUsers: any[];
    rawCargoTypes: any[];
    rawDepartments?: any[];
  },
): TransportReportRequest {
  // 1. Map shiftId
  const shiftItem = masterData.rawShifts.find(
    (s) =>
      String(s.name) === String(sess.shift) ||
      String(s.id) === String(sess.shift) ||
      String(s.name).replace(/^ca\s+/i, "").trim() ===
        String(sess.shift).replace(/^ca\s+/i, "").trim(),
  );
  if (!shiftItem) {
    throw new Error(
      `Ca làm việc "${sess.shift}" không hợp lệ, vui lòng chọn lại từ danh sách`,
    );
  }
  const shiftId = Number(shiftItem.id);

  // 2. Map employeeId (Người vận hành theo số thẻ lương)
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

  // 3. Map danh sách chuyến (trips)
  const trips: TransportReportTripRequest[] = sess.trips.map((t, idx) => {
    // Map vehicleId
    const vehicleItem = masterData.rawVehicles.find(
      (v) =>
        v.code === t.vehicleNo ||
        v.vehicleNumber === t.vehicleNo ||
        v.name === t.vehicleNo ||
        String(v.id) === String(t.vehicleNo),
    );
    if (!vehicleItem) {
      throw new Error(
        `Chuyến #${idx + 1}: Xe số "${t.vehicleNo}" không tồn tại trong hệ thống`,
      );
    }
    const vehicleId = Number(vehicleItem.id);

    // Map excavationAreaId (Khu vực xúc)
    const areaItem =
      masterData.rawLocations.find(
        (l) =>
          l.name === t.excavationArea ||
          String(l.id) === String(t.excavationArea),
      ) ||
      (masterData.rawDepartments || []).find(
        (d) =>
          d.name === t.excavationArea ||
          String(d.id) === String(t.excavationArea),
      );
    if (!areaItem) {
      throw new Error(
        `Chuyến #${idx + 1}: Khu vực xúc "${t.excavationArea}" không tồn tại trong hệ thống`,
      );
    }
    const excavationAreaId = Number(areaItem.id);

    // Map excavatorDeviceId (Máy xúc)
    const excavatorItem = masterData.rawExcavators.find(
      (d) =>
        d.code === t.excavatorEquipment ||
        d.name === t.excavatorEquipment ||
        String(d.id) === String(t.excavatorEquipment),
    );
    if (!excavatorItem) {
      throw new Error(
        `Chuyến #${idx + 1}: Máy xúc "${t.excavatorEquipment}" không tồn tại trong hệ thống`,
      );
    }
    const excavatorDeviceId = Number(excavatorItem.id);

    // Map loadingPointId (Nơi nhận tải)
    const loadingLocItem = masterData.rawLocations.find(
      (l) =>
        l.name === t.pickupLocation ||
        String(l.id) === String(t.pickupLocation),
    );
    if (!loadingLocItem) {
      throw new Error(
        `Chuyến #${idx + 1}: Nơi nhận tải "${t.pickupLocation}" không tồn tại trong hệ thống`,
      );
    }
    const loadingPointId = Number(loadingLocItem.id);

    // Map unloadingPointId (Nơi dỡ tải)
    const unloadingLocItem = masterData.rawLocations.find(
      (l) =>
        l.name === t.unloadLocationName ||
        String(l.id) === String(t.unloadLocationName),
    );
    if (!unloadingLocItem) {
      throw new Error(
        `Chuyến #${idx + 1}: Nơi dỡ tải "${t.unloadLocationName}" không tồn tại trong hệ thống`,
      );
    }
    const unloadingPointId = Number(unloadingLocItem.id);

    // Map cargoTypeId
    const cargoTypeItem = masterData.rawCargoTypes.find(
      (c) => c.name === t.cargoType || String(c.id) === String(t.cargoType),
    );
    if (!cargoTypeItem) {
      throw new Error(
        `Chuyến #${idx + 1}: Loại hàng "${t.cargoType}" không tồn tại trong hệ thống`,
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
      rainyDay: Boolean(t.isRainyDay),
      supplementaryVehicle: Boolean(t.isTraineeVehicle),
      excavationAreaId,
      excavatorDeviceId,
      loadingPointId,
      receivingFloor:
        t.pickupBench !== "" && t.pickupBench !== undefined && t.pickupBench !== null
          ? parseInt(String(t.pickupBench), 10) || null
          : null,
      unloadingFloor: t.unloadBench || null,
      totalRouteDistanceKm:
        t.fullRouteDistance !== "" && t.fullRouteDistance !== undefined
          ? Number(t.fullRouteDistance) || null
          : null,
      totalRouteLiftM:
        t.fullRouteElevate !== "" && t.fullRouteElevate !== undefined
          ? Number(t.fullRouteElevate) || null
          : null,
      localSlopeDistanceKm:
        t.localSlopeDist !== "" && t.localSlopeDist !== undefined
          ? Number(t.localSlopeDist) || null
          : null,
      localSlopeM:
        t.localSlopeDegree !== "" && t.localSlopeDegree !== undefined
          ? Number(t.localSlopeDegree) || null
          : null,
      unloadingPointId,
      cargoTypeId,
      tripCount: Number(t.tripCount) || 1,
      loadLevelType,
      loadLevelCustomValue:
        loadLevelType === "OTHER" ? loadLevelCustomValue : null,
    };
  });

  return {
    reportDate: sess.workingDate,
    shiftId,
    employeeId,
    fuelBeginning: Number(sess.initialFuel),
    fuelEnding: Number(sess.finalFuel),
    fuelReceived: Number(sess.receivedFuel),
    trips,
  };
}

/**
 * Reverse Mapper: Chuyển dữ liệu TransportReportResponse từ backend sang TransportSessionDraft của UI Form
 */
export function mapReportResponseToDraft(
  report: TransportReportResponse,
): TransportSessionDraft {
  const rawShift = String(report.shiftName || report.shiftId || "");
  const cleanShift = rawShift.replace(/^ca\s+/i, "").trim();

  return {
    _tempId: `sess_edit_${report.id}`,
    reportId: report.id,
    workingDate: report.reportDate || "",
    shift: cleanShift,
    initialFuel: report.fuelBeginning ?? "",
    receivedFuel: report.fuelReceived ?? "",
    finalFuel: report.fuelEnding ?? "",
    operatorBadgeNo: report.employeeSalaryCode || "",
    operatorName: report.employeeFullName || "",
    operatorUnit: report.employeeDepartmentName || "",
    trips: (report.trips || []).map((t, idx) => ({
      _tempId: `trip_edit_${t.id || idx}`,
      excavationArea: t.excavationAreaName || "",
      excavatorEquipment: t.excavatorDeviceName || "",
      pickupLocation: t.loadingPointName || "",
      pickupBench: t.receivingFloor != null ? String(t.receivingFloor) : "",
      pickupBenchGroup: t.receivingFloorGroup != null ? t.receivingFloorGroup : "",
      unloadBench: t.unloadingFloor || "",
      fullRouteDistance: t.totalRouteDistanceKm ?? "",
      fullRouteElevate: t.totalRouteLiftM ?? "",
      localSlopeDist: t.localSlopeDistanceKm ?? "",
      localSlopeDegree: t.localSlopeM ?? "",
      unloadLocationName: t.unloadingPointName || "",
      cargoType: t.cargoTypeName || "",
      cargoGroup: t.cargoGroupName || "",
      vehicleNo: t.vehicleCode || t.vehicleName || "",
      tripCount: t.tripCount || 1,
      loadStatus:
        t.loadLevelType === "OTHER"
          ? "Khác"
          : t.loadLevelType === "RODA_2_3"
          ? "Roda (2/3)"
          : "Đủ tải",
      loadStatusNote: t.loadLevelCustomValue || "",
      isRainyDay: Boolean(t.rainyDay),
      isTraineeVehicle: Boolean(t.supplementaryVehicle),
      equipmentUnit: t.vehicleDepartmentName || "",
      vehicleType: t.vehicleCategoryName || "",
    })),
  };
}

/**
 * Gọi API POST /api/transport-reports
 */
export async function createTransportReport(
  payload: TransportReportRequest,
): Promise<ApiResponse<TransportReportResponse>> {
  const validatedPayload = transportReportRequestSchema.parse(payload);
  const res = await api.post("/transport-reports", validatedPayload);
  return res.data;
}

/**
 * Gọi API GET /api/transport-reports
 */
export async function fetchTransportReports(params: {
  fromDate?: string;
  toDate?: string;
  shiftIds?: number[];
  deviceIds?: number[];
  page?: number;
  size?: number;
}): Promise<ApiResponse<PageResponse<TransportReportResponse> | TransportReportResponse[]>> {
  const res = await api.get("/transport-reports", { params });
  return res.data;
}

/**
 * Gọi API GET /api/transport-reports/{id}
 */
export async function fetchTransportReportById(
  id: number,
): Promise<ApiResponse<TransportReportResponse>> {
  const res = await api.get(`/transport-reports/${id}`);
  return res.data;
}

/**
 * Gọi API PUT /api/transport-reports/{id}
 */
export async function updateTransportReport(
  id: number,
  payload: TransportReportRequest,
): Promise<ApiResponse<TransportReportResponse>> {
  const validatedPayload = transportReportRequestSchema.parse(payload);
  const res = await api.put(`/transport-reports/${id}`, validatedPayload);
  return res.data;
}

/**
 * Gọi API DELETE /api/transport-reports/{id}
 */
export async function deleteTransportReport(
  id: number,
): Promise<ApiResponse<void>> {
  const res = await api.delete(`/transport-reports/${id}`);
  return res.data;
}

/**
 * Gọi API POST /api/transport-reports/bulk
 */
export async function bulkCreateTransportReports(
  payloads: TransportReportRequest[],
): Promise<ApiResponse<TransportReportResponse[]>> {
  const validatedPayloads = z
    .array(transportReportRequestSchema)
    .parse(payloads);
  const res = await api.post("/transport-reports/bulk", validatedPayloads);
  return res.data;
}

/**
 * Gọi API PUT /api/transport-reports/bulk
 */
export async function bulkUpdateTransportReports(
  items: TransportReportBulkUpdateItem[],
): Promise<ApiResponse<TransportReportResponse[]>> {
  const validatedItems = items.map((item) => ({
    id: item.id,
    data: transportReportRequestSchema.parse(item.data),
  }));
  const res = await api.put("/transport-reports/bulk", validatedItems);
  return res.data;
}

/**
 * Gọi API DELETE /api/transport-reports/bulk
 */
export async function bulkDeleteTransportReports(
  ids: number[],
): Promise<ApiResponse<BulkDeleteResponse>> {
  const res = await api.delete("/transport-reports/bulk", { data: { ids } });
  return res.data;
}

/**
 * React Query Hooks cho Vận tải
 */
export function useCreateTransportReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TransportReportRequest) =>
      createTransportReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useUpdateTransportReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: TransportReportRequest;
    }) => updateTransportReport(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useDeleteTransportReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTransportReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useBulkCreateTransportReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payloads: TransportReportRequest[]) =>
      bulkCreateTransportReports(payloads),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useBulkUpdateTransportReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: TransportReportBulkUpdateItem[]) =>
      bulkUpdateTransportReports(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useBulkDeleteTransportReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => bulkDeleteTransportReports(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportReports"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useTransportReportsQuery(
  params: {
    fromDate?: string;
    toDate?: string;
    shiftIds?: number[];
    deviceIds?: number[];
    page?: number;
    size?: number;
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["transportReports", params],
    queryFn: () => fetchTransportReports(params),
    enabled: options?.enabled ?? true,
  });
}

export function useTransportReportByIdQuery(
  id: number | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["transportReport", id],
    queryFn: () => fetchTransportReportById(id!),
    enabled: Boolean(id) && enabled,
  });
}
