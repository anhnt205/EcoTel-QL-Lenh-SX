import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import DIcon from "./design/DIcon";
import { recognizeImage } from "./design/ocr";
import type { CatalogField } from "./types";
import "@/styles/catalog-design.css";

type Opt = { value: string; label: string; alt?: string[] };

const NUM = /^-?\d+([.,]\d+)?$/;
/** So khớp không phân biệt hoa/thường, dấu tiếng Việt và dấu cách thừa. */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Tách một dòng chữ thành các ô: ưu tiên TAB (copy từ Excel), không có thì cách nhau từ 2 dấu cách trở lên (ảnh chụp). */
const splitCells = (line: string): string[] => {
  const cells = (line.includes("\t") ? line.split("\t") : line.split(/\s{2,}/)).map((c) => c.trim());
  while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  return cells;
};

interface RowCheck {
  ok: boolean;
  problems: string[];
  badCells: Set<number>;
  /** Giá trị gửi vào biểu mẫu: theo khoá trường; ô select = giá trị (id) của lựa chọn đã khớp. */
  values: Record<string, string>;
}

/**
 * Cửa sổ "Nhập nhanh" dùng chung cho các danh mục thường (cửa sổ Thêm mới chung): ảnh chụp bảng (OCR) / file Excel / chữ copy từ Excel →
 * mỗi dòng thành một dòng của biểu mẫu, các ô đi theo THỨ TỰ cột của biểu mẫu. Ô chọn (tham chiếu danh mục khác) được khớp theo tên;
 * thiếu ô bắt buộc, sai số, trùng mã, tên chưa có trong danh mục → dòng đỏ kèm lý do; mọi ô sửa được ngay trong bảng xem trước.
 */
export function CatalogQuickImportDialog({
  fields,
  options,
  nounPhrase,
  codeField,
  ignoreExtra,
  onAdd,
  onClose,
}: {
  fields: CatalogField[];
  options: Record<string, Opt[]>;
  nounPhrase: string;
  /** Trường mã duy nhất (chặn trùng trong danh sách); undefined nếu danh mục không có. */
  codeField?: string;
  /** Bảng nguồn có thêm cột phía sau các trường (vd cột tự tính) thì bỏ qua, không báo "Thừa cột". */
  ignoreExtra?: boolean;
  onAdd: (rows: Record<string, string>[]) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<string[][]>([]);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Bỏ dòng tiêu đề nếu có (các ô trùng nhãn cột của biểu mẫu) rồi nối vào danh sách. */
  const appendCells = (all: string[][]) => {
    const labels = new Set(fields.map((f) => norm(f.label.replace(/\s*\*$/, ""))));
    const data = all.filter((r) => {
      if (r.every((c) => c === "")) return false;
      const hit = r.filter((c) => labels.has(norm(c))).length;
      return !(hit >= Math.max(1, Math.floor(Math.min(r.length, fields.length) / 2)));
    });
    if (data.length === 0) setError("Không thấy dòng dữ liệu nào trong nội dung vừa nạp.");
    else setError(null);
    setRows((prev) => [...prev, ...data]);
  };

  const appendText = (text: string) =>
    appendCells(
      text
        .split(/\r?\n/)
        .map((l) => l.replace(/\s+$/, ""))
        .filter((l) => l.trim() !== "")
        .map(splitCells),
    );

  const readExcel = async (file: File) => {
    setError(null);
    try {
      setBusy("Đang đọc file Excel…");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
      appendCells(
        data.map((r) => {
          const cells = r.map((c) => String(c ?? "").trim());
          while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
          return cells;
        }),
      );
    } catch {
      setError("Không đọc được file Excel này.");
    } finally {
      setBusy(null);
    }
  };

  const runOcr = async (img: Blob) => {
    setError(null);
    try {
      const text = await recognizeImage(img, { lang: "vie", onStatus: setBusy });
      appendText(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đọc ảnh thất bại.");
    } finally {
      setBusy(null);
    }
  };

  const onPasteDialog = (e: React.ClipboardEvent) => {
    const img = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (img) {
      e.preventDefault();
      void runOcr(img);
    }
  };

  const check = (cells: string[], index: number): RowCheck => {
    const values: Record<string, string> = {};
    const problems: string[] = [];
    const badCells = new Set<number>();
    fields.forEach((f, i) => {
      const raw = (cells[i] ?? "").trim();
      if (f.type === "select") {
        const opts = options[f.key] ?? [];
        if (!raw) values[f.key] = "";
        else {
          const hit = opts.find((o) => norm(o.label) === norm(raw) || o.value === raw || o.alt?.some((a) => norm(a) === norm(raw)));
          if (hit) values[f.key] = hit.value;
          else {
            values[f.key] = "";
            badCells.add(i);
            problems.push(`${f.label} "${raw}" chưa có trong danh mục`);
          }
        }
      } else if (f.type === "number") {
        if (raw && !NUM.test(raw)) {
          badCells.add(i);
          problems.push(`${f.label} "${raw}" không phải số`);
        }
        values[f.key] = raw;
      } else if (f.type === "date") {
        const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(raw);
        const iso = m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : raw;
        if (raw && !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
          badCells.add(i);
          problems.push(`${f.label} "${raw}" không phải ngày (dd/MM/yyyy)`);
        }
        values[f.key] = iso;
      } else values[f.key] = raw;
      if (f.required && !values[f.key]) {
        badCells.add(i);
        if (!problems.some((p) => p.startsWith(f.label))) problems.push(`Thiếu ${f.label}`);
      }
    });
    if (!ignoreExtra && cells.length > fields.length) problems.push(`Thừa ${cells.length - fields.length} cột so với biểu mẫu`);
    if (codeField) {
      const ci = fields.findIndex((f) => f.key === codeField);
      const code = (cells[ci] ?? "").trim();
      if (code && rows.findIndex((r) => (r[ci] ?? "").trim() === code) !== index) {
        badCells.add(ci);
        problems.push(`Mã "${code}" bị trùng với dòng trước`);
      }
    }
    return { ok: problems.length === 0, problems, badCells, values };
  };

  const checks = useMemo(() => rows.map((r, i) => check(r, i)), [rows, fields, options, codeField]); // eslint-disable-line react-hooks/exhaustive-deps
  const okCount = checks.filter((c) => c.ok).length;
  const badCount = checks.length - okCount;

  const setCell = (r: number, c: number, v: string) =>
    setRows((prev) =>
      prev.map((cells, j) => {
        if (j !== r) return cells;
        const next = [...cells];
        while (next.length <= c) next.push("");
        next[c] = v;
        return next;
      }),
    );

  const th = { border: "1px solid #8fa9cc", padding: "5px 8px", fontSize: 13, background: "#e8f0fb", textAlign: "left" as const, whiteSpace: "nowrap" as const };
  const td = { border: "1px solid #b4c8e2", padding: "3px 6px", fontSize: 13, verticalAlign: "top" as const };

  return (
    <div className="tkc-modal-overlay" style={{ zIndex: 400 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()} onPaste={onPasteDialog}>
      <div className="modal" style={{ width: "min(1300px, 98vw)", maxHeight: "94vh" }} role="dialog" aria-modal="true" aria-label="Nhập liệu thông minh (Ảnh/Excel)">
        <div className="modal-header">
          <div>
            <h2>Nhập liệu thông minh (Ảnh/Excel)</h2>
            <p style={{ marginBottom: 2 }}>Có 2 cách nhập dữ liệu:</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
              <li>
                <b>Cách 1 – Nhập từ ảnh:</b> Chụp ảnh bảng Excel rồi dán trực tiếp bằng Ctrl+V hoặc chọn ảnh từ máy tính.
              </li>
              <li>
                <b>Cách 2 – Nhập từ Excel:</b> Sao chép các ô dữ liệu trong Excel rồi dán trực tiếp bằng Ctrl+V hoặc chọn tệp Excel từ máy tính.
              </li>
            </ul>
            <p style={{ marginTop: 6 }}>
              Nhập {nounPhrase}: các ô đi theo thứ tự cột của biểu mẫu ({fields.map((f) => f.label).join(" · ")}).
            </p>
          </div>
          <button className="close-modal" style={{ marginLeft: "auto" }} aria-label="Đóng" onClick={onClose}>
            <DIcon name="x" />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 12 }}>
            <textarea
              className="field"
              style={{ flex: "1 1 420px", minHeight: 64, fontFamily: "monospace", fontSize: 13 }}
              placeholder="Dán chữ copy từ Excel vào đây (Ctrl+V) — hoặc dán ảnh chụp ở bất kỳ đâu trong cửa sổ này."
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              onPaste={(e) => {
                const t = e.clipboardData.getData("text");
                if (t && !Array.from(e.clipboardData.files).some((f) => f.type.startsWith("image/"))) {
                  e.preventDefault();
                  appendText(t);
                }
              }}
              onBlur={() => {
                if (paste.trim()) appendText(paste);
                setPaste("");
              }}
              disabled={!!busy}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn" type="button" onClick={() => fileRef.current?.click()} disabled={!!busy}>
                Tải lên (xlsx, jpg, jpeg, png)
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.jpg,.jpeg,.png"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  // ảnh → đọc chữ (OCR); còn lại → file Excel
                  if (f) void (f.type.startsWith("image/") || /\.(jpe?g|png)$/i.test(f.name) ? runOcr(f) : readExcel(f));
                  e.target.value = "";
                }}
              />
              <button className="btn" type="button" onClick={() => setRows([])} disabled={!!busy || rows.length === 0}>
                Xoá hết
              </button>
            </div>
          </div>

          {busy && <p style={{ color: "#0954c7", margin: "0 0 8px" }}>{busy}</p>}
          {error && <div className="form-error">{error}</div>}

          {rows.length > 0 && (
            <>
              <p style={{ margin: "0 0 8px", fontSize: 13 }}>
                <b style={{ color: "#1a7f37" }}>{okCount}</b> dòng hợp lệ
                {badCount > 0 && (
                  <>
                    {" · "}
                    <b style={{ color: "#d82e40" }}>{badCount}</b> dòng chưa hợp lệ — sửa trực tiếp trong bảng
                  </>
                )}
              </p>
              <div style={{ overflow: "auto", maxHeight: "52vh", border: "1px solid #8fa9cc", borderRadius: 8 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 200 + fields.length * 160, background: "#fff" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ ...th, width: 44 }}>#</th>
                      {fields.map((f) => (
                        <th key={f.key} style={th}>
                          {f.label}
                          {f.required ? " *" : ""}
                        </th>
                      ))}
                      <th style={{ ...th, width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((c, i) => (
                      <tr key={i} style={c.ok ? undefined : { background: "#fdecee" }}>
                        <td style={{ ...td, textAlign: "center", color: "#5b6f8f" }}>{i + 1}</td>
                        {fields.map((f, ci) => {
                          const bad = c.badCells.has(ci);
                          const style = { height: 30, width: "100%", minWidth: 120, ...(bad ? { borderColor: "#d82e40" } : null) };
                          return (
                            <td key={f.key} style={td}>
                              {f.type === "select" ? (
                                <select
                                  className="field"
                                  style={style}
                                  value={(options[f.key] ?? []).find((o) => o.value === c.values[f.key])?.label ?? ""}
                                  onChange={(e) => setCell(i, ci, e.target.value)}
                                >
                                  <option value="">{bad && rows[i][ci] ? `⚠ ${rows[i][ci]}` : "—"}</option>
                                  {(options[f.key] ?? []).map((o) => (
                                    <option key={o.value} value={o.label}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input className="field" style={style} value={rows[i][ci] ?? ""} onChange={(e) => setCell(i, ci, e.target.value)} />
                              )}
                            </td>
                          );
                        })}
                        <td style={{ ...td, textAlign: "center" }}>
                          <button className="icon-mini x" aria-label="Bỏ dòng này" title="Bỏ dòng này" onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}>
                            <DIcon name="x" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {badCount > 0 && (
                <ul style={{ margin: "8px 0 0 18px", padding: 0, fontSize: 12, color: "#d82e40" }}>
                  {checks.flatMap((c, i) => (c.ok ? [] : [<li key={i}>Dòng {i + 1}: {c.problems.join("; ")}</li>])).slice(0, 12)}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Đóng
          </button>
          <button
            className="btn btn-primary"
            disabled={okCount === 0 || !!busy}
            onClick={() => {
              onAdd(checks.filter((c) => c.ok).map((c) => c.values));
              // thêm xong thì đóng cửa sổ, quay về bảng Thêm mới (dòng chưa hợp lệ không được thêm)
              onClose();
            }}
          >
            Thêm {okCount} dòng hợp lệ vào bảng
          </button>
        </div>
      </div>
    </div>
  );
}
