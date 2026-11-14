import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DIcon from "../design/DIcon";
import "@/styles/catalog-design.css";
import api from "@/config/api.config";
import {
  FUEL_NORM_SUFFIXES,
  type FuelNormDataset,
  type FuelNormSuffix,
  buildColumnKey,
  vehicleSuffixKeyOf,
} from "./fuelNormKeys";

interface VehicleFuelClassOption {
  id: number;
  code: string;
  name: string;
}

export interface FuelNormBulkColumn {
  key: string;
  label: string;
}

/**
 * Thêm nhiều bộ dữ liệu (Chủng loại xe × Hậu tố) cùng lúc, dùng CHUNG một
 * danh sách Cung độ — Cung độ (và Độ dốc, vốn đã là trục dùng chung của cả
 * lưới) chỉ cần khai một lần, không phải lặp lại cho từng chủng loại xe
 * như khi thêm từng bộ một.
 *
 * Đánh dấu chủng loại xe đã có bộ dữ liệu trong lưới, và khi tổ hợp đang
 * chọn trùng một bộ đã có thì hiện luôn cung độ hiện có (kèm nút xoá) —
 * tránh gõ trùng và cho sửa/xoá ngay tại đây thay vì phải đóng modal rồi
 * tìm lại đúng cột trong lưới.
 */
export function FuelNormBulkAddModal({
  existingDatasets,
  onClose,
  onConfirm,
  onRemoveColumn,
  onRemoveDataset,
}: {
  /** Các bộ dữ liệu đã có sẵn trong lưới đang sửa. */
  existingDatasets: FuelNormDataset[];
  onClose: () => void;
  onConfirm: (columns: FuelNormBulkColumn[]) => void;
  /** Xoá một cung độ (cột) khỏi bộ dữ liệu đã có — có truyền thì mới hiện nút xoá. */
  onRemoveColumn?: (colKey: string) => void;
  /** Xoá cả một bộ dữ liệu đã có — có truyền thì mới hiện nút xoá. */
  onRemoveDataset?: (vehicleSuffixKey: string) => void;
}) {
  const [vehicleCodes, setVehicleCodes] = useState<Set<string>>(new Set());
  const [suffixes, setSuffixes] = useState<Set<FuelNormSuffix>>(new Set());
  const [distanceText, setDistanceText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["vehicle-fuel-classes-options"],
    queryFn: async () => {
      const res = await api.get("/vehicle-fuel-classes", { params: { size: 1000 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as VehicleFuelClassOption[];
    },
  });

  const existingByKey = useMemo(
    () => new Map(existingDatasets.map((d) => [d.vehicleSuffixKey, d])),
    [existingDatasets],
  );
  const existingColumnKeys = useMemo(
    () => new Set(existingDatasets.flatMap((d) => d.columns.map((c) => c.key))),
    [existingDatasets],
  );
  const vehiclesWithData = useMemo(() => new Set(existingDatasets.map((d) => d.vehicleCode)), [existingDatasets]);

  const toggleVehicle = (code: string) =>
    setVehicleCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const toggleSuffix = (s: FuelNormSuffix) =>
    setSuffixes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const distances = useMemo(
    () =>
      distanceText
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s.replace(",", "."))),
    [distanceText],
  );
  const invalidDistances = distances.filter((d) => Number.isNaN(d));

  const { newColumns, duplicateCount } = useMemo(() => {
    const cols: FuelNormBulkColumn[] = [];
    const seen = new Set<string>();
    let dup = 0;
    for (const v of vehicleCodes) {
      for (const s of suffixes) {
        const vs = vehicleSuffixKeyOf(v, s);
        for (const d of distances) {
          if (Number.isNaN(d)) continue;
          const key = buildColumnKey(vs, d);
          if (existingColumnKeys.has(key) || seen.has(key)) {
            dup++;
            continue;
          }
          seen.add(key);
          cols.push({ key, label: key });
        }
      }
    }
    return { newColumns: cols, duplicateCount: dup };
  }, [vehicleCodes, suffixes, distances, existingColumnKeys]);

  // Bộ dữ liệu ĐÃ CÓ khớp đúng tổ hợp xe + hậu tố đang chọn — hiện cung độ
  // đã có để tránh gõ trùng, kèm nút xoá nếu muốn sửa lại.
  const selectedExisting = useMemo(() => {
    const out: FuelNormDataset[] = [];
    for (const v of vehicleCodes) {
      for (const s of suffixes) {
        const ds = existingByKey.get(vehicleSuffixKeyOf(v, s));
        if (ds) out.push(ds);
      }
    }
    return out;
  }, [vehicleCodes, suffixes, existingByKey]);

  const submit = () => {
    if (vehicleCodes.size === 0) return setError("Chọn ít nhất một chủng loại xe.");
    if (suffixes.size === 0) return setError("Chọn ít nhất một hậu tố.");
    if (distances.length === 0) return setError("Nhập ít nhất một cung độ.");
    if (invalidDistances.length > 0) {
      return setError(`Cung độ không hợp lệ: ${invalidDistances.join(", ")}`);
    }
    if (newColumns.length === 0) {
      return setError("Tất cả tổ hợp đã có trong lưới, không có cột mới nào để thêm.");
    }
    onConfirm(newColumns);
  };

  return (
    <div
      className="tkc-modal-overlay"
      style={{ zIndex: 110 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: "min(900px, 100%)" }} role="dialog" aria-modal="true" aria-label="Thêm bộ định mức">
        <div className="modal-header">
          <div>
            <h2>Thêm bộ định mức</h2>
            <p>Chọn nhiều Chủng loại xe và Hậu tố — danh sách Cung độ nhập một lần, áp dụng chung cho tất cả tổ hợp đã chọn.</p>
          </div>
          <button className="close-modal" style={{ marginLeft: "auto" }} aria-label="Đóng" onClick={onClose}>
            <DIcon name="x" />
          </button>
        </div>

        <div className="modal-body">
          <div className="fn-grid">
            <div className="fn-col">
              <div className="form-group">
                <label>Chủng loại xe</label>
                {isLoading ? (
                  <p className="entry-empty">Đang tải…</p>
                ) : (
                  <div className="fn-box fn-scroll">
                    {vehicles.map((v) => (
                      <label key={v.id} className="fn-item">
                        <input type="checkbox" className="checkbox" checked={vehicleCodes.has(v.code)} onChange={() => toggleVehicle(v.code)} />
                        <span className="fn-name">
                          {v.name} ({v.code})
                        </span>
                        {vehiclesWithData.has(v.code) && <span className="fn-tag">đã có</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label>Hậu tố</label>
                <div className="fn-box fn-row">
                  {FUEL_NORM_SUFFIXES.map((s) => (
                    <label key={s.value} className="fn-item">
                      <input type="checkbox" className="checkbox" checked={suffixes.has(s.value)} onChange={() => toggleSuffix(s.value)} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>

              {selectedExisting.length > 0 && (
                <div className="fn-had">
                  <p className="fn-had-title">Đã có sẵn — cung độ trùng bên phải sẽ tự bỏ qua khi thêm:</p>
                  {selectedExisting.map((ds) => (
                    <div key={ds.vehicleSuffixKey} className="fn-had-set">
                      <div className="fn-had-head">
                        <strong>{ds.vehicleSuffixKey}</strong>
                        {onRemoveDataset && (
                          <button
                            type="button"
                            title="Xoá cả bộ này"
                            className="fn-link-danger"
                            onClick={() => {
                              if (window.confirm(`Xoá cả bộ dữ liệu "${ds.vehicleSuffixKey}" và toàn bộ giá trị của nó?`)) {
                                onRemoveDataset(ds.vehicleSuffixKey);
                              }
                            }}
                          >
                            Xoá cả bộ
                          </button>
                        )}
                      </div>
                      <div className="fn-chips">
                        {ds.columns.map((c) => (
                          <span key={c.key} className="fn-chip">
                            {c.distance}
                            {onRemoveColumn && (
                              <button type="button" className="fn-chip-x" title="Xoá cung độ này" aria-label="Xoá cung độ này" onClick={() => onRemoveColumn(c.key)}>
                                <DIcon name="trash" />
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="fn-col">
              <div className="form-group">
                <label>Cung độ (mỗi dòng một giá trị, hoặc cách nhau bởi dấu phẩy)</label>
                <textarea
                  rows={10}
                  value={distanceText}
                  onChange={(e) => setDistanceText(e.target.value)}
                  placeholder={"0.05\n0.2\n0.4\n0.6\n0.8\n1"}
                  className="field fn-textarea"
                />
              </div>
              <p className="entry-total">
                {vehicleCodes.size} chủng loại xe × {suffixes.size} hậu tố × {distances.filter((d) => !Number.isNaN(d)).length} cung độ ={" "}
                <strong>{newColumns.length} cột mới</strong>
                {duplicateCount > 0 && <> ({duplicateCount} đã có, sẽ bỏ qua)</>}
              </p>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn btn-primary" onClick={submit}>
            Thêm{newColumns.length > 0 ? ` (${newColumns.length} cột)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
