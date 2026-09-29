import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold">Thêm bộ định mức</h2>
          <p className="text-xs text-muted-foreground">
            Chọn nhiều Chủng loại xe và Hậu tố — danh sách Cung độ nhập một lần, áp dụng chung cho tất cả tổ hợp đã chọn.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto px-6 py-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium">Chủng loại xe</label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải…</p>
            ) : (
              <div className="max-h-48 space-y-0.5 overflow-auto rounded-md border p-2">
                {vehicles.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/60">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-blue-600"
                      checked={vehicleCodes.has(v.code)}
                      onChange={() => toggleVehicle(v.code)}
                    />
                    <span className="truncate">
                      {v.name} ({v.code})
                    </span>
                    {vehiclesWithData.has(v.code) && (
                      <span className="ml-auto shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                        đã có
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            <label className="mb-1.5 mt-3 block text-xs font-medium">Hậu tố</label>
            <div className="flex gap-4 rounded-md border p-2.5">
              {FUEL_NORM_SUFFIXES.map((s) => (
                <label key={s.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-blue-600"
                    checked={suffixes.has(s.value)}
                    onChange={() => toggleSuffix(s.value)}
                  />
                  {s.label}
                </label>
              ))}
            </div>

            {selectedExisting.length > 0 && (
              <div className="mt-3 space-y-2 rounded-md border border-blue-200 bg-blue-50/50 p-2.5 dark:border-blue-900/40 dark:bg-blue-950/10">
                <p className="text-[11px] font-medium text-blue-800 dark:text-blue-300">
                  Đã có sẵn — cung độ trùng bên phải sẽ tự bỏ qua khi thêm:
                </p>
                {selectedExisting.map((ds) => (
                  <div key={ds.vehicleSuffixKey} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{ds.vehicleSuffixKey}</span>
                      {onRemoveDataset && (
                        <button
                          type="button"
                          title="Xoá cả bộ này"
                          className="text-[10px] text-red-600 hover:underline"
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
                    <div className="flex flex-wrap gap-1">
                      {ds.columns.map((c) => (
                        <span
                          key={c.key}
                          className="inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[10px] dark:bg-gray-800"
                        >
                          {c.distance}
                          {onRemoveColumn && (
                            <button type="button" title="Xoá cung độ này" onClick={() => onRemoveColumn(c.key)}>
                              <Trash2 className="h-2.5 w-2.5 text-red-500" />
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

          <div>
            <label className="mb-1.5 block text-xs font-medium">
              Cung độ (mỗi dòng một giá trị, hoặc cách nhau bởi dấu phẩy)
            </label>
            <textarea
              rows={10}
              value={distanceText}
              onChange={(e) => setDistanceText(e.target.value)}
              placeholder={"0.05\n0.2\n0.4\n0.6\n0.8\n1"}
              className="w-full resize-y rounded-md border bg-transparent px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {vehicleCodes.size} chủng loại xe × {suffixes.size} hậu tố × {distances.filter((d) => !Number.isNaN(d)).length} cung độ ={" "}
              <span className="font-semibold text-blue-700">{newColumns.length} cột mới</span>
              {duplicateCount > 0 && <> ({duplicateCount} đã có, sẽ bỏ qua)</>}
            </p>
          </div>
        </div>

        {error && (
          <p className="border-t border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-3 dark:border-gray-800">
          <Button variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={submit}>
            Thêm{newColumns.length > 0 ? ` (${newColumns.length} cột)` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
