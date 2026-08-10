import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { Device } from "@/types";
import { StatusDeviceEnum } from "@/enums";

import MachineService from "./services/machineService";
import { getMachineColumns } from "./columns";

import AssetEbook from "@/components/common/AssetEbook";
import AppDataTable from "@/components/table/AppDataTable";
import { Button } from "@/components/ui/button";
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
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter] = useState("");
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);

  // 1. Fetch data
  const {
    data: machines = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["machines", searchValue, departmentFilter, statusFilter],
    queryFn: () =>
      MachineService.getMachines({
        q: searchValue,
        department: departmentFilter,
        status: statusFilter,
      }),
  });

  const { data: allMachines = [] } = useQuery({
    queryKey: ["allMachines", searchValue, departmentFilter],
    queryFn: () =>
      MachineService.getAllMachines({
        q: searchValue,
        department: departmentFilter,
      }),
  });

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

      {/* Quick Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-1 border-b">
        <Button
          size="sm"
          variant={statusFilter === "" ? "default" : "outline"}
          onClick={() => setStatusFilter("")}
        >
          Tất cả ({allMachines.length})
        </Button>
        <Button
          size="sm"
          variant={
            statusFilter === StatusDeviceEnum.AVAILABLE ? "default" : "outline"
          }
          className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === StatusDeviceEnum.AVAILABLE
                ? ""
                : StatusDeviceEnum.AVAILABLE,
            )
          }
        >
          Chờ điều động (
          {
            allMachines.filter((o) => o.status === StatusDeviceEnum.AVAILABLE)
              .length
          }
          )
        </Button>
        <Button
          size="sm"
          variant={
            statusFilter === StatusDeviceEnum.IN_USE ? "default" : "outline"
          }
          className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === StatusDeviceEnum.IN_USE ? "" : StatusDeviceEnum.IN_USE,
            )
          }
        >
          Đang hoạt động (
          {
            allMachines.filter((o) => o.status === StatusDeviceEnum.IN_USE)
              .length
          }
          )
        </Button>
        <Button
          size="sm"
          variant={
            statusFilter === StatusDeviceEnum.MAINTENANCE
              ? "default"
              : "outline"
          }
          className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
          onClick={() =>
            setStatusFilter((prev) =>
              prev === StatusDeviceEnum.MAINTENANCE
                ? ""
                : StatusDeviceEnum.MAINTENANCE,
            )
          }
        >
          SC; BD (
          {
            allMachines.filter((o) => o.status === StatusDeviceEnum.MAINTENANCE)
              .length
          }
          )
        </Button>
      </div>

      {/* Main Container: Table + Side Panel AssetEbook */}
      <div className="flex flex-1 min-h-0 gap-4">
        <div className={`flex-1 min-h-0 ${viewingDevice ? "w-1/2" : "w-full"}`}>
          <AppDataTable
            title="Bảng thông tin máy"
            data={machines}
            columns={columns}
            loading={isLoading}
            searchValue={searchValue}
            onSearch={(val) => setSearchValue(val)}
            onRefresh={refetch}
            showColumnToggle
            stickyHeader
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
