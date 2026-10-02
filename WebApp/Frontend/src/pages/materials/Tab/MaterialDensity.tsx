import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete,
  Edit,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import api from "../../../config/api.config";
import {
  showConfirmAlert,
  showErrorAlert,
  showSuccessAlert,
} from "../../../components/Alert";
import CustomDataGrid from "../../../components/Table/CustomDataGrid";
import dayjs from "dayjs";
import { Table } from "antd";
import ModelEditor from "./MaterialDensityEditor";

interface HistoryTimeSlot {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
}

const MaterialDensity: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] =
    useState<HistoryTimeSlot | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<HistoryTimeSlot[]>(
    [],
  );
  const [editorKey, setEditorKey] = useState(Date.now());
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const queryClient = useQueryClient();

  // 🟦 Load MATERIAL + density/dryDensity theo time slot
  const { data: materials = [] } = useQuery({
    queryKey: ["materials", selectedTimeSlot],
    queryFn: () =>
      api
        .get(
          `/materials?startTime=${selectedTimeSlot?.startTime?.toISOString() ?? ""}&endTime=${selectedTimeSlot?.endTime?.toISOString() ?? ""}`,
        )
        .then((res) => res.data.data),
  });

  // 🟦 Tự động tạo danh sách TimeSlot từ valueHistory
  const timeSlots = useMemo(() => {
    const list: HistoryTimeSlot[] = [];
    const seen = new Set();

    materials.forEach((m: any) => {
      (m.valueHistory || []).forEach((h: any) => {
        const key = `${h.startTime}-${h.endTime}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: key,
            startTime: h.startTime ? new Date(h.startTime) : null,
            endTime: h.endTime ? new Date(h.endTime) : null,
          });
        }
      });
    });

    return list.sort((a, b) => {
      const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return tB - tA;
    });
  }, [materials]);

  // 🟦 Tạo TimeSlot mới
  const handleCreateNewSlot = () => {
    setExpanded(true);
    setSelectedTimeSlot(null);
    setEditorKey(Date.now());
    setExpandedRowKeys([]);
  };

  // 🟦 Các cột hiển thị trong bảng Expanded
  const defaultColumns = [
    { id: "material", label: "Vật liệu" },
    { id: "acceptedProduct", label: "Sản phẩm nghiệm thu" },
    { id: "density", label: "Tỷ trọng quy ẩm" },
    { id: "dryDensity", label: "Tỷ trọng không quy ẩm" },
  ];

  // 🟦 Row bảng con
  const rows = useMemo(() => {
    return materials.map((m: any) => ({
      id: m._id,
      material: m.name,
      acceptedProduct: m.acceptedProduct,
      density: m.density,
      dryDensity: m.dryDensity,
    }));
  }, [materials]);

  // 🟦 Xóa TimeSlot
  const deleteMutation = useMutation({
    mutationFn: (slots: { startTime: string; endTime: string }[]) =>
      api
        .delete(`/materials/timeslots`, { data: { slots } })
        .then((r) => r.data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      showSuccessAlert("Xóa thành công");
      setSelectedTimeSlots([]);
    },

    onError: (err: any) => showErrorAlert(err.message),
  });

  const handleDelete = () => {
    if (selectedTimeSlots.length === 0)
      return showErrorAlert("Chọn ít nhất 1 khoảng thời gian");

    showConfirmAlert("Xóa các khoảng thời gian đã chọn?").then((res) => {
      if (res.isConfirmed) {
        const payload = selectedTimeSlots.map((slot) => ({
          startTime: dayjs(slot.startTime).toISOString(),
          endTime: dayjs(slot.endTime).toISOString(),
        }));

        deleteMutation.mutate(payload);
      }
    });
  };

  // 🟦 Expand xem bảng tỷ trọng
  const handleExpand = (expanded: boolean, record: HistoryTimeSlot) => {
    if (expanded) {
      setExpandedRowKeys([record.id]);
      setSelectedTimeSlot(record);
    } else {
      setExpandedRowKeys([]);
      setSelectedTimeSlot(null);
    }
  };

  return (
    <Box sx={{ mb: 2, mt: 2 }}>
      {/* FORM EDITOR */}
      <Accordion sx={{ mb: 2 }} expanded={expanded}>
        <AccordionSummary expandIcon={<></>}>
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
            initialSlot={selectedTimeSlot}
            timeSlots={timeSlots}
            onCancel={() => {
              setExpanded(false);
              setSelectedTimeSlot(null);
              setExpandedRowKeys([]);
            }}
          />
        </AccordionDetails>
      </Accordion>

      {/* DANH SÁCH TIME SLOT */}
      <Box sx={{ height: "60vh" }}>
        <Paper>
          <Table
            columns={[
              {
                title: "Thời gian",
                render: (_, r) => (
                  <Typography>
                    Từ: {dayjs(r.startTime).format("DD-MM-YYYY")} — Đến:{" "}
                    {dayjs(r.endTime).format("DD-MM-YYYY")}
                  </Typography>
                ),
              },
              {
                title: "Xem",
                width: 80,
                render: (_, r) => {
                  const isEx = expandedRowKeys.includes(r.id);
                  return (
                    <IconButton onClick={() => handleExpand(!isEx, r)}>
                      {isEx ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  );
                },
              },
              {
                title: "Sửa",
                width: 80,
                render: (_, r) => (
                  <IconButton
                    onClick={() => {
                      setExpanded(true);
                      setSelectedTimeSlot(r);
                      setExpandedRowKeys([]);
                      setEditorKey(Date.now());
                    }}
                  >
                    <Edit />
                  </IconButton>
                ),
              },
            ]}
            rowKey="id"
            dataSource={timeSlots}
            expandable={{
              expandedRowKeys,
              onExpand: handleExpand,
              showExpandColumn: false,
              expandedRowRender: () => (
                <Box sx={{ maxWidth: "92vw" }}>
                  <CustomDataGrid
                    rows={rows}
                    defaultColumns={defaultColumns}
                    rowCount={rows.length}
                  />
                </Box>
              ),
            }}
            rowSelection={{
              type: "checkbox",
              selectedRowKeys: selectedTimeSlots.map((s) => s.id),
              onChange: (_, rows) => setSelectedTimeSlots(rows),
            }}
          />
        </Paper>
      </Box>
    </Box>
  );
};

export default MaterialDensity;
