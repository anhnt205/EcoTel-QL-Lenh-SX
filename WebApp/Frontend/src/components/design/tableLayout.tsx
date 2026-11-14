import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DIcon from "./DIcon";

/**
 * Kiểu hiển thị bảng do NGƯỜI DÙNG chọn (lưu theo từng bảng trên trình duyệt):
 *  - Mặc định "Vừa nội dung": mỗi cột rộng đúng bằng chữ dài nhất của cột => hiện ĐẦY ĐỦ ký tự (không cắt "…").
 *  - Kéo mép phải tiêu đề cột để chỉnh bề rộng từng cột (nhấp đúp = vừa nội dung); nút "Hiển thị bảng" có thanh trượt từng cột.
 *  - Chọn nhanh hàng loạt: kiểu cột (Vừa nội dung / Gọn / Rộng / Chia đều) và chiều cao hàng (Gọn / Vừa / Rộng — cho xuống dòng).
 */
export type ColPreset = "fit" | "compact" | "wide" | "equal";
export type RowPreset = "compact" | "normal" | "tall";

interface Stored {
  colPreset: ColPreset;
  rowPreset: RowPreset;
  /** bề rộng người dùng tự chỉnh (px) — ưu tiên hơn kiểu cột */
  widths: Record<string, number>;
  /** khóa các cột đang ẨN */
  hidden?: string[];
}

const DEFAULT_STATE: Stored = { colPreset: "fit", rowPreset: "normal", widths: {}, hidden: [] };
export const MIN_COL_W = 60;
export const MAX_COL_W = 720;
const KEY_PREFIX = "tk-table-layout:";

const measureCache = new Map<string, number>();
let ctx: CanvasRenderingContext2D | null | undefined;

/** Đo bề rộng chữ (px) ở phông của bảng (Arial 13px) — dùng canvas, có nhớ đệm. */
function measureText(text: string, bold: boolean): number {
  const k = (bold ? "b:" : "n:") + text;
  const hit = measureCache.get(k);
  if (hit !== undefined) return hit;
  if (ctx === undefined) ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  let w: number;
  if (ctx) {
    ctx.font = `${bold ? "700 " : ""}13px Arial, Helvetica, sans-serif`;
    w = ctx.measureText(text).width;
  } else {
    w = text.length * (bold ? 8 : 7.2);
  }
  if (measureCache.size > 60000) measureCache.clear();
  measureCache.set(k, w);
  return w;
}

const clamp = (n: number) => Math.max(MIN_COL_W, Math.min(MAX_COL_W, Math.round(n)));

function load(key: string): Stored {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + key);
    if (!raw) return DEFAULT_STATE;
    const p = JSON.parse(raw) as Partial<Stored>;
    return {
      colPreset: (["fit", "compact", "wide", "equal"] as const).includes(p.colPreset as ColPreset) ? (p.colPreset as ColPreset) : "fit",
      rowPreset: (["compact", "normal", "tall"] as const).includes(p.rowPreset as RowPreset) ? (p.rowPreset as RowPreset) : "normal",
      widths: p.widths && typeof p.widths === "object" ? p.widths : {},
      hidden: Array.isArray(p.hidden) ? p.hidden : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export interface LayoutColumn {
  key: string;
  label: string;
}

export interface TableLayout {
  colPreset: ColPreset;
  rowPreset: RowPreset;
  widthOf: (key: string) => number;
  /** tổng bề rộng các cột dữ liệu (chưa gồm ô chọn / STT / thao tác) */
  totalWidth: number;
  isCustom: (key: string) => boolean;
  setColPreset: (p: ColPreset) => void;
  setRowPreset: (p: RowPreset) => void;
  setWidth: (key: string, w: number) => void;
  autoFit: (key: string) => void;
  reset: () => void;
  startResize: (key: string, e: React.MouseEvent) => void;
  /** class thêm cho <table> theo chiều cao hàng */
  tableClass: string;
  /** cột người dùng đã ẨN (nút "Hiển thị cột") */
  hidden: Set<string>;
  toggleHidden: (key: string) => void;
  showAll: () => void;
}

/**
 * @param storageKey khóa lưu lựa chọn của người dùng (mỗi bảng một khóa)
 * @param columns    các cột dữ liệu (không gồm ô chọn / STT / Thao tác)
 * @param rows       toàn bộ dòng — để đo chữ dài nhất mỗi cột
 * @param textOf     chữ hiển thị của ô
 */
export function useTableLayout<T>(
  storageKey: string,
  columns: LayoutColumn[],
  rows: T[],
  textOf: (row: T, key: string) => string,
  /** bề rộng tối thiểu theo cột (px) — cho cột chứa ô nhập/ô chọn cần rộng hơn chữ hiện có */
  floor: (key: string) => number = () => 0,
): TableLayout {
  const [state, setState] = useState<Stored>(() => load(storageKey));
  useEffect(() => setState(load(storageKey)), [storageKey]);
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY_PREFIX + storageKey, JSON.stringify(state));
    } catch {
      // trình duyệt chặn lưu: bỏ qua, vẫn dùng được trong phiên
    }
  }, [state, storageKey]);

  // chữ dài nhất của từng cột (+ tiêu đề: nhãn đậm + biểu tượng sắp xếp/lọc/kéo)
  const { header, auto } = useMemo(() => {
    const header: Record<string, number> = {};
    const auto: Record<string, number> = {};
    columns.forEach((c, ci) => {
      const h = measureText(c.label, true) + 92;
      let w = 0;
      for (const r of rows) {
        const t = textOf(r, c.key);
        if (t) w = Math.max(w, measureText(t, ci === 0) + 26);
      }
      header[c.key] = clamp(Math.max(h, floor(c.key)));
      auto[c.key] = clamp(Math.max(h, w, floor(c.key)));
    });
    return { header, auto };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, rows]);

  const preset = useMemo(() => {
    const out: Record<string, number> = {};
    const uniform = clamp(Math.max(150, ...columns.map((c) => header[c.key] ?? 0)));
    for (const c of columns) {
      const a = auto[c.key] ?? 120;
      const h = header[c.key] ?? 100;
      if (state.colPreset === "compact") out[c.key] = clamp(Math.max(h, Math.min(a, 150)));
      else if (state.colPreset === "wide") out[c.key] = clamp(a * 1.3 + 20);
      else if (state.colPreset === "equal") out[c.key] = uniform;
      else out[c.key] = a;
    }
    return out;
  }, [columns, header, auto, state.colPreset]);

  const widthOf = useCallback((key: string) => state.widths[key] ?? preset[key] ?? 140, [state.widths, preset]);
  const totalWidth = useMemo(() => columns.reduce((s, c) => s + widthOf(c.key), 0), [columns, widthOf]);

  const widthsRef = useRef(widthOf);
  widthsRef.current = widthOf;

  const setWidth = useCallback((key: string, w: number) => setState((p) => ({ ...p, widths: { ...p.widths, [key]: clamp(w) } })), []);
  const autoFit = useCallback(
    (key: string) =>
      setState((p) => {
        const next = { ...p.widths };
        delete next[key];
        // vừa nội dung riêng cột này: đặt đúng bề rộng "vừa nội dung" kể cả khi đang ở kiểu khác
        next[key] = auto[key] ?? 140;
        return { ...p, widths: next };
      }),
    [auto],
  );

  const startResize = useCallback(
    (key: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startW = widthsRef.current(key);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      const move = (ev: MouseEvent) => setWidth(key, startW + ev.clientX - startX);
      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    },
    [setWidth],
  );

  return {
    colPreset: state.colPreset,
    rowPreset: state.rowPreset,
    widthOf,
    totalWidth,
    isCustom: (key) => state.widths[key] !== undefined,
    // chọn kiểu cột hàng loạt thì bỏ các bề rộng tự chỉnh từng cột
    setColPreset: (p) => setState((s) => ({ ...s, colPreset: p, widths: {} })),
    setRowPreset: (p) => setState((s) => ({ ...s, rowPreset: p })),
    setWidth,
    autoFit,
    // "Khôi phục mặc định" chỉ trả kiểu hiển thị (độ rộng/chiều cao), KHÔNG đụng tới cột đang ẩn/hiện
    reset: () => setState((s) => ({ ...DEFAULT_STATE, hidden: s.hidden })),
    startResize,
    tableClass: `rows-${state.rowPreset}`,
    hidden: new Set(state.hidden ?? []),
    toggleHidden: (key: string) =>
      setState((s) => {
        const cur = new Set(s.hidden ?? []);
        if (cur.has(key)) cur.delete(key);
        else cur.add(key);
        return { ...s, hidden: [...cur] };
      }),
    showAll: () => setState((s) => ({ ...s, hidden: [] })),
  };
}

/** Tay nắm kéo ở mép phải ô tiêu đề: kéo = đổi bề rộng cột; nhấp đúp = vừa nội dung. */
export function ColResizer({ colKey, layout }: { colKey: string; layout: TableLayout }) {
  return (
    <span
      className="col-resizer"
      role="separator"
      aria-orientation="vertical"
      title="Kéo để đổi độ rộng cột — nhấp đúp để vừa nội dung"
      onMouseDown={(e) => layout.startResize(colKey, e)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        layout.autoFit(colKey);
      }}
    />
  );
}

const COL_PRESETS: { id: ColPreset; label: string; hint: string }[] = [
  { id: "fit", label: "Vừa nội dung", hint: "Hiện đầy đủ ký tự" },
  { id: "compact", label: "Gọn", hint: "Cột hẹp, tiết kiệm chỗ" },
  { id: "wide", label: "Rộng", hint: "Cột rộng rãi" },
  { id: "equal", label: "Chia đều", hint: "Các cột bằng nhau" },
];
const ROW_PRESETS: { id: RowPreset; label: string; hint: string }[] = [
  { id: "compact", label: "Gọn", hint: "Hàng thấp" },
  { id: "normal", label: "Vừa", hint: "Mặc định" },
  { id: "tall", label: "Rộng", hint: "Hàng cao, chữ xuống dòng" },
];

/** Nút "Hiển thị bảng": chọn nhanh kiểu cột / chiều cao hàng hàng loạt + chỉnh bề rộng từng cột bằng thanh trượt. */
export function TableLayoutButton({ layout, columns }: { layout: TableLayout; columns: LayoutColumn[] }) {
  const [open, setOpen] = useState<{ top: number; left: number } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (popRef.current?.contains(e.target as Node) || (e.target as HTMLElement | null)?.closest?.(".layout-btn")) return;
      setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", () => setOpen(null));
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        className="btn btn-icon layout-btn"
        title="Hiển thị bảng: độ rộng cột, chiều cao hàng"
        aria-label="Hiển thị bảng"
        onClick={(e) => {
          if (open) {
            setOpen(null);
            return;
          }
          const r = e.currentTarget.getBoundingClientRect();
          setOpen({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - 360, window.innerWidth - 368)) });
        }}
      >
        <DIcon name="sliders" />
      </button>
      {open && (
        <div ref={popRef} className="layout-pop" style={{ top: open.top, left: open.left }} role="dialog" aria-label="Hiển thị bảng">
          <div className="layout-pop-title">Hiển thị bảng</div>

          <div className="layout-sec">Độ rộng cột (chọn nhanh hàng loạt)</div>
          <div className="layout-chips">
            {COL_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.hint}
                className={`layout-chip ${layout.colPreset === p.id ? "on" : ""}`}
                onClick={() => layout.setColPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="layout-sec">Chiều cao hàng</div>
          <div className="layout-chips">
            {ROW_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.hint}
                className={`layout-chip ${layout.rowPreset === p.id ? "on" : ""}`}
                onClick={() => layout.setRowPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="layout-sec">Độ rộng từng cột (hoặc kéo mép tiêu đề cột)</div>
          <div className="layout-cols">
            {columns.map((c) => (
              <div className="layout-col" key={c.key}>
                <span className="layout-col-name" title={c.label}>
                  {c.label}
                </span>
                <input
                  type="range"
                  min={MIN_COL_W}
                  max={MAX_COL_W}
                  step={5}
                  value={layout.widthOf(c.key)}
                  aria-label={`Độ rộng cột ${c.label}`}
                  onChange={(e) => layout.setWidth(c.key, Number(e.target.value))}
                />
                <span className="layout-col-w">{layout.widthOf(c.key)}</span>
                <button type="button" className="layout-col-fit" title="Vừa nội dung" aria-label={`Vừa nội dung: ${c.label}`} onClick={() => layout.autoFit(c.key)}>
                  <DIcon name="refresh" />
                </button>
              </div>
            ))}
          </div>

          <div className="layout-foot">
            <button type="button" className="layout-chip" onClick={() => layout.reset()}>
              Khôi phục mặc định
            </button>
            <button type="button" className="layout-chip on" onClick={() => setOpen(null)}>
              Xong
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Nút "Hiển thị cột": tick bật/tắt từng cột của bảng (ẩn/hiện tùy chỉnh, nhớ theo từng bảng). */
export function ColumnToggleButton({
  layout,
  columns,
}: {
  layout: Pick<TableLayout, "hidden" | "toggleHidden" | "showAll">;
  columns: LayoutColumn[];
}) {
  const [open, setOpen] = useState<{ top: number; left: number } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (popRef.current?.contains(e.target as Node) || (e.target as HTMLElement | null)?.closest?.(".colvis-btn")) return;
      setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const shown = columns.filter((c) => !layout.hidden.has(c.key)).length;
  return (
    <>
      <button
        className="btn btn-icon colvis-btn"
        title={`Hiển thị cột (${shown}/${columns.length})`}
        aria-label="Hiển thị cột"
        onClick={(e) => {
          if (open) {
            setOpen(null);
            return;
          }
          const r = e.currentTarget.getBoundingClientRect();
          setOpen({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - 300, window.innerWidth - 308)) });
        }}
      >
        <DIcon name="columns" />
      </button>
      {open && (
        <div ref={popRef} className="layout-pop" style={{ top: open.top, left: open.left, width: 300 }} role="dialog" aria-label="Hiển thị cột">
          <div className="layout-pop-title">
            Hiển thị cột <span style={{ fontWeight: 400, color: "#70819d", fontSize: 12 }}>({shown}/{columns.length})</span>
          </div>
          <div className="layout-cols" style={{ gap: 4 }}>
            {columns.map((c) => (
              <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 9, padding: "3px 2px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={!layout.hidden.has(c.key)}
                  // luôn giữ lại ít nhất 1 cột
                  disabled={!layout.hidden.has(c.key) && shown <= 1}
                  onChange={() => layout.toggleHidden(c.key)}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
          <div className="layout-foot">
            <button type="button" className="layout-chip" onClick={() => layout.showAll()}>
              Hiện tất cả
            </button>
            <button type="button" className="layout-chip on" onClick={() => setOpen(null)}>
              Xong
            </button>
          </div>
        </div>
      )}
    </>
  );
}
