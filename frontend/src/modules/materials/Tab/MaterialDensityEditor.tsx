import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import dayjs from "dayjs";

import MaterialService from "../services/materialService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseAxiosError } from "@/utils/handleApiError";
import ConfirmDialog from "@/components/ui/confirm-dialog";

interface Props {
  materials: any[];
  initialSlot: any;
  timeSlots: any[];
  onCancel: () => void;
}

const MaterialDensityEditor: React.FC<Props> = ({
  materials,
  initialSlot,
  timeSlots,
  onCancel,
}) => {
  const queryClient = useQueryClient();

  const [startTime, setStartTime] = useState<string>(
    initialSlot?.startTime
      ? dayjs(initialSlot.startTime).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
  );

  const [endTime, setEndTime] = useState<string>(
    initialSlot?.endTime
      ? dayjs(initialSlot.endTime).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
  );

  const [rows, setRows] = useState<any[]>([]);
  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false);

  useEffect(() => {
    setRows(
      materials.map((m: any) => ({
        id: m._id,
        material: m.name,
        acceptedProduct: m.acceptedProduct || "—",
        density: m.density ?? "",
        dryDensity: m.dryDensity ?? "",
      })),
    );
  }, [materials]);

  const saveMutation = useMutation({
    mutationFn: async (force: boolean) => {
      await MaterialService.saveTimeSlot({
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        rows,
        initSlot: initialSlot
          ? {
              startTime: dayjs(initialSlot.startTime).toISOString(),
              endTime: dayjs(initialSlot.endTime).toISOString(),
            }
          : null,
        force,
      });
    },
    onSuccess: () => {
      toast.success("Lưu tỷ trọng vật liệu thành công!");
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      onCancel();
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi lưu tỷ trọng vật liệu");
    },
  });

  const handleSave = async () => {
    const key = `${new Date(startTime).toISOString()}-${new Date(endTime).toISOString()}`;
    const existingKeys = timeSlots.map((t) => t.id);

    if (!initialSlot && existingKeys.includes(key)) {
      setConfirmOverwriteOpen(true);
      return;
    }

    saveMutation.mutate(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {initialSlot ? "Chỉnh sửa tỷ trọng" : "Tạo mới tỷ trọng"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Ngày bắt đầu</label>
            <Input
              type="date"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Ngày kết thúc</label>
            <Input
              type="date"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Editable Table */}
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs">
              <tr>
                <th className="p-3">Vật liệu</th>
                <th className="p-3">Sản phẩm NT</th>
                <th className="p-3 text-center">Tỷ trọng quy ẩm</th>
                <th className="p-3 text-center">Tỷ trọng không quy ẩm</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.material}</td>
                  <td className="p-3">{r.acceptedProduct}</td>
                  <td className="p-2 text-center">
                    <Input
                      type="number"
                      step="0.01"
                      className="w-32 mx-auto text-center h-8"
                      value={r.density}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRows((prev) =>
                          prev.map((row) =>
                            row.id === r.id ? { ...row, density: val } : row,
                          ),
                        );
                      }}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Input
                      type="number"
                      step="0.01"
                      className="w-32 mx-auto text-center h-8"
                      value={r.dryDensity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRows((prev) =>
                          prev.map((row) =>
                            row.id === r.id ? { ...row, dryDensity: val } : row,
                          ),
                        );
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={saveMutation.isPending}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {initialSlot ? "Cập nhật" : "Thêm mới"}
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOverwriteOpen}
        onOpenChange={setConfirmOverwriteOpen}
        title="Xác nhận ghi đè tỷ trọng"
        description="Khoảng thời gian này đã tồn tại trong hệ thống. Bạn có chắc chắn muốn ghi đè dữ liệu tỷ trọng hiện tại?"
        onConfirm={() => {
          setConfirmOverwriteOpen(false);
          saveMutation.mutate(true);
        }}
        loading={saveMutation.isPending}
      />
    </Card>
  );
};

export default MaterialDensityEditor;
