import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import DepartmentService from "./services/departmentService";
import { columns } from "./columns";
import AppDataTable from "@/components/table/AppDataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const Departments = () => {
  const [searchValue, setSearchValue] = useState("");

  // 1. Fetch data
  const {
    data: departments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["departments", searchValue],
    queryFn: () => DepartmentService.getAll({ keyword: searchValue }),
  });

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
          title="Danh sách Đơn vị / Phòng ban"
          data={departments}
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

export default Departments;
