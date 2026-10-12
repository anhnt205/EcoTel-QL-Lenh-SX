import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Minimize, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import api from "@/config/api.config";
import { createCatalogService } from "../catalogService";
import { vehicleSuffixKeyOf } from "./modelKeys";
import type { ModelPeriodResponse } from "./types";

const BASE_PATH = "/model-periods";

interface CargoTypeOption {
  id: number;
  code: string;
  name: string;
}

interface VehicleFuelClassOption {
  id: number;
  code: string;
  name: string;
}

/** Payload gửi lên — khớp `ModelPeriodRequest` phía backend. */
interface ModelPeriodPayload {
  id?: number;
  cargoTypeId: number;
  effectiveFrom: string;
  effectiveTo: string;
  note: string | null;
  values: Record<string, number>;
}

/** Một khoảng thời gian hiệu lực, gắn liền một dòng (một chủng loại hàng). */
interface SubPeriod {
  id: number;
  effectiveFrom: string;
  effectiveTo: string;
  values: Record<string, string>;
  note: string;
}

/** Một dòng — một chủng loại hàng, có thể có nhiều khoảng thời gian riêng. */
interface Row {
  id: number;
  cargoTypeCode: string;
  periods: SubPeriod[];
}

const today = new Date();
const defaultFrom = () => `${today.getFullYear()}-01-01`;
const defaultTo = () => `${today.getFullYear()}-12-31`;

const parseISO = (s: string) => new Date(`${s}T00:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const ONE_DAY_MS = 86_400_000;

const formatVN = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

/** Hai khoảng chồng lấn khi khoảng sau bắt đầu trước khi khoảng trước kết thúc. */
const hasOverlap = (periods: SubPeriod[]) => {
  const sorted = [...periods].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].effectiveFrom <= sorted[i - 1].effectiveTo) return true;
  }
  return false;
};

type Mode = "create" | "view" | "edit";

/**
 * Modal "Thêm mới mô hình" — thiết kế riêng, phỏng theo đúng
 * `DensityAddModal.tsx` (màn Tỷ trọng) về khung modal + thuật toán tách kỳ
 * (`splitPeriod`), khác ở hai điểm theo đúng mockup + yêu cầu chủ dự án:
 *
 * 1. "Chủng loại xe *" là combobox multi-choice DÙNG CHUNG cho cả bảng
 *    (cạnh "Thời gian"), không phải chọn riêng từng dòng — mỗi xe chọn
 *    sinh ra 2 cột (`<mã xe>.CS` và `<mã xe>.KC`).
 * 2. "Mã chủng loại" là dropdown SỬA ĐƯỢC trên TỪNG dòng (Density hiện
 *    dòng dạng chữ, sinh tự động từ multi-select mã hàng ở trên) — dòng
 *    được thêm qua nút "+ Thêm dòng", không phải tự sinh theo lựa chọn.
 *
 * Lưu PHẲNG — mỗi khoảng thời gian của mỗi dòng là một `ModelPeriodRequest`
 * riêng, gửi qua `/model-periods/bulk`. Sửa thì thay THẲNG bằng
 * `/model-periods/batch` (xoá bản ghi cũ + tạo lại trong một giao dịch) —
 * xem lý do ở `ModelPeriodService#replaceBatch` phía backend.
 */
export function ModelAddModal({
  open,
  mode = "create",
  record,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** "create" thêm mới trống · "view" chỉ xem · "edit" sửa một bản ghi đã có. */
  mode?: Mode;
  /** Bản ghi hiện có — bắt buộc khi `mode` là "view"/"edit", bỏ trống khi "create". */
  record?: ModelPeriodResponse;
  onClose: () => void;
  onSaved: () => void;
}) {
  const service = useMemo(() => createCatalogService<ModelPeriodPayload>(BASE_PATH), []);
  const isReadOnly = mode === "view";

  const [vehicleCodes, setVehicleCodes] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoTypeOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleFuelClassOption[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicleAnchorRef = useComboboxAnchor();
  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  const defaultPeriod = (): SubPeriod => ({
    id: nextId(),
    effectiveFrom: defaultFrom(),
    effectiveTo: defaultTo(),
    values: {},
    note: "",
  });

  // Nạp lại từ đầu mỗi lần mở. "view"/"edit" nạp từ bản ghi truyền vào —
  // suy luôn "Chủng loại xe" từ các khoá đã có trong `values` để cột hiện
  // đúng ngay. "create" nạp một dòng trống để bắt đầu.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (record) {
      const codes = new Set<string>();
      Object.keys(record.values).forEach((key) => {
        const idx = key.lastIndexOf(".");
        if (idx > 0) codes.add(key.slice(0, idx));
      });
      setVehicleCodes([...codes]);
      setRows([
        {
          id: nextId(),
          cargoTypeCode: record.cargoTypeCode,
          periods: [
            {
              id: nextId(),
              effectiveFrom: record.effectiveFrom,
              effectiveTo: record.effectiveTo,
              values: Object.fromEntries(Object.entries(record.values).map(([k, v]) => [k, String(v)])),
              note: record.note ?? "",
            },
          ],
        },
      ]);
    } else {
      setVehicleCodes([]);
      setRows([{ id: nextId(), cargoTypeCode: "", periods: [defaultPeriod()] }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.get("/cargo-types", { params: { size: 500 } });
        setCargoTypes((res.data?.data?.content ?? res.data?.data ?? []) as CargoTypeOption[]);
      } catch {
        toast.error("Không tải được danh sách chủng loại hàng.");
      }
    })();
    (async () => {
      try {
        const res = await api.get("/vehicle-fuel-classes", { params: { size: 500 } });
        setVehicles((res.data?.data?.content ?? res.data?.data ?? []) as VehicleFuelClassOption[]);
      } catch {
        toast.error("Không tải được danh sách chủng loại xe.");
      }
    })();
  }, [open]);

  if (!open) return null;

  const cargoByCode = new Map(cargoTypes.map((c) => [c.code, c]));
  const activeColumns = vehicleCodes.flatMap((code) => [
    vehicleSuffixKeyOf(code, "CS"),
    vehicleSuffixKeyOf(code, "KC"),
  ]);

  const addRow = () =>
    setRows((prev) => [...prev, { id: nextId(), cargoTypeCode: "", periods: [defaultPeriod()] }]);

  const removeRow = (rowId: number) => setRows((prev) => prev.filter((r) => r.id !== rowId));

  const setRowCargoType = (rowId: number, code: string) =>
    setRows((prev) => prev.map((r) => (r.id !== rowId ? r : { ...r, cargoTypeCode: code })));

  const setPeriodField = (rowId: number, periodId: number, key: "effectiveFrom" | "effectiveTo" | "note", value: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== rowId
          ? r
          : { ...r, periods: r.periods.map((p) => (p.id !== periodId ? p : { ...p, [key]: value })) },
      ),
    );

  const setPeriodValue = (rowId: number, periodId: number, vehicleKey: string, value: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== rowId
          ? r
          : {
              ...r,
              periods: r.periods.map((p) =>
                p.id !== periodId ? p : { ...p, values: { ...p.values, [vehicleKey]: value } },
              ),
            },
      ),
    );

  /** Tách MỘT khoảng thành hai khoảng liền kề, chia đôi theo ngày — xem `DensityAddModal.splitPeriod`. */
  const splitPeriod = (rowId: number, periodId: number) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const idx = r.periods.findIndex((p) => p.id === periodId);
        if (idx === -1) return r;
        const target = r.periods[idx];
        const fromMs = parseISO(target.effectiveFrom).getTime();
        const toMs = parseISO(target.effectiveTo).getTime();
        const totalDays = Math.round((toMs - fromMs) / ONE_DAY_MS);
        if (!(totalDays > 0)) {
          toast.error("Khoảng thời gian này chỉ có 1 ngày, không tách được.");
          return r;
        }
        const midMs = fromMs + Math.floor(totalDays / 2) * ONE_DAY_MS;
        const firstTo = toISO(new Date(midMs));
        const secondFrom = toISO(new Date(midMs + ONE_DAY_MS));
        const periods = [...r.periods];
        periods.splice(
          idx,
          1,
          { ...target, effectiveTo: firstTo },
          { ...target, id: nextId(), effectiveFrom: secondFrom, values: { ...target.values } },
        );
        return { ...r, periods };
      }),
    );

  const removePeriod = (rowId: number, periodId: number) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== rowId || r.periods.length === 1 ? r : { ...r, periods: r.periods.filter((p) => p.id !== periodId) },
      ),
    );

  const validate = (): string | null => {
    if (rows.length === 0) return "Thêm ít nhất một dòng.";
    if (vehicleCodes.length === 0) return "Chọn ít nhất một chủng loại xe.";
    for (const r of rows) {
      if (!r.cargoTypeCode) return "Có dòng chưa chọn Mã chủng loại.";
      const label = cargoByCode.get(r.cargoTypeCode)?.name ?? r.cargoTypeCode;
      for (let i = 0; i < r.periods.length; i++) {
        const p = r.periods[i];
        if (!p.effectiveFrom || !p.effectiveTo) return `"${label}", khoảng ${i + 1}: chưa chọn đủ ngày.`;
        if (p.effectiveFrom > p.effectiveTo) return `"${label}", khoảng ${i + 1}: "Từ ngày" phải trước "Đến ngày".`;
        const hasAnyValue = activeColumns.some((k) => p.values[k]?.trim());
        if (!hasAnyValue) return `"${label}", khoảng ${i + 1}: chưa nhập giá trị cho chủng loại xe nào.`;
      }
      if (hasOverlap(r.periods)) return `"${label}": các khoảng thời gian bị chồng lấn nhau.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payloads: ModelPeriodPayload[] = rows.flatMap((r) => {
        const cargoTypeId = cargoByCode.get(r.cargoTypeCode)!.id;
        return r.periods.map((p) => ({
          cargoTypeId,
          effectiveFrom: p.effectiveFrom,
          effectiveTo: p.effectiveTo,
          note: p.note.trim() || null,
          values: Object.fromEntries(
            activeColumns
              .filter((k) => p.values[k]?.trim())
              .map((k) => [k, Number(p.values[k].replace(",", "."))]),
          ),
        }));
      });
      if (mode === "edit" && record) {
        const res = await api.put(`${BASE_PATH}/batch`, { deleteIds: [record.id], creates: payloads });
        const saved = (res.data?.data ?? []) as unknown[];
        toast.success(`Đã cập nhật — ${saved.length} bản ghi.`);
      } else {
        await service.bulkCreate(payloads);
        toast.success(`Đã thêm ${payloads.length} bản ghi.`);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message ?? "Lưu thất bại. Kiểm tra lại dữ liệu.");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPeriods = rows.reduce((n, r) => n + r.periods.length, 0);

  const title = mode === "view" ? "Chi tiết mô hình" : mode === "edit" ? "Sửa mô hình" : "Thêm mới mô hình";
  const subtitle =
    mode === "view"
      ? "Xem lại bản ghi đã lưu — bấm nút Sửa ở bảng danh mục nếu cần chỉnh."
      : mode === "edit"
        ? "Sửa xong bấm Lưu thay đổi — hệ thay toàn bộ dữ liệu cũ bằng dữ liệu mới."
        : "Chọn Chủng loại xe, thêm dòng và chọn Mã chủng loại — mỗi dòng có thể tách nhiều khoảng thời gian riêng.";

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 ${isFullscreen ? "" : "p-4"}`}>
      <div
        className={
          isFullscreen
            ? "flex h-screen w-screen flex-col overflow-hidden bg-white dark:bg-gray-900"
            : "flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900"
        }
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!isReadOnly && (
            /* mb lớn hơn bình thường: danh sách xổ xuống của combobox nổi
               (portal, z-40) không tự né nội dung bên dưới — chỉ né mép
               màn hình. Sát ngay bảng bên dưới như trước (mb-4 = 16px) thì
               dù chỉ 1 mục trong danh sách cũng đủ che mất hàng tiêu đề. */
            <div className="mb-14 flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1 min-w-[320px] flex-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Chủng loại xe *</span>
                <Combobox items={vehicles.map((v) => v.code)} multiple value={vehicleCodes} onValueChange={setVehicleCodes}>
                  <ComboboxChips ref={vehicleAnchorRef} className="min-h-9 text-sm">
                    <ComboboxValue placeholder="Chọn một hoặc nhiều chủng loại xe...">
                      {vehicleCodes.map((code) => (
                        <ComboboxChip key={code} className="text-xs py-0.5">
                          {code}
                        </ComboboxChip>
                      ))}
                    </ComboboxValue>
                    <ComboboxChipsInput placeholder={vehicleCodes.length === 0 ? "Chọn một hoặc nhiều chủng loại xe..." : ""} className="text-sm" />
                  </ComboboxChips>
                  <ComboboxContent anchor={vehicleAnchorRef} sideOffset={4} align="start" className="z-[120]">
                    <ComboboxEmpty className="text-xs py-2 text-gray-400">Không tìm thấy chủng loại xe</ComboboxEmpty>
                    <ComboboxList>
                      {(code: string) => {
                        const v = vehicles.find((x) => x.code === code);
                        return (
                          <ComboboxItem key={code} value={code} className="text-sm">
                            <span className="font-mono text-xs text-gray-500">{code}</span>
                            {" — "}
                            {v?.name ?? code}
                          </ComboboxItem>
                        );
                      }}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            </div>
          )}

          {isReadOnly && (
            <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900/40">
              <span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Thời gian: </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {record ? `${formatVN(record.effectiveFrom)} – ${formatVN(record.effectiveTo)}` : "—"}
                </span>
              </span>
              <span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Chủng loại xe: </span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{vehicleCodes.join(", ") || "—"}</span>
              </span>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Bấm "+ Thêm dòng" để bắt đầu.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100 text-left text-sm font-bold text-gray-800 dark:bg-gray-900 dark:text-gray-100">
                    <th className="w-16 border-b border-r border-gray-200 px-3 py-2.5 text-center dark:border-gray-700">#</th>
                    <th className="min-w-[240px] border-b border-r border-gray-200 px-3 py-2.5 dark:border-gray-700">Thời gian</th>
                    <th className="min-w-[150px] border-b border-r border-gray-200 px-3 py-2.5 dark:border-gray-700">
                      Mã chủng loại {!isReadOnly && <span className="text-red-500">*</span>}
                    </th>
                    <th className="min-w-[150px] border-b border-r border-gray-200 px-3 py-2.5 dark:border-gray-700">Chủng loại hàng</th>
                    {activeColumns.map((k) => (
                      <th key={k} className="min-w-[100px] border-b border-r border-gray-200 px-2 py-2.5 text-center dark:border-gray-700">
                        {k}
                      </th>
                    ))}
                    {!isReadOnly && <th className="w-10 border-b border-gray-200 dark:border-gray-700" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, ri) =>
                    r.periods.map((p, pi) => (
                      <tr
                        key={p.id}
                        className={`${ri % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50/50 dark:bg-gray-900/40"} ${
                          pi === 0 && ri > 0 ? "border-t-2 border-t-gray-300 dark:border-t-gray-600" : ""
                        }`}
                      >
                        <td className="border-b border-r border-gray-200 px-2 py-2 text-center dark:border-gray-700">
                          <div className="flex items-center justify-center gap-1">
                            {pi === 0 && <span className="font-semibold text-gray-500">{ri + 1}</span>}
                            {!isReadOnly && (
                              <button
                                onClick={() => splitPeriod(r.id, p.id)}
                                title="Tách thời gian này thành hai khoảng"
                                className="rounded p-0.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {!isReadOnly && pi === 0 && (
                              <button
                                onClick={() => removeRow(r.id)}
                                title="Xoá cả dòng này"
                                className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="border-b border-r border-gray-200 px-2 py-1.5 dark:border-gray-700">
                          {isReadOnly ? (
                            <span className="px-1 text-gray-700 dark:text-gray-300">
                              {formatVN(p.effectiveFrom)} – {formatVN(p.effectiveTo)}
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Input
                                type="date"
                                value={p.effectiveFrom}
                                onChange={(e) => setPeriodField(r.id, p.id, "effectiveFrom", e.target.value)}
                                className="h-9 text-xs"
                              />
                              <span className="text-gray-400">–</span>
                              <Input
                                type="date"
                                value={p.effectiveTo}
                                onChange={(e) => setPeriodField(r.id, p.id, "effectiveTo", e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>
                          )}
                        </td>
                        <td className="border-b border-r border-gray-200 px-2 py-1.5 dark:border-gray-700">
                          {pi > 0 ? (
                            <span className="px-1 text-gray-400">″</span>
                          ) : isReadOnly ? (
                            <span className="px-1">{r.cargoTypeCode}</span>
                          ) : (
                            <Select value={r.cargoTypeCode} onValueChange={(v) => setRowCargoType(r.id, v)}>
                              <SelectTrigger className="h-9 w-full text-sm">
                                <SelectValue placeholder="Chọn mã..." />
                              </SelectTrigger>
                              <SelectContent className="z-[120]">
                                {cargoTypes.map((c) => (
                                  <SelectItem key={c.id} value={c.code}>
                                    {c.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </td>
                        <td className="border-b border-r border-gray-200 px-3 py-2 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                          {pi === 0 ? (cargoByCode.get(r.cargoTypeCode)?.name ?? "") : ""}
                        </td>
                        {activeColumns.map((k) => (
                          <td key={k} className="border-b border-r border-gray-200 px-1.5 py-1 dark:border-gray-700">
                            {isReadOnly ? (
                              <span className="block px-1 text-right">{p.values[k] ?? ""}</span>
                            ) : (
                              <Input
                                type="number"
                                step="any"
                                value={p.values[k] ?? ""}
                                onChange={(e) => setPeriodValue(r.id, p.id, k, e.target.value)}
                                className="h-9 text-right text-sm"
                              />
                            )}
                          </td>
                        ))}
                        {!isReadOnly && (
                          <td className="border-b border-gray-200 px-2 py-1.5 text-center dark:border-gray-700">
                            {r.periods.length > 1 && (
                              <button
                                onClick={() => removePeriod(r.id, p.id)}
                                title="Xoá khoảng thời gian này"
                                className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!isReadOnly && (
            <button
              onClick={addRow}
              className="mt-3 rounded-md border border-dashed px-3 py-1.5 text-xs text-blue-700"
            >
              + Thêm dòng
            </button>
          )}

          {rows.length > 0 && !isReadOnly && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Tổng số{" "}
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                {rows.length} dòng · {totalPeriods} khoảng thời gian
              </span>
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          {isReadOnly ? (
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Huỷ
              </Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 font-semibold text-white hover:bg-blue-700">
                {submitting ? "Đang lưu..." : mode === "edit" ? "Lưu thay đổi" : "Xác nhận"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
