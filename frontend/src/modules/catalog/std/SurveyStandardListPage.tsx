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
import { createCatalogService } from "../catalogService";
import { downloadCatalogExcel, parseCatalogExcel } from "../catalogExcel";
import type { CatalogConfig } from "../types";
import { SurveyStandardAddModal } from "./SurveyStandardAddModal";
import type { SurveyStandardResponse } from "./types";

type ModalMode = "create" | "view" | "edit";

/** Một dòng của bảng ngoài — TẤT CẢ bản ghi STD của một năm gộp lại làm một. */
interface YearGroup {
  stt: number;
  year: number;
  records: SurveyStandardResponse[];
}

/** Năm suy từ ngày hiệu lực bắt đầu — khớp cách modal "Thêm mới" chọn năm mặc định. */
const yearOf = (r: SurveyStandardResponse): number => {
  const y = parseInt(r.effectiveFrom.slice(0, 4), 10);
  return Number.isNaN(y) ? 0 : y;
};

/**
 * Màn danh mục STD (Đất CN / Đất SX/Than SX) — KHÔNG dùng `CatalogPage`
 * chung nữa. Dùng CHUNG một trang cho cả hai màn STD (nhận `config` —
 * {@link ../configs}'s `surveyStandardDatCnConfig`/`surveyStandardDatSxConfig`)
 * thay vì hai file gần như trùng nhau — cùng lý do với
 * {@link SurveyStandardAddModal}: sửa một chỗ tự áp dụng cho cả hai.
 *
 * <b>Mỗi dòng của bảng ngoài là MỘT NĂM</b>, không phải một bản ghi — chủ dự
 * án chốt: khai theo năm (modal "Thêm mới" cũng đổi khớp, chọn "Thời gian"
 * theo năm thay vì khoảng ngày tự do), nên bảng ngoài chỉ cần
 * STT/Thời gian/Thao tác + checkbox đầu hàng. Xem/Sửa một năm mở modal với
 * TOÀN BỘ các dòng STD (mọi khoá, mọi khoảng thời gian con) có
 * `effectiveFrom` rơi vào năm đó — sửa cả năm trong một lượt, không phải mở
 * từng dòng lẻ. Xoá một năm xoá hết các dòng con của năm đó.
 */
export default function SurveyStandardListPage({ config }: { config: CatalogConfig }) {
  const catalogType = config.fixedValues?.catalogType as "DAT_CN" | "DAT_SX_THAN_SX";

  const service = useMemo(
    () => createCatalogService<SurveyStandardResponse>(config.basePath),
    [config.basePath],
  );

  const [searchValue, setSearchValue] = useState("");

  // Lấy TOÀN BỘ bản ghi của danh mục (không phân trang phía server) — bảng
  // ngoài giờ phân trang theo NĂM, số năm luôn rất nhỏ so với số bản ghi.
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["survey-standards", catalogType, searchValue],
    queryFn: () =>
      service.getAll({
        catalogType,
        page: 0,
        size: 5000,
        sort: "effectiveFrom,DESC",
        keyword: searchValue,
      }),
  });

  const rows = data?.content ?? [];

  const yearGroups = useMemo<YearGroup[]>(() => {
    const byYear = new Map<number, SurveyStandardResponse[]>();
    for (const r of rows) {
      const y = yearOf(r);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(r);
    }
    return Array.from(byYear.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, records], i) => ({ stt: i + 1, year, records }));
  }, [rows]);

  // ── Modal thêm mới / xem / sửa ────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [activeRecords, setActiveRecords] = useState<SurveyStandardResponse[] | undefined>(undefined);

  const openCreate = () => {
    setActiveRecords(undefined);
    setModalMode("create");
    setModalOpen(true);
  };
  const openView = (g: YearGroup) => {
    setActiveRecords(g.records);
    setModalMode("view");
    setModalOpen(true);
  };
  const openEdit = (g: YearGroup) => {
    setActiveRecords(g.records);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleDeleteYear = async (g: YearGroup) => {
    if (
      !window.confirm(
        `Xoá toàn bộ ${g.records.length} dòng STD của năm ${g.year}? Không thể hoàn tác.`,
      )
    ) {
      return;
    }
    try {
      await service.bulkRemove(g.records.map((r) => r.id));
      toast.success(`Đã xoá ${g.records.length} dòng STD của năm ${g.year}.`);
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Xoá thất bại.");
    }
  };

  // ── Xuất / nhập Excel — dữ liệu đã sẵn phẳng, không cần gộp/tách gì ───────
  const handleExport = (selectedGroups: YearGroup[]) => {
    const selectedRows = selectedGroups.flatMap((g) => g.records);
    const { isTemplate, count } = downloadCatalogExcel(
      config,
      selectedRows as unknown as Record<string, unknown>[],
    );
    toast.success(
      isTemplate
        ? "Đã tải file mẫu (chỉ có dòng tiêu đề). Chọn năm trong bảng nếu muốn tải kèm dữ liệu."
        : `Đã tải ${count} dòng đã chọn.`,
    );
  };

  const [isImporting, setIsImporting] = useState(false);

  const buildLookups = async () => {
    const lookups: Record<string, Map<string, number>> = {};
    for (const f of config.fields.filter((x) => x.optionsPath)) {
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
      const { payloads, errors } = await parseCatalogExcel(config, file, lookups);
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

  // ── Cột bảng: STT, Thời gian (năm), Thao tác — đúng chốt của chủ dự án ────
  const columns = useMemo<ColumnDef<YearGroup, unknown>[]>(
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
        cell: ({ row }) => row.original.stt,
      },
      {
        id: "thoiGian",
        header: "Thời gian",
        size: 200,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              Năm {row.original.year}
            </span>
            <span className="text-[11px] text-gray-400">
              {row.original.records.length} dòng
            </span>
          </div>
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
              title="Xem chi tiết cả năm"
              onClick={() => openView(row.original)}
              className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              title="Sửa cả năm"
              onClick={() => openEdit(row.original)}
              className="rounded p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              title="Xoá cả năm"
              onClick={() => handleDeleteYear(row.original)}
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
          title={`Bảng ${config.title.toLowerCase()}`}
          data={yearGroups}
          columns={columns}
          loading={isLoading}
          searchValue={searchValue}
          onSearch={(val: string) => setSearchValue(val)}
          onRefresh={refetch}
          onImportExcel={handleImport}
          importExcelAccept=".xlsx,.xls"
          isImporting={isImporting}
          showExport
          onExportCsv={handleExport}
          exportCsvLabel="Tải xuống (Excel)"
          showColumnToggle
          stickyHeader
          defaultPageSize={10}
        />
      </div>

      <SurveyStandardAddModal
        open={modalOpen}
        catalogType={catalogType}
        mode={modalMode}
        records={activeRecords}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
