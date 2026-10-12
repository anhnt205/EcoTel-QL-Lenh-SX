import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CopyPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matrixService, type MatrixGrid } from "./matrixService";

/**
 * Thanh chọn PHIÊN BẢN của một lưới định mức.
 *
 * Định mức không phải hằng số: nhân viên thống kê khai lại theo kỳ, và bảng
 * tính gốc thể hiện điều đó ngay ở tên sheet ({@code DMNL T2-2025}). Nếu chỉ
 * giữ một bộ giá trị thì khai kỳ mới sẽ đè mất số kỳ cũ, và chạy lại báo cáo
 * tháng trước sẽ ra con số khác.
 */
export function MatrixVersionBar({
  grid,
  onChangeVersion,
  onCreated,
  onDeleted,
}: {
  grid: MatrixGrid;
  onChangeVersion: (versionId: number) => void;
  onCreated: (versionId: number) => void;
  onDeleted: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [label, setLabel] = useState("");
  const [copyCells, setCopyCells] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: versions = [], refetch } = useQuery({
    queryKey: ["matrix-versions", grid.code],
    queryFn: () => matrixService.versions(grid.code),
  });

  const nameOf = (v: MatrixGrid) =>
    `${v.versionLabel || "Phiên bản"} · ${v.effectiveFrom ?? "từ đầu"} → ${v.effectiveTo ?? "nay"}`;

  const submit = async () => {
    if (!from) {
      toast.error("Phải chọn ngày bắt đầu hiệu lực.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await matrixService.createVersion(grid.code, {
        sourceId: grid.versionId,
        effectiveFrom: from,
        effectiveTo: to || null,
        versionLabel: label || undefined,
        copyCells,
      });
      toast.success(
        copyCells
          ? "Đã tạo phiên bản mới và sao chép toàn bộ giá trị."
          : "Đã tạo phiên bản mới (trống, chỉ giữ dòng và cột).",
      );
      setCreating(false);
      setFrom(""); setTo(""); setLabel("");
      refetch();
      onCreated(created.versionId);
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Tạo phiên bản thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (versions.length <= 1) {
      toast.error("Lưới phải luôn còn ít nhất một phiên bản.");
      return;
    }
    if (!window.confirm(
      `Xoá phiên bản "${nameOf(grid)}" và toàn bộ giá trị của nó?\n\n` +
      "Phiên bản liền trước sẽ được mở lại để không thủng khoảng thời gian.",
    )) return;
    setSubmitting(true);
    try {
      await matrixService.deleteVersion(grid.code, grid.versionId);
      toast.success("Đã xoá phiên bản.");
      await refetch();
      onDeleted();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      toast.error(res?.data?.message ?? "Xoá phiên bản thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <CalendarClock className="h-4 w-4" /> Phiên bản
        </span>

        <select
          value={grid.versionId}
          onChange={(e) => onChangeVersion(Number(e.target.value))}
          className="h-8 min-w-[280px] rounded-md border bg-transparent px-2 text-xs"
        >
          {versions.map((v) => (
            <option key={v.versionId} value={v.versionId}>
              {nameOf(v)}
            </option>
          ))}
        </select>

        <span className="text-muted-foreground">
          Đang sửa phiên bản này — sửa ở đây không ảnh hưởng phiên bản khác.
        </span>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8 gap-1.5 text-xs"
          onClick={() => setCreating((v) => !v)}
        >
          <CopyPlus className="h-3.5 w-3.5" />
          {creating ? "Đóng" : "Tạo phiên bản mới"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
          disabled={submitting || versions.length <= 1}
          title={versions.length <= 1
            ? "Lưới phải luôn còn ít nhất một phiên bản"
            : "Xoá phiên bản đang xem"}
          onClick={remove}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Xoá
        </Button>
      </div>

      {creating && (
        <div className="mt-2 flex flex-wrap items-end gap-2 border-t pt-2">
          <Field label="Từ ngày *">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-[150px] text-xs" />
          </Field>
          <Field label="Đến ngày">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="h-8 w-[150px] text-xs" />
          </Field>
          <Field label="Nhãn">
            <Input value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="vd T2-2025" className="h-8 w-[130px] text-xs" />
          </Field>
          <label className="flex h-8 items-center gap-1.5 text-xs">
            <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600"
              checked={copyCells} onChange={(e) => setCopyCells(e.target.checked)} />
            Sao chép giá trị từ phiên bản đang xem
          </label>
          <Button size="sm" className="h-8 bg-blue-600 text-xs text-white hover:bg-blue-700"
            disabled={submitting} onClick={submit}>
            {submitting ? "Đang tạo…" : "Tạo"}
          </Button>
          <p className="w-full text-[11px] text-muted-foreground">
            Phiên bản đang xem sẽ được đóng lại ở ngày liền trước, nếu nó đang
            để mở — để hai phiên bản không cùng có hiệu lực.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
