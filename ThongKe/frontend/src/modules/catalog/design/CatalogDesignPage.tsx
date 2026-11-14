import RowsPerPage, { PageArrows } from "@/components/table/RowsPerPage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import "@/styles/catalog-design.css";
import api from "@/config/api.config";
import { useEmbedAutoHeight } from "@/hooks/useEmbedAutoHeight";
import { requestDeviceHours } from "@/lib/embed";
import { createCatalogService } from "../catalogService";
import { downloadCatalogExcel, parseCatalogExcel } from "../catalogExcel";
import { catalogBreadcrumbTrail } from "../catalogGroups";
import type { CatalogConfig } from "../types";
import { CatalogDesignModal, DesignConfirmDelete } from "./CatalogDesignModal";
import DIcon from "./DIcon";
import ExcelFilterPopup, { distinctSorted } from "@/components/table/ExcelFilterPopup";
import { ColResizer, ColumnToggleButton, TableLayoutButton, useTableLayout } from "./tableLayout";

type Rec = Record<string, unknown> & { id?: number };

/** Danh mục nhỏ: tải một lần (tối đa 2000 dòng) rồi lọc/sắp xếp/phân trang ở trình duyệt. */
const FETCH_ALL_SIZE = 2000;
const PAGE_SIZES = [15, 20, 50, 100];

const widthPx = (w?: string): number | undefined => {
  const m = /\[(\d+)px\]/.exec(w ?? "");
  return m ? Number(m[1]) : undefined;
};
const isLongText = (key: string) => key === "note" || key === "description";

type ModalState =
  | null
  | { type: "add" }
  | { type: "edit"; records: Rec[] }
  | { type: "copy"; records: Rec[] }
  | { type: "delete"; ids: number[]; label?: string };

/**
 * Trang danh mục THEO THIẾT KẾ (file "quan_ly_chung_loai_hang_than_cao_son.html", chủ dự án giao 2026-11-09):
 * đường dẫn, thẻ trắng (tiêu đề + mô tả + Thêm mới/Chỉnh sửa/Xóa), thanh công cụ (tìm kiếm, lọc nhóm, tổng số, Excel,
 * làm mới), bảng tiêu đề xanh có sắp xếp, phân trang. Dùng chung cho mọi danh mục cấu hình bằng `CatalogConfig`.
 */
export function CatalogDesignPage({
  config,
  extraActions,
  extraRowActions,
}: {
  config: CatalogConfig;
  /** Nút phụ cạnh nhóm nút trên cùng — vd bộ dựng khoá của màn STD (Đất CN). */
  extraActions?: React.ReactNode;
  /** Nút phụ ở cột Thao tác của từng dòng (vd mở hồ sơ tài sản của máy). */
  extraRowActions?: (row: Rec) => React.ReactNode;
}) {
  const service = useMemo(() => createCatalogService<Rec>(config.basePath), [config.basePath]);
  const contentRef = useRef<HTMLDivElement>(null);
  useEmbedAutoHeight(contentRef, 40);

  // ── dữ liệu ──
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, refetch } = useQuery({
    // Tìm kiếm + lọc cột làm ở trình duyệt (trên đúng các cột đang hiển thị) nên không gửi keyword lên máy chủ.
    queryKey: [config.basePath, config.fixedValues],
    queryFn: () => service.getAll({ page: 0, size: FETCH_ALL_SIZE, sort: "id,DESC", ...(config.fixedValues ?? {}) }),
    placeholderData: keepPreviousData,
  });
  // Giờ hoạt động lũy kế: số liệu chỉ có bên Điều phối, lấy theo mã thiết bị qua khung cha (ngoài chế độ nhúng: để trống)
  const { data: deviceHours } = useQuery({
    queryKey: ["device-hours-by-code"],
    queryFn: requestDeviceHours,
    enabled: !!config.deviceHoursByCode,
    staleTime: 60_000,
  });
  const baseRows: Rec[] = data?.content ?? [];
  const allRows: Rec[] = useMemo(
    () =>
      config.deviceHoursByCode || config.valueFallbacks
        ? baseRows.map((r) => {
            const out: Rec = { ...r };
            // cột trống thì lấy giá trị cột khác (vd Số xe trống => Biển số/mã)
            for (const [key, from] of Object.entries(config.valueFallbacks ?? {})) {
              if (out[key] == null || String(out[key]).trim() === "") out[key] = r[from];
            }
            if (config.deviceHoursByCode) {
              const h = deviceHours?.[String(r.code ?? "").trim()];
              out.cumulativeHours = h === undefined ? "" : String(h);
            }
            return out;
          })
        : baseRows,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, deviceHours, config.deviceHoursByCode, config.valueFallbacks],
  );

  // ── cột ──
  const cols = useMemo(
    () =>
      config.fields.map((f, i) => ({
        key: f.optionsPath ? f.key.replace(/Id$/, "Name") : f.key,
        label: f.label,
        sortable: !isLongText(f.key),
        // đủ rộng để tên cột hiển thị TRỌN VẸN (chữ + biểu tượng sắp xếp/lọc)
        width: Math.max(config.designWidths?.[i] ?? widthPx(f.width) ?? 150, Math.ceil(f.label.length * 8.4) + 84),
        options: f.options,
        checkbox: f.type === "checkbox",
      })),
    [config],
  );
  /** Giá trị chữ của ô: cột chọn từ danh sách cố định (vd trạng thái) hiển thị NHÃN thay vì mã. */
  const textOf = (r: Rec, key: string): string => {
    const raw = String(r[key] ?? "");
    const col = cols.find((c) => c.key === key);
    if (col?.checkbox) return raw.trim() === "" ? "" : "Có"; // cột tick: có giá trị = đã tick
    return col?.options?.find((o) => o.value === raw)?.label ?? raw;
  };
  // Hiển thị bảng do người dùng chọn (mặc định: vừa nội dung — hiện đủ ký tự), lưu theo từng danh mục
  const layout = useTableLayout(`catalog:${config.basePath}:${config.title}`, cols, allRows, textOf);
  // Cột người dùng chọn hiển thị (nút "Hiển thị cột")
  const shownCols = cols.filter((c) => !layout.hidden.has(c.key));
  const shownTotal = shownCols.reduce((s, c) => s + layout.widthOf(c.key), 0);

  /** Gợi ý ô tìm kiếm: liệt kê đủ tên các cột (giữ nguyên từ viết hoa toàn bộ như "TTL CLH"). */
  const searchHint = useMemo(
    () =>
      "Tìm kiếm theo " +
      cols
        .map((c) =>
          c.label
            .split(" ")
            .map((w) => (w.length > 1 && w === w.toUpperCase() && /[A-ZÀ-Ỵ]/.test(w) ? w : w.toLowerCase()))
            .join(" "),
        )
        .join(", "),
    [cols],
  );

  // ── lọc theo nội dung từng cột (nút 3 chấm dọc cạnh tiêu đề) ──
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const [pop, setPop] = useState<{ key: string; label: string; anchor: HTMLElement } | null>(null);
  const setColFilterSel = (key: string, sel: string[] | null) => {
    setColFilters((p) => {
      const next = { ...p };
      if (sel) next[key] = sel;
      else delete next[key];
      return next;
    });
    setPage(1);
  };
  // ── lọc / sắp xếp / phân trang / chọn ──
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);

  const filterKey = config.filterField?.key;
  const filterOptions = useMemo(
    () => (filterKey ? [...new Set(allRows.map((r) => String(r[filterKey] ?? "")).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")) : []),
    [allRows, filterKey],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const colActive = Object.entries(colFilters);
    let list = allRows.filter((r) => {
      if (filterKey && filter && String(r[filterKey] ?? "") !== filter) return false;
      if (q && !cols.some((c) => textOf(r, c.key).toLowerCase().includes(q))) return false;
      return colActive.every(([k, sel]) => sel.includes(textOf(r, k)));
    });
    if (sortKey) {
      list = [...list].sort(
        (a, b) => sortDir * textOf(a, sortKey).localeCompare(textOf(b, sortKey), "vi", { numeric: true }),
      );
    }
    return list;
  }, [allRows, filter, filterKey, sortKey, sortDir, search, colFilters, cols]);

  // Giá trị hiện trong hộp lọc của cột đang mở (như Excel): các giá trị khác nhau của cột đó trong những dòng còn lại
  // sau khi áp ô tìm kiếm, bộ lọc nhanh và bộ lọc của CÁC cột khác.
  const popValues = useMemo(() => {
    if (!pop) return [] as string[];
    const q = search.toLowerCase();
    const others = Object.entries(colFilters).filter(([k]) => k !== pop.key);
    const list = allRows.filter((r) => {
      if (filterKey && filter && String(r[filterKey] ?? "") !== filter) return false;
      if (q && !cols.some((c) => textOf(r, c.key).toLowerCase().includes(q))) return false;
      return others.every(([k, sel]) => sel.includes(textOf(r, k)));
    });
    return distinctSorted(list.map((r) => textOf(r, pop.key)));
  }, [pop, allRows, filter, filterKey, search, colFilters, cols]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const curPage = Math.min(page, pages);
  const start = (curPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const visibleIds = visible.map((r) => Number(r.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
    setPage(1);
  };
  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAllVisible = (checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });

  const selectedRows = allRows.filter((r) => selected.has(Number(r.id)));
  const labelOf = (r: Rec) => String(r[config.labelKey ?? config.fields[0]?.key ?? "id"] ?? "");

  // ── xóa ──
  const confirmDelete = async (ids: number[]) => {
    setBusy(true);
    try {
      if (ids.length === 1) await service.remove(ids[0]);
      else await service.bulkRemove(ids);
      toast.success(`Đã xóa ${ids.length} ${config.nounPhrase}.`);
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setModal(null);
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Xóa thất bại.");
    } finally {
      setBusy(false);
    }
  };

  // ── Excel ──
  const importRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const handleExport = () => {
    const { isTemplate, count } = downloadCatalogExcel(config, selectedRows);
    toast.success(
      isTemplate
        ? "Đã tải file mẫu (chỉ có dòng tiêu đề). Chọn dòng trong bảng nếu muốn tải kèm dữ liệu."
        : `Đã tải ${count} dòng đã chọn.`,
    );
  };
  /** File Excel dùng TÊN cho cột tham chiếu danh mục khác => nạp bảng tra tên → id trước khi nhập. */
  const buildLookups = async () => {
    const lookups: Record<string, Map<string, number>> = {};
    for (const f of config.fields.filter((x) => x.optionsPath)) {
      const res = await api.get(f.optionsPath!, { params: { size: 500 } });
      const list = (res.data?.data?.content ?? res.data?.data ?? []) as { id: number; name: string }[];
      lookups[f.key] = new Map(list.map((it) => [String(it.name).trim().toLowerCase(), it.id]));
    }
    return lookups;
  };
  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const { payloads, errors } = await parseCatalogExcel(config, file, await buildLookups());
      if (errors.length > 0) {
        toast.error(
          `File có ${errors.length} lỗi:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n… và ${errors.length - 5} lỗi khác` : ""}`,
          { duration: 10000 },
        );
        if (payloads.length === 0) return;
      }
      await service.bulkCreate(payloads);
      toast.success(`Đã nhập ${payloads.length} ${config.nounPhrase}.`);
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Nhập file thất bại.");
    } finally {
      setIsImporting(false);
    }
  };

  const { trail, leaf } = catalogBreadcrumbTrail(config);
  const canDelete = config.canDelete !== false;
  const canCreate = config.canCreate !== false;
  const sortIcon = (key: string) => (
    <DIcon name="sort" className="sort-icon" style={sortKey === key ? { opacity: 1 } : undefined} />
  );

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
          <strong>{leaf}</strong>
        </div>

        <section className="panel">
          <div className="panel-top">
            <div className="heading">
              <span className="heading-icon">
                <DIcon name="boxes" />
              </span>
              <div>
                <h1>{leaf}</h1>
                <p>{config.description ?? `Quản lý danh mục ${config.nounPhrase}`}</p>
              </div>
            </div>
            <div className="button-group">
              {canCreate && (
                <button className="btn btn-primary" onClick={() => setModal({ type: "add" })}>
                  <DIcon name="plus" />
                  Thêm mới
                </button>
              )}
              <button
                className="btn"
                disabled={selected.size === 0}
                title={selected.size > 0 ? `Chỉnh sửa ${selected.size} dòng đã chọn` : "Tick chọn dòng trong bảng để chỉnh sửa"}
                onClick={() => selectedRows.length > 0 && setModal({ type: "edit", records: selectedRows })}
              >
                <DIcon name="edit" />
                Chỉnh sửa
              </button>
              {canDelete && (
                <button
                  className="btn btn-danger"
                  disabled={selected.size === 0}
                  title={selected.size === 0 ? "Tick chọn dòng trong bảng để xóa" : `Xóa ${selected.size} dòng đã chọn`}
                  onClick={() =>
                    setModal({
                      type: "delete",
                      ids: [...selected],
                      label: selectedRows.length === 1 ? labelOf(selectedRows[0]) : undefined,
                    })
                  }
                >
                  <DIcon name="trash" />
                  Xóa
                </button>
              )}
              {extraActions}
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
                  aria-label={`Tìm kiếm ${config.nounPhrase}`}
                />
                {searchInput && (
                  <button className="search-clear" aria-label="Xóa tìm kiếm" onClick={() => setSearchInput("")}>
                    ×
                  </button>
                )}
              </div>
              {config.filterField && (
                <>
                  <label className="filter-label" htmlFor="tkc-filter">
                    <DIcon name="filter" />
                    {config.filterField.label}
                  </label>
                  <select
                    id="tkc-filter"
                    className="select"
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Tất cả</option>
                    {filterOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <div className="count">
                Tổng số bản ghi: <strong>{filtered.length}</strong>
              </div>
            </div>
            <div className="toolbar-right">
              {config.canExcel !== false && (
                <>
              <input
                ref={importRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) handleImport(file);
                }}
              />
              <button className="btn" disabled={isImporting} onClick={() => importRef.current?.click()}>
                <DIcon name="upload" />
                {isImporting ? "Đang nhập…" : "Tải lên (Excel)"}
              </button>
              <button
                className="btn"
                title="Tải file Excel của các dòng đã chọn (không chọn dòng nào = tải file mẫu)"
                onClick={handleExport}
              >
                <DIcon name="download" />
                Tải xuống (Excel)
              </button>
                </>
              )}
              <ColumnToggleButton layout={layout} columns={cols} />
              <TableLayoutButton layout={layout} columns={cols} />
              <button className="btn btn-icon" title="Làm mới danh sách" aria-label="Làm mới" onClick={() => refetch()}>
                <DIcon name="refresh" />
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className={`data-table ${layout.tableClass}`} style={{ minWidth: 46 + 62 + shownTotal + 124 }}>
              <colgroup>
                <col style={{ width: 46 }} />
                <col style={{ width: 62 }} />
                {shownCols.map((c) => (
                  <col key={c.key} style={{ width: layout.widthOf(c.key) }} />
                ))}
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input
                      className="checkbox"
                      type="checkbox"
                      aria-label="Chọn tất cả bản ghi trên trang"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleAllVisible(e.target.checked)}
                    />
                  </th>
                  <th>STT</th>
                  {shownCols.map((c) => (
                    <th key={c.key} className={c.sortable ? "sortable" : undefined} onClick={c.sortable ? () => toggleSort(c.key) : undefined}>
                      <span className="th-inner">
                        <span className="th-label" title={c.label}>
                          {c.label}
                        </span>
                        <span className="th-tools">
                          {c.sortable && sortIcon(c.key)}
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
                  ))}
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, idx) => {
                  const id = Number(r.id);
                  return (
                    <tr key={id} className={selected.has(id) ? "checked" : undefined}>
                      <td className="center">
                        <input
                          className="checkbox"
                          type="checkbox"
                          aria-label="Chọn dòng"
                          checked={selected.has(id)}
                          onChange={() => toggleOne(id)}
                        />
                      </td>
                      <td className="center">{start + idx + 1}</td>
                      {shownCols.map((c, ci) => {
                        const text = textOf(r, c.key);
                        return (
                          <td key={c.key} className={ci === 0 ? "code" : undefined} title={text}>
                            {c.checkbox && text ? <DIcon name="check" style={{ color: "#12a26d", width: 18, height: 18 }} /> : text}
                          </td>
                        );
                      })}
                      <td className="actions-cell">
                        <div className="row-actions">
                          <button className="row-action edit" title="Chỉnh sửa" onClick={() => setModal({ type: "edit", records: [r] })}>
                            <DIcon name="edit" />
                          </button>
                          {extraRowActions?.(r)}
                          {canCreate && (
                            <button className="row-action copy" title="Sao chép" onClick={() => setModal({ type: "copy", records: [r] })}>
                              <DIcon name="copy" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="row-action delete"
                              title="Xóa"
                              onClick={() => setModal({ type: "delete", ids: [id], label: labelOf(r) })}
                            >
                              <DIcon name="trash" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!isLoading && visible.length === 0 && (
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

      {(modal?.type === "add" || modal?.type === "edit" || modal?.type === "copy") && (
        <CatalogDesignModal
          config={config}
          records={modal.type === "edit" ? modal.records : null}
          copyFrom={modal.type === "copy" ? modal.records : null}
          onClose={() => setModal(null)}
          onSaved={() => {
            setSelected(new Set());
            refetch();
          }}
        />
      )}
      {modal?.type === "delete" && (
        <DesignConfirmDelete
          count={modal.ids.length}
          label={modal.label}
          busy={busy}
          onClose={() => setModal(null)}
          onConfirm={() => confirmDelete(modal.ids)}
        />
      )}
    </div>
  );
}
