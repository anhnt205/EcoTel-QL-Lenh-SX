import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Location } from "@/types";
import { RoleEnum } from "@/enums";
import { useAuthStore } from "@/modules/auth/stores/auth.store";
import LocationService from "./services/locationService";
import { getLocationColumns } from "./columns";
import {
  LocationFormDialog,
  type LocationFormValues,
} from "./components/LocationFormDialog";

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

const Locations = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === RoleEnum.ADMIN;
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  // Xóa theo ID
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Excel import loading
  const [isImporting, setIsImporting] = useState(false);

  // 1. Fetch data
  const {
    data: locations = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["locations", searchValue],
    queryFn: () => LocationService.getAll({ name: searchValue }),
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: LocationService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Thêm điểm đổ tải thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi thêm điểm đổ tải");
    },
  });

  const updateMutation = useMutation({
    mutationFn: LocationService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Cập nhật điểm đổ tải thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi cập nhật điểm đổ tải");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: LocationService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
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
    mutationFn: (formData: FormData) => LocationService.importFile(formData),
    onMutate: () => setIsImporting(true),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
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
    mutationFn: LocationService.exportFile,
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
    setSelectedLocation(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (location: Location) => {
    setSelectedLocation(location);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (values: LocationFormValues) => {
    if (selectedLocation) {
      await updateMutation.mutateAsync({
        ...values,
        _id: selectedLocation._id,
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
    () => getLocationColumns({ onEdit: handleOpenEdit, isAdmin }),
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
            <BreadcrumbPage>Điểm đổ tải</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Table */}
      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Bảng điểm đổ tải"
          data={locations}
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
      <LocationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        location={selectedLocation}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xác nhận xóa điểm đổ tải"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.length} điểm đổ tải đã chọn? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Locations;