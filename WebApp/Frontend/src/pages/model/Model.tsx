import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box,
    Button,
    Typography,
    Checkbox,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TablePagination,
    LinearProgress,
    FormControlLabel, // Thêm FormControlLabel
    TextField,
    Breadcrumbs,
    AccordionActions,
    Paper,
    IconButton, // Thêm TextField để nhập Date/Time
} from '@mui/material';
import {
    Save,
    ExpandMore,
    Add as AddIcon,
    Delete,
    Edit,
    Height,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import api from '../../config/api.config';
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from '../../components/Alert';
import CustomDataGrid from '../../components/Table/CustomDataGrid';
import { GridRowModel } from '@mui/x-data-grid';
import dayjs, { Dayjs } from 'dayjs';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import ModelEditor from './ModelEditor';
import { Table, TableColumnsType } from 'antd';

// Định nghĩa kiểu dữ liệu cho một khoảng thời gian lịch sử
interface HistoryTimeSlot {
    id: string; // Dùng UUID hoặc một giá trị duy nhất
    startTime: Date | null;
    endTime: Date | null;
}

const Models: React.FC = () => {

    const [expanded, setExpanded] = useState(false);
    // --- State Mới ---
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<HistoryTimeSlot | null>(null);
    const [selectedTimeSlots, setSelectedTimeSlots] = useState<HistoryTimeSlot[]>([]);
    const [timeSlots, setTimeSlots] = useState<HistoryTimeSlot[]>([]);
    const [editorKey, setEditorKey] = useState(Date.now());

    const { data: materials = [] } = useQuery({ queryKey: ['materials'], queryFn: () => api.get(`/materials`).then(res => res.data.data), });
    const { data: devicemodels = [] } = useQuery({ queryKey: ['devicemodels'], queryFn: () => api.get(`/devicemodels`).then(res => res.data.data), });


    const queryClient = useQueryClient()

    // Lấy tất cả models để tạo các khoảng thời gian duy nhất
    const { data: models = [] } = useQuery({
        queryKey: ['models', selectedTimeSlot],
        queryFn: () => api.get(`/models?startTime=${selectedTimeSlot?.startTime ? selectedTimeSlot?.startTime.toISOString() : ''}&endTime=${selectedTimeSlot?.endTime ? selectedTimeSlot?.endTime.toISOString() : ''}`).then(res => res.data.data),
    });

    useEffect(() => {
        if (models.length > 0) {
            const allHistory: HistoryTimeSlot[] = [];
            const seen = new Set();

            models.forEach((model: any) => {
                model.valueHistory.forEach((h: any) => {
                    const key = `${h.startTime}-${h.endTime}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        allHistory.push({
                            id: key,
                            startTime: h.startTime ? new Date(h.startTime) : null,
                            endTime: h.endTime ? new Date(h.endTime) : null,
                        });
                    }
                });
            });

            // sắp xếp giảm dần
            allHistory.sort((a, b) => {
                // b.startTime ?? 0: Nếu b.startTime là null/undefined, dùng 0.
                const timeB = new Date(b.startTime ?? 0).getTime();
                const timeA = new Date(a.startTime ?? 0).getTime();

                // Thực hiện phép trừ giữa hai timestamp (kiểu number)
                return timeB - timeA;
            });
            setTimeSlots(allHistory);
        }
    }, [models, selectedTimeSlot]);


    // Hàm xử lý khi tạo slot mới
    const handleCreateNewSlot = () => {
        setExpanded(true)
        setSelectedTimeSlot(null)
        setEditorKey(Date.now());
        setExpandedRowKeys([])
    };


    const defaultColumns = useMemo(() => {
        const staticCols = [
            { id: "material", label: "Vật liệu", width: 100, headerAlign: "center", align: "left", sortable: true, filterable: true, sticky: true, resizable: false, },
            { id: "acceptedProduct", label: "Sản phẩm nghiệm thu", width: 100, headerAlign: "center", align: "center", sortable: true, filterable: true, sticky: true, resizable: false, },
            { id: "density", label: "Tỷ trọng quy ẩm", width: 100, headerAlign: "center", align: "center", sortable: true, filterable: false, sticky: true, resizable: false, },
            { id: "dryDensity", label: "Tỷ trọng không quy ẩm", width: 100, headerAlign: "center", align: "center", sortable: true, filterable: false, sticky: true, resizable: false, },
        ];

        const dynamicCols = devicemodels.map((d: any) => ({
            id: d._id,
            label: d.name,
            width: 150,
            headerAlign: "center",
            align: "center",
            sortable: false,
            filterable: false,
            renderCell: (params: any) => params?.value || ''
        }));

        return [...staticCols, ...dynamicCols];
    }, [devicemodels, selectedTimeSlot]);


    // --- Logic Tạo Rows Dữ liệu theo Time Slot đã chọn ---
    const rows = useMemo(() => {
        if (!materials.length || !devicemodels.length) return [];
        return materials.map((m: any) => {
            const row: any = { id: m._id, material: m.name, acceptedProduct: m.acceptedProduct, density: m.density, dryDensity: m.dryDensity };
            devicemodels.forEach((d: any) => {
                const record = models.find(
                    (mdl: any) => mdl.material === m._id && mdl.deviceModel === d._id
                );
                row[d._id] = record ? record.value : '';
            });
            return row;
        });
    }, [materials, devicemodels, models]);

    const columnParent: TableColumnsType<HistoryTimeSlot> = [
        {
            title: 'Thời gian', dataIndex: 'name', key: 'name',
            render(value, record, index) {
                return <Typography>Từ: {dayjs(record.startTime).format("DD-MM-YYYY")} Đến: {dayjs(record.endTime).format("DD-MM-YYYY")}</Typography>
            },
        },
        {
            title: 'Xem',
            dataIndex: 'view',
            key: 'view',
            align: 'center',
            width: 80,
            render: (_, record) => {
                const isExpanded = expandedRowKeys.includes(record.id);
                return (
                    <IconButton
                        color="primary"
                        onClick={() => handleExpand(!isExpanded, record)} // 👈 gọi lại logic expand
                    >
                        {isExpanded ? <VisibilityOff color='secondary' /> : <Visibility color='secondary' />}
                    </IconButton>
                );
            },
        },
        {
            title: 'Sửa', dataIndex: 'edit', key: 'edit', width: 50,
            render: (value, record, index) => (
                <IconButton
                    color="primary"
                    onClick={async () => {
                        if (expanded) {
                            const result = await showConfirmAlert(
                                "Bạn đang cập nhật một mục. Nếu tiếp tục chỉnh sửa, dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?"
                            );
                            if (result.isConfirmed) {
                                setSelectedTimeSlot(record);
                                setExpandedRowKeys([])
                            }
                        } else {
                            setExpanded(true);
                            setSelectedTimeSlot(record);
                            setExpandedRowKeys([])
                        }
                    }}
                >
                    <Edit />
                </IconButton>
            ),
        }
    ]


    const deleteMutation = useMutation({
        mutationFn: (slots: { startTime: string; endTime: string }[]) =>
            api
                .delete(`/models`, { data: { slots } })
                .then((res) => res.data.message),
        onSuccess: (message) => {
            queryClient.invalidateQueries({ queryKey: ["models"] });
            setSelectedTimeSlots([]);
            showSuccessAlert(message || "Xóa thành công");
        },
        onError: (error: any) => {
            showErrorAlert(error.response?.data?.message || error.message || "Lỗi");
        },
    });


    const handleDelete = () => {
        if (selectedTimeSlots.length === 0) {
            return showErrorAlert("Vui lòng chọn ít nhất một khoảng thời gian cần xóa");
        }

        showConfirmAlert("Bạn có chắc muốn xóa các khoảng thời gian đã chọn?").then(
            (result) => {
                if (result.isConfirmed) {
                    const slotsToDelete = selectedTimeSlots.map((slot) => ({
                        startTime: dayjs(slot.startTime).toISOString(),
                        endTime: dayjs(slot.endTime).toISOString(),
                    }));
                    deleteMutation.mutate(slotsToDelete);
                }
            }
        );
    };

    // đóng mở bảng
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

    const handleExpand = (expanded: boolean, record: HistoryTimeSlot) => {
        if (expanded) {
            // Mở đúng 1 slot tại 1 thời điểm
            setExpandedRowKeys([record.id]);
            setSelectedTimeSlot(record);
        } else {
            setExpandedRowKeys([]);
            setSelectedTimeSlot(null);
        }
    };

    return (
        <Box>
            <Breadcrumbs aria-label="breadcrumb">
                <Typography>Danh mục</Typography>
                <Typography>Mô hình xe</Typography>
            </Breadcrumbs>

            <Typography variant="h3" color="brand.title" mt={3}>Mô hình xe</Typography>
            {/* Nút Lưu và Bảng Dữ liệu */}
            <Box sx={{ mb: 3, mt: 3 }}>
                <Accordion sx={{ mb: 2 }} expanded={expanded}>
                    <AccordionSummary
                        expandIcon={<></>}
                        aria-controls="panel1-content"
                        id="panel1-header"
                        sx={{
                            backgroundColor: "white",
                            "&.Mui-focusVisible": {
                                backgroundColor: "white",
                            },
                        }}
                    >
                        <Box display="flex" gap={2}>
                            <Button
                                variant="contained"
                                onClick={handleCreateNewSlot}
                                startIcon={<AddIcon />}
                            >
                                Tạo mới
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<Delete />}
                                color="error"
                                onClick={handleDelete}
                            >
                                Xóa
                            </Button>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <ModelEditor
                            key={editorKey}
                            materials={materials}
                            devicemodels={devicemodels}
                            initialSlot={
                                selectedTimeSlot
                            }
                            timeSlots={timeSlots}
                            onCancel={() => {
                                setSelectedTimeSlot(null)
                                setExpanded(false)
                                setExpandedRowKeys([])
                            }}
                            initValue={selectedTimeSlot ? models : []}
                        />
                    </AccordionDetails>
                </Accordion>
                <Box sx={{ height: '60vh' }}>
                    <Paper>
                        <Table<HistoryTimeSlot>
                            columns={columnParent}
                            rowKey="id"
                            expandable={{
                                expandedRowKeys,
                                onExpand: handleExpand,
                                showExpandColumn: false,
                                expandedRowRender: (record) => (
                                    <Box
                                        sx={{
                                            maxWidth: '92vw',
                                            border: '1px solid #eee',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <CustomDataGrid
                                            rows={rows}
                                            defaultColumns={defaultColumns}
                                            isLoading={false}
                                            onSelectionChange={() => { }}
                                            sx={{
                                                height: 400,
                                                '& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell': {
                                                    whiteSpace: 'nowrap',
                                                },
                                                '& .MuiDataGrid-virtualScroller': {
                                                    overflowX: 'auto !important',
                                                    overflowY: 'auto !important',
                                                },
                                                '& .MuiDataGrid-columnHeader[data-field="material"]': {
                                                    position: 'sticky',
                                                    left: 0,
                                                    zIndex: 20,
                                                    backgroundColor: 'inherit',
                                                },
                                                '& .MuiDataGrid-cell[data-field="material"]': {
                                                    position: 'sticky',
                                                    left: 0,
                                                    zIndex: 19,
                                                    backgroundColor: "inherit !important",
                                                },
                                                '& .MuiDataGrid-columnHeader[data-field="acceptedProduct"]': {
                                                    position: 'sticky',
                                                    left: 100,
                                                    zIndex: 20,
                                                    backgroundColor: 'inherit',
                                                },
                                                '& .MuiDataGrid-cell[data-field="acceptedProduct"]': {
                                                    position: 'sticky',
                                                    left: 100,
                                                    zIndex: 19,
                                                    backgroundColor: "inherit !important",
                                                },
                                                '& .MuiDataGrid-columnHeader[data-field="density"]': {
                                                    position: 'sticky',
                                                    left: 200,
                                                    zIndex: 20,
                                                    backgroundColor: 'inherit',
                                                },
                                                '& .MuiDataGrid-cell[data-field="density"]': {
                                                    position: 'sticky',
                                                    left: 200,
                                                    zIndex: 19,
                                                    backgroundColor: "inherit !important",
                                                },
                                                '& .MuiDataGrid-columnHeader[data-field="dryDensity"]': {
                                                    position: 'sticky',
                                                    left: 300,
                                                    zIndex: 20,
                                                    backgroundColor: 'inherit',
                                                    boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                                                },
                                                '& .MuiDataGrid-cell[data-field="dryDensity"]': {
                                                    position: 'sticky',
                                                    left: 300,
                                                    zIndex: 19,
                                                    backgroundColor: "inherit !important",
                                                    boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                                                },
                                            }}
                                        />
                                    </Box>
                                ),
                                rowExpandable: (record) => !!record.startTime,
                            }}
                            dataSource={timeSlots}
                            rowSelection={{
                                type: 'checkbox', // chỉ chọn 1 slot tại 1 thời điểm
                                selectedRowKeys: selectedTimeSlots.map((s) => s.id),
                                onChange: (keys, rows) => setSelectedTimeSlots(rows),
                            }}
                        />
                    </Paper>
                </Box>
            </Box>

        </Box >
    );
};

export default Models;