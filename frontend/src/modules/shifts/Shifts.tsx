import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import ShiftService from "./services/shiftService";
import { getShiftColumns } from "./columns";

import AppDataTable from "@/components/table/AppDataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const Shifts = () => {
  const [searchValue, setSearchValue] = useState("");

  const {
    data: shifts = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["shifts", searchValue],
    queryFn: () => ShiftService.getAll({ keyword: searchValue }),
  });

  const columns = useMemo(() => getShiftColumns(), []);

  return (
    <div className="flex flex-col h-full gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Danh mục</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Ca làm việc</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Danh sách Ca làm việc"
          data={shifts}
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

export default Shifts;
