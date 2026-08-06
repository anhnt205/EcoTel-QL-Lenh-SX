import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Device, Department, DeviceType, DeviceModel } from "@/types";
import { DeviceTypeEnum, RoleEnum, StatusDeviceEnum } from "@/enums";
import { STATUS_DEVICE_OPTIONS } from "@/utils/const";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import LocationSelector from "@/fixLeafletIcon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const defaultCenter = {
  lat: 20.9926575,
  lng: 105.8437303,
};

export const vehicleSchema = z.object({
  code: z.string().min(1, "Biển số không được để trống"),
  name: z.string().min(1, "Tên xe không được để trống"),
  vehicleNumber: z.string().optional(),
  category: z.string().min(1, "Vui lòng chọn loại xe"),
  material: z.string().optional(),
  fuelType: z.string().optional(),
  capacity: z.coerce.number().optional(),
  department: z.string().optional(),
  status: z.nativeEnum(StatusDeviceEnum),
  note: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device | null;
  deviceTypes: DeviceType[];
  deviceModels: DeviceModel[];
  departments: Department[];
  userRole?: string;
  userDepartmentId?: string;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
  isLoading?: boolean;
}

export const VehicleFormDialog: React.FC<VehicleFormDialogProps> = ({
  open,
  onOpenChange,
  device,
  deviceTypes,
  deviceModels,
  departments,
  userRole,
  userDepartmentId,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = Boolean(device);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  // Lọc chỉ lấy các loại thuộc nhóm VEHICLE (Xe)
  const vehicleCategories = deviceTypes.filter(
    (p) => p.group === DeviceTypeEnum.VEHICLE,
  );

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: {
      code: "",
      name: "",
      vehicleNumber: "",
      category: "",
      material: "",
      fuelType: "",
      capacity: undefined,
      department: userRole === RoleEnum.MANAGER ? userDepartmentId : "",
      status: StatusDeviceEnum.AVAILABLE,
      note: "",
      coordinates: defaultCenter,
    },
  });

  useEffect(() => {
    if (open) {
      if (device) {
        let lat = defaultCenter.lat;
        let lng = defaultCenter.lng;

        const rawCoords = (device as any).coordinates;
        if (rawCoords && Array.isArray(rawCoords.coordinates)) {
          lng = rawCoords.coordinates[0];
          lat = rawCoords.coordinates[1];
        } else if (
          rawCoords &&
          typeof rawCoords.lat === "number" &&
          typeof rawCoords.lng === "number"
        ) {
          lat = rawCoords.lat;
          lng = rawCoords.lng;
        }

        const coordsObj = { lat, lng };
        setMapCoords(coordsObj);

        const categoryId =
          device.category && typeof device.category === "object"
            ? (device.category as any)._id
            : device.category || "";

        const materialId =
          device.material && typeof device.material === "object"
            ? (device.material as any)._id
            : device.material || "";

        const departmentId =
          device.department && typeof device.department === "object"
            ? (device.department as any)._id
            : device.department || "";

        form.reset({
          code: device.code || "",
          name: device.name || "",
          vehicleNumber: device.vehicleNumber || "",
          category: categoryId,
          material: materialId,
          fuelType: device.fuelType || "",
          capacity: device.capacity ?? undefined,
          department:
            userRole === RoleEnum.MANAGER ? userDepartmentId : departmentId,
          status: device.status || StatusDeviceEnum.AVAILABLE,
          note: device.note || "",
          coordinates: coordsObj,
        });
      } else {
        setMapCoords(null);

        const defaultCat = vehicleCategories.find((c) => c.name === "Vận tải");
        const defaultCatId = defaultCat ? defaultCat._id : "";

        form.reset({
          code: "",
          name: "",
          vehicleNumber: "",
          category: defaultCatId,
          material: "",
          fuelType: "",
          capacity: undefined,
          department: userRole === RoleEnum.MANAGER ? userDepartmentId : "",
          status: StatusDeviceEnum.AVAILABLE,
          note: "",
          coordinates: defaultCenter,
        });
      }
    }
  }, [open, device, userRole, userDepartmentId, form]);

  const handleSelectOnMap = (coords: { lat: number; lng: number }) => {
    setMapCoords(coords);
    form.setValue("coordinates", coords, { shouldValidate: true });
  };

  const handleSubmit = async (values: VehicleFormValues) => {
    await onSubmit(values);
  };

  const currentCoords = form.watch("coordinates");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Sửa thông tin xe" : "Thêm thông tin xe mới"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Biển số <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập biển số" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Tên xe <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập tên xe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số xe</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập số xe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Loại xe <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại xe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicleCategories.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="material"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chủng loại</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn chủng loại" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deviceModels.map((m) => (
                          <SelectItem key={m._id} value={m._id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nhiên liệu</FormLabel>
                    <FormControl>
                      <Input placeholder="Loại nhiên liệu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trọng tải</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Trọng tải"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_DEVICE_OPTIONS.map((o) => (
                          <SelectItem
                            key={o.label}
                            value={o.label}
                            disabled={
                              o.label === StatusDeviceEnum.IN_USE &&
                              userRole === RoleEnum.MANAGER
                            }
                          >
                            {o.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn vị</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={userRole === RoleEnum.MANAGER}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn đơn vị" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d._id} value={d._id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Nhập ghi chú" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Input Tọa độ text */}
            <FormItem>
              <FormLabel>Tọa độ (lng, lat)</FormLabel>
              <FormControl>
                <Input
                  value={
                    currentCoords
                      ? `${currentCoords.lng}, ${currentCoords.lat}`
                      : ""
                  }
                  onChange={(e) => {
                    const parts = e.target.value.split(",");
                    if (parts.length === 2) {
                      const lng = parseFloat(parts[0].trim());
                      const lat = parseFloat(parts[1].trim());
                      if (!isNaN(lat) && !isNaN(lng)) {
                        const coords = { lat, lng };
                        setMapCoords(coords);
                        form.setValue("coordinates", coords, {
                          shouldValidate: true,
                        });
                      }
                    }
                  }}
                  placeholder="Kinh độ (lng), Vĩ độ (lat)"
                />
              </FormControl>
            </FormItem>

            {/* Leaflet Map Picker */}
            <div className="rounded-lg overflow-hidden border border-border h-[220px] w-full">
              <MapContainer
                center={[
                  mapCoords?.lat ?? defaultCenter.lat,
                  mapCoords?.lng ?? defaultCenter.lng,
                ]}
                zoom={16}
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <LocationSelector onSelect={handleSelectOnMap} />
                {mapCoords && <Marker position={mapCoords} />}
              </MapContainer>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Cập nhật" : "Thêm mới"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
