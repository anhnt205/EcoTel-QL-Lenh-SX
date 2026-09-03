import { useEffect, useMemo, useState } from "react";
import { Copy, Maximize, Minimize, Plus, Trash2, X } from "lucide-react";
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

  // Cột chỉ đọc (giá trị kéo theo danh mục khác) không xuất hiện trong biểu
  // mẫu — cho sửa ở đây là nhập trùng dữ liệu của danh mục gốc.
  const fields = useMemo(
    () => config.fields.filter((f) => !f.readOnly && !f.formHidden),
    [config.fields],
  );

  /**
   * Trường mã DUY NHẤT của danh mục — `undefined` nếu danh mục không có.
   *
   * Có danh mục cố tình KHÔNG có mã duy nhất (Kỳ báo cáo, Tỷ trọng): ở đó
   * nhiều dòng trùng cột đầu là hợp lệ, ví dụ cùng một chủng loại hàng ở hai
   * khoảng thời gian khác nhau. Dùng chung cho việc chặn trùng lúc lưu và
   * việc chép dòng, để hai chỗ không bao giờ hiểu khác nhau.
   */
  const codeField = useMemo(
    () =>
      config.uniqueCodeKey === null
        ? undefined
        : (config.uniqueCodeKey ?? fields[0]?.key),
    [config.uniqueCodeKey, fields],
  );

  const [rows, setRows] = useState<Row[]>([emptyRow(fields)]);
  // Không reset theo `open`: giữ nguyên lựa chọn toàn màn hình giữa các lần
  // mở modal trong cùng phiên xem — danh mục nhiều cột thì không phải bấm
  // lại mỗi lần "Thêm mới".
  const [isFullscreen, setIsFullscreen] = useState(false);
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
          fields.map((f) => [f.key, String(editing[f.key] ?? "")]),
        ) as Row,
      ]);
    } else {
      setRows([emptyRow(fields)]);
    }
  }, [open, editing, fields]);

  // Nạp nguồn cho các combobox
  useEffect(() => {
    if (!open) return;
    fields
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
  }, [open, fields, service]);

  if (!open) return null;

  const setCell = (idx: number, key: string, value: string) =>
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    );

  const addRow = () => setRows((prev) => [...prev, emptyRow(fields)]);

  /**
   * Chép một dòng thành dòng mới đặt NGAY DƯỚI nó — chép NGUYÊN VẸN mọi ô,
   * kể cả mã. Chỉ chỗ nào khác dòng gốc mới cần sửa tay, kể cả mã.
   *
   * Đặt ngay dưới chứ không đẩy xuống cuối: người dùng chép để sửa vài ô
   * khác nhau, để cạnh nhau mới so được. Ở danh sách dài, thêm vào cuối là
   * mất dấu dòng vừa chép.
   */
  const copyRow = (idx: number) =>
    setRows((prev) => {
      const clone: Row = { ...prev[idx] };
      return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)];
    });

  const removeRow = (idx: number) =>
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx),
    );

  /** Chuyển 1 dòng biểu mẫu thành payload gửi backend. */
  const toPayload = (row: Row) => {
    const out: Record<string, unknown> = {};
    fields.forEach((f) => {
      const raw = (row[f.key] ?? "").trim();
      if (f.optionsPath) {
        // Trường select tham chiếu danh mục khác gửi lên dạng SỐ (id)
        out[f.key] = raw === "" ? null : Number(raw);
      } else if (f.type === "number") {
        // Gửi số thật: backend nhận BigDecimal/Integer, chuỗi "1,5" sẽ hỏng.
        out[f.key] = raw === "" ? null : Number(raw.replace(",", "."));
      } else {
        out[f.key] = raw;
      }
    });
    // Giá trị cố định của màn ghi ĐÈ: người dùng không chọn được chúng, nên
    // không có lý do gì để giá trị trong biểu mẫu thắng.
    return { ...out, ...(config.fixedValues ?? {}) };
  };

  const validate = (): string | null => {
    for (let i = 0; i < rows.length; i++) {
      for (const f of fields) {
        if (f.required && !(rows[i][f.key] ?? "").trim()) {
          return `Dòng ${i + 1}: "${f.label}" là bắt buộc.`;
        }
      }
    }
    // Chặn trùng mã ngay trong danh sách — backend cũng chặn, nhưng báo sớm
    // ở client thì người dùng sửa được ngay thay vì mất cả lần lưu.
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
        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
        // Cho phép số thập phân (tỷ trọng, hệ số); mặc định của input số là
        // bước nhảy 1 nên không gõ được 2,25.
        step={f.type === "number" ? "any" : undefined}
        value={row[f.key] ?? ""}
        onChange={(e) => setCell(idx, f.key, e.target.value)}
        placeholder={f.placeholder}
        className="h-9 text-sm"
      />
    );
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 ${isFullscreen ? "" : "p-4"}`}
    >
      <div
        className={
          isFullscreen
            ? "flex h-screen w-screen flex-col overflow-hidden bg-white dark:bg-gray-900"
            : "flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900"
        }
      >
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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
                  <th
                    className={`border-b border-r border-gray-200 dark:border-gray-700 px-3 py-2.5 text-center ${isEdit ? "w-12" : "w-20"}`}
                  >
                    #
                  </th>
                  {fields.map((f) => (
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
                    <td className="border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="font-semibold text-gray-500">{idx + 1}</span>
                        {!isEdit && (
                          <button
                            onClick={() => copyRow(idx)}
                            title="Chép thành dòng mới"
                            className="rounded p-0.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    {fields.map((f) => (
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
