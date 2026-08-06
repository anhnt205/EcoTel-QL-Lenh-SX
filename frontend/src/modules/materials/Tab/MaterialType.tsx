import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Material } from "@/types";
import { RoleEnum } from "@/enums";
import { useAuthStore } from "@/modules/auth/stores/auth.store";

import MaterialService from "../services/materialService";
import { getMaterialColumns } from "../columns";
import {
  MaterialFormDialog,
  type MaterialFormValues,
} from "../components/MaterialFormDialog";

import AppDataTable from "@/components/table/AppDataTable";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseAxiosError } from "@/utils/handleApiError";
import dayjs from "dayjs";

interface HistoryTimeSlot {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
}

export default function MaterialType() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === RoleEnum.ADMIN;
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<HistoryTimeSlot | null>(null);
  const [timeSlots, setTimeSlots] = useState<HistoryTimeSlot[]>([]);

  // Xóa theo ID
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Excel import loading
  const [isImporting, setIsImporting] = useState(false);

  // 1. Fetch data
  const {
    data: materials = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["materials", searchValue, selectedTimeSlot],
    queryFn: () =>
      MaterialService.getAll({
        name: searchValue,
        startTime: selectedTimeSlot?.startTime ? selectedTimeSlot.startTime.toISOString() : "",
        endTime: selectedTimeSlot?.endTime ? selectedTimeSlot.endTime.toISOString() : "",
      }),
  });

  useEffect(() => {
    if (materials.length > 0) {
      const allHistory: HistoryTimeSlot[] = [];
      const seen = new Set();

      materials.forEach((m: any) => {
        m.valueHistory?.forEach((h: any) => {
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
        const aTime = a.startTime ? a.startTime.getTime() : 0;
        const bTime = b.startTime ? b.startTime.getTime() : 0;
        return bTime - aTime;
      });

      setTimeSlots(allHistory);
    }
  }, [materials]);

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: MaterialService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Thêm loại vật liệu thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi thêm loại vật liệu");
    },
  });

  const updateMutation = useMutation({
    mutationFn: MaterialService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Cập nhật loại vật liệu thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi cập nhật loại vật liệu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: MaterialService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setSelectedIds([]);
      setConfirmDeleteOpen(false);
      toast.success(message || "Xóa thành công!");
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi xóa bản ghi");
    },
  });

  const importFileMutation = useMutation({
    mutationFn: (formData: FormData) => MaterialService.importFile(formData),
    onMutate: () => setIsImporting(true),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setIsImporting(false);
      toast.success(message || "Import dữ liệu thành công!");
    },
    onError: async (error: any) => {
      setIsImporting(false);
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi import file Excel");
    },
  });

  const exportExcelMutation = useMutation({
    mutationFn: MaterialService.exportFile,
    onSuccess: () => {
      toast.success("Xuất file Excel thành công!");
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi xuất file Excel");
    },
  });

  // Handlers
  const handleOpenAdd = () => {
    setSelectedMaterial(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (material: Material) => {
    setSelectedMaterial(material);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (values: MaterialFormValues) => {
    if (selectedMaterial) {
      await updateMutation.mutateAsync({
        ...values,
        _id: selectedMaterial._id,
      });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedIds.length === 0) return;
    deleteMutation.mutate(selectedIds);
  };

  const handleImportExcel = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    importFileMutation.mutate(formData);
  };

  // Table Columns
  const columns = useMemo(
    () => getMaterialColumns({ onEdit: handleOpenEdit, isAdmin }),
    [isAdmin],
  );

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Time Slot Filter Selector */}
      {timeSlots.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border w-fit">
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
      )}

      {/* Main Table */}
      <AppDataTable
        title="Bảng loại vật liệu"
        data={materials}
        columns={columns}
        loading={isLoading}
        searchValue={searchValue}
        onSearch={(val) => setSearchValue(val)}
        onRefresh={refetch}
        onAdd={isAdmin ? handleOpenAdd : undefined}
        showExport={isAdmin}
        onExportCsv={() => exportExcelMutation.mutate()}
        onImportExcel={isAdmin ? handleImportExcel : undefined}
        isImporting={isImporting}
        showColumnToggle
        stickyHeader
      />

      {/* Form Dialog */}
      <MaterialFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        material={selectedMaterial}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xác nhận xóa loại vật liệu"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.length} loại vật liệu đã chọn? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
