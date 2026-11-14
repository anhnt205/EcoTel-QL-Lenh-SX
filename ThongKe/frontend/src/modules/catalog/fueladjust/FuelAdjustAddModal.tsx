import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import DIcon from "../design/DIcon";
import { moveItem, useRowDnD } from "../design/useRowDnD";
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
  monthColumnKeyOf,
  rowKeyOf,
  yearlyColumnKeyOf,
  type AreaGroup,
  type FuelAdjustClassification,
} from "./fuelAdjustKeys";

const CODE = "HS_DIEU_CHINH_NLDM";

interface VehicleFuelClassOption {
  id: number;
  code: string;
  name: string;
}

interface VehicleRankOption {
  id: number;
  code: string;
}

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
  const m = /^(.*)_([^_]*)_(DAT|Than)$/.exec(key);
  return m ? { vehicleCode: m[1], rankCode: m[2], classification: m[3] as FuelAdjustClassification } : null;
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
  const [areaGroup, setAreaGroup] = useState<AreaGroup>("CS");
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
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAreaGroup("CS");
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

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicle-fuel-classes-options"],
    queryFn: async () => {
      const res = await api.get("/vehicle-fuel-classes", { params: { size: 500 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as VehicleFuelClassOption[];
    },
    enabled: open,
  });

  const { data: ranks = [] } = useQuery({
    queryKey: ["vehicle-ranks-options"],
    queryFn: async () => {
      const res = await api.get("/vehicle-ranks", { params: { size: 500 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as VehicleRankOption[];
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
  const setMonthValue = (id: number, monthIdx: number, value: string) =>
    setRows((prev) =>
      prev.map((r) =>
        r.id !== id ? r : { ...r, months: { ...r.months, [areaGroup]: r.months[areaGroup].map((m, i) => (i === monthIdx ? value : m)) } },
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

  /** Nhập nhanh (ảnh/Excel): mỗi dòng nguồn = Chủng loại xe, Hạng xe, Phân loại, rồi 12 tháng (cột "HSNL điều chỉnh" phía sau tự bỏ qua) — vào nhóm khu vực đang chọn. */
  const quickFields: CatalogField[] = [
    { key: "vehicleCode", label: "Chủng loại xe", type: "select", required: true },
    { key: "rankCode", label: "Hạng xe", type: "select", required: true },
    { key: "classification", label: "Phân loại", type: "select", required: true },
    ...Array.from({ length: MONTH_COUNT }, (_, i): CatalogField => ({ key: `m${i + 1}`, label: `Tháng ${i + 1}`, type: "number" })),
  ];
  const quickOptions = {
    vehicleCode: vehicles.map((v) => ({ value: v.code, label: v.code, alt: [v.name] })),
    rankCode: ranks.map((rk) => ({ value: rk.code, label: rk.code })),
    classification: FUEL_ADJUST_CLASSIFICATIONS.map((c) => ({ value: c.value, label: c.value, alt: [c.label, c.value === "DAT" ? "Đất" : "Than"] })),
  };
  const addQuickRows = (list: Record<string, string>[]) =>
    setRows((prev) => {
      const untouched =
        prev.length === 1 && !prev[0].vehicleCode && !prev[0].rankCode && !prev[0].classification && !prev[0].rawKey && !hasValueIn(prev[0], "CS") && !hasValueIn(prev[0], "KC");
      const added: Row[] = list.map((v) => {
        const months = emptyByArea();
        months[areaGroup] = Array.from({ length: MONTH_COUNT }, (_, i) => (v[`m${i + 1}`] ?? "").replace(",", "."));
        return { id: nextId(), vehicleCode: v.vehicleCode, rankCode: v.rankCode, classification: v.classification as FuelAdjustClassification, months };
      });
      return [...(untouched ? [] : prev), ...added];
    });

  const validate = (): string | null => {
    if (rows.some((r) => !r.rawKey && (!r.vehicleCode || !r.rankCode || !r.classification)))
      return "Có dòng chưa chọn đủ Chủng loại xe (NL) + Hạng + Phân loại.";
    const keys = rows.map(keyOf);
    // Khoá chỉ lấy CHỮ ĐẦU của mã hạng, nên "C" và "C1" cho ra cùng một dòng
    // — báo trùng ở đây thay vì để hai dòng âm thầm đè lên nhau khi lưu.
    if (new Set(keys).size !== keys.length)
      return "Có dòng bị trùng nhau (cùng Chủng loại xe + chữ đầu Hạng xe + Phân loại).";
    if (!isEdit) {
      const hasAnyValue = rows.some((r) => hasValueIn(r, "CS") || hasValueIn(r, "KC"));
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
      const activeAreas = AREA_GROUPS.map((a) => a.value).filter((a) => rows.some((r) => hasValueIn(r, a)) || existingColKeys.has(yearlyColumnKeyOf(a)));
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
  // khoá dòng chỉ giữ CHỮ ĐẦU của hạng nên dòng đã lưu có thể mang "C" trong khi danh mục hạng là "C1" — vẫn hiện được giá trị đang có
  const rankOptions = (current: string) =>
    current && !ranks.some((rk) => rk.code === current) ? [{ id: -1, code: current }, ...ranks] : ranks;

  const WIDTHS = { stt: 96, vehicle: 170, rank: 110, cls: 130, month: 84, yearly: 120, action: 43 };
  const tableWidth = WIDTHS.stt + WIDTHS.vehicle + WIDTHS.rank + WIDTHS.cls + WIDTHS.month * MONTH_COUNT + WIDTHS.yearly + WIDTHS.action;

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
              <select className="field" value={areaGroup} onChange={(e) => setAreaGroup(e.target.value as AreaGroup)}>
                {AREA_GROUPS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {!isEdit && (
              <button className="btn add-row-btn" style={{ margin: 0 }} onClick={addRow}>
                <DIcon name="plus" /> Thêm dòng
              </button>
            )}
            {mode === "create" && (
              <button className="btn" type="button" style={{ margin: 0 }} onClick={() => setQuickOpen(true)} title="Chụp ảnh bảng / chọn file Excel — tự tách xe, hạng, phân loại và 12 tháng">
                <DIcon name="upload" /> Nhập liệu thông minh (Ảnh/Excel)
              </button>
            )}
          </div>

          <div className="modal-table-scroll entry-clean-wrap" style={{ overflow: "auto", maxHeight: "calc(100vh - 340px)" }}>
            <table className="entry-table entry-clean" style={{ tableLayout: "fixed", width: tableWidth, minWidth: 0 }}>
              <colgroup>
                <col style={{ width: WIDTHS.stt }} />
                <col style={{ width: WIDTHS.vehicle }} />
                <col style={{ width: WIDTHS.rank }} />
                <col style={{ width: WIDTHS.cls }} />
                {Array.from({ length: MONTH_COUNT }, (_, i) => (
                  <col key={i} style={{ width: WIDTHS.month }} />
                ))}
                <col style={{ width: WIDTHS.yearly }} />
                <col style={{ width: WIDTHS.action }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} className="fa-group">
                    STT
                  </th>
                  <th colSpan={3} className="fa-group">
                    Chủng loại xe (NL) + Hạng xe + Phân loại
                  </th>
                  <th colSpan={MONTH_COUNT} className="fa-group">
                    Hệ số theo tháng — {areaGroup}
                  </th>
                  <th rowSpan={2} className="fa-group">
                    {YEARLY_COL_LABEL}
                  </th>
                  <th rowSpan={2} />
                </tr>
                <tr>
                  <th className="fa-sub">Chủng loại xe</th>
                  <th className="fa-sub">Hạng xe</th>
                  <th className="fa-sub">Phân loại</th>
                  {Array.from({ length: MONTH_COUNT }, (_, i) => i + 1).map((m) => (
                    <th key={m} className="fa-sub fa-center">{`Tháng ${m}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => {
                  const avg = averageOf(r.months[areaGroup]);
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
                        <td colSpan={3} title="Dòng có khoá ngoài quy ước — giữ nguyên">
                          <span className="entry-text" style={{ fontWeight: 700 }}>{r.rawKey}</span>
                        </td>
                      ) : (
                        <>
                          <td>
                            <select className="field" value={r.vehicleCode} onChange={(e) => setRowField(r.id, "vehicleCode", e.target.value)}>
                              <option value="">Chọn xe</option>
                              {vehicleOptions(r.vehicleCode).map((v) => (
                                <option key={v.id} value={v.code}>
                                  {v.code}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select className="field" value={r.rankCode} onChange={(e) => setRowField(r.id, "rankCode", e.target.value)}>
                              <option value="">C</option>
                              {rankOptions(r.rankCode).map((rk) => (
                                <option key={rk.id} value={rk.code}>
                                  {rk.code}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select className="field" value={r.classification} onChange={(e) => setRowField(r.id, "classification", e.target.value)}>
                              <option value="">DAT</option>
                              {/* Hai giá trị tự suy từ SPNT, không phải danh mục (QĐ-10). */}
                              {FUEL_ADJUST_CLASSIFICATIONS.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </>
                      )}
                      {r.months[areaGroup].map((m, mi) => (
                        <td key={mi}>
                          <input
                            className="field"
                            style={{ textAlign: "center" }}
                            type="number"
                            step="any"
                            value={m}
                            onChange={(e) => setMonthValue(r.id, mi, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className="fa-avg">{avg !== null ? avg.toFixed(2) : ""}</td>
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
