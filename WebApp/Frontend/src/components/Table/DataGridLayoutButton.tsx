import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@mui/material";
import type { GridApiCommunity } from "@mui/x-data-grid/internals";
import DIcon from "../design/DIcon";
import "../../styles/catalog-design.css";

/**
 * Nút "Hiển thị bảng" cho các bảng MUI DataGrid — CÙNG giao diện/chức năng với hộp "Hiển thị bảng" của bảng danh mục
 * (xem design/tableLayout.tsx):
 *  - kiểu cột chọn nhanh hàng loạt: Vừa nội dung / Gọn / Rộng / Chia đều;
 *  - chiều cao hàng: Gọn / Vừa / Rộng (chỉ đổi chiều cao HÀNG DỮ LIỆU — hàng tiêu đề giữ nguyên như bảng danh mục);
 *  - độ rộng từng cột bằng thanh trượt (hoặc kéo mép tiêu đề cột) + nút "vừa nội dung" từng cột;
 *  - Khôi phục mặc định (vừa nội dung + hàng vừa).
 * Hiệu năng: đổi bề rộng NHIỀU cột chỉ qua MỘT lần cập nhật; chỉ đo nội dung (autosize, chậm) khi bấm "Vừa nội dung";
 * thanh trượt chỉ áp bề rộng khi nhả chuột (lúc kéo chỉ đổi số hiển thị).
 * `lockedFields`: cột không cho đổi bề rộng (vd cột dính trái có vị trí tính theo bề rộng cố định).
 */
type ApiRef = React.MutableRefObject<GridApiCommunity>;
export type RowPreset = "compact" | "standard" | "comfortable";

/** Chiều cao hàng dữ liệu theo kiểu chọn — "Vừa" = 39px, đúng bằng bảng danh mục. */
export const ROW_HEIGHT: Record<RowPreset, number> = { compact: 30, standard: 39, comfortable: 56 };
/** Chiều cao hàng tiêu đề — cố định 43px như bảng danh mục. */
export const HEADER_HEIGHT = 43;

const MIN_W = 60;
const MAX_W = 720;
const clamp = (n: number) => Math.max(MIN_W, Math.min(MAX_W, Math.round(n)));
const AUTOSIZE = { includeHeaders: true, includeOutliers: true, expand: false } as const;

const COL_PRESETS = [
  { id: "fit", label: "Vừa nội dung", hint: "Hiện đầy đủ ký tự" },
  { id: "compact", label: "Gọn", hint: "Cột hẹp, tiết kiệm chỗ" },
  { id: "wide", label: "Rộng", hint: "Cột rộng rãi" },
  { id: "equal", label: "Chia đều", hint: "Các cột bằng nhau" },
] as const;
const ROW_PRESETS: { id: RowPreset; label: string; hint: string }[] = [
  { id: "compact", label: "Gọn", hint: "Hàng thấp" },
  { id: "standard", label: "Vừa", hint: "Mặc định" },
  { id: "comfortable", label: "Rộng", hint: "Hàng cao" },
];

export const DataGridLayoutButton: React.FC<{
  apiRef: ApiRef;
  lockedFields?: string[];
  /** báo cho trang biết người dùng đã tự chỉnh cột (để không tự vừa nội dung lại khi dữ liệu đổi) */
  onUserSized?: (userSized: boolean) => void;
  /** Trang giữ bề rộng cột trong state của mình (cột dựng lại mỗi lần render): truyền hàm này để áp bề rộng qua state thay vì gọi thẳng lưới */
  setWidths?: (patch: Record<string, number>) => void;
  rowPreset: RowPreset;
  onRowPreset: (p: RowPreset) => void;
  /** "design": nút kiểu thanh công cụ trang danh mục (class `btn`); mặc định: nút MUI */
  look?: "design" | "mui";
  /** chỉ hiện biểu tượng (không chữ) — dùng ở thanh công cụ trang cho gọn, như nút làm mới */
  iconOnly?: boolean;
}> = ({ apiRef, lockedFields = [], onUserSized, setWidths, rowPreset, onRowPreset, look = "mui", iconOnly = false }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [, bump] = useState(0);
  const [drag, setDrag] = useState<Record<string, number>>({});
  const [colPreset, setColPreset] = useState<string>("fit");
  const fitCache = useRef<Record<string, number> | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (popRef.current?.contains(e.target as Node) || (e.target as HTMLElement | null)?.closest?.(".dg-layout-btn")) return;
      setPos(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [pos]);

  const fields = () =>
    (apiRef.current?.getVisibleColumns?.() ?? [])
      .map((c) => c.field)
      .filter((f) => f !== "__check__" && f !== "__stt" && !lockedFields.includes(f));

  const widthOf = (f: string) => Math.round(apiRef.current?.getColumn?.(f)?.computedWidth ?? 120);

  /** Áp bề rộng nhiều cột bằng MỘT lần cập nhật (nhanh hơn nhiều so với setColumnWidth từng cột). */
  const applyWidths = (map: Record<string, number>) => {
    const api = apiRef.current;
    if (!api) return;
    const clamped = Object.fromEntries(Object.entries(map).map(([f, w]) => [f, clamp(w)]));
    if (setWidths) setWidths(clamped);
    else api.updateColumns(Object.entries(clamped).map(([field, width]) => ({ field, width, flex: undefined })));
    bump((n) => n + 1);
  };

  /** Đo nội dung (chậm): chỉ làm khi người dùng bấm "Vừa nội dung"; Gọn/Rộng dùng lại kết quả đo gần nhất. */
  const measureFit = async (force: boolean, only?: string[]): Promise<Record<string, number>> => {
    if (!only && fitCache.current && !force) return fitCache.current;
    const api = apiRef.current;
    const fs = only ?? fields();
    await api?.autosizeColumns?.({ ...AUTOSIZE, columns: fs });
    const out: Record<string, number> = {};
    fs.forEach((f) => (out[f] = widthOf(f)));
    if (!only) fitCache.current = out;
    setWidths?.(out); // đồng bộ bề rộng đo được vào state của trang
    return out;
  };

  const applyPreset = async (preset: string) => {
    const api = apiRef.current;
    if (!api) return;
    setColPreset(preset);
    const fs = fields();
    onUserSized?.(preset !== "fit");
    if (preset === "equal") {
      const total = api.getRootDimensions?.()?.viewportInnerSize?.width ?? 1200;
      const each = Math.max(clamp((total - 250) / Math.max(1, fs.length)), 120);
      applyWidths(Object.fromEntries(fs.map((f) => [f, each])));
      return;
    }
    const fit = await measureFit(preset === "fit");
    if (preset === "fit") {
      bump((n) => n + 1);
      return;
    }
    const next: Record<string, number> = {};
    fs.forEach((f) => {
      const w = fit[f] ?? widthOf(f);
      next[f] = preset === "compact" ? Math.max(Math.min(w, 150), 110) : w * 1.3 + 20;
    });
    applyWidths(next);
  };

  const commitWidth = (f: string, w: number) => {
    onUserSized?.(true);
    applyWidths({ [f]: w });
    setDrag((d) => {
      const { [f]: _omit, ...rest } = d;
      return rest;
    });
  };

  const open = (e: React.MouseEvent<HTMLElement>) => {
    if (pos) {
      setPos(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - 360, window.innerWidth - 368)) });
  };

  return (
    <>
      {look === "design" ? (
        <button
          type="button"
          className={`${iconOnly ? "btn btn-icon" : "btn"} dg-layout-btn`}
          aria-label="Hiển thị bảng"
          title="Hiển thị bảng: độ rộng cột, chiều cao hàng"
          onClick={open}
        >
          <DIcon name="sliders" />
          {!iconOnly && "Hiển thị bảng"}
        </button>
      ) : (
        <Button className="dg-layout-btn" size="small" variant="outlined" onClick={open} sx={{ textTransform: "none", fontWeight: 600 }}>
          Hiển thị bảng
        </Button>
      )}
      {pos &&
        createPortal(
          <div className="tkcpop">
            <div ref={popRef} className="layout-pop" style={{ top: pos.top, left: pos.left }} role="dialog" aria-label="Hiển thị bảng">
              <div className="layout-pop-title">Hiển thị bảng</div>

              <div className="layout-sec">Độ rộng cột (chọn nhanh hàng loạt)</div>
              <div className="layout-chips">
                {COL_PRESETS.map((p) => (
                  <button key={p.id} type="button" title={p.hint} className={`layout-chip ${colPreset === p.id ? "on" : ""}`} onClick={() => void applyPreset(p.id)}>
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="layout-sec">Chiều cao hàng</div>
              <div className="layout-chips">
                {ROW_PRESETS.map((p) => (
                  <button key={p.id} type="button" title={p.hint} className={`layout-chip ${rowPreset === p.id ? "on" : ""}`} onClick={() => onRowPreset(p.id)}>
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="layout-sec">Độ rộng từng cột (hoặc kéo mép tiêu đề cột)</div>
              <div className="layout-cols">
                {fields().map((f) => {
                  const col = apiRef.current?.getColumn?.(f);
                  const name = String(col?.headerName ?? f);
                  const shown = drag[f] ?? widthOf(f);
                  return (
                    <div className="layout-col" key={f}>
                      <span className="layout-col-name" title={name}>
                        {name}
                      </span>
                      <input
                        type="range"
                        min={MIN_W}
                        max={MAX_W}
                        step={5}
                        value={shown}
                        aria-label={`Độ rộng cột ${name}`}
                        onChange={(e) => setDrag((d) => ({ ...d, [f]: Number(e.target.value) }))}
                        onMouseUp={(e) => commitWidth(f, Number((e.target as HTMLInputElement).value))}
                        onTouchEnd={(e) => commitWidth(f, Number((e.target as HTMLInputElement).value))}
                        onKeyUp={(e) => commitWidth(f, Number((e.target as HTMLInputElement).value))}
                      />
                      <span className="layout-col-w">{shown}</span>
                      <button
                        type="button"
                        className="layout-col-fit"
                        title="Vừa nội dung"
                        aria-label={`Vừa nội dung: ${name}`}
                        onClick={async () => {
                          onUserSized?.(true);
                          const m = await measureFit(true, [f]);
                          applyWidths(m);
                        }}
                      >
                        <DIcon name="refresh" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="layout-foot">
                <button
                  type="button"
                  className="layout-chip"
                  onClick={() => {
                    onRowPreset("standard");
                    void applyPreset("fit");
                  }}
                >
                  Khôi phục mặc định
                </button>
                <button type="button" className="layout-chip on" onClick={() => setPos(null)}>
                  Xong
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default DataGridLayoutButton;
