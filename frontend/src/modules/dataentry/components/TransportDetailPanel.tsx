import React from "react";
import type { TransportRecord } from "@/modules/dataentry/types/thong-ke";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Fuel,
  Ruler,
  Info,
  Calendar,
} from "lucide-react";

interface TransportDetailPanelProps {
  record: TransportRecord;
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
export const TransportDetailPanel: React.FC<TransportDetailPanelProps> = ({
  record,
}) => {
  const calculatedFuelCons =
    record.fuelConsumption ??
    (record.initialFuel != null &&
    record.receivedFuel != null &&
    record.finalFuel != null
      ? record.initialFuel + record.receivedFuel - record.finalFuel
      : null);

  const operatorInfo = record.operatorName
    ? `${record.operatorName}${record.operatorBadgeNo ? ` (${record.operatorBadgeNo})` : ""}`
    : record.operatorBadgeNo;

  return (
    <div className="space-y-3 text-xs">
      {/* Badge trạng thái */}
      <div className="flex flex-wrap gap-1.5">
        <Badge
          variant="outline"
          className="text-xs bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400"
        >
          {record.cargoType || "N/A"}
        </Badge>
        {record.cargoGroup && (
          <Badge variant="outline" className="text-xs">
            {record.cargoGroup}
          </Badge>
        )}
        {(record.fleet || record.equipmentUnit) && (
          <Badge variant="secondary" className="text-xs">
            {record.fleet || record.equipmentUnit}
          </Badge>
        )}
      </div>

      {/* 1. Thông tin chung */}
      <SectionTitle icon={<Info className="h-3.5 w-3.5" />} label="Thông tin chung" />
      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-1 divide-y divide-border/40">
        <Field label="Tháng / Ngày" value={`Tháng ${record.month ?? "-"} / Ngày ${record.day ?? "-"}`} />
        <Field label="Ca" value={record.shift} />
        <Field label="Số xe" value={record.vehicleNo} />
        <Field label="Chủng loại xe" value={record.vehicleType} />
        <Field label="Đơn vị TB" value={record.equipmentUnit || record.fleet} />
        <Field label="Tài xế / Số thẻ" value={operatorInfo} />
        <Field label="Số chuyến" value={record.tripCount} />
        <Field label="Mã ca" value={record.shiftCode} />
      </div>

      <Separator className="opacity-40" />

      {/* 2. Hành trình */}
      <SectionTitle icon={<MapPin className="h-3.5 w-3.5" />} label="Hành trình & vị trí" />
      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-1 divide-y divide-border/40">
        <Field label="Khu xúc" value={record.excavationArea} />
        <Field label="Máy xúc / TB" value={record.excavatorEquipment} />
        <Field label="Nơi nhận tải" value={record.pickupLocation} />
        <Field label="Nơi dỡ tải" value={record.unloadLocationName} />
        <Field label="Mức tải / Roda" value={record.loadStatus || record.roda} />
      </div>

      <Separator className="opacity-40" />

      {/* 3. Kỹ thuật */}
      <SectionTitle icon={<Ruler className="h-3.5 w-3.5" />} label="Thông số kỹ thuật" />
      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-1 divide-y divide-border/40">
        <Field
          label="CĐ toàn tuyến"
          value={record.fullRouteDistance != null ? `${record.fullRouteDistance} km` : undefined}
        />
        <Field label="Nâng tải toàn tuyến" value={record.fullRouteElevate != null ? `${record.fullRouteElevate} m` : undefined} />
        <Field
          label="CĐ dốc cục bộ"
          value={record.localSlopeDist != null ? `${record.localSlopeDist} km` : undefined}
        />
        <Field label="Dốc cục bộ" value={record.localSlopeDegree != null ? `${record.localSlopeDegree} m` : undefined} />
        <Field label="Tầng nhận tải" value={record.pickupBench ?? record.extraLoad} />
        <Field label="Nhóm tầng nhận" value={record.pickupBenchGroup} />
        <Field label="Tầng dỡ tải" value={record.unloadBench ?? record.totalUnload} />
        <Field label="Trừ vơi đất" value={record.earthDeduction} />
      </div>

      <Separator className="opacity-40" />

      {/* 4. Nhiên liệu */}
      <SectionTitle icon={<Fuel className="h-3.5 w-3.5" />} label="Nhiên liệu" />
      <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-1 divide-y divide-border/40">
        <Field
          label="NL tồn đầu ca"
          value={record.initialFuel != null ? `${record.initialFuel} L` : undefined}
        />
        <Field
          label="NL lĩnh"
          value={record.receivedFuel != null ? `${record.receivedFuel} L` : undefined}
        />
        <Field
          label="NL tồn cuối ca"
          value={record.finalFuel != null ? `${record.finalFuel} L` : undefined}
        />
        <Field
          label="NL tiêu thụ"
          value={calculatedFuelCons != null ? `${calculatedFuelCons} L` : undefined}
        />
      </div>

      {/* 5. Meta */}
      {record.createdAt && (
        <>
          <Separator className="opacity-40" />
          <SectionTitle icon={<Calendar className="h-3.5 w-3.5" />} label="Ghi chú hệ thống" />
          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-1 divide-y divide-border/40">
            <Field
              label="Ngày nhập"
              value={new Date(record.createdAt).toLocaleString("vi-VN")}
            />
            <Field label="Người nhập" value={record.createdBy} />
            <Field label="Ngày VT tham chiếu" value={record.workingDateRef} />
          </div>
        </>
      )}
    </div>
  );
};

export default TransportDetailPanel;
