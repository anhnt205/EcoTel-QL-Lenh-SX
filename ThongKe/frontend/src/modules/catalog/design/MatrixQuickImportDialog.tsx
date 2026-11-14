import { useMemo, useRef, useState } from "react";
import DIcon from "./DIcon";
import { recognizeImage } from "./ocr";
import { excelToCells, normText, textToCells } from "./quickLoad";
import "@/styles/catalog-design.css";

/** Một giá trị chọn được của trục: `value` là khoá thật, `label` hiện cho người dùng, `alt` là các cách gọi khác cũng được nhận. */
export interface MxOpt {
  value: string;
  label: string;
  alt?: string[];
}

/** Một trục của bảng (dòng hoặc cột). */
export interface MxAxis {
  /** Tên trục để hiện trong thông báo, vd "Mã chủng loại hàng". */
  label: string;
  options: MxOpt[];
  /** Có thì trục nhận cả giá trị KHÔNG nằm trong `options` (vd cung độ là số tự do): trả về khoá chuẩn hoá, null = không hợp lệ. */
  free?: (raw: string) => string | null;
}

export interface MxResult {
  rows: string[];
  cols: string[];
  cells: { row: string; col: string; value: string }[];
}

const NUM = /^-?\d+([.,]\d+)?$/;
/** Tiêu đề cột là số thứ tự → không phải dữ liệu. */
const SKIP_HEAD = new Set(["stt", "tt", "no", "#", "so tt", "so thu tu"]);

type ColInfo = { kind: "label" } | { kind: "skip"; auto: boolean } | { kind: "ok"; key: string } | { kind: "bad" };

/**
 * Cửa sổ "Nhập nhanh" dùng chung cho các màn dạng BẢNG HAI CHIỀU (Mô hình, Năng suất xe, Tỷ trọng, lưới chung…):
 * ảnh chụp bảng (OCR) / file Excel / chữ copy từ Excel → cấu trúc lấy ngay từ dữ liệu trong bảng:
 *  - dòng đầu là TIÊU ĐỀ CỘT, mỗi cột được nhận ra theo tên; cột không nhận ra tô đỏ (chọn lại hoặc bỏ cột);
 *  - cột nhãn dòng (mã chủng loại hàng, cung độ…) tự dò là cột có nhiều ô khớp nhất — đổi được bằng tay;
 *  - các ô còn lại là giá trị số, sửa được ngay trong bảng xem trước; dòng sai tô đỏ kèm lý do.
 * Màn gọi nhận kết quả (`onApply`) và tự ghép vào bảng của mình.
 */
export function MatrixQuickImportDialog({
  title,
  rowAxis,
  colAxis,
  unknownCol = "error",
  onApply,
  onClose,
}: {
  title: string;
  rowAxis: MxAxis;
  colAxis: MxAxis;
  /** Cột có tiêu đề lạ: "error" = tô đỏ bắt chọn lại; "ignore" = tự bỏ qua (vd cột Tên, Ghi chú không cần). */
  unknownCol?: "error" | "ignore";
  onApply: (res: MxResult) => void;
  onClose: () => void;
}) {
  /** [0] = dòng tiêu đề, còn lại là dữ liệu; mọi dòng cùng độ dài. */
  const [table, setTable] = useState<string[][]>([]);
  const [labelCol, setLabelCol] = useState(0);
  /** Chọn tay: chỉ số cột → khoá ("" = bỏ cột). */
  const [colOv, setColOv] = useState<Record<number, string>>({});
  /** Chọn tay: chỉ số dòng trong `table` → khoá ("" = chưa chọn). */
  const [rowOv, setRowOv] = useState<Record<number, string>>({});
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const makeResolver = (axis: MxAxis) => {
    const map = new Map<string, string>();
    axis.options.forEach((o) => {
      [o.value, o.label, ...(o.alt ?? [])].forEach((t) => {
        const k = normText(t);
        if (k && !map.has(k)) map.set(k, o.value);
      });
    });
    return (raw: string): string | null => {
      const k = normText(raw);
      if (!k) return null;
      return map.get(k) ?? (axis.free ? axis.free(raw.trim()) : null);
    };
  };
  const rowRes = useMemo(() => makeResolver(rowAxis), [rowAxis]); // eslint-disable-line react-hooks/exhaustive-deps
  const colRes = useMemo(() => makeResolver(colAxis), [colAxis]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = (all: string[][]) => {
    const data = all.filter((r) => r.some((c) => c !== ""));
    if (data.length < 2) {
      setError("Cần ít nhất một dòng tiêu đề và một dòng dữ liệu.");
      return;
    }
    const maxLen = Math.max(...data.map((r) => r.length));
    const padded = data.map((r) => {
      const x = r.slice();
      // ảnh chụp hay làm mất ô góc trái-trên (trống) → tiêu đề ngắn hơn dữ liệu đúng 1 ô thì chèn ô trống lại
      if (r === data[0] && x.length === maxLen - 1) x.unshift("");
      while (x.length < maxLen) x.push("");
      return x;
    });
    const body = padded.slice(1);
    let best = -1;
    let bestN = -1;
    for (let j = 0; j < Math.min(4, maxLen); j++) {
      if (SKIP_HEAD.has(normText(padded[0][j]))) continue;
      const n = body.filter((r) => rowRes(r[j]) != null).length;
      if (n > bestN) {
        best = j;
        bestN = n;
      }
    }
    setLabelCol(Math.max(0, best));
    setColOv({});
    setRowOv({});
    setTable(padded);
    setError(null);
  };

  const runOcr = async (img: Blob) => {
    setError(null);
    try {
      load(textToCells(await recognizeImage(img, { lang: "vie", onStatus: setBusy })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đọc ảnh thất bại.");
    } finally {
      setBusy(null);
    }
  };
  const readExcel = async (file: File) => {
    setError(null);
    try {
      setBusy("Đang đọc file Excel…");
      load(await excelToCells(file));
    } catch {
      setError("Không đọc được file Excel này.");
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

  const header = table[0] ?? [];
  const body = table.slice(1);

  const colInfo: ColInfo[] = useMemo(() => {
    const seen = new Set<string>();
    return header.map((h, j): ColInfo => {
      if (j === labelCol) return { kind: "label" };
      let info: ColInfo;
      if (colOv[j] !== undefined) info = colOv[j] === "" ? { kind: "skip", auto: false } : { kind: "ok", key: colOv[j] };
      else if (SKIP_HEAD.has(normText(h)) || (!h.trim() && body.every((r) => !(r[j] ?? "").trim()))) info = { kind: "skip", auto: true };
      else {
        const key = colRes(h);
        info = key ? { kind: "ok", key } : unknownCol === "ignore" ? { kind: "skip", auto: true } : { kind: "bad" };
      }
      if (info.kind === "ok") {
        if (seen.has(info.key)) return { kind: "bad" };
        seen.add(info.key);
      }
      return info;
    });
  }, [header, body, labelCol, colOv, colRes, unknownCol]);

  const colLabelOf = (key: string) => colAxis.options.find((o) => o.value === key)?.label ?? key;
  const rowLabelOf = (key: string) => rowAxis.options.find((o) => o.value === key)?.label ?? key;

  const rowInfo = useMemo(() => {
    const seen = new Map<string, number>();
    return body.map((r, i) => {
      const idx = i + 1;
      const raw = (r[labelCol] ?? "").trim();
      const key = rowOv[idx] !== undefined ? rowOv[idx] || null : rowRes(raw);
      const problems: string[] = [];
      const badCells = new Set<number>();
      let badLabel = false;
      if (!key) {
        badLabel = true;
        problems.push(raw ? `${rowAxis.label} "${raw}" chưa nhận ra` : `Thiếu ${rowAxis.label}`);
      } else if (seen.has(key)) {
        badLabel = true;
        problems.push(`${rowAxis.label} "${rowLabelOf(key)}" bị trùng với dòng ${seen.get(key)}`);
      } else seen.set(key, i + 1);
      let count = 0;
      colInfo.forEach((c, j) => {
        if (c.kind !== "ok") return;
        const v = (r[j] ?? "").trim();
        if (!v) return;
        if (!NUM.test(v)) {
          badCells.add(j);
          problems.push(`${colLabelOf(c.key)} "${v}" không phải số`);
        } else count++;
      });
      if (count === 0 && badCells.size === 0) problems.push("Dòng không có giá trị nào");
      return { idx, key, problems, badCells, badLabel, ok: problems.length === 0 };
    });
  }, [body, labelCol, rowOv, rowRes, colInfo]); // eslint-disable-line react-hooks/exhaustive-deps

  const okCount = rowInfo.filter((r) => r.ok).length;
  const badCount = rowInfo.length - okCount;
  const badColCount = colInfo.filter((c) => c.kind === "bad").length;

  const setCell = (r: number, c: number, v: string) =>
    setTable((prev) => prev.map((cells, j) => (j !== r ? cells : cells.map((x, k) => (k === c ? v : x)))));

  const apply = () => {
    const okCols = colInfo.flatMap((c, j) => (c.kind === "ok" ? [{ j, key: c.key }] : []));
    const cells: MxResult["cells"] = [];
    const rows: string[] = [];
    rowInfo.forEach((ri) => {
      if (!ri.ok || !ri.key) return;
      rows.push(ri.key);
      okCols.forEach(({ j, key }) => {
        const v = (table[ri.idx][j] ?? "").trim();
        if (v) cells.push({ row: ri.key!, col: key, value: v.replace(",", ".") });
      });
    });
    onApply({ rows, cols: [...new Set(cells.map((c) => c.col))], cells });
    // thêm xong thì đóng cửa sổ, quay về bảng Thêm mới (dòng chưa hợp lệ không được thêm)
    onClose();
  };

  const th = { border: "1px solid #8fa9cc", padding: "5px 6px", fontSize: 13, background: "#e8f0fb", textAlign: "left" as const, verticalAlign: "top" as const };
  const td = { border: "1px solid #b4c8e2", padding: "3px 5px", fontSize: 13, verticalAlign: "top" as const };
  const red = { borderColor: "#d82e40" };

  return (
    <div className="tkc-modal-overlay" style={{ zIndex: 400 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()} onPaste={onPasteDialog}>
      <div className="modal" style={{ width: "min(1500px, 98vw)", maxHeight: "94vh" }} role="dialog" aria-modal="true" aria-label="Nhập liệu thông minh (Ảnh/Excel)">
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
              Dòng đầu là tiêu đề cột, cột nhãn dòng là <b>{rowAxis.label}</b> ({title}).
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
                  load(textToCells(t));
                }
              }}
              onBlur={() => {
                if (paste.trim()) load(textToCells(paste));
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
              <button className="btn" type="button" onClick={() => setTable([])} disabled={!!busy || table.length === 0}>
                Xoá hết
              </button>
            </div>
          </div>

          {busy && <p style={{ color: "#0954c7", margin: "0 0 8px" }}>{busy}</p>}
          {error && <div className="form-error">{error}</div>}

          {table.length > 0 && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, margin: "0 0 8px", fontSize: 13 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  Cột chứa <b>{rowAxis.label}</b>:
                  <select className="field" style={{ height: 30, width: 220 }} value={String(labelCol)} onChange={(e) => { setLabelCol(Number(e.target.value)); setColOv({}); setRowOv({}); }}>
                    {header.map((h, j) => (
                      <option key={j} value={String(j)}>
                        Cột {j + 1}{h.trim() ? ` — ${h.trim()}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <span>
                  <b style={{ color: "#1a7f37" }}>{okCount}</b> dòng hợp lệ
                  {badCount > 0 && (
                    <>
                      {" · "}
                      <b style={{ color: "#d82e40" }}>{badCount}</b> dòng chưa hợp lệ
                    </>
                  )}
                  {badColCount > 0 && (
                    <>
                      {" · "}
                      <b style={{ color: "#d82e40" }}>{badColCount}</b> cột chưa nhận ra (chọn lại hoặc “bỏ cột”)
                    </>
                  )}
                </span>
              </div>

              <div style={{ overflow: "auto", maxHeight: "52vh", border: "1px solid #8fa9cc", borderRadius: 8 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 120 + header.length * 120, background: "#fff" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                      <th style={{ ...th, width: 40 }}>#</th>
                      {header.map((h, j) => {
                        const info = colInfo[j];
                        if (info.kind === "label")
                          return (
                            <th key={j} style={{ ...th, minWidth: 150 }}>
                              {rowAxis.label}
                              <div style={{ fontWeight: 400, fontSize: 11, color: "#5b6f8f" }}>{h.trim() ? `(cột “${h.trim()}”)` : ""}</div>
                            </th>
                          );
                        const value = info.kind === "ok" ? info.key : "";
                        return (
                          <th key={j} style={{ ...th, minWidth: 130, background: info.kind === "bad" ? "#fdecee" : info.kind === "skip" ? "#f1f3f6" : th.background }}>
                            {colAxis.free ? (
                              <input
                                className="field"
                                style={{ height: 28, width: "100%", ...(info.kind === "bad" ? red : null) }}
                                value={h}
                                onChange={(e) => {
                                  setCell(0, j, e.target.value);
                                  setColOv((p) => {
                                    const n = { ...p };
                                    delete n[j];
                                    return n;
                                  });
                                }}
                              />
                            ) : (
                              <select
                                className="field"
                                style={{ height: 28, width: "100%", ...(info.kind === "bad" ? red : null) }}
                                value={value}
                                onChange={(e) => setColOv((p) => ({ ...p, [j]: e.target.value }))}
                              >
                                <option value="">{info.kind === "bad" ? `⚠ ${h.trim() || "(trống)"} — chọn…` : "— bỏ cột —"}</option>
                                {colAxis.options.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                            )}
                            <div style={{ fontWeight: 400, fontSize: 11, color: "#5b6f8f", marginTop: 2 }}>
                              {info.kind === "skip" ? "bỏ qua" : info.kind === "ok" && h.trim() && normText(h) !== normText(colLabelOf(info.key)) ? `ảnh: “${h.trim()}”` : ""}
                            </div>
                          </th>
                        );
                      })}
                      <th style={{ ...th, width: 38 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rowInfo.map((ri) => {
                      const r = table[ri.idx];
                      return (
                        <tr key={ri.idx} style={ri.ok ? undefined : { background: "#fdecee" }}>
                          <td style={{ ...td, textAlign: "center", color: "#5b6f8f" }}>{ri.idx}</td>
                          {header.map((_, j) => {
                            const info = colInfo[j];
                            if (info.kind === "label")
                              return (
                                <td key={j} style={td}>
                                  {rowAxis.free ? (
                                    <input
                                      className="field"
                                      style={{ height: 30, width: "100%", ...(ri.badLabel ? red : null) }}
                                      value={r[j] ?? ""}
                                      onChange={(e) => {
                                        setCell(ri.idx, j, e.target.value);
                                        setRowOv((p) => {
                                          const n = { ...p };
                                          delete n[ri.idx];
                                          return n;
                                        });
                                      }}
                                    />
                                  ) : (
                                    <select
                                      className="field"
                                      style={{ height: 30, width: "100%", ...(ri.badLabel ? red : null) }}
                                      value={ri.key ?? ""}
                                      onChange={(e) => setRowOv((p) => ({ ...p, [ri.idx]: e.target.value }))}
                                    >
                                      <option value="">{ri.badLabel && (r[j] ?? "").trim() ? `⚠ ${(r[j] ?? "").trim()}` : "—"}</option>
                                      {rowAxis.options.map((o) => (
                                        <option key={o.value} value={o.value}>
                                          {o.label}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </td>
                              );
                            if (info.kind !== "ok")
                              return (
                                <td key={j} style={{ ...td, color: "#8a97ab", background: "#f7f8fa" }}>
                                  {r[j]}
                                </td>
                              );
                            return (
                              <td key={j} style={td}>
                                <input
                                  className="field"
                                  style={{ height: 30, width: "100%", textAlign: "right", ...(ri.badCells.has(j) ? red : null) }}
                                  value={r[j] ?? ""}
                                  onChange={(e) => setCell(ri.idx, j, e.target.value)}
                                />
                              </td>
                            );
                          })}
                          <td style={{ ...td, textAlign: "center" }}>
                            <button
                              className="icon-mini x"
                              aria-label="Bỏ dòng này"
                              title="Bỏ dòng này"
                              onClick={() => {
                                const del = ri.idx;
                                setTable((prev) => prev.filter((_, i) => i !== del));
                                setRowOv((p) =>
                                  Object.fromEntries(
                                    Object.entries(p).flatMap(([k, v]) => {
                                      const n = Number(k);
                                      return n === del ? [] : [[n > del ? n - 1 : n, v]];
                                    }),
                                  ),
                                );
                              }}
                            >
                              <DIcon name="x" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {badCount > 0 && (
                <ul style={{ margin: "8px 0 0 18px", padding: 0, fontSize: 12, color: "#d82e40" }}>
                  {rowInfo.flatMap((r) => (r.ok ? [] : [<li key={r.idx}>Dòng {r.idx}: {r.problems.join("; ")}</li>])).slice(0, 12)}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Đóng
          </button>
          <button className="btn btn-primary" disabled={okCount === 0 || badColCount > 0 || !!busy} onClick={apply} title={badColCount > 0 ? "Còn cột chưa nhận ra — chọn lại hoặc bỏ cột" : undefined}>
            Thêm {okCount} dòng hợp lệ vào bảng
          </button>
        </div>
      </div>
    </div>
  );
}
