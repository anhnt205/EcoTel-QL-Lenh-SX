import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Upload, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
import { downloadMatrixExcel, parseMatrixExcel } from "./matrixExcel";
import { matrixService, type MatrixCellUpsert, type MatrixGrid } from "./matrixService";
import { MatrixAxisAddModal } from "./MatrixAxisAddModal";

/** Ô đang sửa nhưng chưa lưu: rowKey -> colKey -> văn bản trong ô nhập. */
type DirtyMap = Record<string, Record<string, string>>;

/**
 * Màn danh mục dạng LƯỚI, dùng chung cho cả 4 bảng tra hai chiều.
 *
 * Vì sao không dùng `CatalogPage`: lưới Mô hình là ~145 chủng loại hàng ×
 * ~48 chủng loại xe. Ở dạng bảng phẳng thì mỗi ô là một dòng, người nhập
 * không thể so sánh các giá trị cạnh nhau — mà so sánh chính là việc họ làm
 * suốt khi rà soát định mức.
 */
export function MatrixCatalogPage({
  code,
  breadcrumb = ["Danh mục", "Thống kê sản lượng"],
}: {
  code: string;
  breadcrumb?: string[];
}) {
  const queryClient = useQueryClient();
  const [dirty, setDirty] = useState<DirtyMap>({});
  const [addAxis, setAddAxis] = useState<"ROW" | "COL" | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const { data: grid, isLoading } = useQuery({
    queryKey: ["matrix", code],
    queryFn: () => matrixService.getGrid(code),
  });

  const dirtyCount = useMemo(
    () => Object.values(dirty).reduce((n, row) => n + Object.keys(row).length, 0),
    [dirty],
  );

  const setCell = (rowKey: string, colKey: string, text: string) =>
    setDirty((prev) => ({
      ...prev,
      [rowKey]: { ...(prev[rowKey] ?? {}), [colKey]: text },
    }));

  /** Giá trị hiện trên màn: bản đang sửa nếu có, không thì bản đã lưu. */
  const displayValue = (g: MatrixGrid, rowKey: string, colKey: string): string => {
    const edited = dirty[rowKey]?.[colKey];
    if (edited !== undefined) return edited;
    const saved = g.cells[rowKey]?.[colKey];
    return saved === undefined || saved === null ? "" : String(saved);
  };

  const saveMutation = useMutation({
    mutationFn: async (g: MatrixGrid) => {
      const payload: MatrixCellUpsert[] = [];
      const bad: string[] = [];

      for (const [rowKey, cols] of Object.entries(dirty)) {
        for (const [colKey, text] of Object.entries(cols)) {
          const raw = text.trim();
          if (raw === "") {
            // Ô xoá trắng = trả về "chưa khai báo", không phải ghi số 0.
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
        throw new Error(
          `Có ${bad.length} ô không phải số:\n${bad.slice(0, 5).join("\n")}`,
        );
      }
      return matrixService.saveCells(g.code, payload);
    },
    onSuccess: (affected) => {
      setDirty({});
      queryClient.invalidateQueries({ queryKey: ["matrix", code] });
      toast.success(`Đã lưu ${affected} ô.`);
    },
    onError: (e: unknown) => {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? (e as Error).message ?? "Lưu thất bại.");
    },
  });

  const removeAxis = async (axis: "ROW" | "COL", key: string, label: string) => {
    const what = axis === "ROW" ? "dòng" : "cột";
    if (!window.confirm(`Xoá ${what} "${label}" và toàn bộ giá trị của nó?`)) return;
    try {
      await (axis === "ROW"
        ? matrixService.removeRow(code, key)
        : matrixService.removeCol(code, key));
      queryClient.invalidateQueries({ queryKey: ["matrix", code] });
      toast.success(`Đã xoá ${what} "${label}".`);
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Xoá thất bại.");
    }
  };

  const handleImport = async (file: File) => {
    if (!grid) return;
    try {
      const { cells, errors } = await parseMatrixExcel(grid, file);
      if (errors.length > 0) {
        toast.error(
          `File có ${errors.length} vấn đề:\n${errors.slice(0, 5).join("\n")}${
            errors.length > 5 ? `\n… và ${errors.length - 5} dòng khác` : ""
          }`,
          { duration: 10000 },
        );
        if (cells.length === 0) return;
      }
      const affected = await matrixService.saveCells(code, cells);
      queryClient.invalidateQueries({ queryKey: ["matrix", code] });
      setDirty({});
      toast.success(`Đã nhập ${affected} ô.`);
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Nhập file thất bại.");
    }
  };

  if (isLoading || !grid) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải lưới…</div>;
  }

  const empty = grid.rows.length === 0 || grid.cols.length === 0;

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumb.map((b) => (
            <React.Fragment key={b}>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">{b}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage>{grid.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-blue-700 dark:text-blue-400">
            {grid.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Dòng: {grid.rowAxisLabel} · Cột: {grid.colAxisLabel} · Đơn vị:{" "}
            {grid.valueLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={importRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" className="h-9 gap-1.5"
            onClick={() => setAddAxis("ROW")}>
            <Plus className="h-4 w-4" /> Thêm dòng
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5"
            onClick={() => setAddAxis("COL")}>
            <Plus className="h-4 w-4" /> Thêm cột
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5"
            onClick={() => importRef.current?.click()}>
            <Upload className="h-4 w-4" /> Tải lên
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5"
            onClick={() => downloadMatrixExcel(grid)}>
            <Download className="h-4 w-4" /> Tải xuống
          </Button>
          {dirtyCount > 0 && (
            <Button variant="outline" size="sm" className="h-9 gap-1.5"
              onClick={() => setDirty({})}>
              <RotateCcw className="h-4 w-4" /> Bỏ sửa
            </Button>
          )}
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
            disabled={dirtyCount === 0 || saveMutation.isPending}
            onClick={() => saveMutation.mutate(grid)}
          >
            <Save className="h-4 w-4" />
            {dirtyCount > 0 ? `Lưu ${dirtyCount} ô` : "Lưu"}
          </Button>
        </div>
      </div>

      {grid.note && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          {grid.note}
        </p>
      )}

      {empty ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Lưới chưa có {grid.rows.length === 0 ? "dòng" : "cột"} nào. Dùng nút
          “Thêm {grid.rows.length === 0 ? "dòng" : "cột"}” để bắt đầu.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card">
          <table className="border-collapse text-sm">
            <thead>
              <tr>
                {/* Ô góc: vừa dính trên vừa dính trái nên cần z cao hơn cả hai */}
                <th className="sticky left-0 top-0 z-30 min-w-[220px] border-b border-r bg-muted px-3 py-2 text-left font-semibold">
                  {grid.rowAxisLabel}
                </th>
                {grid.cols.map((c) => (
                  <th
                    key={c.key}
                    className="group sticky top-0 z-20 min-w-[110px] border-b border-r bg-muted px-2 py-2 text-center font-semibold"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="truncate" title={c.key}>{c.label}</span>
                      <button
                        title={`Xoá cột ${c.label}`}
                        onClick={() => removeAxis("COL", c.key, c.label)}
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
                <tr key={r.key} className="group/row">
                  <th className="sticky left-0 z-10 border-b border-r bg-card px-3 py-1.5 text-left font-medium">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate" title={r.key}>{r.label}</span>
                      <button
                        title={`Xoá dòng ${r.label}`}
                        onClick={() => removeAxis("ROW", r.key, r.label)}
                        className="opacity-0 transition group-hover/row:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </th>
                  {grid.cols.map((c) => {
                    const isDirty = dirty[r.key]?.[c.key] !== undefined;
                    return (
                      <td key={c.key} className="border-b border-r p-0">
                        <Input
                          type="number"
                          step="any"
                          value={displayValue(grid, r.key, c.key)}
                          onChange={(e) => setCell(r.key, c.key, e.target.value)}
                          className={cn(
                            "h-8 rounded-none border-0 text-right text-sm shadow-none focus-visible:ring-1",
                            // Đánh dấu ô đã sửa chưa lưu, để rời đi rồi quay
                            // lại vẫn biết mình đang dở việc ở đâu.
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
        </div>
      )}

      {addAxis && (
        <MatrixAxisAddModal
          grid={grid}
          axis={addAxis}
          onClose={() => setAddAxis(null)}
          onSaved={() => {
            setAddAxis(null);
            queryClient.invalidateQueries({ queryKey: ["matrix", code] });
          }}
        />
      )}
    </div>
  );
}
