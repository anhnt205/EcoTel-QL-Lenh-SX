import { useQueries } from "@tanstack/react-query";
import * as masterDataService from "../services/masterDataService";

const STALE_TIME = 5 * 60 * 1000; // 5 phút cache cho master data

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

export function useMasterData() {
  const results = useQueries({
    queries: [
      {
        queryKey: ["masterData", "shifts"],
        queryFn: masterDataService.fetchShifts,
        staleTime: STALE_TIME,
      },
      {
        queryKey: ["masterData", "departments"],
        queryFn: masterDataService.fetchDepartments,
        staleTime: STALE_TIME,
      },
      {
        queryKey: ["masterData", "locations"],
        queryFn: masterDataService.fetchLocations,
        staleTime: STALE_TIME,
      },
      {
        queryKey: ["masterData", "devices"],
        queryFn: masterDataService.fetchDevices,
        staleTime: STALE_TIME,
      },
      {
        queryKey: ["masterData", "materials"],
        queryFn: masterDataService.fetchMaterials,
        staleTime: STALE_TIME,
      },
      {
        queryKey: ["masterData", "users"],
        queryFn: masterDataService.fetchUsers,
        staleTime: STALE_TIME,
      },
      {
        queryKey: ["masterData", "cargoTypes"],
        queryFn: masterDataService.fetchCargoTypes,
        staleTime: STALE_TIME,
      },
      {
        queryKey: ["masterData", "cargoGroups"],
        queryFn: masterDataService.fetchCargoGroups,
        staleTime: STALE_TIME,
      },
    ],
  });

  const [
    shiftsQ,
    deptQ,
    locQ,
    devicesQ,
    materialsQ,
    usersQ,
    cargoTypesQ,
    cargoGroupsQ,
  ] = results;

  const rawShifts = shiftsQ.data ?? [];
  const rawDepartments = deptQ.data ?? [];
  const rawLocations = locQ.data ?? [];
  const rawDevices = devicesQ.data ?? [];
  const rawMaterials = materialsQ.data ?? [];
  const rawUsers = usersQ.data ?? [];
  const rawCargoTypes = cargoTypesQ.data ?? [];
  const rawCargoGroups = cargoGroupsQ.data ?? [];

  // Lọc thiết bị: Máy xúc vs Xe vận tải
  const rawExcavators = rawDevices.filter((d) => {
    const cat = (d.categoryName || d.code || "").toUpperCase();
    return (
      cat.includes("MÁY XÚC") || cat.includes("MX") || d.code.startsWith("MX")
    );
  });

  const rawVehicles = rawDevices.filter((d) => {
    const cat = (d.categoryName || d.code || "").toUpperCase();
    return (
      !cat.includes("MÁY XÚC") &&
      (cat.includes("XE") ||
        cat.includes("Ô TÔ") ||
        d.vehicleNumber ||
        !d.code.startsWith("MX"))
    );
  });

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
      value: d.name || d.code,
      label: d.name || d.code,
      rawData: d,
    })),
  );

  const vehicleOptions = deduplicateOptions(
    rawVehicles.map((d) => ({
      value: d.vehicleNumber || d.name || d.code,
      label: d.name || d.vehicleNumber || d.code,
      rawData: d,
    })),
  );

  const materialOptions = toOptions(rawMaterials, "name", "name");

  const operatorOptions = deduplicateOptions(
    rawUsers.map((u) => ({
      value: u.salaryCode,
      label: `${u.salaryCode} - ${u.fullName}`,
      rawData: u,
    })),
  );

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
        vehicleManagementUnit: found.departmentName || "PXVT",
        vehicleType: found.materialName || found.categoryName || "Xe Vận Tải",
      };
    }
    return { vehicleManagementUnit: "", vehicleType: "" };
  };

  const getOperatorDetails = (
    badgeNo: string,
  ): { operatorName: string; operatorUnit: string } => {
    if (!badgeNo) return { operatorName: "", operatorUnit: "" };
    const trimmed = badgeNo.trim().toLowerCase();
    const found = rawUsers.find(
      (u) =>
        u.salaryCode.toLowerCase() === trimmed ||
        u.username.toLowerCase() === trimmed,
    );

    if (found) {
      return {
        operatorName: found.fullName,
        operatorUnit: found.departmentName || "Phân Xưởng Khai Thác",
      };
    }
    return { operatorName: "", operatorUnit: "" };
  };

  const getCargoGroupDetails = (cargoType: string): string => {
    if (!cargoType) return "Nhóm Hàng";
    const trimmed = cargoType.trim().toLowerCase();
    const foundGroup = rawCargoGroups.find(
      (g) =>
        g.cargoTypeName?.toLowerCase() === trimmed ||
        g.name.toLowerCase().includes(trimmed),
    );
    if (foundGroup) return foundGroup.name;

    // Quy đổi nhóm hàng theo loại hàng
    if (trimmed.includes("than")) return "Nhóm Than Nguyên Khai";
    if (trimmed.includes("đất")) return "Nhóm Đất Phủ Bóc";
    if (trimmed.includes("nomin") || trimmed.includes("nổ")) return "Nhóm Nổ Minh";
    if (trimmed.includes("đá") || trimmed.includes("dthai")) return "Nhóm Đá Thải";
    return "Nhóm Hàng";
  };

  return {
    // Raw arrays
    rawShifts,
    rawDepartments,
    rawLocations,
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

    // Status flags
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
    errors: results.filter((r) => r.isError).map((r) => r.error),
  };
}

