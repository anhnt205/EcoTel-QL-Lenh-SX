import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
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
import { ROUTES } from "@/constants/routes";
import { createCatalogService } from "../catalogService";
import { ModelAddModal } from "./ModelAddModal";
import type { ModelPeriodResponse } from "./types";

const BASE_PATH = "/model-periods";

type ModalMode = "create" | "view" | "edit";

/**
 * Màn danh mục Mô hình — mỗi dòng bảng là MỘT bản ghi `ModelPeriod` đã lưu
 * (không gộp "lô" như Tỷ trọng): mỗi dòng ở đây có khoảng thời gian RIÊNG
 * theo đúng yêu cầu, nên không còn khoá gộp chung để nhóm nhiều mã hàng
 * lại với nhau — xem `ModelAddModal.tsx` để biết cách một lần lưu có thể
 * tạo ra nhiều bản ghi phẳng (nhiều dòng, mỗi dòng nhiều khoảng thời gian).
 */
export default function ModelPeriodsPage() {
  const navigate = useNavigate();
  const service = useMemo(() => createCatalogService<ModelPeriodResponse>(BASE_PATH), []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["model-periods", "all"],
    queryFn: async () => {
      const res = await api.get(BASE_PATH, { params: { size: 1000, sort: "effectiveFrom,DESC" } });
      return (res.data?.data?.content ?? []) as ModelPeriodResponse[];
    },
  });

  const records = data ?? [];
  const [searchValue, setSearchValue] = useState("");
  const filtered = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) => r.cargoTypeCode.toLowerCase().includes(q) || r.cargoTypeName.toLowerCase().includes(q),
    );
  }, [records, searchValue]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [activeRecord, setActiveRecord] = useState<ModelPeriodResponse | undefined>(undefined);

  const openCreate = () => {
    setActiveRecord(undefined);
    setModalMode("create");
    setModalOpen(true);
  };
  const openView = (r: ModelPeriodResponse) => {
    setActiveRecord(r);
    setModalMode("view");
    setModalOpen(true);
  };
  const openEdit = (r: ModelPeriodResponse) => {
    setActiveRecord(r);
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleDelete = async (r: ModelPeriodResponse) => {
    if (
      !window.confirm(
        `Xoá mô hình "${r.cargoTypeName}" (${formatDate(r.effectiveFrom)} - ${formatDate(r.effectiveTo)})?`,
      )
    ) {
      return;
    }
    try {
      await service.remove(r.id);
      toast.success("Đã xoá.");
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Xoá thất bại.");
    }
  };

  const columns = useMemo<ColumnDef<ModelPeriodResponse, unknown>[]>(
    () => [
      { id: "stt", header: "STT", size: 64, cell: ({ row }) => row.index + 1 },
      {
        id: "thoiGian",
        header: "Thời gian",
        size: 220,
        cell: ({ row }) => `${formatDate(row.original.effectiveFrom)} - ${formatDate(row.original.effectiveTo)}`,
      },
      { id: "maChungLoai", header: "Mã chủng loại", size: 160, cell: ({ row }) => row.original.cargoTypeCode },
      { id: "chungLoaiHang", header: "Chủng loại hàng", size: 220, cell: ({ row }) => row.original.cargoTypeName },
      {
        id: "soXe",
        header: "Số chủng loại xe có giá trị",
        size: 200,
        cell: ({ row }) => Object.keys(row.original.values).length,
      },
      {
        id: "actions",
        header: "Thao tác",
        size: 130,
        meta: { align: "left" },
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button title="Xem chi tiết" onClick={() => openView(row.original)} className="rounded p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30">
              <Eye className="h-4 w-4" />
            </button>
            <button title="Sửa" onClick={() => openEdit(row.original)} className="rounded p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30">
              <Pencil className="h-4 w-4" />
            </button>
            <button title="Xoá" onClick={() => handleDelete(row.original)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
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
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Danh mục</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Mô hình</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">Mô hình (m3/chuyến)</h1>
        <div className="flex gap-2">
          <Button onClick={openCreate} className="h-9 gap-1.5 bg-blue-600 text-xs font-bold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Thêm mới
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => navigate(ROUTES.DANH_MUC.MO_HINH_LUOI)}>
            <Settings2 className="h-3.5 w-3.5" /> Xem lưới đầy đủ (cũ)
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <AppDataTable
          title="Bảng mô hình"
          data={filtered}
          columns={columns}
          loading={isLoading}
          searchValue={searchValue}
          onSearch={setSearchValue}
          onRefresh={refetch}
          stickyHeader
        />
      </div>

      <ModelAddModal open={modalOpen} mode={modalMode} record={activeRecord} onClose={() => setModalOpen(false)} onSaved={refetch} />
    </div>
  );
}
