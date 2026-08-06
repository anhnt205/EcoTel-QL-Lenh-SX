import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { DeviceType } from "@/types";
import { RoleEnum } from "@/enums";
import { useAuthStore } from "@/modules/auth/stores/auth.store";
import DeviceTypeService from "./services/deviceTypeService";
import { getDeviceTypeColumns } from "./columns";
import {
  DeviceTypeFormDialog,
  type DeviceTypeFormValues,
} from "./components/DeviceTypeFormDialog";

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

const DeviceTypes = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === RoleEnum.ADMIN;
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] =
    useState<DeviceType | null>(null);

  // Xóa theo ID
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // 1. Fetch data
  const {
    data: deviceTypes = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["DeviceTypes", searchValue],
    queryFn: () => DeviceTypeService.getAll({ q: searchValue }),
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: DeviceTypeService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["DeviceTypes"] });
      toast.success("Thêm loại thiết bị thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi thêm loại thiết bị");
    },
  });

  const updateMutation = useMutation({
    mutationFn: DeviceTypeService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["DeviceTypes"] });
      toast.success("Cập nhật loại thiết bị thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi cập nhật loại thiết bị");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: DeviceTypeService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["DeviceTypes"] });
      setSelectedIds([]);
      setConfirmDeleteOpen(false);
      toast.success(message || "Xóa thành công!");
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi xóa bản ghi");
    },
  });

  // Handlers
  const handleOpenAdd = () => {
    setSelectedDeviceType(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (deviceType: DeviceType) => {
    setSelectedDeviceType(deviceType);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (values: DeviceTypeFormValues) => {
    if (selectedDeviceType) {
      await updateMutation.mutateAsync({
        ...values,
        _id: selectedDeviceType._id,
      });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedIds.length === 0) return;
    deleteMutation.mutate(selectedIds);
  };

  // Table Columns
  const columns = useMemo(
    () => getDeviceTypeColumns({ onEdit: handleOpenEdit, isAdmin }),
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
            <BreadcrumbPage>Phân loại thiết bị</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Table */}
      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Bảng phân loại thiết bị"
          data={deviceTypes}
          columns={columns}
          loading={isLoading}
          searchValue={searchValue}
          onSearch={(val) => setSearchValue(val)}
          onRefresh={refetch}
          onAdd={isAdmin ? handleOpenAdd : undefined}
          showColumnToggle
          stickyHeader
        />
      </div>

      {/* Form Dialog (Add/Edit) */}
      <DeviceTypeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        deviceType={selectedDeviceType}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xác nhận xóa loại thiết bị"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.length} loại thiết bị đã chọn? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default DeviceTypes;