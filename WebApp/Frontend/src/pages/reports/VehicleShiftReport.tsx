import { Typography, IconButton, Paper, Grid, Box } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import ReportGrid from '../../components/design/ReportGrid';
import React, { useEffect, useState } from 'react'
import { Department, Shift } from '../../types';
import dayjs from 'dayjs';
import { userAtom } from '../../atoms/userAtoms';
import { useAtom } from 'jotai';

export default function VehicleShiftReport({ data,
    signatureUrl,
    maxTrip,
    materials,
    startDate,
    endDate,
    shifts,
    department
}: {
    data: any[]; signatureUrl: string | null,
    maxTrip: number,
    materials: any[],
    startDate: dayjs.Dayjs | null,
    endDate: dayjs.Dayjs | null,
    shifts: Shift[],
    department: Department | null
}) {
    const [user] = useAtom(userAtom)

    const reportColumns: GridColDef[] = [
        {
            field: 'STT', headerName: 'STT', flex: 0.4,
            renderCell: (params: GridRenderCellParams) => {
                const sortedIds = params.api.getSortedRowIds();
                const index = sortedIds.indexOf(params.id);
                return index >= 0 ? index + 1 : '';
            },
        },
        {
            field: 'code', headerName: 'Số xe', flex: 0.4,
            renderCell: (params: any) => params.row.code || '',
        },
        {
            field: 'warning',
            headerName: 'Tình trạng hư/ hỏng',
            flex: 1,
        },
        { field: 'result', headerName: 'Kết quả sửa chữa trong ca', flex: 1 },
        { field: 'repairDepartment', headerName: 'Đơn vị sửa chữa', flex: 0.4 },
        { field: 'note', headerName: 'Ghi chú', flex: 1 },
    ];

    return (
        <Grid item xs={12}>
            <Paper sx={{ minHeight: "80vh", overflowX: 'auto', padding: 1, width: '100%', }}>
                <i style={{ fontSize: 20 }}>CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV</i>
                <Typography textAlign={'center'} mb={2} variant='h3' fontWeight={'bold'}>Xe không hoạt động</Typography>
                <Typography>Đơn vị: {department ? department.code : user?.department?.code}</Typography>
                <Typography>Từ ngày: {startDate?.format('DD-MM-YYYY')}</Typography>
                <Typography>Đến ngày: {endDate?.format('DD-MM-YYYY')}</Typography>
                <Typography>Ca: {shifts.map(s => s.name).join(', ')}</Typography>
                <ReportGrid rows={data} columns={reportColumns} getRowId={(row) => row._id} />
                {signatureUrl && (
                    <Box mt={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <img src={signatureUrl} alt="Chữ ký" style={{ maxWidth: 200, maxHeight: 100 }} />
                    </Box>
                )}
            </Paper>

        </Grid>
    )
}
