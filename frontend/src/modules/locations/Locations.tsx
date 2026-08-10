import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import LocationService from "./services/locationService";
import { getLocationColumns } from "./columns";
import AppDataTable from "@/components/table/AppDataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const Locations = () => {
  const [searchValue, setSearchValue] = useState("");

  // 1. Fetch data
  const {
    data: locations = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["locations", searchValue],
    queryFn: () => LocationService.getAll({ keyword: searchValue }),
  });

  // Table Columns
  const columns = useMemo(
    () => getLocationColumns({ onEdit: () => {}, isAdmin: false }),
    [],
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

      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Danh sách điểm đổ tải"
          data={locations}
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

export default Locations;