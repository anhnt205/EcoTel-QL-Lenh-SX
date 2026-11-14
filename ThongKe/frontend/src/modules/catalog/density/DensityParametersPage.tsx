import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/config/api.config";
import { createCatalogService } from "../catalogService";
import { downloadCatalogExcel, parseCatalogExcel } from "../catalogExcel";
import { densityParameterConfig } from "../configs";
import { DesignListPage, type DesignColumn } from "../design/DesignListPage";
import { DensityAddModal } from "./DensityAddModal";
import { groupIntoBatches, type DensityBatch, type DensityParameterResponse } from "./types";
import { DensityYearTable, groupIntoYears, type DensityYear } from "./DensityYearModal";

interface ExcavationAreaOption {
  id: number;
  name: string;
}

type ModalMode = "create" | "view" | "edit";

/**
 * Màn danh mục Tỷ trọng — bảng theo thiết kế, mỗi dòng là một LÔ (cùng Thời gian + Khu vực xúc), đúng đơn vị mà popup
 * "Thêm mới tỷ trọng" tạo ra. Xem/Sửa mở lại đúng popup đó; xóa một lô xóa mọi bản ghi phẳng của lô.
 *
 * Dữ liệu tải MỘT LẦN (size lớn) rồi gộp/lọc/phân trang ở trình duyệt — không gộp theo (Thời gian, Khu vực xúc) được
 * bằng phân trang phía server trên bảng phẳng.
 */
export default function DensityParametersPage() {
  const service = useMemo(
    () => createCatalogService<DensityParameterResponse>(densityParameterConfig.basePath),
    [],
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["density-parameters", "all"],
    queryFn: async () => {
      const res = await api.get(densityParameterConfig.basePath, {
        params: { size: 1000, sort: "effectiveFrom,DESC" },
      });
      return (res.data?.data?.content ?? []) as DensityParameterResponse[];
    },
  });

  const batches = useMemo(() => groupIntoBatches(data ?? []), [data]);

  const [excavationAreas, setExcavationAreas] = useState<ExcavationAreaOption[]>([]);
  useEffect(() => {
    api
      .get("/excavation-areas", { params: { size: 500 } })
      .then((res) => {
        const list = (res.data?.data?.content ?? res.data?.data ?? []) as ExcavationAreaOption[];
        setExcavationAreas(list);
      })
      .catch(() => toast.error("Không tải được danh sách khu vực xúc."));
  }, []);

  // ── Bộ lọc cạnh ô tìm kiếm: Năm + Khu vực xúc ────────────────────────────
  const [yearFilter, setYearFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    for (const b of batches) {
      const fromY = Number(b.effectiveFrom.slice(0, 4));
      const toY = Number(b.effectiveTo.slice(0, 4));
      for (let y = fromY; y <= toY; y++) years.add(y);
    }
    return [...years].sort((a, b) => b - a);
  }, [batches]);

  const filteredBatches = useMemo(
    () =>
      batches.filter((b) => {
        if (yearFilter) {
          const y = Number(yearFilter);
          if (!(b.effectiveFrom <= `${y}-12-31` && b.effectiveTo >= `${y}-01-01`)) return false;
        }
        if (areaFilter === "NONE" && b.excavationAreaId !== null) return false;
        if (areaFilter && areaFilter !== "NONE" && String(b.excavationAreaId) !== areaFilter) return false;
        return true;
      }),
    [batches, yearFilter, areaFilter],
  );

  // Danh sách theo NĂM (đã áp bộ lọc) + toàn bộ năm (để cửa sổ chi tiết không bị bộ lọc cắt mất dòng)
  const years = useMemo(() => groupIntoYears(filteredBatches), [filteredBatches]);
  const allYears = useMemo(() => groupIntoYears(batches), [batches]);
  const [yearEditKey, setYearEditKey] = useState<string | null>(null);
  const yearEdit = allYears.find((y) => y.key === yearEditKey);
  const [yearCopyKey, setYearCopyKey] = useState<string | null>(null);
  const yearCopy = allYears.find((y) => y.key === yearCopyKey);

  // ── Modal thêm mới / xem / sửa ────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [activeBatch, setActiveBatch] = useState<DensityBatch | undefined>(undefined);

  const open = (mode: ModalMode, b?: DensityBatch) => {
    setActiveBatch(b);
    setModalMode(mode);
    setModalOpen(true);
  };

  /** Xóa các NĂM — tức xóa mọi bản ghi phẳng của mọi lô trong năm. */
  const handleDelete = async (rows: DensityYear[]) => {
    const ids = rows.flatMap((y) => y.records.map((r) => r.id));
    await service.bulkRemove(ids);
    toast.success(`Đã xóa ${rows.length} năm — ${ids.length} tỷ trọng.`);
    refetch();
  };

  // ── Xuất / nhập Excel — vẫn thao tác trên BẢN GHI PHẲNG bên dưới lô ───────
  const handleExport = (selectedRows: DensityYear[]) => {
    const flat = selectedRows.flatMap((y) => y.records) as unknown as Record<string, unknown>[];
    const { isTemplate, count } = downloadCatalogExcel(densityParameterConfig, flat);
    toast.success(
      isTemplate
        ? "Đã tải file mẫu (chỉ có dòng tiêu đề). Chọn năm trong bảng nếu muốn tải kèm dữ liệu."
        : `Đã tải ${count} dòng dữ liệu từ ${selectedRows.length} năm đã chọn.`,
    );
  };

  const [isImporting, setIsImporting] = useState(false);

  const buildLookups = async () => {
    const lookups: Record<string, Map<string, number>> = {};
    for (const f of densityParameterConfig.fields.filter((x) => x.optionsPath)) {
      const res = await api.get(f.optionsPath!, { params: { size: 500 } });
      const list = (res.data?.data?.content ?? res.data?.data ?? []) as { id: number; name: string }[];
      lookups[f.key] = new Map(list.map((it) => [String(it.name).trim().toLowerCase(), it.id]));
    }
    return lookups;
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const lookups = await buildLookups();
      const { payloads, errors } = await parseCatalogExcel(densityParameterConfig, file, lookups);
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
      toast.success(`Đã thêm ${payloads.length} tỷ trọng.`);
      refetch();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Nhập file thất bại.");
    } finally {
      setIsImporting(false);
    }
  };

  const columns = useMemo<DesignColumn<DensityYear>[]>(
    () => [
      { key: "nam", label: "Năm", width: 120, value: (y) => `Năm ${y.year}` },
      {
        key: "khuVucXuc",
        label: "Khu vực xúc",
        width: 420,
        value: (y) => [...new Set(y.batches.map((b) => b.excavationAreaName))].join(", "),
      },
    ],
    [],
  );

  return (
    <DesignListPage
      trail={densityParameterConfig.breadcrumb}
      title={densityParameterConfig.title}
      description="Quản lý danh mục tỷ trọng theo năm"
      noun="tỷ trọng"
      rows={years}
      getId={(y) => y.key}
      columns={columns}
      loading={isLoading}
      onRefresh={() => refetch()}
      onAdd={() => open("create")}
      onEdit={(y) => setYearEditKey(y.key)}
      renderDetail={(y) => <DensityYearTable year={y} />}
      onCopy={(y) => setYearCopyKey(y.key)}
      onDelete={handleDelete}
      onImport={handleImport}
      isImporting={isImporting}
      onExport={handleExport}
      extraSearch={(y) => y.records.map((r) => `${r.cargoTypeCode} ${r.cargoTypeName}`).join(" ")}
      extraSearchLabel="mã, tên chủng loại hàng"
      toolbarSlot={
        <>
          <select className="select" aria-label="Lọc theo năm" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="">Tất cả năm</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>
          <select className="select" aria-label="Lọc theo khu vực xúc" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="">Tất cả khu vực xúc</option>
            <option value="NONE">— Áp cho mọi khu vực —</option>
            {excavationAreas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </>
      }
    >
      <DensityAddModal
        open={!!yearCopy}
        mode="copyYear"
        yearRecords={yearCopy?.records}
        onClose={() => setYearCopyKey(null)}
        onSaved={refetch}
      />
      <DensityAddModal
        open={!!yearEdit}
        mode="editYear"
        yearRecords={yearEdit?.records}
        onClose={() => setYearEditKey(null)}
        onSaved={refetch}
      />
      <DensityAddModal
        open={modalOpen}
        mode={modalMode}
        batch={activeBatch}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </DesignListPage>
  );
}
