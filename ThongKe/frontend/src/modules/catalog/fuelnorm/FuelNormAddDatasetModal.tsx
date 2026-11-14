import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DIcon from "../design/DIcon";
import "@/styles/catalog-design.css";
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
    <div
      className="tkc-modal-overlay"
      style={{ zIndex: 110 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: "min(520px, 100%)" }} role="dialog" aria-modal="true" aria-label="Thêm bộ định mức">
        <div className="modal-header">
          <div>
            <h2>Thêm bộ định mức</h2>
            <p>Chọn Chủng loại xe và Hậu tố để mở một bộ dữ liệu mới.</p>
          </div>
          <button className="close-modal" style={{ marginLeft: "auto" }} aria-label="Đóng" onClick={onClose}>
            <DIcon name="x" />
          </button>
        </div>

        <div className="modal-body">
          <div className="fn-form">
            <div className="form-group">
              <label>Chủng loại xe</label>
              <select className="field" value={vehicleCode} onChange={(e) => setVehicleCode(e.target.value)}>
                <option value="">{isLoading ? "Đang tải…" : "Chọn chủng loại xe"}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.code}>
                    {v.name} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Hậu tố</label>
              <select className="field" value={suffix} onChange={(e) => setSuffix(e.target.value as FuelNormSuffix | "")}>
                <option value="">Chọn hậu tố</option>
                {FUEL_NORM_SUFFIXES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}
