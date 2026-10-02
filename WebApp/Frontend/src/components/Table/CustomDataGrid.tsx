import React from "react";
import {
  DataGrid,
  GridColDef,
  GridToolbar,
  GridRowSelectionModel,
} from "@mui/x-data-grid";
import { Paper } from "@mui/material";
import type { GridRenderCellParams, GridRowParams } from "@mui/x-data-grid";

export interface ColumnDef {
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
  rowCount?: number;
  paginationMode?: "server" | "client";
  paginationModel?: { page: number; pageSize: number };
  onPaginationModelChange?: (model: any) => void;
  isAdmin?: boolean;
  onEdit?: (row: any) => void;
  onSelectionChange?: (ids: string[]) => void;
  isLoading?: boolean;
  getRowId?: (row: any) => string;
  sx?: any;
  rowSelection?: boolean;
  isRowSelectable?: (params: GridRowParams) => boolean;
}

const CustomDataGrid: React.FC<CustomDataGridProps> = ({
  rows,
  defaultColumns,
  paginationMode = "client",
  rowCount = 0,
  paginationModel,
  onPaginationModelChange,
  isAdmin = false,
  onSelectionChange,
  isLoading = false,
  getRowId,
  rowSelection = true,
  sx,
  isRowSelectable,
}) => {
  const columns: GridColDef[] = [
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
    <Paper sx={{ width: "100%", overflowX: "auto" }}>
      <DataGrid
        rows={rows}
        columns={columns}
        rowCount={rowCount}
        paginationMode={paginationMode}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        getRowId={(row) => (getRowId ? getRowId(row) : (row._id ?? row.id))}
        pageSizeOptions={[10, 20, 50]}
        autoHeight
        disableRowSelectionOnClick
        checkboxSelection={isAdmin}
        rowSelection={rowSelection}
        isRowSelectable={isRowSelectable}
        onRowSelectionModelChange={(newSelection: GridRowSelectionModel) =>
          onSelectionChange?.(newSelection as string[])
        }
        initialState={{
          pagination: {
            paginationModel: paginationModel,
          },
          density: "compact",
        }}
        loading={isLoading}
        slots={{ toolbar: GridToolbar }}
        disableVirtualization={true}
        localeText={{
          toolbarColumns: "Cột",
          toolbarFilters: "Bộ lọc",
          toolbarDensity: "Mật độ",
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
            "& .MuiDataGrid-columnHeaderTitle": {
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 16,
            },
            "& .MuiDataGrid-row:nth-of-type(odd)": {
              backgroundColor: "#e3f2fd",
            },
            "& .MuiDataGrid-row:nth-of-type(even)": {
              backgroundColor: "white",
            },
          },
          sx,
        ]}
      />
    </Paper>
  );
};

export default CustomDataGrid;
