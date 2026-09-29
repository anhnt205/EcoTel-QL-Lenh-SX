import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/config/api.config";
import { formatDate } from "@/lib/utils";
import { createCatalogService } from "../catalogService";
import { downloadCatalogExcel, parseCatalogExcel } from "../catalogExcel";
import { densityParameterConfig } from "../configs";
import { DensityAddModal } from "./DensityAddModal";
import { groupIntoBatches, type DensityBatch, type DensityParameterResponse } from "./types";

interface ExcavationAreaOption {
  id: number;
  name: string;
}

type ModalMode = "create" | "view" | "edit";

/**
 * Màn danh mục Tỷ trọng — KHÔNG dùng `CatalogPage` chung nữa.
 *
 * Trước đây mỗi bản ghi phẳng (một mã hàng × một khoảng thời gian) là một
 * dòng riêng trên bảng — đúng dữ liệu lưu, nhưng xem lại thì rã rời, không
 * còn thấy "lần nhập đó gồm những mã nào". Giờ bảng gộp các bản ghi có
 * CÙNG (Thời gian, Khu vực xúc) thành một LÔ — đúng đơn vị mà popup
 * "Thêm mới tỷ trọng" tạo ra. Bấm Xem/Sửa mở lại đúng popup đó, đọc lại
 * hoặc chỉnh cả lô cùng lúc.
 *
 * Dữ liệu tải MỘT LẦN (size lớn) rồi gộp/lọc/phân trang ở trình duyệt —
 * hợp lý cho quy mô một danh mục nội bộ (không phải bảng công khai hàng
 * triệu dòng), và là cách duy nhất để gộp theo (Thời gian, Khu vực xúc):
 * việc đó không làm được bằng phân trang phía server trên bảng phẳng.
 */
export default function DensityParametersPage() {
  const service = useMemo(
    () => createCatalogService<DensityParameterResponse>(densityParameterConfig.basePath),
    [],
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["density-parameters", "all"],
    queryFn: async () => {
      const res = await api.get(densityParameterConfig.basePath, {
        params: { size: 1000, sort: "effectiveFrom,DESC" },
      });
      return (res.data?.data?.content ?? []) as DensityParameterResponse[];
    },
  });

  const batches = useMemo(() => groupIntoBatches(data ?? []), [data]);

  const [excavationAreas, setExcavationAreas] = useState<ExcavationAreaOption[]>([]);
  useEffect(() => {
    api
      .get("/excavation-areas", { params: { size: 500 } })
      .then((res) => {
        const list = (res.data?.data?.content ?? res.data?.data ?? []) as ExcavationAreaOption[];
        setExcavationAreas(list);
      })
      .catch(() => toast.error("Không tải được danh sách khu vực xúc."));
  }, []);

  // ── Bộ lọc trên bảng: Năm + Khu vực xúc ──────────────────────────────────
  const [yearFilter, setYearFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    for (const b of batches) {
      const fromY = Number(b.effectiveFrom.slice(0, 4));
      const toY = Number(b.effectiveTo.slice(0, 4));
      for (let y = fromY; y <= toY; y++) years.add(y);
    }
    return [...years].sort((a, b) => b - a);
  }, [batches]);

  const filteredBatches = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    return batches.filter((b) => {
      if (yearFilter) {
        const y = Number(yearFilter);
        const overlaps = b.effectiveFrom <= `${y}-12-31` && b.effectiveTo >= `${y}-01-01`;
        if (!overlaps) return false;
      }
      if (areaFilter === "NONE" && b.excavationAreaId !== null) return false;
      if (areaFilter && areaFilter !== "NONE" && String(b.excavationAreaId) !== areaFilter) {
        return false;
      }
      if (q) {
        const hit =
          b.excavationAreaName.toLowerCase().includes(q) ||
          b.records.some(
            (r) =>
              r.cargoTypeCode.toLowerCase().includes(q) ||
              r.cargoTypeName.toLowerCase().includes(q),
          );
        if (!hit) return false;
      }
      return true;
    });
  }, [batches, yearFilter, areaFilter, searchValue]);

  // ── Modal thêm mới / xem / sửa ────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [activeBatch, setActiveBatch] = useState<DensityBatch | undefined>(undefined);

  const openCreate = () => {
    setActiveBatch(undefined);
    setModalMode("create");
    setModalOpen(true);
  };
  const openView = (b: DensityBatch) => {
    setActiveBatch(b);
    setModalMode("view");
    setModalOpen(true);
  };
  const openEdit = (b: DensityBatch) => {
    setActiveBatch(b);
    setModalMode("edit");
    setModalOpen(true);
  };

  /** Xoá cả LÔ — tức xoá mọi bản ghi phẳng đứng sau nó, không phải một dòng. */
  const handleDeleteBatch = async (b: DensityBatch) => {
    const codes = b.records.map((r) => r.cargoTypeCode).join(", ");
    if (
      !window.confirm(
        `Xoá lô "${formatDate(b.effectiveFrom)} - ${formatDate(b.effectiveTo)}" (${b.excavationAreaName})?\n\n` +
          `Toàn bộ ${b.records.length} mã hàng trong lô sẽ bị xoá: ${codes}`,
      )
    ) {
      return;
    }
    try {
      await service.bulkRemove(b.records.map((r) => r.id));
      toast.success(`Đã xoá lô — ${b.records.length} tỷ trọng.`);
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Xoá thất bại.");
    }
  };

  // ── Xuất / nhập Excel — vẫn thao tác trên BẢN GHI PHẲNG bên dưới lô ───────
  const handleExport = (selectedRows: DensityBatch[]) => {
    const flat = selectedRows.flatMap((b) => b.records) as unknown as Record<string, unknown>[];
    const { isTemplate, count } = downloadCatalogExcel(densityParameterConfig, flat);
    toast.success(
      isTemplate
        ? "Đã tải file mẫu (chỉ có dòng tiêu đề). Chọn lô trong bảng nếu muốn tải kèm dữ liệu."
        : `Đã tải ${count} dòng dữ liệu từ ${selectedRows.length} lô đã chọn.`,
    );
  };

  const [isImporting, setIsImporting] = useState(false);

  const buildLookups = async () => {
    const lookups: Record<string, Map<string, number>> = {};
    for (const f of densityParameterConfig.fields.filter((x) => x.optionsPath)) {
      const res = await api.get(f.optionsPath!, { params: { size: 500 } });
      const list = (res.data?.data?.content ?? res.data?.data ?? []) as {
        id: number;
        name: string;
      }[];
      lookups[f.key] = new Map(list.map((it) => [String(it.name).trim().toLowerCase(), it.id]));
    }
    return lookups;
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const lookups = await buildLookups();
      const { payloads, errors } = await parseCatalogExcel(densityParameterConfig, file, lookups);
      if (errors.length > 0) {
        toast.error(
          `File có ${errors.length} lỗi:\n${errors.slice(0, 5).join("\n")}${
            errors.length > 5 ? `\n… và ${errors.length - 5} lỗi khác` : ""
          }`,
          { duration: 10000 },
        );
        if (payloads.length === 0) return;
      }
      await service.bulkCreate(payloads);
      toast.success(`Đã thêm ${payloads.length} tỷ trọng.`);
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Nhập file thất bại.");
    } finally {
      setIsImporting(false);
    }
  };

  // ── Cột bảng: gộp theo lô, đúng thiết kế chủ dự án đưa ────────────────────
  const columns = useMemo<ColumnDef<DensityBatch, unknown>[]>(
    () => [
      {
        id: "select",
        size: 44,
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Chọn tất cả"
            className="h-4 w-4 cursor-pointer accent-blue-600"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomePageRowsSelected();
            }}
            onChange={(e) => table.toggleAllPageRowsSelected(e.currentTarget.checked)}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label="Chọn dòng"
            className="h-4 w-4 cursor-pointer accent-blue-600"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.currentTarget.checked)}
          />
        ),
      },
      {
        id: "stt",
        header: "STT",
        size: 64,
        cell: ({ row }) => row.index + 1,
      },
      {
        id: "thoiGian",
        header: "Thời gian",
        // Rộng hẳn để hút hết khoảng trống thừa của bảng — bảng chỉ có 3 cột
        // dữ liệu, không đủ tự nhiên lấp đầy chiều rộng như các danh mục
        // khác có 8-10 cột; không khai rộng thì phần thừa dồn hết vào cột
        // Thao tác, kéo dài ra rất xấu dù chỉ có vài icon.
        size: 340,
        cell: ({ row }) =>
          `${formatDate(row.original.effectiveFrom)} - ${formatDate(row.original.effectiveTo)}`,
      },
      {
        id: "khuVucXuc",
        header: "Khu vực xúc",
        size: 420,
        cell: ({ row }) => row.original.excavationAreaName,
      },
      {
        id: "actions",
        header: "Thao tác",
        size: 130,
        meta: { align: "left" },
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              title="Xem chi tiết"
              onClick={() => openView(row.original)}
              className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              title="Sửa"
              onClick={() => openEdit(row.original)}
              className="rounded p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              title="Xoá"
              onClick={() => handleDeleteBatch(row.original)}
              className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          {densityParameterConfig.breadcrumb.map((b) => (
            <React.Fragment key={b}>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">{b}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage>{densityParameterConfig.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">
          {densityParameterConfig.title}
        </h1>
        <Button
          onClick={openCreate}
          className="h-9 gap-1.5 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Thêm mới
        </Button>
      </div>

      {/* Bộ lọc — luôn hiện trên bảng, không cần bấm mở */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-gray-50/60 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900/30">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Thời gian</span>
          <Select value={yearFilter || "ALL"} onValueChange={(v) => setYearFilter(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả năm</SelectItem>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Năm {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Khu vực xúc</span>
          <Select value={areaFilter || "ALL"} onValueChange={(v) => setAreaFilter(v === "ALL" ? "" : v)}>
            <SelectTrigger className="h-9 w-56 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="NONE">— Áp cho mọi khu vực —</SelectItem>
              {excavationAreas.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <AppDataTable
          title="Bảng tỷ trọng"
          data={filteredBatches}
          columns={columns}
          loading={isLoading}
          searchValue={searchValue}
          onSearch={setSearchValue}
          onRefresh={refetch}
          onImportExcel={handleImport}
          importExcelAccept=".xlsx,.xls"
          isImporting={isImporting}
          showExport
          onExportCsv={handleExport}
          exportCsvLabel="Tải xuống (Excel)"
          showColumnToggle
          stickyHeader
        />
      </div>

      <DensityAddModal
        open={modalOpen}
        mode={modalMode}
        batch={activeBatch}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
