import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Maximize, Minimize, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/config/api.config";
import { matrixService, type MatrixCellUpsert, type MatrixGrid } from "../matrix/matrixService";
import {
  VEHICLE_OUTPUT_CLASSIFICATIONS,
  vehicleClassificationKeyOf,
  type VehicleOutputClassification,
} from "./vehicleOutputKeys";

const CODE = "NANG_SUAT_XE";

interface VehicleTypeOption {
  id: number;
  code: string;
  name: string;
}

interface DistanceRow {
  id: number;
  distance: string;
}

interface ColumnGroup {
  id: number;
  vehicleTypeCode: string;
  classification: VehicleOutputClassification | "";
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

/**
 * Modal "Thêm mới năng suất xe" — bespoke cho danh mục Năng suất xe
 * (NANG_SUAT_XE), một trong 4 lưới dùng chung (`MatrixDefinition`/
 * `MatrixCell` qua `matrixService`, y hệt cách DMNL đã dùng trước khi có
 * UI riêng). KHÔNG cần đổi kiến trúc dữ liệu — mỗi năm là một phiên bản
 * lưới (giống DMNL), Cung độ là dòng số (numericRowAxis), "Chủng loại xe +
 * Phân loại" gộp lại một khoá cột KHÔNG có hậu tố khu vực (xem
 * `vehicleOutputKeys.ts`).
 *
 * Trang lưới đầy đủ cũ (`MatrixCatalogPage`) KHÔNG sửa file — modal này
 * chỉ ghi qua đúng `matrixService` dùng chung, nên dữ liệu tạo ở đây hiện
 * ngay bên đó, không có kho riêng phải giữ đồng bộ tay.
 */
export function VehicleOutputAddModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState<DistanceRow[]>([]);
  const [groups, setGroups] = useState<ColumnGroup[]>([]);
  const [values, setValues] = useState<Record<number, Record<number, string>>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setYear(currentYear);
    setRows([{ id: nextId(), distance: "" }]);
    setGroups([{ id: nextId(), vehicleTypeCode: "", classification: "" }]);
    setValues({});
  }, [open]);

  // Danh mục "Chủng loại xe" (cột DA), KHÔNG phải "Chủng loại xe (NL)" của
  // ĐMNL và cũng không phải chủng loại hàng — xem `vehicleOutputKeys.ts`.
  const { data: vehicleTypes = [] } = useQuery({
    queryKey: ["vehicle-types-options"],
    queryFn: async () => {
      const res = await api.get("/vehicle-types", { params: { size: 500 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as VehicleTypeOption[];
    },
    enabled: open,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["matrix-versions", CODE],
    queryFn: () => matrixService.versions(CODE),
    enabled: open,
  });

  if (!open) return null;

  const addRow = () => setRows((prev) => [...prev, { id: nextId(), distance: "" }]);
  const removeRow = (id: number) => setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  const setDistance = (id: number, distance: string) =>
    setRows((prev) => prev.map((r) => (r.id !== id ? r : { ...r, distance })));

  const addGroup = () => setGroups((prev) => [...prev, { id: nextId(), vehicleTypeCode: "", classification: "" }]);
  const removeGroup = (id: number) => setGroups((prev) => (prev.length === 1 ? prev : prev.filter((g) => g.id !== id)));
  const setGroupField = (id: number, field: "vehicleTypeCode" | "classification", value: string) =>
    setGroups((prev) => prev.map((g) => (g.id !== id ? g : { ...g, [field]: value })));

  /** Khoá cột của một nhóm — dùng chung cho kiểm tra, tạo cột và ghi ô. */
  const groupKey = (g: ColumnGroup) =>
    vehicleClassificationKeyOf(g.vehicleTypeCode, g.classification as VehicleOutputClassification);

  const setCellValue = (rowId: number, groupId: number, value: string) =>
    setValues((prev) => ({ ...prev, [rowId]: { ...(prev[rowId] ?? {}), [groupId]: value } }));

  const validate = (): string | null => {
    const distances = rows.map((r) => r.distance.trim());
    if (distances.some((d) => !d)) return "Có dòng chưa nhập Cung độ.";
    if (distances.some((d) => Number.isNaN(Number(d.replace(",", ".")))))
      return "Cung độ phải là số.";
    if (new Set(distances).size !== distances.length) return "Có Cung độ bị trùng nhau.";
    if (groups.some((g) => !g.vehicleTypeCode || !g.classification))
      return "Có nhóm cột chưa chọn đủ Chủng loại xe + Phân loại.";
    const keys = groups.map(groupKey);
    if (new Set(keys).size !== keys.length) return "Có nhóm cột bị trùng nhau (cùng Chủng loại xe + Phân loại).";
    const hasAnyValue = rows.some((r) => groups.some((g) => values[r.id]?.[g.id]?.trim()));
    if (!hasAnyValue) return "Chưa nhập giá trị nào.";
    return null;
  };

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const effectiveFrom = `${year}-01-01`;
      const effectiveTo = `${year}-12-31`;

      const existingVersion = versions.find((v) => v.effectiveFrom === effectiveFrom);
      let grid: MatrixGrid = existingVersion
        ? await matrixService.getGrid(CODE, existingVersion.versionId)
        : await matrixService.createVersion(CODE, {
            effectiveFrom,
            effectiveTo,
            note: `Năng suất xe năm ${year}`,
            copyCells: false,
          });

      const existingRowKeys = new Set(grid.rows.map((r) => r.key));
      const newRowKeys = new Set(rows.map((r) => r.distance.trim()).filter((d) => !existingRowKeys.has(d)));
      if (newRowKeys.size > 0) {
        grid = await matrixService.addRows(
          CODE,
          grid.versionId,
          [...newRowKeys].map((d) => ({ key: d, label: d })),
        );
      }

      const existingColKeys = new Set(grid.cols.map((c) => c.key));
      const newColKeys = new Set(groups.map(groupKey).filter((k) => !existingColKeys.has(k)));
      if (newColKeys.size > 0) {
        grid = await matrixService.addCols(
          CODE,
          grid.versionId,
          [...newColKeys].map((k) => ({ key: k, label: k })),
        );
      }

      const cellPayload: MatrixCellUpsert[] = [];
      for (const r of rows) {
        const rowKey = r.distance.trim();
        for (const g of groups) {
          const raw = values[r.id]?.[g.id]?.trim();
          if (!raw) continue;
          const num = Number(raw.replace(",", "."));
          if (Number.isNaN(num)) continue;
          cellPayload.push({ rowKey, colKey: groupKey(g), value: num });
        }
      }
      if (cellPayload.length > 0) {
        await matrixService.saveCells(CODE, grid.versionId, cellPayload);
      }

      toast.success(`Đã lưu ${cellPayload.length} ô năng suất xe.`);
      onSaved();
      onClose();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message ?? "Lưu thất bại. Kiểm tra lại dữ liệu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 ${isFullscreen ? "" : "p-4"}`}>
      <div
        className={
          isFullscreen
            ? "flex h-screen w-screen flex-col overflow-hidden bg-white dark:bg-gray-900"
            : "flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900"
        }
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Thêm mới năng suất xe</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Chọn thời gian, chọn khu vực xúc, sau đó nhập năng suất cho từng Cung độ × nhóm cột.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Thời gian *</span>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[120]">
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {`01/${y} - 12/${y}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Không có ô "Khu vực xúc": khoá cột Năng suất xe KHÔNG mang hậu
                tố khu vực (công thức BR5 cắt bỏ đúng hậu tố đó). Xem QĐ-11. */}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr>
                  <th rowSpan={2} className="w-16 border-b border-r border-gray-200 bg-gray-100 px-3 py-2 text-center font-bold dark:border-gray-700 dark:bg-gray-900">
                    #
                  </th>
                  <th rowSpan={2} className="min-w-[140px] border-b border-r border-gray-200 bg-gray-100 px-3 py-2 text-left font-bold dark:border-gray-700 dark:bg-gray-900">
                    Cung độ (km)
                  </th>
                  <th colSpan={groups.length} className="border-b border-r border-gray-200 bg-gray-100 px-3 py-2 text-center font-bold dark:border-gray-700 dark:bg-gray-900">
                    Chủng loại xe + Phân loại
                  </th>
                  <th rowSpan={2} className="w-10 border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900" />
                </tr>
                <tr>
                  {groups.map((g) => (
                    <th key={g.id} className="min-w-[220px] border-b border-r border-gray-200 bg-gray-50 px-2 py-2 dark:border-gray-700 dark:bg-gray-900/60">
                      <div className="flex items-center gap-1">
                        <Select value={g.vehicleTypeCode} onValueChange={(v) => setGroupField(g.id, "vehicleTypeCode", v)}>
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="Chủng loại xe" />
                          </SelectTrigger>
                          <SelectContent className="z-[120]">
                            {vehicleTypes.map((c) => (
                              <SelectItem key={c.id} value={c.code}>
                                {c.code} — {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={g.classification} onValueChange={(v) => setGroupField(g.id, "classification", v)}>
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="Phân loại" />
                          </SelectTrigger>
                          <SelectContent className="z-[120]">
                            {/* Chỉ hai giá trị: công thức AD5 tự suy DAT/Than
                                từ Sản phẩm nghiệm thu, không có danh mục
                                "Phân loại" ở đây (QĐ-10). */}
                            {VEHICLE_OUTPUT_CLASSIFICATIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {groups.length > 1 && (
                          <button title="Xoá nhóm này" onClick={() => removeGroup(g.id)} className="shrink-0 text-red-500 hover:text-red-700">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="border-b border-gray-200 bg-gray-50 px-1 py-2 dark:border-gray-700 dark:bg-gray-900/60">
                    <button
                      onClick={addGroup}
                      title="Thêm nhóm"
                      className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-blue-700 hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Thêm nhóm
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={r.id} className={ri % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50/50 dark:bg-gray-900/40"}>
                    <td className="border-b border-r border-gray-200 px-2 py-1.5 text-center text-gray-500 dark:border-gray-700">{ri + 1}</td>
                    <td className="border-b border-r border-gray-200 px-2 py-1.5 dark:border-gray-700">
                      <Input
                        type="number"
                        step="any"
                        value={r.distance}
                        onChange={(e) => setDistance(r.id, e.target.value)}
                        placeholder="vd 0,05"
                        className="h-9 text-sm"
                      />
                    </td>
                    {groups.map((g) => (
                      <td key={g.id} className="border-b border-r border-gray-200 px-2 py-1.5 dark:border-gray-700">
                        <Input
                          type="number"
                          step="any"
                          value={values[r.id]?.[g.id] ?? ""}
                          onChange={(e) => setCellValue(r.id, g.id, e.target.value)}
                          className="h-9 text-right text-sm"
                        />
                      </td>
                    ))}
                    <td className="border-b border-gray-200 px-1 py-1.5 text-center dark:border-gray-700">
                      {rows.length > 1 && (
                        <button title="Xoá dòng này" onClick={() => removeRow(r.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={addRow} className="mt-3 rounded-md border border-dashed px-3 py-1.5 text-xs text-blue-700">
            + Thêm dòng
          </button>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 font-semibold text-white hover:bg-blue-700">
            {submitting ? "Đang lưu..." : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}
