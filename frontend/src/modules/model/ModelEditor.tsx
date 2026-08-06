import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import dayjs from "dayjs";

import ModelService from "./services/modelService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseAxiosError } from "@/utils/handleApiError";
import ConfirmDialog from "@/components/ui/confirm-dialog";

interface HistoryTimeSlot {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
}

interface Props {
  materials: any[];
  devicemodels: any[];
  initialSlot: HistoryTimeSlot | null;
  timeSlots: HistoryTimeSlot[];
  onCancel: () => void;
  initValue: any[];
}

const ModelEditor: React.FC<Props> = ({
  materials,
  devicemodels,
  initialSlot,
  timeSlots,
  onCancel,
  initValue,
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

  const generateEmptyRows = () => {
    return materials.map((m: any) => {
      const row: any = {
        id: m._id,
        material: m.name,
        acceptedProduct: m.acceptedProduct || "—",
        density: m.density ?? "",
        dryDensity: m.dryDensity ?? "",
      };
      devicemodels.forEach((d: any) => {
        const record = initValue.find(
          (mdl: any) => mdl.material === m._id && mdl.deviceModel === d._id,
        );
        row[d._id] = record ? record.value : "";
      });
      return row;
    });
  };

  useEffect(() => {
    setRows(generateEmptyRows());
  }, [materials, devicemodels, initValue]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await ModelService.bulkUpsert({
        rows,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        initSlot: initialSlot
          ? {
              startTime: dayjs(initialSlot.startTime).toISOString(),
              endTime: dayjs(initialSlot.endTime).toISOString(),
            }
          : null,
      });
    },
    onSuccess: () => {
      toast.success("Lưu mô hình hệ số thành công!");
      queryClient.invalidateQueries({ queryKey: ["models"] });
      onCancel();
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lưu mô hình thất bại");
    },
  });

  const handleSave = async () => {
    const key = `${new Date(startTime).toISOString()}-${new Date(endTime).toISOString()}`;
    const keyMap = timeSlots.map((i) => i.id);

    if (keyMap.includes(key) && initValue.length === 0) {
      setConfirmOverwriteOpen(true);
      return;
    }

    saveMutation.mutate();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {initValue.length > 0 ? "Chỉnh sửa mô hình" : "Tạo mới mô hình"}
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

        {/* Editable Matrix Table */}
        <div className="border rounded-md overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground uppercase text-xs">
              <tr>
                <th className="p-3 sticky left-0 bg-muted z-10">Vật liệu</th>
                <th className="p-3 sticky left-28 bg-muted z-10">Sản phẩm NT</th>
                {devicemodels.map((d) => (
                  <th key={d._id} className="p-3 text-center min-w-[120px]">
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="p-3 font-medium sticky left-0 bg-background z-10 border-r">
                    {r.material}
                  </td>
                  <td className="p-3 sticky left-28 bg-background z-10 border-r">
                    {r.acceptedProduct}
                  </td>
                  {devicemodels.map((d) => (
                    <td key={d._id} className="p-2 text-center">
                      <Input
                        type="number"
                        step="0.01"
                        className="w-24 mx-auto text-center h-8"
                        value={r[d._id] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRows((prev) =>
                            prev.map((row) =>
                              row.id === r.id ? { ...row, [d._id]: val } : row,
                            ),
                          );
                        }}
                      />
                    </td>
                  ))}
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
            {initValue.length > 0 ? "Cập nhật" : "Thêm mới"}
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOverwriteOpen}
        onOpenChange={setConfirmOverwriteOpen}
        title="Xác nhận ghi đè mô hình"
        description="Khoảng thời gian này đã tồn tại trong hệ thống. Bạn có chắc chắn muốn ghi đè dữ liệu mô hình hiện tại?"
        onConfirm={() => {
          setConfirmOverwriteOpen(false);
          saveMutation.mutate();
        }}
        loading={saveMutation.isPending}
      />
    </Card>
  );
};

export default ModelEditor;
