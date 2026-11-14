import * as XLSX from "xlsx";

/** So khớp không phân biệt hoa/thường, dấu tiếng Việt và dấu cách thừa. */
export const normText = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Tách một dòng chữ thành các ô: ưu tiên TAB (copy từ Excel), không có thì cách nhau từ 2 dấu cách trở lên (ảnh chụp). */
export const splitCells = (line: string): string[] => {
  const cells = (line.includes("\t") ? line.split("\t") : line.split(/\s{2,}/)).map((c) => c.trim());
  while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
  return cells;
};

/** Chữ (dán / kết quả đọc ảnh) → bảng ô; bỏ dòng trống. */
export const textToCells = (text: string): string[][] =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim() !== "")
    .map(splitCells);

/** File Excel/CSV (trang đầu) → bảng ô; bỏ dòng trống. */
export async function excelToCells(file: File): Promise<string[][]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  return data
    .map((r) => {
      const cells = r.map((c) => String(c ?? "").trim());
      while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
      return cells;
    })
    .filter((r) => r.length > 0);
}
