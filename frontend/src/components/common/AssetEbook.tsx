import React from "react";
import type { Device } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Truck, Wrench, MapPin, Calendar, Building, Fuel } from "lucide-react";

interface AssetEbookProps {
  asset: Device;
  onClose: () => void;
}

export const AssetEbook: React.FC<AssetEbookProps> = ({ asset, onClose }) => {
  const categoryName =
    typeof asset.category === "object"
      ? (asset.category as any)?.name
      : asset.category || "—";

  const materialName =
    typeof asset.material === "object"
      ? (asset.material as any)?.name
      : asset.material || "—";

  const departmentName =
    typeof asset.department === "object"
      ? (asset.department as any)?.name
      : asset.department || "Chưa phân công";

  const coords = (asset as any)?.coordinates?.coordinates;
  const locationStr =
    Array.isArray(coords) && coords.length === 2
      ? `${coords[1]}, ${coords[0]}`
      : "Không có tọa độ";

  return (
    <div className="flex flex-col h-full bg-background rounded-xl overflow-hidden border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">Hồ Sơ Tài Sản</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card className="shadow-none border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-extrabold text-primary">
                {asset.name}
              </CardTitle>
              <Badge variant="outline" className="text-sm font-semibold">
                {asset.code || "N/A"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-sm">
            <div className="grid grid-cols-2 gap-2 border-b pb-3">
              <div>
                <span className="text-muted-foreground">Số xe/máy:</span>
                <p className="font-semibold">{asset.vehicleNumber || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Trạng thái:</span>
                <p className="font-semibold text-primary">{asset.status || "—"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-28">Loại thiết bị:</span>
                <span className="font-medium">{categoryName}</span>
              </div>

              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-28">Chủng loại:</span>
                <span className="font-medium">{materialName}</span>
              </div>

              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-28">Nhiên liệu:</span>
                <span className="font-medium">{asset.fuelType || "—"}</span>
              </div>

              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-28">Đơn vị:</span>
                <span className="font-medium">{departmentName}</span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-28">Tọa độ:</span>
                <span className="font-medium">{locationStr}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground w-28">Giờ lũy kế:</span>
                <span className="font-medium">
                  {(asset as any).cumulativeHours ?? 0} giờ
                </span>
              </div>
            </div>

            {asset.note && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Ghi chú:</span>{" "}
                {asset.note}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AssetEbook;
