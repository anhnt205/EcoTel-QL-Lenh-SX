import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/config/api.config";
import { Button } from "@/components/ui/button";
import { matrixService, type MatrixGrid } from "./matrixService";

interface SourceItem {
  id: number;
  code: string;
  name: string;
}

/**
 * Thêm dòng/cột vào lưới.
 *
 * Hai cách nhập, tuỳ trục có danh mục nguồn hay không:
 * - Có nguồn (vd Chủng loại hàng) → chọn từ danh sách, tránh gõ sai mã. Mã sai
 *   thì công thức sẽ không bao giờ tra ra ô đó.
 * - Không nguồn (vd dải cung độ) → gõ tay, mỗi dòng một giá trị.
 */
export function MatrixAxisAddModal({
  grid,
  axis,
  onClose,
  onSaved,
}: {
  grid: MatrixGrid;
  axis: "ROW" | "COL";
  onClose: () => void;
  onSaved: () => void;
}) {
  const isRow = axis === "ROW";
  const sourcePath = isRow ? grid.rowSourcePath : grid.colSourcePath;
  const numeric = isRow ? grid.numericRowAxis : grid.numericColAxis;
  const axisLabel = isRow ? grid.rowAxisLabel : grid.colAxisLabel;
  const existing = new Set((isRow ? grid.rows : grid.cols).map((e) => e.key));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: source = [], isLoading } = useQuery({
    queryKey: ["matrix-axis-source", sourcePath],
    queryFn: async () => {
      const res = await api.get(sourcePath!, { params: { size: 1000 } });
      return (res.data?.data?.content ?? res.data?.data ?? []) as SourceItem[];
    },
    enabled: !!sourcePath,
  });

  useEffect(() => setError(null), [selected, manual]);

  const toggle = (code: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const submit = async () => {
    const entries = sourcePath
      ? source
          .filter((s) => selected.has(s.code))
          .map((s) => ({ key: s.code, label: s.name }))
      : manual
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => ({ key: line, label: line }));

    if (entries.length === 0) {
      setError(
        sourcePath ? "Chưa chọn mục nào." : "Chưa nhập giá trị nào.",
      );
      return;
    }

    if (numeric) {
      const bad = entries.filter((e) => Number.isNaN(Number(e.key.replace(",", "."))));
      if (bad.length > 0) {
        setError(
          `Trục này là trục SỐ. Không đọc được thành số: ${bad
            .slice(0, 3)
            .map((b) => `"${b.key}"`)
            .join(", ")}`,
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await (isRow
        ? matrixService.addRows(grid.code, entries)
        : matrixService.addCols(grid.code, entries));
      toast.success(`Đã thêm ${entries.length} ${isRow ? "dòng" : "cột"}.`);
      onSaved();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message ?? "Thêm thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold">
            Thêm {isRow ? "dòng" : "cột"} — {axisLabel}
          </h2>
          <p className="text-xs text-muted-foreground">
            {sourcePath
              ? "Chọn từ danh mục nguồn. Mục đã có trong lưới sẽ bị bỏ qua."
              : `Mỗi dòng một giá trị.${numeric ? " Trục này chỉ nhận số." : ""}`}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {sourcePath ? (
            isLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải danh mục…</p>
            ) : (
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {source.map((s) => {
                  const already = existing.has(s.code);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                        already ? "opacity-40" : "hover:bg-muted/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-blue-600"
                        disabled={already}
                        checked={already || selected.has(s.code)}
                        onChange={() => toggle(s.code)}
                      />
                      <span className="truncate" title={s.code}>
                        {s.name}
                      </span>
                      {already && (
                        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                          đã có
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )
          ) : (
            <textarea
              rows={10}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder={numeric ? "0\n0.5\n1\n1.5" : "Mỗi dòng một giá trị"}
              className="w-full resize-y rounded-md border bg-transparent px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </div>

        {error && (
          <p className="border-t border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-3 dark:border-gray-800">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={submit}
            disabled={submitting}
          >
            {submitting ? "Đang lưu…" : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}
