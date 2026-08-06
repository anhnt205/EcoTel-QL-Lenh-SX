import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Department } from "@/types";
import { RoleEnum } from "@/enums";
import DepartmentService from "./services/departmentService";
import { getDepartmentColumns } from "./columns";
import {
  DepartmentFormDialog,
  type DepartmentFormValues,
} from "./components/DepartmentFormDialog";

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
import { useAuthStore } from "../auth/stores/auth.store";

const Departments = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === RoleEnum.ADMIN;
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] =
    useState<Department | null>(null);

  // Xóa theo ID
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Excel import loading
  const [isImporting, setIsImporting] = useState(false);

  // 1. Fetch data
  const {
    data: departments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["departments", searchValue],
    queryFn: () => DepartmentService.getAll({ code: searchValue }),
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: DepartmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Thêm đơn vị thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi thêm đơn vị");
    },
  });

  const updateMutation = useMutation({
    mutationFn: DepartmentService.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Cập nhật đơn vị thành công!");
      setDialogOpen(false);
    },
    onError: async (error: any) => {
      const message = await parseAxiosError(error);
      toast.error(message || "Lỗi khi cập nhật đơn vị");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: DepartmentService.delete,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
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
    mutationFn: (formData: FormData) => DepartmentService.importFile(formData),
    onMutate: () => setIsImporting(true),
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
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
    mutationFn: DepartmentService.exportFile,
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
    setSelectedDepartment(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (department: Department) => {
    setSelectedDepartment(department);
    setDialogOpen(true);
  };

  const handleFormSubmit = async (values: DepartmentFormValues) => {
    if (selectedDepartment) {
      await updateMutation.mutateAsync({
        ...values,
        _id: selectedDepartment._id,
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
    () => getDepartmentColumns({ onEdit: handleOpenEdit, isAdmin }),
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
            <BreadcrumbPage>Đơn vị</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Table */}
      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Danh sách Đơn vị"
          data={departments}
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
      <DepartmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={selectedDepartment}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Xác nhận xóa đơn vị"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.length} đơn vị đã chọn? Hành động này không thể hoàn tác.`}
        onConfirm={handleConfirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default Departments;
