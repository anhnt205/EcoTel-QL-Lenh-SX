import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { matrixService } from "../matrix/matrixService";
import { DesignListPage, type DesignColumn } from "../design/DesignListPage";
import { VehicleOutputAddModal } from "../vehicleoutput/VehicleOutputAddModal";
import { parseVehicleOutputKey } from "../vehicleoutput/vehicleOutputKeys";
import { VehicleOutputYearTable, groupIntoYears, type VehicleOutputYear } from "../vehicleoutput/VehicleOutputYearTable";

const CODE = "NANG_SUAT_XE";

/** Khu vực xúc của một năm: suy từ hậu tố `.CS`/`.KC` của các cột; cột không hậu tố = "Tất cả khu vực". */
const areaLabelOf = (y: VehicleOutputYear): string => {
  const set = new Set<string>();
  y.versions.forEach((v) => v.cols.forEach((c) => set.add(parseVehicleOutputKey(c.key)?.area || "Tất cả khu vực")));
  return [...set].join(", ");
};

/**
 * Màn danh mục Năng suất xe (3305) — danh sách theo NĂM (giống Tỷ trọng / Mô hình): mỗi dòng một năm; bấm Xem mở ngay dưới dòng bảng
 * năng suất chi tiết (Cung độ × chủng loại xe + phân loại); Sửa = sửa CẢ bảng trong cửa sổ giống Tạo mới; Sao chép = chép cả bảng sang
 * năm khác; Xóa = xóa các phiên bản của năm. Không còn thao tác lưới rời (thêm dòng/cột, tạo phiên bản) — mọi chỉnh sửa đi qua modal.
 * Dữ liệu vẫn là lưới dùng chung (`matrixService`), mỗi năm một phiên bản.
 */
export default function VehicleOutputMatrix() {
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
      toast.success(`Đã xóa ${rows.length} năm năng suất xe.`);
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
      { key: "area", label: "Khu vực xúc", width: 260, value: areaLabelOf },
    ],
    [],
  );

  return (
    <DesignListPage
      trail={["Danh mục", "Thống kê sản lượng"]}
      title="Năng suất xe (3305)"
      description="Quản lý định mức năng suất xe theo năm"
      noun="năng suất xe"
      rows={years}
      getId={(y) => y.key}
      columns={columns}
      loading={isLoading}
      onRefresh={() => refetch()}
      onAdd={() => setCreateOpen(true)}
      onEdit={(y) => setEditKey(y.key)}
      onCopy={(y) => setCopyKey(y.key)}
      renderDetail={(y) => <VehicleOutputYearTable year={y} />}
      onDelete={handleDelete}
      extraSearch={(y) => y.versions.flatMap((v) => v.cols.map((c) => c.key)).join(" ")}
      extraSearchLabel="chủng loại xe, phân loại"
    >
      <VehicleOutputAddModal open={createOpen} mode="create" onClose={() => setCreateOpen(false)} onSaved={refetch} />
      <VehicleOutputAddModal open={!!yearEdit} mode="editYear" versions={yearEdit?.versions} onClose={() => setEditKey(null)} onSaved={refetch} />
      <VehicleOutputAddModal open={!!yearCopy} mode="copyYear" versions={yearCopy?.versions} onClose={() => setCopyKey(null)} onSaved={refetch} />
    </DesignListPage>
  );
}
