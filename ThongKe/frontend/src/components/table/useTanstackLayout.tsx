import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Column, ColumnSizingState, FilterFn, Header, Updater } from "@tanstack/react-table";
import { setGlobalTableLayout, useGlobalTableLayout } from "@/lib/tableGlobalLayout";
import { GlobalLayoutControls } from "./GlobalLayoutControls";
import { MoreVertical, SlidersHorizontal } from "lucide-react";

/** Nhãn hiển thị của trạng thái duyệt (huy hiệu là component nên không đọc được chữ từ ô). */
const STATUS_LABEL: Record<string, string> = { APPROVED: "Đã duyệt", PENDING: "Chờ duyệt", REVISION_REQUESTED: "Cần sửa" };

/** Lấy chữ hiển thị từ kết quả render của ô (chuỗi, số, mảng, phần tử React lồng nhau). */
const textOf = (n: unknown): string => {
  if (n == null || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textOf).join("");
  const props = (n as { props?: { children?: unknown } }).props;
  return props ? textOf(props.children) : "";
};

/**
 * Bộ lọc theo cột cho bảng TanStack: so khớp "chứa", không phân biệt hoa thường, theo CHỮ ĐANG HIỂN THỊ trong ô
 * (kể cả giá trị mặc định ô tự điền như "Ca 1", "Than"...) và theo giá trị gốc của dữ liệu.
 * Mặc định `includesString` chỉ xét giá trị gốc nên lọc lệch với những gì người dùng thấy.
 */
/** Chữ ĐẠI DIỆN của một ô để liệt kê/so khớp trong hộp lọc kiểu Excel: chữ đang hiển thị, nếu ô không render chữ thì nhãn trạng thái / giá trị gốc. */
export const cellDisplayText = (row: { getValue: (id: string) => unknown; getAllCells: () => any[] }, columnId: string): string => {
  const raw = row.getValue(columnId);
  const rawText = raw == null || typeof raw === "object" ? "" : String(raw);
  const cell = row.getAllCells().find((c) => c.column.id === columnId);
  const render = cell?.column.columnDef.cell;
  if (cell && typeof render === "function") {
    try {
      const t = textOf((render as (ctx: unknown) => unknown)(cell.getContext())).trim();
      if (t) return t;
    } catch {
      /* ô cần hook/ngữ cảnh riêng: dùng giá trị gốc */
    }
  }
  if (columnId === "status" && typeof raw === "string" && STATUS_LABEL[raw]) return STATUS_LABEL[raw];
  return rawText;
};

export const displayTextFilter: FilterFn<any> = (row, columnId, filterValue) => {
  // Lọc kiểu Excel: filterValue là DANH SÁCH chữ hiển thị được tích
  if (Array.isArray(filterValue)) return filterValue.includes(cellDisplayText(row, columnId));
  const q = String(filterValue ?? "").trim().toLowerCase();
  if (!q) return true;
  const raw = row.getValue(columnId);
  const parts: string[] = [raw == null ? "" : String(raw)];
  if (columnId === "status" && typeof raw === "string") parts.push(STATUS_LABEL[raw] ?? "");
  const cell = row.getAllCells().find((c) => c.column.id === columnId);
  const render = cell?.column.columnDef.cell;
  if (cell && typeof render === "function") {
    try {
      parts.push(textOf((render as (ctx: unknown) => unknown)(cell.getContext())));
    } catch {
      /* ô cần hook/ngữ cảnh riêng: bỏ qua, vẫn còn giá trị gốc */
    }
  }
  return parts.some((p) => p.toLowerCase().includes(q));
};
displayTextFilter.autoRemove = (v) => !v || (Array.isArray(v) && v.length === 0);

/**
 * Hiển thị bảng do NGƯỜI DÙNG chọn cho các bảng TanStack/shadcn (Nhập liệu Khai thác, Vận tải...), cùng bộ chức năng với bảng
 * danh mục (design/tableLayout.tsx):
 *  - Lúc đầu: "Vừa nội dung" — mỗi cột rộng đúng bằng nội dung dài nhất => hiện đủ ký tự.
 *  - Kéo mép phải tiêu đề cột để đổi độ rộng (nhấp đúp = vừa nội dung cột đó).
 *  - Nút "Hiển thị bảng": chọn nhanh hàng loạt kiểu cột (Vừa nội dung / Gọn / Rộng / Chia đều) và chiều cao hàng (Gọn / Vừa / Rộng).
 * Đo bằng DOM (ô có `data-col`), nên dùng được cho mọi kiểu ô (chữ, huy hiệu, ô nhập...). Lưu theo từng bảng ở localStorage.
 */
type ColPreset = "fit" | "compact" | "wide" | "equal";
type RowPreset = "compact" | "normal" | "tall";

const KEY = "tk-tanstack-layout:";
const MIN_W = 60;
const MAX_W = 720;
const clamp = (n: number) => Math.max(MIN_W, Math.min(MAX_W, Math.round(n)));

interface Stored {
  colPreset: ColPreset;
  rowPreset: RowPreset;
  sizing: ColumnSizingState;
  /** `rev` cài đặt chung lần cuối bảng này đã áp */
  rev?: number;
}

function load(key: string): Stored | null {
  try {
    const raw = window.localStorage.getItem(KEY + key);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

let ctx: CanvasRenderingContext2D | null | undefined;
const measure = (text: string, bold: boolean): number => {
  if (ctx === undefined) ctx = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
  if (!ctx) return text.length * 7.5;
  ctx.font = `${bold ? "700 " : ""}13px Arial, Helvetica, sans-serif`;
  return ctx.measureText(text).width;
};

export function useTanstackLayout(storageKey: string) {
  const saved = useMemo(() => load(storageKey), [storageKey]);
  const g = useGlobalTableLayout();
  const scaleRef = useRef(g.scale);
  scaleRef.current = g.scale;
  const [rawSizing, setRawSizing] = useState<ColumnSizingState>(saved?.sizing ?? {});
  const [ownColPreset, setColPresetState] = useState<ColPreset>(saved?.colPreset ?? "fit");
  const [ownRowPreset, setRowPreset] = useState<RowPreset>(saved?.rowPreset ?? "normal");
  const [appliedRev, setAppliedRev] = useState<number>(saved?.rev ?? 0);
  // "Áp dụng cho tất cả bảng" bật thì kiểu cột / chiều cao hàng theo cài đặt chung
  const colPreset: ColPreset = g.applyAll ? g.colPreset : ownColPreset;
  const rowPreset: RowPreset = g.applyAll ? g.rowPreset : ownRowPreset;
  // bề rộng hiển thị = bề rộng lưu × cỡ cột chung của TẤT CẢ bảng; mọi chỉnh sửa (kéo cột...) được quy ngược về bề rộng lưu
  const scaleMap = (m: ColumnSizingState, pct: number): ColumnSizingState => {
    if (pct === 100) return m;
    const out: ColumnSizingState = {};
    for (const k of Object.keys(m)) out[k] = Math.round((m[k] * pct) / 100);
    return out;
  };
  const columnSizing = useMemo(() => scaleMap(rawSizing, g.scale), [rawSizing, g.scale]);
  const setColumnSizing = useCallback((u: Updater<ColumnSizingState>) => {
    setRawSizing((prev) => {
      const shown = scaleMap(prev, scaleRef.current);
      const next = typeof u === "function" ? u(shown) : u;
      return scaleMap(next, 10000 / scaleRef.current);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pop, setPop] = useState<{ top: number; left: number } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY + storageKey, JSON.stringify({ colPreset: ownColPreset, rowPreset: ownRowPreset, sizing: rawSizing, rev: appliedRev }));
    } catch {
      // bỏ qua nếu trình duyệt chặn lưu
    }
  }, [storageKey, ownColPreset, ownRowPreset, rawSizing, appliedRev]);

  /** Đo từng cột trong DOM: bề rộng nội dung dài nhất (ô) và bề rộng tối thiểu của tiêu đề. */
  const measureColumns = useCallback((): Record<string, { content: number; header: number }> => {
    const root = containerRef.current;
    const out: Record<string, { content: number; header: number }> = {};
    if (!root) return out;
    root.querySelectorAll<HTMLElement>("[data-col]").forEach((el) => {
      const id = el.dataset.col!;
      const rec = (out[id] ??= { content: 0, header: 0 });
      if (el.tagName === "TH") {
        if ((el as HTMLTableCellElement).colSpan > 1) return;
        rec.header = Math.max(rec.header, measure((el.textContent ?? "").trim(), true) + 34);
      } else {
        rec.content = Math.max(rec.content, el.scrollWidth + 2);
      }
    });
    return out;
  }, []);

  const apply = useCallback(
    (preset: ColPreset) => {
      const m = measureColumns();
      const ids = Object.keys(m);
      if (ids.length === 0) return;
      const uniform = clamp(Math.max(150, ...ids.map((id) => m[id].header)));
      const next: ColumnSizingState = {};
      for (const id of ids) {
        const { content, header } = m[id];
        const fit = Math.max(header, content);
        if (preset === "compact") next[id] = clamp(Math.max(header, Math.min(fit, 150)));
        else if (preset === "wide") next[id] = clamp(fit * 1.3 + 20);
        else if (preset === "equal") next[id] = uniform;
        else next[id] = clamp(fit);
      }
      setRawSizing(next);
    },
    [measureColumns],
  );

  const setColPreset = useCallback(
    (p: ColPreset) => {
      setColPresetState(p);
      if (g.applyAll) {
        setGlobalTableLayout({ colPreset: p });
        setAppliedRev(0);
      }
      apply(p);
    },
    [apply, g.applyAll],
  );

  // Cài đặt chung "áp cho tất cả bảng" vừa đổi (hoặc bảng này mới mở sau khi đổi): áp kiểu cột chung cho bảng này một lần
  useEffect(() => {
    if (!g.applyAll || appliedRev === g.rev) return;
    let tries = 0;
    const tick = () => {
      tries += 1;
      if (containerRef.current?.querySelector("td[data-col]")) {
        apply(g.colPreset);
        setAppliedRev(g.rev);
        return true;
      }
      return tries > 25;
    };
    if (tick()) return;
    const timer = window.setInterval(() => tick() && window.clearInterval(timer), 300);
    return () => window.clearInterval(timer);
  }, [g.applyAll, g.rev, g.colPreset, appliedRev, apply]);

  // Lần đầu (chưa có lựa chọn đã lưu): vừa nội dung ngay khi bảng có dữ liệu
  useEffect(() => {
    if (saved) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (containerRef.current?.querySelector("td[data-col]")) {
        apply("fit");
        window.clearInterval(timer);
      } else if (tries > 25) {
        window.clearInterval(timer);
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [saved, apply]);

  useEffect(() => {
    if (!pop) return;
    const close = (e: Event) => {
      if (popRef.current?.contains(e.target as Node) || (e.target as HTMLElement | null)?.closest?.(".tks-layout-btn")) return;
      setPop(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPop(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [pop]);

  const fitOne = (id: string) => {
    const m = measureColumns()[id];
    if (m) setRawSizing((s) => ({ ...s, [id]: clamp(Math.max(m.header, m.content)) }));
  };

  /** Kéo đổi độ rộng cho bảng KHÔNG dùng TanStack (bảng HTML thường): truyền id cột + bề rộng hiện tại. */
  const startResize = (id: string, e: React.MouseEvent, startW: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: MouseEvent) => setColumnSizing((s) => ({ ...s, [id]: clamp(startW + ev.clientX - startX) }));
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  /** Tay nắm kéo mép phải ô tiêu đề (chỉ cột lá). */
  const resizer = (header: Header<any, unknown>) =>
    header.colSpan === 1 && header.column.getCanResize() ? (
      <div
        className={`tks-resizer ${header.column.getIsResizing() ? "is-resizing" : ""}`}
        role="separator"
        title="Kéo để đổi độ rộng cột — nhấp đúp để vừa nội dung"
        onMouseDown={header.getResizeHandler()}
        onTouchStart={header.getResizeHandler()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          fitOne(header.column.id);
        }}
      />
    ) : null;

  const chip = (on: boolean) =>
    `tks-chip ${on ? "on" : ""}`;

  // ── Lọc theo cột: nút ba chấm dọc ở tiêu đề → hộp nhập nội dung cần lọc (lọc ở trình duyệt) ──
  const [filterPop, setFilterPop] = useState<{ column: Column<any, unknown>; label: string; top: number; left: number } | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filterPop) return;
    const close = (e: Event) => {
      if (filterRef.current?.contains(e.target as Node) || (e.target as HTMLElement | null)?.closest?.(".tks-filter-btn")) return;
      setFilterPop(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFilterPop(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterPop]);

  const filterButton = (header: Header<any, unknown>) => {
    if (header.colSpan !== 1 || !header.column.getCanFilter()) return null;
    const value = String(header.column.getFilterValue() ?? "");
    const metaTitle = (header.column.columnDef.meta as { headerTitle?: string } | undefined)?.headerTitle;
    const label = (typeof header.column.columnDef.header === "string" ? header.column.columnDef.header : (metaTitle ?? header.column.id)) as string;
    return (
      <button
        type="button"
        className={`tks-filter-btn ${value ? "active" : ""}`}
        title={value ? `Đang lọc "${value}" — bấm để sửa` : `Lọc theo ${label}`}
        aria-label={`Lọc theo ${label}`}
        onClick={(e) => {
          e.stopPropagation();
          if (filterPop?.column.id === header.column.id) {
            setFilterPop(null);
            return;
          }
          const r = e.currentTarget.getBoundingClientRect();
          setFilterPop({ column: header.column, label, top: r.bottom + 6, left: Math.max(8, Math.min(r.right - 240, window.innerWidth - 248)) });
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    );
  };

  const filterPopover = filterPop ? (
    <div ref={filterRef} className="tks-pop" style={{ top: filterPop.top, left: filterPop.left, width: 240 }} role="dialog" aria-label={`Lọc ${filterPop.label}`}>
      <div className="tks-pop-title" style={{ fontSize: 13 }}>Lọc: {filterPop.label}</div>
      <input
        autoFocus
        className="tks-filter-input"
        placeholder="Nhập nội dung cần lọc…"
        value={String(filterPop.column.getFilterValue() ?? "")}
        onChange={(e) => filterPop.column.setFilterValue(e.target.value || undefined)}
        onKeyDown={(e) => e.key === "Enter" && setFilterPop(null)}
      />
      <div className="tks-foot" style={{ marginTop: 10, paddingTop: 10 }}>
        <button type="button" className="tks-chip" onClick={() => filterPop.column.setFilterValue(undefined)}>
          Xóa lọc
        </button>
        <button type="button" className="tks-chip on" onClick={() => setFilterPop(null)}>
          Đóng
        </button>
      </div>
    </div>
  ) : null;

  const button = (
    <>
      <button
        type="button"
        className="tks-layout-btn inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-white hover:bg-gray-50"
        aria-label="Hiển thị bảng"
        title="Hiển thị bảng: độ rộng cột, chiều cao hàng"
        onClick={(e) => {
          if (pop) {
            setPop(null);
            return;
          }
          const r = e.currentTarget.getBoundingClientRect();
          setPop({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - 320, window.innerWidth - 328)) });
        }}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </button>
      {pop && (
        <div ref={popRef} className="tks-pop" style={{ top: pop.top, left: pop.left }} role="dialog" aria-label="Hiển thị bảng">
          <div className="tks-pop-title">Hiển thị bảng</div>
          <GlobalLayoutControls ownColPreset={colPreset} ownRowPreset={rowPreset} secClass="tks-sec" chipClass="tks-chip" hintClass="tks-hint" />
          <div className="tks-sec">Độ rộng cột (chọn nhanh hàng loạt)</div>
          <div className="tks-chips">
            {(
              [
                ["fit", "Vừa nội dung"],
                ["compact", "Gọn"],
                ["wide", "Rộng"],
                ["equal", "Chia đều"],
              ] as [ColPreset, string][]
            ).map(([id, label]) => (
              <button key={id} type="button" className={chip(colPreset === id)} onClick={() => setColPreset(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="tks-sec">Chiều cao hàng</div>
          <div className="tks-chips">
            {(
              [
                ["compact", "Gọn"],
                ["normal", "Vừa"],
                ["tall", "Rộng"],
              ] as [RowPreset, string][]
            ).map(([id, label]) => (
              <button key={id} type="button" className={chip(rowPreset === id)} onClick={() => setRowPreset(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="tks-hint">Kéo mép phải tiêu đề cột để chỉnh từng cột; nhấp đúp để cột vừa nội dung.</div>
          <div className="tks-foot">
            <button
              type="button"
              className="tks-chip"
              onClick={() => {
                setColPresetState("fit");
                setRowPreset("normal");
                apply("fit");
              }}
            >
              Khôi phục mặc định
            </button>
            <button type="button" className="tks-chip on" onClick={() => setPop(null)}>
              Xong
            </button>
          </div>
        </div>
      )}
    </>
  );

  return {
    columnSizing,
    setColumnSizing,
    containerRef,
    rowClass: `rows-${rowPreset}`,
    resizer,
    startResize,
    fitOne,
    button: (
      <>
        {button}
        {filterPopover}
      </>
    ),
    filterButton,
  };
}
