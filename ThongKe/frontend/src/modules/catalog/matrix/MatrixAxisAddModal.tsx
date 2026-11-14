import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/config/api.config";
import DIcon from "../design/DIcon";
import "@/styles/catalog-design.css";
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
        ? matrixService.addRows(grid.code, grid.versionId, entries)
        : matrixService.addCols(grid.code, grid.versionId, entries));
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
    <div
      className="tkc-modal-overlay"
      style={{ zIndex: 100 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={{ width: "min(720px, 100%)" }} role="dialog" aria-modal="true" aria-label={`Thêm ${isRow ? "dòng" : "cột"}`}>
        <div className="modal-header">
          <div>
            <h2>
              Thêm {isRow ? "dòng" : "cột"} — {axisLabel}
            </h2>
            <p>
              {sourcePath
                ? "Chọn từ danh mục nguồn. Mục đã có trong lưới sẽ bị bỏ qua."
                : `Mỗi dòng một giá trị.${numeric ? " Trục này chỉ nhận số." : ""}`}
            </p>
          </div>
          <button className="close-modal" style={{ marginLeft: "auto" }} aria-label="Đóng" onClick={onClose}>
            <DIcon name="x" />
          </button>
        </div>

        <div className="modal-body">
          {sourcePath ? (
            isLoading ? (
              <p className="entry-empty">Đang tải danh mục…</p>
            ) : (
              <div className="mx-add-list">
                {source.map((s) => {
                  const already = existing.has(s.code);
                  return (
                    <label key={s.id} className={`mx-add-item ${already ? "is-had" : ""}`}>
                      <input
                        type="checkbox"
                        className="checkbox"
                        disabled={already}
                        checked={already || selected.has(s.code)}
                        onChange={() => toggle(s.code)}
                      />
                      <span className="mx-add-name" title={s.code}>
                        {s.name}
                      </span>
                      {already && <span className="mx-add-had">đã có</span>}
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
              className="field mx-add-textarea"
            />
          )}

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={submitting}>
            Huỷ
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? "Đang lưu…" : "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}
