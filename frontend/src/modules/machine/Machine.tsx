import { useState, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import type { Device } from "@/types";

import MachineService from "./services/machineService";
import { getMachineColumns } from "./columns";

import AssetEbook from "@/components/common/AssetEbook";
import AppDataTable from "@/components/table/AppDataTable";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const Machines = () => {
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [departmentFilter] = useState("");
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);

  // 1. Fetch data
  const {
    data: machinesPage,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["machines", page, pageSize, searchValue, departmentFilter],
    queryFn: () =>
      MachineService.getMachines({
        page,
        size: pageSize,
        sort: "id,DESC",
        q: searchValue,
        department: departmentFilter,
      }),
    placeholderData: keepPreviousData,
  });

  const machines = machinesPage?.content ?? [];
  const totalElements = machinesPage?.totalElements ?? 0;
  const totalPages = machinesPage?.totalPages ?? 0;

  const handleOpenView = (device: Device) => {
    setViewingDevice((prev) => (prev?._id === device._id || (prev as any)?.id === (device as any).id ? null : device));
  };

  // Table Columns
  const columns = useMemo(
    () =>
      getMachineColumns({
        onEdit: () => {},
        onView: handleOpenView,
        isAdmin: false,
      }),
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
            <BreadcrumbPage>Thông tin máy</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Container: Table + Side Panel AssetEbook */}
      <div className="flex flex-1 min-h-0 gap-4">
        <div className={`flex-1 min-h-0 ${viewingDevice ? "w-1/2" : "w-full"}`}>
          <AppDataTable
            title="Bảng thông tin máy"
            data={machines}
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

        {/* Side Panel Xem Hồ Sơ Tài Sản */}
        {viewingDevice && (
          <div className="w-1/2 min-h-0 bg-card rounded-xl border p-4 shadow-sm overflow-hidden flex flex-col">
            <AssetEbook
              asset={viewingDevice}
              onClose={() => setViewingDevice(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Machines;
