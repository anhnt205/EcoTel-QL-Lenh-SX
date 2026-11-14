import React, { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Boxes,
  ChevronRight,
  Copy,
  Download,
  House,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEmbedAutoHeight } from "@/hooks/useEmbedAutoHeight";
import AppDataTable from "@/components/table/AppDataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { catalogBreadcrumbTrail } from "./catalogGroups";
import type { CatalogConfig } from "./types";
import { CatalogDesignPage } from "./design/CatalogDesignPage";

type Rec = Record<string, unknown> & { id?: number };

/**
 * Danh mục nhỏ (vài chục – vài trăm dòng) nên tải MỘT LẦN rồi lọc/phân trang ở trình duyệt: nhờ vậy ô lọc từng cột
 * lọc trên TOÀN bộ danh mục chứ không chỉ trang đang xem (backend chỉ có tìm `keyword`, không lọc theo cột).
 * 2000 = trần mặc định của Spring cho kích thước trang.
 */
const FETCH_ALL_SIZE = 2000;

/** "min-w-[150px]" -> 150 (bề rộng gợi ý của cột trong cấu hình danh mục). */
const widthPx = (w?: string): number | undefined => {
  const m = /\[(\d+)px\]/.exec(w ?? "");
  return m ? Number(m[1]) : undefined;
};

/**
 * Màn danh mục DÙNG CHUNG cho cả 5 danh mục.
 *
 * Năm danh mục có cùng hợp đồng API và cùng bố cục (bảng + tìm kiếm + thêm/
 * sửa/xoá), nên gom về một trang cấu hình bằng `CatalogConfig` thay vì chép
 * 5 lần — sửa một chỗ là cả 5 màn cùng đổi.
 */
function CatalogPageLegacy({
  config,
  extraActions,
  layout = "card",
}: {
  config: CatalogConfig;
  /** Nút phụ cạnh "Thêm mới" — vd bộ dựng khoá của màn STD (Đất CN). */
  extraActions?: React.ReactNode;
  /**
   * `classic` — bố cục cũ (hàng nút phía trên + bảng). Không còn dùng mặc định.
   * `card` — MẶC ĐỊNH (chủ dự án duyệt 2026-11-09, đồng bộ mọi danh mục): nền xám, MỘT thẻ trắng chứa thanh công cụ (tìm kiếm, làm mới, tải
   * lên/xuống, + Thêm) và bảng; cột thao tác gồm biểu tượng sửa + menu "…" (Sao chép, Xóa). Đang thử ở Chủng loại hàng.
   */
  layout?: "classic" | "card";
}) {
  const isCard = layout === "card";
  // Bố cục thẻ khi nhúng trong Điều phối: báo chiều cao nội dung để khung cao bằng nội dung (không thanh cuộn riêng).
  const cardContentRef = useRef<HTMLDivElement>(null);
  useEmbedAutoHeight(cardContentRef, isCard ? 8 : 0);
  const service = useMemo(
    () => createCatalogService<Rec>(config.basePath),
    [config.basePath],
  );

  // Ô tìm kiếm (nằm ở hàng nút phía trên): gõ tới đâu hiện tới đó, nhưng chỉ hỏi backend sau 300ms ngừng gõ.
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearchValue(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rec | null>(null);
  /** Bản ghi đang được "Sao chép" (mở biểu mẫu thêm mới điền sẵn). */
  const [copying, setCopying] = useState<Rec | null>(null);
  /** Các dòng đang tick chọn trong bảng (cho nút Xoá / Tải xuống ở trên). */
  const [selected, setSelected] = useState<Rec[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [config.basePath, searchValue, config.fixedValues],
    queryFn: () =>
      service.getAll({
        page: 0,
        size: FETCH_ALL_SIZE,
        sort: "id,DESC",
        keyword: searchValue,
        // Màn dùng chung một bảng backend thì phải lọc, nếu không sẽ thấy
        // cả dữ liệu của màn kia.
        ...(config.fixedValues ?? {}),
      }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.content ?? [];

  const openCreate = () => {
    setEditing(null);
    setCopying(null);
    setModalOpen(true);
  };
  const openEdit = (row: Rec) => {
    setEditing(row);
    setCopying(null);
    setModalOpen(true);
  };
  const openCopy = (row: Rec) => {
    setEditing(null);
    setCopying(row);
    setModalOpen(true);
  };

  /** Xoá hàng loạt các dòng đang chọn (nút "Xóa" phía trên bảng). */
  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (
      !window.confirm(
        `Xoá ${selected.length} ${config.nounPhrase} đã chọn? Thao tác này không hoàn tác được.`,
      )
    ) {
      return;
    }
    try {
      await service.bulkRemove(selected.map((r) => Number(r.id)));
      toast.success(`Đã xoá ${selected.length} ${config.nounPhrase}.`);
      setSelected([]);
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Xoá thất bại.");
    }
  };

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
        // Số thứ tự theo thứ tự đang hiển thị (sau lọc/sắp xếp), liên tục qua các trang.
        cell: ({ row, table }) =>
          table.getPrePaginationRowModel().rows.findIndex((r) => r.id === row.id) + 1,
      },
      ...config.fields.map<ColumnDef<Rec, unknown>>((f) => ({
        id: f.key,
        // Trường tham chiếu danh mục khác: bảng hiển thị TÊN (…Name) chứ
        // không phải id thô mà biểu mẫu dùng.
        accessorKey: f.optionsPath ? f.key.replace(/Id$/, "Name") : f.key,
        header: f.label,
        // Bố cục thẻ (bảng hết bề ngang, bố cục cố định): cột chia theo bề rộng gợi ý trong cấu hình (min-w-[150px] -> 150)
        ...(isCard ? { size: widthPx(f.width) } : {}),
        cell: ({ getValue }) => String(getValue() ?? ""),
      })),
      {
        id: "actions",
        header: "Thao tác",
        size: 120,
        cell: ({ row }) =>
          (
          <div className="flex items-center justify-center gap-1">
            <button
              title="Chỉnh sửa"
              onClick={() => openEdit(row.original)}
              className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {config.canCreate !== false && (
              <button
                title="Sao chép"
                onClick={() => openCopy(row.original)}
                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
            {config.canDelete !== false && (
              <button
                title="Xóa"
                onClick={() => handleDelete(row.original)}
                className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
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
  }, [config.fields, isCard]);

  const { trail, leaf } = catalogBreadcrumbTrail(config);
  const canDeleteAny = config.canDelete !== false;

  // ── Bố cục THẺ (thử theo ảnh mẫu) ─────────────────────────────────────────
  if (isCard) {
    const outlineBlue =
      "h-9 gap-1.5 border-blue-300 bg-white px-3 text-sm font-medium text-blue-700 hover:bg-blue-50 hover:text-blue-800";
    return (
      <div className="min-h-full bg-[#eef2f9] pb-3">
        <div ref={cardContentRef} className="flex flex-col gap-2.5">
          {/* Đường dẫn: ⌂ Danh mục > <nhóm> > <tên danh mục> */}
          <div className="flex items-center gap-2 px-4 pt-3 text-sm text-slate-500">
            <House className="h-4 w-4 text-slate-600" />
            {trail.map((b) => (
              <React.Fragment key={b}>
                <span>{b}</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </React.Fragment>
            ))}
            <span className="font-semibold text-blue-700">{leaf}</span>
          </div>

          {/* MỘT thẻ trắng bo tròn: tiêu đề + nút + tìm kiếm + bảng */}
          <div className="mx-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Boxes className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-tight text-slate-900">{leaf}</h1>
                  <p className="text-sm text-slate-500">
                    {config.description ?? `Quản lý danh mục ${config.nounPhrase}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {config.canCreate !== false && (
                  <Button
                    onClick={openCreate}
                    className="h-9 gap-1.5 bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm mới
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={selected.length !== 1}
                  onClick={() => selected[0] && openEdit(selected[0])}
                  title={selected.length === 1 ? "Chỉnh sửa dòng đã chọn" : "Tick chọn đúng 1 dòng để chỉnh sửa"}
                  className={outlineBlue + " disabled:opacity-50"}
                >
                  <Pencil className="h-4 w-4" />
                  Chỉnh sửa
                </Button>
                {canDeleteAny && (
                  <Button
                    variant="outline"
                    disabled={selected.length === 0}
                    onClick={handleBulkDelete}
                    title={selected.length === 0 ? "Tick chọn dòng trong bảng để xóa" : `Xóa ${selected.length} dòng đã chọn`}
                    className="h-9 gap-1.5 border-red-300 bg-white px-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa{selected.length > 0 ? ` (${selected.length})` : ""}
                  </Button>
                )}
                {extraActions}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px] max-w-[520px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={config.searchPlaceholder}
                  aria-label="Tìm kiếm"
                  className="h-9 rounded-lg border-slate-300 bg-white pl-9 text-sm"
                />
              </div>
              <span className="text-sm text-slate-600">
                Tổng số bản ghi: <b className="text-slate-900">{data?.totalElements ?? rows.length}</b>
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) handleImport(file);
                  }}
                />
                <Button
                  variant="outline"
                  className={outlineBlue}
                  disabled={isImporting}
                  onClick={() => importInputRef.current?.click()}
                >
                  {isImporting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Tải lên (Excel)
                </Button>
                <Button
                  variant="outline"
                  className={outlineBlue}
                  title="Tải file Excel của các dòng đã chọn (không chọn dòng nào = tải file mẫu)"
                  onClick={() => handleExport(selected)}
                >
                  <Download className="h-4 w-4" />
                  Tải xuống (Excel)
                </Button>
                <span id="dt-col-toggle" />
                <Button
                  variant="outline"
                  className="h-9 w-9 border-slate-300 bg-white p-0 text-slate-600 hover:bg-slate-100"
                  title="Làm mới"
                  onClick={() => refetch()}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
              <AppDataTable
                data={rows}
                columns={columns}
                loading={isLoading}
                getRowId={(r, i) => String((r as Rec).id ?? i)}
                onSelectionChange={(rs) => setSelected(rs as Rec[])}
                showToolbar={false}
                showColumnFilters
                sortableHeaders
                columnToggleSlotId="dt-col-toggle"
                paginationVariant="card"
                headerBg="bg-blue-700 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-700"
                gridLines
                striped={false}
                compact
                flow
                defaultPageSize={15}
                className="rounded-none border-0 shadow-none [&_tbody_tr:nth-child(even)]:bg-blue-50/70 [&_tbody_tr:hover]:!bg-blue-100/70"
              />
            </div>
          </div>

          <CatalogFormModal
            config={config}
            open={modalOpen}
            editing={editing}
            copyFrom={copying}
            onClose={() => setModalOpen(false)}
            onSaved={refetch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2.5 p-3">
      {/* Đường dẫn: Danh mục > <nhóm> > <tên danh mục> */}
      <Breadcrumb>
        <BreadcrumbList>
          {trail.map((b) => (
            <React.Fragment key={b}>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">{b}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage>{leaf}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">
        {leaf}
      </h1>

      {/* Hàng điều khiển: ô tìm kiếm bên trái; bên phải gom [Thêm mới][Xóa] rồi [Tải lên (Excel)][Tải xuống (Excel)] */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={config.searchPlaceholder}
            aria-label="Tìm kiếm"
            className="h-9 bg-card pr-10"
          />
          <Search className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {config.canCreate !== false && (
            <Button
              onClick={openCreate}
              className="h-9 gap-1.5 bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Thêm mới
            </Button>
          )}
          {canDeleteAny && (
            <Button
              onClick={handleBulkDelete}
              disabled={selected.length === 0}
              title={
                selected.length === 0
                  ? "Tick chọn dòng trong bảng để xóa"
                  : `Xóa ${selected.length} dòng đã chọn`
              }
              className="h-9 gap-1.5 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Xóa{selected.length > 0 ? ` (${selected.length})` : ""}
            </Button>
          )}
          {extraActions}
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleImport(file);
            }}
          />
          <Button
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
            className="h-9 gap-1.5 bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {isImporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Tải lên (Excel)
          </Button>
          <Button
            onClick={() => handleExport(selected)}
            className="h-9 gap-1.5 bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            title="Tải file Excel của các dòng đã chọn (không chọn dòng nào = tải file mẫu)"
          >
            <Download className="h-4 w-4" />
            Tải xuống (Excel)
          </Button>
        </div>
      </div>

      {/* Trang đứng yên; CHỈ khối bảng cuộn dọc (fullHeight): tiêu đề dính trên cùng, phân trang dính dưới cùng. */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Không hiện thanh công cụ/tên bảng: tìm kiếm và nút đã nằm ở hàng trên, nút "Hiển thị cột" (icon) nằm ở thanh phía trên bảng, lọc cột bằng 3 chấm dọc trong ô tiêu đề */}
        <AppDataTable
          data={rows}
          columns={columns}
          loading={isLoading}
          getRowId={(r, i) => String((r as Rec).id ?? i)}
          onSelectionChange={(rs) => setSelected(rs as Rec[])}
          showToolbar={false}
          showColumnFilters
          compact
          fitContent
          fullHeight
          defaultPageSize={15}
          columnToggleBar
          gridLines
          stickyHeader
        />
      </div>

      <CatalogFormModal
        config={config}
        open={modalOpen}
        editing={editing}
        copyFrom={copying}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}

/**
 * Trang danh mục dùng chung. Mặc định theo THIẾT KẾ (`design`, file thiết kế chủ dự án giao 2026-11-09);
 * `card` / `classic` là hai bố cục cũ, giữ lại để đối chiếu.
 */
export function CatalogPage({
  config,
  extraActions,
  layout = "design",
}: {
  config: CatalogConfig;
  extraActions?: React.ReactNode;
  layout?: "design" | "card" | "classic";
}) {
  if (layout === "design") return <CatalogDesignPage config={config} extraActions={extraActions} />;
  return <CatalogPageLegacy config={config} extraActions={extraActions} layout={layout} />;
}
