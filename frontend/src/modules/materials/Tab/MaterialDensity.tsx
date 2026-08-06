import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/config/api.config";
import MaterialDensityEditor from "./MaterialDensityEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface HistoryTimeSlot {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
}

const MaterialDensity: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<HistoryTimeSlot | null>(null);

  // 1. Fetch materials
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials", selectedTimeSlot],
    queryFn: () =>
      api
        .get(
          `/materials?startTime=${selectedTimeSlot?.startTime?.toISOString() ?? ""}&endTime=${selectedTimeSlot?.endTime?.toISOString() ?? ""}`,
        )
        .then((res) => res.data.data),
  });

  // 2. Compute timeSlots
  const timeSlots = useMemo(() => {
    const list: HistoryTimeSlot[] = [];
    const seen = new Set();

    materials.forEach((m: any) => {
      (m.valueHistory || []).forEach((h: any) => {
        const key = `${h.startTime}-${h.endTime}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: key,
            startTime: h.startTime ? new Date(h.startTime) : null,
            endTime: h.endTime ? new Date(h.endTime) : null,
          });
        }
      });
    });

    return list.sort((a, b) => {
      const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
      return tB - tA;
    });
  }, [materials]);

  const handleCreateNewSlot = () => {
    setSelectedTimeSlot(null);
    setIsEditing(true);
  };

  return (
    <div className="flex flex-col gap-4 mt-2">
      {isEditing ? (
        <MaterialDensityEditor
          materials={materials}
          initialSlot={selectedTimeSlot}
          timeSlots={timeSlots}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lịch sử tỷ trọng vật liệu</CardTitle>
            <Button onClick={handleCreateNewSlot} className="gap-2">
              <Plus className="h-4 w-4" /> Thêm tỷ trọng mới
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="p-3">Tên vật liệu</th>
                    <th className="p-3 text-center">Sản phẩm NT</th>
                    <th className="p-3 text-center">Tỷ trọng quy ẩm</th>
                    <th className="p-3 text-center">Tỷ trọng không quy ẩm</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center p-4">
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : materials.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-4 text-muted-foreground">
                        Không có dữ liệu tỷ trọng vật liệu
                      </td>
                    </tr>
                  ) : (
                    materials.map((m: any) => (
                      <tr key={m._id} className="hover:bg-muted/30">
                        <td className="p-3 font-medium">{m.name}</td>
                        <td className="p-3 text-center">{m.acceptedProduct || "—"}</td>
                        <td className="p-3 text-center">{m.density ?? "—"}</td>
                        <td className="p-3 text-center">{m.dryDensity ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MaterialDensity;
