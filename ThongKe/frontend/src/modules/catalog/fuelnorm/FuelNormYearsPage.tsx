import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DesignListPage, type DesignColumn } from "../design/DesignListPage";
import { matrixService } from "../matrix/matrixService";
import { groupIntoYears, type VehicleOutputYear } from "../vehicleoutput/VehicleOutputYearTable";
import { FuelNormCreateModal } from "./FuelNormCreateModal";
import { FuelNormYearTable } from "./FuelNormYearTable";
import { groupColumnsByVehicleSuffix } from "./fuelNormKeys";

const DMNL_CODE = "DMNL";

/**
 * Màn Định mức nhiên liệu — danh sách theo NĂM (giống Tỷ trọng / Mô hình / Năng suất xe): mỗi dòng một năm; bấm Xem mở ngay dưới dòng bảng
 * định mức (cùng cấu trúc với cửa sổ Thêm mới); Thêm mới / Sửa / Sao chép đều dùng cùng một cửa sổ (`FuelNormCreateModal`) — Sửa là sửa CẢ bảng của
 * năm, Sao chép là nạp bảng của năm nguồn rồi lưu sang năm khác; Xóa xóa các phiên bản của năm. Trang tổng quan cũ (`FuelNormOverviewPage`) và trang sửa
 * theo phiên bản (`FuelNormAddPage`) còn file nhưng không còn đường vào từ màn này.
 */
export default function FuelNormYearsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["matrix", DMNL_CODE, "years"],
    queryFn: async () => {
      const versions = await matrixService.versions(DMNL_CODE);
      return Promise.all(versions.map((v) => matrixService.getGrid(DMNL_CODE, v.versionId)));
    },
  });
  const years = useMemo(() => groupIntoYears(data ?? []), [data]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [copyKey, setCopyKey] = useState<string | null>(null);
  const yearEdit = years.find((y) => y.key === editKey);
  const yearCopy = years.find((y) => y.key === copyKey);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["matrix-versions", DMNL_CODE] });
    queryClient.invalidateQueries({ queryKey: ["matrix-all-grids", DMNL_CODE] });
    refetch();
  };

  const handleDelete = async (rows: VehicleOutputYear[]) => {
    try {
      for (const y of rows) for (const v of y.versions) await matrixService.deleteVersion(DMNL_CODE, v.versionId);
      toast.success(`Đã xóa ${rows.length} năm định mức nhiên liệu.`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg ?? "Không xóa được — lưới phải còn ít nhất một phiên bản.");
    } finally {
      refresh();
    }
  };

  const columns = useMemo<DesignColumn<VehicleOutputYear>[]>(() => [{ key: "time", label: "Thời gian", value: (y) => String(y.year) }], []);

  return (
    <DesignListPage
      trail={["Danh mục", "Thiết bị"]}
      title="Định mức nhiên liệu"
      description="Quản lý định mức nhiên liệu theo năm"
      noun="định mức nhiên liệu"
      rows={years}
      getId={(y) => y.key}
      columns={columns}
      loading={isLoading}
      onRefresh={() => refresh()}
      onAdd={() => setCreateOpen(true)}
      onEdit={(y) => setEditKey(y.key)}
      onCopy={(y) => setCopyKey(y.key)}
      renderDetail={(y) => <FuelNormYearTable year={y} />}
      onDelete={handleDelete}
      extraSearch={(y) => y.versions.flatMap((v) => groupColumnsByVehicleSuffix(v).map((d) => d.vehicleSuffixKey)).join(" ")}
      extraSearchLabel="chủng loại xe, phân loại"
    >
      <FuelNormCreateModal open={createOpen} mode="create" onClose={() => setCreateOpen(false)} onSaved={refresh} />
      <FuelNormCreateModal open={!!yearEdit} mode="editYear" sourceVersions={yearEdit?.versions} onClose={() => setEditKey(null)} onSaved={refresh} />
      <FuelNormCreateModal open={!!yearCopy} mode="copyYear" sourceVersions={yearCopy?.versions} onClose={() => setCopyKey(null)} onSaved={refresh} />
    </DesignListPage>
  );
}
