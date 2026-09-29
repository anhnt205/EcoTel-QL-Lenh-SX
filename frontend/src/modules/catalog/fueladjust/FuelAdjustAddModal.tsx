import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Maximize, Minimize, Trash2, X } from "lucide-react";
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
  AREA_GROUPS,
  FUEL_ADJUST_CLASSIFICATIONS,
  MONTH_COUNT,
  YEARLY_COL_LABEL,
  averageOf,
  monthColumnKeyOf,
  rowKeyOf,
  yearlyColumnKeyOf,
  type AreaGroup,
  type FuelAdjustClassification,
} from "./fuelAdjustKeys";

const CODE = "HS_DIEU_CHINH_NLDM";

interface VehicleFuelClassOption {
  id: number;
  code: string;
  name: string;
}

interface VehicleRankOption {
  id: number;
  code: string;
}

interface Row {
  id: number;
  vehicleCode: string;
  rankCode: string;
  classification: FuelAdjustClassification | "";
  months: string[];
}

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const emptyMonths = (): string[] => Array.from({ length: MONTH_COUNT }, () => "");

/**
 * Modal "Thêm mới HS điều chỉnh NLDM" — bespoke cho danh mục HS điều
 * chỉnh NLĐM (HS_DIEU_CHINH_NLDM), một trong 4 lưới dùng chung
 * (`MatrixDefinition`/`MatrixCell` qua `matrixService`, giống cách Năng
 * suất xe đã làm). Chọn Năm + NHÓM khu vực (CS/KC), sau đó nhập hệ số cho
 * từng dòng (Chủng loại xe (NL) + Hạng + Phân loại) × 12 tháng — cột "HSNL
 * điều chỉnh" tự tính TRUNG BÌNH 12 tháng, cập nhật ngay khi gõ.
 *
 * <p>Khoá cột mang cả THÁNG lẫn nhóm khu vực ({@code T6.CS}) theo QĐ-12, nên
 * một lượt nhập chỉ ghi cho MỘT nhóm khu vực; muốn đủ cả hai thì mở lại và
 * chọn nhóm còn lại — cột mới tự nối vào cùng phiên bản lưới của năm đó.
 */
export function FuelAdjustAddModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [year, setYear] = useState(currentYear);
  const [areaGroup, setAreaGroup] = useState<AreaGroup>("CS");
  const [rows, setRows] = useState<Row[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idRef = useRef(0);
  const nextId = () => ++idRef.current;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setYear(currentYear);
    setAreaGroup("CS");
    setRows([{ id: nextId(), vehicleCode: "", rankCode: "", classification: "", months: emptyMonths() }]);
  }, [open]);

  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicle-fuel-classes-options"],
    queryFn: async () => {
      const res = await api.get("/vehicle-fuel-classes", { params: { size: 500 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as VehicleFuelClassOption[];
    },
    enabled: open,
  });

  const { data: ranks = [] } = useQuery({
    queryKey: ["vehicle-ranks-options"],
    queryFn: async () => {
      const res = await api.get("/vehicle-ranks", { params: { size: 500 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as VehicleRankOption[];
    },
    enabled: open,
  });

  // Không nạp danh mục "Phân loại" và "Khu vực xúc" ở đây: Phân loại là giá
  // trị TỰ SUY DAT/Than (QĐ-10), còn khu vực chỉ vào khoá dưới dạng NHÓM
  // CS/KC (QĐ-13) — chọn từng khu vực cụ thể sẽ sinh cột sai.

  const { data: versions = [] } = useQuery({
    queryKey: ["matrix-versions", CODE],
    queryFn: () => matrixService.versions(CODE),
    enabled: open,
  });

  if (!open) return null;

  const addRow = () =>
    setRows((prev) => [...prev, { id: nextId(), vehicleCode: "", rankCode: "", classification: "", months: emptyMonths() }]);
  const removeRow = (id: number) => setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  const setRowField = (id: number, field: "vehicleCode" | "rankCode" | "classification", value: string) =>
    setRows((prev) => prev.map((r) => (r.id !== id ? r : { ...r, [field]: value })));

  /** Khoá dòng — dùng chung cho kiểm tra trùng, tạo dòng và ghi ô. */
  const keyOf = (r: Row) =>
    rowKeyOf(r.vehicleCode, r.rankCode, r.classification as FuelAdjustClassification);
  const setMonthValue = (id: number, monthIdx: number, value: string) =>
    setRows((prev) =>
      prev.map((r) => (r.id !== id ? r : { ...r, months: r.months.map((m, i) => (i === monthIdx ? value : m)) })),
    );

  const validate = (): string | null => {
    if (rows.some((r) => !r.vehicleCode || !r.rankCode || !r.classification))
      return "Có dòng chưa chọn đủ Chủng loại xe (NL) + Hạng + Phân loại.";
    const keys = rows.map(keyOf);
    // Khoá chỉ lấy CHỮ ĐẦU của mã hạng, nên "C" và "C1" cho ra cùng một dòng
    // — báo trùng ở đây thay vì để hai dòng âm thầm đè lên nhau khi lưu.
    if (new Set(keys).size !== keys.length)
      return "Có dòng bị trùng nhau (cùng Chủng loại xe + chữ đầu Hạng xe + Phân loại).";
    const hasAnyValue = rows.some((r) => r.months.some((m) => m.trim()));
    if (!hasAnyValue) return "Chưa nhập hệ số tháng nào.";
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
            note: `HS điều chỉnh NLĐM năm ${year}`,
            copyCells: false,
          });

      const existingRowKeys = new Set(grid.rows.map((r) => r.key));
      const newRowKeys = rows.map(keyOf).filter((k) => !existingRowKeys.has(k));
      if (newRowKeys.length > 0) {
        grid = await matrixService.addRows(CODE, grid.versionId, [...new Set(newRowKeys)].map((k) => ({ key: k, label: k })));
      }

      // Cột mang cả tháng lẫn nhóm khu vực (QĐ-12); lượt này chỉ tạo 12 cột
      // của nhóm đang chọn + cột hệ số năm của nhóm đó.
      const monthColKeys = Array.from({ length: MONTH_COUNT }, (_, i) => monthColumnKeyOf(i + 1, areaGroup));
      const yearlyColKey = yearlyColumnKeyOf(areaGroup);
      const existingColKeys = new Set(grid.cols.map((c) => c.key));
      const newColKeys = [...monthColKeys, yearlyColKey].filter((k) => !existingColKeys.has(k));
      if (newColKeys.length > 0) {
        const labels: Record<string, string> = { [yearlyColKey]: `${YEARLY_COL_LABEL} — ${areaGroup}` };
        monthColKeys.forEach((k, i) => (labels[k] = `Tháng ${i + 1} — ${areaGroup}`));
        grid = await matrixService.addCols(CODE, grid.versionId, newColKeys.map((k) => ({ key: k, label: labels[k] ?? k })));
      }

      const cellPayload: MatrixCellUpsert[] = [];
      for (const r of rows) {
        const rowKey = keyOf(r);
        r.months.forEach((m, i) => {
          const raw = m.trim();
          if (!raw) return;
          const num = Number(raw.replace(",", "."));
          if (Number.isNaN(num)) return;
          cellPayload.push({ rowKey, colKey: monthColKeys[i], value: num });
        });
        const avg = averageOf(r.months);
        if (avg !== null) {
          cellPayload.push({ rowKey, colKey: yearlyColKey, value: Math.round(avg * 1e6) / 1e6 });
        }
      }
      if (cellPayload.length > 0) {
        await matrixService.saveCells(CODE, grid.versionId, cellPayload);
      }

      toast.success(`Đã lưu ${rows.length} dòng HS điều chỉnh NLĐM.`);
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
            : "flex max-h-[90vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900"
        }
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Thêm mới HS điều chỉnh NLDM</h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Chọn năm và khu vực xúc, sau đó nhập hệ số cho từng tháng. Hệ số năm được hệ thống tự động cập nhật
              (trung bình 12 tháng).
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
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Năm *</span>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="h-9 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[120]">
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Nhóm khu vực *</span>
              <Select value={areaGroup} onValueChange={(v) => setAreaGroup(v as AreaGroup)}>
                <SelectTrigger className="h-9 w-40 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[120]">
                  {AREA_GROUPS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <thead>
                <tr>
                  <th rowSpan={2} className="w-14 border-b border-r border-gray-200 bg-gray-100 px-2 py-2 text-center font-bold dark:border-gray-700 dark:bg-gray-900">
                    STT
                  </th>
                  <th colSpan={3} className="border-b border-r border-gray-200 bg-gray-100 px-3 py-2 text-center font-bold dark:border-gray-700 dark:bg-gray-900">
                    Chủng loại xe (NL) + Hạng xe + Phân loại
                  </th>
                  <th colSpan={MONTH_COUNT} className="border-b border-r border-gray-200 bg-gray-100 px-3 py-2 text-center font-bold dark:border-gray-700 dark:bg-gray-900">
                    Hệ số theo tháng
                  </th>
                  <th rowSpan={2} className="min-w-[110px] border-b border-r border-gray-200 bg-gray-100 px-2 py-2 text-center font-bold dark:border-gray-700 dark:bg-gray-900">
                    {YEARLY_COL_LABEL}
                  </th>
                  <th rowSpan={2} className="w-10 border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900" />
                </tr>
                <tr>
                  <th className="min-w-[150px] border-b border-r border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900/60">Chủng loại xe</th>
                  <th className="min-w-[110px] border-b border-r border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900/60">Hạng xe</th>
                  <th className="min-w-[130px] border-b border-r border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900/60">Phân loại</th>
                  {Array.from({ length: MONTH_COUNT }, (_, i) => i + 1).map((m) => (
                    <th key={m} className="min-w-[80px] border-b border-r border-gray-200 bg-gray-50 px-1 py-1.5 text-center text-xs dark:border-gray-700 dark:bg-gray-900/60">
                      {`Tháng ${m}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => {
                  const avg = averageOf(r.months);
                  return (
                    <tr key={r.id} className={ri % 2 === 0 ? "bg-white dark:bg-gray-950" : "bg-gray-50/50 dark:bg-gray-900/40"}>
                      <td className="border-b border-r border-gray-200 px-2 py-1.5 text-center text-gray-500 dark:border-gray-700">{ri + 1}</td>
                      <td className="border-b border-r border-gray-200 px-1.5 py-1.5 dark:border-gray-700">
                        <Select value={r.vehicleCode} onValueChange={(v) => setRowField(r.id, "vehicleCode", v)}>
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="Chọn xe" />
                          </SelectTrigger>
                          <SelectContent className="z-[120]">
                            {vehicles.map((v) => (
                              <SelectItem key={v.id} value={v.code}>
                                {v.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border-b border-r border-gray-200 px-1.5 py-1.5 dark:border-gray-700">
                        <Select value={r.rankCode} onValueChange={(v) => setRowField(r.id, "rankCode", v)}>
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="C" />
                          </SelectTrigger>
                          <SelectContent className="z-[120]">
                            {ranks.map((rk) => (
                              <SelectItem key={rk.id} value={rk.code}>
                                {rk.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border-b border-r border-gray-200 px-1.5 py-1.5 dark:border-gray-700">
                        <Select value={r.classification} onValueChange={(v) => setRowField(r.id, "classification", v)}>
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="DAT" />
                          </SelectTrigger>
                          <SelectContent className="z-[120]">
                            {/* Hai giá trị tự suy từ SPNT, không phải danh mục (QĐ-10). */}
                            {FUEL_ADJUST_CLASSIFICATIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {r.months.map((m, mi) => (
                        <td key={mi} className="border-b border-r border-gray-200 px-1 py-1.5 dark:border-gray-700">
                          <Input
                            type="number"
                            step="any"
                            value={m}
                            onChange={(e) => setMonthValue(r.id, mi, e.target.value)}
                            className="h-8 w-20 text-center text-xs"
                          />
                        </td>
                      ))}
                      <td className="border-b border-r border-gray-200 px-2 py-1.5 text-center font-semibold text-blue-700 dark:border-gray-700 dark:text-blue-400">
                        {avg !== null ? avg.toFixed(2) : ""}
                      </td>
                      <td className="border-b border-gray-200 px-1 py-1.5 text-center dark:border-gray-700">
                        {rows.length > 1 && (
                          <button title="Xoá dòng này" onClick={() => removeRow(r.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button onClick={addRow} className="mt-3 rounded-md border border-dashed px-3 py-1.5 text-xs text-blue-700">
            + Thêm dòng mới
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
