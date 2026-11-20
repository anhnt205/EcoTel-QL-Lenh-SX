import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/config/api.config";
import { createCatalogService } from "../catalogService";
import type { CatalogConfig, CatalogField } from "../types";
import DIcon from "./DIcon";
import { DatePickerString } from "@/components/common/DatePickerString";
import { MonthRangePicker } from "./MonthInput";
import { MultiPickCell } from "./MultiPickCell";
import { ColResizer, TableLayoutButton, useTableLayout } from "./tableLayout";
import { moveItem, useRowDnD } from "./useRowDnD";
import { CatalogQuickImportDialog } from "../CatalogQuickImportDialog";

type Row = Record<string, string>;
type Opt = { value: string; label: string };

const emptyRow = (fields: CatalogField[]): Row => Object.fromEntries(fields.map((f) => [f.key, ""]));

/**
 * Cột `monthRange` ("Thời gian"): giá trị chuỗi "MM/yyyy - MM/yyyy" ↔ hai ô chọn tháng (giá trị "yyyy-MM").
 * Cho phép dạng dở dang ("09/2026 - ") trong lúc người dùng đang chọn.
 */
const MONTH_RANGE_RE = /^\s*(?:(\d{1,2})\s*\/\s*(\d{4}))?\s*[-–—]\s*(?:(\d{1,2})\s*\/\s*(\d{4}))?\s*$/;

function splitMonthRange(value: string): [string, string] {
  const m = MONTH_RANGE_RE.exec(value ?? "");
  if (!m) return ["", ""];
  const iso = (mo?: string, yr?: string) => (mo && yr ? `${yr}-${mo.padStart(2, "0")}` : "");
  return [iso(m[1], m[2]), iso(m[3], m[4])];
}

function joinMonthRange(from: string, to: string): string {
  if (!from && !to) return "";
  const fmt = (iso: string) => (iso ? `${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
  return `${fmt(from)} - ${fmt(to)}`;
}

/** Đã chọn đủ cả hai tháng chưa. */
const isMonthRangeComplete = (value: string): boolean => {
  const [a, b] = splitMonthRange(value);
  return !!a && !!b;
};

/** Khung cửa sổ theo thiết kế (nền mờ, bo 14px, tiêu đề + mô tả, chân Hủy / Xác nhận). */
function Shell({
  title,
  description,
  small,
  wide,
  confirmLabel = "Xác nhận",
  danger,
  busy,
  onClose,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  small?: boolean;
  /** nhiều cột: cho cửa sổ rộng hơn để tên cột hiển thị trọn vẹn */
  wide?: boolean;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  // Phóng to / thu nhỏ cửa sổ để nhập liệu thuận tiện (không áp cho hộp xác nhận nhỏ)
  const [maxed, setMaxed] = useState(false);
  return (
    <div
      className="tkc-modal-overlay"
      style={maxed ? { padding: 0 } : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${small ? "small" : ""}`}
        style={
          maxed
            ? { width: "100%", height: "100%", maxHeight: "100%", borderRadius: 0 }
            : wide
              ? { width: "min(1560px, 100%)" }
              : undefined
        }
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {!small && (
            <button
              className="close-modal"
              style={{ marginLeft: "auto", marginRight: 6 }}
              aria-label={maxed ? "Thu nhỏ cửa sổ" : "Phóng to cửa sổ"}
              title={maxed ? "Thu nhỏ cửa sổ" : "Phóng to cửa sổ"}
              onClick={() => setMaxed((v) => !v)}
            >
              <DIcon name={maxed ? "minimize" : "maximize"} />
            </button>
          )}
          <button className="close-modal" aria-label="Đóng" onClick={onClose}>
            <DIcon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Hủy
          </button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hộp xác nhận xóa (theo thiết kế). */
export function DesignConfirmDelete({
  count,
  label,
  onClose,
  onConfirm,
  busy,
}: {
  count: number;
  /** nhãn 1 bản ghi khi xóa đúng 1 (vd mã) */
  label?: string;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Shell
      title="Xác nhận xóa"
      description="Hành động này sẽ xóa bản ghi khỏi danh mục và không thể hoàn tác."
      small
      danger
      confirmLabel="Xóa"
      busy={busy}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <p style={{ lineHeight: 1.7, margin: 0 }}>
        Bạn có chắc muốn xóa <strong className="danger-text">{count} bản ghi</strong>
        {count === 1 && label ? ` (${label})` : ""}?
      </p>
    </Shell>
  );
}

/**
 * Cửa sổ Thêm mới / Chỉnh sửa / Sao chép theo thiết kế — CÙNG MỘT biểu mẫu dạng bảng nhiều dòng (nút "Thêm dòng"):
 *  - Thêm mới: 1 dòng trống, thêm bao nhiêu dòng tuỳ ý rồi lưu một lần qua `/bulk`.
 *  - Chỉnh sửa: nạp sẵn các bản ghi đã chọn (dòng có `__id` → cập nhật), có thể thêm dòng mới (→ tạo mới) trong cùng lần lưu.
 *  - Sao chép: nạp nội dung các bản ghi nguồn, TRỐNG các trường mã để nhập mã mới (→ tạo mới).
 */
export function CatalogDesignModal({
  config,
  records,
  copyFrom,
  onClose,
  onSaved,
}: {
  config: CatalogConfig;
  /** các bản ghi đang sửa; không có = thêm mới */
  records?: Record<string, unknown>[] | null;
  copyFrom?: Record<string, unknown>[] | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const service = useMemo(() => createCatalogService(config.basePath), [config.basePath]);
  const fields = useMemo(() => config.fields.filter((f) => !f.readOnly && !f.formHidden), [config.fields]);
  const isEdit = !!records?.length;
  /** cột định danh chỉ đọc (mã/tên thiết bị...) để người dùng biết đang sửa bản ghi nào khi các cột đó không cho sửa */
  const identFields = useMemo(
    () => {
      const hidden = config.fields.filter((f) => f.formHidden);
      return hidden.length ? [...hidden, ...config.fields.filter((f) => f.readOnly).slice(0, 1)] : [];
    },
    [config.fields],
  );
  const codeField = config.uniqueCodeKey === null ? undefined : config.uniqueCodeKey ?? fields[0]?.key;

  const fromRecord = (src: Record<string, unknown>): Row => ({
    ...(Object.fromEntries(fields.map((f) => [f.key, String(src[f.key] ?? "")])) as Row),
    __id: String(src.id ?? ""),
    __ident: identFields.map((f) => String(src[f.key] ?? "")).filter(Boolean).join(" — "),
  });
  /** Trường "mã" của bản ghi (để trống khi Sao chép, người dùng điền mã mới). */
  const isCodeField = (f: CatalogField) => f.key === codeField || /code$/i.test(f.key) || /^mã(\s|$)/i.test(f.label);
  const fromCopy = (src: Record<string, unknown>): Row => {
    const row = fromRecord(src);
    row.__id = "";
    fields.forEach((f) => {
      if (isCodeField(f)) row[f.key] = "";
    });
    return row;
  };
  const [rows, setRows] = useState<Row[]>(() =>
    records?.length ? records.map(fromRecord) : copyFrom?.length ? copyFrom.map(fromCopy) : [emptyRow(fields)],
  );
  // Kéo thả đổi vị trí dòng (setRows ổn định)
  const dnd = useRowDnD((f, t) => setRows((prev) => moveItem(prev, f, t)));
  const [options, setOptions] = useState<Record<string, Opt[]>>(() =>
    Object.fromEntries(config.fields.filter((f) => f.options).map((f) => [f.key, f.options as Opt[]])),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  // nguồn cho các ô chọn (danh mục khác theo id, hoặc danh sách chuỗi)
  useEffect(() => {
    fields
      .filter((f) => f.type === "select")
      .forEach(async (f) => {
        try {
          if (f.optionsPath) {
            const res = await api.get(f.optionsPath, { params: { size: 200, ...(f.optionsParams ?? {}) } });
            const list = (res.data?.data?.content ?? res.data?.data ?? res.data?.result ?? []) as { id: number; name: string }[];
            setOptions((p) => ({ ...p, [f.key]: list.map((it) => ({ value: String(it.id), label: it.name })) }));
          } else if (f.optionsFrom) {
            const list = await service.options(f.optionsFrom);
            setOptions((p) => ({ ...p, [f.key]: list.map((v) => ({ value: v, label: v })) }));
          }
        } catch {
          setOptions((p) => ({ ...p, [f.key]: [] }));
        }
      });
  }, [fields, service]);

  // nguồn cho các ô chọn NHIỀU giá trị (Chủng loại xe / Chủng loại hàng / Số xe)
  const [multiOptions, setMultiOptions] = useState<Record<string, string[]>>({});
  useEffect(() => {
    const listOf = (res: { data?: { data?: { content?: unknown[] } | unknown[] } }): Record<string, unknown>[] => {
      const d = res.data?.data;
      return ((Array.isArray(d) ? d : d?.content) ?? []) as Record<string, unknown>[];
    };
    const uniqueSorted = (xs: string[]) => Array.from(new Set(xs.map((s) => s.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    const sources = new Set(fields.map((f) => f.multiSource).filter(Boolean));
    sources.forEach(async (src) => {
      try {
        let values: string[] = [];
        if (src === "vehicleTypes") {
          // Chủng loại xe khớp với mã Chủng loại xe HOẶC Chủng loại xe (NL) của xe → cho chọn cả hai danh mục
          const [a, b] = await Promise.all([
            api.get("/vehicle-types", { params: { size: 500 } }),
            api.get("/vehicle-fuel-classes", { params: { size: 500 } }),
          ]);
          values = [...listOf(a), ...listOf(b)].map((x) => String(x.code ?? ""));
        } else if (src === "cargoTypes") {
          values = listOf(await api.get("/cargo-types", { params: { size: 1000 } })).map((x) => String(x.name ?? ""));
        } else if (src === "vehicles") {
          values = listOf(await api.get("/devices", { params: { categoryGroup: "XE", size: 1000 } })).map((x) => String(x.code ?? ""));
        }
        setMultiOptions((p) => ({ ...p, [src as string]: uniqueSorted(values) }));
      } catch {
        setMultiOptions((p) => ({ ...p, [src as string]: [] }));
      }
    });
  }, [fields]);

  /** Thêm các dòng từ Nhập liệu thông minh (ảnh/Excel) — cả khi Thêm mới lẫn Chỉnh sửa (dòng thêm là bản ghi mới); nếu bảng chỉ có một dòng trống chưa nhập gì thì thay luôn dòng đó. */
  const addQuickRows = (added: Row[]) =>
    setRows((prev) => {
      const untouched = !isEdit && prev.length === 1 && fields.every((f) => !(prev[0][f.key] ?? "").trim());
      const made = added.map((r) => ({ ...emptyRow(fields), ...r }));
      return untouched ? made : [...prev, ...made];
    });

  const setCell = (i: number, key: string, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const toPayload = (row: Row) => {
    const out: Record<string, unknown> = {};
    fields.forEach((f) => {
      const raw = (row[f.key] ?? "").trim();
      if (f.optionsPath) out[f.key] = raw === "" ? null : Number(raw);
      else if (f.type === "number") out[f.key] = raw === "" ? null : Number(raw.replace(",", "."));
      else if (f.type === "checkbox") out[f.key] = row[f.key] === (f.checkedValue ?? "true") ? (f.checkedValue ?? "true") : null;
      // ô chọn giá trị cố định (enum phía backend, vd Trạng thái) để trống → null; chuỗi rỗng "" làm backend không đọc được JSON
      else if (f.type === "select" && f.options && raw === "") out[f.key] = null;
      else out[f.key] = raw;
    });
    return { ...out, ...(config.fixedValues ?? {}) };
  };

  const validate = (): string | null => {
    for (let i = 0; i < rows.length; i++) {
      for (const f of fields) {
        if (f.required && !(rows[i][f.key] ?? "").trim()) return `Dòng ${i + 1}: "${f.label}" là bắt buộc.`;
        if (f.type === "monthRange" && (rows[i][f.key] ?? "").trim() && !isMonthRangeComplete(rows[i][f.key])) {
          return `Dòng ${i + 1}: "${f.label}" cần chọn đủ tháng/năm bắt đầu và tháng/năm kết thúc.`;
        }
      }
    }
    if (codeField) {
      const codes = rows.map((r) => (r[codeField] ?? "").trim());
      const dup = codes.find((c, i) => c && codes.indexOf(c) !== i);
      if (dup) return `Mã "${dup}" bị trùng giữa các dòng.`;
      // Sao chép = tạo bản MỚI: mã phải khác mã của bản gốc
      if (copyFrom?.length) {
        const original = new Set(copyFrom.map((c) => String(c[codeField] ?? "").trim()).filter(Boolean));
        const same = codes.find((c) => c && original.has(c));
        if (same) return `Mã "${same}" trùng với bản gốc — nhập mã mới để tạo bản sao.`;
      }
    }
    return null;
  };

  const submit = async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const updates = rows.filter((r) => r.__id);
      const creates = rows.filter((r) => !r.__id);
      for (const r of updates) await service.update(Number(r.__id), toPayload(r));
      if (creates.length) await service.bulkCreate(creates.map(toPayload));
      const parts: string[] = [];
      if (updates.length) parts.push(`cập nhật ${updates.length}`);
      if (creates.length) parts.push(`${copyFrom?.length ? "sao chép" : "thêm"} ${creates.length}`);
      toast.success(`Đã ${parts.join(", ")} ${config.nounPhrase}.`);
      onSaved();
      onClose();
    } catch (e: unknown) {
      const res = (e as { response?: { data?: { message?: string } } }).response;
      setError(res?.data?.message ?? "Lưu thất bại. Kiểm tra lại dữ liệu.");
      // có thể đã lưu một phần (cập nhật xong, tạo mới lỗi) → làm mới danh sách phía sau
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const control = (row: Row, i: number, f: CatalogField) => {
    const id = `m-${f.key}-${i}`;
    if (f.type === "checkbox") {
      const on = f.checkedValue ?? "true";
      return (
        <input
          id={id}
          className="checkbox"
          type="checkbox"
          checked={(row[f.key] ?? "").trim() !== ""}
          onChange={(e) => setCell(i, f.key, e.target.checked ? on : "")}
        />
      );
    }
    if (f.type === "select") {
      return (
        <select id={id} className="field" value={row[f.key] ?? ""} onChange={(e) => setCell(i, f.key, e.target.value)}>
          <option value="">{f.placeholder ?? `Chọn ${f.label}`}</option>
          {(options[f.key] ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    if (f.type === "monthRange") {
      const [from, to] = splitMonthRange(row[f.key] ?? "");
      // Dùng lại đúng ô chọn khoảng tháng của Mô hình / Tỷ trọng (một ô, bấm hai lần: tháng bắt đầu rồi tháng kết thúc).
      return (
        <div id={id}>
          <MonthRangePicker
            from={from ? `${from}-01` : ""}
            to={to ? `${to}-01` : ""}
            onChange={(a, b) => setCell(i, f.key, joinMonthRange(a.slice(0, 7), b.slice(0, 7)))}
          />
        </div>
      );
    }
    if (f.type === "text" && f.multiSource) {
      return (
        <MultiPickCell
          value={row[f.key] ?? ""}
          onChange={(v) => setCell(i, f.key, v)}
          options={multiOptions[f.multiSource] ?? []}
          placeholder={f.placeholder}
        />
      );
    }
    if (f.type === "date") {
      return (
        <DatePickerString
          allowClear
          value={String(row[f.key] ?? "")}
          onChange={(v) => setCell(i, f.key, v)}
          className="w-full"
          popoverClassName="z-[200]"
        />
      );
    }
    return (
      <input
        id={id}
        className="field"
        type={f.type === "number" ? "number" : "text"}
        step={f.type === "number" ? "any" : undefined}
        value={row[f.key] ?? ""}
        placeholder={f.placeholder}
        onChange={(e) => setCell(i, f.key, e.target.value)}
      />
    );
  };

  // Hiển thị bảng nhập: kéo cột, kiểu cột, chiều cao hàng (lưu theo từng danh mục) — độ rộng tối thiểu theo ô nhập
  const fieldCols = useMemo(() => fields.map((f) => ({ key: f.key, label: f.label + (f.required ? " *" : "") })), [fields]);
  const layout = useTableLayout(
    `popup:${config.basePath}:${config.title}`,
    fieldCols,
    [] as Row[],
    () => "",
    (k) => {
      const w = fields.find((f) => f.key === k)?.width?.match(/\[(\d+)px\]/)?.[1];
      return w ? Number(w) + 20 : 160;
    },
  );
  const title = isEdit ? `Chỉnh sửa ${config.nounPhrase}` : copyFrom?.length ? `Sao chép ${config.nounPhrase}` : `Thêm mới ${config.nounPhrase}`;
  const description = isEdit
    ? "Cập nhật các bản ghi đã chọn (không thêm/bớt dòng). Các trường có dấu * là bắt buộc."
    : copyFrom?.length
      ? "Nội dung được sao chép từ bản ghi đã chọn — chỉnh lại và nhập mã mới (không trùng bản gốc) để tạo bản mới. Các trường có dấu * là bắt buộc."
      : "Có thể thêm nhiều bản ghi cùng lúc. Các trường có dấu * là bắt buộc.";

  return (
    <>
    <Shell title={title} description={description} busy={busy} wide={fields.length > 6} onClose={onClose} onConfirm={submit}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {/* Chỉnh sửa = sửa dữ liệu ĐÃ CÓ, không thêm/bớt dòng */}
        {!isEdit && config.canCreate !== false && (
          <button className="btn add-row-btn" style={{ margin: 0 }} onClick={() => setRows((p) => [...p, emptyRow(fields)])}>
            <DIcon name="plus" /> Thêm dòng
          </button>
        )}
        {!isEdit && !copyFrom?.length && config.canCreate !== false && (
          <button className="btn" style={{ margin: 0 }} onClick={() => setQuickOpen(true)} title="Dán ảnh chụp bảng hoặc chọn file Excel để nhập nhanh nhiều dòng">
            Nhập liệu thông minh (Ảnh/Excel)
          </button>
        )}
        <TableLayoutButton layout={layout} columns={fieldCols} />
      </div>
      <div className="modal-table-scroll entry-clean-wrap" style={{ overflow: "auto", maxHeight: "calc(100vh - 330px)" }}>
        <table
          className={`entry-table entry-clean ${layout.tableClass}`}
          style={{ tableLayout: "fixed", width: 76 + (identFields.length > 0 ? 230 : 0) + layout.totalWidth + 43, minWidth: 0 }}
        >
          <colgroup>
            <col style={{ width: 76 }} />
            {identFields.length > 0 && <col style={{ width: 230 }} />}
            {fields.map((f) => (
              <col key={f.key} style={{ width: layout.widthOf(f.key) }} />
            ))}
            <col style={{ width: 43 }} />
          </colgroup>
          <thead>
            <tr>
              <th>STT</th>
              {identFields.length > 0 && <th>{identFields.map((f) => f.label).join(" / ")}</th>}
              {fields.map((f) => (
                <th key={f.key} style={{ position: "relative" }}>
                  {f.label}
                  {f.required ? " *" : ""}
                  <ColResizer colKey={f.key} layout={layout} />
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} {...dnd.rowProps(i)}>
                <td style={{ textAlign: "center", paddingTop: 9 }}>
                  <div className="entry-stt" style={{ justifyContent: "center" }}>
                    <span className="dnd-handle" {...dnd.handleProps(i)} title="Kéo để đổi vị trí" aria-label="Kéo để đổi vị trí">
                      <DIcon name="grip" />
                    </span>
                    <span className="entry-stt-no">{i + 1}</span>
                  </div>
                </td>
                {identFields.length > 0 && (
                  <td style={{ paddingTop: 15, whiteSpace: "nowrap", fontWeight: 700, color: "#1a4f9d" }}>{row.__ident || "—"}</td>
                )}
                {fields.map((f) => (
                  <td key={f.key}>{control(row, i, f)}</td>
                ))}
                <td style={{ textAlign: "center" }}>
                  {!isEdit && (
                    <button
                      className="remove-line"
                      title="Bỏ dòng"
                      disabled={rows.length === 1}
                      onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                    >
                      <DIcon name="trash" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <div className="form-error">{error}</div>}
    </Shell>
    {quickOpen && (
      <CatalogQuickImportDialog
        fields={fields}
        options={options}
        nounPhrase={config.nounPhrase}
        codeField={codeField}
        onAdd={addQuickRows}
        onClose={() => setQuickOpen(false)}
      />
    )}
    </>
  );
}
