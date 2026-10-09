import React from "react";
import {
    DataGrid,
    GridColDef,
    GridToolbar,
    GridRowSelectionModel,
} from "@mui/x-data-grid";
import { Paper } from "@mui/material";
import type { GridRenderCellParams } from "@mui/x-data-grid";

interface ColumnDef {
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
    const columns: GridColDef[] = [
        ...(showIndex ? [indexColumn] : []),
        ...defaultColumns.map((col) => ({
            field: col.id,
            headerName: col.label,
            headerAlign: col.headerAlign ?? "center",
            align: col.align ?? "center",
            width: col.width,
            flex: col.flex ?? (col.width ? undefined : 1),
            minWidth: col.minWidth ?? 120,
            sortable: col.sortable ?? true,
            filterable: col.filterable ?? true,
            renderCell: col.renderCell,
            resizable: col.resizable ?? true,
        })),
    ];

    return (
        <Paper sx={{ width: "100%", overflowX: "auto",}}>
            <DataGrid
                rows={rows}
                columns={columns}
                getRowId={(row) => (getRowId ? getRowId(row) : (row._id ?? row.id))}
                pageSizeOptions={[10, 20, 50]}
                autoHeight
                disableRowSelectionOnClick
                checkboxSelection={isAdmin}
                onRowSelectionModelChange={(newSelection: GridRowSelectionModel) =>
                    onSelectionChange?.(newSelection as string[])
                }
                initialState={{
                    pagination: {
                        paginationModel: { pageSize: 10, page: 0 },
                    },
                    density: "compact"
                }}
                loading={isLoading}
                slots={{ toolbar: GridToolbar }}
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
                    filterPanel: { disableAddFilterButton: false },
                    toolbar: {
                        csvOptions: { disableToolbarButton: true },
                        printOptions: { disableToolbarButton: true },
                    },
                }}
                sx={[
                    {
                        // cỡ chữ, màu đầu cột, nền dòng... do theme/catalogTheme.tsx quyết định (chuẩn "Chủng loại hàng")
                        "& .MuiDataGrid-columnHeaderTitle": {
                            textAlign: "center",
                        },
                    },
                    sx,
                ]}
            />
        </Paper>
    );
};

export default CustomDataGrid;