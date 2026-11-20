import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DIcon from "./DIcon";
import { ColResizer, TableLayoutButton, useTableLayout, type TableLayout } from "./tableLayout";
import { distinctSorted } from "@/components/table/ExcelFilterPopup";
import "@/styles/catalog-design.css";

export interface ViewColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  /** chữ đậm màu xanh (cột mã) */
  strong?: boolean;
}

const BLANK = "(Trống)";
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();

/** Hộp xổ xuống (dropdown) bám ngay dưới nút/ô tiêu đề: không tiêu đề, không nút Áp dụng — tick là có hiệu lực ngay; bấm ra ngoài / Esc để đóng. */
function Dropdown({
  anchor,
  width,
  align = "left",
  onClose,
  children,
}: {
  anchor: HTMLElement;
  width: number;
  align?: "left" | "right";
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; w: number; maxH: number }>({ top: 0, left: 0, w: width, maxH: 360 });

  useLayoutEffect(() => {
    const place = () => {
      if (!anchor.isConnected) return onClose();
      const r = anchor.getBoundingClientRect();
      const w = Math.max(width, Math.min(r.width, 360));
      const left = Math.max(8, Math.min(align === "right" ? r.right - w : r.left, window.innerWidth - w - 8));
      const top = r.bottom + 2;
      setPos({ top, left, w, maxH: Math.max(160, window.innerHeight - top - 12) });
    };
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return;
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

  return createPortal(
    <div ref={ref} className="vdd" style={{ top: pos.top, left: pos.left, width: pos.w, maxHeight: pos.maxH }} role="listbox">
      {children}
    </div>,
    document.body,
  );
}

/** Dropdown lọc theo cột: ô tìm + danh sách giá trị có tick (tick là lọc ngay). */
function FilterDropdown({
  anchor,
  values,
  selected,
  onChange,
  onClose,
}: {
  anchor: HTMLElement;
  values: string[];
  selected: string[] | null;
  onChange: (next: string[] | null) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => values.filter((v) => !q || norm(v || BLANK).includes(norm(q))), [values, q]);
  const on = (v: string) => !selected || selected.includes(v);
  const allShown = shown.length > 0 && shown.every(on);
  const commit = (set: Set<string>) => onChange(set.size === values.length ? null : [...set]);
  const toggle = (v: string) => {
    const set = new Set(selected ?? values);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    commit(set);
  };
  const toggleAll = () => {
    const set = new Set(selected ?? values);
    if (allShown) shown.forEach((v) => set.delete(v));
    else shown.forEach((v) => set.add(v));
    commit(set);
  };
  const count = selected ? selected.length : values.length;
  return (
    <Dropdown anchor={anchor} width={240} onClose={onClose}>
      <input autoFocus className="vdd-search" placeholder="Tìm kiếm…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="vdd-list">
        <label className="vdd-item vdd-all">
          <input type="checkbox" className="checkbox" checked={allShown} onChange={toggleAll} disabled={!shown.length} />
          <span>{q ? "(Chọn tất cả kết quả)" : "(Chọn tất cả)"}</span>
        </label>
        {!shown.length && <div className="vdd-empty">Không có giá trị nào</div>}
        {shown.map((v) => (
          <label key={v || "__blank"} className="vdd-item" title={v || BLANK}>
            <input type="checkbox" className="checkbox" checked={on(v)} onChange={() => toggle(v)} />
            <span>{v || BLANK}</span>
          </label>
        ))}
      </div>
      <div className="vdd-foot">
        <span>
          {count}/{values.length} giá trị
        </span>
        <button type="button" className="vdd-link" disabled={!selected} onClick={() => onChange(null)}>
          Xóa lọc
        </button>
      </div>
    </Dropdown>
  );
}

/** Dropdown "Hiển thị cột": tick bật/tắt từng cột (luôn giữ ít nhất 1 cột). */
function ColumnsDropdown({
  anchor,
  columns,
  hidden,
  onToggle,
  onShowAll,
  onClose,
}: {
  anchor: HTMLElement;
  columns: ViewColumn[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onClose: () => void;
}) {
  const shown = columns.filter((c) => !hidden.has(c.key)).length;
  return (
    <Dropdown anchor={anchor} width={240} align="right" onClose={onClose}>
      <div className="vdd-list" style={{ marginTop: 0 }}>
        {columns.map((c) => {
          const visible = !hidden.has(c.key);
          return (
            <label key={c.key} className="vdd-item">
              <input type="checkbox" className="checkbox" checked={visible} disabled={visible && shown <= 1} onChange={() => onToggle(c.key)} />
              <span>{c.label}</span>
            </label>
          );
        })}
      </div>
      <div className="vdd-foot">
        <span>
          {shown}/{columns.length} cột
        </span>
        <button type="button" className="vdd-link" disabled={hidden.size === 0} onClick={onShowAll}>
          Hiện tất cả
        </button>
      </div>
    </Dropdown>
  );
}

/** Nút "Hiển thị cột" dạng dropdown dùng chung cho các bảng có `useTableLayout` (ẩn/hiện cột lưu theo từng bảng). */
export function ColumnsMenuButton({ layout, columns }: { layout: TableLayout; columns: ViewColumn[] }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const shown = columns.filter((c) => !layout.hidden.has(c.key)).length;
  return (
    <>
      <button
        type="button"
        className="btn btn-icon layout-btn colvis-btn"
        title={`Hiển thị cột (${shown}/${columns.length})`}
        aria-label="Hiển thị cột"
        onClick={(e) => setAnchor((a) => (a ? null : e.currentTarget))}
      >
        <DIcon name="columns" />
      </button>
      {anchor && (
        <ColumnsDropdown
          anchor={anchor}
          columns={columns}
          hidden={layout.hidden}
          onToggle={layout.toggleHidden}
          onShowAll={layout.showAll}
          onClose={() => setAnchor(null)}
        />
      )}
    </>
  );
}

/**
 * Bảng XEM (chỉ đọc) gọn cho các cửa sổ chi tiết: hàng thấp 28px, tiêu đề dính, nhiều dòng nhất có thể trong khung;
 * mỗi cột có ⋮ lọc (dropdown tick giá trị), nút "Hiển thị cột" (dropdown), kéo mép cột đổi độ rộng. Chiều cao do khung cha quyết định
 * (cha là flex dọc có min-height:0) — bảng cuộn dọc bên trong, tiêu đề cột đứng yên.
 */
export default function ViewGrid<T>({
  columns,
  rows,
  textOf,
  storageKey,
  summary,
  rowActions,
  groupBy,
  groupKeys,
  groupHeader,
  columnGroups,
  showCount = true,
  emptyText,
}: {
  columns: ViewColumn[];
  rows: T[];
  textOf: (row: T, key: string) => string;
  /** Gom các dòng cùng khóa vào MỘT STT (vd cùng mã hàng nhiều khoảng thời gian): STT và các cột `groupKeys` gộp ô (rowSpan), màu xen kẽ theo nhóm. */
  groupBy?: (row: T) => string;
  groupKeys?: string[];
  /** Hàng tiêu đề NHÓM phía trên các cột `keys` (vd "Chủng loại xe. Phân loại_Cung độ"); các cột còn lại gộp 2 hàng */
  groupHeader?: { label: string; keys: string[]; /** nhóm của một cột (vd "CAT773E.BK") — có thì tiêu đề nhóm có nút ⋮ lọc theo nhóm (ẩn các cột nhóm không chọn) */ groupOf?: (key: string) => string };
  /** Nhiều tiêu đề NHÓM (vd "Nhóm vỉa + Máy xúc", "Đất CN"): các cột cùng nhóm nằm liền nhau dưới một ô tiêu đề; cột ngoài nhóm gộp 2 hàng. */
  columnGroups?: {
    label: string;
    keys: string[];
    /** Có thì ô tiêu đề nhóm có nút ⋮ lọc theo giá trị của cột này (vd cột Khoá gộp đủ các thành phần của nhóm). */
    filterKey?: string;
    /** Các cột của nhóm để TRỐNG tiêu đề con (không nhãn, không nút sắp xếp/lọc) — thường là cột `filterKey`, đã lọc ngay ở tiêu đề nhóm. */
    blankKeys?: string[];
    /** Sắc xanh riêng của nhóm (1 đậm, 2 vừa, 3 nhạt) — tô cả ô tiêu đề nhóm lẫn các tiêu đề con. */
    tone?: 1 | 2 | 3;
  }[];
  /** hiện chữ "Hiển thị N dòng" ở thanh trên (mặc định có) */
  showCount?: boolean;
  /** chữ hiện khi bảng KHÔNG có dòng dữ liệu nào (mặc định: "Không có dòng nào khớp bộ lọc") */
  emptyText?: string;
  /** thông tin tóm tắt đặt bên trái thanh trên bảng (vd Năm, Khu vực xúc) */
  summary?: React.ReactNode;
  /** cột "Thao tác" cuối bảng (nút sửa/xóa từng dòng…) — không lọc, không ẩn */
  rowActions?: (row: T) => React.ReactNode;
  /** khóa lưu độ rộng/cột ẩn của người dùng (mỗi bảng một khóa) */
  storageKey: string;
}) {
  const layout = useTableLayout<T>(storageKey, columns, rows, textOf, undefined, 72);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [pop, setPop] = useState<{ key: string; anchor: HTMLElement } | null>(null);
  const [colMenu, setColMenu] = useState<HTMLElement | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const groupSet = new Set(groupHeader?.keys ?? []);
  const groupOf = groupHeader?.groupOf;
  const [groupFilter, setGroupFilter] = useState<string[] | null>(null);
  const [groupPop, setGroupPop] = useState<HTMLElement | null>(null);
  const groupValues = useMemo(
    () => (groupOf ? distinctSorted(columns.filter((c) => groupSet.has(c.key) && !layout.hidden.has(c.key)).map((c) => groupOf(c.key))) : []),
    [columns, groupHeader, layout.hidden], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const visible = columns.filter((c) => !layout.hidden.has(c.key) && !(groupFilter && groupOf && groupSet.has(c.key) && !groupFilter.includes(groupOf(c.key))));
  const grouped = visible.filter((c) => groupSet.has(c.key));
  const leading = visible.filter((c) => !groupSet.has(c.key));
  /** bỏ tick hết các nhóm (như Excel): giữ lại MỘT cột trống mang tiêu đề nhóm + nút ⋮ để còn mở lại bộ lọc */
  const groupEmpty = !!groupHeader && !!groupOf && groupFilter !== null && grouped.length === 0;
  const matches = (r: T, skip: string | null) =>
    Object.entries(filters).every(([k, sel]) => k === skip || sel.includes(textOf(r, k)));
  const shownRows = useMemo(() => {
    const f = rows.filter((r) => matches(r, null));
    if (!sort) return f;
    const m = sort.dir === "asc" ? 1 : -1;
    return [...f].sort((a, b) => m * textOf(a, sort.key).localeCompare(textOf(b, sort.key), "vi", { numeric: true }));
  }, [rows, filters, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const popValues = useMemo(
    () => (pop ? distinctSorted(rows.filter((r) => matches(r, pop.key)).map((r) => textOf(r, pop.key))) : []),
    [pop, rows, filters], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const filterCount = Object.keys(filters).length;

  // Dòng hiển thị kèm thông tin gộp nhóm: STT (theo nhóm nếu có groupBy), dòng đầu của nhóm, số dòng của nhóm, màu xen kẽ theo nhóm/dòng
  const infos = useMemo(() => {
    type Info = { r: T; n: number; first: boolean; span: number; z: boolean };
    if (!groupBy) return shownRows.map((r, i): Info => ({ r, n: i + 1, first: true, span: 1, z: i % 2 === 1 }));
    const order: string[] = [];
    const map = new Map<string, T[]>();
    for (const r of shownRows) {
      const k = groupBy(r);
      if (!map.has(k)) {
        map.set(k, []);
        order.push(k);
      }
      map.get(k)!.push(r);
    }
    const out: Info[] = [];
    order.forEach((k, gi) => {
      const list = map.get(k)!;
      list.forEach((r, j) => out.push({ r, n: gi + 1, first: j === 0, span: list.length, z: gi % 2 === 1 }));
    });
    return out;
  }, [shownRows, groupBy]);

  const tiered = !!groupHeader || !!columnGroups;
  const cgKeys = new Set(columnGroups?.flatMap((g) => g.keys) ?? []);
  /** Hàng 1 khi có columnGroups: cột ngoài nhóm (rowSpan 2) và MỘT ô tiêu đề cho mỗi nhóm (colSpan = số cột nhóm đang hiện). */
  const cgRow1 = () =>
    columnGroups
    ? visible.map((c) => {
        const g = columnGroups.find((x) => x.keys.includes(c.key));
        if (!g) return renderTh(c, 2);
        const members = visible.filter((v) => g.keys.includes(v.key));
        if (members[0].key !== c.key) return null;
        return (
          <th key={`cg-${g.label}`} colSpan={members.length} data-tone={g.tone} style={{ textAlign: "center" }}>
            {g.filterKey ? (
              <span className="vg-grouphead" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {g.label}
                <button
                  type="button"
                  className={`vg-th-btn ${filters[g.filterKey] ? "on" : ""}`}
                  title={filters[g.filterKey] ? `Đang lọc ${filters[g.filterKey].length} giá trị — bấm để sửa` : `Lọc theo ${g.label}`}
                  aria-label={`Lọc theo ${g.label}`}
                  onClick={(e) => {
                    const anchor = e.currentTarget.closest("th") as HTMLElement;
                    setPop((p) => (p?.key === g.filterKey ? null : { key: g.filterKey!, anchor }));
                  }}
                >
                  <DIcon name="more-vertical" />
                </button>
              </span>
            ) : (
              g.label
            )}
          </th>
        );
      })
    : null;

  const renderTh = (c: ViewColumn, rowSpan?: number) => {
const active = Boolean(filters[c.key]);
return (
  <th key={c.key} rowSpan={rowSpan} data-tone={columnGroups?.find((g) => g.keys.includes(c.key))?.tone} style={{ position: "relative", textAlign: c.align ?? "left" }}>
    <span className="vg-th" style={c.align === "center" ? { justifyContent: "center", gap: 4 } : undefined}>
      <span className="vg-th-label" title={c.label}>
        {c.label}
      </span>
      <span className="vg-th-tools">
      <button
        type="button"
        className={`vg-th-btn ${sort?.key === c.key ? "on" : ""}`}
        title={sort?.key === c.key ? (sort.dir === "asc" ? "Đang tăng dần — bấm để giảm dần" : "Đang giảm dần — bấm để bỏ sắp xếp") : "Sắp xếp"}
        aria-label={`Sắp xếp theo ${c.label}`}
        onClick={() => setSort((s) => (!s || s.key !== c.key ? { key: c.key, dir: "asc" } : s.dir === "asc" ? { key: c.key, dir: "desc" } : null))}
      >
        <DIcon name="sort" />
      </button>
      <button
        type="button"
        className={`vg-th-btn ${active ? "on" : ""}`}
        title={active ? `Đang lọc ${filters[c.key].length} giá trị — bấm để sửa` : `Lọc theo ${c.label}`}
        aria-label={`Lọc theo ${c.label}`}
        onClick={(e) => {
          const anchor = e.currentTarget.closest("th") as HTMLElement;
          setPop((p) => (p?.key === c.key ? null : { key: c.key, anchor }));
        }}
      >
        <DIcon name="more-vertical" />
      </button>
      </span>
    </span>
    <ColResizer colKey={c.key} layout={layout} />
  </th>
);
  };

  return (
    <div className="vg">
      <div className="vg-bar">
        {/* nút chỉnh bảng / hiển thị cột nằm BÊN TRÁI bảng (đồng bộ với các bảng nhập) */}
        <button
          type="button"
          className="vg-iconbtn"
          title={`Hiển thị cột (${visible.length}/${columns.length})`}
          aria-label="Hiển thị cột"
          onClick={(e) => setColMenu((m) => (m ? null : e.currentTarget))}
        >
          <DIcon name="columns" />
        </button>
        <TableLayoutButton layout={layout} columns={columns} />
        {summary}
        {showCount && (
          <span className="vg-count">
            Hiển thị <b>{shownRows.length}</b>
            {filterCount ? ` / ${rows.length}` : ""} dòng
          </span>
        )}
        {filterCount > 0 && (
          <button type="button" className="vdd-link" onClick={() => setFilters({})}>
            Xóa {filterCount} bộ lọc
          </button>
        )}
      </div>

      <div className="vg-scroll">
        <table className={`entry-table entry-view ${layout.tableClass}`} style={{ tableLayout: "fixed", width: 52 + (rowActions ? 84 : 0) + (groupEmpty ? 260 : 0) + visible.reduce((s, c) => s + layout.widthOf(c.key), 0) }}>
          <colgroup>
            <col style={{ width: 52 }} />
            {visible.map((c) => (
              <col key={c.key} style={{ width: layout.widthOf(c.key) }} />
            ))}
            {groupEmpty && <col style={{ width: 260 }} />}
            {rowActions && <col style={{ width: 84 }} />}
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={tiered ? 2 : undefined} style={{ textAlign: "center" }}>STT</th>
              {columnGroups ? cgRow1() : groupHeader ? leading.map((c) => renderTh(c, 2)) : visible.map((c) => renderTh(c))}
              {groupHeader && (grouped.length > 0 || groupEmpty) && (
                <th colSpan={Math.max(1, grouped.length)} rowSpan={groupEmpty ? 2 : undefined} style={{ textAlign: "left" }}>
                  <div className="vg-grouphead" style={{ position: "sticky", left: 8, width: "fit-content", display: "flex", alignItems: "center", gap: 6 }}>
                    {groupHeader.label}
                    {groupOf && (
                      <button
                        type="button"
                        className={`vg-th-btn ${groupFilter ? "on" : ""}`}
                        title={groupFilter ? `Đang lọc ${groupFilter.length}/${groupValues.length} nhóm — bấm để sửa` : "Lọc theo Chủng loại xe + Phân loại"}
                        aria-label="Lọc theo Chủng loại xe + Phân loại"
                        onClick={(e) => setGroupPop((p) => (p ? null : e.currentTarget))}
                      >
                        <DIcon name="more-vertical" />
                      </button>
                    )}
                  </div>
                </th>
              )}
              {rowActions && <th rowSpan={tiered ? 2 : undefined} style={{ textAlign: "center" }}>Thao tác</th>}
            </tr>
            {groupHeader && grouped.length > 0 && <tr>{grouped.map((c) => renderTh(c))}</tr>}
            {columnGroups && (
              <tr>
                {visible
                  .filter((c) => cgKeys.has(c.key))
                  .map((c) =>
                    columnGroups.some((g) => g.blankKeys?.includes(c.key)) ? (
                      // tiêu đề con để trống (lọc ở tiêu đề nhóm phía trên); vẫn kéo giãn được độ rộng cột
                      <th key={c.key} style={{ position: "relative" }}>
                        <ColResizer colKey={c.key} layout={layout} />
                      </th>
                    ) : (
                      renderTh(c)
                    ),
                  )}
              </tr>
            )}
          </thead>
          <tbody>
            {shownRows.length === 0 ? (
              <tr>
                <td colSpan={visible.length + 1 + (groupEmpty ? 1 : 0) + (rowActions ? 1 : 0)} style={{ textAlign: "center", color: "#7283a0", padding: "18px 8px" }}>
                  {rows.length === 0 && emptyText ? emptyText : "Không có dòng nào khớp bộ lọc"}
                </td>
              </tr>
            ) : (
              infos.map((x, i) => (
                <tr key={i} className={`${x.z ? "z1" : ""} ${groupBy && x.first && x.n > 1 ? "g-first" : ""}`.trim() || undefined}>
                  {x.first && (
                    <td rowSpan={x.span} style={{ textAlign: "center", color: "#5b6f8f", fontWeight: 700 }}>
                      {x.n}
                    </td>
                  )}
                  {visible.map((c) => {
                    const merged = !!groupBy && !!groupKeys?.includes(c.key);
                    if (merged && !x.first) return null;
                    const t = textOf(x.r, c.key);
                    return (
                      <td
                        key={c.key}
                        title={t}
                        rowSpan={merged ? x.span : undefined}
                        style={{ textAlign: c.align ?? "left", ...(c.strong ? { fontWeight: 700, color: "#1a4f9d" } : null) }}
                      >
                        {t}
                      </td>
                    );
                  })}
                  {groupEmpty && <td />}
                  {rowActions && <td style={{ textAlign: "center", overflow: "visible" }}>{rowActions(x.r)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {groupPop && groupOf && (
        <FilterDropdown anchor={groupPop} values={groupValues} selected={groupFilter} onChange={setGroupFilter} onClose={() => setGroupPop(null)} />
      )}
      {pop && (
        <FilterDropdown
          key={pop.key}
          anchor={pop.anchor}
          values={popValues}
          selected={filters[pop.key] ?? null}
          onChange={(sel) =>
            setFilters((p) => {
              const n = { ...p };
              if (sel) n[pop.key] = sel;
              else delete n[pop.key];
              return n;
            })
          }
          onClose={() => setPop(null)}
        />
      )}
      {colMenu && (
        <ColumnsDropdown
          anchor={colMenu}
          columns={columns}
          hidden={layout.hidden}
          onToggle={layout.toggleHidden}
          onShowAll={layout.showAll}
          onClose={() => setColMenu(null)}
        />
      )}
    </div>
  );
}
