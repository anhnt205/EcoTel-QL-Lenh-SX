import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import DIcon from "../design/DIcon";
import { moveItem, useRowDnD } from "../design/useRowDnD";
import { ColResizer, TableLayoutButton, useTableLayout, type LayoutColumn } from "../design/tableLayout";
import { ColumnsMenuButton } from "../design/ViewGrid";
import { CatalogQuickImportDialog } from "../CatalogQuickImportDialog";
import type { CatalogField } from "../types";
import "@/styles/catalog-design.css";
import api from "@/config/api.config";
import { versionLabelOf } from "../vehicleoutput/VehicleOutputYearTable";
import { matrixService, type MatrixCellUpsert, type MatrixGrid } from "../matrix/matrixService";
import {
  AREA_GROUPS,
  FUEL_ADJUST_CLASSIFICATIONS,
  MONTH_COUNT,
  YEARLY_COL_LABEL,
  averageOf,
  classificationKeyOf,
  monthColumnKeyOf,
  rowKeyOf,
  yearlyColumnKeyOf,
  type AreaGroup,
  type FuelAdjustClassification,
} from "./fuelAdjustKeys";

const CODE = "HS_DIEU_CHINH_NLDM";

/** Cột của bảng nhập (cho nút Hiển thị cột / Hiển thị bảng): Chủng loại xe, Chất lượng, Phân loại, rồi MỖI nhóm khu vực chọn một khối "Hệ số" = HSNL điều chỉnh (năm) + Tháng 1–12 (giống bảng xem). */
const FA_KEY_COLS = ["vehicle", "rank", "cls"];
const faKey = (a: AreaGroup, k: string) => `${a}.${k}`;
const faAreaKeys = (a: AreaGroup): string[] => [faKey(a, "yearly"), ...Array.from({ length: MONTH_COUNT }, (_, i) => faKey(a, `m${i + 1}`))];
const faColsFor = (areas: AreaGroup[]): LayoutColumn[] => {
  const multi = areas.length > 1;
  return [
    { key: "vehicle", label: "Chủng loại xe" },
    { key: "rank", label: "Chất lượng" },
    { key: "cls", label: "Phân loại" },
    ...areas.flatMap((a) => [
      { key: faKey(a, "yearly"), label: multi ? `${YEARLY_COL_LABEL} — ${a}` : YEARLY_COL_LABEL },
      ...Array.from({ length: MONTH_COUNT }, (_, i): LayoutColumn => ({ key: faKey(a, `m${i + 1}`), label: multi ? `Tháng ${i + 1} — ${a}` : `Tháng ${i + 1}` })),
    ]),
  ];
};
/** Nhãn ngắn ở tiêu đề cột (đã nằm dưới tiêu đề khối "Hệ số - CS|KC"). */
const faShortLabel = (key: string): string => {
  const k = key.split(".").pop() ?? key;
  if (k === "yearly") return YEARLY_COL_LABEL;
  const m = /^m(\d+)$/.exec(k);
  return m ? `Tháng ${m[1]}` : "";
};
const FA_FLOOR: Record<string, number> = { vehicle: 170, rank: 110, cls: 130, yearly: 150 };

/** Ô chọn xổ xuống có tick (chọn nhiều nhóm khu vực); luôn giữ lại ít nhất một nhóm. */
function AreaMultiSelect({ value, onChange }: { value: AreaGroup[]; onChange: (v: AreaGroup[]) => void }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const toggle = (a: AreaGroup) => {
    const next = value.includes(a) ? value.filter((x) => x !== a) : [...value, a];
    if (next.length > 0) onChange(AREA_GROUPS.map((g) => g.value).filter((g) => next.includes(g)));
  };
  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="field"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textAlign: "left", cursor: "pointer" }}
      >
        <span>{value.join(", ")}</span>
        <DIcon name="chevron-down" />
      </button>
      {open && (
        <div
          role="listbox"
          style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60, background: "#fff", border: "1px solid #c2d3ea", borderRadius: 7, boxShadow: "0 8px 22px rgba(8,40,100,.18)", padding: 4 }}
        >
          {AREA_GROUPS.map((a) => (
            <label key={a.value} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", cursor: "pointer", margin: 0, fontWeight: 600, borderRadius: 5 }}>
              <input type="checkbox" checked={value.includes(a.value)} onChange={() => toggle(a.value)} />
              {a.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

interface VehicleFuelClassOption {
  id: number;
  code: string;
  name: string;
}

/** Chất lượng xe: chỉ chọn A, B hoặc C (khoá dòng lấy đúng chữ cái này — LEFT(mã, 1)). */
const QUALITY_OPTIONS = ["A", "B", "C"];

/** Hệ số 12 tháng của từng nhóm khu vực — nhập cả hai nhóm trong cùng một lượt, bảng chỉ hiện nhóm đang chọn. */
type MonthsByArea = Record<AreaGroup, string[]>;

interface Row {
  id: number;
  vehicleCode: string;
  rankCode: string;
  classification: FuelAdjustClassification | "";
  months: MonthsByArea;
  /** Dòng đã có nhưng khoá không theo quy ước <xe>_<chữ đầu hạng>_<DAT|Than> — giữ nguyên khoá, không cho đổi. */
  rawKey?: string;
}

export type FuelAdjustModalMode = "create" | "editYear" | "copyYear";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const emptyMonths = (): string[] => Array.from({ length: MONTH_COUNT }, () => "");
const emptyByArea = (): MonthsByArea => ({ CS: emptyMonths(), KC: emptyMonths() });

/** Tách khoá dòng `<xe>_<chữ đầu hạng>_<DAT|Than>` về từng thành phần; null nếu không theo quy ước. */
const parseRowKey = (key: string): { vehicleCode: string; rankCode: string; classification: FuelAdjustClassification } | null => {
  const m = /^(.*)_([^_]*)_([^_]+)$/.exec(key);
  return m ? { vehicleCode: m[1], rankCode: m[2], classification: m[3] } : null;
};

/**
 * Modal "Thêm mới / Sửa / Sao chép HS điều chỉnh NLDM" — bespoke cho danh mục HS điều chỉnh NLĐM (HS_DIEU_CHINH_NLDM), một trong các lưới dùng
 * chung (`MatrixDefinition`/`MatrixCell` qua `matrixService`, giống Năng suất xe): mỗi năm một phiên bản lưới. Chọn Năm, sau đó nhập hệ số cho từng
 * dòng (Chủng loại xe (NL) + Hạng + Phân loại) × 12 tháng — cột "HSNL điều chỉnh" tự tính TRUNG BÌNH 12 tháng, cập nhật ngay khi gõ.
 *
 * <p>Khoá cột mang cả THÁNG lẫn nhóm khu vực ({@code T6.CS}) theo QĐ-12: ô "Nhóm khu vực" chỉ đổi nhóm đang HIỆN trong bảng; hệ số của cả hai nhóm
 * (CS, KC) đã nhập đều được lưu cùng một lượt khi bấm Xác nhận.
 *  - {@code create}: tạo mới cho một năm (đã có phiên bản của năm đó thì ghi bổ sung vào phiên bản ấy).
 *  - {@code editYear}: sửa CẢ bảng của phiên bản (`versions`; có nhiều phiên bản trong năm thì chọn ở ô Phiên bản).
 *  - {@code copyYear}: nạp bảng của năm nguồn rồi lưu sang năm khác (tạo phiên bản mới).
 */
export function FuelAdjustAddModal({
  open,
  mode = "create",
  versions: sourceVersions,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode?: FuelAdjustModalMode;
  /** Các phiên bản (đủ lưới) của năm nguồn — dùng cho editYear / copyYear. */
  versions?: MatrixGrid[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [year, setYear] = useState(currentYear);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [areaGroups, setAreaGroups] = useState<AreaGroup[]>(["CS"]);
  const [rows, setRows] = useState<Row[]>([]);
  // Kéo thả đổi vị trí dòng (setRows ổn định nên gọi hook ở đây, trước early return)
  const dnd = useRowDnD((f, t) => setRows((prev) => moveItem(prev, f, t)));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idRef = useRef(0);
  const nextId = () => ++idRef.current;
  const blankRow = (): Row => ({ id: nextId(), vehicleCode: "", rankCode: "", classification: "", months: emptyByArea() });

  /** Nạp bảng của một phiên bản vào các dòng của modal. */
  const loadGrid = (g: MatrixGrid) => {
    const list = [...g.rows].sort((a, b) => a.sortOrder - b.sortOrder).map((r): Row => {
      const p = parseRowKey(r.key);
      const months = emptyByArea();
      AREA_GROUPS.forEach(({ value: a }) =>
        months[a].forEach((_, i) => {
          const v = g.cells?.[r.key]?.[monthColumnKeyOf(i + 1, a)];
          if (v != null) months[a][i] = String(v);
        }),
      );
      return p ? { id: nextId(), ...p, months } : { id: nextId(), vehicleCode: "", rankCode: "", classification: "", months, rawKey: r.key };
    });
    setRows(list.length ? list : [blankRow()]);
    const detected = AREA_GROUPS.map((a) => a.value).filter((a) => g.cols.some((c) => c.key.endsWith(`.${a}`)));
    setAreaGroups(detected.length ? detected : ["CS"]);
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAreaGroups(["CS"]);
    if (mode !== "create" && sourceVersions && sourceVersions.length > 0) {
      const first = sourceVersions[0];
      setVersionId(first.versionId);
      loadGrid(first);
      const y = Number((first.effectiveFrom ?? "").slice(0, 4)) || currentYear;
      setYear(mode === "copyYear" ? y + 1 : y);
    } else {
      setVersionId(null);
      setYear(currentYear);
      setRows([blankRow()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Phân loại: trỏ vào DANH MỤC PHÂN LOẠI (mã DAT/THAN quy về DAT/Than như công thức AD5 và engine tra khoá)
  const { data: classOptionsRaw = [] } = useQuery({
    queryKey: ["classifications-options"],
    queryFn: async () => {
      const res = await api.get("/classifications", { params: { size: 500 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as { id: number; code: string; name: string }[];
    },
    enabled: open,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicle-fuel-classes-options"],
    queryFn: async () => {
      const res = await api.get("/vehicle-fuel-classes", { params: { size: 500 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as VehicleFuelClassOption[];
    },
    enabled: open,
  });

  // Không nạp danh mục "Phân loại" và "Khu vực xúc" ở đây: Phân loại là giá
  // trị TỰ SUY DAT/Than (QĐ-10), còn khu vực chỉ vào khoá dưới dạng NHÓM
  // CS/KC (QĐ-13) — chọn từng khu vực cụ thể sẽ sinh cột sai.

  const { data: allVersions = [] } = useQuery({
    queryKey: ["matrix-versions", CODE],
    queryFn: () => matrixService.versions(CODE),
    enabled: open,
  });

  // Hiển thị bảng do người dùng chọn (độ rộng cột, chiều cao hàng, ẩn/hiện cột) — như các bảng nhập khác
  const faCols = useMemo(() => faColsFor(areaGroups), [areaGroups]);
  const layout = useTableLayout<Row>("popup:fuel-adjust", faCols, rows, (r, k) => (k === "vehicle" ? r.vehicleCode : ""), (k) => FA_FLOOR[k.split(".").pop() ?? k] ?? 84, 48);
  const hid = (k: string) => layout.hidden.has(k);
  const shownIn = (keys: string[]) => keys.filter((k) => !hid(k)).length;
  // danh sách Phân loại theo danh mục (chưa nạp xong/danh mục trống thì lùi về Đất/Than để form vẫn dùng được)
  const classOptionList: { code: string; value: string; label: string }[] = classOptionsRaw.length
    ? classOptionsRaw.map((c) => ({ code: c.code, value: classificationKeyOf(c.code), label: c.name || c.code }))
    : FUEL_ADJUST_CLASSIFICATIONS.map((c) => ({ code: c.value, value: c.value, label: c.label }));
  // giá trị đã lưu chưa có trong danh mục vẫn hiện để không mất dữ liệu
  const classOptionsOf = (current: string) =>
    current && !classOptionList.some((c) => c.value === current) ? [{ code: current, value: current, label: current }, ...classOptionList] : classOptionList;

  if (!open) return null;

  const isEdit = mode === "editYear";

  const addRow = () => setRows((prev) => [...prev, blankRow()]);
  /** "+" ở đầu dòng: chèn một dòng trống ngay dưới. */
  const addRowAfter = (id: number) =>
    setRows((prev) => {
      const at = prev.findIndex((r) => r.id === id);
      const next = [...prev];
      next.splice(at + 1, 0, blankRow());
      return next;
    });
  const removeRow = (id: number) => setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  const setRowField = (id: number, field: "vehicleCode" | "rankCode" | "classification", value: string) =>
    setRows((prev) => prev.map((r) => (r.id !== id ? r : { ...r, [field]: value })));

  /** Khoá dòng — dùng chung cho kiểm tra trùng, tạo dòng và ghi ô. */
  const keyOf = (r: Row) => r.rawKey ?? rowKeyOf(r.vehicleCode, r.rankCode, r.classification as FuelAdjustClassification);
  const setMonthValue = (id: number, area: AreaGroup, monthIdx: number, value: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== id ? r : { ...r, months: { ...r.months, [area]: r.months[area].map((m, i) => (i === monthIdx ? value : m)) } },
      ),
    );
  const hasValueIn = (r: Row, a: AreaGroup) => r.months[a].some((m) => m.trim());

  const switchVersion = (id: number) => {
    const g = sourceVersions?.find((v) => v.versionId === id);
    if (!g) return;
    setVersionId(id);
    loadGrid(g);
    setError(null);
  };

  /** Nhập nhanh (ảnh/Excel): mỗi dòng nguồn = Chủng loại xe, Chất lượng, Phân loại, rồi 12 tháng (cột "HSNL điều chỉnh" phía sau tự bỏ qua) — vào nhóm khu vực chọn ĐẦU TIÊN. */
  const quickFields: CatalogField[] = [
    { key: "vehicleCode", label: "Chủng loại xe", type: "select", required: true },
    { key: "rankCode", label: "Chất lượng", type: "select", required: true },
    { key: "classification", label: "Phân loại", type: "select", required: true },
    ...Array.from({ length: MONTH_COUNT }, (_, i): CatalogField => ({ key: `m${i + 1}`, label: `Tháng ${i + 1}`, type: "number" })),
  ];
  const quickOptions = {
    vehicleCode: vehicles.map((v) => ({ value: v.code, label: v.code, alt: [v.name] })),
    rankCode: QUALITY_OPTIONS.map((q) => ({ value: q, label: q })),
    classification: classOptionList.map((c) => ({ value: c.value, label: c.label, alt: [c.value, c.code] })),
  };
  const addQuickRows = (list: Record<string, string>[]) =>
    setRows((prev) => {
      const untouched =
        prev.length === 1 && !prev[0].vehicleCode && !prev[0].rankCode && !prev[0].classification && !prev[0].rawKey && !hasValueIn(prev[0], "CS") && !hasValueIn(prev[0], "KC");
      const added: Row[] = list.map((v) => {
        const months = emptyByArea();
        months[areaGroups[0]] = Array.from({ length: MONTH_COUNT }, (_, i) => (v[`m${i + 1}`] ?? "").replace(",", "."));
        return { id: nextId(), vehicleCode: v.vehicleCode, rankCode: v.rankCode, classification: v.classification as FuelAdjustClassification, months };
      });
      return [...(untouched ? [] : prev), ...added];
    });

  const validate = (): string | null => {
    if (rows.some((r) => !r.rawKey && (!r.vehicleCode || !r.rankCode || !r.classification)))
      return "Có dòng chưa chọn đủ Chủng loại xe (NL) + Chất lượng + Phân loại.";
    const keys = rows.map(keyOf);
    // Khoá chỉ lấy CHỮ ĐẦU của mã hạng, nên "C" và "C1" cho ra cùng một dòng
    // — báo trùng ở đây thay vì để hai dòng âm thầm đè lên nhau khi lưu.
    if (new Set(keys).size !== keys.length)
      return "Có dòng bị trùng nhau (cùng Chủng loại xe + chữ đầu Chất lượng + Phân loại).";
    if (!isEdit) {
      const hasAnyValue = rows.some((r) => areaGroups.some((a) => hasValueIn(r, a)));
      if (!hasAnyValue) return "Chưa nhập hệ số tháng nào.";
    }
    if (mode === "copyYear" && allVersions.some((v) => (v.effectiveFrom ?? "").startsWith(`${year}-`)))
      return `Năm ${year} đã có dữ liệu HS điều chỉnh NLĐM — chọn năm khác hoặc dùng Sửa.`;
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
      let grid: MatrixGrid;
      if (isEdit) {
        grid = await matrixService.getGrid(CODE, versionId ?? undefined);
      } else {
        const effectiveFrom = `${year}-01-01`;
        const effectiveTo = `${year}-12-31`;
        const existingVersion = mode === "create" ? allVersions.find((v) => v.effectiveFrom === effectiveFrom) : undefined;
        grid = existingVersion
          ? await matrixService.getGrid(CODE, existingVersion.versionId)
          : await matrixService.createVersion(CODE, { effectiveFrom, effectiveTo, note: `HS điều chỉnh NLĐM năm ${year}`, copyCells: false });
      }
      const original = grid;

      const rowKeys = rows.map(keyOf);
      if (isEdit) {
        const wanted = new Set(rowKeys);
        for (const r of original.rows) {
          if (!wanted.has(r.key)) grid = await matrixService.removeRow(CODE, grid.versionId, r.key);
        }
      }
      const existingRowKeys = new Set(grid.rows.map((r) => r.key));
      const newRowKeys = rowKeys.filter((k) => !existingRowKeys.has(k));
      if (newRowKeys.length > 0) {
        grid = await matrixService.addRows(CODE, grid.versionId, [...new Set(newRowKeys)].map((k) => ({ key: k, label: k })));
      }

      // Cột mang cả tháng lẫn nhóm khu vực (QĐ-12): tạo 12 cột tháng + cột hệ số năm của mỗi nhóm có dữ liệu (hoặc đã có sẵn trong lưới).
      const existingColKeys = new Set(grid.cols.map((c) => c.key));
      const activeAreas = AREA_GROUPS.map((a) => a.value).filter((a) => (areaGroups.includes(a) && rows.some((r) => hasValueIn(r, a))) || existingColKeys.has(yearlyColumnKeyOf(a)));
      const newCols: { key: string; label: string }[] = [];
      activeAreas.forEach((a) => {
        Array.from({ length: MONTH_COUNT }, (_, i) => i + 1).forEach((m) => {
          const k = monthColumnKeyOf(m, a);
          if (!existingColKeys.has(k)) newCols.push({ key: k, label: `Tháng ${m} — ${a}` });
        });
        const yk = yearlyColumnKeyOf(a);
        if (!existingColKeys.has(yk)) newCols.push({ key: yk, label: `${YEARLY_COL_LABEL} — ${a}` });
      });
      if (newCols.length > 0) grid = await matrixService.addCols(CODE, grid.versionId, newCols);

      const cellPayload: MatrixCellUpsert[] = [];
      for (const r of rows) {
        const rowKey = keyOf(r);
        for (const a of activeAreas) {
          r.months[a].forEach((m, i) => {
            const colKey = monthColumnKeyOf(i + 1, a);
            const raw = m.trim();
            const num = raw ? Number(raw.replace(",", ".")) : NaN;
            if (raw && !Number.isNaN(num)) cellPayload.push({ rowKey, colKey, value: num });
            else if (isEdit && original.cells?.[rowKey]?.[colKey] != null) cellPayload.push({ rowKey, colKey, value: null });
          });
          const yk = yearlyColumnKeyOf(a);
          const avg = averageOf(r.months[a]);
          if (avg !== null) cellPayload.push({ rowKey, colKey: yk, value: Math.round(avg * 1e6) / 1e6 });
          else if (isEdit && original.cells?.[rowKey]?.[yk] != null) cellPayload.push({ rowKey, colKey: yk, value: null });
        }
      }
      if (cellPayload.length > 0) {
        await matrixService.saveCells(CODE, grid.versionId, cellPayload);
      }

      toast.success(`Đã lưu ${rows.length} dòng HS điều chỉnh NLĐM.`);
      onSaved();
      onClose();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message ?? "Lưu thất bại. Kiểm tra lại dữ liệu.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = isEdit ? "Sửa HS điều chỉnh NLDM" : mode === "copyYear" ? "Sao chép HS điều chỉnh NLDM" : "Thêm mới HS điều chỉnh NLDM";
  const subtitle = isEdit
    ? "Sửa hệ số từng tháng của các dòng đã có (không thêm/bớt dòng). Hệ số năm tự động cập nhật (trung bình 12 tháng)."
    : mode === "copyYear"
      ? "Chọn năm đích, chỉnh lại nếu cần rồi lưu — bảng sẽ được tạo mới cho năm đó."
      : "Chọn năm và nhóm khu vực, sau đó nhập hệ số cho từng tháng. Hệ số năm được hệ thống tự động cập nhật (trung bình 12 tháng).";

  const vehicleOptions = (current: string) =>
    current && !vehicles.some((v) => v.code === current) ? [{ id: -1, code: current, name: "" }, ...vehicles] : vehicles;
  // chỉ chọn A / B / C; giá trị cũ khác (nếu dòng đã lưu mang mã dài) vẫn hiện để không mất dữ liệu
  const rankOptions = (current: string) =>
    current && !QUALITY_OPTIONS.includes(current) ? [current, ...QUALITY_OPTIONS] : QUALITY_OPTIONS;

  const STT_W = 96;
  const ACTION_W = 43;
  const tableWidth = STT_W + ACTION_W + faCols.reduce((s, c) => (hid(c.key) ? s : s + layout.widthOf(c.key)), 0);

  return (
    <>
    <div
      className="tkc-modal-overlay"
      style={isFullscreen ? { padding: 0 } : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={isFullscreen ? { width: "100%", height: "100%", maxHeight: "100%", borderRadius: 0 } : { width: "min(1560px, 100%)" }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
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

        <div className="modal-body">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14, marginBottom: 18 }}>
            {isEdit && sourceVersions && sourceVersions.length > 1 ? (
              <div className="form-group" style={{ width: 260 }}>
                <label>Phiên bản (trong năm) *</label>
                <select className="field" value={String(versionId ?? "")} onChange={(e) => switchVersion(Number(e.target.value))}>
                  {sourceVersions.map((v, i) => (
                    <option key={v.versionId} value={String(v.versionId)}>
                      {versionLabelOf(v, i)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group" style={{ width: 140 }}>
                <label>Năm *</label>
                <select className="field" value={String(year)} disabled={isEdit} onChange={(e) => setYear(Number(e.target.value))}>
                  {(YEAR_OPTIONS.includes(year) ? YEAR_OPTIONS : [year, ...YEAR_OPTIONS]).map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group" style={{ width: 200 }}>
              <label>Nhóm khu vực *</label>
              {/* Ô chọn xổ xuống có tick: mỗi nhóm chọn sinh một khối "Hệ số - <nhóm>" như bảng xem. Luôn giữ ít nhất 1 nhóm. */}
              <AreaMultiSelect value={areaGroups} onChange={setAreaGroups} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {!isEdit && (
              <button className="btn add-row-btn" style={{ margin: 0 }} onClick={addRow}>
                <DIcon name="plus" /> Thêm dòng
              </button>
            )}
            {mode === "create" && (
              <button className="btn" type="button" style={{ margin: 0 }} onClick={() => setQuickOpen(true)} title="Chụp ảnh bảng / chọn file Excel — tự tách xe, chất lượng, phân loại và 12 tháng">
                <DIcon name="upload" /> Nhập liệu thông minh (Ảnh/Excel)
              </button>
            )}
            <ColumnsMenuButton layout={layout} columns={faCols} />
            <TableLayoutButton layout={layout} columns={faCols} />
          </div>

          <div className="modal-table-scroll entry-clean-wrap" style={{ overflow: "auto", maxHeight: "calc(100vh - 340px)" }}>
            <table className={`entry-table entry-clean ${layout.tableClass}`} style={{ tableLayout: "fixed", width: tableWidth, minWidth: 0 }}>
              <colgroup>
                <col style={{ width: STT_W }} />
                {faCols.map((c) => (
                  <col key={c.key} hidden={hid(c.key)} style={{ width: layout.widthOf(c.key) }} />
                ))}
                <col style={{ width: ACTION_W }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} className="fa-group">
                    STT
                  </th>
                  <th colSpan={Math.max(1, shownIn(FA_KEY_COLS))} hidden={shownIn(FA_KEY_COLS) === 0} className="fa-group">
                    Chủng loại xe (NL) + Chất lượng + Phân loại
                  </th>
                  {areaGroups.map((a) => (
                    <th key={a} colSpan={Math.max(1, shownIn(faAreaKeys(a)))} hidden={shownIn(faAreaKeys(a)) === 0} className="fa-group">
                      {areaGroups.length > 1 ? `Hệ số - ${a}` : "Hệ số"}
                    </th>
                  ))}
                  <th rowSpan={2} />
                </tr>
                <tr>
                  {faCols.map((c) => {
                    const isKey = FA_KEY_COLS.includes(c.key);
                    return (
                      <th
                        key={c.key}
                        hidden={hid(c.key)}
                        className={`fa-sub${isKey ? "" : " fa-center"}${c.key.endsWith(".yearly") ? " fa-yearly" : ""}`}
                        style={{ position: "relative" }}
                      >
                        {isKey ? c.label : faShortLabel(c.key)}
                        <ColResizer colKey={c.key} layout={layout} />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => {
                  return (
                    <tr key={r.id} {...dnd.rowProps(ri)}>
                      <td style={{ textAlign: "center", paddingTop: 9 }}>
                        <div className="entry-stt" style={{ justifyContent: "center" }}>
                          <span className="dnd-handle" {...dnd.handleProps(ri)} title="Kéo để đổi vị trí" aria-label="Kéo để đổi vị trí">
                            <DIcon name="grip" />
                          </span>
                          <span className="entry-stt-no">{ri + 1}</span>
                          {!isEdit && (
                          <span className="time-actions">
                            <button className="icon-mini" title="Thêm dòng vào bên dưới" aria-label="Thêm dòng vào bên dưới" onClick={() => addRowAfter(r.id)}>
                              <DIcon name="plus" />
                            </button>
                            {rows.length > 1 && (
                              <button className="icon-mini x" title="Xoá dòng này" aria-label="Xoá dòng này" onClick={() => removeRow(r.id)}>
                                <DIcon name="x" />
                              </button>
                            )}
                          </span>
                          )}
                        </div>
                      </td>
                      {r.rawKey ? (
                        <td colSpan={Math.max(1, shownIn(FA_KEY_COLS))} hidden={shownIn(FA_KEY_COLS) === 0} title="Dòng có khoá ngoài quy ước — giữ nguyên">
                          <span className="entry-text" style={{ fontWeight: 700 }}>{r.rawKey}</span>
                        </td>
                      ) : (
                        <>
                          <td hidden={hid("vehicle")}>
                            <select className="field" value={r.vehicleCode} onChange={(e) => setRowField(r.id, "vehicleCode", e.target.value)}>
                              <option value="">Chọn xe</option>
                              {vehicleOptions(r.vehicleCode).map((v) => (
                                <option key={v.id} value={v.code}>
                                  {v.code}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td hidden={hid("rank")}>
                            <select className="field" value={r.rankCode} onChange={(e) => setRowField(r.id, "rankCode", e.target.value)}>
                              <option value="">Chọn</option>
                              {rankOptions(r.rankCode).map((q) => (
                                <option key={q} value={q}>
                                  {q}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td hidden={hid("cls")}>
                            <select className="field" value={r.classification} onChange={(e) => setRowField(r.id, "classification", e.target.value)}>
                              <option value="">Chọn</option>
                              {classOptionsOf(r.classification).map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </>
                      )}
                      {areaGroups.map((a) => {
                        const avg = averageOf(r.months[a]);
                        return (
                          <Fragment key={a}>
                            <td hidden={hid(faKey(a, "yearly"))} className="fa-avg">{avg !== null ? avg.toFixed(2) : ""}</td>
                            {r.months[a].map((m, mi) => (
                              <td key={mi} hidden={hid(faKey(a, `m${mi + 1}`))}>
                                <input
                                  className="field"
                                  style={{ textAlign: "center" }}
                                  type="number"
                                  step="any"
                                  value={m}
                                  onChange={(e) => setMonthValue(r.id, a, mi, e.target.value)}
                                />
                              </td>
                            ))}
                          </Fragment>
                        );
                      })}
                      <td />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={submitting}>
            Huỷ
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
    {quickOpen && (
      <CatalogQuickImportDialog
        fields={quickFields}
        options={quickOptions}
        nounPhrase="hệ số điều chỉnh NLĐM"
        ignoreExtra
        onAdd={addQuickRows}
        onClose={() => setQuickOpen(false)}
      />
    )}
    </>
  );
}
