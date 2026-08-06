import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import api from "@/config/api.config";
import ModelService from "./services/modelService";
import { getModelColumns } from "./columns";
import ModelEditor from "./ModelEditor";

import AppDataTable from "@/components/table/AppDataTable";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import dayjs from "dayjs";

interface HistoryTimeSlot {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
}

const Models: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<HistoryTimeSlot | null>(null);
  const [timeSlots, setTimeSlots] = useState<HistoryTimeSlot[]>([]);

  // 1. Fetch materials & devicemodels
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: () => api.get("/materials").then((res) => res.data.data),
  });

  const { data: devicemodels = [] } = useQuery({
    queryKey: ["devicemodels"],
    queryFn: () => api.get("/devicemodels").then((res) => res.data.data),
  });

  // 2. Fetch models according to time slot
  const {
    data: models = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["models", selectedTimeSlot],
    queryFn: () =>
      ModelService.getModels({
        startTime: selectedTimeSlot?.startTime
          ? selectedTimeSlot.startTime.toISOString()
          : "",
        endTime: selectedTimeSlot?.endTime
          ? selectedTimeSlot.endTime.toISOString()
          : "",
      }),
  });

  // Compute time slots
  useEffect(() => {
    if (models.length > 0) {
      const allHistory: HistoryTimeSlot[] = [];
      const seen = new Set();

      models.forEach((model: any) => {
        model.valueHistory?.forEach((h: any) => {
          const key = `${h.startTime}-${h.endTime}`;
          if (!seen.has(key)) {
            seen.add(key);
            allHistory.push({
              id: key,
              startTime: h.startTime ? new Date(h.startTime) : null,
              endTime: h.endTime ? new Date(h.endTime) : null,
            });
          }
        });
      });

      allHistory.sort((a, b) => {
        const timeB = new Date(b.startTime ?? 0).getTime();
        const timeA = new Date(a.startTime ?? 0).getTime();
        return timeB - timeA;
      });

      setTimeSlots(allHistory);
    }
  }, [models]);

  const handleCreateNewSlot = () => {
    setSelectedTimeSlot(null);
    setIsEditing(true);
  };

  // Build matrix rows for AppDataTable
  const matrixRows = useMemo(() => {
    if (!materials.length || !devicemodels.length) return [];
    return materials.map((m: any) => {
      const row: any = {
        id: m._id,
        material: m.name,
        acceptedProduct: m.acceptedProduct,
        density: m.density,
        dryDensity: m.dryDensity,
      };
      devicemodels.forEach((d: any) => {
        const record = models.find(
          (mdl: any) => mdl.material === m._id && mdl.deviceModel === d._id,
        );
        row[d._id] = record ? record.value : "";
      });
      return row;
    });
  }, [materials, devicemodels, models]);

  // Build dynamic table columns
  const columns = useMemo(
    () => getModelColumns(devicemodels),
    [devicemodels],
  );

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Danh mục</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Mô hình</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Mô hình hệ số định mức
        </h1>

        {isEditing ? (
          <ModelEditor
            materials={materials}
            devicemodels={devicemodels}
            initialSlot={selectedTimeSlot}
            timeSlots={timeSlots}
            onCancel={() => setIsEditing(false)}
            initValue={models}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Header Toolbar: TimeSlot Selector + Add New Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg border">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Lọc theo thời gian:</span>
                <Select
                  value={selectedTimeSlot?.id || ""}
                  onValueChange={(val) => {
                    const slot = timeSlots.find((s) => s.id === val);
                    setSelectedTimeSlot(slot || null);
                  }}
                >
                  <SelectTrigger className="w-[300px] h-9">
                    <SelectValue placeholder="Chọn khoảng thời gian" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id}>
                        Từ {dayjs(slot.startTime).format("DD/MM/YYYY")} - Đến{" "}
                        {dayjs(slot.endTime).format("DD/MM/YYYY")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateNewSlot} className="gap-2">
                <Plus className="h-4 w-4" /> Thêm mô hình mới
              </Button>
            </div>

            {/* Main Table */}
            <AppDataTable
              title="Bảng ma trận hệ số mô hình"
              data={matrixRows}
              columns={columns}
              loading={isLoading}
              searchValue={searchValue}
              onSearch={(val) => setSearchValue(val)}
              onRefresh={refetch}
              showColumnToggle
              stickyHeader
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Models;