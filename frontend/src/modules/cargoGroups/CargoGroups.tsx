import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const {
    data: pageData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["cargo-groups", page, pageSize, searchValue],
    queryFn: () =>
      CargoGroupService.getAll({
        page,
        size: pageSize,
        sort: "id,DESC",
        keyword: searchValue,
      }),
    placeholderData: keepPreviousData,
  });

  const cargoGroups = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

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

export default CargoGroups;
