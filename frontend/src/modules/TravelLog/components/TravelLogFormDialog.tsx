import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TravelLog, Device, Location, Shift } from "@/types";
import { AcceptedProductEnum } from "@/enums";
import dayjs from "dayjs";

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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const travelLogSchema = z.object({
  workingDate: z.string().min(1, "Vui lòng chọn ngày làm việc"),
  shift: z.string().min(1, "Vui lòng chọn ca làm việc"),
  excavator: z.string().min(1, "Vui lòng chọn máy xúc"),
  area: z.string().optional(),
  location: z.string().min(1, "Vui lòng chọn điểm đổ tải"),
  acceptedProduct: z.nativeEnum(AcceptedProductEnum),
  excavationLevel: z.string().optional(),
  dumpHeightActual: z.string().optional(),
  fullDistanceKm: z.coerce.number().optional(),
  fullLiftHeightM: z.coerce.number().optional(),
  localMinHeightM: z.coerce.number().optional(),
  localMaxHeightM: z.coerce.number().optional(),
  localDistanceKm: z.coerce.number().optional(),
  localLiftHeightM: z.coerce.number().optional(),
});

export type TravelLogFormValues = z.infer<typeof travelLogSchema>;

interface TravelLogFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  travelLog?: TravelLog | null;
  productType: AcceptedProductEnum;
  excavators: Device[];
  shifts: Shift[];
  locations: Location[];
  onSubmit: (values: TravelLogFormValues) => Promise<void>;
  isLoading?: boolean;
}

export const TravelLogFormDialog: React.FC<TravelLogFormDialogProps> = ({
  open,
  onOpenChange,
  travelLog,
  productType,
  excavators,
  shifts,
  locations,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = Boolean(travelLog);

  const form = useForm<TravelLogFormValues>({
    resolver: zodResolver(travelLogSchema) as any,
    defaultValues: {
      workingDate: dayjs().format("YYYY-MM-DD"),
      shift: "",
      excavator: "",
      area: "",
      location: "",
      acceptedProduct: productType,
      excavationLevel: "",
      dumpHeightActual: "",
      fullDistanceKm: undefined,
      fullLiftHeightM: undefined,
      localMinHeightM: undefined,
      localMaxHeightM: undefined,
      localDistanceKm: undefined,
      localLiftHeightM: undefined,
    },
  });

  useEffect(() => {
    if (open) {
      if (travelLog) {
        const excavatorId =
          travelLog.excavator && typeof travelLog.excavator === "object"
            ? (travelLog.excavator as any)._id
            : travelLog.excavator || "";

        const shiftId =
          travelLog.shift && typeof travelLog.shift === "object"
            ? (travelLog.shift as any)._id
            : travelLog.shift || "";

        const locationId =
          travelLog.location && typeof travelLog.location === "object"
            ? (travelLog.location as any)._id
            : travelLog.location || "";

        form.reset({
          workingDate: travelLog.workingDate
            ? dayjs(travelLog.workingDate).format("YYYY-MM-DD")
            : dayjs().format("YYYY-MM-DD"),
          shift: shiftId,
          excavator: excavatorId,
          area: travelLog.area || "",
          location: locationId,
          acceptedProduct: travelLog.acceptedProduct || productType,
          excavationLevel: travelLog.excavationLevel || "",
          dumpHeightActual: travelLog.dumpHeightActual || "",
          fullDistanceKm: travelLog.fullDistanceKm ?? undefined,
          fullLiftHeightM: travelLog.fullLiftHeightM ?? undefined,
          localMinHeightM: travelLog.localMinHeightM ?? undefined,
          localMaxHeightM: travelLog.localMaxHeightM ?? undefined,
          localDistanceKm: travelLog.localDistanceKm ?? undefined,
          localLiftHeightM: travelLog.localLiftHeightM ?? undefined,
        });
      } else {
        form.reset({
          workingDate: dayjs().format("YYYY-MM-DD"),
          shift: "",
          excavator: "",
          area: "",
          location: "",
          acceptedProduct: productType,
          excavationLevel: "",
          dumpHeightActual: "",
          fullDistanceKm: undefined,
          fullLiftHeightM: undefined,
          localMinHeightM: undefined,
          localMaxHeightM: undefined,
          localDistanceKm: undefined,
          localLiftHeightM: undefined,
        });
      }
    }
  }, [open, travelLog, productType, form]);

  const handleSubmit = async (values: TravelLogFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Sửa nhật trình cung độ" : "Thêm nhật trình cung độ mới"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Nhóm 1: Ngày, Ca, Máy xúc, Khu vực */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="workingDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Ngày làm việc <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shift"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Ca làm việc <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn ca" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {shifts.map((s) => (
                          <SelectItem key={s._id} value={s._id}>
                            Ca {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="excavator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Máy xúc <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn máy xúc" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {excavators.map((e) => (
                          <SelectItem key={e._id} value={e._id}>
                            {e.code} - {e.name}
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
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Khu vực</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập khu vực" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Nhóm 2: Điểm đổ, Tầng xúc, Độ cao thực tế nơi đổ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Điểm đổ <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn điểm đổ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l._id} value={l._id}>
                            {l.name}
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
                name="excavationLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tầng xúc</FormLabel>
                    <FormControl>
                      <Input placeholder="Tầng xúc" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dumpHeightActual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Độ cao thực tế nơi đổ</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập độ cao" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Nhóm 3: Thông số toàn tuyến */}
            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2 text-foreground">
                Thông số toàn tuyến
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullDistanceKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cung độ toàn tuyến (km)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Khoảng cách (km)"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fullLiftHeightM"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chiều cao nâng tải toàn tuyến (m)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Chiều cao (m)"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Nhóm 4: Thông số cục bộ */}
            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2 text-foreground">
                Thông số cục bộ
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="localMinHeightM"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>H min (m)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="H min"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="localMaxHeightM"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>H max (m)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="H max"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="localDistanceKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>C.độ (km)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Khoảng cách (km)"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="localLiftHeightM"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>H N.tải (m)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Nâng tải (m)"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
