import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Giá trị rỗng hiển thị là "(Trống)" trong danh sách. */
export const BLANK_LABEL = "(Trống)";

const normText = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

export interface ExcelFilterPopupProps {
  /** Nút ⋮ vừa bấm — hộp bám theo nút này. */
  anchor: HTMLElement;
  title: string;
  /** Các giá trị khác nhau của cột (đã loại trùng). */
  values: string[];
  /** Giá trị đang được tích; null = chưa lọc (tích hết). */
  selected: string[] | null;
  /** Trả về danh sách giá trị được tích, hoặc null nếu tích hết/Xóa lọc. */
  onApply: (next: string[] | null) => void;
  onClose: () => void;
  /** Có quá nhiều giá trị nên chỉ hiện một phần. */
  truncated?: boolean;
}

/**
 * Hộp lọc cột KIỂU EXCEL dùng chung (cùng mẫu với cột của Lệnh sản xuất): ô tìm kiếm + danh sách giá trị có tick
 * + "(Chọn tất cả)" + Xóa lọc / Hủy / Áp dụng. Hộp gắn vào <body> nên dùng được ở mọi trang (CSS toàn cục: styles/excel-filter.css).
 */
export default function ExcelFilterPopup({ anchor, title, values, selected, onApply, onClose, truncated }: ExcelFilterPopupProps) {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState<Set<string>>(() => new Set(selected ?? values));
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const place = () => {
      if (!anchor.isConnected) return onClose();
      const r = anchor.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - 280, window.innerWidth - 288)) });
    };
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || anchor.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  const q = normText(search.trim());
  const shown = useMemo(() => values.filter((v) => !q || normText(v || BLANK_LABEL).includes(q)), [values, q]);
  const allShownChecked = shown.length > 0 && shown.every((v) => sel.has(v));
  const checkedCount = values.filter((v) => sel.has(v)).length;

  const toggle = (v: string) =>
    setSel((p) => {
      const n = new Set(p);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  const toggleAllShown = () =>
    setSel((p) => {
      const n = new Set(p);
      if (allShownChecked) shown.forEach((v) => n.delete(v));
      else shown.forEach((v) => n.add(v));
      return n;
    });
  const apply = () => {
    if (!values.length) return onClose();
    const picked = values.filter((v) => sel.has(v));
    onApply(picked.length === values.length ? null : picked);
  };

  return createPortal(
    <div ref={popRef} className="xlp" style={{ top: pos.top, left: pos.left }} role="dialog" aria-label={`Lọc ${title}`}>
      <div className="xlp-title">Lọc: {title}</div>
      <input
        autoFocus
        className="xlp-search"
        placeholder="Tìm kiếm…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
      />
      <div className="xlp-list">
        <label className="xlp-item xlp-all">
          <input type="checkbox" checked={allShownChecked} onChange={toggleAllShown} disabled={!shown.length} />
          <span>{q ? "(Chọn tất cả kết quả tìm kiếm)" : "(Chọn tất cả)"}</span>
        </label>
        {!shown.length && <div className="xlp-empty">Không có giá trị nào</div>}
        {shown.map((v) => (
          <label key={v || "__blank"} className="xlp-item" title={v || BLANK_LABEL}>
            <input type="checkbox" checked={sel.has(v)} onChange={() => toggle(v)} />
            <span>{v || BLANK_LABEL}</span>
          </label>
        ))}
      </div>
      {truncated && <div className="xlp-note">Chỉ hiện {values.length} giá trị đầu — gõ tìm kiếm để thu hẹp.</div>}
      <div className="xlp-count">
        {checkedCount}/{values.length} giá trị được chọn
      </div>
      <div className="xlp-actions">
        <button type="button" onClick={() => onApply(null)}>
          Xóa lọc
        </button>
        <button type="button" onClick={onClose}>
          Hủy
        </button>
        <button type="button" className="primary" onClick={apply} disabled={values.length > 0 && checkedCount === 0}>
          Áp dụng
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Giá trị khác nhau (đã sắp xếp theo tiếng Việt) của một danh sách chuỗi. */
export function distinctSorted(list: string[]): string[] {
  return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
}
