import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const {
    data: pageData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["shifts", page, pageSize, searchValue],
    queryFn: () =>
      ShiftService.getAll({
        page,
        size: pageSize,
        sort: "id,DESC",
        keyword: searchValue,
      }),
    placeholderData: keepPreviousData,
  });

  const shifts = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

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
          onSearch={(val) => {
            setSearchValue(val);
            setPage(0);
          }}
          onRefresh={refetch}
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
    </div>
  );
};

export default Shifts;
