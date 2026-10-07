import { useQuery } from "@tanstack/react-query";
import api from "../config/api.config";
import { ModuleDef } from "./access";

// Danh sách module lấy từ backend (config/modules.js) — một nguồn duy nhất, giao diện không tự giữ bản sao.
export const useModules = () =>
  useQuery<ModuleDef[]>({
    queryKey: ["permission-modules"],
    queryFn: async () => (await api.get("/permissions/modules")).data.data,
    staleTime: 10 * 60 * 1000,
  });

/** Nhóm module theo `group`, giữ thứ tự xuất hiện. */
export const groupModules = (modules: ModuleDef[]): { group: string; items: ModuleDef[] }[] => {
  const map = new Map<string, ModuleDef[]>();
  for (const m of modules) {
    if (!map.has(m.group)) map.set(m.group, []);
    map.get(m.group)!.push(m);
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
};
