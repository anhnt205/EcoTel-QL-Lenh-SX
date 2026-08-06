import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DeviceType } from "@/types";
import { DeviceTypeEnum } from "@/enums";
import { DEVICE_TYPE_OPTIONS } from "@/utils/const";
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

export const deviceTypeSchema = z.object({
  name: z.string().min(1, "Tên loại thiết bị không được để trống"),
  group: z.nativeEnum(DeviceTypeEnum, {
    message: "Vui lòng chọn nhóm thiết bị",
  }),
});

export type DeviceTypeFormValues = z.infer<typeof deviceTypeSchema>;

interface DeviceTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceType?: DeviceType | null;
  onSubmit: (values: DeviceTypeFormValues) => Promise<void>;
  isLoading?: boolean;
}

export const DeviceTypeFormDialog: React.FC<DeviceTypeFormDialogProps> = ({
  open,
  onOpenChange,
  deviceType,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = Boolean(deviceType);

  const form = useForm<DeviceTypeFormValues>({
    resolver: zodResolver(deviceTypeSchema) as any,
    defaultValues: {
      name: "",
      group: DeviceTypeEnum.VEHICLE,
    },
  });

  useEffect(() => {
    if (open) {
      if (deviceType) {
        form.reset({
          name: deviceType.name || "",
          group: deviceType.group || DeviceTypeEnum.VEHICLE,
        });
      } else {
        form.reset({
          name: "",
          group: DeviceTypeEnum.VEHICLE,
        });
      }
    }
  }, [open, deviceType, form]);

  const handleSubmit = async (values: DeviceTypeFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Sửa loại thiết bị" : "Thêm loại thiết bị mới"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tên loại thiết bị <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên loại thiết bị" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nhóm thiết bị <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn nhóm thiết bị" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEVICE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
