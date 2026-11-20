import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MonthRangePicker, splitByMonth } from "../design/MonthInput";
import DIcon from "../design/DIcon";
import { ColResizer, TableLayoutButton, useTableLayout } from "../design/tableLayout";
import ViewGrid, { ColumnsMenuButton, type ViewColumn } from "../design/ViewGrid";
import { MatrixQuickImportDialog, type MxResult } from "../design/MatrixQuickImportDialog";
import { moveItem, useRowDnD } from "../design/useRowDnD";
import "@/styles/catalog-design.css";
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
import { parseVehicleSuffixKey, vehicleSuffixKeyOf } from "./modelKeys";
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

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const parseISO = (s: string) => new Date(`${s}T00:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);
const ONE_DAY_MS = 86_400_000;

/** Chỉ dùng để HIỂN THỊ cột "Thời gian" ở chế độ xem — dạng tháng/năm (MM/yyyy); ô nhập vẫn chọn đến ngày. */
const formatVN = (s: string) => {
  const [y, m] = s.split("-");
  return `${m}/${y}`;
};

/** Hai khoảng chồng lấn khi khoảng sau bắt đầu trước khi khoảng trước kết thúc. */
const hasOverlap = (periods: SubPeriod[]) => {
  const sorted = [...periods].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].effectiveFrom <= sorted[i - 1].effectiveTo) return true;
  }
  return false;
};


/** Sửa một ô ngày thì tự nối tiếp khoảng liền kề trong cùng mã hàng: đổi "Đến" → "Từ" của khoảng SAU = Đến + 1 ngày; đổi "Từ" → "Đến" của khoảng TRƯỚC = Từ − 1 ngày. */
const chainPeriods = <P extends { id: number; effectiveFrom: string; effectiveTo: string }>(
  periods: P[],
  periodId: number,
  key: "effectiveFrom" | "effectiveTo",
  value: string,
): P[] => {
  const idx = periods.findIndex((p) => p.id === periodId);
  if (idx === -1) return periods;
  const out = periods.map((p) => (p.id === periodId ? { ...p, [key]: value } : p));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return out;
  const shifted = (days: number) => toISO(new Date(parseISO(value).getTime() + days * ONE_DAY_MS));
  if (key === "effectiveTo" && idx + 1 < out.length) out[idx + 1] = { ...out[idx + 1], effectiveFrom: shifted(1) };
  if (key === "effectiveFrom" && idx > 0) out[idx - 1] = { ...out[idx - 1], effectiveTo: shifted(-1) };
  return out;
};

type Mode = "create" | "view" | "edit" | "editYear" | "copyYear";

/** Dời một ngày yyyy-MM-dd sang năm khác (29/02 sang năm không nhuận → 28/02). */
const shiftToYear = (iso: string, y: number) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const mmdd = iso.slice(5);
  const d = mmdd === "02-29" && new Date(y, 1, 29).getMonth() !== 1 ? "02-28" : mmdd;
  return `${y}-${d}`;
};

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
  yearRecords,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** "create" thêm mới trống · "view" chỉ xem · "edit" sửa một bản ghi đã có. */
  mode?: Mode;
  /** Bản ghi hiện có — bắt buộc khi `mode` là "view"/"edit", bỏ trống khi "create". */
  record?: ModelPeriodResponse;
  /** Mọi bản ghi của một NĂM — bắt buộc khi `mode` là "editYear" (sửa cả năm) hoặc "copyYear" (sao chép năm). */
  yearRecords?: ModelPeriodResponse[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const service = useMemo(() => createCatalogService<ModelPeriodPayload>(BASE_PATH), []);
  const isReadOnly = mode === "view";
  const yearMode = mode === "editYear" || mode === "copyYear";
  /** Chỉnh sửa = sửa dữ liệu ĐÃ CÓ: không thêm/bớt mã hàng, chủng loại xe, khoảng thời gian */
  const lockStructure = mode === "edit" || mode === "editYear";

  const [year, setYear] = useState(currentYear);
  const [cargoCodes, setCargoCodes] = useState<string[]>([]);
  const [vehicleCodes, setVehicleCodes] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoTypeOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleFuelClassOption[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicleAnchorRef = useComboboxAnchor();
  const cargoAnchorRef = useComboboxAnchor();
  // năm hiện chọn — giữ trong ref để effect đồng bộ dòng dùng cho dòng MỚI mà không ghi đè ngày của dòng cũ
  const yearRef = useRef(year);
  yearRef.current = year;
  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  const defaultPeriod = (y: number = yearRef.current): SubPeriod => ({
    id: nextId(),
    effectiveFrom: `${y}-01-01`,
    effectiveTo: `${y}-12-31`,
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
      setYear(Number(record.effectiveFrom.slice(0, 4)));
      setCargoCodes([record.cargoTypeCode]);
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
    } else if (yearMode && yearRecords?.length) {
      // SỬA/SAO CHÉP CẢ NĂM: nạp MỌI bản ghi của năm — mỗi mã hàng một dòng với các khoảng thời gian theo ngày; cột xe suy từ các khoá có giá trị.
      const srcYear = Number(yearRecords[0].effectiveFrom.slice(0, 4));
      const targetYear = mode === "copyYear" ? srcYear + 1 : srcYear;
      setYear(targetYear);
      const vcodes = new Set<string>();
      yearRecords.forEach((r) =>
        Object.keys(r.values).forEach((key) => {
          const idx = key.lastIndexOf(".");
          if (idx > 0) vcodes.add(key.slice(0, idx));
        }),
      );
      setVehicleCodes([...vcodes]);
      const byCode = new Map<string, Row>();
      [...yearRecords]
        .sort((a, b) => a.cargoTypeCode.localeCompare(b.cargoTypeCode, "vi", { numeric: true }) || a.effectiveFrom.localeCompare(b.effectiveFrom))
        .forEach((r) => {
          let row = byCode.get(r.cargoTypeCode);
          if (!row) {
            row = { id: nextId(), cargoTypeCode: r.cargoTypeCode, periods: [] };
            byCode.set(r.cargoTypeCode, row);
          }
          row.periods.push({
            id: nextId(),
            effectiveFrom: mode === "copyYear" ? shiftToYear(r.effectiveFrom, targetYear) : r.effectiveFrom,
            effectiveTo: mode === "copyYear" ? shiftToYear(r.effectiveTo, targetYear) : r.effectiveTo,
            values: Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, String(v)])),
            note: r.note ?? "",
          });
        });
      const seeded = [...byCode.values()];
      setRows(seeded);
      setCargoCodes(seeded.map((r) => r.cargoTypeCode));
    } else {
      setVehicleCodes([]);
      setYear(currentYear);
      setCargoCodes([]);
      setRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record, yearRecords, mode]);

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

  // Đồng bộ dòng theo ô "Mã chủng loại hàng": chọn mã nào là có dòng của mã đó (theo ĐÚNG thứ tự chọn), giữ nguyên dữ liệu đã nhập
  // của dòng còn được chọn, bỏ dòng của mã bị bỏ chọn; dòng mới = cả năm đang chọn, chưa có tỷ lệ.
  useEffect(() => {
    setRows((prev) => {
      const byCode = new Map(prev.map((r) => [r.cargoTypeCode, r]));
      return cargoCodes.map((code) => byCode.get(code) ?? { id: nextId(), cargoTypeCode: code, periods: [defaultPeriod(yearRef.current)] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargoCodes]);

  // Cột của bảng nhập (không kể STT/nút xoá) cho "Hiển thị bảng": kéo độ rộng, độ cao hàng như bảng Chủng loại hàng
  const modelCols = useMemo(
    () => [
      { key: "time", label: "Thời gian" },
      { key: "code", label: "Mã chủng loại hàng" },
      { key: "name", label: "Chủng loại hàng" },
      ...vehicleCodes
        .flatMap((code) => [vehicleSuffixKeyOf(code, "CS"), vehicleSuffixKeyOf(code, "KC")])
        .map((k) => ({ key: k, label: k })),
      { key: "note", label: "Ghi chú" },
    ],
    [vehicleCodes],
  );
  // Chế độ XEM: danh sách phẳng (mỗi khoảng thời gian một dòng) cho bảng gọn có lọc cột / ẩn hiện cột
  const viewCols: ViewColumn[] = useMemo(
    () => modelCols.map((c, i) => (i < 3 || c.key === "note" ? { ...c, strong: c.key === "code" } : { ...c, align: "right" as const })),
    [modelCols],
  );
  const viewRows = useMemo(() => {
    const byCode = new Map(cargoTypes.map((c) => [c.code, c]));
    return rows.flatMap((r) => r.periods.map((p) => ({ r, p, name: byCode.get(r.cargoTypeCode)?.name ?? "" })));
  }, [rows, cargoTypes]);
  // "vừa nội dung": chỉ đo cột tên (tĩnh); cột chọn mã/ngày/ô số dùng bề rộng tối thiểu để không nhảy khi gõ
  // Kéo thả đổi vị trí DÒNG mã hàng (hàm di chuyển gán sau early return qua ref)
  const moveRef = useRef<(from: number, to: number) => void>(() => {});
  const dnd = useRowDnD((f, t) => moveRef.current(f, t));
  const layout = useTableLayout(
    "popup:model-add",
    modelCols,
    viewRows,
    (x, k) => (k === "name" ? x.name : ""),
    (k) => ({ time: 370, code: 120, name: 100, note: 170 } as Record<string, number>)[k] ?? 100,
    48,
  );

  if (!open) return null;

  const cargoByCode = new Map(cargoTypes.map((c) => [c.code, c]));
  const activeColumns = vehicleCodes.flatMap((code) => [
    vehicleSuffixKeyOf(code, "CS"),
    vehicleSuffixKeyOf(code, "KC"),
  ]);

  /**
   * Nhập nhanh (ảnh/Excel): thêm mã hàng + chủng loại xe thấy trong bảng nguồn vào các ô chọn, rồi điền giá trị vào khoảng thời gian ĐẦU TIÊN
   * của mỗi mã hàng (mã đã có thì ghi đè đúng các ô có trong nguồn, ô khác giữ nguyên).
   */
  const applyQuick = (res: MxResult) => {
    const vcodes = [...new Set(res.cols.flatMap((k) => parseVehicleSuffixKey(k)?.vehicleCode ?? []))];
    const byRow = new Map<string, Record<string, string>>();
    res.cells.forEach((c) => byRow.set(c.row, { ...(byRow.get(c.row) ?? {}), [c.col]: c.value }));
    setRows((prev) => {
      const have = new Set(prev.map((r) => r.cargoTypeCode));
      const added: Row[] = res.rows
        .filter((c, i) => !have.has(c) && res.rows.indexOf(c) === i)
        .map((code) => ({ id: nextId(), cargoTypeCode: code, periods: [defaultPeriod(yearRef.current)] }));
      return [...prev, ...added].map((r) => {
        const vals = byRow.get(r.cargoTypeCode);
        return !vals ? r : { ...r, periods: r.periods.map((p, i) => (i === 0 ? { ...p, values: { ...p.values, ...vals } } : p)) };
      });
    });
    setCargoCodes((prev) => [...prev, ...res.rows.filter((c, i) => !prev.includes(c) && res.rows.indexOf(c) === i)]);
    setVehicleCodes((prev) => [...prev, ...vcodes.filter((c) => !prev.includes(c))]);
    toast.success(`Đã thêm ${res.rows.length} dòng (${res.cells.length} ô) từ bảng nguồn.`);
  };

  /** Đổi Năm: khi SAO CHÉP thì dời toàn bộ ngày của bảng sang năm mới. */
  const changeYear = (y: number) => {
    setYear(y);
    if (mode === "copyYear") {
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          periods: r.periods.map((p) => ({ ...p, effectiveFrom: shiftToYear(p.effectiveFrom, y), effectiveTo: shiftToYear(p.effectiveTo, y) })),
        })),
      );
    }
  };

  /** Kéo thả: đưa dòng `from` tới vị trí `to`; thứ tự ô "Mã chủng loại hàng" đổi theo để effect đồng bộ không xếp lại. */
  const moveRow = (from: number, to: number) => {
    const next = moveItem(rows, from, to);
    if (next === rows) return;
    setRows(next);
    setCargoCodes(next.map((r) => r.cargoTypeCode));
  };
  moveRef.current = moveRow;

  /** Xóa cả dòng = bỏ luôn mã đó khỏi ô "Mã chủng loại hàng". */
  const removeRow = (rowId: number) => {
    const target = rows.find((r) => r.id === rowId);
    setRows((prev) => prev.filter((r) => r.id !== rowId));
    if (target) setCargoCodes((prev) => prev.filter((c) => c !== target.cargoTypeCode));
  };

  const setPeriodField = (rowId: number, periodId: number, key: "effectiveFrom" | "effectiveTo" | "note", value: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== rowId
          ? r
          : {
              ...r,
              periods:
                key === "effectiveFrom" || key === "effectiveTo"
                  ? chainPeriods(r.periods, periodId, key, value)
                  : r.periods.map((p) => (p.id !== periodId ? p : { ...p, [key]: value })),
            },
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
        const cut = splitByMonth(target.effectiveFrom, target.effectiveTo);
        if (!cut) {
          toast.error("Khoảng thời gian này chỉ có 1 tháng, không tách được.");
          return r;
        }
        const { firstTo, secondFrom } = cut;
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
    if (rows.length === 0) return "Chọn ít nhất một mã chủng loại hàng.";
    if (vehicleCodes.length === 0) return "Chọn ít nhất một chủng loại xe.";
    for (const r of rows) {
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
      // Sao chép = tạo bản MỚI: năm đích không được trùng năm đã có dữ liệu
      if (mode === "copyYear") {
        const all = await api.get(BASE_PATH, { params: { size: 1000 } });
        const existing = (all.data?.data?.content ?? all.data?.data ?? []) as { effectiveFrom: string }[];
        if (existing.some((r) => r.effectiveFrom.startsWith(`${year}-`))) {
          setError(`Năm ${year} đã có dữ liệu mô hình — chọn năm khác để sao chép (hoặc dùng Sửa).`);
          setSubmitting(false);
          return;
        }
      }
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
      if ((mode === "edit" && record) || (mode === "editYear" && yearRecords?.length)) {
        const deleteIds = mode === "editYear" ? (yearRecords ?? []).map((r) => r.id) : [record!.id];
        const res = await api.put(`${BASE_PATH}/batch`, { deleteIds, creates: payloads });
        const saved = (res.data?.data ?? []) as unknown[];
        toast.success(mode === "editYear" ? `Đã cập nhật năm ${year} — ${saved.length} bản ghi.` : `Đã cập nhật — ${saved.length} bản ghi.`);
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

  const title =
    mode === "view"
      ? "Chi tiết mô hình"
      : mode === "edit"
        ? "Sửa mô hình"
        : mode === "editYear"
          ? `Sửa bảng mô hình năm ${year}`
          : mode === "copyYear"
            ? "Sao chép bảng mô hình"
            : "Thêm mới mô hình";
  const subtitle =
    mode === "view"
      ? "Xem lại bản ghi đã lưu — bấm nút Sửa ở bảng danh mục nếu cần chỉnh."
      : mode === "edit"
        ? "Sửa xong bấm Lưu thay đổi — hệ thay toàn bộ dữ liệu cũ bằng dữ liệu mới."
        : mode === "editYear"
          ? "Sửa cả bảng mô hình của năm: đổi thời gian và giá trị đã có (không thêm/bớt mã hàng, chủng loại xe). Lưu thay toàn bộ dữ liệu của năm này bằng bảng mới."
          : mode === "copyYear"
            ? "Sao chép cả bảng mô hình của năm cũ — đổi ô Năm để dời toàn bộ ngày sang năm mới, chỉnh sửa rồi bấm Xác nhận để tạo."
        : "Chọn Năm, Mã chủng loại hàng và Chủng loại xe — bảng tự sinh dòng theo mã đã chọn, chủng loại xe là các cột; mỗi dòng tách được nhiều khoảng thời gian.";

  const hid = (k: string) => k !== "time" && layout.hidden.has(k);
  const shownVehicleCols = activeColumns.filter((k) => !hid(k));
  const headRows = 2;
  const shownWidth = modelCols.reduce((s, c) => (hid(c.key) ? s : s + layout.widthOf(c.key)), 0);

  return (
    <>
    <div
      className="tkc-modal-overlay"
      style={isFullscreen ? { padding: 0 } : isReadOnly ? { padding: 8 } : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={isFullscreen ? { width: "100%", height: "100%", maxHeight: "100%", borderRadius: 0 } : { width: isReadOnly ? "fit-content" : "min(1560px, 100%)", ...(isReadOnly ? { minWidth: "min(760px, 98vw)", maxWidth: "98vw", maxHeight: "96vh" } : null) }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header" style={isReadOnly ? { padding: "10px 18px" } : undefined}>
          <div>
            <h2 style={isReadOnly ? { margin: 0 } : undefined}>{title}</h2>
            {!isReadOnly && <p>{subtitle}</p>}
          </div>
          <button
            className="close-modal"
            style={{ marginLeft: "auto", marginRight: 6 }}
            aria-label={isFullscreen ? "Thu nhỏ cửa sổ" : "Phóng to cửa sổ"}
            title={isFullscreen ? "Thu nhỏ cửa sổ" : "Phóng to cửa sổ"}
            onClick={() => setIsFullscreen((v) => !v)}
          >
            <DIcon name={isFullscreen ? "minimize" : "maximize"} />
          </button>
          <button className="close-modal" aria-label="Đóng" onClick={onClose}>
            <DIcon name="x" />
          </button>
        </div>

        <div
          className="modal-body"
          style={isReadOnly ? { display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0, padding: "8px 14px", flex: "1 1 auto" } : undefined}
        >
          {!isReadOnly && (
            /* mb lớn: danh sách xổ xuống của combobox nổi (portal) không tự né nội dung bên dưới — chỉ né mép màn hình.
               Sát ngay bảng thì dù chỉ 1 mục cũng đủ che mất hàng tiêu đề. */
            <div className="entry-top" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14, marginBottom: 28 }}>
              <div className="form-group" style={{ width: 140 }}>
                <label>Năm *</label>
                <select className="field" value={String(year)} disabled={mode === "editYear"} onChange={(e) => changeYear(Number(e.target.value))}>
                  {(YEAR_OPTIONS.includes(year) ? YEAR_OPTIONS : [year, ...YEAR_OPTIONS]).map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ minWidth: 300, flex: 1 }}>
                <label>Mã chủng loại hàng *</label>
                <Combobox items={cargoTypes.map((c) => c.code)} multiple disabled={lockStructure} value={cargoCodes} onValueChange={setCargoCodes}>
                  <ComboboxChips ref={cargoAnchorRef} className="min-h-[39px] flex-nowrap overflow-hidden rounded-[8px] border-[#cfdbec] text-sm">
                    <ComboboxValue placeholder="Chọn một hoặc nhiều mã...">
                      {cargoCodes.slice(0, 3).map((code) => (
                        <ComboboxChip key={code} className="rounded-full bg-[#b8c6dc] px-2.5 py-0.5 text-xs font-medium text-[#16294a]">
                          {code}
                        </ComboboxChip>
                      ))}
                      {cargoCodes.length > 3 && (
                        <span className="rounded-full bg-[#dde8f7] px-2.5 py-0.5 text-xs font-semibold text-[#16294a]">+{cargoCodes.length - 3}</span>
                      )}
                    </ComboboxValue>
                    <ComboboxChipsInput placeholder={cargoCodes.length === 0 ? "Chọn một hoặc nhiều mã..." : ""} className="text-sm" />
                  </ComboboxChips>
                  <ComboboxContent anchor={cargoAnchorRef} sideOffset={4} align="start" className="z-[120]">
                    <ComboboxEmpty className="py-2 text-xs text-gray-400">Không tìm thấy chủng loại hàng</ComboboxEmpty>
                    <ComboboxList>
                      {(code: string) => (
                        <ComboboxItem key={code} value={code} className="text-sm data-selected:bg-[#dde8f7] data-selected:font-medium">
                          <span className="font-mono text-xs text-gray-500">{code}</span>
                          {" — "}
                          {cargoTypes.find((c) => c.code === code)?.name ?? code}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>

              <div className="form-group" style={{ minWidth: 300, flex: 1 }}>
                <label>Chủng loại xe *</label>
                <Combobox items={vehicles.map((v) => v.code)} multiple disabled={lockStructure} value={vehicleCodes} onValueChange={setVehicleCodes}>
                  <ComboboxChips ref={vehicleAnchorRef} className="min-h-[39px] flex-nowrap overflow-hidden rounded-[8px] border-[#cfdbec] text-sm">
                    <ComboboxValue placeholder="Chọn một hoặc nhiều chủng loại xe...">
                      {vehicleCodes.slice(0, 3).map((code) => (
                        <ComboboxChip key={code} className="rounded-full bg-[#b8c6dc] px-2.5 py-0.5 text-xs font-medium text-[#16294a]">
                          {code}
                        </ComboboxChip>
                      ))}
                      {vehicleCodes.length > 3 && (
                        <span className="rounded-full bg-[#dde8f7] px-2.5 py-0.5 text-xs font-semibold text-[#16294a]">+{vehicleCodes.length - 3}</span>
                      )}
                    </ComboboxValue>
                    <ComboboxChipsInput placeholder={vehicleCodes.length === 0 ? "Chọn một hoặc nhiều chủng loại xe..." : ""} className="text-sm" />
                  </ComboboxChips>
                  <ComboboxContent anchor={vehicleAnchorRef} sideOffset={4} align="start" className="z-[120]">
                    <ComboboxEmpty className="py-2 text-xs text-gray-400">Không tìm thấy chủng loại xe</ComboboxEmpty>
                    <ComboboxList>
                      {(code: string) => {
                        const v = vehicles.find((x) => x.code === code);
                        return (
                          <ComboboxItem key={code} value={code} className="text-sm data-selected:bg-[#dde8f7] data-selected:font-medium">
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

          {/* Thanh công cụ của bảng nhập: Hiển thị cột + Hiển thị bảng (căn phải như các UI khác) */}
          {!isReadOnly && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, marginBottom: 12 }}>
              {mode === "create" && (
                <button className="btn" type="button" onClick={() => setQuickOpen(true)} title="Chụp ảnh bảng / chọn file Excel — tự tách mã hàng, chủng loại xe và giá trị">
                  <DIcon name="upload" /> Nhập liệu thông minh (Ảnh/Excel)
                </button>
              )}
              <ColumnsMenuButton layout={layout} columns={modelCols.filter((c) => c.key !== "time")} />
              <TableLayoutButton layout={layout} columns={modelCols} />
            </div>
          )}

          {isReadOnly && rows.length === 0 ? (
            <p className="entry-empty">Không có dữ liệu.</p>
          ) : isReadOnly ? (
            <ViewGrid
              columns={viewCols}
              rows={viewRows}
              storageKey="view:model"
              summary={
                <div className="vg-summary">
                  <span>Thời gian<strong>{record ? `${formatVN(record.effectiveFrom)} – ${formatVN(record.effectiveTo)}` : "—"}</strong></span>
                  <span>Chủng loại xe<strong>{vehicleCodes.join(", ") || "—"}</strong></span>
                </div>
              }
              textOf={(x, k) => (k === "time" ? `${formatVN(x.p.effectiveFrom)} – ${formatVN(x.p.effectiveTo)}` : k === "code" ? x.r.cargoTypeCode : k === "name" ? x.name : k === "note" ? x.p.note : (x.p.values[k] ?? ""))}
            />
          ) : (
            <div className="modal-table-scroll entry-clean-wrap">
              <table
                className={`entry-table entry-clean ${layout.tableClass}`}
                style={{ tableLayout: "fixed", width: 76 + shownWidth }}
              >
                <colgroup>
                  <col style={{ width: 76 }} />
                  {modelCols.map((c) => (
                    <col key={c.key} hidden={hid(c.key)} style={{ width: layout.widthOf(c.key) }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th rowSpan={headRows} style={{ textAlign: "center" }}>STT</th>
                    {modelCols.slice(0, 3).map((c) => (
                      <th key={c.key} rowSpan={headRows} hidden={hid(c.key)} style={{ position: "relative", ...(c.key === "time" ? { textAlign: "center" } : null) }}>
                        {c.label}
                        {c.key === "code" ? " *" : ""}
                        <ColResizer colKey={c.key} layout={layout} />
                      </th>
                    ))}
                    <th colSpan={Math.max(1, shownVehicleCols.length)} style={{ textAlign: "center" }}>
                      <div style={{ position: "sticky", left: 8, width: "fit-content", margin: "0 auto" }}>Chủng loại xe *</div>
                    </th>
                    <th rowSpan={headRows} hidden={hid("note")} style={{ position: "relative" }}>
                      Ghi chú
                      <ColResizer colKey="note" layout={layout} />
                    </th>
                  </tr>
                  <tr>
                    {shownVehicleCols.length > 0 ? (
                      shownVehicleCols.map((k) => (
                        <th key={k} style={{ position: "relative", textAlign: "center" }}>
                          {k}
                          <ColResizer colKey={k} layout={layout} />
                        </th>
                      ))
                    ) : (
                      <th style={{ textAlign: "center", fontWeight: 400, fontStyle: "italic", color: "#8aa0bd" }}>Chọn chủng loại xe</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <>
                      <tr className="entry-ghost">
                        <td colSpan={modelCols.slice(0, 3).filter((c) => !hid(c.key)).length + 1 + Math.max(1, shownVehicleCols.length) + (hid("note") ? 0 : 1)} className="entry-ghost-hint">
                          Chọn mã chủng loại hàng, chọn chủng loại xe ...
                        </td>
                      </tr>
                      {[0, 1].map((i) => (
                        <tr key={`ghost${i}`} className="entry-ghost">
                          {Array.from({ length: modelCols.slice(0, 3).filter((c) => !hid(c.key)).length + 1 + Math.max(1, shownVehicleCols.length) + (hid("note") ? 0 : 1) }).map((_, j) => (
                            <td key={j}>
                              <span className="entry-skel" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  )}
                  {rows.map((r, ri) =>
                    r.periods.map((p, pi) => (
                      <tr key={p.id} {...dnd.rowProps(ri)}>
                        <td style={{ textAlign: "center", fontWeight: 700, color: "#5b6f8f" }}>
                          <div className="entry-stt" style={{ justifyContent: "center" }}>
                            {pi === 0 ? (
                              <span className="dnd-handle" {...dnd.handleProps(ri)} title="Kéo để đổi vị trí" aria-label="Kéo để đổi vị trí">
                                <DIcon name="grip" />
                              </span>
                            ) : (
                              <span className="dnd-handle ghost" />
                            )}
                            <span className="entry-stt-no">{pi === 0 ? ri + 1 : ""}</span>
                          </div>
                        </td>
                        <td hidden={hid("time")}>
                          {isReadOnly ? (
                            <span className="entry-text">
                              {formatVN(p.effectiveFrom)} – {formatVN(p.effectiveTo)}
                            </span>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                                <MonthRangePicker
                                  from={p.effectiveFrom}
                                  to={p.effectiveTo}
                                  onChange={(f, t) => {
                                    setPeriodField(r.id, p.id, "effectiveFrom", f);
                                    setPeriodField(r.id, p.id, "effectiveTo", t);
                                  }}
                                />
                              </div>
                              {!lockStructure && (
                              <span className="time-actions">
                            <button
                              className="icon-mini"
                              onClick={() => splitPeriod(r.id, p.id)}
                              title="Tách thời gian này thành hai khoảng"
                              aria-label="Tách thời gian này thành hai khoảng"
                            >
                              <DIcon name="plus" />
                            </button>
                            <button
                              className="icon-mini x"
                              onClick={() => (r.periods.length > 1 ? removePeriod(r.id, p.id) : removeRow(r.id))}
                              title={r.periods.length > 1 ? "Xoá khoảng thời gian này" : "Xoá dòng này"}
                              aria-label={r.periods.length > 1 ? "Xoá khoảng thời gian này" : "Xoá dòng này"}
                            >
                              <DIcon name="x" />
                            </button>
                              </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td hidden={hid("code")} className="entry-text" style={{ fontWeight: 700, color: "#1a4f9d" }}>
                          {r.cargoTypeCode}
                        </td>
                        <td hidden={hid("name")} className="entry-text">{cargoByCode.get(r.cargoTypeCode)?.name ?? ""}</td>
                        {shownVehicleCols.length === 0 && <td className="entry-ghost-cell" />}
                        {activeColumns.map((k) => (
                          <td key={k} hidden={hid(k)}>
                            {isReadOnly ? (
                              <span className="entry-text" style={{ textAlign: "right" }}>{p.values[k] ?? ""}</span>
                            ) : (
                              <input
                                className="field"
                                style={{ textAlign: "right" }}
                                type="number"
                                step="any"
                                value={p.values[k] ?? ""}
                                onChange={(e) => setPeriodValue(r.id, p.id, k, e.target.value)}
                              />
                            )}
                          </td>
                        ))}
                        <td hidden={hid("note")}>
                          {isReadOnly ? (
                            <span className="entry-text">{p.note || "—"}</span>
                          ) : (
                            <input className="field" value={p.note} onChange={(e) => setPeriodField(r.id, p.id, "note", e.target.value)} placeholder="Ghi chú..." />
                          )}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && !isReadOnly && (
            <p className="entry-total">
              Tổng số{" "}
              <strong>
                {rows.length} dòng · {totalPeriods} khoảng thời gian
              </strong>
            </p>
          )}

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer" style={isReadOnly ? { padding: "8px 18px" } : undefined}>
          {isReadOnly ? (
            <button className="btn" onClick={onClose}>
              Đóng
            </button>
          ) : (
            <>
              <button className="btn" onClick={onClose} disabled={submitting}>
                Huỷ
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Đang lưu..." : mode === "edit" || mode === "editYear" ? "Lưu thay đổi" : "Xác nhận"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    {quickOpen && (
      <MatrixQuickImportDialog
        title="mô hình"
        rowAxis={{ label: "Mã chủng loại hàng", options: cargoTypes.map((c) => ({ value: c.code, label: c.code, alt: [c.name] })) }}
        colAxis={{
          label: "Chủng loại xe",
          options: vehicles.flatMap((v) =>
            (["CS", "KC"] as const).map((s) => ({ value: vehicleSuffixKeyOf(v.code, s), label: vehicleSuffixKeyOf(v.code, s), alt: [`${v.name}.${s}`] })),
          ),
        }}
        onApply={applyQuick}
        onClose={() => setQuickOpen(false)}
      />
    )}
    </>
  );
}
