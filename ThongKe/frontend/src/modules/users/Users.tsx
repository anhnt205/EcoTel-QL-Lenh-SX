import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import UserService from "./services/userService";
import { getUserColumns } from "./columns";
import { UserFormModal } from "./UserFormModal";

import AppDataTable from "@/components/table/AppDataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { User } from "@/types";

const Users = () => {
  const isAdmin = true;

  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const {
    data: pageData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["users", page, pageSize, searchValue],
    queryFn: () =>
      UserService.getAll({
        page,
        size: pageSize,
        sort: "id,DESC",
        keyword: searchValue,
      }),
    placeholderData: keepPreviousData,
  });

  const users = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  const columns = useMemo(
    () =>
      getUserColumns({
        isAdmin,
        onEdit: (u) => {
          setEditing(u);
          setModalOpen(true);
        },
      }),
    [isAdmin],
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
            <BreadcrumbPage>Tài khoản</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Danh sách Tài khoản"
          data={users}
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

      <UserFormModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
};

export default Users;
