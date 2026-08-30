import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
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
import { createCatalogService } from "./catalogService";
import type { CatalogConfig, CatalogField } from "./types";

type Row = Record<string, string>;

interface Props {
  config: CatalogConfig;
  open: boolean;
  /** Bản ghi đang sửa; null = đang thêm mới. */
  editing: Record<string, unknown> | null;
  onClose: () => void;
  onSaved: () => void;
}

const emptyRow = (fields: CatalogField[]): Row =>
  Object.fromEntries(fields.map((f) => [f.key, ""]));

/**
 * Modal thêm/sửa danh mục.
 *
 * Chế độ THÊM cho nhập NHIỀU dòng rồi lưu một lần (đúng mô tả trong thiết
 * kế: "Có thể thêm nhiều ... và lưu một lần") — gọi endpoint `/bulk`.
 * Chế độ SỬA chỉ một dòng.
 */
export function CatalogFormModal({
  config,
  open,
  editing,
  onClose,
  onSaved,
}: Props) {
  const service = useMemo(
    () => createCatalogService(config.basePath),
    [config.basePath],
  );
  const isEdit = editing !== null;

  const [rows, setRows] = useState<Row[]>([emptyRow(config.fields)]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Lựa chọn cho các trường select: key trường -> danh sách {value,label}. */
  const [options, setOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});

  // Nạp lại dữ liệu mỗi lần mở
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setRows([
        Object.fromEntries(
          config.fields.map((f) => [f.key, String(editing[f.key] ?? "")]),
        ) as Row,
      ]);
    } else {
      setRows([emptyRow(config.fields)]);
    }
  }, [open, editing, config.fields]);

  // Nạp nguồn cho các combobox
  useEffect(() => {
    if (!open) return;
    config.fields
      .filter((f) => f.type === "select")
      .forEach(async (f) => {
        try {
          if (f.optionsPath) {
            // Tham chiếu danh mục khác -> dùng id làm giá trị
            const res = await api.get(f.optionsPath, {
              params: { size: 200 },
            });
            const list =
              res.data?.data?.content ?? res.data?.data ?? res.data?.result ?? [];
            setOptions((p) => ({
              ...p,
              [f.key]: (list as { id: number; name: string }[]).map((it) => ({
                value: String(it.id),
                label: it.name,
              })),
            }));
          } else if (f.optionsFrom) {
            const list = await service.options(f.optionsFrom);
            setOptions((p) => ({
              ...p,
              [f.key]: list.map((v) => ({ value: v, label: v })),
            }));
          }
        } catch {
          // Không chặn việc nhập nếu nguồn combobox lỗi — để trống danh sách.
          setOptions((p) => ({ ...p, [f.key]: [] }));
        }
      });
  }, [open, config.fields, service]);

  if (!open) return null;

  const setCell = (idx: number, key: string, value: string) =>
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    );

  const addRow = () => setRows((prev) => [...prev, emptyRow(config.fields)]);

  const removeRow = (idx: number) =>
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx),
    );

  /** Chuyển 1 dòng biểu mẫu thành payload gửi backend. */
  const toPayload = (row: Row) => {
    const out: Record<string, unknown> = {};
    config.fields.forEach((f) => {
      const raw = (row[f.key] ?? "").trim();
      // Trường select tham chiếu danh mục khác gửi lên dạng SỐ (id)
      out[f.key] = f.optionsPath ? (raw === "" ? null : Number(raw)) : raw;
    });
    return out;
  };

  const validate = (): string | null => {
    for (let i = 0; i < rows.length; i++) {
      for (const f of config.fields) {
        if (f.required && !(rows[i][f.key] ?? "").trim()) {
          return `Dòng ${i + 1}: "${f.label}" là bắt buộc.`;
        }
      }
    }
    // Chặn trùng mã ngay trong danh sách — backend cũng chặn, nhưng báo sớm
    // ở client thì người dùng sửa được ngay thay vì mất cả lần lưu.
    const codeField = config.fields[0]?.key;
    if (codeField && !isEdit) {
      const codes = rows.map((r) => (r[codeField] ?? "").trim());
      const dup = codes.find((c, i) => c && codes.indexOf(c) !== i);
      if (dup) return `Mã "${dup}" bị trùng giữa các dòng.`;
    }
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
      if (isEdit) {
        await service.update(Number(editing!.id), toPayload(rows[0]));
        toast.success(`Đã cập nhật ${config.nounPhrase}.`);
      } else {
        await service.bulkCreate(rows.map(toPayload));
        toast.success(`Đã thêm ${rows.length} ${config.nounPhrase}.`);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message ?? "Lưu thất bại. Kiểm tra lại dữ liệu.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderCell = (row: Row, idx: number, f: CatalogField) => {
    if (f.type === "select") {
      const opts = options[f.key] ?? [];
      return (
        <Select
          value={row[f.key] || undefined}
          onValueChange={(v) => setCell(idx, f.key, v)}
        >
          <SelectTrigger className="h-9 text-sm w-full">
            <SelectValue placeholder={f.placeholder ?? `Chọn ${f.label}`} />
          </SelectTrigger>
          <SelectContent className="z-[120]">
            {opts.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    return (
      <Input
        value={row[f.key] ?? ""}
        onChange={(e) => setCell(idx, f.key, e.target.value)}
        placeholder={f.placeholder}
        className="h-9 text-sm"
      />
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-xl flex flex-col">
        {/* Tiêu đề */}
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {isEdit ? "Chỉnh sửa" : "Thêm mới"} {config.nounPhrase}
            </h2>
            {!isEdit && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Có thể thêm nhiều {config.nounPhrase} và lưu một lần
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Thân */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!isEdit && (
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Tổng số{" "}
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                {config.nounPhrase}: {rows.length}
              </span>
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-900 text-left text-sm font-bold text-gray-800 dark:text-gray-100">
                  <th className="w-12 border-b border-r border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center">
                    #
                  </th>
                  {config.fields.map((f) => (
                    <th
                      key={f.key}
                      className={`border-b border-r border-gray-200 dark:border-gray-700 px-3 py-2.5 ${f.width ?? ""}`}
                    >
                      {f.label}
                      {f.required && <span className="text-red-500"> *</span>}
                    </th>
                  ))}
                  {!isEdit && (
                    <th className="w-12 border-b border-gray-200 dark:border-gray-700" />
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={
                      idx % 2 === 0
                        ? "bg-white dark:bg-gray-950"
                        : "bg-gray-50/50 dark:bg-gray-900/40"
                    }
                  >
                    <td className="border-b border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center font-semibold text-gray-500">
                      {idx + 1}
                    </td>
                    {config.fields.map((f) => (
                      <td
                        key={f.key}
                        className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-1.5"
                      >
                        {renderCell(row, idx, f)}
                      </td>
                    ))}
                    {!isEdit && (
                      <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-center">
                        <button
                          onClick={() => removeRow(idx)}
                          title="Xoá dòng"
                          className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={addRow}
              className="mt-3 gap-1.5 text-sm text-blue-700 hover:bg-blue-50 dark:text-blue-400"
            >
              <Plus className="h-4 w-4" />
              Thêm dòng mới
            </Button>
          )}

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        {/* Chân */}
        <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-800 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Huỷ
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 font-semibold text-white hover:bg-blue-700"
          >
            {submitting ? "Đang lưu..." : "Xác nhận"}
          </Button>
        </div>
      </div>
    </div>
  );
}
