import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/config/api.config";
import DIcon from "../design/DIcon";
import { NumberChipsInput, normNumber } from "../design/NumberChipsInput";
import { MatrixQuickImportDialog, type MxResult } from "../design/MatrixQuickImportDialog";
import { normText } from "../design/quickLoad";
import { moveItem, useRowDnD } from "../design/useRowDnD";
import { matrixService, type MatrixCellUpsert, type MatrixGrid } from "../matrix/matrixService";
import "@/styles/catalog-design.css";
import { buildColumnKey, parseColumnKey, parseVehicleSuffixKey, vehicleSuffixKeyOf } from "./fuelNormKeys";

const DMNL_CODE = "DMNL";

interface VehicleFuelClassOption {
  id: number;
  code: string;
  name: string;
}

interface ClassificationOption {
  id: number;
  code: string;
  name: string;
}

/** Một nhóm cột: Chủng loại xe (NL) + Phân loại (mã trong danh mục Phân loại → hậu tố). Mỗi nhóm trải ra một cột cho MỖI cung độ trong danh sách Cung độ. */
interface ColumnGroup {
  id: number;
  vehicleCode: string;
  suffix: string;
}

/** Một dòng dữ liệu: một Độ dốc trong một khoảng thời gian (một độ dốc có thể có nhiều dòng = nhiều khoảng thời gian). */
interface Row {
  id: number;
  slope: string;
  from: string;
  to: string;
  /** phiên bản gốc của dòng khi Sửa/Sao chép (để biết phiên bản nào cần cập nhật) */
  versionId?: number;
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const cellKey = (groupId: number, distance: string) => `${groupId}|${distance}`;

/** Dời một ngày yyyy-MM-dd sang năm khác (29/02 sang năm không nhuận → 28/02). */
const shiftToYear = (iso: string, y: number) => {
  if (!ISO.test(iso)) return iso;
  const mmdd = iso.slice(5);
  const d = mmdd === "02-29" && new Date(y, 1, 29).getMonth() !== 1 ? "02-28" : mmdd;
  return `${y}-${d}`;
};

/**
 * Modal "Thêm mới Định mức nhiên liệu" (DMNL) — cấu trúc đúng như bảng Excel gốc:
 *
 *   | Cung độ | Độ dốc | HD785-7.BK_0,05 | HD785-7.BK_0,2 | HD785-7.BK_0,4 | … |
 *
 *  - **Cung độ** và **Độ dốc** là HAI danh sách dọc ĐỘC LẬP (chọn nhiều ở trên, đặt cạnh nhau theo thứ tự như Excel), không phải cặp khoá.
 *  - Dòng dữ liệu = ĐỘ DỐC (hàng của lưới DMNL), cả bảng thuộc MỘT năm (chọn Năm ở trên, không có cột Thời gian).
 *  - Mỗi nhóm cột tự chọn **Chủng loại xe + Phân loại** (Phân loại lấy từ danh mục Phân loại, mã = hậu tố); nhóm trải ra một cột cho mỗi cung độ,
 *    tiêu đề tự ghép `<xe>.<phân loại>_<cung độ>` — cung độ ở đuôi là TỰ ĐỘNG theo danh sách Cung độ (cột tương ứng).
 *  - Lưu: các dòng cùng khoảng thời gian gộp vào MỘT phiên bản lưới (đã có phiên bản trùng ngày bắt đầu thì ghi bổ sung vào phiên bản đó).
 */
export type FuelNormModalMode = "create" | "editYear" | "copyYear";

/** Cột tồn tại sẵn trong một phiên bản: `<xe>.<phân loại>|<cung độ số>` → khoá cột thật (khoá cũ có thể viết "0,05" hoặc "0.05"). */
const colKeyMapOf = (g: MatrixGrid) => {
  const m = new Map<string, string>();
  g.cols.forEach((c) => {
    const p = parseColumnKey(c.key);
    if (p) m.set(`${p.vehicleSuffixKey}|${p.distance}`, c.key);
  });
  return m;
};

export function FuelNormCreateModal({
  open,
  mode = "create",
  sourceVersions,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode?: FuelNormModalMode;
  /** Các phiên bản (đủ lưới) của năm nguồn — dùng cho Sửa / Sao chép. */
  sourceVersions?: MatrixGrid[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = mode === "editYear";
  const [year, setYear] = useState(currentYear);
  // Danh sách thô có thể chứa MỘT mục trống (dòng vừa bấm "+", đang gõ giá trị); danh sách sạch dùng để sinh cột/kiểm tra
  const [distancesRaw, setDistances] = useState<string[]>([]);
  const [slopesRaw, setSlopes] = useState<string[]>([]);
  const [blankDistance, setBlankDistance] = useState("");
  const [blankSlope, setBlankSlope] = useState("");
  const distances = distancesRaw.filter(Boolean);
  const slopes = slopesRaw.filter(Boolean);
  const [groups, setGroups] = useState<ColumnGroup[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [values, setValues] = useState<Record<number, Record<string, string>>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Khi Sửa: cấu trúc ĐÃ NẠP của từng phiên bản gốc — chỉ xoá những dòng/cột đã nạp mà người dùng bỏ đi, không đụng phần khác. */
  const originRef = useRef<Map<number, { rowKeys: string[]; colKeys: string[]; effectiveFrom: string | null }>>(new Map());
  const idRef = useRef(0);
  const nextId = () => ++idRef.current;
  const yearRef = useRef(year);
  yearRef.current = year;

  // Kéo thả đổi vị trí NHÓM dòng của một độ dốc (đổi thứ tự độ dốc)
  const dnd = useRowDnD((f, t) => setSlopes((prev) => moveItem(prev, f, t)));

  useEffect(() => {
    if (!open) return;
    setError(null);
    originRef.current = new Map();
    if (mode !== "create" && sourceVersions && sourceVersions.length > 0) {
      // Nạp dữ liệu năm nguồn vào đúng cấu trúc của bảng Thêm mới
      // Không còn cột Thời gian: một năm = một bảng. Năm có nhiều phiên bản (dữ liệu cũ) thì lấy phiên bản dài nhất (thường là cả năm); phiên bản khác giữ nguyên, không bị đụng tới.
      const span = (g: MatrixGrid) => Date.parse(g.effectiveTo ?? g.effectiveFrom ?? "") - Date.parse(g.effectiveFrom ?? "");
      const vs = [[...sourceVersions].sort((a, b) => (span(b) || 0) - (span(a) || 0))[0]];
      const baseYear = Number((vs[0].effectiveFrom ?? "").slice(0, 4)) || currentYear;
      const targetYear = mode === "copyYear" ? baseYear + 1 : baseYear;
      const shift = (iso: string | null, fallback: string) => (iso ? (mode === "copyYear" ? shiftToYear(iso, targetYear) : iso) : fallback);
      const distSet = new Set<number>();
      const slopeSet = new Set<number>();
      const groupMap = new Map<string, { vehicleCode: string; suffix: string }>();
      vs.forEach((v) => {
        v.cols.forEach((c) => {
          const p = parseColumnKey(c.key);
          const s = p ? parseVehicleSuffixKey(p.vehicleSuffixKey) : null;
          if (!p || !s) return;
          distSet.add(p.distance);
          groupMap.set(p.vehicleSuffixKey, { vehicleCode: s.vehicleCode, suffix: s.suffix });
        });
        v.rows.forEach((r) => slopeSet.add(Number(r.numericValue ?? r.key)));
        if (mode === "editYear") originRef.current.set(v.versionId, { rowKeys: v.rows.map((r) => r.key), colKeys: v.cols.map((c) => c.key), effectiveFrom: v.effectiveFrom });
      });
      const dList = [...distSet].sort((a, b) => a - b).map(String);
      const sList = [...slopeSet].sort((a, b) => a - b).map(String);
      const gList: ColumnGroup[] = [...groupMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "vi", { numeric: true }))
        .map(([, g]) => ({ id: nextId(), vehicleCode: g.vehicleCode, suffix: g.suffix }));
      const rList: Row[] = [];
      const vals: Record<number, Record<string, string>> = {};
      for (const s of sList) {
        for (const v of vs) {
          const row = v.rows.find((r) => Number(r.numericValue ?? r.key) === Number(s));
          if (!row) continue;
          const colMap = colKeyMapOf(v);
          const id = nextId();
          rList.push({ id, slope: s, from: shift(v.effectiveFrom, `${targetYear}-01-01`), to: shift(v.effectiveTo, `${targetYear}-12-31`), versionId: v.versionId });
          vals[id] = {};
          for (const g of gList) {
            for (const d of dList) {
              const ck = colMap.get(`${vehicleSuffixKeyOf(g.vehicleCode, g.suffix)}|${Number(d)}`);
              const val = ck ? v.cells?.[row.key]?.[ck] : undefined;
              if (val != null) vals[id][cellKey(g.id, d)] = String(val);
            }
          }
        }
      }
      setYear(targetYear);
      setDistances(dList);
      setSlopes(sList);
      setGroups(gList.length ? gList : [{ id: nextId(), vehicleCode: "", suffix: "" }]);
      setRows(rList);
      setValues(vals);
    } else {
      setYear(currentYear);
      setDistances([]);
      setSlopes([]);
      setGroups([{ id: nextId(), vehicleCode: "", suffix: "" }]);
      setRows([]);
      setValues({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Đồng bộ dòng theo danh sách Độ dốc: độ dốc bị bỏ thì xoá dòng; độ dốc mới thêm một dòng cả năm; dòng giữ thứ tự theo ô chọn.
  useEffect(() => {
    setRows((prev) => {
      const bySlope = new Map<string, Row[]>();
      prev.forEach((r) => {
        if (slopesRaw.includes(r.slope)) bySlope.set(r.slope, [...(bySlope.get(r.slope) ?? []), r]);
      });
      const out: Row[] = [];
      for (const s of slopesRaw) {
        const g = bySlope.get(s);
        if (g && g.length) out.push(...g);
        else out.push({ id: nextId(), slope: s, from: prev[0]?.from ?? `${yearRef.current}-01-01`, to: prev[0]?.to ?? `${yearRef.current}-12-31` });
      }
      return out;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slopesRaw]);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicle-fuel-classes-options"],
    queryFn: async () => {
      const res = await api.get("/vehicle-fuel-classes", { params: { size: 1000 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as VehicleFuelClassOption[];
    },
    enabled: open,
  });
  const { data: classifications = [] } = useQuery({
    queryKey: ["classifications-options"],
    queryFn: async () => {
      const res = await api.get("/classifications", { params: { size: 1000 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as ClassificationOption[];
    },
    enabled: open,
  });
  const { data: versions = [] } = useQuery({
    queryKey: ["matrix-versions", DMNL_CODE],
    queryFn: () => matrixService.versions(DMNL_CODE),
    enabled: open,
  });

  if (!open) return null;

  /** "+" ở ô: chèn một mục trống ngay dưới vị trí `index` để gõ giá trị mới (chỉ một mục trống mỗi danh sách). */
  const insertBlank = (set: (fn: (p: string[]) => string[]) => void, reset: () => void, index: number) => {
    reset();
    set((prev) => (prev.includes("") ? prev : [...prev.slice(0, index + 1), "", ...prev.slice(index + 1)]));
  };
  /** Chốt giá trị vừa gõ ở mục trống: hợp lệ → điền vào đúng vị trí; rỗng/sai/trùng → bỏ mục trống (sai thì báo lỗi). */
  const commitBlank = (raw: string, set: (fn: (p: string[]) => string[]) => void, clear: () => void) => {
    const n = normNumber(raw);
    if (raw.trim() && n == null) setError(`Phải là số: ${raw.trim()}`);
    set((prev) => {
      const at = prev.indexOf("");
      if (at < 0) return prev;
      if (n == null || prev.some((d) => d !== "" && Number(d) === Number(n))) return prev.filter((d) => d !== "");
      const next = [...prev];
      next[at] = n;
      return next;
    });
    clear();
  };
  const removeAt = (set: (fn: (p: string[]) => string[]) => void, index: number) => set((prev) => prev.filter((_, i) => i !== index));
  /**
   * Ô gõ của dòng mới (Cung độ / Độ dốc cùng một dòng, dùng chung một cặp +/x): Enter ở Cung độ → nhảy sang Độ dốc, Enter ở Độ dốc → chốt cả hai;
   * rời khỏi dòng (không phải chuyển giữa hai ô của dòng) cũng chốt cả hai; Esc huỷ cả hai.
   */
  const blankInput = (which: "distance" | "slope", value: string, setValue: (v: string) => void) => (
    <input
      className="field"
      data-blank={which}
      style={{ flex: "1 1 0", minWidth: 110, width: "100%", height: 30 }}
      autoFocus={which === "distance" || !blankDistanceActive}
      inputMode="decimal"
      placeholder={which === "distance" ? "Cung độ" : "Độ dốc"}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const next = which === "distance" ? e.currentTarget.closest("tr")?.querySelector<HTMLInputElement>("input[data-blank=slope]") : null;
          if (next) next.focus();
          else commitBlankAll();
        } else if (e.key === "Escape") cancelBlankAll();
      }}
      onBlur={(e) => {
        const to = e.relatedTarget as HTMLElement | null;
        if (to?.dataset?.blank && to.closest("tr") === e.currentTarget.closest("tr")) return;
        commitBlankAll();
      }}
    />
  );
  const actionButtons = (onAdd: () => void, onRemove: (() => void) | null, what: string) => (
    <span className="time-actions">
      <button className="icon-mini" onClick={onAdd} title={`Thêm ${what} vào dòng dưới`} aria-label={`Thêm ${what} vào dòng dưới`}>
        <DIcon name="plus" />
      </button>
      {onRemove && (
        <button className="icon-mini x" onClick={onRemove} title={`Xoá ${what} này`} aria-label={`Xoá ${what} này`}>
          <DIcon name="x" />
        </button>
      )}
    </span>
  );
  const cancelBlankDistance = () => {
    setBlankDistance("");
    setDistances((p) => p.filter((d) => d !== ""));
  };
  const cancelBlankSlope = () => {
    setBlankSlope("");
    setSlopes((p) => p.filter((d) => d !== ""));
  };
  const blankDistanceActive = distancesRaw.includes("");
  const commitBlankAll = () => {
    if (distancesRaw.includes("")) commitBlank(blankDistance, setDistances, () => setBlankDistance(""));
    if (slopesRaw.includes("")) commitBlank(blankSlope, setSlopes, () => setBlankSlope(""));
  };
  const cancelBlankAll = () => {
    cancelBlankDistance();
    cancelBlankSlope();
  };
  /** "+" dùng chung: chèn dòng mới (Cung độ + Độ dốc cùng trống) ngay dưới dòng `index`. */
  const addRowBelow = (index: number) => {
    setBlankDistance("");
    setBlankSlope("");
    insertBlank(setDistances, () => undefined, index);
    insertBlank(setSlopes, () => undefined, index);
  };
  /** "x" dùng chung: xoá cả Cung độ lẫn Độ dốc của dòng `index`. */
  const removeRowAt = (index: number) => {
    removeAt(setDistances, index);
    removeAt(setSlopes, index);
  };

  const changeYear = (y: number) => {
    setYear(y);
    setRows((prev) => prev.map((r) => ({ ...r, from: shiftToYear(r.from, y), to: shiftToYear(r.to, y) })));
  };

  // ── nhóm cột ──
  const addGroupAfter = (id: number) =>
    setGroups((prev) => {
      const at = prev.findIndex((g) => g.id === id);
      const next = [...prev];
      next.splice(at + 1, 0, { id: nextId(), vehicleCode: "", suffix: "" });
      return next;
    });
  const addGroup = () => setGroups((prev) => [...prev, { id: nextId(), vehicleCode: "", suffix: "" }]);
  const removeGroup = (id: number) => setGroups((prev) => (prev.length === 1 ? prev : prev.filter((g) => g.id !== id)));
  const setGroupField = (id: number, field: "vehicleCode" | "suffix", value: string) =>
    setGroups((prev) => prev.map((g) => (g.id !== id ? g : { ...g, [field]: value })));

  const setCell = (rowId: number, key: string, value: string) =>
    setValues((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] ?? {}), [key]: value } }));

  const groupKeyOf = (g: ColumnGroup) => vehicleSuffixKeyOf(g.vehicleCode, g.suffix);
  const colKeyOf = (g: ColumnGroup, distance: string) => buildColumnKey(groupKeyOf(g), Number(distance));

  // ── Nhập liệu thông minh (ảnh/Excel): dòng = Độ dốc, cột = "<xe>.<phân loại>_<cung độ>" ──
  /** Tiêu đề cột trong bảng nguồn → khoá cột chuẩn; xe và phân loại phải có trong danh mục. */
  const quickColKey = (raw: string): string | null => {
    const p = parseColumnKey(raw.trim().replace(/\s+/g, ""));
    const s = p ? parseVehicleSuffixKey(p.vehicleSuffixKey) : null;
    if (!p || !s) return null;
    const v = vehicles.find((x) => normText(x.code) === normText(s.vehicleCode));
    const c = classifications.find((x) => normText(x.code) === normText(s.suffix));
    return v && c ? buildColumnKey(vehicleSuffixKeyOf(v.code, c.code), p.distance) : null;
  };
  /** Thêm độ dốc, cung độ, nhóm cột thấy trong bảng nguồn (nhóm trống đầu tiên được dùng lại) rồi điền giá trị. */
  const applyQuick = (res: MxResult) => {
    const eq = (a: string, b: string) => Number(a) === Number(b);
    // độ dốc (dòng)
    const nextSlopes = slopesRaw.filter(Boolean);
    const slopeOf = new Map<string, string>();
    res.rows.forEach((r) => {
      const have = nextSlopes.find((s) => eq(s, r));
      if (!have) nextSlopes.push(r);
      slopeOf.set(r, have ?? r);
    });
    const rowIdOf = new Map<string, number>();
    const newRows: Row[] = [];
    slopeOf.forEach((slope) => {
      const have = rows.find((x) => eq(x.slope, slope));
      if (have) rowIdOf.set(slope, have.id);
      else {
        const nr: Row = { id: nextId(), slope, from: rows[0]?.from ?? `${year}-01-01`, to: rows[0]?.to ?? `${year}-12-31` };
        newRows.push(nr);
        rowIdOf.set(slope, nr.id);
      }
    });
    // cung độ + nhóm cột
    const nextDist = distancesRaw.filter(Boolean);
    const distOf = new Map<number, string>();
    const nextGroups = [...groups];
    const groupIdOf = new Map<string, number>();
    nextGroups.forEach((g) => g.vehicleCode && g.suffix && groupIdOf.set(groupKeyOf(g), g.id));
    res.cols.forEach((ck) => {
      const p = parseColumnKey(ck);
      const s = p ? parseVehicleSuffixKey(p.vehicleSuffixKey) : null;
      if (!p || !s) return;
      if (!distOf.has(p.distance)) {
        const have = nextDist.find((d) => eq(d, String(p.distance)));
        if (!have) nextDist.push(String(p.distance));
        distOf.set(p.distance, have ?? String(p.distance));
      }
      if (!groupIdOf.has(p.vehicleSuffixKey)) {
        const blankAt = nextGroups.findIndex((g) => !g.vehicleCode && !g.suffix);
        const id = blankAt >= 0 ? nextGroups[blankAt].id : nextId();
        const ng: ColumnGroup = { id, vehicleCode: s.vehicleCode, suffix: s.suffix };
        if (blankAt >= 0) nextGroups[blankAt] = ng;
        else nextGroups.push(ng);
        groupIdOf.set(p.vehicleSuffixKey, id);
      }
    });
    nextDist.sort((a, b) => Number(a) - Number(b));
    setSlopes(nextSlopes);
    setDistances(nextDist);
    setGroups(nextGroups);
    if (newRows.length) setRows((prev) => [...prev, ...newRows]);
    setValues((prev) => {
      const out = { ...prev };
      res.cells.forEach((c) => {
        const p = parseColumnKey(c.col);
        const rowId = rowIdOf.get(slopeOf.get(c.row) ?? "");
        const gid = p ? groupIdOf.get(p.vehicleSuffixKey) : undefined;
        const d = p ? distOf.get(p.distance) : undefined;
        if (rowId != null && gid != null && d != null) out[rowId] = { ...(out[rowId] ?? {}), [cellKey(gid, d)]: c.value };
      });
      return out;
    });
    toast.success(`Đã thêm ${res.rows.length} độ dốc (${res.cells.length} ô) từ bảng nguồn.`);
  };

  const validate = (): string | null => {
    if (distancesRaw.includes("") || slopesRaw.includes("")) return "Có dòng chưa nhập Cung độ / Độ dốc.";
    if (distances.length === 0) return "Chọn ít nhất một Cung độ.";
    if (slopes.length === 0) return "Chọn ít nhất một Độ dốc.";
    if (groups.some((g) => !g.vehicleCode || !g.suffix)) return "Có cột chưa chọn đủ Chủng loại xe + Phân loại.";
    // Sao chép = tạo bản MỚI: năm đích không được trùng năm đã có dữ liệu
    if (mode === "copyYear" && versions.some((v) => (v.effectiveFrom ?? "").startsWith(`${year}-`)))
      return `Năm ${year} đã có dữ liệu định mức nhiên liệu — chọn năm khác để sao chép (hoặc dùng Sửa).`;
    const keys = groups.map(groupKeyOf);
    if (new Set(keys).size !== keys.length) return "Có cột bị trùng nhau (cùng Chủng loại xe + Phân loại).";
    if (!rows.some((r) => groups.some((g) => distances.some((d) => values[r.id]?.[cellKey(g.id, d)]?.trim())))) return "Chưa nhập giá trị nào.";
    return null;
  };

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) return setError(msg);
    setError(null);
    setSubmitting(true);
    try {
      // Các dòng cùng khoảng thời gian → cùng một phiên bản lưới
      const byPeriod = new Map<string, Row[]>();
      for (const r of rows) byPeriod.set(`${r.from}|${r.to}`, [...(byPeriod.get(`${r.from}|${r.to}`) ?? []), r]);

      let saved = 0;
      const usedOrigin = new Set<number>();
      for (const [period, group] of [...byPeriod.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const [from, to] = period.split("|");
        const existing = versions.find((v) => v.effectiveFrom === from);
        let grid: MatrixGrid = existing
          ? await matrixService.getGrid(DMNL_CODE, existing.versionId)
          : await matrixService.createVersion(DMNL_CODE, { effectiveFrom: from, effectiveTo: to, note: `Định mức nhiên liệu năm ${year}`, copyCells: false });
        // Sửa: phiên bản gốc của năm (trùng ngày bắt đầu) → cập nhật tại chỗ; chỉ xoá phần đã nạp mà người dùng bỏ đi
        const origin = isEdit && existing ? originRef.current.get(existing.versionId) : undefined;
        if (origin && existing) usedOrigin.add(existing.versionId);
        if (origin && grid.effectiveTo !== to) {
          grid = await matrixService.updateVersion(DMNL_CODE, grid.versionId, {
            effectiveFrom: from,
            effectiveTo: to,
            versionLabel: grid.versionLabel ?? undefined,
            note: grid.note ?? undefined,
          });
        }

        const rowKeyBySlope = new Map<number, string>();
        grid.rows.forEach((r) => rowKeyBySlope.set(Number(r.numericValue ?? r.key), r.key));
        const rowKeyOf = (slope: string) => rowKeyBySlope.get(Number(slope)) ?? String(Number(slope));
        // khoá cột: dùng lại khoá đang có (có thể viết "0,05") để không sinh cột trùng
        const colMap = colKeyMapOf(grid);
        const colKeyIn = (g: ColumnGroup, d: string) => colMap.get(`${groupKeyOf(g)}|${Number(d)}`) ?? colKeyOf(g, d);

        const wantedRowKeys = new Set(group.map((r) => rowKeyOf(r.slope)));
        const wantedColKeys = new Set(groups.flatMap((g) => distances.map((d) => colKeyIn(g, d))));
        if (origin) {
          for (const k of origin.rowKeys) {
            if (!wantedRowKeys.has(k) && grid.rows.some((r) => r.key === k)) grid = await matrixService.removeRow(DMNL_CODE, grid.versionId, k);
          }
          for (const k of origin.colKeys) {
            if (!wantedColKeys.has(k) && grid.cols.some((c) => c.key === k)) grid = await matrixService.removeCol(DMNL_CODE, grid.versionId, k);
          }
        }

        const haveRows = new Set(grid.rows.map((r) => r.key));
        const newRowKeys = [...wantedRowKeys].filter((k) => !haveRows.has(k));
        if (newRowKeys.length) grid = await matrixService.addRows(DMNL_CODE, grid.versionId, newRowKeys.map((k) => ({ key: k, label: k })));
        const haveCols = new Set(grid.cols.map((c) => c.key));
        const newColKeys = [...wantedColKeys].filter((k) => !haveCols.has(k));
        if (newColKeys.length) grid = await matrixService.addCols(DMNL_CODE, grid.versionId, newColKeys.map((k) => ({ key: k, label: k })));

        const cells: MatrixCellUpsert[] = [];
        for (const r of group) {
          for (const g of groups) {
            for (const d of distances) {
              const raw = values[r.id]?.[cellKey(g.id, d)]?.trim();
              const num = raw ? Number(raw.replace(",", ".")) : NaN;
              const rowKey = rowKeyOf(r.slope);
              const colKey = colKeyIn(g, d);
              if (raw && !Number.isNaN(num)) cells.push({ rowKey, colKey, value: num });
              else if (origin && grid.cells?.[rowKey]?.[colKey] != null) cells.push({ rowKey, colKey, value: null });
            }
          }
        }
        if (cells.length) await matrixService.saveCells(DMNL_CODE, grid.versionId, cells);
        saved += cells.length;
      }
      // Sửa: phiên bản gốc không còn khoảng thời gian nào khớp (người dùng đã đổi/xoá khoảng đó) → xoá
      if (isEdit) {
        for (const id of originRef.current.keys()) {
          if (!usedOrigin.has(id)) await matrixService.deleteVersion(DMNL_CODE, id);
        }
      }
      toast.success(`Đã lưu ${saved} ô định mức nhiên liệu (${byPeriod.size} khoảng thời gian).`);
      onSaved();
      onClose();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message ?? "Lưu thất bại. Kiểm tra lại dữ liệu.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = isEdit ? "Sửa định mức nhiên liệu" : mode === "copyYear" ? "Sao chép định mức nhiên liệu" : "Thêm mới định mức nhiên liệu";
  const subtitle = isEdit
    ? "Sửa thời gian và giá trị định mức đã có (không thêm/bớt cung độ, độ dốc, nhóm cột)."
    : mode === "copyYear"
      ? "Chọn năm đích, chỉnh lại nếu cần rồi lưu — bảng sẽ được tạo mới cho năm đó."
      : "Chọn năm, cung độ và độ dốc; mỗi nhóm cột chọn chủng loại xe + phân loại — rồi nhập định mức.";
  const nDist = Math.max(1, distances.length);
  // mỗi nhóm cột phải đủ rộng chứa 2 ô chọn (Chủng loại xe, Phân loại) + nút "+"/"x": ít cung độ thì nới từng cột ra
  const GROUP_MIN_W = 260;
  const COL_W = Math.max(128, Math.ceil(GROUP_MIN_W / nDist));
  const tableWidth = 76 + 72 + 130 + 130 + COL_W * nDist * groups.length + 130;
  const bodyCols = 4 + nDist * groups.length + 1;
  const firstOfSlope = (r: Row) => rows.find((x) => x.slope === r.slope)?.id === r.id;
  // Cung độ nằm cạnh Độ dốc theo THỨ TỰ (như Excel); danh sách Cung độ dài hơn Độ dốc thì các dòng thừa chỉ hiện cung độ
  const extraDistances = distancesRaw.slice(slopesRaw.length);
  const vehicleOptions = (current: string) =>
    current && !vehicles.some((c) => c.code === current) ? [{ id: -1, code: current, name: "" }, ...vehicles] : vehicles;
  const suffixOptions = (current: string) =>
    current && !classifications.some((c) => c.code === current) ? [{ id: -1, code: current, name: "" }, ...classifications] : classifications;

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
            <div className="form-group" style={{ width: 120 }}>
              <label>Năm *</label>
              <select className="field" value={String(year)} disabled={isEdit} onChange={(e) => changeYear(Number(e.target.value))}>
                {(YEAR_OPTIONS.includes(year) ? YEAR_OPTIONS : [year, ...YEAR_OPTIONS]).map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: 280, flex: "1 1 280px" }}>
              <label>Cung độ (km) *</label>
              <NumberChipsInput values={distances} onChange={setDistances} placeholder="Gõ cung độ rồi Enter (vd 0,05) ..." onError={setError} readOnly={isEdit} />
            </div>

            <div className="form-group" style={{ minWidth: 280, flex: "1 1 280px" }}>
              <label>Độ dốc *</label>
              <NumberChipsInput values={slopes} onChange={setSlopes} placeholder="Gõ độ dốc rồi Enter (vd 10) ..." onError={setError} readOnly={isEdit} />
            </div>
          </div>

          {mode === "create" && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <button className="btn" type="button" onClick={() => setQuickOpen(true)} title="Chụp ảnh bảng / chọn file Excel — tự tách độ dốc, nhóm cột, cung độ và giá trị">
                <DIcon name="upload" /> Nhập liệu thông minh (Ảnh/Excel)
              </button>
            </div>
          )}

          <div
              className="modal-table-scroll entry-clean-wrap"
              // bảng tự cuộn trong khung (tiêu đề dính sát mép trên khung, không hở); chừa chỗ cho phần chọn ở trên + chân cửa sổ
              style={{ width: "fit-content", maxWidth: "100%", overflow: "auto", maxHeight: isFullscreen ? "calc(100vh - 300px)" : "calc(100vh - 340px)" }}
            >
            <table className="entry-table entry-clean vo-table vo-table-3" style={{ tableLayout: "fixed", width: tableWidth, minWidth: 0 }}>
              <colgroup>
                <col style={{ width: 76 }} />
                <col style={{ width: 72 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 130 }} />
                {groups.flatMap((g) =>
                  Array.from({ length: nDist }).map((_, i) => <col key={`${g.id}-${i}`} style={{ width: COL_W }} />),
                )}
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={3} style={{ textAlign: "center" }}>
                    STT
                  </th>
                  <th rowSpan={3} style={{ textAlign: "center" }}>
                    Thao tác
                  </th>
                  <th rowSpan={3}>Cung độ</th>
                  <th rowSpan={3}>Độ dốc</th>
                  <th colSpan={nDist * groups.length} className="fa-group" style={{ textAlign: "center" }}>
                    <div style={{ position: "sticky", left: 8, width: "fit-content", textAlign: "left" }}>Chủng loại xe. Phân loại_Cung độ</div>
                  </th>
                  <th rowSpan={3} className="fa-group">
                    {!isEdit && (
                      <button className="btn vo-addgroup" onClick={addGroup} title="Thêm nhóm cột">
                        <DIcon name="plus" /> Thêm nhóm
                      </button>
                    )}
                  </th>
                </tr>
                <tr>
                  {groups.map((g) => (
                    <th key={g.id} colSpan={nDist} className="fa-sub">
                      <div className="vo-grouphead vo-stack" style={{ position: "sticky", left: 8, width: Math.min(210, COL_W * nDist - 24) }}>
                        <select
                          className="field"
                          style={{ width: "100%", paddingLeft: 8, paddingRight: 22, textOverflow: "ellipsis" }}
                          title={vehicles.find((c) => c.code === g.vehicleCode)?.name ?? ""}
                          value={g.vehicleCode}
                          onChange={(e) => setGroupField(g.id, "vehicleCode", e.target.value)}
                        >
                          <option value="">Chủng loại xe</option>
                          {vehicleOptions(g.vehicleCode).map((c) => (
                            <option key={c.id} value={c.code} title={c.name}>
                              {c.code}
                            </option>
                          ))}
                        </select>
                        <select
                          className="field"
                          style={{ flex: "1 1 0", minWidth: 0, paddingLeft: 8, paddingRight: 22 }}
                          title={classifications.length === 0 ? "Chưa có Phân loại — thêm ở danh mục Phân loại" : (classifications.find((c) => c.code === g.suffix)?.name ?? "")}
                          value={g.suffix}
                          onChange={(e) => setGroupField(g.id, "suffix", e.target.value)}
                        >
                          <option value="">{classifications.length === 0 ? "Chưa có phân loại" : "Phân loại"}</option>
                          {suffixOptions(g.suffix).map((c) => (
                            <option key={c.id} value={c.code} title={c.name}>
                              {c.code}
                            </option>
                          ))}
                        </select>
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
                <tr>
                  {groups.flatMap((g) =>
                    distances.length === 0
                      ? [
                          <th key={`${g.id}-hint`} className="fa-sub" style={{ color: "#8aa0bd", fontWeight: 500 }}>
                            Chọn cung độ ...
                          </th>,
                        ]
                      : distances.map((d) => {
                          const ready = g.vehicleCode && g.suffix;
                          return (
                            <th key={`${g.id}-${d}`} className="fa-sub" style={{ textAlign: "center" }} title={ready ? colKeyOf(g, d) : `_${d}`}>
                              <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, color: ready ? undefined : "#8aa0bd" }}>
                                {ready ? colKeyOf(g, d) : `…_${d}`}
                              </span>
                            </th>
                          );
                        }),
                  )}
                </tr>
              </thead>
              <tbody>
                {slopesRaw.length === 0 && distancesRaw.length === 0 && (
                  <>
                    <tr className="entry-ghost">
                      <td colSpan={bodyCols} className="entry-ghost-hint">
                        Chọn cung độ, độ dốc ...
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
                {rows.map((r) => {
                  const si = slopesRaw.indexOf(r.slope);
                  const first = firstOfSlope(r);
                  return (
                    <tr key={r.id} {...dnd.rowProps(si)}>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "#5b6f8f" }}>
                        <div className="entry-stt" style={{ justifyContent: "center" }}>
                          {first ? (
                            <span className="dnd-handle" {...dnd.handleProps(si)} title="Kéo để đổi vị trí" aria-label="Kéo để đổi vị trí">
                              <DIcon name="grip" />
                            </span>
                          ) : (
                            <span className="dnd-handle ghost" />
                          )}
                          <span className="entry-stt-no">{first ? si + 1 : ""}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {/* cặp +/x DÙNG CHUNG cho cả Cung độ lẫn Độ dốc của dòng — đặt ở cột riêng để không bị hiểu là của riêng cột nào */}
                        {isEdit || r.slope === "" || distancesRaw[si] === "" ? null : actionButtons(() => addRowBelow(si), () => removeRowAt(si), "dòng")}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {distancesRaw[si] === "" ? (
                            blankInput("distance", blankDistance, setBlankDistance)
                          ) : (
                            <span className="entry-text" style={{ fontWeight: 700, color: "#1a4f9d", flex: "1 1 0", minWidth: 0 }}>
                              {distancesRaw[si] ?? ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {r.slope === "" ? (
                            blankInput("slope", blankSlope, setBlankSlope)
                          ) : (
                            <span className="entry-text" style={{ fontWeight: 700, color: "#1a4f9d", flex: "1 1 0", minWidth: 0 }}>
                              {r.slope}
                            </span>
                          )}
                        </div>
                      </td>
                      {distances.length === 0 ? (
                        <td colSpan={groups.length}>
                          <span className="entry-skel" />
                        </td>
                      ) : (
                        groups.flatMap((g) =>
                          distances.map((d) => (
                            <td key={`${g.id}-${d}`}>
                              <input
                                className="field"
                                style={{ width: 96, margin: "0 auto", display: "block", textAlign: "center" }}
                                type="number"
                                step="any"
                                value={values[r.id]?.[cellKey(g.id, d)] ?? ""}
                                onChange={(e) => setCell(r.id, cellKey(g.id, d), e.target.value)}
                              />
                            </td>
                          )),
                        )
                      )}
                      <td />
                    </tr>
                  );
                })}
                {extraDistances.map((d, i) => (
                  <tr key={`extra-${d || "blank"}`}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#5b6f8f" }}>
                      <span className="entry-stt-no">{slopesRaw.length + i + 1}</span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {isEdit || d === ""
                        ? null
                        : actionButtons(
                            () => insertBlank(setDistances, () => setBlankDistance(""), slopesRaw.length + i),
                            () => removeAt(setDistances, slopesRaw.length + i),
                            "dòng",
                          )}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {d === "" ? (
                          blankInput("distance", blankDistance, setBlankDistance)
                        ) : (
                          <span className="entry-text" style={{ fontWeight: 700, color: "#1a4f9d", flex: "1 1 0", minWidth: 0 }}>
                            {d}
                          </span>
                        )}
                      </div>
                    </td>
                    <td colSpan={bodyCols - 3} style={{ color: "#8aa0bd", fontSize: 12 }}>
                      Cung độ này chưa có độ dốc đi kèm (thêm độ dốc ở ô phía trên nếu cần nhập định mức).
                    </td>
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
        title="định mức nhiên liệu"
        rowAxis={{ label: "Độ dốc", options: [], free: normNumber }}
        colAxis={{ label: "Chủng loại xe. Phân loại_Cung độ", options: [], free: quickColKey }}
        onApply={applyQuick}
        onClose={() => setQuickOpen(false)}
      />
    )}
    </>
  );
}
