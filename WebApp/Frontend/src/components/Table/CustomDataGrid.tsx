import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    DataGrid,
    GridColDef,
    GridRowSelectionModel,
    GridSortModel,
    GridColumnVisibilityModel,
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarFilterButton,
    useGridApiRef,
} from "@mui/x-data-grid";
import { Paper } from "@mui/material";
import type { GridApiCommunity } from "@mui/x-data-grid/internals";
import DataGridLayoutButton, { HEADER_HEIGHT, ROW_HEIGHT, type RowPreset } from "./DataGridLayoutButton";
import type { GridRenderCellParams } from "@mui/x-data-grid";
import ExcelFilterPopup, { distinctSorted } from "../design/ExcelFilterPopup";
import { ColumnToggleButton } from "../design/tableLayout";
import DIcon from "../design/DIcon";
import "../../styles/catalog-design.css";

/** Chữ hiển thị của một ô (đọc từ phần tử React mà renderCell trả về: chuỗi, nhãn Chip, con...). */
function nodeText(n: any): string {
    if (n == null || typeof n === "boolean") return "";
    if (typeof n === "string" || typeof n === "number") return String(n);
    if (Array.isArray(n)) return n.map(nodeText).filter(Boolean).join(" ");
    if (React.isValidElement(n)) {
        const p: any = n.props;
        if (typeof p?.label === "string" || typeof p?.label === "number") return String(p.label);
        return nodeText(p?.children);
    }
    return "";
}

interface ColumnDef {
    /** Giá trị dùng cho hộp lọc cột kiểu Excel (mặc định: chữ hiển thị của ô). */
    filterValue?: (row: any) => string;
    resizable?: boolean;
    id: string;
    label: string;
    width?: number;
    minWidth?: number;
    flex?: number;
    align?: "center" | "left" | "right";
    headerAlign?: "center" | "left" | "right";
    sortable?: boolean;
    filterable?: boolean;
    renderCell?: (params: GridRenderCellParams<any>) => React.ReactNode;
}

interface CustomDataGridProps {
    rows: any[];
    defaultColumns: ColumnDef[];
    isAdmin?: boolean;
    onEdit?: (row: any) => void;
    onSelectionChange?: (ids: string[]) => void;
    isLoading?: boolean;
    getRowId?: (row: any) => string;
    sx?: any;
    /** Cột STT đứng đầu (như trang danh mục chuẩn); tắt nếu trang tự có cột số thứ tự */
    showIndex?: boolean;
}

/** Số dòng hiển thị tối đa không cuộn (cũng là số dòng mặc định mỗi trang). */
const VISIBLE_ROWS = 15;

// Cột STT dùng chung cho các bảng danh mục (số thứ tự theo vị trí đang hiển thị, cộng dồn qua các trang)
export const indexColumn: GridColDef = {
    field: "__stt",
    headerName: "STT",
    width: 64,
    minWidth: 64,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    headerAlign: "center",
    align: "center",
    renderCell: (params) => {
        // số thứ tự theo vị trí đang hiển thị, cộng dồn qua các trang
        const model = params.api.state.pagination.paginationModel;
        return params.api.getRowIndexRelativeToVisibleRows(params.id) + model.page * model.pageSize + 1;
    },
};

// Thuộc tính riêng cho thanh công cụ của lưới: nút "Hiển thị bảng" (kiểu cột / chiều cao hàng / độ rộng từng cột)
declare module "@mui/x-data-grid" {
    interface ToolbarPropsOverrides {
        apiRef?: React.MutableRefObject<GridApiCommunity>;
        lockedFields?: string[];
        onUserSized?: (userSized: boolean) => void;
        /** hiện nút "Hiển thị bảng" ngay trong thanh công cụ của lưới (trang khác tự đặt nút ở thanh công cụ trang thì tắt) */
        showLayout?: boolean;
        rowPreset?: RowPreset;
        onRowPreset?: (p: RowPreset) => void;
    }
}

export const AUTOSIZE = { includeHeaders: true, includeOutliers: true, expand: true } as const;

/** Thanh công cụ của lưới: Cột / Bộ lọc (+ Hiển thị bảng nếu `showLayout`). */
export const LayoutToolbar: React.FC<{
    apiRef?: React.MutableRefObject<GridApiCommunity>;
    lockedFields?: string[];
    onUserSized?: (userSized: boolean) => void;
    showLayout?: boolean;
    rowPreset?: RowPreset;
    onRowPreset?: (p: RowPreset) => void;
}> = ({ apiRef, lockedFields, onUserSized, showLayout, rowPreset = "standard", onRowPreset }) => (
    <GridToolbarContainer>
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        {showLayout && apiRef ? (
            <DataGridLayoutButton apiRef={apiRef} lockedFields={lockedFields} onUserSized={onUserSized} rowPreset={rowPreset} onRowPreset={onRowPreset ?? (() => {})} />
        ) : null}
    </GridToolbarContainer>
);

/**
 * Thanh công cụ của lưới theo MẪU Lệnh sản xuất: nút "Hiển thị cột" (tick từng cột) + "Hiển thị bảng" (độ rộng cột / chiều cao hàng),
 * dạng biểu tượng. Bọc trong `.tkc.tkc-inline` để dùng kiểu nút `.btn` của thiết kế mà không kéo theo nền/lề của trang `.tkc`.
 * (Bộ lọc nằm ở từng tiêu đề cột — ⋮ — nên không còn nút "Bộ lọc" chung.)
 */
const DesignGridToolbar: React.FC<{
    apiRef?: React.MutableRefObject<GridApiCommunity>;
    lockedFields?: string[];
    onUserSized?: (userSized: boolean) => void;
    rowPreset?: RowPreset;
    onRowPreset?: (p: RowPreset) => void;
    colList?: { key: string; label: string }[];
    hiddenCols?: Set<string>;
    onToggleCol?: (key: string) => void;
    onShowAllCols?: () => void;
}> = ({ apiRef, lockedFields, onUserSized, rowPreset = "standard", onRowPreset, colList = [], hiddenCols = new Set<string>(), onToggleCol, onShowAllCols }) => (
    <GridToolbarContainer>
        <div className="tkc tkc-inline" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end", width: "100%", padding: "4px 2px" }}>
            <ColumnToggleButton
                layout={{ hidden: hiddenCols, toggleHidden: (k: string) => onToggleCol?.(k), showAll: () => onShowAllCols?.() }}
                columns={colList}
            />
            {apiRef ? (
                <DataGridLayoutButton
                    iconOnly
                    look="design"
                    apiRef={apiRef}
                    lockedFields={lockedFields}
                    onUserSized={onUserSized}
                    rowPreset={rowPreset}
                    onRowPreset={onRowPreset ?? (() => {})}
                />
            ) : null}
        </div>
    </GridToolbarContainer>
);

const CustomDataGrid: React.FC<CustomDataGridProps> = ({
    rows,
    defaultColumns,
    isAdmin = false,
    onSelectionChange,
    isLoading = false,
    getRowId,
    sx,
    showIndex = true,
}) => {
    const apiRef = useGridApiRef();
    const rowIdOf = (row: any) => (getRowId ? getRowId(row) : (row._id ?? row.id));

    // ── Lọc cột kiểu Excel (như Lệnh sản xuất): giá trị khác nhau của từng cột, tick để lọc ──
    const cellText = (col: ColumnDef, row: any): string => {
        if (col.filterValue) return col.filterValue(row) ?? "";
        const raw = row?.[col.id];
        if (col.renderCell) {
            try {
                const t = nodeText(col.renderCell({ row, value: raw, id: rowIdOf(row), field: col.id, api: apiRef.current } as any)).trim();
                if (t) return t;
            } catch {
                /* renderCell cần ngữ cảnh lưới — dùng giá trị thô */
            }
        }
        if (raw == null || typeof raw === "object") return "";
        return String(raw);
    };
    const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
    const [pop, setPop] = useState<{ id: string; label: string; anchor: HTMLElement } | null>(null);
    // chữ hiển thị của mọi ô (tính 1 lần cho mỗi lần dữ liệu/cột đổi)
    const texts = useMemo(() => rows.map((r) => defaultColumns.map((c) => cellText(c, r))), [rows, defaultColumns]); // eslint-disable-line react-hooks/exhaustive-deps
    const colIdx = useMemo(() => new Map(defaultColumns.map((c, i) => [c.id, i])), [defaultColumns]);
    const filterableCols = useMemo(() => {
        const set = new Set<string>();
        defaultColumns.forEach((c, i) => {
            if (c.filterable === false) return;
            if (texts.some((t) => t[i])) set.add(c.id);
        });
        return set;
    }, [defaultColumns, texts]);
    const matchesOthers = (ri: number, skipId: string | null) =>
        Object.entries(colFilters).every(([id, sel]) => id === skipId || sel.includes(texts[ri]?.[colIdx.get(id) ?? 0] ?? ""));
    const filteredRows = useMemo(
        () => (Object.keys(colFilters).length ? rows.filter((_, ri) => matchesOthers(ri, null)) : rows),
        [rows, texts, colFilters], // eslint-disable-line react-hooks/exhaustive-deps
    );
    const popValues = useMemo(() => {
        if (!pop) return [] as string[];
        const ci = colIdx.get(pop.id) ?? 0;
        return distinctSorted(rows.map((_, ri) => ri).filter((ri) => matchesOthers(ri, pop.id)).map((ri) => texts[ri][ci] ?? ""));
    }, [pop, rows, texts, colFilters, colIdx]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sắp xếp bằng nút ⇅ ở tiêu đề + ẩn/hiện cột ──
    const [sortModel, setSortModel] = useState<GridSortModel>([]);
    const cycleSort = (field: string) => {
        const cur = sortModel.find((s) => s.field === field)?.sort;
        const next = !cur ? "asc" : cur === "asc" ? "desc" : null;
        setSortModel(next ? [{ field, sort: next }] : []);
    };
    const [hidden, setHidden] = useState<Set<string>>(new Set());
    const visibilityModel: GridColumnVisibilityModel = useMemo(() => Object.fromEntries([...hidden].map((k) => [k, false])), [hidden]);
    const colList = useMemo(() => defaultColumns.filter((c) => c.id !== "stt").map((c) => ({ key: c.id, label: c.label })), [defaultColumns]);

    const columns: GridColDef[] = [
        ...(showIndex ? [indexColumn] : []),
        ...defaultColumns.map((col) => {
            const canSort = col.sortable ?? true;
            const canFilter = filterableCols.has(col.id);
            const sortDir = sortModel.find((s) => s.field === col.id)?.sort;
            const filterActive = Boolean(colFilters[col.id]);
            return {
                field: col.id,
                headerName: col.label,
                headerAlign: col.headerAlign ?? "center",
                align: col.align ?? "center",
                width: col.width,
                // không flex mặc định: để "Vừa nội dung" (autosize) tự tính bề rộng theo chữ dài nhất
                flex: col.flex,
                minWidth: col.minWidth ?? 120,
                sortable: canSort,
                filterable: col.filterable ?? true,
                renderCell: col.renderCell,
                resizable: col.resizable ?? true,
                // tiêu đề = tên cột + ⇅ sắp xếp + ⋮ lọc kiểu Excel (đúng mẫu Lệnh sản xuất)
                renderHeader:
                    canSort || canFilter
                        ? () => (
                              <span className="xlh">
                                  <span className="xlh-label">{col.label}</span>
                                  <span className="xlh-tools">
                                      {canSort && (
                                          <button
                                              type="button"
                                              className={`xlh-btn ${sortDir ? "active" : ""}`}
                                              title={sortDir === "asc" ? "Đang tăng dần" : sortDir === "desc" ? "Đang giảm dần" : "Sắp xếp"}
                                              aria-label={`Sắp xếp theo ${col.label}`}
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  cycleSort(col.id);
                                              }}
                                          >
                                              <DIcon name="sort" />
                                          </button>
                                      )}
                                      {canFilter && (
                                          <button
                                              type="button"
                                              className={`xlh-btn ${filterActive ? "active" : ""}`}
                                              title={filterActive ? `Đang lọc ${colFilters[col.id].length} giá trị — bấm để sửa` : `Lọc theo ${col.label}`}
                                              aria-label={`Lọc theo ${col.label}`}
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  const anchor = e.currentTarget;
                                                  setPop((p) => (p?.id === col.id ? null : { id: col.id, label: col.label, anchor }));
                                              }}
                                          >
                                              <DIcon name="more-vertical" />
                                          </button>
                                      )}
                                  </span>
                              </span>
                          )
                        : undefined,
            } as GridColDef;
        }),
    ];

    // người dùng đã tự kéo cột thì không tự vừa nội dung lại khi dữ liệu đổi
    const userSized = useRef(false);
    const [rowPreset, setRowPreset] = useState<RowPreset>("standard");

    // ── Phân trang: mặc định 15 dòng/trang. Từ 15 dòng trở xuống bảng cao vừa đủ (không cuộn); chọn nhiều dòng hơn (20/50/100)
    //    thì khung giữ chiều cao 15 dòng và CUỘN DỌC bên trong, tiêu đề cột đứng yên ──
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: VISIBLE_ROWS });
    useEffect(() => setPaginationModel((m) => (m.page ? { ...m, page: 0 } : m)), [colFilters]);
    const rowsOnPage = Math.max(0, Math.min(paginationModel.pageSize, filteredRows.length - paginationModel.page * paginationModel.pageSize));
    const scrollMode = rowsOnPage > VISIBLE_ROWS;
    // tiêu đề + thanh công cụ (~56) + 15 dòng + chân trang (52) + thanh cuộn ngang (~17) + viền
    const scrollHeight = HEADER_HEIGHT + 56 + VISIBLE_ROWS * ROW_HEIGHT[rowPreset] + 52 + 17 + 2;
    useEffect(() => {
        if (isLoading || rows.length === 0 || userSized.current) return;
        const t = window.setTimeout(() => void apiRef.current?.autosizeColumns?.(AUTOSIZE), 60);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, isLoading, defaultColumns.length]);

    return (
        <Paper sx={{ width: "100%", overflowX: "auto",}}>
            <DataGrid
                className="xl-grid"
                rows={filteredRows}
                columns={columns}
                getRowId={(row) => rowIdOf(row)}
                pageSizeOptions={[15, 20, 50, 100]}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                autoHeight={!scrollMode}
                density="standard"
                rowHeight={ROW_HEIGHT[rowPreset]}
                columnHeaderHeight={HEADER_HEIGHT}
                disableRowSelectionOnClick
                checkboxSelection={isAdmin}
                onRowSelectionModelChange={(newSelection: GridRowSelectionModel) =>
                    onSelectionChange?.(newSelection as string[])
                }
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                columnVisibilityModel={visibilityModel}
                disableColumnMenu
                initialState={{
                    density: "standard",
                }}
                loading={isLoading}
                apiRef={apiRef}
                autosizeOptions={AUTOSIZE}
                onColumnWidthChange={() => {
                    userSized.current = true;
                }}
                slots={{ toolbar: DesignGridToolbar as any }}
                disableVirtualization={true}
                localeText={{
                    toolbarColumns: "Cột",
                    toolbarFilters: "Bộ lọc",
                    toolbarDensity: "Mật độ",
                    noRowsLabel: "Không có dữ liệu",
                    footerRowSelected: (count) => `Đã chọn ${count} dòng`,
                    // chân trang giống trang danh mục chuẩn: "Số dòng: 10 ... Hiển thị 1–3 trong tổng 3 bản ghi"
                    MuiTablePagination: {
                        labelRowsPerPage: "Số dòng:",
                        labelDisplayedRows: ({ from, to, count }) =>
                            `Hiển thị ${from}–${to} trong tổng ${count === -1 ? `hơn ${to}` : count} bản ghi`,
                    },
                }}
                slotProps={{
                    pagination: { showFirstButton: true, showLastButton: true } as any,
                    filterPanel: { disableAddFilterButton: false },
                    toolbar: {
                        apiRef,
                        rowPreset,
                        onRowPreset: setRowPreset,
                        onUserSized: (v: boolean) => {
                            userSized.current = v;
                        },
                        colList,
                        hiddenCols: hidden,
                        onToggleCol: (k: string) =>
                            setHidden((p) => {
                                const n = new Set(p);
                                if (n.has(k)) n.delete(k);
                                else n.add(k);
                                return n;
                            }),
                        onShowAllCols: () => setHidden(new Set()),
                    } as any,
                }}
                sx={[
                    {
                        // cỡ chữ, màu đầu cột, nền dòng... do theme/catalogTheme.tsx quyết định (chuẩn "Chủng loại hàng")
                        "& .MuiDataGrid-columnHeaderTitle": {
                            textAlign: "center",
                        },
                        ...(scrollMode ? { height: scrollHeight } : {}),
                    },
                    sx,
                ]}
            />
            {pop && (
                <ExcelFilterPopup
                    key={pop.id}
                    anchor={pop.anchor}
                    title={pop.label}
                    values={popValues}
                    selected={colFilters[pop.id] ?? null}
                    onApply={(sel) => {
                        setColFilters((p) => {
                            const n = { ...p };
                            if (sel) n[pop.id] = sel;
                            else delete n[pop.id];
                            return n;
                        });
                        setPop(null);
                    }}
                    onClose={() => setPop(null)}
                />
            )}
        </Paper>
    );
};

export default CustomDataGrid;
