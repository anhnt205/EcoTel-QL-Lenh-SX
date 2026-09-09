import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";

import PositionService from "./services/positionService";
import { getPositionColumns } from "./columns";
import { PositionFormModal } from "./PositionFormModal";
import AppDataTable from "@/components/table/AppDataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Position } from "@/types";

const Positions = () => {
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);

  const {
    data: pageData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["positions", page, pageSize, searchValue],
    queryFn: () =>
      PositionService.getAll({
        page,
        size: pageSize,
        sort: "id,DESC",
        keyword: searchValue,
      }),
    placeholderData: keepPreviousData,
  });

  const positions = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  const handleDelete = async (position: Position) => {
    if (!position.id) return;
    if (!window.confirm(`Xóa chức vụ "${position.name}"?`)) return;
    try {
      await PositionService.delete(position.id);
      toast.success("Đã xóa chức vụ");
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Xóa chức vụ thất bại");
    }
  };

  const columns = useMemo(
    () =>
      getPositionColumns({
        onEdit: (p) => {
          setEditing(p);
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
            <BreadcrumbPage>Chức vụ</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Danh sách Chức vụ"
          data={positions}
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

      <PositionFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
};

export default Positions;
