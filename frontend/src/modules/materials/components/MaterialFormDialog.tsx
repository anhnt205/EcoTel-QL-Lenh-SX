import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Material } from "@/types";

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

export const materialSchema = z.object({
  name: z.string().min(1, "Tên vật liệu không được để trống"),
  acceptedProduct: z.string().min(1, "Vui lòng chọn sản phẩm nghiệm thu"),
});

export type MaterialFormValues = z.infer<typeof materialSchema>;

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
  onSubmit: (values: MaterialFormValues) => Promise<void>;
  isLoading?: boolean;
}

export const MaterialFormDialog: React.FC<MaterialFormDialogProps> = ({
  open,
  onOpenChange,
  material,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = Boolean(material);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialSchema) as any,
    defaultValues: {
      name: "",
      acceptedProduct: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (material) {
        form.reset({
          name: material.name || "",
          acceptedProduct: material.acceptedProduct || "",
        });
      } else {
        form.reset({
          name: "",
          acceptedProduct: "",
        });
      }
    }
  }, [open, material, form]);

  const handleSubmit = async (values: MaterialFormValues) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Sửa loại vật liệu" : "Thêm loại vật liệu mới"}
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
                    Tên vật liệu <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Nhập tên vật liệu" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acceptedProduct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Sản phẩm nghiệm thu <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn sản phẩm nghiệm thu" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Đất">Đất</SelectItem>
                      <SelectItem value="Than">Than</SelectItem>
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
