import * as XLSX from "xlsx";
import type { CatalogConfig, CatalogField } from "./types";

/**
 * Xuất/nhập Excel cho màn danh mục.
 *
 * Nguyên tắc: **file Excel dùng TÊN, không dùng id.** Người nhập liệu không
 * thể biết id của "Nhóm chủng loại hàng"; họ chỉ biết tên. Nên cột tham
 * chiếu danh mục khác xuất ra tên, và khi nhập thì tra ngược tên → id.
 */

/** Nhãn cột trong file Excel = nhãn hiển thị trên giao diện. */
const headerOf = (f: CatalogField) => f.label;

/**
 * Đưa ô ngày về ISO `yyyy-MM-dd`, trả `null` nếu không đọc được.
 *
 * Ô ngày trong Excel về đây có thể ở ba dạng khác nhau tuỳ cách người dùng
 * gõ và tuỳ định dạng ô, nên phải nhận cả ba thay vì tin một dạng:
 * chuỗi `dd/MM/yyyy`, chuỗi ISO sẵn, hoặc số sê-ri của Excel.
 */
function toIsoDate(value: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) return value;

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Số sê-ri Excel: mốc 0 là 1899-12-30 (chừa chỗ cho lỗi năm nhuận 1900
  // mà Excel cố tình giữ lại).
  if (/^\d+(\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial > 0 && serial < 100000) {
      const ms = Date.UTC(1899, 11, 30) + serial * 86400000;
      return new Date(ms).toISOString().slice(0, 10);
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  return null;
}

/** Giá trị hiển thị của một ô khi xuất. */
const cellOf = (row: Record<string, unknown>, f: CatalogField): string => {
  // Trường tham chiếu danh mục khác: bản ghi trả về kèm "<key>Name"
  const key = f.optionsPath ? f.key.replace(/Id$/, "Name") : f.key;
  return String(row[key] ?? "");
};

/**
 * Tạo workbook: luôn có dòng tiêu đề; kèm dữ liệu nếu được truyền vào.
 *
 * Sheet thứ hai "Huong dan" ghi rõ cột nào bắt buộc và cột nào phải khớp
 * danh mục — để người nhập không phải đoán.
 */
function buildWorkbook(
  config: CatalogConfig,
  rows: Record<string, unknown>[],
): XLSX.WorkBook {
  // Bỏ cột chỉ đọc: chúng là giá trị kéo theo danh mục khác. Xuất ra thì
  // file tải xuống không nhập lại được, vì khi nhập không có gì để ghi vào.
  const fields = config.fields.filter((f) => !f.readOnly);
  const headers = fields.map(headerOf);

  const body = rows.map((r) =>
    Object.fromEntries(fields.map((f) => [headerOf(f), cellOf(r, f)])),
  );

  // Không có dữ liệu -> tạo sheet chỉ với dòng tiêu đề (đúng nghĩa "template")
  const sheet =
    body.length > 0
      ? XLSX.utils.json_to_sheet(body, { header: headers })
      : XLSX.utils.aoa_to_sheet([headers]);

  // Đặt bề rộng cột cho dễ đọc
  sheet["!cols"] = fields.map((f) => ({
    wch: Math.max(headerOf(f).length + 4, 18),
  }));

  const guide: string[][] = [
    [`HƯỚNG DẪN NHẬP ${config.title.toUpperCase()}`],
    [],
    ["Cột", "Bắt buộc", "Ghi chú"],
    ...fields.map((f) => [
      headerOf(f),
      f.required ? "Có" : "Không",
      f.optionsPath
        ? "Phải trùng TÊN đã có trong danh mục tương ứng"
        : f.optionsFrom
          ? "Nên dùng giá trị đã có; giá trị mới sẽ được tạo thêm"
          : "Nhập tự do",
    ]),
    [],
    ["Lưu ý:"],
    ["- Giữ nguyên dòng tiêu đề, không đổi tên cột."],
    ...(config.uniqueCodeKey === null
      ? []
      : [["- Cột đầu tiên là MÃ, không được trùng nhau và không trùng dữ liệu đã có."]]),
    ...(fields.some((f) => f.type === "date")
      ? [["- Cột ngày nhập dạng dd/MM/yyyy hoặc yyyy-MM-dd."]]
      : []),
    ["- Xoá hết các dòng ví dụ trước khi nhập dữ liệu thật."],
  ];
  const guideSheet = XLSX.utils.aoa_to_sheet(guide);
  guideSheet["!cols"] = [{ wch: 28 }, { wch: 12 }, { wch: 52 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "DuLieu");
  XLSX.utils.book_append_sheet(wb, guideSheet, "HuongDan");
  return wb;
}

/**
 * Tải file Excel.
 * - Có dòng được chọn  -> xuất đúng các dòng đó (kèm dữ liệu).
 * - Không chọn dòng nào -> xuất TEMPLATE rỗng, chỉ có tiêu đề.
 */
export function downloadCatalogExcel(
  config: CatalogConfig,
  selectedRows: Record<string, unknown>[],
): { isTemplate: boolean; count: number } {
  const wb = buildWorkbook(config, selectedRows);
  const slug = config.basePath.replace(/^\//, "");
  const name =
    selectedRows.length > 0
      ? `${slug}_du-lieu-da-chon.xlsx`
      : `${slug}_template.xlsx`;
  XLSX.writeFile(wb, name);
  return { isTemplate: selectedRows.length === 0, count: selectedRows.length };
}

export interface ParsedImport {
  /** Payload sẵn sàng gửi backend (đã đổi tên -> id với trường tham chiếu). */
  payloads: Record<string, unknown>[];
  /** Lỗi theo từng dòng, để báo đúng chỗ thay vì báo chung chung. */
  errors: string[];
}

/**
 * Đọc file Excel thành payload.
 *
 * @param lookups map: key trường -> (tên -> id) cho các trường tham chiếu
 *                danh mục khác.
 */
export async function parseCatalogExcel(
  config: CatalogConfig,
  file: File,
  lookups: Record<string, Map<string, number>>,
): Promise<ParsedImport> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  // Ưu tiên sheet tên "DuLieu"; không có thì lấy sheet đầu.
  const sheetName = wb.SheetNames.includes("DuLieu")
    ? "DuLieu"
    : wb.SheetNames[0];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets[sheetName],
  );

  const payloads: Record<string, unknown>[] = [];
  const errors: string[] = [];
  // Cột chỉ đọc không có trong file nên cũng không được đọc ra payload.
  const fields = config.fields.filter((f) => !f.readOnly);
  const seenCodes = new Set<string>();
  // `uniqueCodeKey === null` nghĩa là danh mục KHÔNG có mã duy nhất — bỏ hẳn
  // bước chặn trùng thay vì mặc định lấy cột đầu.
  const codeField =
    config.uniqueCodeKey === null
      ? undefined
      : config.uniqueCodeKey
        ? fields.find((f) => f.key === config.uniqueCodeKey)
        : fields[0];

  raw.forEach((r, i) => {
    const lineNo = i + 2; // +1 vì 0-based, +1 vì dòng tiêu đề
    const payload: Record<string, unknown> = {};
    let rowHasError = false;

    for (const f of fields) {
      const value = String(r[headerOf(f)] ?? "").trim();

      if (f.required && !value) {
        errors.push(`Dòng ${lineNo}: thiếu "${f.label}".`);
        rowHasError = true;
        continue;
      }

      if (f.optionsPath) {
        if (!value) {
          payload[f.key] = null;
          continue;
        }
        const id = lookups[f.key]?.get(value.toLowerCase());
        if (id === undefined) {
          errors.push(
            `Dòng ${lineNo}: "${f.label}" = "${value}" không có trong danh mục.`,
          );
          rowHasError = true;
          continue;
        }
        payload[f.key] = id;
      } else if (f.type === "number") {
        if (!value) {
          payload[f.key] = null;
        } else {
          // Excel tiếng Việt hay dùng dấu phẩy thập phân; gửi thẳng chuỗi
          // "2,25" lên backend sẽ hỏng khi parse BigDecimal.
          const num = Number(value.replace(",", "."));
          if (Number.isNaN(num)) {
            errors.push(`Dòng ${lineNo}: "${f.label}" = "${value}" không phải số.`);
            rowHasError = true;
            continue;
          }
          payload[f.key] = num;
        }
      } else if (f.type === "date") {
        payload[f.key] = value ? toIsoDate(value) : null;
        if (value && payload[f.key] === null) {
          errors.push(
            `Dòng ${lineNo}: "${f.label}" = "${value}" không phải ngày hợp lệ (dùng dd/MM/yyyy hoặc yyyy-MM-dd).`,
          );
          rowHasError = true;
        }
      } else {
        payload[f.key] = value;
      }
    }

    // Trùng mã ngay trong file — DB không bắt được khi insert cùng một lô.
    if (codeField) {
      const code = String(r[headerOf(codeField)] ?? "").trim();
      if (code) {
        const lower = code.toLowerCase();
        if (seenCodes.has(lower)) {
          errors.push(`Dòng ${lineNo}: mã "${code}" bị trùng trong file.`);
          rowHasError = true;
        }
        seenCodes.add(lower);
      }
    }

    if (!rowHasError) payloads.push({ ...payload, ...(config.fixedValues ?? {}) });
  });

  if (raw.length === 0) {
    errors.push(
      `File không có dòng dữ liệu nào (sheet "${sheetName}"). Kiểm tra lại dòng tiêu đề.`,
    );
  }

  return { payloads, errors };
}
