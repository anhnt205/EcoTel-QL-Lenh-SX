import { useQueries } from "@tanstack/react-query";
import * as masterDataService from "../services/masterDataService";

export interface MasterOption<T = any> {
  value: string;
  label: string;
  rawData?: T;
}

const deduplicateOptions = <T extends { value: string }>(options: T[]): T[] => {
  const seen = new Set<string>();
  return options.filter((opt) => {
    if (!opt.value || seen.has(opt.value)) return false;
    seen.add(opt.value);
    return true;
  });
};

const toOptions = <T>(
  items: T[] | undefined,
  valueKey: keyof T,
  labelKey: keyof T,
): MasterOption<T>[] => {
  if (!items || !Array.isArray(items)) return [];
  const options = items.map((item) => ({
    value: String(item[valueKey] ?? ""),
    label: String(item[labelKey] ?? item[valueKey] ?? ""),
    rawData: item,
  }));
  return deduplicateOptions(options);
};

export interface UseMasterDataOptions {
  enabled?: boolean;
}

export function useMasterData(options: UseMasterDataOptions = {}) {
  const { enabled = true } = options;

  const results = useQueries({
    queries: [
      {
        queryKey: ["masterData", "shifts"],
        queryFn: masterDataService.fetchShifts,
        enabled,
        staleTime: 0,
      },
      {
        queryKey: ["masterData", "departments"],
        queryFn: masterDataService.fetchDepartments,
        enabled,
        staleTime: 0,
      },
      {
        queryKey: ["masterData", "locations"],
        queryFn: masterDataService.fetchLocations,
        enabled,
        staleTime: 0,
      },
      {
        queryKey: ["masterData", "excavators"],
        queryFn: masterDataService.fetchExcavators,
        enabled,
        staleTime: 0,
      },
      {
        queryKey: ["masterData", "transportVehicles"],
        queryFn: masterDataService.fetchTransportVehicles,
        enabled,
        staleTime: 0,
      },
      {
        queryKey: ["masterData", "materials"],
        queryFn: masterDataService.fetchMaterials,
        enabled,
        staleTime: 0,
      },
      {
        queryKey: ["masterData", "users"],
        queryFn: masterDataService.fetchUsers,
        enabled,
        staleTime: 0,
      },
      {
        queryKey: ["masterData", "cargoTypes"],
        queryFn: masterDataService.fetchCargoTypes,
        enabled,
        staleTime: 0,
      },
      {
        queryKey: ["masterData", "cargoGroups"],
        queryFn: masterDataService.fetchCargoGroups,
        enabled,
        staleTime: 0,
      },
    ],
  });

  const [
    shiftsQ,
    deptQ,
    locQ,
    excavatorsQ,
    transportVehiclesQ,
    materialsQ,
    usersQ,
    cargoTypesQ,
    cargoGroupsQ,
  ] = results;

  const rawShifts = shiftsQ.data ?? [];
  const rawDepartments = deptQ.data ?? [];
  const rawLocations = locQ.data ?? [];
  const rawExcavators = excavatorsQ.data ?? [];
  const rawVehicles = transportVehiclesQ.data ?? [];
  const rawDevices = [...rawExcavators, ...rawVehicles];
  const rawMaterials = materialsQ.data ?? [];
  const rawUsers = usersQ.data ?? [];
  const rawCargoTypes = cargoTypesQ.data ?? [];
  const rawCargoGroups = cargoGroupsQ.data ?? [];

  // Chuyển đổi thành mảng Option chuẩn
  const rawShiftOptions = rawShifts.map((s) => {
    const rawVal = String(s.name ?? "").trim();
    const cleanNum = rawVal.replace(/^ca\s+/i, "");
    return {
      value: cleanNum,
      label: `Ca ${cleanNum}`,
      rawData: s,
    };
  });
  const shiftOptions = deduplicateOptions(rawShiftOptions);
  if (shiftOptions.length === 0) {
    shiftOptions.push(
      { value: "1", label: "Ca 1", rawData: { id: 1, name: "1" } },
      { value: "2", label: "Ca 2", rawData: { id: 2, name: "2" } },
      { value: "3", label: "Ca 3", rawData: { id: 3, name: "3" } },
    );
  }

  const departmentOptions = toOptions(rawDepartments, "name", "name");
  const locationOptions = toOptions(rawLocations, "name", "name");

  const excavatorOptions = deduplicateOptions(
    rawExcavators.map((d) => ({
      value: d.code || d.name,
      label: d.code || d.name,
      rawData: d,
    })),
  );

  const vehicleOptions = deduplicateOptions(
    rawVehicles.map((d) => ({
      value: d.code || d.vehicleNumber || d.name,
      label: d.code || d.vehicleNumber || d.name,
      rawData: d,
    })),
  );

  const materialOptions = toOptions(rawMaterials, "name", "name");

  const rawOperatorOptions = rawUsers
    .filter((u) => u && (u.salaryCode || u.username || u.fullName))
    .map((u) => {
      const code = String(u.salaryCode || u.username || "").trim();
      const name = String(u.fullName || "").trim();
      return {
        value: code,
        label: code && name ? `${code} - ${name}` : code || name,
        rawData: u,
      };
    })
    .filter((o) => o.value !== "");

  const operatorOptions = deduplicateOptions(rawOperatorOptions);

  const cargoTypeOptions = toOptions(rawCargoTypes, "name", "name");
  const cargoGroupOptions = toOptions(rawCargoGroups, "name", "name");

  // Mảng chuỗi đơn giản dùng trực tiếp cho ComboboxInput / Select
  const shiftValues = shiftOptions.map((o) => o.value);
  const departmentValues = departmentOptions.map((o) => o.value);
  const locationValues = locationOptions.map((o) => o.value);
  const excavatorValues = excavatorOptions.map((o) => o.value);
  const vehicleValues = vehicleOptions.map((o) => o.value);
  const materialValues = materialOptions.map((o) => o.value);
  const operatorBadgeValues = operatorOptions.map((o) => o.value);
  const cargoTypeValues = cargoTypeOptions.map((o) => o.value);
  const cargoGroupValues = cargoGroupOptions.map((o) => o.value);

  // Tra cứu tự động từ cache (thay thế cho lookup.ts)
  const getVehicleDetails = (
    vehicleNo: string,
  ): { vehicleManagementUnit: string; vehicleType: string } => {
    if (!vehicleNo) return { vehicleManagementUnit: "", vehicleType: "" };
    const trimmed = vehicleNo.trim().toLowerCase();
    const found = rawDevices.find(
      (d) =>
        (d.vehicleNumber && d.vehicleNumber.toLowerCase() === trimmed) ||
        (d.code && d.code.toLowerCase() === trimmed) ||
        (d.name && d.name.toLowerCase() === trimmed) ||
        (d.name && d.name.toLowerCase().includes(trimmed)),
    );

    if (found) {
      return {
        vehicleManagementUnit: found.departmentName || "",
        vehicleType: found.materialName || "",
      };
    }
    return { vehicleManagementUnit: "", vehicleType: "" };
  };

  const getOperatorDetails = (
    badgeNo: string,
  ): { operatorName: string; operatorUnit: string } => {
    if (!badgeNo) return { operatorName: "", operatorUnit: "" };
    const trimmed = badgeNo.trim().toLowerCase();

    // Tìm trong danh sách rawUsers trả về từ API Backend (xử lý null-safe)
    const found = rawUsers.find((u) => {
      const code = String(u.salaryCode || "")
        .trim()
        .toLowerCase();
      const uname = String(u.username || "")
        .trim()
        .toLowerCase();
      const fname = String(u.fullName || "")
        .trim()
        .toLowerCase();
      const fullLabel = `${code} - ${fname}`.toLowerCase();

      return (
        (code && code === trimmed) ||
        (uname && uname === trimmed) ||
        (fname && fname === trimmed) ||
        (fullLabel && fullLabel === trimmed) ||
        (code && trimmed.startsWith(code))
      );
    });

    if (found) {
      return {
        operatorName: found.fullName || "",
        operatorUnit: found.departmentName || "",
      };
    }

    return {
      operatorName: "",
      operatorUnit: "",
    };
  };

  const getCargoGroupDetails = (cargoType: string): string => {
    if (!cargoType) return "";
    const trimmed = cargoType.trim().toLowerCase();

    // 1. Tra cứu trực tiếp từ danh mục Loại hàng (Loại hàng thuộc về Nhóm hàng cha)
    const foundType = rawCargoTypes.find(
      (t) => t.name.trim().toLowerCase() === trimmed,
    );
    if (foundType?.cargoGroupName) return foundType.cargoGroupName;

    // 2. Tra cứu qua danh mục Nhóm hàng nếu có khớp tên
    const foundGroup = rawCargoGroups.find((g) =>
      g.name.toLowerCase().includes(trimmed),
    );
    if (foundGroup) return foundGroup.name;
    return "";
  };

  const getCargoTypesByGroup = (cargoGroup: string): string[] => {
    if (!cargoGroup || !cargoGroup.trim()) {
      return cargoTypeValues;
    }
    const trimmedGroup = cargoGroup.trim().toLowerCase();
    const filtered = rawCargoTypes.filter((t) => {
      const gName = String(t.cargoGroupName || "").trim().toLowerCase();
      return gName === trimmedGroup || gName.includes(trimmedGroup);
    });
    if (filtered.length === 0) return cargoTypeValues;
    return Array.from(new Set(filtered.map((t) => t.name)));
  };

  return {
    // Raw arrays
    rawShifts,
    rawDepartments,
    rawLocations,
    rawExcavators,
    rawVehicles,
    rawDevices,
    rawMaterials,
    rawUsers,
    rawCargoTypes,
    rawCargoGroups,

    // Option arrays
    shiftOptions,
    departmentOptions,
    locationOptions,
    excavatorOptions,
    vehicleOptions,
    materialOptions,
    operatorOptions,
    cargoTypeOptions,
    cargoGroupOptions,

    // Value arrays (strings)
    shiftValues,
    departmentValues,
    locationValues,
    excavatorValues,
    vehicleValues,
    materialValues,
    operatorBadgeValues,
    cargoTypeValues,
    cargoGroupValues,

    // Lookup functions
    getVehicleDetails,
    getOperatorDetails,
    getCargoGroupDetails,
    getCargoTypesByGroup,

    // Status flags
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
    errors: results.filter((r) => r.isError).map((r) => r.error),
  };
}
