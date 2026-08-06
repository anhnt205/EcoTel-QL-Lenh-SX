import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { DeviceModel } from "@/types";
import { RoleEnum } from "@/enums";
import { useAuthStore } from "@/modules/auth/stores/auth.store";
import DeviceModelService from "./services/deviceModelService";
import { getDeviceModelColumns } from "./columns";
import {
  DeviceModelFormDialog,
  type DeviceModelFormValues,
} from "./components/DeviceModelFormDialog";

import AppDataTable from "@/components/table/AppDataTable";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { parseAxiosError } from "@/utils/handleApiError";

const DeviceModels = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === RoleEnum.ADMIN;
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeviceModel, setSelectedDeviceModel] =
    useState<DeviceModel | null>(null);

  // Xóa theo ID
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Excel import loading
  const [isImporting, setIsImporting] = useState(false);

  // 1. Fetch data
  const {
    data: devicemodels = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["devicemodels", searchValue],
    queryFn: () => DeviceModelService.getAll({ q: searchValue }),
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: DeviceModelService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devicemodels"] });
      toast.success("Thêm chủng loại thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi thêm chủng loại");
    },
  });

  const updateMutation = useMutation({
    mutationFn: DeviceModelService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devicemodels"] });
      toast.success("Cập nhật chủng loại thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi cập nhật chủng loại");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: DeviceModelService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["devicemodels"] });
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
    mutationFn: (formData: FormData) => DeviceModelService.importFile(formData),
    onMutate: () => setIsImporting(true),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["devicemodels"] });
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
    mutationFn: DeviceModelService.exportFile,
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
    setSelectedDeviceModel(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (deviceModel: DeviceModel) => {
    setSelectedDeviceModel(deviceModel);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (values: DeviceModelFormValues) => {
    if (selectedDeviceModel) {
      await updateMutation.mutateAsync({
        ...values,
        _id: selectedDeviceModel._id,
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
    () => getDeviceModelColumns({ onEdit: handleOpenEdit, isAdmin }),
    [isAdmin],
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
            <BreadcrumbPage>Chủng loại thiết bị</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Table */}
      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Bảng chủng loại thiết bị"
          data={devicemodels}
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
      </div>

      {/* Form Dialog (Add/Edit) */}
      <DeviceModelFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deviceModel={selectedDeviceModel}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xác nhận xóa chủng loại"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.length} chủng loại đã chọn? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default DeviceModels;