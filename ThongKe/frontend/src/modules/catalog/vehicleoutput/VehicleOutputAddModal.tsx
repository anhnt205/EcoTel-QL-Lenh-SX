import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import DIcon from "../design/DIcon";
import { moveItem, useRowDnD } from "../design/useRowDnD";
import { MatrixQuickImportDialog, type MxResult } from "../design/MatrixQuickImportDialog";
import { normText } from "../design/quickLoad";
import "@/styles/catalog-design.css";
import api from "@/config/api.config";
import { versionLabelOf } from "./VehicleOutputYearTable";
import { matrixService, type MatrixCellUpsert, type MatrixGrid } from "../matrix/matrixService";
import {
  VEHICLE_OUTPUT_AREAS,
  VEHICLE_OUTPUT_CLASSIFICATIONS,
  parseVehicleOutputKey,
  vehicleClassificationKeyOf,
  type VehicleOutputArea,
  type VehicleOutputClassification,
} from "./vehicleOutputKeys";

const CODE = "NANG_SUAT_XE";

interface VehicleTypeOption {
  id: number;
  code: string;
  name: string;
}

interface ColumnGroup {
  id: number;
  vehicleTypeCode: string;
  classification: VehicleOutputClassification | "";
  /** Nhóm khu vực của cột: "" = tất cả khu vực (khoá không hậu tố). */
  area: VehicleOutputArea;
  /** Cột đã có nhưng khoá không theo quy ước <xe>.<DAT|Than>[.<CS|KC>] — giữ nguyên khoá, không cho đổi. */
  rawKey?: string;
}

export type VehicleOutputModalMode = "create" | "editYear" | "copyYear";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

/** Chuẩn hoá một cung độ gõ vào: chấp nhận "0,05"/"0.05"; trả null nếu không phải số không âm. */
const normDistance = (raw: string): string | null => {
  const t = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return String(Number(t));
};

/**
 * Modal "Thêm mới năng suất xe" / sửa cả năm / sao chép năm — bespoke cho danh mục Năng suất xe
 * (NANG_SUAT_XE), một trong các lưới dùng chung (`MatrixDefinition`/`MatrixCell` qua `matrixService`).
 * Mỗi năm là một phiên bản lưới, Cung độ là dòng số, "Chủng loại xe + Phân loại [+ Khu vực]" là khoá cột
 * (xem `vehicleOutputKeys.ts`).
 *
 * Cách dùng giống Tỷ trọng: chọn Năm + Khu vực xúc + (nhiều) Cung độ ở trên → các dòng đổ xuống bảng theo thứ tự;
 * Chủng loại xe + Phân loại là các cột ngang. Dòng kéo thả đổi vị trí.
 *  - `create`: tạo mới cho một năm (đã có phiên bản của năm đó thì ghi bổ sung vào phiên bản ấy).
 *  - `editYear`: sửa CẢ bảng của phiên bản (`versions`; có nhiều phiên bản trong năm thì chọn ở ô Phiên bản).
 *  - `copyYear`: nạp bảng của năm nguồn rồi lưu sang năm khác (tạo phiên bản mới).
 */
export function VehicleOutputAddModal({
  open,
  mode = "create",
  versions: sourceVersions,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode?: VehicleOutputModalMode;
  /** Các phiên bản (đủ lưới) của năm nguồn — dùng cho editYear / copyYear. */
  versions?: MatrixGrid[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [year, setYear] = useState(currentYear);
  const [versionId, setVersionId] = useState<number | null>(null);
  const [distances, setDistances] = useState<string[]>([]);
  const [distInput, setDistInput] = useState("");
  const [blankVal, setBlankVal] = useState("");
  const [groups, setGroups] = useState<ColumnGroup[]>([]);
  const [values, setValues] = useState<Record<string, Record<number, string>>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kéo thả đổi vị trí dòng cung độ (setDistances ổn định nên gọi hook ở đây, trước early return)
  const dnd = useRowDnD((f, t) => setDistances((prev) => moveItem(prev, f, t)));

  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  /** Nạp bảng của một phiên bản vào các state của modal. */
  const loadGrid = (g: MatrixGrid) => {
    const rows = [...g.rows].sort((a, b) => a.sortOrder - b.sortOrder);
    const cols = [...g.cols].sort((a, b) => a.sortOrder - b.sortOrder);
    const gs: ColumnGroup[] = cols.map((c) => {
      const p = parseVehicleOutputKey(c.key);
      return p
        ? { id: nextId(), vehicleTypeCode: p.vehicleTypeCode, classification: p.classification, area: p.area }
        : { id: nextId(), vehicleTypeCode: "", classification: "", area: "", rawKey: c.key };
    });
    const vals: Record<string, Record<number, string>> = {};
    rows.forEach((r) => {
      vals[r.key] = {};
      cols.forEach((c, i) => {
        const v = g.cells?.[r.key]?.[c.key];
        if (v != null) vals[r.key][gs[i].id] = String(v);
      });
    });
    setDistances(rows.map((r) => r.key));
    setGroups(gs.length ? gs : [{ id: nextId(), vehicleTypeCode: "", classification: "", area: "" }]);
    setValues(vals);
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDistInput("");
    if (mode !== "create" && sourceVersions && sourceVersions.length > 0) {
      const first = sourceVersions[0];
      setVersionId(first.versionId);
      loadGrid(first);
      const y = Number((first.effectiveFrom ?? "").slice(0, 4)) || currentYear;
      setYear(mode === "copyYear" ? y + 1 : y);
    } else {
      setVersionId(null);
      setYear(currentYear);
      setDistances([]);
      setGroups([{ id: nextId(), vehicleTypeCode: "", classification: "", area: "" }]);
      setValues({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Danh mục "Chủng loại xe" (cột DA), KHÔNG phải "Chủng loại xe (NL)" của
  // ĐMNL và cũng không phải chủng loại hàng — xem `vehicleOutputKeys.ts`.
  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ["vehicle-types-options"],
    queryFn: async () => {
      const res = await api.get("/vehicle-types", { params: { size: 500 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as VehicleTypeOption[];
    },
    enabled: open,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["matrix-versions", CODE],
    queryFn: () => matrixService.versions(CODE),
    enabled: open,
  });

  if (!open) return null;

  const isEdit = mode === "editYear";
  const title = isEdit ? "Sửa năng suất xe" : mode === "copyYear" ? "Sao chép năng suất xe" : "Thêm mới năng suất xe";
  const subtitle = isEdit
    ? "Sửa giá trị năng suất đã có (không thêm/bớt Cung độ, nhóm cột)."
    : mode === "copyYear"
      ? "Chọn năm đích, chỉnh lại nếu cần rồi lưu — bảng sẽ được tạo mới cho năm đó."
      : "Chọn thời gian, chọn khu vực xúc, chọn các Cung độ rồi nhập năng suất cho từng Cung độ × nhóm cột.";

  // ── Cung độ (chọn nhiều ở trên → đổ xuống bảng) ──────────────────────────
  const addDistances = (raw: string) => {
    const tokens = raw.split(/[\s;]+/).filter(Boolean);
    if (tokens.length === 0) return;
    const bad: string[] = [];
    setDistances((prev) => {
      let next = [...prev];
      for (const t of tokens) {
        const n = normDistance(t);
        if (n == null) {
          bad.push(t);
          continue;
        }
        if (next.some((d) => Number(d) === Number(n))) continue;
        const at = next.findIndex((d) => Number(d) > Number(n));
        if (at < 0) next.push(n);
        else next.splice(at, 0, n);
      }
      return next;
    });
    setError(bad.length ? `Cung độ phải là số: ${bad.join(", ")}` : null);
  };
  const removeDistance = (d: string) => setDistances((prev) => prev.filter((x) => x !== d));
  /** "+" ở đầu dòng: chèn một dòng trống ngay dưới để gõ cung độ (chỉ một dòng trống tại một thời điểm). */
  const insertBlankAfter = (index: number) => {
    setBlankVal("");
    setDistances((prev) => (prev.includes("") ? prev : [...prev.slice(0, index + 1), "", ...prev.slice(index + 1)]));
  };
  /** Chốt cung độ của dòng trống: hợp lệ → đặt vào đúng vị trí; rỗng → bỏ dòng; sai/trùng → báo lỗi và bỏ dòng. */
  const commitBlank = (raw: string) => {
    const n = normDistance(raw);
    if (raw.trim() && n == null) setError(`Cung độ phải là số: ${raw.trim()}`);
    setDistances((prev) => {
      const at = prev.indexOf("");
      if (at < 0) return prev;
      if (n == null || prev.some((d) => d !== "" && Number(d) === Number(n))) return prev.filter((d) => d !== "");
      const next = [...prev];
      next[at] = n;
      return next;
    });
    setBlankVal("");
  };
  const commitInput = () => {
    if (!distInput.trim()) return;
    addDistances(distInput);
    setDistInput("");
  };

  // ── Nhóm cột ────────────────────────────────────────────────────────────
  const areaOfAll: VehicleOutputArea | "__mixed" = (() => {
    const set = new Set(groups.filter((g) => !g.rawKey).map((g) => g.area));
    if (set.size > 1) return "__mixed";
    return set.size === 1 ? [...set][0] : "";
  })();
  const applyAreaToAll = (a: VehicleOutputArea) => setGroups((prev) => prev.map((g) => (g.rawKey ? g : { ...g, area: a })));

  const addGroup = () =>
    setGroups((prev) => [
      ...prev,
      { id: nextId(), vehicleTypeCode: "", classification: "", area: areaOfAll === "__mixed" ? "" : areaOfAll },
    ]);
  /** "+" ở tiêu đề nhóm: chèn một nhóm cột mới ngay bên phải nhóm này (cùng khu vực). */
  const addGroupAfter = (id: number) =>
    setGroups((prev) => {
      const at = prev.findIndex((g) => g.id === id);
      const area = prev[at]?.rawKey ? "" : (prev[at]?.area ?? "");
      const next = [...prev];
      next.splice(at + 1, 0, { id: nextId(), vehicleTypeCode: "", classification: "", area });
      return next;
    });
  const removeGroup = (id: number) => setGroups((prev) => (prev.length === 1 ? prev : prev.filter((g) => g.id !== id)));
  const setGroupField = (id: number, field: "vehicleTypeCode" | "classification", value: string) =>
    setGroups((prev) => prev.map((g) => (g.id !== id ? g : { ...g, [field]: value })));

  /** Khoá cột của một nhóm — dùng chung cho kiểm tra, tạo cột và ghi ô. */
  const groupKey = (g: ColumnGroup) =>
    g.rawKey ?? vehicleClassificationKeyOf(g.vehicleTypeCode, g.classification as VehicleOutputClassification, g.area);

  const setCellValue = (distance: string, groupId: number, value: string) =>
    setValues((prev) => ({ ...prev, [distance]: { ...(prev[distance] ?? {}), [groupId]: value } }));

  // ── Nhập nhanh (ảnh/Excel) ───────────────────────────────────────────────
  /** Tiêu đề cột trong bảng nguồn → khoá cột: "<xe> <DAT|Than|Đất> [CS|KC]" (cách nhau bằng dấu chấm/cách/gạch dưới); xe phải có trong danh mục. */
  const quickColKey = (raw: string): string | null => {
    const toks = raw.trim().split(/[.\s_/,]+/).filter(Boolean);
    let area: VehicleOutputArea = "";
    if (toks.length > 1 && /^(cs|kc)$/i.test(toks[toks.length - 1])) area = toks.pop()!.toUpperCase() as VehicleOutputArea;
    const cls = toks.length > 1 ? normText(toks[toks.length - 1]) : "";
    const classification: VehicleOutputClassification | null = cls === "dat" ? "DAT" : cls === "than" ? "Than" : null;
    if (!classification) return null;
    toks.pop();
    const cands = [".", "", "-", " "].map((s) => normText(toks.join(s)));
    const veh = vehicleTypes.find((v) => cands.includes(normText(v.code)) || cands.includes(normText(v.name)));
    return veh ? vehicleClassificationKeyOf(veh.code, classification, area) : null;
  };
  /** Thêm cung độ + nhóm cột thấy trong bảng nguồn (nhóm trống đầu tiên được dùng lại) rồi điền giá trị. */
  const applyQuick = (res: MxResult) => {
    const nextGroups = [...groups];
    const idOfKey = new Map<string, number>();
    nextGroups.forEach((g) => {
      if (g.rawKey || (g.vehicleTypeCode && g.classification)) idOfKey.set(groupKey(g), g.id);
    });
    res.cols.forEach((k) => {
      const p = parseVehicleOutputKey(k);
      if (!p || idOfKey.has(k)) return;
      const blankAt = nextGroups.findIndex((g) => !g.rawKey && !g.vehicleTypeCode && !g.classification);
      const id = blankAt >= 0 ? nextGroups[blankAt].id : nextId();
      const ng: ColumnGroup = { id, vehicleTypeCode: p.vehicleTypeCode, classification: p.classification, area: p.area };
      if (blankAt >= 0) nextGroups[blankAt] = ng;
      else nextGroups.push(ng);
      idOfKey.set(k, id);
    });
    const nextDist = [...distances];
    const distOf = new Map<string, string>();
    res.rows.forEach((r) => {
      const have = nextDist.find((d) => d !== "" && Number(d) === Number(r));
      if (have) {
        distOf.set(r, have);
        return;
      }
      const at = nextDist.findIndex((d) => d !== "" && Number(d) > Number(r));
      if (at < 0) nextDist.push(r);
      else nextDist.splice(at, 0, r);
      distOf.set(r, r);
    });
    setGroups(nextGroups);
    setDistances(nextDist);
    setValues((prev) => {
      const out = { ...prev };
      res.cells.forEach((c) => {
        const d = distOf.get(c.row) ?? c.row;
        const gid = idOfKey.get(c.col);
        if (gid != null) out[d] = { ...(out[d] ?? {}), [gid]: c.value };
      });
      return out;
    });
    toast.success(`Đã thêm ${res.rows.length} cung độ (${res.cells.length} ô) từ bảng nguồn.`);
  };

  const switchVersion = (id: number) => {
    const g = sourceVersions?.find((v) => v.versionId === id);
    if (!g) return;
    setVersionId(id);
    loadGrid(g);
    setError(null);
  };

  const validate = (): string | null => {
    if (distances.length === 0) return "Chưa chọn Cung độ.";
    if (distances.includes("")) return "Có dòng chưa nhập Cung độ.";
    if (groups.some((g) => !g.rawKey && (!g.vehicleTypeCode || !g.classification)))
      return "Có nhóm cột chưa chọn đủ Chủng loại xe + Phân loại.";
    const keys = groups.map(groupKey);
    if (new Set(keys).size !== keys.length) return "Có nhóm cột bị trùng nhau (cùng Chủng loại xe + Phân loại + Khu vực).";
    if (!isEdit) {
      const hasAnyValue = distances.some((d) => groups.some((g) => values[d]?.[g.id]?.trim()));
      if (!hasAnyValue) return "Chưa nhập giá trị nào.";
    }
    if (mode === "copyYear" && versions.some((v) => (v.effectiveFrom ?? "").startsWith(`${year}-`)))
      return `Năm ${year} đã có dữ liệu năng suất xe — chọn năm khác hoặc dùng Sửa.`;
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
        const existingVersion = versions.find((v) => v.effectiveFrom === effectiveFrom);
        grid = existingVersion
          ? await matrixService.getGrid(CODE, existingVersion.versionId)
          : await matrixService.createVersion(CODE, { effectiveFrom, effectiveTo, note: `Năng suất xe năm ${year}`, copyCells: false });
      }
      const original = grid;

      // Khoá dòng: cung độ trùng số với dòng đã có thì dùng lại khoá đó (tránh "0.10" và "0.1" thành hai dòng)
      const existingRowKeyByNum = new Map<number, string>();
      original.rows.forEach((r) => existingRowKeyByNum.set(Number(r.numericValue ?? r.key), r.key));
      const rowKeyOf = (d: string) => existingRowKeyByNum.get(Number(d)) ?? d;
      const wantedRowKeys = new Set(distances.map(rowKeyOf));
      const wantedColKeys = new Set(groups.map(groupKey));

      if (isEdit) {
        for (const r of original.rows) {
          if (!wantedRowKeys.has(r.key)) grid = await matrixService.removeRow(CODE, grid.versionId, r.key);
        }
        for (const c of original.cols) {
          if (!wantedColKeys.has(c.key)) grid = await matrixService.removeCol(CODE, grid.versionId, c.key);
        }
      }

      const haveRows = new Set(grid.rows.map((r) => r.key));
      const newRows = [...wantedRowKeys].filter((k) => !haveRows.has(k));
      if (newRows.length > 0) {
        grid = await matrixService.addRows(CODE, grid.versionId, newRows.map((k) => ({ key: k, label: k })));
      }
      const haveCols = new Set(grid.cols.map((c) => c.key));
      const newCols = [...wantedColKeys].filter((k) => !haveCols.has(k));
      if (newCols.length > 0) {
        grid = await matrixService.addCols(CODE, grid.versionId, newCols.map((k) => ({ key: k, label: k })));
      }

      const cellPayload: MatrixCellUpsert[] = [];
      for (const d of distances) {
        const rowKey = rowKeyOf(d);
        for (const g of groups) {
          const colKey = groupKey(g);
          const raw = values[d]?.[g.id]?.trim();
          const num = raw ? Number(raw.replace(",", ".")) : NaN;
          if (raw && !Number.isNaN(num)) cellPayload.push({ rowKey, colKey, value: num });
          else if (isEdit && original.cells?.[rowKey]?.[colKey] != null) cellPayload.push({ rowKey, colKey, value: null });
        }
      }
      if (cellPayload.length > 0) {
        await matrixService.saveCells(CODE, grid.versionId, cellPayload);
      }

      toast.success(
        isEdit ? `Đã lưu năng suất xe (${distances.length} cung độ × ${groups.length} cột).` : `Đã lưu ${cellPayload.length} ô năng suất xe.`,
      );
      onSaved();
      onClose();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message ?? "Lưu thất bại. Kiểm tra lại dữ liệu.");
    } finally {
      setSubmitting(false);
    }
  };

  const GROUP_W = 150;
  const tableWidth = 64 + 150 + GROUP_W * groups.length + 130;
  const bodyCols = 2 + groups.length + 1;
  const vehicleOptions = (current: string) =>
    current && !vehicleTypes.some((c) => c.code === current) ? [{ id: -1, code: current, name: "" }, ...vehicleTypes] : vehicleTypes;

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
          <div className="entry-top" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 14, marginBottom: 18 }}>
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
                {isEdit ? (
                  <select className="field" value="v" disabled>
                    <option value="v">
                      {sourceVersions?.[0]?.effectiveFrom ? sourceVersions[0].effectiveFrom.slice(0, 4) : ""}
                    </option>
                  </select>
                ) : (
                  <select className="field" value={String(year)} onChange={(e) => setYear(Number(e.target.value))}>
                    {(YEAR_OPTIONS.includes(year) ? YEAR_OPTIONS : [year, ...YEAR_OPTIONS]).map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="form-group" style={{ width: 240 }}>
              <label>Khu vực xúc</label>
              <select className="field" value={areaOfAll} onChange={(e) => applyAreaToAll(e.target.value as VehicleOutputArea)}>
                {areaOfAll === "__mixed" && (
                  <option value="__mixed" disabled>
                    Nhiều khu vực (giữ nguyên từng cột)
                  </option>
                )}
                <option value="">Tất cả khu vực</option>
                {VEHICLE_OUTPUT_AREAS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 320, flex: 1 }}>
              <label>Cung độ (km) *</label>
              <div className="dist-box" onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}>
                {distances.slice(0, 6).map((d) => (
                  <span key={d} className="dist-chip">
                    {d}
                    {!isEdit && (
                      <button type="button" aria-label={`Bỏ cung độ ${d}`} onClick={() => removeDistance(d)}>
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {distances.length > 6 && <span className="dist-more">+{distances.length - 6}</span>}
                {!isEdit && (
                <input
                  inputMode="decimal"
                  value={distInput}
                  placeholder={distances.length === 0 ? "Gõ cung độ rồi Enter (vd 0,05 hoặc 12) ..." : ""}
                  onChange={(e) => setDistInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ";") {
                      e.preventDefault();
                      commitInput();
                    } else if (e.key === "Backspace" && !distInput && distances.length) {
                      removeDistance(distances[distances.length - 1]);
                    }
                  }}
                  onBlur={commitInput}
                />
                )}
              </div>
            </div>
          </div>

          {mode === "create" && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <button className="btn" type="button" onClick={() => setQuickOpen(true)} title="Chụp ảnh bảng / chọn file Excel — tự tách cung độ, nhóm cột và giá trị">
                <DIcon name="upload" /> Nhập liệu thông minh (Ảnh/Excel)
              </button>
            </div>
          )}

          <div className="modal-table-scroll entry-clean-wrap" style={{ width: "fit-content" }}>
            <table className="entry-table entry-clean vo-table" style={{ tableLayout: "fixed", width: tableWidth, minWidth: 0 }}>
              <colgroup>
                <col style={{ width: 64 }} />
                <col style={{ width: 150 }} />
                {groups.map((g) => (
                  <col key={g.id} style={{ width: GROUP_W }} />
                ))}
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} className="fa-group">
                    STT
                  </th>
                  <th rowSpan={2}>Cung độ (km)</th>
                  <th colSpan={groups.length} className="fa-group">
                    <div style={{ position: "sticky", left: 8, width: "fit-content", margin: "0 auto" }}>Chủng loại xe + Phân loại</div>
                  </th>
                  <th rowSpan={2} className="fa-group">
                    {!isEdit && (
                      <button className="btn vo-addgroup" onClick={addGroup} title="Thêm nhóm">
                        <DIcon name="plus" /> Thêm nhóm
                      </button>
                    )}
                  </th>
                </tr>
                <tr>
                  {groups.map((g) => (
                    <th key={g.id} className="fa-sub">
                      <div className="vo-grouphead vo-stack">
                        {g.rawKey ? (
                          <span className="entry-text" style={{ flex: 1, textAlign: "center", fontWeight: 700 }} title="Cột có khoá ngoài quy ước — giữ nguyên">
                            {g.rawKey}
                          </span>
                        ) : (
                          <>
                            <select
                              className="field"
                              style={{ width: "100%", paddingLeft: 8, paddingRight: 22, textOverflow: "ellipsis" }}
                              title={vehicleTypes.find((c) => c.code === g.vehicleTypeCode)?.name ?? ""}
                              value={g.vehicleTypeCode}
                              onChange={(e) => setGroupField(g.id, "vehicleTypeCode", e.target.value)}
                            >
                              <option value="">Chủng loại xe</option>
                              {vehicleOptions(g.vehicleTypeCode).map((c) => (
                                <option key={c.id} value={c.code} title={c.name}>
                                  {c.code}
                                </option>
                              ))}
                            </select>
                            <select
                              className="field"
                              style={{ flex: "1 1 0", minWidth: 0, paddingLeft: 8, paddingRight: 22 }}
                              value={g.classification}
                              onChange={(e) => setGroupField(g.id, "classification", e.target.value)}
                            >
                              <option value="">Phân loại</option>
                              {/* Chỉ hai giá trị: công thức AD5 tự suy DAT/Than
                                  từ Sản phẩm nghiệm thu, không có danh mục
                                  "Phân loại" ở đây (QĐ-10). */}
                              {VEHICLE_OUTPUT_CLASSIFICATIONS.map((c) => (
                                <option key={c.value} value={c.value} title={c.label}>
                                  {c.value}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                        {!isEdit && (
                        <span className="time-actions">
                          <button className="icon-mini" title="Thêm nhóm vào bên phải" aria-label="Thêm nhóm vào bên phải" onClick={() => addGroupAfter(g.id)}>
                            <DIcon name="plus" />
                          </button>
                          {groups.length > 1 && (
                            <button className="icon-mini x" title="Xoá nhóm này" aria-label="Xoá nhóm này" onClick={() => removeGroup(g.id)}>
                              <DIcon name="x" />
                            </button>
                          )}
                        </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {distances.length === 0 && (
                  <>
                    <tr className="entry-ghost">
                      <td colSpan={bodyCols} className="entry-ghost-hint">
                        Chọn cung độ ...
                      </td>
                    </tr>
                    {[0, 1].map((i) => (
                      <tr key={`ghost${i}`} className="entry-ghost">
                        {Array.from({ length: bodyCols }).map((_, j) => (
                          <td key={j}>
                            <span className="entry-skel" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}
                {distances.map((d, ri) => (
                  <tr key={d || "blank"} {...dnd.rowProps(ri)}>
                    <td style={{ textAlign: "center", paddingTop: 9 }}>
                      <div className="entry-stt" style={{ justifyContent: "center" }}>
                        <span className="dnd-handle" {...dnd.handleProps(ri)} title="Kéo để đổi vị trí" aria-label="Kéo để đổi vị trí">
                          <DIcon name="grip" />
                        </span>
                        <span className="entry-stt-no">{ri + 1}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {d === "" ? (
                          <input
                            className="field"
                            style={{ flex: "1 1 0", minWidth: 0 }}
                            autoFocus
                            inputMode="decimal"
                            placeholder="vd 0,05"
                            value={blankVal}
                            onChange={(e) => setBlankVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitBlank(blankVal);
                              } else if (e.key === "Escape") {
                                setBlankVal("");
                                removeDistance("");
                              }
                            }}
                            onBlur={() => commitBlank(blankVal)}
                          />
                        ) : (
                          <span className="entry-text" style={{ fontWeight: 700, flex: "1 1 0", minWidth: 0 }}>
                            {d}
                          </span>
                        )}
                        {!isEdit && (
                        <span className="time-actions">
                          <button className="icon-mini" onClick={() => insertBlankAfter(ri)} title="Thêm cung độ vào dòng dưới" aria-label="Thêm cung độ vào dòng dưới">
                            <DIcon name="plus" />
                          </button>
                          <button className="icon-mini x" onClick={() => removeDistance(d)} title="Xoá dòng này" aria-label="Xoá dòng này">
                            <DIcon name="x" />
                          </button>
                        </span>
                        )}
                      </div>
                    </td>
                    {groups.map((g) => (
                      <td key={g.id}>
                        <input
                          className="field"
                          style={{ width: 96, margin: "0 auto", display: "block", textAlign: "center" }}
                          type="number"
                          step="any"
                          value={values[d]?.[g.id] ?? ""}
                          onChange={(e) => setCellValue(d, g.id, e.target.value)}
                        />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
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
            {submitting ? "Đang lưu..." : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
    {quickOpen && (
      <MatrixQuickImportDialog
        title="năng suất xe"
        rowAxis={{ label: "Cung độ (km)", options: [], free: normDistance }}
        colAxis={{ label: "Chủng loại xe + Phân loại", options: [], free: quickColKey }}
        onApply={applyQuick}
        onClose={() => setQuickOpen(false)}
      />
    )}
    </>
  );
}
