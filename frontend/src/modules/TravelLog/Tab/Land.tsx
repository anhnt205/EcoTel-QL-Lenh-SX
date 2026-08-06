import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { TravelLog } from "@/types";
import { AcceptedProductEnum, RoleEnum } from "@/enums";
import { useAuthStore } from "@/modules/auth/stores/auth.store";
import api from "@/config/api.config";

import TravelLogService from "../services/travelLogService";
import { getTravelLogColumns } from "../columns";
import {
  TravelLogFormDialog,
  type TravelLogFormValues,
} from "../components/TravelLogFormDialog";

import AppDataTable from "@/components/table/AppDataTable";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { parseAxiosError } from "@/utils/handleApiError";

interface LandsProps {
  type: string;
}

const Lands: React.FC<LandsProps> = ({ type }) => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === RoleEnum.ADMIN;
  const queryClient = useQueryClient();

  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [searchValue, setSearchValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTravelLog, setSelectedTravelLog] = useState<TravelLog | null>(null);

  // Xóa theo ID
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Excel import loading
  const [isImporting, setIsImporting] = useState(false);

  // Queries
  const { data: excavators = [] } = useQuery({
    queryKey: ["excavators"],
    queryFn: () => api.get("/devices/excavators/all").then((res) => res.data.data),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => api.get("/shifts").then((res) => res.data.data),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: () => api.get("/locations").then((res) => res.data.data),
  });

  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["travellogs", startTime, endTime, type, searchValue],
    queryFn: () =>
      TravelLogService.getAll({
        startTime: startTime ? new Date(startTime).toISOString() : "",
        endTime: endTime ? new Date(endTime).toISOString() : "",
        type: type,
        q: searchValue,
      }),
  });

  const travelLogs = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : data.items || [];
  }, [data]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: TravelLogService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travellogs"] });
      toast.success("Thêm nhật trình cung độ thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi thêm cung độ");
    },
  });

  const updateMutation = useMutation({
    mutationFn: TravelLogService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travellogs"] });
      toast.success("Cập nhật nhật trình cung độ thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi cập nhật cung độ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: TravelLogService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["travellogs"] });
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
    mutationFn: (formData: FormData) =>
      TravelLogService.importFile(formData, undefined, AcceptedProductEnum.LAND),
    onMutate: () => setIsImporting(true),
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ["travellogs"] });
      setIsImporting(false);
      const inserted = resData.summary?.insertedCount || 0;
      const updated = resData.summary?.updatedCount || 0;
      toast.success(`Import hoàn tất: Đã thêm mới ${inserted}, cập nhật ${updated}`);
    },
    onError: async (error: any) => {
      setIsImporting(false);
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi import file Excel");
    },
  });

  const exportExcelMutation = useMutation({
    mutationFn: () => TravelLogService.exportFile(type),
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
    setSelectedTravelLog(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (log: TravelLog) => {
    setSelectedTravelLog(log);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (values: TravelLogFormValues) => {
    const payload = {
      ...values,
      workingDate: new Date(values.workingDate),
    };
    if (selectedTravelLog) {
      await updateMutation.mutateAsync({
        ...payload,
        _id: selectedTravelLog._id,
      });
    } else {
      await createMutation.mutateAsync(payload);
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
    () => getTravelLogColumns({ onEdit: handleOpenEdit, isAdmin }),
    [isAdmin],
  );

  return (
    <div className="flex flex-col gap-4 mt-2">
      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/40 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Từ ngày:</span>
          <Input
            type="date"
            className="w-40 h-9"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Đến ngày:</span>
          <Input
            type="date"
            className="w-40 h-9"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table */}
      <AppDataTable
        title="Cung độ vận chuyển đất"
        data={travelLogs}
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
      <TravelLogFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        travelLog={selectedTravelLog}
        productType={AcceptedProductEnum.LAND}
        excavators={excavators}
        shifts={shifts}
        locations={locations}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xác nhận xóa cung độ"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.length} bản ghi cung độ đã chọn? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Lands;
