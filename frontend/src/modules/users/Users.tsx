import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { RoleEnum } from "@/enums";
import UserService from "./services/userService";
import { getUserColumns } from "./columns";

import AppDataTable from "@/components/table/AppDataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuthStore } from "../auth/stores/auth.store";

const Users = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === RoleEnum.ADMIN;

  const [searchValue, setSearchValue] = useState("");

  const {
    data: users = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["users", searchValue],
    queryFn: () => UserService.getAll({ keyword: searchValue }),
  });

  const columns = useMemo(
    () => getUserColumns({ isAdmin }),
    [isAdmin]
  );

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Danh mục</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Người dùng & Lái xe</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Danh sách Người dùng / Lái xe"
          data={users}
          columns={columns}
          loading={isLoading}
          searchValue={searchValue}
          onSearch={(val) => setSearchValue(val)}
          onRefresh={refetch}
          showColumnToggle
          stickyHeader
        />
      </div>
    </div>
  );
};

export default Users;
