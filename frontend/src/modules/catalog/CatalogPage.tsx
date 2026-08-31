import React, { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { createCatalogService } from "./catalogService";
import { CatalogFormModal } from "./CatalogFormModal";
import { downloadCatalogExcel, parseCatalogExcel } from "./catalogExcel";
import type { CatalogConfig } from "./types";

type Rec = Record<string, unknown> & { id?: number };

/**
 * Màn danh mục DÙNG CHUNG cho cả 5 danh mục.
 *
 * Năm danh mục có cùng hợp đồng API và cùng bố cục (bảng + tìm kiếm + thêm/
 * sửa/xoá), nên gom về một trang cấu hình bằng `CatalogConfig` thay vì chép
 * 5 lần — sửa một chỗ là cả 5 màn cùng đổi.
 */
export function CatalogPage({
  config,
  extraActions,
}: {
  config: CatalogConfig;
  /** Nút phụ cạnh "Thêm mới" — vd bộ dựng khoá của màn STD. */
  extraActions?: React.ReactNode;
}) {
  const service = useMemo(
    () => createCatalogService<Rec>(config.basePath),
    [config.basePath],
  );

  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [config.basePath, page, pageSize, searchValue, config.fixedValues],
    queryFn: () =>
      service.getAll({
        page,
        size: pageSize,
        sort: "id,DESC",
        keyword: searchValue,
        // Màn dùng chung một bảng backend thì phải lọc, nếu không sẽ thấy
        // cả dữ liệu của màn kia.
        ...(config.fixedValues ?? {}),
      }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.content ?? [];

  const handleDelete = async (row: Rec) => {
    if (
      !window.confirm(
        `Xoá ${config.nounPhrase} "${String(
          row[config.labelKey ?? config.fields[1]?.key ?? "name"] ?? "",
        )}"?`,
      )
    ) {
      return;
    }
    try {
      await service.remove(Number(row.id));
      toast.success(`Đã xoá ${config.nounPhrase}.`);
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Xoá thất bại.");
    }
  };

  // ── Excel ───────────────────────────────────────────────────────────────
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = (selectedRows: Rec[]) => {
    const { isTemplate, count } = downloadCatalogExcel(config, selectedRows);
    toast.success(
      isTemplate
        ? "Đã tải file mẫu (chỉ có dòng tiêu đề). Chọn dòng trong bảng nếu muốn tải kèm dữ liệu."
        : `Đã tải ${count} dòng đã chọn.`,
    );
  };

  /**
   * File Excel dùng TÊN cho các cột tham chiếu danh mục khác (người nhập
   * không biết id). Nên trước khi nhập phải nạp bảng tra tên → id.
   */
  const buildLookups = async () => {
    const lookups: Record<string, Map<string, number>> = {};
    for (const f of config.fields.filter((x) => x.optionsPath)) {
      const res = await api.get(f.optionsPath!, { params: { size: 500 } });
      const list = (res.data?.data?.content ?? res.data?.data ?? []) as {
        id: number;
        name: string;
      }[];
      lookups[f.key] = new Map(
        list.map((it) => [String(it.name).trim().toLowerCase(), it.id]),
      );
    }
    return lookups;
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const lookups = await buildLookups();
      const { payloads, errors } = await parseCatalogExcel(
        config,
        file,
        lookups,
      );

      if (errors.length > 0) {
        // Báo tối đa 5 lỗi đầu để không tràn màn hình, kèm tổng số.
        toast.error(
          `File có ${errors.length} lỗi:\n${errors.slice(0, 5).join("\n")}${
            errors.length > 5 ? `\n… và ${errors.length - 5} lỗi khác` : ""
          }`,
          { duration: 10000 },
        );
        // Vẫn dừng hẳn nếu KHÔNG có dòng nào hợp lệ.
        if (payloads.length === 0) return;
      }

      await service.bulkCreate(payloads);
      toast.success(`Đã nhập ${payloads.length} ${config.nounPhrase}.`);
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Nhập file thất bại.");
    } finally {
      setIsImporting(false);
    }
  };

  const columns = useMemo<ColumnDef<Rec, unknown>[]>(() => {
    const cols: ColumnDef<Rec, unknown>[] = [
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
            onChange={(e) =>
              table.toggleAllPageRowsSelected(e.currentTarget.checked)
            }
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
        size: 60,
        cell: ({ row }) => page * pageSize + row.index + 1,
      },
      ...config.fields.map<ColumnDef<Rec, unknown>>((f) => ({
        id: f.key,
        // Trường tham chiếu danh mục khác: bảng hiển thị TÊN (…Name) chứ
        // không phải id thô mà biểu mẫu dùng.
        accessorKey: f.optionsPath ? f.key.replace(/Id$/, "Name") : f.key,
        header: f.label,
        cell: ({ getValue }) => String(getValue() ?? ""),
      })),
      {
        id: "actions",
        header: "Sửa",
        size: 90,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              title="Sửa"
              onClick={() => {
                setEditing(row.original);
                setModalOpen(true);
              }}
              className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {config.canDelete !== false && (
              <button
                title="Xoá"
                onClick={() => handleDelete(row.original)}
                className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ];
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.fields, page, pageSize]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          {config.breadcrumb.map((b) => (
            <React.Fragment key={b}>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">{b}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage>{config.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">
          {config.title}
        </h1>
        <div className="flex items-center gap-2">
        {extraActions}
        {config.canCreate !== false && (
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="h-9 gap-1.5 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </Button>
        )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <AppDataTable
          title={`Bảng ${config.title.toLowerCase()}`}
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

      <CatalogFormModal
        config={config}
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
