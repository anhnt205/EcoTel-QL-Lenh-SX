import React, { useMemo, useState } from "react";
import { DataGrid, GridColDef, GridColumnVisibilityModel, useGridApiRef } from "@mui/x-data-grid";
import ExcelFilterPopup, { distinctSorted } from "./ExcelFilterPopup";
import { ColumnToggleButton } from "./tableLayout";
import DIcon from "./DIcon";
import "../../styles/catalog-design.css";

/**
 * Bảng phẳng trong "tờ giấy" báo cáo (Báo công / Xe không hoạt động / Báo ăn): giữ nguyên dáng để IN,
 * nhưng có lọc cột kiểu Excel (⋮ ở tiêu đề) + nút "Hiển thị cột" như Lệnh sản xuất.
 * Mọi nút điều khiển gắn `data-print-hide` nên KHÔNG xuất hiện khi in; cột đang ẩn / dòng đang lọc thì tờ in cũng theo đó.
 * Cột STT (field "STT") không lọc/sắp xếp và được đánh lại số theo các dòng còn lại.
 */
export default function ReportGrid({ rows, columns, getRowId }: { rows: any[]; columns: GridColDef[]; getRowId: (r: any) => string }) {
  const apiRef = useGridApiRef();
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [pop, setPop] = useState<{ field: string; label: string; anchor: HTMLElement } | null>(null);

  const textOf = (r: any, f: string) => {
    const v = r?.[f];
    return v == null || typeof v === "object" ? "" : String(v);
  };
  const filterable = (c: GridColDef) => c.field !== "STT";

  const filteredRows = useMemo(
    () => rows.filter((r) => Object.entries(filters).every(([f, sel]) => sel.includes(textOf(r, f)))),
    [rows, filters],
  );
  const popValues = useMemo(() => {
    if (!pop) return [] as string[];
    return distinctSorted(
      rows
        .filter((r) => Object.entries(filters).every(([f, sel]) => f === pop.field || sel.includes(textOf(r, f))))
        .map((r) => textOf(r, pop.field)),
    );
  }, [pop, rows, filters]);

  const cols: GridColDef[] = columns.map((c) => {
    if (!filterable(c)) return { ...c, sortable: false, filterable: false };
    const active = Boolean(filters[c.field]);
    return {
      ...c,
      renderHeader: () => (
        <span className="xlh">
          <span className="xlh-label">{c.headerName}</span>
          <span className="xlh-tools" data-print-hide="1">
            <button
              type="button"
              className={`xlh-btn ${active ? "active" : ""}`}
              title={active ? `Đang lọc ${filters[c.field].length} giá trị — bấm để sửa` : `Lọc theo ${c.headerName}`}
              aria-label={`Lọc theo ${c.headerName}`}
              onClick={(e) => {
                e.stopPropagation();
                const anchor = e.currentTarget;
                setPop((p) => (p?.field === c.field ? null : { field: c.field, label: String(c.headerName ?? c.field), anchor }));
              }}
            >
              <DIcon name="more-vertical" />
            </button>
          </span>
        </span>
      ),
    } as GridColDef;
  });

  const visibility: GridColumnVisibilityModel = useMemo(() => Object.fromEntries([...hidden].map((k) => [k, false])), [hidden]);
  const colList = columns.filter(filterable).map((c) => ({ key: c.field, label: String(c.headerName ?? c.field) }));

  return (
    <>
      <div data-print-hide="1" className="tkc tkc-inline" style={{ display: "flex", justifyContent: "flex-end", padding: "4px 0 8px" }}>
        <ColumnToggleButton
          layout={{
            hidden,
            toggleHidden: (k: string) =>
              setHidden((p) => {
                const n = new Set(p);
                if (n.has(k)) n.delete(k);
                else n.add(k);
                return n;
              }),
            showAll: () => setHidden(new Set()),
          }}
          columns={colList}
        />
      </div>
      <DataGrid
        className="xl-grid xl-report"
        rows={filteredRows}
        apiRef={apiRef}
        columns={cols}
        getRowId={getRowId}
        columnVisibilityModel={visibility}
        disableColumnMenu
        autoHeight
        hideFooter
        sx={{
          width: "100%",
          "& .MuiDataGrid-cell": { border: "1px solid black" },
          "& .MuiDataGrid-columnHeader": { border: "1px solid black" },
        }}
      />
      {pop && (
        <ExcelFilterPopup
          key={pop.field}
          anchor={pop.anchor}
          title={pop.label}
          values={popValues}
          selected={filters[pop.field] ?? null}
          onApply={(sel) => {
            setFilters((p) => {
              const n = { ...p };
              if (sel) n[pop.field] = sel;
              else delete n[pop.field];
              return n;
            });
            setPop(null);
          }}
          onClose={() => setPop(null)}
        />
      )}
    </>
  );
}
