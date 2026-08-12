import React, { useEffect, useMemo, useState } from "react";
import type { ReconciliationItem } from "@/modules/dataentry/types/thong-ke";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Check,
  AlertCircle,
  Save,
  Truck,
  Pickaxe,
  Sparkles,
  Scale,
  MapPin,
  Fuel,
  Info,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";

interface Props {
  item?: ReconciliationItem;
  onBack: () => void;
  /** Khi render trong PageDetailSidePanel, bỏ wrapper fixed inset-0 */
  sidePanel?: boolean;
  /** Khi render nhúng trong trang Tabs xử lý lệch, dùng layout full 2 cột nhưng không dùng fixed inset-0 */
  embedded?: boolean;
  /** Trạng thái đã lưu */
  isSaved?: boolean;
  /** Callback khi bấm lưu */
  onSave?: (item: ReconciliationItem) => void;
  /** Nhãn của nút lưu */
  saveLabel?: string;
}

// 2 xe mẫu thử nghiệm chuẩn màu chủ đề
const SAMPLE_VEHICLES: ReconciliationItem[] = [
  {
    id: "REC_SAMPLE_505",
    status: "BOTH",
    commonKey: {
      month: 8,
      day: 5,
      shift: "3",
      vehicleNo: "505 HD 465-7R",
      tripCount: 5,
      cargoType: "Than",
      fleet: "PXVT 9",
    },
    transportRecord: {
      month: 8,
      day: 5,
      shift: "3",
      vehicleNo: "505 HD 465-7R",
      cargoType: "Than",
      fleet: "PXVT 9",
      tripCount: 5,
      extraLoad: 90,
      fullRouteDistance: 5.5,
      excavatorEquipment: "KC-MX01",
      unloadLocationName: "Bãi sàng",
      initialFuel: 330,
      receivedFuel: 400,
      finalFuel: 340,
    },
    miningRecord: {
      month: 8,
      day: 5,
      shift: "3",
      vehicleNo: "505 HD 465-7R",
      cargoType: "Than mỏ",
      fleet: "PXVT 9",
      tripCount: 5,
      mineCode: "EKG-5A (MX-01)",
      dumpLocation: "Bãi sàng",
      contractCode: "CT-2026-08",
      vehicleTypeDetail: "HD 465-7R",
    },
  },
  {
    id: "REC_SAMPLE_506",
    status: "BOTH",
    commonKey: {
      month: 8,
      day: 5,
      shift: "3",
      vehicleNo: "506 CAT 777D",
      tripCount: 8,
      cargoType: "Đất đá",
      fleet: "PXVT 9",
    },
    transportRecord: {
      month: 8,
      day: 5,
      shift: "3",
      vehicleNo: "506 CAT 777D",
      cargoType: "Đất đá",
      fleet: "PXVT 9",
      tripCount: 8,
      extraLoad: 160,
      fullRouteDistance: 4.2,
      excavatorEquipment: "CAT-6015B",
      unloadLocationName: "Bãi thải Nam",
      initialFuel: 450,
      receivedFuel: 500,
      finalFuel: 410,
    },
    miningRecord: {
      month: 8,
      day: 5,
      shift: "3",
      vehicleNo: "506 CAT 777D",
      cargoType: "Đất đá",
      fleet: "PXVT 9",
      tripCount: 8,
      mineCode: "CAT-6015B",
      dumpLocation: "Bãi thải Nam",
      contractCode: "CT-2026-08",
      vehicleTypeDetail: "CAT 777D",
    },
  },
];

type ComparableValue = string | number | undefined | null;

interface ComparisonField {
  key: string;
  label: string;
  unit?: string;
  type: "text" | "number";
  group: string;
  transportValue: (item: ReconciliationItem) => ComparableValue;
  miningValue: (item: ReconciliationItem) => ComparableValue;
}

interface ComparedField extends ComparisonField {
  transportDisplay: string;
  miningDisplay: string;
  defaultValue: string;
  needsStandardInput: boolean;
}

const COMPARISON_FIELDS: ComparisonField[] = [
  {
    key: "cargoType",
    label: "Chủng loại hàng",
    type: "text",
    group: "Thông tin chung",
    transportValue: (item) => item.transportRecord?.cargoType,
    miningValue: (item) => item.miningRecord?.cargoType,
  },
  {
    key: "fleet",
    label: "Đội xe",
    type: "text",
    group: "Thông tin chung",
    transportValue: (item) => item.transportRecord?.fleet,
    miningValue: (item) => item.miningRecord?.fleet,
  },
  {
    key: "tripCount",
    label: "Số chuyến",
    type: "number",
    group: "Thông tin chung",
    transportValue: (item) => item.transportRecord?.tripCount,
    miningValue: (item) => item.miningRecord?.tripCount,
  },
  {
    key: "weight",
    label: "Khối lượng",
    unit: "tấn",
    type: "number",
    group: "Sản lượng",
    transportValue: (item) => item.transportRecord?.extraLoad,
    miningValue: (item) =>
      item.miningRecord
        ? (item.miningRecord as unknown as { totalUnload?: number }).totalUnload
        : undefined,
  },
  {
    key: "distance",
    label: "CĐ toàn tuyến",
    unit: "km",
    type: "number",
    group: "Sản lượng",
    transportValue: (item) => item.transportRecord?.fullRouteDistance,
    miningValue: () => undefined,
  },
  {
    key: "excavator",
    label: "Máy xúc / Mã MX",
    type: "text",
    group: "Vị trí - thiết bị",
    transportValue: (item) => item.transportRecord?.excavatorEquipment,
    miningValue: (item) => item.miningRecord?.mineCode,
  },
  {
    key: "unloadLocation",
    label: "Nơi dỡ / Vị trí đổ",
    type: "text",
    group: "Vị trí - thiết bị",
    transportValue: (item) => item.transportRecord?.unloadLocationName,
    miningValue: (item) => item.miningRecord?.dumpLocation,
  },
  {
    key: "initialFuel",
    label: "Nhiên liệu tồn đầu",
    unit: "L",
    type: "number",
    group: "Nhiên liệu",
    transportValue: (item) => item.transportRecord?.initialFuel,
    miningValue: () => undefined,
  },
  {
    key: "receivedFuel",
    label: "Nhiên liệu lĩnh",
    unit: "L",
    type: "number",
    group: "Nhiên liệu",
    transportValue: (item) => item.transportRecord?.receivedFuel,
    miningValue: () => undefined,
  },
  {
    key: "finalFuel",
    label: "Nhiên liệu tồn cuối",
    unit: "L",
    type: "number",
    group: "Nhiên liệu",
    transportValue: (item) => item.transportRecord?.finalFuel,
    miningValue: () => undefined,
  },
  {
    key: "contractCode",
    label: "Mã C/T",
    type: "text",
    group: "Khai thác",
    transportValue: () => undefined,
    miningValue: (item) => item.miningRecord?.contractCode,
  },
  {
    key: "vehicleTypeDetail",
    label: "Loại xe-PXVT",
    type: "text",
    group: "Khai thác",
    transportValue: () => undefined,
    miningValue: (item) => item.miningRecord?.vehicleTypeDetail,
  },
];

const isBlank = (value: ComparableValue) =>
  value === undefined || value === null || String(value).trim() === "";

const normalizeValue = (value: ComparableValue) =>
  isBlank(value) ? "" : String(value).trim().toLowerCase();

const formatValue = (value: ComparableValue, unit?: string) => {
  if (isBlank(value)) return "-";
  const display =
    typeof value === "number" ? value.toLocaleString("vi-VN") : String(value);
  return unit ? `${display} ${unit}` : display;
};

const getDefaultStandardValue = (
  transportValue: ComparableValue,
  miningValue: ComparableValue,
) => {
  if (!isBlank(transportValue)) return String(transportValue);
  if (!isBlank(miningValue)) return String(miningValue);
  return "";
};

const buildComparedFields = (item: ReconciliationItem): ComparedField[] =>
  COMPARISON_FIELDS.map((field) => {
    const transportValue = field.transportValue(item);
    const miningValue = field.miningValue(item);
    const hasTransport = !isBlank(transportValue);
    const hasMining = !isBlank(miningValue);
    const hasBothValues = hasTransport && hasMining;
    const needsStandardInput =
      (hasBothValues &&
        normalizeValue(transportValue) !== normalizeValue(miningValue)) ||
      (!hasBothValues &&
        (hasTransport || hasMining) &&
        ["cargoType", "fleet", "excavator", "unloadLocation"].includes(field.key));

    return {
      ...field,
      transportDisplay: formatValue(transportValue, field.unit),
      miningDisplay: formatValue(miningValue, field.unit),
      defaultValue: getDefaultStandardValue(transportValue, miningValue),
      needsStandardInput,
    };
  });

const getGroupIcon = (group: string) => {
  switch (group) {
    case "Thông tin chung":
      return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case "Sản lượng":
      return <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case "Vị trí - thiết bị":
      return <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case "Nhiên liệu":
      return <Fuel className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    case "Khai thác":
      return <Pickaxe className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    default:
      return <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  }
};

export const ReconciliationDetailView: React.FC<Props> = ({
  item: initialItem,
  onBack,
  sidePanel = false,
  embedded = false,
  isSaved = false,
  onSave,
  saveLabel,
}) => {
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState<number>(0);
  
  const sampleList = useMemo(() => {
    if (!initialItem) return SAMPLE_VEHICLES;
    const existsInSample = SAMPLE_VEHICLES.some(
      (v) => v.commonKey.vehicleNo === initialItem.commonKey.vehicleNo
    );
    if (existsInSample) return SAMPLE_VEHICLES;
    return [initialItem, SAMPLE_VEHICLES[1]];
  }, [initialItem]);

  const activeItem = sampleList[selectedVehicleIdx] || initialItem || SAMPLE_VEHICLES[0];

  const comparedFields = useMemo(() => buildComparedFields(activeItem), [activeItem]);
  const mismatchedFields = comparedFields.filter(
    (field) => field.needsStandardInput,
  );
  const hasMismatch = mismatchedFields.length > 0;

  const [standardValues, setStandardValues] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    const initialValues = Object.fromEntries(
      comparedFields.map((field) => [field.key, field.defaultValue]),
    );
    setStandardValues(initialValues);
  }, [comparedFields]);

  const finalFields = comparedFields.map((field) => ({
    ...field,
    finalValue: standardValues[field.key] || field.defaultValue || "-",
  }));

  const groupedComparedFields = useMemo(() => {
    return comparedFields.reduce<Record<string, ComparedField[]>>(
      (acc, field) => {
        acc[field.group] = acc[field.group] || [];
        acc[field.group].push(field);
        return acc;
      },
      {},
    );
  }, [comparedFields]);

  const groupedFinalFields = useMemo(() => {
    return finalFields.reduce<Record<string, typeof finalFields>>(
      (groups, field) => {
        groups[field.group] = groups[field.group] || [];
        groups[field.group].push(field);
        return groups;
      },
      {},
    );
  }, [finalFields]);

  const handleStandardChange = (key: string, value: string) => {
    setStandardValues((current) => ({ ...current, [key]: value }));
  };

  const handleSave = () => {
    toast.success(
      `Đã phê duyệt và lưu dữ liệu cuối cho xe ${activeItem.commonKey.vehicleNo}!`,
    );
    if (onSave) {
      onSave(activeItem);
    } else {
      onBack();
    }
  };

  // ── Side Panel Mode ──
  if (sidePanel) {
    return (
      <TooltipProvider delayDuration={200}>
        <div className="space-y-4 text-xs">
          {/* Switcher 2 Xe Ví Dụ */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {sampleList.slice(0, 2).map((v, idx) => {
              const isActive = selectedVehicleIdx === idx;
              const vMismatched = buildComparedFields(v).some((f) => f.needsStandardInput);
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleIdx(idx)}
                  className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? "bg-white dark:bg-gray-900 text-blue-700 dark:text-blue-300 shadow-xs font-semibold"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>{v.commonKey.vehicleNo}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      vMismatched ? "bg-red-500" : "bg-blue-500"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Mismatch alert */}
          {hasMismatch ? (
            <Alert variant="destructive" className="rounded-lg bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="font-semibold text-xs text-red-700 dark:text-red-300">Có sai lệch dữ liệu</AlertTitle>
              <AlertDescription className="text-[11px]">
                {mismatchedFields.length} trường cần nhập giá trị chuẩn.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="rounded-lg bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200">
              <Check className="h-4 w-4 text-blue-600" />
              <AlertTitle className="font-semibold text-xs text-blue-700 dark:text-blue-300">Dữ liệu khớp 100%</AlertTitle>
              <AlertDescription className="text-[11px]">
                Hai nguồn dữ liệu đã trùng khớp hoàn toàn.
              </AlertDescription>
            </Alert>
          )}

          {/* Vehicle summary */}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-3">
            <div>
              <span className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Biển số xe</span>
              <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{activeItem.commonKey.vehicleNo}</span>
            </div>
            <div>
              <span className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Phiên làm việc</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">Ca {activeItem.commonKey.shift} • {activeItem.commonKey.day}/{activeItem.commonKey.month}</span>
            </div>
            <div>
              <span className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Chủng loại</span>
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{activeItem.commonKey.cargoType}</span>
            </div>
            <div>
              <span className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Đội xe</span>
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{activeItem.commonKey.fleet}</span>
            </div>
          </div>

          {/* Grouped comparison fields */}
          {Object.entries(groupedComparedFields).map(([group, fields]) => (
            <div key={group} className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 pb-1">
                {getGroupIcon(group)}
                <span>{group}</span>
              </div>
              {fields.map((field) => (
                <div
                  key={field.key}
                  className={`rounded-md border px-3 py-2 space-y-1.5 ${
                    field.needsStandardInput
                      ? "border-red-200 bg-red-50/40 dark:border-red-900/50 dark:bg-red-950/20"
                      : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-800 dark:text-gray-200">{field.label}</span>
                    {field.needsStandardInput && (
                      <Badge variant="destructive" className="rounded text-[9px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200 font-normal">Sai lệch</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="block text-[9px] text-gray-500 mb-0.5 flex items-center gap-1"><Truck className="h-2.5 w-2.5"/>Vận tải</span>
                      <span className={`font-medium ${field.needsStandardInput ? "text-red-600 font-semibold" : "text-gray-900 dark:text-gray-100"}`}>
                        {field.transportDisplay}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-gray-500 mb-0.5 flex items-center gap-1"><Pickaxe className="h-2.5 w-2.5"/>Khai thác</span>
                      <span className={`font-medium ${field.needsStandardInput ? "text-red-600 font-semibold" : "text-gray-900 dark:text-gray-100"}`}>
                        {field.miningDisplay}
                      </span>
                    </div>
                  </div>
                  {field.needsStandardInput && (
                    <div>
                      <Label htmlFor={`sp-standard-${field.key}`} className="text-[10px] font-medium text-red-700 dark:text-red-400 flex items-center gap-1 mb-1">
                        <Sparkles className="h-3 w-3" />Giá trị chuẩn
                      </Label>
                      <Input
                        id={`sp-standard-${field.key}`}
                        type={field.type === "number" ? "number" : "text"}
                        value={standardValues[field.key] || ""}
                        onChange={(e) => handleStandardChange(field.key, e.target.value)}
                        placeholder={`Nhập ${field.label.toLowerCase()} chuẩn...`}
                        className="h-7 text-xs border-red-300 focus-visible:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Save button */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <Button
              onClick={handleSave}
              disabled={isSaved}
              className="w-full gap-2 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              {isSaved ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaved ? "Đã lưu" : saveLabel || "Phê duyệt & Lưu"}
            </Button>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // ── Full-screen / Embedded Mode ──
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={
          embedded
            ? "relative flex flex-col h-full min-h-0 w-full overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-200 dark:border-gray-800"
            : "fixed inset-0 z-50 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
        }
      >
        {/* Header Bar */}
        <header
          className={`flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 ${
            embedded ? "px-3 py-2" : "px-6 py-3"
          }`}
        >
          <div className="flex items-center gap-3">
            {!embedded && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                  className="gap-2 text-xs border-gray-200 dark:border-gray-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Quay lại</span>
                </Button>

                <Separator orientation="vertical" className="h-6 opacity-60" />
              </>
            )}

            {/* Switcher 2 Xe Ví Dụ */}
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {sampleList.slice(0, 2).map((v, idx) => {
                const isActive = selectedVehicleIdx === idx;
                const vMismatched = buildComparedFields(v).some((f) => f.needsStandardInput);
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicleIdx(idx)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                      isActive
                        ? "bg-white dark:bg-gray-950 text-blue-700 dark:text-blue-300 shadow-xs font-semibold"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xe #{idx + 1}: {v.commonKey.vehicleNo}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        vMismatched
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      }`}
                    >
                      {vMismatched ? "Lệch" : "Khớp"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`flex items-center text-xs ${
              embedded ? "gap-2" : "gap-4"
            }`}
          >
            <div
              className={`flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 ${
                embedded ? "px-2.5 py-1" : "px-3 py-1.5"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <div>
                <span className="block text-[9px] font-medium uppercase tracking-wider text-gray-500">
                  Phiên làm việc
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                  Ca {activeItem.commonKey.shift} • {activeItem.commonKey.day}/{activeItem.commonKey.month}/2026
                </span>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`flex items-center gap-1.5 font-medium ${
                hasMismatch
                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900"
                  : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
              } ${embedded ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"}`}
            >
              {hasMismatch ? (
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              ) : (
                <Check className="h-3.5 w-3.5 text-blue-600" />
              )}
              {hasMismatch
                ? `${mismatchedFields.length} trường có sai lệch`
                : "Dữ liệu khớp 100%"}
            </Badge>

            <Button
              onClick={handleSave}
              disabled={isSaved}
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-8"
            >
              {isSaved ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaved ? "Đã lưu" : saveLabel || "Phê duyệt & Lưu"}
            </Button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex flex-1 min-h-0 overflow-hidden p-3 gap-3 bg-gray-50/50 dark:bg-gray-950">
          {/* Left Section: Raw Comparison Data */}
          <Card className="flex w-[68%] flex-col min-h-0 overflow-hidden py-0 gap-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader
              className={`flex-row items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 space-y-0 shrink-0 ${
                embedded ? "py-2 px-3" : "py-3 px-5"
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <CardTitle
                  className={
                    embedded
                      ? "text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200"
                      : "text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200"
                  }
                >
                  Dữ liệu đối chiếu gốc
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className="gap-1 rounded font-medium text-[11px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                >
                  <Check className="h-3 w-3 text-blue-600" /> Khớp
                </Badge>
                {hasMismatch && (
                  <Badge
                    variant="outline"
                    className="gap-1 rounded font-medium text-[11px] bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                  >
                    <AlertCircle className="h-3 w-3 text-red-600" /> Cần sửa
                  </Badge>
                )}
              </div>
            </CardHeader>

            {hasMismatch && (
              <Alert
                variant="destructive"
                className="rounded-none border-x-0 border-t-0 shrink-0 py-2 px-4 text-xs bg-red-50 text-red-800 border-red-200 dark:bg-red-950/30 dark:border-red-900 dark:text-red-200"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                <AlertTitle className="text-xs font-semibold text-red-700 dark:text-red-300">Có sai lệch giữa 2 nguồn dữ liệu</AlertTitle>
                <AlertDescription className="text-[11px] text-gray-600 dark:text-gray-300">
                  Vui lòng kiểm tra và nhập giá trị chuẩn cho {mismatchedFields.length}{" "}
                  trường được đánh dấu màu đỏ bên dưới.
                </AlertDescription>
              </Alert>
            )}

            {/* Grid Columns Header Bar */}
            <div
              className={`grid shrink-0 grid-cols-[1fr_1fr_1.2fr] gap-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-center font-medium ${
                embedded ? "px-3 py-2 text-[11px]" : "px-5 py-2.5 text-xs"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 font-medium text-gray-700 dark:text-gray-300">
                <Truck className="h-3.5 w-3.5 text-emerald-600" /> Bên Vận tải
              </div>
              <div className="flex items-center justify-center gap-1.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 font-medium text-gray-700 dark:text-gray-300">
                <Pickaxe className="h-3.5 w-3.5 text-blue-600" /> Bên Khai thác
              </div>
              <div className="flex items-center justify-center gap-1.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-2 py-1 font-medium text-gray-700 dark:text-gray-300">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Dữ liệu chuẩn
              </div>
            </div>

            {/* Comparison Cards List (Grouped) */}
            <ScrollArea className="flex-1 min-h-0">
              <div className={`space-y-4 ${embedded ? "p-3" : "p-4"}`}>
                {Object.entries(groupedComparedFields).map(
                  ([group, fields]) => (
                    <div key={group} className="space-y-2">
                      {/* Group Divider Title Header */}
                      <div className="flex items-center gap-2 rounded bg-gray-100 dark:bg-gray-800/80 px-3 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {getGroupIcon(group)}
                        <span>{group}</span>
                        <Badge
                          variant="secondary"
                          className="ml-auto rounded text-[10px] py-0 px-2 font-normal bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {fields.length} trường
                        </Badge>
                      </div>

                      {/* Fields under this group */}
                      {fields.map((field) => (
                        <Card
                          key={field.key}
                          className={`grid grid-cols-[1fr_1fr_1.2fr] gap-3 p-3 transition-colors ${
                            field.needsStandardInput
                              ? "border-red-200 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20"
                              : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                          }`}
                        >
                          {/* Transport Value */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  field.needsStandardInput
                                    ? "bg-red-500"
                                    : "bg-emerald-500"
                                }`}
                              />
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {field.label}
                              </span>
                              {field.unit && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-normal py-0 px-1 text-gray-500"
                                >
                                  {field.unit}
                                </Badge>
                              )}
                            </div>
                            <p
                              className={`text-sm md:text-base font-semibold pl-3.5 ${
                                field.needsStandardInput
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-gray-900 dark:text-gray-100"
                              }`}
                            >
                              {field.transportDisplay}
                            </p>
                          </div>

                          {/* Mining Value */}
                          <div className="space-y-1 border-l border-gray-200 dark:border-gray-800 pl-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  field.needsStandardInput
                                    ? "bg-red-500"
                                    : "bg-emerald-500"
                                }`}
                              />
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {field.label}
                              </span>
                              {field.unit && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-normal py-0 px-1 text-gray-500"
                                >
                                  {field.unit}
                                </Badge>
                              )}
                            </div>
                            <p
                              className={`text-sm md:text-base font-semibold pl-3.5 ${
                                field.needsStandardInput
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-gray-900 dark:text-gray-100"
                              }`}
                            >
                              {field.miningDisplay}
                            </p>
                          </div>

                          {/* Standard Input / Matched Standard Value */}
                          <div className="border-l border-gray-200 dark:border-gray-800 pl-3">
                            {field.needsStandardInput ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <Label
                                    htmlFor={`standard-${field.key}`}
                                    className="flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>Dữ liệu chuẩn</span>
                                  </Label>
                                  <Badge
                                    variant="outline"
                                    className="rounded text-[10px] py-0 px-1.5 bg-red-100 text-red-700 border-red-200"
                                  >
                                    Cần sửa
                                  </Badge>
                                </div>
                                <Input
                                  id={`standard-${field.key}`}
                                  type={
                                    field.type === "number" ? "number" : "text"
                                  }
                                  step={
                                    field.type === "number" ? "0.01" : undefined
                                  }
                                  value={standardValues[field.key] || ""}
                                  onChange={(event) =>
                                    handleStandardChange(
                                      field.key,
                                      event.target.value,
                                    )
                                  }
                                  placeholder={`Nhập ${field.label.toLowerCase()} chuẩn...`}
                                  className="h-8 text-xs border-red-300 focus-visible:ring-blue-500 bg-white dark:bg-gray-900 font-medium"
                                />
                              </div>
                            ) : (
                              <div className="rounded border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-2">
                                <div className="mb-0.5 flex items-center gap-1.5">
                                  <Check className="h-3.5 w-3.5 text-blue-600" />
                                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                                    {field.label}
                                  </span>
                                </div>
                                <span className="block pl-5 text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100">
                                  {field.defaultValue
                                    ? formatValue(
                                        field.defaultValue,
                                        field.unit,
                                      )
                                    : "-"}
                                </span>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  ),
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Right Section: Final Consolidated Data */}
          <Card className="flex w-[32%] flex-col min-h-0 overflow-hidden py-0 gap-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <CardHeader
              className={`border-b border-gray-200 dark:border-gray-800 space-y-0.5 shrink-0 ${
                embedded ? "py-2 px-3" : "py-3 px-5"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <CardTitle
                  className={
                    embedded
                      ? "text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200"
                      : "text-sm font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200"
                  }
                >
                  Dữ liệu cuối
                </CardTitle>
              </div>
              <CardDescription className="text-[11px] text-gray-500">
                Tổng hợp dữ liệu chuẩn sau khi phê duyệt đối chiếu.
              </CardDescription>
            </CardHeader>

            <ScrollArea className="flex-1 min-h-0">
              <CardContent className="space-y-4 p-4">
                {/* Vehicle & Session Summary Card */}
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-3">
                  <div>
                    <span className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      Biển số xe
                    </span>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                      {activeItem.commonKey.vehicleNo}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      Phiên làm việc
                    </span>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      Ca {activeItem.commonKey.shift} • {activeItem.commonKey.day}/
                      {activeItem.commonKey.month}
                    </span>
                  </div>
                </div>

                {/* Final Groups List */}
                <div className="space-y-3">
                  {Object.entries(groupedFinalFields).map(([group, fields]) => (
                    <Card key={group} className="gap-0 overflow-hidden py-0 border-gray-200 dark:border-gray-800">
                      <CardHeader className="flex-row items-center gap-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 py-2 px-3 space-y-0">
                        {getGroupIcon(group)}
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                          {group}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="divide-y divide-gray-100 dark:divide-gray-800 p-0">
                        {fields.map((field) => (
                          <div
                            key={field.key}
                            className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                          >
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {field.label}
                            </span>
                            <Badge
                              variant="outline"
                              className={`rounded font-semibold text-xs ${
                                field.needsStandardInput
                                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300"
                                  : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                              }`}
                            >
                              {formatValue(field.finalValue, field.unit)}
                            </Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </ScrollArea>

            {/* Footer Actions */}
            <CardFooter className="flex shrink-0 items-center justify-between border-t border-gray-200 dark:border-gray-800 p-3">
              <Button variant="outline" size="sm" onClick={onBack} className="text-xs">
                {isSaved ? "Quay lại" : "Hủy thay đổi"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaved}
                size="sm"
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-8"
              >
                {isSaved ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {isSaved ? "Đã lưu" : saveLabel || "Phê duyệt & Lưu"}
              </Button>
            </CardFooter>
          </Card>
        </main>
      </div>
    </TooltipProvider>
  );
};
