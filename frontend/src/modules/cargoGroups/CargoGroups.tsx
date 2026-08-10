import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import CargoGroupService from "./services/cargoGroupService";
import { getCargoGroupColumns } from "./columns";

import AppDataTable from "@/components/table/AppDataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const CargoGroups = () => {
  const [searchValue, setSearchValue] = useState("");

  const {
    data: cargoGroups = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["cargo-groups", searchValue],
    queryFn: () => CargoGroupService.getAll({ keyword: searchValue }),
  });

  const columns = useMemo(() => getCargoGroupColumns(), []);

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Danh mục</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Nhóm hàng</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Danh sách Nhóm hàng"
          data={cargoGroups}
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

export default CargoGroups;
