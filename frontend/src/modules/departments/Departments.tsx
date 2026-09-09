import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";

import DepartmentService from "./services/departmentService";
import { getDepartmentColumns } from "./columns";
import { DepartmentFormModal } from "./DepartmentFormModal";
import AppDataTable from "@/components/table/AppDataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Department } from "@/types";

const Departments = () => {
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const {
    data: pageData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["departments", page, pageSize, searchValue],
    queryFn: () =>
      DepartmentService.getAll({
        page,
        size: pageSize,
        sort: "id,DESC",
        keyword: searchValue,
      }),
    placeholderData: keepPreviousData,
  });

  const departments = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  const handleDelete = async (department: Department) => {
    if (!department.id) return;
    if (!window.confirm(`Xóa phòng ban "${department.name}"?`)) return;
    try {
      await DepartmentService.delete(department.id);
      toast.success("Đã xóa phòng ban");
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Xóa phòng ban thất bại");
    }
  };

  const columns = useMemo(
    () =>
      getDepartmentColumns({
        onEdit: (d) => {
          setEditing(d);
          setModalOpen(true);
        },
        onDelete: handleDelete,
      }),
    [],
  );

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Danh mục hệ thống</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Phòng ban</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Danh sách Phòng ban"
          data={departments}
          columns={columns}
          loading={isLoading}
          searchValue={searchValue}
          onSearch={(val) => {
            setSearchValue(val);
            setPage(0);
          }}
          onRefresh={refetch}
          onAdd={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          showColumnToggle
          stickyHeader
          manualPagination
          page={page}
          rowsPerPage={pageSize}
          pageCount={totalPages}
          totalCount={totalElements}
          onPageChange={(newPage) => setPage(newPage)}
          onRowsPerPageChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
        />
      </div>

      <DepartmentFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
};

export default Departments;
