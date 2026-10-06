// Xuất CSV từ chính bản xem trước đang hiển thị (bảng <table> hoặc DataGrid của
// MUI). File Excel chính thức vẫn do backend sinh ra (nút "Excel"); CSV chỉ là
// bản sao nhanh của những gì đang thấy trên màn hình.

export type CsvResult =
  | { ok: true; csv: string; tables: number }
  | { ok: false; reason: string };

const clean = (el: Element) =>
  (el.textContent ?? "").replace(/ /g, " ").replace(/\s+/g, " ").trim();

// <table> -> mảng 2 chiều, trải đúng colSpan/rowSpan (ô gộp chỉ giữ giá trị ở ô đầu).
export function tableToRows(table: HTMLTableElement): string[][] {
  const rows: string[][] = [];
  const carry: Record<number, number> = {}; // cột -> số hàng còn bị rowSpan chiếm
  Array.from(table.rows).forEach((tr) => {
    const row: string[] = [];
    let col = 0;
    const skipOccupied = () => {
      while (carry[col] > 0) {
        row[col] = "";
        carry[col]--;
        col++;
      }
    };
    Array.from(tr.cells).forEach((cell) => {
      skipOccupied();
      const colSpan = cell.colSpan || 1;
      const rowSpan = cell.rowSpan || 1;
      for (let i = 0; i < colSpan; i++) {
        row[col + i] = i === 0 ? clean(cell) : "";
        if (rowSpan > 1) carry[col + i] = rowSpan - 1;
      }
      col += colSpan;
    });
    skipOccupied();
    rows.push(Array.from(row, (c) => c ?? ""));
  });
  return rows;
}

const CELL_ROLES = ["columnheader", "gridcell", "cell", "rowheader"];

// DataGrid (role="grid") -> mảng 2 chiều. DataGrid ảo hoá cột/hàng nên đối chiếu
// với aria-colcount / aria-rowcount: thiếu thì báo incomplete thay vì xuất sai.
export function gridToRows(grid: HTMLElement): {
  rows: string[][];
  incomplete: boolean;
} {
  const rows: string[][] = [];
  let headerRows = 0;
  let dataRows = 0;
  grid.querySelectorAll<HTMLElement>('[role="row"]').forEach((rowEl) => {
    const cells = Array.from(rowEl.children).filter((c) =>
      CELL_ROLES.includes(c.getAttribute("role") ?? ""),
    );
    if (cells.length === 0) return;
    if (cells.some((c) => c.getAttribute("role") === "columnheader")) {
      headerRows++;
    } else {
      dataRows++;
    }
    rows.push(cells.map(clean));
  });

  const colCount = Number(grid.getAttribute("aria-colcount"));
  const rowCount = Number(grid.getAttribute("aria-rowcount"));
  const widest = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const missingCols = Number.isFinite(colCount) && colCount > 0 && widest < colCount;
  const missingRows =
    Number.isFinite(rowCount) && rowCount > 0 && headerRows + dataRows < rowCount;
  return { rows, incomplete: missingCols || missingRows };
}

const SEP = ";"; // Excel bản tiếng Việt dùng dấu ; làm dấu phân cách cột

const quote = (value: string) => {
  // Chặn công thức Excel bị kích hoạt từ nội dung ô (CSV injection).
  const safe = /^[=@]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function elementToCsv(root: HTMLElement): CsvResult {
  const blocks: string[][][] = [];
  let incomplete = false;

  root.querySelectorAll<HTMLElement>('table, [role="grid"]').forEach((el) => {
    if (el.tagName === "TABLE") {
      if (el.closest('[role="grid"]')) return;
      blocks.push(tableToRows(el as HTMLTableElement));
    } else {
      const grid = gridToRows(el);
      if (grid.incomplete) incomplete = true;
      blocks.push(grid.rows);
    }
  });

  const nonEmpty = blocks.filter((b) => b.length > 0);
  if (nonEmpty.length === 0) {
    return { ok: false, reason: "Bản xem trước chưa có bảng dữ liệu để xuất CSV" };
  }
  if (incomplete) {
    return {
      ok: false,
      reason:
        "Bảng đang bị ẩn bớt cột/dòng nên CSV sẽ không đầy đủ — hãy dùng nút Excel",
    };
  }

  const csv = nonEmpty
    .map((rows) =>
      rows.map((r) => r.map(quote).join(SEP)).join("\r\n"),
    )
    .join("\r\n\r\n");
  return { ok: true, csv, tables: nonEmpty.length };
}

export function downloadCsv(filename: string, csv: string) {
  // BOM để Excel nhận đúng UTF-8 (tiếng Việt có dấu).
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[\\/:*?"<>|]/g, "-");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
