import React from "react";
import type { MiningRecord } from "@/modules/dataentry/types/thong-ke";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Pickaxe,
  MapPin,
  Layers,
} from "lucide-react";

interface MiningDetailPanelProps {
  record: MiningRecord;
}

// ─── Helper ─────────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; value?: string | number | null }> = ({
  label,
  value,
}) => {
  const display =
    value === undefined || value === null || String(value).trim() === ""
      ? "—"
      : String(value);
  return (
    <div className="flex items-baseline justify-between gap-2 py-1 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className="text-right font-medium text-foreground truncate max-w-[55%]"
        title={display}
      >
        {display}
      </span>
    </div>
  );
};

const SectionTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({
  icon,
  label,
}) => (
  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1 mt-1">
    {icon}
    <span>{label}</span>
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────
export const MiningDetailPanel: React.FC<MiningDetailPanelProps> = ({
  record,
}) => {
  const fuelCons =
    record.fuelConsumption ??
    (record.initialFuel != null &&
    record.receivedFuel != null &&
    record.finalFuel != null
      ? record.initialFuel + record.receivedFuel - record.finalFuel
      : null);

  const fuelDiffVal =
    record.fuelDiff ??
    (record.fuelNorm != null && fuelCons != null
      ? record.fuelNorm - fuelCons
      : null);

  const vehicleNo = record.transportVehicleNo || record.vehicleNo;

  return (
    <div className="space-y-3 text-xs">
      {/* Badge trang thai */}
      <div className="flex flex-wrap gap-1.5">
        {record.material && (
          <Badge
            variant="outline"
            className="text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400"
          >
            {record.material}
          </Badge>
        )}
        {record.mineCode && (
          <Badge
            variant="outline"
            className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400"
          >
            MX: {record.mineCode}
          </Badge>
        )}
        <Field label="Tháng / Ngày" value={`Tháng ${record.month ?? "-"} / Ngày ${record.day ?? "-"}`} />
        <Field label="Ca" value={record.shift} />
        <Field label="Máy xúc" value={record.mineCode} />
        <Field label="Tầng xúc" value={record.excavationBench} />
      </div>

      <Separator className="opacity-40" />

      {/* B. Chuyến xe nhận tải */}
      <SectionTitle icon={<Pickaxe className="h-3.5 w-3.5" />} label="B. Chuyến xe nhận tải" />
      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-1 divide-y divide-border/40">
        <Field label="Số xe nhận tải" value={vehicleNo} />
        <Field label="Chủng loại xe" value={record.vehicleType} />
        <Field label="Đơn vị quản lý thiết bị" value={record.vehicleManagementUnit} />
        <Field label="Số chuyến" value={record.tripCount} />
        <Field label="Nơi chất tải" value={record.pickupLocation} />
        <Field label="Vị trí đổ" value={record.dumpLocation} />
        <Field label="Vật liệu" value={record.material} />
        <Field label="Loại hàng / Mức tải" value={record.loadStatus} />
        <Field label="KL tạm tính (m³)" value={record.tempVolume != null ? `${record.tempVolume} m³` : undefined} />
        <Field label="TL tạm tính (tấn)" value={record.tempWeight != null ? `${record.tempWeight} tấn` : undefined} />
      </div>

      <Separator className="opacity-40" />

      {/* C. Nhiên liệu */}
      <SectionTitle icon={<Layers className="h-3.5 w-3.5" />} label="C. Nhiên liệu (Máy xúc)" />
      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-1 divide-y divide-border/40">
        <Field label="NL tồn đầu" value={record.initialFuel != null ? `${record.initialFuel} L` : undefined} />
        <Field label="NL lĩnh trong ca" value={record.receivedFuel != null ? `${record.receivedFuel} L` : undefined} />
        <Field label="NL tồn cuối" value={record.finalFuel != null ? `${record.finalFuel} L` : undefined} />
        <Field label="NL tiêu thụ" value={fuelCons != null ? `${fuelCons} L` : undefined} />
        <Field label="Định mức NL" value={record.fuelNorm != null ? `${record.fuelNorm} L` : undefined} />
        <Field
          label="Tiết kiệm / Vượt"
          value={
            fuelDiffVal != null
              ? fuelDiffVal >= 0
                ? `+${fuelDiffVal} L (Tiết kiệm)`
                : `${fuelDiffVal} L (Vượt)`
              : undefined
          }
        />
      </div>

      <Separator className="opacity-40" />

      {/* D. Người vận hành */}
      <SectionTitle icon={<MapPin className="h-3.5 w-3.5" />} label="D. Người vận hành" />
      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-1 divide-y divide-border/40">
        <Field label="Số thẻ lương" value={record.operatorBadgeNo} />
        <Field label="Họ tên tài xế" value={record.operatorName} />
        <Field label="Đơn vị công tác" value={record.operatorUnit} />
      </div>
    </div>
  );
};

export default MiningDetailPanel;
