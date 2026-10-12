import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/config/api.config";
import { FUEL_NORM_SUFFIXES, type FuelNormSuffix, vehicleSuffixKeyOf } from "./fuelNormKeys";

interface VehicleFuelClassOption {
  id: number;
  code: string;
  name: string;
}

/** Chọn Chủng loại xe + Hậu tố để mở một bộ dữ liệu mới trong lưới DMNL đang sửa. */
export function FuelNormAddDatasetModal({
  existingKeys,
  onClose,
  onConfirm,
}: {
  /** Các vehicleSuffixKey đã có trong lưới — chặn thêm trùng. */
  existingKeys: Set<string>;
  onClose: () => void;
  onConfirm: (vehicleSuffixKey: string) => void;
}) {
  const [vehicleCode, setVehicleCode] = useState("");
  const [suffix, setSuffix] = useState<FuelNormSuffix | "">("");
  const [error, setError] = useState<string | null>(null);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicle-fuel-classes-options"],
    queryFn: async () => {
      const res = await api.get("/vehicle-fuel-classes", { params: { size: 1000 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as VehicleFuelClassOption[];
    },
  });

  const submit = () => {
    if (!vehicleCode || !suffix) {
      setError("Chọn đủ Chủng loại xe và Hậu tố.");
      return;
    }
    const key = vehicleSuffixKeyOf(vehicleCode, suffix);
    if (existingKeys.has(key)) {
      setError(`Bộ định mức "${vehicleCode}.${suffix}" đã có trong lưới.`);
      return;
    }
    onConfirm(key);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold">Thêm bộ định mức</h2>
          <p className="text-xs text-muted-foreground">
            Chọn Chủng loại xe và Hậu tố để mở một bộ dữ liệu mới.
          </p>
        </div>

        <div className="space-y-3 px-6 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Chủng loại xe</label>
            <Select value={vehicleCode} onValueChange={setVehicleCode}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder={isLoading ? "Đang tải…" : "Chọn chủng loại xe"} />
              </SelectTrigger>
              <SelectContent className="z-[120]">
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.code}>
                    {v.name} ({v.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Hậu tố</label>
            <Select value={suffix} onValueChange={(v) => setSuffix(v as FuelNormSuffix)}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Chọn hậu tố" />
              </SelectTrigger>
              <SelectContent className="z-[120]">
                {FUEL_NORM_SUFFIXES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-3 dark:border-gray-800">
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={submit}>
            Thêm
          </Button>
        </div>
      </div>
    </div>
  );
}
