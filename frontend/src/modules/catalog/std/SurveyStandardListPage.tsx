import React, { useMemo, useState } from "react";
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
import api from "@/config/api.config";
import { formatDate } from "@/lib/utils";
import { createCatalogService } from "../catalogService";
import { downloadCatalogExcel, parseCatalogExcel } from "../catalogExcel";
import { surveyStandardDatSxConfig } from "../configs";
import { SurveyStandardAddModal } from "./SurveyStandardAddModal";
import type { SurveyStandardResponse } from "./types";

type ModalMode = "create" | "view" | "edit";

const CATALOG_TYPE = surveyStandardDatSxConfig.fixedValues?.catalogType as string;

/**
 * Màn danh mục STD (Đất SX/Than SX) — KHÔNG dùng `CatalogPage` chung nữa.
 *
 * Bảng cũ hiện đủ 20 cột (sáu ô khoá + 14 ô giá trị) trên một dòng — đúng
 * dữ liệu nhưng không đọc lướt được. Chủ dự án đưa mockup rút gọn: chỉ còn
 * STT, Thời gian, Mã (khoá), và Thao tác — Xem/Sửa mở lại đúng popup
 * "Thêm mới" (chỉ đọc hoặc ghi được), chi tiết đầy đủ nằm trong đó, không
 * cần hiện hết ra bảng ngoài.
 */
export default function SurveyStandardListPage() {
  const service = useMemo(
    () => createCatalogService<SurveyStandardResponse>(surveyStandardDatSxConfig.basePath),
    [],
  );

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchValue, setSearchValue] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["survey-standards", CATALOG_TYPE, page, pageSize, searchValue],
    queryFn: () =>
      service.getAll({
        catalogType: CATALOG_TYPE,
        page,
        size: pageSize,
        sort: "effectiveFrom,DESC",
        keyword: searchValue,
      }),
  });

  const rows = data?.content ?? [];

  // ── Modal thêm mới / xem / sửa ────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [activeRecords, setActiveRecords] = useState<SurveyStandardResponse[] | undefined>(undefined);

  const openCreate = () => {
    setActiveRecords(undefined);
    setModalMode("create");
    setModalOpen(true);
  };
  const openView = (r: SurveyStandardResponse) => {
    setActiveRecords([r]);
    setModalMode("view");
    setModalOpen(true);
  };
  const openEdit = (r: SurveyStandardResponse) => {
    setActiveRecords([r]);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleDelete = async (r: SurveyStandardResponse) => {
    if (
      !window.confirm(
        `Xoá dòng STD "${r.seamGroupExcavatorKey}" (${formatDate(r.effectiveFrom)} - ${formatDate(r.effectiveTo)})?`,
      )
    ) {
      return;
    }
    try {
      await service.remove(r.id);
      toast.success("Đã xoá dòng STD.");
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Xoá thất bại.");
    }
  };

  // ── Xuất / nhập Excel — dữ liệu đã sẵn phẳng, không cần gộp/tách gì ───────
  const handleExport = (selectedRows: SurveyStandardResponse[]) => {
    const { isTemplate, count } = downloadCatalogExcel(
      surveyStandardDatSxConfig,
      selectedRows as unknown as Record<string, unknown>[],
    );
    toast.success(
      isTemplate
        ? "Đã tải file mẫu (chỉ có dòng tiêu đề). Chọn dòng trong bảng nếu muốn tải kèm dữ liệu."
        : `Đã tải ${count} dòng đã chọn.`,
    );
  };

  const [isImporting, setIsImporting] = useState(false);

  const buildLookups = async () => {
    const lookups: Record<string, Map<string, number>> = {};
    for (const f of surveyStandardDatSxConfig.fields.filter((x) => x.optionsPath)) {
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
      const { payloads, errors } = await parseCatalogExcel(surveyStandardDatSxConfig, file, lookups);
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
      toast.success(`Đã thêm ${payloads.length} dòng STD.`);
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Nhập file thất bại.");
    } finally {
      setIsImporting(false);
    }
  };

  // ── Cột bảng: đúng 4 cột theo mockup chủ dự án đưa ────────────────────────
  const columns = useMemo<ColumnDef<SurveyStandardResponse, unknown>[]>(
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
        cell: ({ row }) => page * pageSize + row.index + 1,
      },
      {
        id: "thoiGian",
        header: "Thời gian",
        size: 340,
        cell: ({ row }) =>
          `${formatDate(row.original.effectiveFrom)} - ${formatDate(row.original.effectiveTo)}`,
      },
      {
        id: "ma",
        header: "Mã (khoá)",
        cell: ({ row }) => (
          <span className="break-all font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
            {row.original.seamGroupExcavatorKey}
          </span>
        ),
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
              onClick={() => handleDelete(row.original)}
              className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, pageSize],
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          {surveyStandardDatSxConfig.breadcrumb.map((b) => (
            <React.Fragment key={b}>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">{b}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage>{surveyStandardDatSxConfig.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">
          {surveyStandardDatSxConfig.title}
        </h1>
        <Button
          onClick={openCreate}
          className="h-9 gap-1.5 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Thêm mới
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <AppDataTable
          title={`Bảng ${surveyStandardDatSxConfig.title.toLowerCase()}`}
          data={rows}
          columns={columns}
          loading={isLoading}
          searchValue={searchValue}
          onSearch={(val: string) => {
            setSearchValue(val);
            setPage(0);
          }}
          onRefresh={refetch}
          onImportExcel={handleImport}
          importExcelAccept=".xlsx,.xls"
          isImporting={isImporting}
          showExport
          onExportCsv={handleExport}
          exportCsvLabel="Tải xuống (Excel)"
          showColumnToggle
          stickyHeader
          manualPagination
          page={page}
          rowsPerPage={pageSize}
          pageCount={data?.totalPages ?? 0}
          totalCount={data?.totalElements ?? 0}
          onPageChange={setPage}
          onRowsPerPageChange={(s: number) => {
            setPageSize(s);
            setPage(0);
          }}
        />
      </div>

      <SurveyStandardAddModal
        open={modalOpen}
        mode={modalMode}
        records={activeRecords}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
