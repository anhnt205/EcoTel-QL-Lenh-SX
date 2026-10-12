/**
 * Khoá cột "Mô hình" theo Chủng loại xe — chuỗi tự do
 * {@code <mã chủng loại xe>.<CS|KC>}, KHÔNG phải khoá ngoại (xem
 * `ModelPeriodValue.vehicleKey` phía backend). Cùng quy ước với DMNL
 * (`fuelnorm/fuelNormKeys.ts`) — chép riêng ở đây, không import chéo, để
 * đổi một bên không ảnh hưởng bên kia.
 */

export type ModelVehicleSuffix = "CS" | "KC";

export const MODEL_VEHICLE_SUFFIXES: { value: ModelVehicleSuffix; label: string }[] = [
  { value: "CS", label: ".CS (Cao Sơn)" },
  { value: "KC", label: ".KC (Ngoài khu vực)" },
];

export const vehicleSuffixKeyOf = (vehicleCode: string, suffix: ModelVehicleSuffix): string =>
  `${vehicleCode}.${suffix}`;

export function parseVehicleSuffixKey(
  key: string,
): { vehicleCode: string; suffix: ModelVehicleSuffix } | null {
  if (key.endsWith(".CS")) return { vehicleCode: key.slice(0, -3), suffix: "CS" };
  if (key.endsWith(".KC")) return { vehicleCode: key.slice(0, -3), suffix: "KC" };
  return null;
}
