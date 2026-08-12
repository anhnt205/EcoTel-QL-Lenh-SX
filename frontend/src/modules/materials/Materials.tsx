import { useState, useEffect, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import dayjs from "dayjs";

import MaterialService from "./services/materialService";
import { getMaterialColumns } from "./columns";
import AppDataTable from "@/components/table/AppDataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface HistoryTimeSlot {
  id: string;
  startTime: Date | null;
  endTime: Date | null;
}

const Materials = () => {
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<HistoryTimeSlot | null>(null);
  const [timeSlots, setTimeSlots] = useState<HistoryTimeSlot[]>([]);

  // 1. Fetch data
  const {
    data: pageData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["materials", page, pageSize, searchValue],
    queryFn: () =>
      MaterialService.getAll({
        page,
        size: pageSize,
        sort: "id,DESC",
        keyword: searchValue,
      }),
    placeholderData: keepPreviousData,
  });

  const materials = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  useEffect(() => {
    if (materials.length > 0) {
      const allHistory: HistoryTimeSlot[] = [];
      const seen = new Set();

      materials.forEach((m: any) => {
        m.valueHistory?.forEach((h: any) => {
          const key = `${h.startTime}-${h.endTime}`;
          if (!seen.has(key)) {
            seen.add(key);
            allHistory.push({
              id: key,
              startTime: h.startTime ? new Date(h.startTime) : null,
              endTime: h.endTime ? new Date(h.endTime) : null,
            });
          }
        });
      });

      setTimeSlots(allHistory);
    }
  }, [materials]);

  // Filter materials locally by selected time slot if specified
  const filteredMaterials = useMemo(() => {
    if (!selectedTimeSlot) return materials;
    return materials.map((m: any) => {
      const matchingHistory = m.valueHistory?.filter((h: any) => {
        const sTime = h.startTime ? new Date(h.startTime).getTime() : 0;
        const eTime = h.endTime ? new Date(h.endTime).getTime() : 0;
        const selSTime = selectedTimeSlot.startTime ? selectedTimeSlot.startTime.getTime() : 0;
        const selETime = selectedTimeSlot.endTime ? selectedTimeSlot.endTime.getTime() : 0;
        return sTime === selSTime && eTime === selETime;
      });
      return {
        ...m,
        valueHistory: matchingHistory && matchingHistory.length > 0 ? matchingHistory : m.valueHistory,
      };
    });
  }, [materials, selectedTimeSlot]);

  // Table Columns
  const columns = useMemo(() => getMaterialColumns(), []);

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
            <BreadcrumbPage>Vật liệu</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Time Slot Filter Selector */}
      {timeSlots.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-card rounded-lg border w-fit shadow-xs">
          <span className="text-sm font-medium">Lọc theo khoảng thời gian:</span>
          <Select
            value={selectedTimeSlot?.id || "all"}
            onValueChange={(val) => {
              if (val === "all") {
                setSelectedTimeSlot(null);
              } else {
                const slot = timeSlots.find((s) => s.id === val);
                setSelectedTimeSlot(slot || null);
              }
            }}
          >
            <SelectTrigger className="w-[300px] h-9">
              <SelectValue placeholder="Tất cả khoảng thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khoảng thời gian</SelectItem>
              {timeSlots.map((slot) => (
                <SelectItem key={slot.id} value={slot.id}>
                  Từ {dayjs(slot.startTime).format("DD/MM/YYYY")} - Đến{" "}
                  {dayjs(slot.endTime).format("DD/MM/YYYY")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Main Table */}
      <div className="flex-1 min-h-0">
        <AppDataTable
          title="Danh sách Vật liệu"
          data={filteredMaterials}
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

export default Materials;