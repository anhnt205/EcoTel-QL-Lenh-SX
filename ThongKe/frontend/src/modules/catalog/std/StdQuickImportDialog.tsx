import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { CatalogFormModal } from "../CatalogFormModal";
import api from "@/config/api.config";
import { excavationAreaConfig, machineConfig, mudMarkConfig, seamGroupConfig, suffixConfig } from "../configs";
import type { CatalogConfig } from "../types";
import DIcon from "../design/DIcon";
import { recognizeImage } from "../design/ocr";
import { normText } from "../design/quickLoad";
import "@/styles/catalog-design.css";

/** Thành phần (sách danh mục) dùng để đối chiếu khi tách khoá. */
export interface QuickCatalogs {
  seamGroups: { code: string }[];
  excavators: { code: string }[];
  excavationAreas: { code: string }[];
  mudMarks: { name: string }[];
  suffixes: { suffix: string }[];
}

/** Một cột số liệu của bảng STD (khoá + nhãn) — thứ tự quyết định số dán kèm rơi vào cột nào. */
export interface QuickValueCol {
  key: string;
  label: string;
  /** Nhóm cột (vd "Đất CN", "Than SX"): các cột liền nhau cùng nhóm nằm dưới MỘT ô tiêu đề lớn trong bảng xem trước. */
  group?: string;
  /** Nhãn ngắn hiện dưới tiêu đề nhóm (bỏ phần tên nhóm lặp lại), vd "m3", "Clech". Mặc định = label. */
  short?: string;
}

/** Một dòng đã tách — giá trị đúng như ô nhập của bảng STD (nhóm vỉa/máy xúc/khu vực = MÃ, ký hiệu bùn/hậu tố = chuỗi). */
export interface QuickRow {
  fields: {
    seamGroup: string;
    benchGroup: string;
    excavator: string;
    mudMark: string;
    excavationArea: string;
    suffix: string;
  };
  /** Số liệu đã chốt (đã bỏ ô trống), khoá theo cột số liệu của bảng STD. */
  values: Record<string, string>;
}

/** Một dòng đang chờ nhập: chữ khoá (sửa được) + các ô số liệu theo vị trí cột (sửa được, có thể trống). */
interface Item {
  text: string;
  nums: string[];
}

/** Danh mục có thể tạo thẳng từ cửa sổ này khi giá trị chưa có (Máy xúc = thiết bị thuộc danh mục Máy, chủng loại "Máy xúc"). */
export type MissingKind = "seamGroup" | "excavator" | "excavationArea" | "mudMark" | "suffix";
export interface MissingItem {
  kind: MissingKind;
  value: string;
}

const MISSING_LABEL: Record<MissingKind, string> = {
  seamGroup: "Nhóm vỉa",
  excavator: "Máy xúc",
  excavationArea: "Khu vực xúc",
  mudMark: "Ký hiệu bùn",
  suffix: "Hậu tố",
};

interface Parsed {
  ok: boolean;
  problems: string[];
  /** Các giá trị chưa có trong danh mục tạo được (để hiện nút Tạo). */
  missing: MissingItem[];
  /** Ô số liệu nào không phải số (theo vị trí). */
  badNums: Set<number>;
  row: QuickRow;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[.\s]+$/, "");
const NUM = /^-?\d+([.,]\d+)?$/;

/** Tìm mã trong danh mục, không phân biệt hoa/thường và bỏ dấu chấm cuối (OCR/Excel hay thừa) → trả mã CHUẨN của danh mục. */
const findCode = <T,>(list: T[], pick: (x: T) => string, token: string): string | null => {
  const t = norm(token);
  if (!t) return null;
  const hit = list.find((x) => norm(pick(x)) === t);
  return hit ? pick(hit) : null;
};

/**
 * Sửa lỗi hay gặp khi đọc ảnh/dán: các mảnh của khoá bị ngăn bằng dấu cách hoặc ", " thay vì "_"
 * (vd "13-1._75_p24, CS" → "13-1._75_p24_CS", "13-1._75_P9. CS" → "13-1._75_P9._CS").
 */
const repairKey = (text: string): string => {
  const toks = text.trim().split(/\s+/).filter(Boolean);
  if (toks.length <= 1) return toks[0] ?? "";
  return toks.map((t) => t.replace(/,+$/, "")).filter(Boolean).join("_");
};

/**
 * Tách MỘT dòng chữ thành khoá + các ô số: các mảnh đầu thuộc khoá cho tới khi khoá đủ 4 phần (nhóm vỉa_nhóm tầng_máy xúc_khu vực) và gặp ô số;
 * mọi mảnh còn lại là ô số theo đúng vị trí — mảnh không phải số (OCR đọc nhầm) thành ô TRỐNG để giữ nguyên thẳng hàng cột.
 */
const splitLine = (line: string): Item => {
  const toks = line.trim().split(/\s+/).filter(Boolean);
  const keyToks: string[] = [];
  let i = 0;
  for (; i < toks.length; i++) {
    const parts = repairKey(keyToks.join(" ")).split("_").filter(Boolean).length;
    if (i > 0 && parts >= 4 && NUM.test(toks[i])) break;
    keyToks.push(toks[i]);
  }
  const nums = toks.slice(i).map((t) => (NUM.test(t) ? t.replace(",", ".") : ""));
  while (nums.length > 0 && nums[nums.length - 1] === "") nums.pop();
  return { text: repairKey(keyToks.join(" ")), nums };
};

/**
 * Tách một dòng đã có: khoá `nhóm vỉa_nhóm tầng_máy xúc[_ký hiệu bùn]_khu vực[_hậu tố]` + các ô số.
 * Mỗi thành phần đối chiếu với danh mục; thành phần nào không khớp thì dòng bị đánh dấu lỗi (kèm lý do) để người dùng sửa.
 */
export function parseQuickItem(item: Item, cat: QuickCatalogs, valueCols: QuickValueCol[]): Parsed {
  const values: Record<string, string> = {};
  const badNums = new Set<number>();
  const problems: string[] = [];
  item.nums.forEach((n, i) => {
    const v = n.trim();
    if (!v) return;
    if (!NUM.test(v)) {
      badNums.add(i);
      return;
    }
    if (i < valueCols.length) values[valueCols[i].key] = v.replace(",", ".");
  });
  if (badNums.size > 0) problems.push(`Ô số liệu không phải số: cột ${[...badNums].map((i) => valueCols[i]?.label ?? i + 1).join(", ")}`);
  if (item.nums.length > valueCols.length) problems.push(`Thừa số liệu: có ${item.nums.length} ô nhưng bảng chỉ có ${valueCols.length} cột số`);

  const row: QuickRow = { fields: { seamGroup: "", benchGroup: "", excavator: "", mudMark: "", excavationArea: "", suffix: "" }, values };
  const missing: MissingItem[] = [];
  const keyText = repairKey(item.text);
  const tokens = keyText.split("_");
  if (tokens.length < 4) {
    problems.unshift("Khoá phải có ít nhất 4 phần ngăn bằng dấu _ (nhóm vỉa_nhóm tầng_máy xúc_khu vực)");
    return { ok: false, problems, missing, badNums, row };
  }

  const [seamT, benchT, exT, ...rest] = tokens;

  const seam = findCode(cat.seamGroups, (x) => x.code, seamT);
  row.fields.seamGroup = seam ?? seamT;
  if (!seam) {
    problems.push(`Nhóm vỉa "${seamT}" chưa có trong danh mục`);
    missing.push({ kind: "seamGroup", value: seamT.trim() });
  }

  if (NUM.test(benchT.trim())) row.fields.benchGroup = benchT.trim().replace(",", ".");
  else {
    row.fields.benchGroup = benchT;
    problems.push(`Nhóm tầng "${benchT}" không phải số`);
  }

  const ex = findCode(cat.excavators, (x) => x.code, exT);
  row.fields.excavator = ex ?? exT;
  if (!ex) {
    problems.push(`Máy xúc "${exT}" chưa có trong danh mục`);
    if (exT.trim()) missing.push({ kind: "excavator", value: exT.trim() });
  }

  // phần còn lại: [ký hiệu bùn…]_khu vực[_hậu tố]
  const tail = [...rest];
  let suffixT = "";
  if (tail.length >= 2) {
    const last = tail[tail.length - 1];
    const asSuffix = findCode(cat.suffixes, (x) => x.suffix, last);
    const secondLastIsArea = findCode(cat.excavationAreas, (x) => x.code, tail[tail.length - 2]) !== null;
    const lastIsArea = findCode(cat.excavationAreas, (x) => x.code, last) !== null;
    // hậu tố nếu có trong danh mục Hậu tố; hoặc phần đứng trước nó là khu vực còn chính nó không phải khu vực (hậu tố lạ)
    if (asSuffix || (!lastIsArea && secondLastIsArea)) {
      suffixT = last;
      tail.pop();
    }
  }
  const areaT = tail.length > 0 ? tail[tail.length - 1] : "";
  const mudT = tail.slice(0, -1).join("_");

  const area = findCode(cat.excavationAreas, (x) => x.code, areaT);
  row.fields.excavationArea = area ?? areaT;
  if (!areaT) problems.push("Thiếu khu vực xúc");
  else if (!area) {
    problems.push(`Khu vực xúc "${areaT}" chưa có trong danh mục`);
    missing.push({ kind: "excavationArea", value: areaT.trim() });
  }

  if (mudT) {
    const mud = findCode(cat.mudMarks, (x) => x.name, mudT);
    row.fields.mudMark = mud ?? mudT;
    if (!mud) {
      problems.push(`Ký hiệu bùn "${mudT}" chưa có trong danh mục`);
      missing.push({ kind: "mudMark", value: mudT.trim() });
    }
  }
  if (suffixT) {
    const suf = findCode(cat.suffixes, (x) => x.suffix, suffixT);
    row.fields.suffix = suf ?? suffixT;
    if (!suf) {
      problems.push(`Hậu tố "${suffixT}" chưa có trong danh mục`);
      missing.push({ kind: "suffix", value: suffixT.trim() });
    }
  }
  return { ok: problems.length === 0, problems, missing, badNums, row };
}

/**
 * Cửa sổ "Nhập nhanh từ Excel" (bản thử): ảnh chụp bảng Excel (dán Ctrl+V / chọn ảnh), file Excel, hoặc chữ copy từ Excel →
 * tự tách mỗi dòng thành khoá (6 ô) + các ô số liệu, đối chiếu danh mục; dòng chưa tách/khớp được bôi ĐỎ kèm lý do.
 * Cả khoá lẫn các ô số liệu đều sửa được ngay trong bảng xem trước; chỉ dòng hợp lệ mới được thêm vào bảng STD.
 */
export function StdQuickImportDialog({
  catalogs,
  valueCols,
  onAdd,
  onCatalogsChanged,
  onClose,
}: {
  catalogs: QuickCatalogs;
  /** Các cột số liệu của bảng STD theo thứ tự (Đất…; Than SX… nếu có). */
  valueCols: QuickValueCol[];
  onAdd: (rows: QuickRow[]) => void;
  /** Gọi sau khi tạo thêm mục danh mục — để cửa sổ cha nạp lại danh mục. */
  onCatalogsChanged: () => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => items.map((it) => parseQuickItem(it, catalogs, valueCols)), [items, catalogs, valueCols]);
  // các giá trị còn thiếu (bỏ trùng, không phân biệt hoa/thường/dấu chấm cuối)
  const missingAll = useMemo(() => {
    const seen = new Map<string, MissingItem>();
    parsed.forEach((p) => p.missing.forEach((m) => seen.set(`${m.kind}|${norm(m.value)}`, m)));
    return [...seen.values()];
  }, [parsed]);
  /** Mục đang chuẩn bị tạo: người dùng chọn danh mục đích (hệ thống có thể đoán sai) rồi mở form "Thêm mới" thông thường của danh mục đó. */
  const [pick, setPick] = useState<{ value: string; kind: MissingKind } | null>(null);
  const [formFor, setFormFor] = useState<{ value: string; kind: MissingKind; prefill: Record<string, unknown> } | null>(null);
  const configOf: Record<MissingKind, CatalogConfig> = {
    seamGroup: seamGroupConfig,
    excavator: machineConfig,
    excavationArea: excavationAreaConfig,
    mudMark: mudMarkConfig,
    suffix: suffixConfig,
  };
  /** Điền sẵn form "Thêm mới" bằng giá trị đang thiếu (người dùng vẫn sửa/điền thêm các trường khác được). */
  const prefillOf = (kind: MissingKind, v: string): Record<string, unknown> => {
    const g = v.toUpperCase();
    if (kind === "seamGroup") return { code: v, name: v };
    if (kind === "excavationArea") return { code: v, name: v, areaGroup: g === "CS" || g === "KC" ? g : "" };
    if (kind === "mudMark") return { name: v };
    // dấu chấm cuối thường là nhiễu OCR/Excel (so khớp cũng bỏ qua) — không đưa vào số máy
    if (kind === "excavator") return { vehicleNumber: v.replace(/[.\s]+$/, ""), name: v.replace(/[.\s]+$/, "") };
    return { suffix: v };
  };
  /** Mở form "Thêm mới" của danh mục đích. Máy xúc: điền sẵn chủng loại máy = "Máy xúc" (tra theo tên trong danh mục chủng loại máy). */
  const openForm = async (p: { value: string; kind: MissingKind }) => {
    const prefill = prefillOf(p.kind, p.value);
    if (p.kind === "excavator") {
      try {
        const res = await api.get("/device-types", { params: { group: "MAY", size: 500 } });
        const list = (res.data?.data?.content ?? res.data?.data ?? []) as { id: number; name: string }[];
        const hit = list.find((t) => normText(t.name) === "may xuc");
        if (hit) prefill.categoryId = String(hit.id);
      } catch {
        /* không tra được thì để trống, người dùng tự chọn trong form */
      }
    }
    setFormFor({ ...p, prefill });
  };

  // các cột số liệu liền nhau cùng nhóm → một ô tiêu đề lớn (vd "Đất CN") phía trên
  const hasGroups = valueCols.some((c) => c.group);
  const colGroups = useMemo(() => {
    const out: { group?: string; cols: QuickValueCol[] }[] = [];
    valueCols.forEach((c) => {
      const last = out[out.length - 1];
      if (last && last.group === c.group && c.group) last.cols.push(c);
      else out.push({ group: c.group, cols: [c] });
    });
    return out;
  }, [valueCols]);

  const okCount = parsed.filter((p) => p.ok).length;
  const badCount = parsed.length - okCount;

  /** Thêm các dòng chữ vào danh sách chờ (mỗi dòng có dấu _ mới là dòng khoá). */
  const appendText = (text: string) => {
    const got = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.includes("_"))
      .map(splitLine);
    if (got.length === 0 && text.trim()) setError("Không thấy dòng khoá nào (có dấu _ như 13-1._75_P16._CS) trong nội dung vừa dán.");
    else setError(null);
    setItems((prev) => [...prev, ...got]);
  };

  /** Đọc file Excel (.xlsx/.xls/.csv): mỗi dòng của sheet đầu có ô chứa dấu _ (cột khoá) → khoá + các ô đi sau (giữ nguyên ô trống để thẳng cột). */
  const readExcel = async (file: File) => {
    setError(null);
    try {
      setBusy("Đang đọc file Excel…");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
      const got: Item[] = rows
        .map((r) => r.map((c) => String(c ?? "").trim()))
        .filter((r) => r.some((c) => c.includes("_")))
        .map((r) => {
          const k = r.findIndex((c) => c.includes("_"));
          const nums = r.slice(k + 1).map((c) => (c === "" ? "" : c.replace(",", ".")));
          while (nums.length > 0 && nums[nums.length - 1] === "") nums.pop();
          return { text: repairKey(r[k]), nums };
        });
      if (got.length === 0) setError("Không thấy cột khoá nào (ô có dấu _ như 13-1._75_P16._CS) trong sheet đầu của file.");
      setItems((prev) => [...prev, ...got]);
    } catch {
      setError("Không đọc được file Excel này.");
    } finally {
      setBusy(null);
    }
  };

  const runOcr = async (img: Blob) => {
    setError(null);
    try {
      // khoá chỉ gồm chữ/số và - . _ , nên giới hạn ký tự cho đỡ đọc nhầm
      const text = await recognizeImage(img, {
        lang: "eng",
        whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._, ",
        onStatus: setBusy,
      });
      const got = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.includes("_") || /,\s*(cs|kc)\b/i.test(l) || /\.\s+(cs|kc)\b/i.test(l))
        .map(splitLine);
      if (got.length === 0) setError("Không đọc được dòng khoá nào trong ảnh. Thử chụp rõ/to hơn, hoặc copy chữ từ Excel rồi dán.");
      setItems((prev) => [...prev, ...got]);
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

  const setKey = (i: number, text: string) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, text } : it)));
  const setNum = (i: number, c: number, v: string) =>
    setItems((prev) =>
      prev.map((it, j) => {
        if (j !== i) return it;
        const nums = [...it.nums];
        while (nums.length <= c) nums.push("");
        nums[c] = v;
        return { ...it, nums };
      }),
    );

  const th = { border: "1px solid #8fa9cc", padding: "5px 8px", fontSize: 13, background: "#e8f0fb", textAlign: "left" as const, whiteSpace: "nowrap" as const };
  const td = { border: "1px solid #b4c8e2", padding: "3px 6px", fontSize: 13, verticalAlign: "top" as const };

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
              <button className="btn" type="button" onClick={() => setItems([])} disabled={!!busy || items.length === 0}>
                Xoá hết
              </button>
            </div>
          </div>

          {busy && <p style={{ color: "#0954c7", margin: "0 0 8px" }}>{busy}</p>}
          {error && <div className="form-error">{error}</div>}

          {parsed.length > 0 && (
            <>
              <p style={{ margin: "0 0 8px", fontSize: 13 }}>
                <b style={{ color: "#1a7f37" }}>{okCount}</b> dòng hợp lệ
                {badCount > 0 && (
                  <>
                    {" · "}
                    <b style={{ color: "#d82e40" }}>{badCount}</b> dòng chưa tách/khớp được — sửa trực tiếp ở cột "Nhóm vỉa + Máy xúc" và các ô số liệu bên dưới
                  </>
                )}
              </p>
              {missingAll.length > 0 && (
                <div style={{ border: "1px solid #f0b4bb", background: "#fff6f7", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                  <div style={{ marginBottom: 6 }}>
                    <b style={{ fontSize: 13 }}>Chưa có trong danh mục ({missingAll.length})</b>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {missingAll.map((m) => (
                      <button
                        key={`${m.kind}|${m.value}`}
                        className="btn"
                        style={{ height: 28, fontSize: 12 }}
                        disabled={!!busy}
                        onClick={() => setPick({ value: m.value, kind: m.kind })}
                      >
                        + {MISSING_LABEL[m.kind]}: {m.value}
                      </button>
                    ))}
                  </div>
                  {pick && (
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px dashed #f0b4bb" }}>
                      <span style={{ fontSize: 13 }}>
                        Tạo <code>{pick.value}</code> vào danh mục:
                      </span>
                      <select className="field" style={{ height: 30, width: 180 }} value={pick.kind} onChange={(e) => setPick({ ...pick, kind: e.target.value as MissingKind })}>
                        {(Object.keys(MISSING_LABEL) as MissingKind[]).map((k) => (
                          <option key={k} value={k}>
                            {MISSING_LABEL[k]}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn btn-primary"
                        style={{ height: 30 }}
                        onClick={() => {
                          void openForm(pick);
                          setPick(null);
                        }}
                      >
                        Tạo mới…
                      </button>
                      <button className="btn" style={{ height: 30 }} onClick={() => setPick(null)}>
                        Huỷ
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div style={{ overflow: "auto", maxHeight: "46vh", border: "1px solid #8fa9cc", borderRadius: 8 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1100 + valueCols.length * 90, background: "#fff" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                      <th rowSpan={hasGroups ? 2 : 1} style={{ ...th, width: 56 }}>STT</th>
                      <th rowSpan={hasGroups ? 2 : 1} style={{ ...th, minWidth: 260 }}>Nhóm vỉa + Máy xúc</th>
                      <th rowSpan={hasGroups ? 2 : 1} style={th}>Nhóm vỉa</th>
                      <th rowSpan={hasGroups ? 2 : 1} style={th}>Nhóm tầng</th>
                      <th rowSpan={hasGroups ? 2 : 1} style={th}>Máy xúc</th>
                      <th rowSpan={hasGroups ? 2 : 1} style={th}>Ký hiệu bùn</th>
                      <th rowSpan={hasGroups ? 2 : 1} style={th}>Khu vực xúc</th>
                      <th rowSpan={hasGroups ? 2 : 1} style={th}>Hậu tố</th>
                      {hasGroups
                        ? colGroups.map((g, gi) =>
                            g.group ? (
                              <th key={gi} colSpan={g.cols.length} style={{ ...th, textAlign: "center" }}>
                                {g.group}
                              </th>
                            ) : (
                              g.cols.map((c) => (
                                <th key={c.key} rowSpan={2} style={{ ...th, textAlign: "right" }}>
                                  {c.label}
                                </th>
                              ))
                            ),
                          )
                        : valueCols.map((c) => (
                            <th key={c.key} style={{ ...th, textAlign: "right" }}>
                              {c.label}
                            </th>
                          ))}
                      <th rowSpan={hasGroups ? 2 : 1} style={{ ...th, width: 40 }} />
                    </tr>
                    {hasGroups && (
                      <tr>
                        {colGroups.flatMap((g) =>
                          g.group
                            ? g.cols.map((c) => (
                                <th key={c.key} style={{ ...th, textAlign: "right" }}>
                                  {c.short ?? c.label}
                                </th>
                              ))
                            : [],
                        )}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {parsed.map((p, i) => (
                      <tr key={i} style={p.ok ? undefined : { background: "#fdecee" }}>
                        <td style={{ ...td, textAlign: "center", color: "#5b6f8f" }}>{i + 1}</td>
                        <td style={td}>
                          <input
                            className="field"
                            style={{ height: 30, width: "100%", minWidth: 240, fontFamily: "monospace", ...(p.ok ? null : { borderColor: "#d82e40" }) }}
                            value={items[i].text}
                            onChange={(e) => setKey(i, e.target.value)}
                          />
                          {!p.ok && <div style={{ color: "#d82e40", fontSize: 12, marginTop: 3, maxWidth: 360 }}>{p.problems.join("; ")}</div>}
                        </td>
                        <td style={td}>{p.row.fields.seamGroup}</td>
                        <td style={td}>{p.row.fields.benchGroup}</td>
                        <td style={td}>{p.row.fields.excavator}</td>
                        <td style={td}>{p.row.fields.mudMark}</td>
                        <td style={td}>{p.row.fields.excavationArea}</td>
                        <td style={td}>{p.row.fields.suffix}</td>
                        {valueCols.map((c, ci) => (
                          <td key={c.key} style={td}>
                            <input
                              className="field"
                              style={{ height: 30, width: 84, textAlign: "right", ...(p.badNums.has(ci) ? { borderColor: "#d82e40" } : null) }}
                              inputMode="decimal"
                              value={items[i].nums[ci] ?? ""}
                              onChange={(e) => setNum(i, ci, e.target.value)}
                            />
                          </td>
                        ))}
                        <td style={{ ...td, textAlign: "center" }}>
                          <button className="icon-mini x" aria-label="Bỏ dòng này" title="Bỏ dòng này" onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>
                            <DIcon name="x" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              onAdd(parsed.filter((p) => p.ok).map((p) => p.row));
              // thêm xong thì đóng cửa sổ, quay về bảng Thêm mới (dòng chưa hợp lệ không được thêm)
              onClose();
            }}
          >
            Thêm {okCount} dòng hợp lệ vào bảng
          </button>
        </div>
      </div>

      {formFor && (
        // bọc trong lớp riêng để form "Thêm mới" thông thường nổi lên trên cửa sổ này
        <div style={{ position: "fixed", inset: 0, zIndex: 500 }}>
          <CatalogFormModal
            config={configOf[formFor.kind]}
            open
            editing={null}
            copyFrom={formFor.prefill}
            onClose={() => setFormFor(null)}
            onSaved={() => {
              setFormFor(null);
              onCatalogsChanged();
            }}
          />
        </div>
      )}
    </div>
  );
}
