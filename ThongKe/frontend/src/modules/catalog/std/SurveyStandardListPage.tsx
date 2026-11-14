import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCatalogService } from "../catalogService";
import type { CatalogConfig } from "../types";
import { DesignListPage, type DesignColumn } from "../design/DesignListPage";
import { SurveyStandardAddModal } from "./SurveyStandardAddModal";
import { SurveyStandardYearTable } from "./SurveyStandardYearTable";
import type { SurveyStandardResponse } from "./types";

type ModalMode = "create" | "view" | "edit" | "copy";

/** Một dòng của bảng ngoài — TẤT CẢ bản ghi STD của một năm gộp lại làm một. */
interface YearGroup {
  year: number;
  records: SurveyStandardResponse[];
}

/** Năm suy từ ngày hiệu lực bắt đầu — khớp cách modal "Thêm mới" chọn năm mặc định. */
const yearOf = (r: SurveyStandardResponse): number => {
  const y = parseInt(r.effectiveFrom.slice(0, 4), 10);
  return Number.isNaN(y) ? 0 : y;
};

/**
 * Màn danh mục STD (Đất CN / Đất SX/Than SX) — bảng theo thiết kế, dùng CHUNG một trang cho cả hai màn (nhận `config`).
 *
 * <b>Mỗi dòng của bảng ngoài là MỘT NĂM</b>: khai theo năm (modal "Thêm mới" chọn "Thời gian" theo năm). Xem/Sửa một năm
 * mở modal với TOÀN BỘ các dòng STD có `effectiveFrom` rơi vào năm đó; xóa một năm xóa hết các dòng con của năm đó.
 */
export default function SurveyStandardListPage({ config }: { config: CatalogConfig }) {
  const catalogType = config.fixedValues?.catalogType as "DAT_CN" | "DAT_SX_THAN_SX";

  const service = useMemo(
    () => createCatalogService<SurveyStandardResponse>(config.basePath),
    [config.basePath],
  );

  // Lấy TOÀN BỘ bản ghi của danh mục (không phân trang phía server) — bảng ngoài phân trang theo NĂM.
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["survey-standards", catalogType],
    queryFn: () => service.getAll({ catalogType, page: 0, size: 5000, sort: "effectiveFrom,DESC" }),
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
      .map(([year, records]) => ({ year, records }));
  }, [rows]);

  // ── Modal thêm mới / xem / sửa ────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [activeRecords, setActiveRecords] = useState<SurveyStandardResponse[] | undefined>(undefined);

  const open = (mode: ModalMode, g?: YearGroup) => {
    setActiveRecords(g?.records);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleDelete = async (groups: YearGroup[]) => {
    const ids = groups.flatMap((g) => g.records.map((r) => r.id));
    await service.bulkRemove(ids);
    toast.success(`Đã xóa ${ids.length} dòng STD của ${groups.length} năm.`);
    refetch();
  };

  const columns = useMemo<DesignColumn<YearGroup>[]>(
    () => [
      { key: "thoiGian", label: "Thời gian", width: 260, value: (g) => `Năm ${g.year}` },
    ],
    [],
  );

  return (
    <DesignListPage
      trail={config.breadcrumb}
      title={config.title}
      description="Quản lý số trắc địa theo năm"
      noun="STD"
      rows={yearGroups}
      getId={(g) => g.year}
      columns={columns}
      loading={isLoading}
      onRefresh={() => refetch()}
      onAdd={() => open("create")}
      onEdit={(g) => open("edit", g)}
      renderDetail={(g) => <SurveyStandardYearTable records={g.records} catalogType={catalogType} />}
      onCopy={(g) => open("copy", g)}
      onDelete={handleDelete}
    >
      <SurveyStandardAddModal
        open={modalOpen}
        catalogType={catalogType}
        mode={modalMode}
        records={activeRecords}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </DesignListPage>
  );
}
