import { Typography, IconButton, Paper, Grid, Box } from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import ReportGrid from '../../components/design/ReportGrid';
import React, { useEffect, useState } from 'react'
import { Department, Shift } from '../../types';
import { useAtom } from 'jotai';
import { userAtom } from '../../atoms/userAtoms';
import dayjs from 'dayjs';

export default function WorkLogReport({ data,
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
            field: 'STT', headerName: 'STT', width: 50, align: 'center', headerAlign: 'center',
            renderCell: (params: GridRenderCellParams) => {
                const sortedIds = params.api.getSortedRowIds();
                const index = sortedIds.indexOf(params.id);
                return index >= 0 ? index + 1 : '';
            },
        },
        {
            field: 'fullName', headerName: 'Họ và tên', flex: 1, headerAlign: 'center',
        },
        {
            field: 'salaryCode', headerName: 'Số thẻ', flex: 0.5, headerAlign: 'center',
        },
        {
            field: 'device', headerName: 'Thiết bị vận hành, vị trí làm việc', flex: 1, headerAlign: 'center',
        },
        {
            field: 'eatPosition', headerName: 'Vị trí ăn', flex: 0.5, headerAlign: 'center',
        },
        {
            field: 'lv1Salary', headerName: 'Lương cấp bậc 1 ngày', flex: 0.5, headerAlign: 'center',
        }, {
            field: 'productSalary', headerName: 'Lương sản phẩm', flex: 0.5, headerAlign: 'center',
        },
        {
            field: 'job',
            headerName: 'Nội dung công việc và TH SP trong ca', headerAlign: 'center',
            flex: 1,
        },
        { field: 'generalNote', headerName: 'Ghi chú', flex: 1, headerAlign: 'center' },
    ];

    return (
        <Grid item xs={12}>
            <Paper sx={{ minHeight: "80vh", overflowX: 'auto', padding: 1, width: '100%', }}>
                <i style={{ fontSize: 20 }}>CÔNG TY CỔ PHẦN THAN CAO SƠN-TKV</i>
                <Typography textAlign={'center'} mb={2} variant='h3'>Danh sách báo công</Typography>
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
