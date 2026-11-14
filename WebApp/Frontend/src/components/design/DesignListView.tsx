import RowsPerPage, { PageArrows } from "./RowsPerPage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/catalog-design.css";
import DIcon from "./DIcon";
import ExcelFilterPopup, { distinctSorted } from "./ExcelFilterPopup";
import { ColResizer, ColumnToggleButton, TableLayoutButton, useTableLayout } from "./tableLayout";

export interface DesignColumn<T> {
  key: string;
  label: string;
  /** bề rộng cột (px) */
  width?: number;
  /** giá trị chữ của ô: dùng để hiển thị, tìm kiếm, lọc và sắp xếp */
  value: (row: T) => string;
  /** hiển thị riêng (vd huy hiệu) — mặc định in `value` */
  render?: (row: T) => React.ReactNode;
  /** có sắp xếp theo cột này không (mặc định có) */
  sortable?: boolean;
}

const PAGE_SIZES = [15, 20, 50, 100];

/**
 * Trang danh mục THEO THIẾT KẾ dùng cho các màn có dữ liệu/thao tác riêng (không cấu hình bằng `CatalogConfig`):
 * đường dẫn, thẻ trắng (tiêu đề + mô tả + Thêm mới/Chỉnh sửa/Xóa), thanh công cụ (tìm kiếm đủ tên cột, Tổng số bản ghi,
 * Excel, làm mới), bảng tiêu đề xanh có sắp xếp + lọc từng cột (3 chấm dọc), phân trang. Tìm/lọc/sắp xếp/phân trang chạy ở
 * trình duyệt trên `rows` truyền vào. Các nút chỉ hiện khi trang truyền handler tương ứng.
 */
export function DesignListView<T>({
  trail,
  title,
  description,
  noun,
  rows,
  getId,
  columns,
  loading,
  onRefresh,
  onAdd,
  onEdit,
  onCopy,
  onView,
  onDelete,
  onImport,
  isImporting,
  onExport,
  extraRowActions,
  toolbarSlot,
  belowToolbar,
  isRowSelectable,
  extraSearch,
  extraSearchLabel,
  actionsSlot,
  children,
}: {
  trail: string[];
  title: string;
  description?: string;
  /** cụm danh từ viết thường, dùng trong thông báo ("tỷ trọng") */
  noun: string;
  rows: T[];
  getId: (row: T) => number | string;
  columns: DesignColumn<T>[];
  loading?: boolean;
  onRefresh?: () => void;
  onAdd?: () => void;
  /** sửa 1 dòng (nút trên cùng cần đúng 1 dòng được chọn; icon bút ở từng dòng) */
  onEdit?: (row: T) => void;
  onCopy?: (row: T) => void;
  onView?: (row: T) => void;
  /** xóa các dòng (đã qua hộp xác nhận); ném lỗi/ tự báo toast nếu thất bại */
  onDelete?: (rows: T[]) => void;
  onImport?: (file: File) => void | Promise<void>;
  isImporting?: boolean;
  /** tải Excel các dòng đã chọn (không chọn = file mẫu, do trang quyết định) */
  onExport?: (selected: T[]) => void;
  extraRowActions?: (row: T) => React.ReactNode;
  /** bộ lọc phụ đặt cạnh ô tìm kiếm */
  toolbarSlot?: React.ReactNode;
  /** nội dung chen giữa thanh công cụ và bảng (vd thanh tiến trình nhập file) */
  belowToolbar?: React.ReactNode;
  /** dòng nào được tick chọn/xóa (mặc định mọi dòng) — vd không cho xóa tài khoản quản trị */
  isRowSelectable?: (row: T) => boolean;
  /** văn bản bổ sung (không phải cột) để ô tìm kiếm cũng khớp — vd mã/tên hàng nằm trong lô */
  extraSearch?: (row: T) => string;
  /** tên phần bổ sung, nối vào gợi ý ô tìm kiếm */
  extraSearchLabel?: string;
  /** nút phụ cạnh nhóm nút trên cùng */
  actionsSlot?: React.ReactNode;
  /** cửa sổ/phụ kiện đặt cuối trang (modal của riêng trang) */
  children?: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const searchHint = useMemo(
    () =>
      "Tìm kiếm theo " +
      columns
        .map((c) =>
          c.label
            .split(" ")
            .map((w) => (w.length > 1 && w === w.toUpperCase() && /[A-ZÀ-Ỵ]/.test(w) ? w : w.toLowerCase()))
            .join(" "),
        )
        .join(", ") + (extraSearchLabel ? ", " + extraSearchLabel : ""),
    [columns, extraSearchLabel],
  );

  // Lọc cột kiểu Excel: mỗi cột giữ DANH SÁCH giá trị được tích (không còn ô gõ chữ "chứa")
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const [pop, setPop] = useState<{ key: string; label: string; anchor: HTMLElement } | null>(null);
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const setColFilterSel = (key: string, sel: string[] | null) => {
    setColFilters((p) => {
      const next = { ...p };
      if (sel) next[key] = sel;
      else delete next[key];
      return next;
    });
    setPage(1);
  };

  // Giá trị hiện trong hộp lọc của cột đang mở: các giá trị khác nhau của cột đó trong những dòng còn lại sau khi áp
  // ô tìm kiếm + bộ lọc của CÁC cột khác (giống Excel — danh sách thu hẹp theo bộ lọc cột khác).
  const popValues = useMemo(() => {
    if (!pop) return [] as string[];
    const q = search.toLowerCase();
    const others = Object.entries(colFilters).filter(([k]) => k !== pop.key);
    const colByKey = new Map(columns.map((c) => [c.key, c]));
    const col = colByKey.get(pop.key);
    if (!col) return [] as string[];
    const list = rows.filter((r) => {
      if (q && !columns.some((c) => c.value(r).toLowerCase().includes(q)) && !(extraSearch?.(r) ?? "").toLowerCase().includes(q)) return false;
      return others.every(([k, sel]) => sel.includes(colByKey.get(k)?.value(r) ?? ""));
    });
    return distinctSorted(list.map((r) => col.value(r) ?? ""));
  }, [pop, rows, columns, search, colFilters, extraSearch]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const active = Object.entries(colFilters);
    const colByKey = new Map(columns.map((c) => [c.key, c]));
    let list = rows.filter((r) => {
      if (q && !columns.some((c) => c.value(r).toLowerCase().includes(q)) && !(extraSearch?.(r) ?? "").toLowerCase().includes(q)) return false;
      return active.every(([k, sel]) => sel.includes(colByKey.get(k)?.value(r) ?? ""));
    });
    const sc = colByKey.get(sortKey);
    if (sc) list = [...list].sort((a, b) => sortDir * sc.value(a).localeCompare(sc.value(b), "vi", { numeric: true }));
    return list;
  }, [rows, columns, search, colFilters, sortKey, sortDir, extraSearch]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, pages);
  const start = (curPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const idOf = (r: T) => String(getId(r));
  const canPick = (r: T) => (isRowSelectable ? isRowSelectable(r) : true);
  const allVisibleSelected = visible.some(canPick) && visible.filter(canPick).every((r) => selected.has(idOf(r)));
  const selectedRows = rows.filter((r) => selected.has(idOf(r)));

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
    setPage(1);
  };
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAllVisible = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      visible.filter(canPick).forEach((r) => (checked ? next.add(idOf(r)) : next.delete(idOf(r))));
      return next;
    });

  const selectable = !!(onEdit || onDelete || onExport);
  const hasExcel = !!(onImport || onExport);
  const importRef = useRef<HTMLInputElement>(null);
  // Hiển thị bảng do người dùng chọn (mặc định: vừa nội dung — hiện đủ ký tự), lưu theo từng bảng
  const layout = useTableLayout<T>(`dp:${trail.join("/")}:${title}`, columns, rows, (r, key) => columns.find((c) => c.key === key)?.value(r) ?? "");
  const shownColumns = columns.filter((c) => !layout.hidden.has(c.key));
  const tableMinWidth = (selectable ? 46 : 0) + 62 + shownColumns.reduce((s, c) => s + layout.widthOf(c.key), 0) + 124;
  const hasRowActions = !!(onView || onEdit || onCopy || onDelete || extraRowActions);

  return (
    <div className="tkc">
      <div ref={contentRef}>
        <div className="breadcrumbs">
          <DIcon name="home" />
          {trail.map((b) => (
            <React.Fragment key={b}>
              <span>{b}</span>
              <DIcon name="chevron-right" className="crumb-chev" />
            </React.Fragment>
          ))}
          <strong>{title}</strong>
        </div>

        <section className="panel">
          <div className="panel-top">
            <div className="heading">
              <span className="heading-icon">
                <DIcon name="boxes" />
              </span>
              <div>
                <h1>{title}</h1>
                <p>{description ?? `Quản lý danh mục ${noun}`}</p>
              </div>
            </div>
            <div className="button-group">
              {onAdd && (
                <button className="btn btn-primary" onClick={onAdd}>
                  <DIcon name="plus" />
                  Thêm mới
                </button>
              )}
              {onEdit && (
                <button
                  className="btn"
                  disabled={selectedRows.length !== 1}
                  title={selectedRows.length === 1 ? "Chỉnh sửa dòng đã chọn" : "Tick chọn đúng 1 dòng để chỉnh sửa"}
                  onClick={() => selectedRows[0] && onEdit(selectedRows[0])}
                >
                  <DIcon name="edit" />
                  Chỉnh sửa
                </button>
              )}
              {onDelete && (
                <button
                  className="btn btn-danger"
                  disabled={selectedRows.length === 0}
                  title={selectedRows.length === 0 ? "Tick chọn dòng trong bảng để xóa" : `Xóa ${selectedRows.length} dòng đã chọn`}
                  onClick={() => onDelete(selectedRows)}
                >
                  <DIcon name="trash" />
                  Xóa
                </button>
              )}
              {actionsSlot}
            </div>
          </div>

          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search" style={{ "--hint-w": `${Math.ceil(searchHint.length * 6.8) + 90}px` } as React.CSSProperties}>
                <DIcon name="search" />
                <input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setPage(1);
                  }}
                  placeholder={searchHint}
                  title={searchHint}
                  aria-label={`Tìm kiếm ${noun}`}
                />
                {searchInput && (
                  <button className="search-clear" aria-label="Xóa tìm kiếm" onClick={() => setSearchInput("")}>
                    ×
                  </button>
                )}
              </div>
              {toolbarSlot}
              <div className="count">
                Tổng số bản ghi: <strong>{filtered.length}</strong>
              </div>
            </div>
            <div className="toolbar-right">
              {hasExcel && (
                <>
                  {onImport && (
                    <>
                      <input
                        ref={importRef}
                        type="file"
                        accept=".xlsx,.xls"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) onImport(file);
                        }}
                      />
                      <button className="btn" disabled={isImporting} onClick={() => importRef.current?.click()}>
                        <DIcon name="upload" />
                        {isImporting ? "Đang nhập…" : "Tải lên (Excel)"}
                      </button>
                    </>
                  )}
                  {onExport && (
                    <button
                      className="btn"
                      title="Tải file Excel của các dòng đã chọn (không chọn dòng nào = tải file mẫu)"
                      onClick={() => onExport(selectedRows)}
                    >
                      <DIcon name="download" />
                      Tải xuống (Excel)
                    </button>
                  )}
                </>
              )}
              <ColumnToggleButton layout={layout} columns={columns} />
              <TableLayoutButton layout={layout} columns={columns} />
              {onRefresh && (
                <button className="btn btn-icon" title="Làm mới danh sách" aria-label="Làm mới" onClick={onRefresh}>
                  <DIcon name="refresh" />
                </button>
              )}
            </div>
          </div>

          {belowToolbar}
          <div className="table-scroll">
            <table className={`data-table ${layout.tableClass}`} style={{ minWidth: tableMinWidth }}>
              <colgroup>
                {selectable && <col style={{ width: 46 }} />}
                <col style={{ width: 62 }} />
                {shownColumns.map((c) => (
                  <col key={c.key} style={{ width: layout.widthOf(c.key) }} />
                ))}
                {hasRowActions && <col />}
              </colgroup>
              <thead>
                <tr>
                  {selectable && (
                    <th>
                      <input
                        className="checkbox"
                        type="checkbox"
                        aria-label="Chọn tất cả bản ghi trên trang"
                        checked={allVisibleSelected}
                        onChange={(e) => toggleAllVisible(e.target.checked)}
                      />
                    </th>
                  )}
                  <th>STT</th>
                  {shownColumns.map((c) => {
                    const sortable = c.sortable !== false;
                    return (
                      <th key={c.key} className={sortable ? "sortable" : undefined} onClick={sortable ? () => toggleSort(c.key) : undefined}>
                        <span className="th-inner">
                          <span className="th-label" title={c.label}>
                            {c.label}
                          </span>
                          <span className="th-tools">
                            {sortable && <DIcon name="sort" className="sort-icon" style={sortKey === c.key ? { opacity: 1 } : undefined} />}
                            <button
                              type="button"
                              className={`col-filter-btn ${colFilters[c.key] ? "active" : ""}`}
                              title={colFilters[c.key] ? `Đang lọc ${colFilters[c.key].length} giá trị — bấm để sửa` : `Lọc theo ${c.label}`}
                              aria-label={`Lọc theo ${c.label}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (pop?.key === c.key) {
                                  setPop(null);
                                  return;
                                }
                                setPop({ key: c.key, label: c.label, anchor: e.currentTarget });
                              }}
                            >
                              <DIcon name="more-vertical" />
                            </button>
                          </span>
                        </span>
                        <ColResizer colKey={c.key} layout={layout} />
                      </th>
                    );
                  })}
                  {hasRowActions && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, idx) => {
                  const id = idOf(r);
                  return (
                    <tr key={id} className={selected.has(id) ? "checked" : undefined}>
                      {selectable && (
                        <td className="center">
                          <input className="checkbox" type="checkbox" aria-label="Chọn dòng" checked={selected.has(id)} disabled={!canPick(r)} onChange={() => toggleOne(id)} />
                        </td>
                      )}
                      <td className="center">{start + idx + 1}</td>
                      {shownColumns.map((c, ci) => (
                        <td key={c.key} className={ci === 0 ? "code" : undefined} title={c.value(r)}>
                          {c.render ? c.render(r) : c.value(r)}
                        </td>
                      ))}
                      {hasRowActions && (
                        <td className="actions-cell">
                          <div className="row-actions">
                            {onView && (
                              <button className="row-action view" title="Xem chi tiết" onClick={() => onView(r)}>
                                <DIcon name="eye" />
                              </button>
                            )}
                            {onEdit && (
                              <button className="row-action edit" title="Chỉnh sửa" onClick={() => onEdit(r)}>
                                <DIcon name="edit" />
                              </button>
                            )}
                            {onCopy && (
                              <button className="row-action copy" title="Sao chép" onClick={() => onCopy(r)}>
                                <DIcon name="copy" />
                              </button>
                            )}
                            {extraRowActions?.(r)}
                            {onDelete && canPick(r) && (
                              <button className="row-action delete" title="Xóa" onClick={() => onDelete([r])}>
                                <DIcon name="trash" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && visible.length === 0 && (
              <div className="empty-state">
                <DIcon name="search" />
                Không có bản ghi phù hợp
              </div>
            )}
          </div>

          <div className="pagination">
            <div className="pagination-info">
              <RowsPerPage
                value={pageSize}
                options={PAGE_SIZES}
                onChange={(n) => {
                  setPageSize(n);
                  setPage(1);
                }}
                from={filtered.length ? start + 1 : 0}
                to={Math.min(start + pageSize, filtered.length)}
                total={filtered.length}
              />
            </div>
            <PageArrows canPrev={curPage > 1} canNext={curPage < pages} onPrev={() => setPage(curPage - 1)} onNext={() => setPage(curPage + 1)} onFirst={() => setPage(1)} onLast={() => setPage(pages)} />
          </div>
        </section>
      </div>

      {pop && (
        <ExcelFilterPopup
          key={pop.key}
          anchor={pop.anchor}
          title={pop.label}
          values={popValues}
          selected={colFilters[pop.key] ?? null}
          onApply={(sel) => {
            setColFilterSel(pop.key, sel);
            setPop(null);
          }}
          onClose={() => setPop(null)}
        />
      )}

      {children}
    </div>
  );
}
