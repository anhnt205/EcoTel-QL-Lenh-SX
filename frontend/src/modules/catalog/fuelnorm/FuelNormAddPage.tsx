import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Download, Maximize, Minimize, Plus, Save, Trash2, Upload } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { matrixService, type MatrixCellUpsert } from "../matrix/matrixService";
import { MatrixAxisAddModal } from "../matrix/MatrixAxisAddModal";
import {
  downloadFuelNormExcel,
  importFuelNormExcel,
  previewFuelNormExcel,
  type FuelNormImportPreview,
} from "./fuelNormExcelImport";
import {
  STATUS_LABEL,
  buildColumnKey,
  groupColumnsByVehicleSuffix,
  parseColumnKey,
  statusOf,
} from "./fuelNormKeys";
import { FuelNormBulkAddModal } from "./FuelNormBulkAddModal";

const DMNL_CODE = "DMNL";

type DirtyMap = Record<string, Record<string, string>>;

/**
 * Thêm mới / sửa một bộ định mức nhiên liệu (DMNL).
 *
 * Một "bộ định mức" ở đây LÀ một PHIÊN BẢN của lưới DMNL (`MatrixDefinition`)
 * — theo đúng kiến trúc lưới đã có (xem `MatrixCatalogPage`). Vì lưới có thể
 * chứa NHIỀU tổ hợp Chủng loại xe + Hậu tố cùng lúc, màn này thêm lớp UI
 * "bộ dữ liệu" (dataset pill) đứng TRÊN cùng một lưới — suy từ tiền tố khoá
 * cột (`groupColumnsByVehicleSuffix`), không phải một bảng riêng.
 *
 * Vì thao tác nào cũng gọi thẳng `matrixService` (API dùng chung với màn
 * Quản lý và màn lưới đầy đủ cũ), dữ liệu tạo/sửa ở đây LUÔN khớp ngay với
 * hai màn kia — không có kho dữ liệu riêng phải giữ đồng bộ tay.
 */
export default function FuelNormAddPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const editingVersionId = params.get("versionId") ? Number(params.get("versionId")) : null;
  const focusKey = params.get("dataset");

  const queryClient = useQueryClient();
  const importRef = useRef<HTMLInputElement>(null);

  // ── phiên bản (kỳ) đang sửa — null nghĩa là CHƯA tạo, đang ở bước điền thông tin chung ──
  const { data: grid } = useQuery({
    queryKey: ["matrix", DMNL_CODE, editingVersionId],
    queryFn: () => matrixService.getGrid(DMNL_CODE, editingVersionId!),
    enabled: editingVersionId !== null,
  });

  // Phiên bản mới nhất — dùng làm nguồn sao chép mặc định khi tạo kỳ mới.
  const { data: latestGrid } = useQuery({
    queryKey: ["matrix", DMNL_CODE, "latest"],
    queryFn: () => matrixService.getGrid(DMNL_CODE),
    enabled: editingVersionId === null,
  });

  // Toàn bộ phiên bản đã có — dùng để phát hiện trùng "Ngày hiệu lực từ"
  // TRƯỚC khi gọi tạo mới, vì backend chặn trùng theo đúng ngày này (mỗi
  // mã chỉ có một phiên bản cho một effectiveFrom). Mặc định "Năm áp dụng"
  // luôn là năm hiện tại, nên rất dễ trùng với kỳ đã khai từ trước.
  const { data: allVersions = [] } = useQuery({
    queryKey: ["matrix-versions", DMNL_CODE],
    queryFn: () => matrixService.versions(DMNL_CODE),
    enabled: editingVersionId === null,
  });

  const isEdit = editingVersionId !== null;

  // ── form thông tin chung ───────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [effectiveFrom, setEffectiveFrom] = useState(`${currentYear}-01-01`);
  const [effectiveTo, setEffectiveTo] = useState(`${currentYear}-12-31`);
  const [note, setNote] = useState("");
  const [versionLabel, setVersionLabel] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!grid || hydrated) return;
    setYear(grid.effectiveFrom ? Number(grid.effectiveFrom.slice(0, 4)) : currentYear);
    setEffectiveFrom(grid.effectiveFrom ?? "");
    setEffectiveTo(grid.effectiveTo ?? "");
    setNote(grid.note ?? "");
    setVersionLabel(grid.versionLabel ?? "");
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid]);

  const onYearChange = (y: number) => {
    setYear(y);
    if (!isEdit) {
      setEffectiveFrom(`${y}-01-01`);
      setEffectiveTo(`${y}-12-31`);
    }
  };

  // ── tạo kỳ mới ──────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveFrom) throw new Error("Chưa chọn ngày bắt đầu hiệu lực.");
      if (!note.trim()) throw new Error("Mô tả là bắt buộc.");
      return matrixService.createVersion(DMNL_CODE, {
        sourceId: latestGrid?.versionId,
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        versionLabel: versionLabel || undefined,
        note,
        copyCells: true,
      });
    },
    onSuccess: (created) => {
      toast.success("Đã tạo bộ định mức. Có thể bắt đầu nhập dữ liệu bên dưới.");
      queryClient.invalidateQueries({ queryKey: ["matrix", DMNL_CODE] });
      setHydrated(true);
      setParams({ versionId: String(created.versionId) });
    },
    onError: (e: unknown) => {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? (e as Error).message ?? "Tạo bộ định mức thất bại.");
    },
  });

  /**
   * Bấm "Tạo bộ định mức" — kiểm tra trùng "Ngày hiệu lực từ" TRƯỚC khi
   * gọi API. Backend chặn trùng đúng theo ngày này (mỗi mã chỉ một phiên
   * bản cho một effectiveFrom), mà mặc định "Năm áp dụng" luôn là năm hiện
   * tại nên rất dễ trùng với kỳ đã khai — lúc đó gọi tạo mới sẽ luôn ra lỗi
   * 400. Trùng thì coi như người dùng muốn thêm bộ dữ liệu vào ĐÚNG kỳ đã
   * có (chuyển sang sửa kỳ đó), thay vì báo lỗi khó hiểu.
   */
  const handleCreateClick = () => {
    const existing = allVersions.find((v) => v.effectiveFrom === effectiveFrom);
    if (existing) {
      toast.message(
        `Đã có bộ định mức bắt đầu từ ngày ${effectiveFrom} — chuyển sang bộ đó để thêm dữ liệu.`,
      );
      setHydrated(false);
      setParams({ versionId: String(existing.versionId) });
      return;
    }
    createMutation.mutate();
  };

  // ── sửa thông tin chung của kỳ đã có ─────────────────────────────────────
  const updateMetaMutation = useMutation({
    mutationFn: async () => {
      if (!grid) throw new Error("Chưa có bộ định mức để sửa.");
      if (!effectiveFrom) throw new Error("Chưa chọn ngày bắt đầu hiệu lực.");
      return matrixService.updateVersion(DMNL_CODE, grid.versionId, {
        effectiveFrom,
        effectiveTo: effectiveTo || null,
        versionLabel: versionLabel || undefined,
        note,
      });
    },
    onSuccess: () => {
      toast.success("Đã lưu thông tin chung.");
      queryClient.invalidateQueries({ queryKey: ["matrix", DMNL_CODE] });
    },
    onError: (e: unknown) => {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? (e as Error).message ?? "Lưu thất bại.");
    },
  });

  // ── bộ dữ liệu (pill) theo Chủng loại xe + Hậu tố ────────────────────────
  const datasets = useMemo(() => (grid ? groupColumnsByVehicleSuffix(grid) : []), [grid]);
  const pillKeys = useMemo(() => datasets.map((d) => d.vehicleSuffixKey), [datasets]);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  useEffect(() => {
    if (activeKey && pillKeys.includes(activeKey)) return;
    setActiveKey(focusKey && pillKeys.includes(focusKey) ? focusKey : pillKeys[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pillKeys.join(","), focusKey]);

  const activeDataset = datasets.find((d) => d.vehicleSuffixKey === activeKey);
  const [showAddDataset, setShowAddDataset] = useState(false);
  const [addRowOpen, setAddRowOpen] = useState(false);
  const [newDistance, setNewDistance] = useState("");

  // ── ô đang sửa (dirty) ───────────────────────────────────────────────────
  const [dirty, setDirty] = useState<DirtyMap>({});
  const dirtyCount = useMemo(
    () => Object.values(dirty).reduce((n, row) => n + Object.keys(row).length, 0),
    [dirty],
  );
  const setCell = (rowKey: string, colKey: string, text: string) =>
    setDirty((prev) => ({ ...prev, [rowKey]: { ...(prev[rowKey] ?? {}), [colKey]: text } }));
  const displayValue = (rowKey: string, colKey: string): string => {
    const edited = dirty[rowKey]?.[colKey];
    if (edited !== undefined) return edited;
    const saved = grid?.cells[rowKey]?.[colKey];
    return saved === undefined || saved === null ? "" : String(saved);
  };

  const saveCellsMutation = useMutation({
    mutationFn: async () => {
      if (!grid) return 0;
      const payload: MatrixCellUpsert[] = [];
      const bad: string[] = [];
      for (const [rowKey, cols] of Object.entries(dirty)) {
        for (const [colKey, text] of Object.entries(cols)) {
          const raw = text.trim();
          if (raw === "") {
            payload.push({ rowKey, colKey, value: null });
            continue;
          }
          const num = Number(raw.replace(",", "."));
          if (Number.isNaN(num)) {
            bad.push(`${rowKey} / ${colKey}: "${raw}"`);
            continue;
          }
          payload.push({ rowKey, colKey, value: num });
        }
      }
      if (bad.length > 0) {
        throw new Error(`Có ${bad.length} ô không phải số:\n${bad.slice(0, 5).join("\n")}`);
      }
      return matrixService.saveCells(grid.code, grid.versionId, payload);
    },
    onSuccess: (affected) => {
      setDirty({});
      queryClient.invalidateQueries({ queryKey: ["matrix", DMNL_CODE] });
      toast.success(`Đã lưu ${affected} ô.`);
    },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Lưu thất bại."),
  });

  const addColumnMutation = useMutation({
    mutationFn: async (distance: number) => {
      if (!grid || !activeKey) throw new Error("Chưa chọn bộ dữ liệu.");
      const key = buildColumnKey(activeKey, distance);
      return matrixService.addCols(grid.code, grid.versionId, [{ key, label: key }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matrix", DMNL_CODE] });
      setNewDistance("");
      toast.success("Đã thêm cung độ.");
    },
    onError: (e: unknown) => {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Thêm cung độ thất bại.");
    },
  });

  const bulkAddMutation = useMutation({
    mutationFn: async (columns: { key: string; label: string }[]) => {
      if (!grid) throw new Error("Chưa tạo bộ định mức.");
      return matrixService.addCols(grid.code, grid.versionId, columns);
    },
    onSuccess: (_updated, columns) => {
      queryClient.invalidateQueries({ queryKey: ["matrix", DMNL_CODE] });
      setShowAddDataset(false);
      if (columns[0]) {
        const vs = parseColumnKey(columns[0].key)?.vehicleSuffixKey;
        if (vs) setActiveKey(vs);
      }
      toast.success(`Đã thêm ${columns.length} cột.`);
    },
    onError: (e: unknown) => {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Thêm bộ định mức thất bại.");
    },
  });

  const removeColumnMutation = useMutation({
    mutationFn: async (colKey: string) => {
      if (!grid) return;
      await matrixService.removeCol(grid.code, grid.versionId, colKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matrix", DMNL_CODE] });
      toast.success("Đã xoá cột.");
    },
  });

  const removeDatasetMutation = useMutation({
    mutationFn: async (vehicleSuffixKey: string) => {
      if (!grid) return;
      const ds = datasets.find((d) => d.vehicleSuffixKey === vehicleSuffixKey);
      if (!ds) return;
      for (const col of ds.columns) {
        // eslint-disable-next-line no-await-in-loop
        await matrixService.removeCol(grid.code, grid.versionId, col.key);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matrix", DMNL_CODE] });
      setActiveKey(null);
      toast.success("Đã xoá bộ dữ liệu.");
    },
  });

  // ── mở rộng toàn màn hình phần nhập dữ liệu ──────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Import Excel ─────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"direct" | "excel">("direct");
  const [preview, setPreview] = useState<FuelNormImportPreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handlePickFile = async (file: File) => {
    if (!grid) return;
    setPendingFile(file);
    const p = await previewFuelNormExcel(grid, file);
    setPreview(p);
  };

  const confirmImport = async () => {
    if (!grid || !pendingFile) return;
    setImporting(true);
    try {
      const { affected, errors } = await importFuelNormExcel(grid, pendingFile);
      if (errors.length > 0) {
        toast.error(
          `File có ${errors.length} vấn đề:\n${errors.slice(0, 5).join("\n")}${
            errors.length > 5 ? `\n… và ${errors.length - 5} dòng khác` : ""
          }`,
          { duration: 10000 },
        );
      }
      queryClient.invalidateQueries({ queryKey: ["matrix", DMNL_CODE] });
      toast.success(`Đã nhập ${affected} ô.`);
      setPreview(null);
      setPendingFile(null);
      setTab("direct");
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Nhập file thất bại.");
    } finally {
      setImporting(false);
    }
  };

  const summaryVehicles = new Set(pillKeys.map((k) => k.split(".")[0])).size;
  const summarySuffixes = new Set(pillKeys.map((k) => k.slice(k.lastIndexOf(".") + 1))).size;

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.DANH_MUC.DINH_MUC_NHIEN_LIEU}>Định mức nhiên liệu</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{isEdit ? "Sửa bộ định mức" : "Thêm mới"}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">
          {isEdit ? "Sửa bộ định mức nhiên liệu" : "Thêm mới bộ định mức nhiên liệu"}
        </h1>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(ROUTES.DANH_MUC.DINH_MUC_NHIEN_LIEU)}>
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </Button>
      </div>

      {/* Thông tin chung */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-bold">Thông tin chung</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Năm áp dụng" required>
            <Input type="number" value={year} onChange={(e) => onYearChange(Number(e.target.value))} className="h-9 text-sm" />
          </Field>
          <Field label="Ngày hiệu lực từ" required>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="h-9 text-sm" />
          </Field>
          <Field label="Ngày hết hiệu lực">
            <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} className="h-9 text-sm" />
          </Field>
          <Field label="Phiên bản">
            <Input value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="vd T2-2025" className="h-9 text-sm" />
          </Field>
          <Field label="Trạng thái">
            <div className="flex h-9 items-center rounded-md bg-blue-50 px-3 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              {STATUS_LABEL[statusOf(effectiveFrom || null, effectiveTo || null)]}
            </div>
          </Field>
          <Field label="Đơn vị tính">
            <div className="flex h-9 items-center rounded-md bg-muted px-3 text-xs text-muted-foreground">
              {grid?.valueLabel ?? latestGrid?.valueLabel ?? "lít"}
            </div>
          </Field>
          <div className="sm:col-span-3 lg:col-span-4">
            <Field label="Mô tả" required>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bộ định mức nhiên liệu các chủng loại xe năm ..." className="h-9 text-sm" />
            </Field>
          </div>
          <div className="flex items-end sm:col-span-3 lg:col-span-2">
            {isEdit ? (
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                disabled={updateMetaMutation.isPending}
                onClick={() => updateMetaMutation.mutate()}
              >
                <Save className="h-4 w-4" /> Lưu thông tin chung
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                disabled={createMutation.isPending}
                onClick={handleCreateClick}
              >
                <Save className="h-4 w-4" /> Tạo bộ định mức
              </Button>
            )}
          </div>
        </div>
        {pillKeys.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Gồm {summaryVehicles} chủng loại xe, {summarySuffixes} hậu tố.
          </p>
        )}
      </div>

      {/* Nhập dữ liệu định mức */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col rounded-lg border bg-card",
          isFullscreen && "fixed inset-0 z-[100] rounded-none",
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-bold">Nhập dữ liệu định mức</h2>
          <div className="flex items-center gap-2">
            {grid && (
              <>
                <input
                  ref={importRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setTab("excel"); handlePickFile(f); }
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => importRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" /> Chọn file Excel
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setTab("direct")}>
                  <Plus className="h-3.5 w-3.5" /> Nhập dữ liệu
                </Button>
              </>
            )}
            <button
              title={isFullscreen ? "Thu nhỏ" : "Mở rộng toàn màn hình"}
              onClick={() => setIsFullscreen((v) => !v)}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!grid ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Điền thông tin chung và bấm "Tạo bộ định mức" để bắt đầu nhập dữ liệu.
          </div>
        ) : (
          <>
            <div className="flex gap-3 border-b px-4 text-sm">
              <button className={cn("py-2.5", tab === "direct" ? "border-b-2 border-blue-600 font-semibold text-blue-700" : "text-muted-foreground")} onClick={() => setTab("direct")}>
                Nhập trực tiếp
              </button>
              <button className={cn("py-2.5", tab === "excel" ? "border-b-2 border-blue-600 font-semibold text-blue-700" : "text-muted-foreground")} onClick={() => setTab("excel")}>
                Import từ Excel
              </button>
            </div>

            {tab === "direct" ? (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                {/* Dataset pills */}
                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
                  {pillKeys.map((k) => (
                    <button
                      key={k}
                      onClick={() => setActiveKey(k)}
                      className={cn(
                        "rounded-md border px-3 py-1.5 text-xs",
                        activeKey === k ? "border-blue-400 bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/30" : "bg-white dark:bg-gray-900",
                      )}
                    >
                      {k}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAddDataset(true)}
                    className="rounded-md border border-dashed px-3 py-1.5 text-xs text-blue-700"
                  >
                    + Thêm bộ định mức
                  </button>
                </div>

                {activeKey ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="any"
                          placeholder="Cung độ mới (km)"
                          value={newDistance}
                          onChange={(e) => setNewDistance(e.target.value)}
                          className="h-8 w-[160px] text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs"
                          disabled={!newDistance || addColumnMutation.isPending}
                          onClick={() => addColumnMutation.mutate(Number(newDistance.replace(",", ".")))}
                        >
                          <Plus className="h-3.5 w-3.5" /> Thêm cung độ
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setAddRowOpen(true)}>
                          <Plus className="h-3.5 w-3.5" /> Thêm độ dốc
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-xs text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (window.confirm(`Xoá cả bộ dữ liệu "${activeKey}" và toàn bộ giá trị của nó?`)) {
                              removeDatasetMutation.mutate(activeKey);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Xoá bộ dữ liệu
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700"
                          disabled={dirtyCount === 0 || saveCellsMutation.isPending}
                          onClick={() => saveCellsMutation.mutate()}
                        >
                          <Save className="h-3.5 w-3.5" /> {dirtyCount > 0 ? `Lưu ${dirtyCount} ô` : "Lưu"}
                        </Button>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
                      {!activeDataset || activeDataset.columns.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          Bộ dữ liệu này chưa có cung độ nào. Dùng "Thêm cung độ" để bắt đầu.
                        </div>
                      ) : grid.rows.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                          Lưới chưa có độ dốc nào. Dùng "Thêm độ dốc" để bắt đầu.
                        </div>
                      ) : (
                        <table className="border-collapse text-sm">
                          <thead>
                            <tr>
                              <th className="sticky left-0 top-0 z-20 min-w-[140px] border-b border-r bg-muted px-3 py-2 text-left font-semibold">
                                {grid.rowAxisLabel}
                              </th>
                              {activeDataset.columns.map((c) => (
                                <th key={c.key} className="group sticky top-0 z-10 min-w-[100px] border-b border-r bg-muted px-2 py-2 text-center font-semibold">
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{c.distance}</span>
                                    <button
                                      title="Xoá cột"
                                      onClick={() => removeColumnMutation.mutate(c.key)}
                                      className="opacity-0 transition group-hover:opacity-100"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    </button>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {grid.rows.map((r) => (
                              <tr key={r.key}>
                                <th className="sticky left-0 z-10 border-b border-r bg-card px-3 py-1.5 text-left font-medium">
                                  {r.label}
                                </th>
                                {activeDataset.columns.map((c) => {
                                  const isDirty = dirty[r.key]?.[c.key] !== undefined;
                                  return (
                                    <td key={c.key} className="border-b border-r p-0">
                                      <Input
                                        type="number"
                                        step="any"
                                        value={displayValue(r.key, c.key)}
                                        onChange={(e) => setCell(r.key, c.key, e.target.value)}
                                        className={cn(
                                          "h-8 rounded-none border-0 text-right text-sm shadow-none focus-visible:ring-1",
                                          isDirty && "bg-amber-50 dark:bg-amber-950/30",
                                        )}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    Bấm "+ Thêm bộ định mức" để bắt đầu.
                  </div>
                )}

                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" onClick={() => downloadFuelNormExcel(grid)}>
                    <Download className="h-3.5 w-3.5" /> Tải xuống cả lưới (Excel)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4">
                <div className="mb-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => downloadFuelNormExcel(grid)}
                  >
                    <Download className="h-3.5 w-3.5" /> Tải file mẫu Excel
                  </Button>
                </div>
                <div
                  className="cursor-pointer rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/40 p-8 text-center dark:bg-blue-950/10"
                  onClick={() => importRef.current?.click()}
                >
                  <p className="text-sm font-semibold">Kéo thả hoặc chọn file Excel định mức</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cột tiêu đề dạng "&lt;chủng loại xe&gt;.CS|KC_&lt;cung độ&gt;", vd HD785-7.CS_0,05
                  </p>
                  {pendingFile && <p className="mt-2 text-xs">Đã chọn: {pendingFile.name}</p>}
                </div>

                {preview && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <Metric label="Chủng loại xe" value={preview.vehicleCount} />
                      <Metric label="Hậu tố" value={preview.suffixCount} />
                      <Metric label="Cột định mức" value={preview.columnCount} />
                      <Metric label="Dòng độ dốc" value={preview.rowCount} />
                      <Metric label="Cảnh báo" value={preview.warnings.length} warn={preview.warnings.length > 0} />
                    </div>
                    {(preview.newColumnCount > 0 || preview.newRowCount > 0) && (
                      <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                        Sẽ tự tạo thêm {preview.newColumnCount} cột và {preview.newRowCount} dòng chưa có trong lưới.
                      </p>
                    )}
                    {preview.warnings.length > 0 && (
                      <p className="whitespace-pre-line rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        {preview.warnings.slice(0, 5).join("\n")}
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setPreview(null); setPendingFile(null); }}>
                        Huỷ
                      </Button>
                      <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" disabled={importing} onClick={confirmImport}>
                        {importing ? "Đang nhập…" : "Xác nhận Import"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showAddDataset && grid && (
        <FuelNormBulkAddModal
          existingColumnKeys={new Set(grid.cols.map((c) => c.key))}
          onClose={() => setShowAddDataset(false)}
          onConfirm={(columns) => bulkAddMutation.mutate(columns)}
        />
      )}

      {addRowOpen && grid && (
        <MatrixAxisAddModal
          grid={grid}
          axis="ROW"
          onClose={() => setAddRowOpen(false)}
          onSaved={() => {
            setAddRowOpen(false);
            queryClient.invalidateQueries({ queryKey: ["matrix", DMNL_CODE] });
          }}
        />
      )}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-lg font-bold", warn && value > 0 ? "text-amber-600" : "text-blue-700")}>{value}</div>
    </div>
  );
}
