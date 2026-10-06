import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { Close as CloseIcon, TouchApp as TouchAppIcon } from "@mui/icons-material";
import { format } from "date-fns";
import { JobTypeEnum } from "../../enums/index";
import { StatusPill } from "./orderStatus";

const LINE = "#e5e9f0";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box sx={{ py: 1, borderTop: `1px solid ${LINE}` }}>
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        color: "#64748b",
        mb: 0.5,
      }}
    >
      {title}
    </Typography>
    <Box sx={{ display: "grid", gap: 0.75 }}>{children}</Box>
  </Box>
);

const Field = ({ label, children }: { label: string; children?: React.ReactNode }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>{label}</Typography>
    <Typography sx={{ fontSize: 13.5, color: "#0f172a", wordBreak: "break-word" }}>
      {children || "—"}
    </Typography>
  </Box>
);

const Person = ({ title, person }: { title: string; person?: any }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography sx={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>{title}</Typography>
    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
      {person?.fullName || "—"}
    </Typography>
    <Typography sx={{ fontSize: 12, color: "#475569" }}>
      Số thẻ: <b>{person?.salaryCode || "—"}</b>
      {"  ·  "}
      Chức vụ: <b>{person?.position?.name || "—"}</b>
    </Typography>
  </Box>
);

const OrderDetailPanel = ({ order, onClose }: { order: any | null; onClose: () => void }) => {
  const assistantLabel =
    order?.job?.type === JobTypeEnum.VEHICLE
      ? "Lái xe bổ túc"
      : order?.job?.type === JobTypeEnum.MAINTENANCE
        ? "Phụ sửa chữa"
        : "Phụ máy";

  return (
    <Box
      sx={{
        position: "sticky",
        top: 8,
        maxHeight: "80vh",
        overflowY: "auto",
        bgcolor: "#fff",
        border: `1px solid ${LINE}`,
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 0.75,
          bgcolor: "#f8fafc",
          borderBottom: `1px solid ${LINE}`,
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 800 }}>
          Thông tin lệnh sản xuất
        </Typography>
        {order && <StatusPill status={order.status}/>}
        <IconButton size="small" onClick={onClose} title="Đóng" aria-label="Đóng chi tiết lệnh">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {!order ? (
        <Box sx={{ p: 4, textAlign: "center", color: "#94a3b8" }}>
          <TouchAppIcon sx={{ fontSize: 36, mb: 0.5 }} />
          <Typography sx={{ fontSize: 13 }}>
            Bấm vào một dòng trong bảng để xem chi tiết lệnh
          </Typography>
        </Box>
      ) : (
        <Box sx={{ px: 1.5, pb: 1 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 1,
              py: 1,
            }}
          >
            <Field label="Đơn vị">{order.assignedTo?.department?.code}</Field>
            <Field label="Ngày">
              {order.workingDate ? format(new Date(order.workingDate), "dd-MM-yyyy") : ""}
            </Field>
            <Field label="Ca">{order.shift?.name}</Field>
          </Box>

          <Section title="Người ra lệnh / nhận lệnh">
            <Person title="Người ra lệnh" person={order.createdBy} />
            <Person title="Người nhận lệnh" person={order.assignedTo} />
            {[
              JobTypeEnum.EXCAVATOR,
              JobTypeEnum.DRILL,
              JobTypeEnum.DOZER,
              JobTypeEnum.VEHICLE,
              JobTypeEnum.MAINTENANCE,
            ].includes(order.job?.type) && (
              <Field label={assistantLabel}>
                {(order.assistants || []).length > 0
                  ? (order.assistants || []).map((i: any, idx: number) => (
                      <Box component="span" key={i?._id || idx} sx={{ display: "block" }}>
                        {i?.fullName || ""} {i?.salaryCode || ""}
                      </Box>
                    ))
                  : null}
              </Field>
            )}
          </Section>

          <Section title="Công việc">
            <Field label="Công việc">{order.job?.name}</Field>
            {order.device?.length > 0 && (
              <Field label="Thiết bị vận hành">
                {order.device.map((dev: any) => dev.code).join(", ")}
              </Field>
            )}
            {order.repairDepartment && (
              <Field label="Đơn vị sửa chữa">{order.repairDepartment?.code}</Field>
            )}
            {[JobTypeEnum.MAINTENANCE].includes(order.job?.type) && (
              <Field label="Thiết bị sửa chữa">
                {(order.repairVehicles || []).length > 0
                  ? (order.repairVehicles || []).map((v: any, idx: number) => (
                      <Box component="span" key={v?._id || idx} sx={{ display: "block" }}>
                        <b>+ {v?.device?.code}</b>
                        {v?.note ? ` — ${v.note}` : ""}
                      </Box>
                    ))
                  : null}
              </Field>
            )}
            {order.assignedVehicles?.length > 0 && (
              <Field label="Thiết bị nhận tải">
                {order.assignedVehicles.map((dev: any) => dev?.code).join(", ")}
              </Field>
            )}
            {order.excavator?.length > 0 && (
              <Field label="Máy xúc">
                {order.excavator.map((dev: any) => dev.device?.code).join(", ")}
              </Field>
            )}
            {order.material?.length > 0 && (
              <Field label="Vật liệu">
                {order.material.map((m: any) => m.name).join(", ")}
              </Field>
            )}
            {order.location?.length > 0 && (
              <Field label="Điểm đổ">
                {order.location.map((l: any) => l.name).join(", ")}
              </Field>
            )}
          </Section>

          <Section title="Nội dung">
            <Field label="Nội dung lệnh">{order.workContent}</Field>
            <Field label="Nội dung bàn giao ca">{order.note}</Field>
          </Section>
        </Box>
      )}
    </Box>
  );
};

export default OrderDetailPanel;
