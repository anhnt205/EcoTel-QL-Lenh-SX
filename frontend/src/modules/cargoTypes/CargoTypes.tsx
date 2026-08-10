import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import CargoTypeService from "./services/cargoTypeService";
import { getCargoTypeColumns } from "./columns";

import AppDataTable from "@/components/table/AppDataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const CargoTypes = () => {
  const [searchValue, setSearchValue] = useState("");

  const {
    data: cargoTypes = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["cargo-types", searchValue],
    queryFn: () => CargoTypeService.getAll({ keyword: searchValue }),
  });

  const columns = useMemo(() => getCargoTypeColumns(), []);

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Danh mục</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Loại hàng</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Danh sách Loại hàng"
          data={cargoTypes}
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

export default CargoTypes;
