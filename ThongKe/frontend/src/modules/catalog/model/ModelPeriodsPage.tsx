import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/config/api.config";
import { createCatalogService } from "../catalogService";
import { DesignListPage, type DesignColumn } from "../design/DesignListPage";
import { ModelAddModal } from "./ModelAddModal";
import { ModelYearTable, groupIntoYears, type ModelYear } from "./ModelYearTable";
import type { ModelPeriodResponse } from "./types";

const BASE_PATH = "/model-periods";

/**
 * Màn danh mục Mô hình — danh sách theo NĂM (giống Tỷ trọng): mỗi dòng một năm; bấm Xem mở ngay dưới dòng bảng mô hình chi tiết của năm
 * (gom theo mã chủng loại hàng, chủng loại xe là các cột ngang); Sửa = sửa CẢ bảng của năm trong cửa sổ giống Tạo mới; Sao chép = chép cả
 * bảng sang năm khác; Xóa = xóa mọi bản ghi của năm. Bản ghi lưu xuống vẫn phẳng (mỗi mã hàng × khoảng thời gian một `ModelPeriod`).
 */
export default function ModelPeriodsPage() {
  const service = useMemo(() => createCatalogService<ModelPeriodResponse>(BASE_PATH), []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["model-periods", "all"],
    queryFn: async () => {
      const res = await api.get(BASE_PATH, { params: { size: 1000, sort: "effectiveFrom,DESC" } });
      return (res.data?.data?.content ?? []) as ModelPeriodResponse[];
    },
  });

  const years = useMemo(() => groupIntoYears(data ?? []), [data]);

  const [createOpen, setCreateOpen] = useState(false);
  const [yearEditKey, setYearEditKey] = useState<string | null>(null);
  const [yearCopyKey, setYearCopyKey] = useState<string | null>(null);
  const yearEdit = years.find((y) => y.key === yearEditKey);
  const yearCopy = years.find((y) => y.key === yearCopyKey);

  /** Xóa các NĂM — tức xóa mọi bản ghi của năm. */
  const handleDelete = async (rows: ModelYear[]) => {
    const ids = rows.flatMap((y) => y.records.map((r) => r.id));
    await service.bulkRemove(ids);
    toast.success(`Đã xóa ${rows.length} năm — ${ids.length} bản ghi mô hình.`);
    refetch();
  };

  const columns = useMemo<DesignColumn<ModelYear>[]>(
    () => [{ key: "nam", label: "Năm", width: 160, value: (y) => `Năm ${y.year}` }],
    [],
  );

  return (
    <DesignListPage
      trail={["Danh mục", "Loại hàng"]}
      title="Mô hình"
      description="Quản lý danh mục mô hình theo năm"
      noun="mô hình"
      rows={years}
      getId={(y) => y.key}
      columns={columns}
      loading={isLoading}
      onRefresh={() => refetch()}
      onAdd={() => setCreateOpen(true)}
      onEdit={(y) => setYearEditKey(y.key)}
      onCopy={(y) => setYearCopyKey(y.key)}
      renderDetail={(y) => <ModelYearTable year={y} />}
      onDelete={handleDelete}
      extraSearch={(y) => y.records.map((r) => `${r.cargoTypeCode} ${r.cargoTypeName}`).join(" ")}
      extraSearchLabel="mã, tên chủng loại hàng"
    >
      <ModelAddModal open={createOpen} mode="create" onClose={() => setCreateOpen(false)} onSaved={refetch} />
      <ModelAddModal open={!!yearEdit} mode="editYear" yearRecords={yearEdit?.records} onClose={() => setYearEditKey(null)} onSaved={refetch} />
      <ModelAddModal open={!!yearCopy} mode="copyYear" yearRecords={yearCopy?.records} onClose={() => setYearCopyKey(null)} onSaved={refetch} />
    </DesignListPage>
  );
}
