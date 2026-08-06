import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Device } from "@/types";
import { RoleEnum, StatusDeviceEnum } from "@/enums";
import { useAuthStore } from "@/modules/auth/stores/auth.store";
import api from "@/config/api.config";
import DepartmentService from "@/modules/departments/services/departmentService";

import MachineService from "./services/machineService";
import { getMachineColumns } from "./columns";
import {
  MachineFormDialog,
  type MachineFormValues,
} from "./components/MachineFormDialog";

import AssetEbook from "@/components/common/AssetEbook";
import AppDataTable from "@/components/table/AppDataTable";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { parseAxiosError } from "@/utils/handleApiError";

const Machines = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === RoleEnum.ADMIN;
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);

  // Xóa theo ID
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Excel import loading
  const [isImporting, setIsImporting] = useState(false);

  // 1. Fetch data
  const {
    data: machines = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["machines", searchValue, departmentFilter, statusFilter],
    queryFn: () =>
      MachineService.getMachines({
        q: searchValue,
        department: departmentFilter,
        status: statusFilter,
      }),
  });

  const { data: allMachines = [] } = useQuery({
    queryKey: ["allMachines", searchValue, departmentFilter],
    queryFn: () =>
      MachineService.getAllMachines({
        q: searchValue,
        department: departmentFilter,
      }),
  });

  const { data: deviceTypes = [] } = useQuery({
    queryKey: ["DeviceTypes"],
    queryFn: () => api.get("/DeviceTypes").then((res) => res.data.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: () => DepartmentService.getAll(),
  });

  const { data: deviceModels = [] } = useQuery({
    queryKey: ["devicemodels"],
    queryFn: () => api.get("/devicemodels").then((res) => res.data.data),
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: MachineService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["allMachines"] });
      toast.success("Thêm thông tin máy thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi thêm thông tin máy");
    },
  });

  const updateMutation = useMutation({
    mutationFn: MachineService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["allMachines"] });
      toast.success("Cập nhật thông tin máy thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi cập nhật thông tin máy");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: MachineService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["allMachines"] });
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
    mutationFn: (formData: FormData) => MachineService.importFile(formData),
    onMutate: () => setIsImporting(true),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      queryClient.invalidateQueries({ queryKey: ["allMachines"] });
      setIsImporting(false);
      let combinedMessage = `Import dữ liệu hoàn tất. Đã xử lý ${data.summary?.totalProcessed || 0} bản ghi.`;
      combinedMessage += ` Đã thêm mới: ${data.summary?.insertedCount || 0}, Đã cập nhật: ${data.summary?.updatedCount || 0}`;
      toast.success(combinedMessage);
    },
    onError: async (error: any) => {
      setIsImporting(false);
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi import file Excel");
    },
  });

  const exportExcelMutation = useMutation({
    mutationFn: () => MachineService.exportFile(machines),
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
    setSelectedDevice(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (device: Device) => {
    setSelectedDevice(device);
    setDialogOpen(true);
  };

  const handleOpenView = (device: Device) => {
    setViewingDevice((prev) => (prev?._id === device._id ? null : device));
  };

  const handleFormSubmit = async (values: MachineFormValues) => {
    if (selectedDevice) {
      await updateMutation.mutateAsync({
        ...values,
        _id: selectedDevice._id,
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
    () =>
      getMachineColumns({
        onEdit: handleOpenEdit,
        onView: handleOpenView,
        isAdmin,
      }),
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
            <BreadcrumbPage>Thông tin máy</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Quick Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-1 border-b">
        <Button
          size="sm"
          variant={statusFilter === "" ? "default" : "outline"}
          onClick={() => setStatusFilter("")}
        >
          Tất cả ({allMachines.length})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === StatusDeviceEnum.AVAILABLE ? "default" : "outline"}
          className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === StatusDeviceEnum.AVAILABLE ? "" : StatusDeviceEnum.AVAILABLE,
            )
          }
        >
          Chờ điều động (
          {
            allMachines.filter((o) => o.status === StatusDeviceEnum.AVAILABLE)
              .length
          }
          )
        </Button>
        <Button
          size="sm"
          variant={statusFilter === StatusDeviceEnum.IN_USE ? "default" : "outline"}
          className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === StatusDeviceEnum.IN_USE ? "" : StatusDeviceEnum.IN_USE,
            )
          }
        >
          Đang hoạt động (
          {allMachines.filter((o) => o.status === StatusDeviceEnum.IN_USE).length}
          )
        </Button>
        <Button
          size="sm"
          variant={statusFilter === StatusDeviceEnum.MAINTENANCE ? "default" : "outline"}
          className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === StatusDeviceEnum.MAINTENANCE
                ? ""
                : StatusDeviceEnum.MAINTENANCE,
            )
          }
        >
          SC; BD (
          {
            allMachines.filter((o) => o.status === StatusDeviceEnum.MAINTENANCE)
              .length
          }
          )
        </Button>
      </div>

      {/* Main Container: Table + Side Panel AssetEbook */}
      <div className="flex flex-1 min-h-0 gap-4">
        <div className={`flex-1 min-h-0 ${viewingDevice ? "w-1/2" : "w-full"}`}>
          <AppDataTable
            title="Bảng thông tin máy"
            data={machines}
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

        {/* Side Panel Xem Hồ Sơ Tài Sản */}
        {viewingDevice && (
          <div className="w-1/2 min-h-0 bg-card rounded-xl border p-4 shadow-sm overflow-hidden flex flex-col">
            <AssetEbook
              asset={viewingDevice}
              onClose={() => setViewingDevice(null)}
            />
          </div>
        )}
      </div>

      {/* Form Dialog (Add/Edit) */}
      <MachineFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        device={selectedDevice}
        deviceTypes={deviceTypes}
        deviceModels={deviceModels}
        departments={departments}
        userRole={user?.role}
        userDepartmentId={(user as any)?.department?._id || (user as any)?.department}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xác nhận xóa thông tin máy"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.length} bản ghi máy đã chọn? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Machines;
