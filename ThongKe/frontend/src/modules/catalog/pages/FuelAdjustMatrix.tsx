import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { matrixService } from "../matrix/matrixService";
import { DesignListPage, type DesignColumn } from "../design/DesignListPage";
import { FuelAdjustAddModal } from "../fueladjust/FuelAdjustAddModal";
import { FuelAdjustYearTable } from "../fueladjust/FuelAdjustYearTable";
import { groupIntoYears, type VehicleOutputYear } from "../vehicleoutput/VehicleOutputYearTable";

const CODE = "HS_DIEU_CHINH_NLDM";

/** Nhóm khu vực của một năm: suy từ hậu tố `.CS`/`.KC` của các cột tháng/năm. */
const areaLabelOf = (y: VehicleOutputYear): string => {
  const set = new Set<string>();
  y.versions.forEach((v) => v.cols.forEach((c) => set.add(c.key.slice(c.key.lastIndexOf(".") + 1))));
  return [...set].filter((a) => a === "CS" || a === "KC").sort().join(", ");
};

/**
 * Màn danh mục HS điều chỉnh NLĐM — danh sách theo NĂM (cùng kiểu Năng suất xe / Tỷ trọng / Mô hình): mỗi dòng một năm; bấm Xem mở ngay dưới dòng
 * bảng chi tiết (Chủng loại xe (NL) + Hạng + Phân loại × 12 tháng); Sửa = sửa CẢ bảng trong cửa sổ giống Thêm mới; Sao chép = chép cả bảng sang năm
 * khác; Xóa = xóa các phiên bản của năm. Dữ liệu vẫn là lưới dùng chung (`matrixService`), mỗi năm một phiên bản.
 */
export default function FuelAdjustMatrix() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["matrix", CODE, "years"],
    queryFn: async () => {
      const versions = await matrixService.versions(CODE);
      return Promise.all(versions.map((v) => matrixService.getGrid(CODE, v.versionId)));
    },
  });

  const years = useMemo(() => groupIntoYears(data ?? []), [data]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [copyKey, setCopyKey] = useState<string | null>(null);
  const yearEdit = years.find((y) => y.key === editKey);
  const yearCopy = years.find((y) => y.key === copyKey);

  /** Xóa các NĂM — tức xóa mọi phiên bản của năm (máy chủ từ chối nếu đó là phiên bản cuối cùng của lưới). */
  const handleDelete = async (rows: VehicleOutputYear[]) => {
    try {
      for (const y of rows) {
        for (const v of y.versions) await matrixService.deleteVersion(CODE, v.versionId);
      }
      toast.success(`Đã xóa ${rows.length} năm HS điều chỉnh NLĐM.`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? "Không xóa được — lưới phải còn ít nhất một phiên bản.");
    } finally {
      refetch();
    }
  };

  const columns = useMemo<DesignColumn<VehicleOutputYear>[]>(
    () => [
      { key: "time", label: "Thời gian", value: (y) => String(y.year) },
      { key: "area", label: "Nhóm khu vực", width: 260, value: areaLabelOf },
    ],
    [],
  );

  return (
    <DesignListPage
      trail={["Danh mục", "Thống kê sản lượng"]}
      title="HS điều chỉnh NLĐM"
      description="Quản lý hệ số điều chỉnh nhiên liệu định mức theo năm"
      noun="HS điều chỉnh NLĐM"
      rows={years}
      getId={(y) => y.key}
      columns={columns}
      loading={isLoading}
      onRefresh={() => refetch()}
      onAdd={() => setCreateOpen(true)}
      onEdit={(y) => setEditKey(y.key)}
      onCopy={(y) => setCopyKey(y.key)}
      renderDetail={(y) => <FuelAdjustYearTable year={y} />}
      onDelete={handleDelete}
      extraSearch={(y) => y.versions.flatMap((v) => v.rows.map((r) => r.key)).join(" ")}
      extraSearchLabel="chủng loại xe, hạng, phân loại"
    >
      <FuelAdjustAddModal open={createOpen} mode="create" onClose={() => setCreateOpen(false)} onSaved={refetch} />
      <FuelAdjustAddModal open={!!yearEdit} mode="editYear" versions={yearEdit?.versions} onClose={() => setEditKey(null)} onSaved={refetch} />
      <FuelAdjustAddModal open={!!yearCopy} mode="copyYear" versions={yearCopy?.versions} onClose={() => setCopyKey(null)} onSaved={refetch} />
    </DesignListPage>
  );
}
