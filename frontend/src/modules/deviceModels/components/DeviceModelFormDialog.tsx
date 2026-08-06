import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DeviceModel } from "@/types";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const deviceModelSchema = z.object({
  name: z.string().min(1, "Tên chủng loại không được để trống"),
});

export type DeviceModelFormValues = z.infer<typeof deviceModelSchema>;

interface DeviceModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceModel?: DeviceModel | null;
  onSubmit: (values: DeviceModelFormValues) => Promise<void>;
  isLoading?: boolean;
}

export const DeviceModelFormDialog: React.FC<DeviceModelFormDialogProps> = ({
  open,
  onOpenChange,
  deviceModel,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = Boolean(deviceModel);

  const form = useForm<DeviceModelFormValues>({
    resolver: zodResolver(deviceModelSchema) as any,
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (deviceModel) {
        form.reset({
          name: deviceModel.name || "",
        });
      } else {
        form.reset({
          name: "",
        });
      }
    }
  }, [open, deviceModel, form]);

  const handleSubmit = async (values: DeviceModelFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Sửa chủng loại thiết bị" : "Thêm chủng loại mới"}
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
                    Tên chủng loại <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên chủng loại" {...field} />
                  </FormControl>
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
