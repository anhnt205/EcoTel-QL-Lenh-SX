import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import VehicleService from "./services/vehicleService";
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

const Vehicles = () => {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter] = useState("");
  const [departmentFilter] = useState("");

  // 1. Fetch data
  const {
    data: vehicles = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["vehicles", searchValue, departmentFilter, statusFilter],
    queryFn: () =>
      VehicleService.getVehicles({
        q: searchValue,
        department: departmentFilter,
        status: statusFilter,
      }),
  });
  // Table Column
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
            <BreadcrumbPage>Thông tin xe</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-1 min-h-0 gap-4">
        <div className="flex-1 min-h-0">
          <AppDataTable
            title="Bảng thông tin xe"
            data={vehicles}
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
    </div>
  );
};

export default Vehicles;
