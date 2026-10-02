import { useQuery } from "@tanstack/react-query";
import api from "../../../config/api.config";
import DepartmentService from "../../../services/departmentService";

// hooks/useOrderFormData.ts
export function useOrderFormData() {
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get("/locations").then((res) => res.data.data),
  });
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((res) => res.data.data),
  });
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => api.get("/shifts").then((res) => res.data.data),
  });
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => api.get("/devices").then((res) => res.data.data),
  });
  const { data: allDevices = [] } = useQuery({
    queryKey: ["allDevices"],
    queryFn: () => api.get("/devices/all").then((res) => res.data.data),
  });
  const { data: excavators = [] } = useQuery({
    queryKey: ["excavators"],
    queryFn: () =>
      api.get("/devices/excavators/all").then((res) => res.data.data),
  });
  const { data: departments = { data: [] } } = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartmentService.getAll(),
  });
  const { data: cars = [] } = useQuery({
    queryKey: ["cars"],
    queryFn: () => api.get("/devices/car/all").then((res) => res.data.data),
  });
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: () => api.get("/materials").then((res) => res.data.data),
  });
  const { data: safetyMeasures = [] } = useQuery({
    queryKey: ["safetyMeasures"],
    queryFn: () => api.get("/safetyMeasures").then((res) => res.data.data),
  });
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => api.get("/jobs").then((res) => res.data.data),
  });

  return {
    locations,
    users,
    shifts,
    devices,
    allDevices,
    excavators,
    departments,
    cars,
    materials,
    safetyMeasures,
    jobs,
  };
}
