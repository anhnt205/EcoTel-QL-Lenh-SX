import { elementToCsv, tableToRows, gridToRows } from "./exportCsv";

const html = (markup: string) => {
  const root = document.createElement("div");
  root.innerHTML = markup;
  document.body.appendChild(root);
  return root;
};

describe("tableToRows", () => {
  it("trải đúng colSpan và rowSpan", () => {
    const root = html(`
      <table>
        <tr><th rowspan="2">STT</th><th colspan="2">Sản lượng</th></tr>
        <tr><th>Ca 1</th><th>Ca 2</th></tr>
        <tr><td>1</td><td>10</td><td>20</td></tr>
      </table>`);
    const rows = tableToRows(root.querySelector("table") as HTMLTableElement);
    expect(rows).toEqual([
      ["STT", "Sản lượng", ""],
      ["", "Ca 1", "Ca 2"],
      ["1", "10", "20"],
    ]);
  });
});

describe("elementToCsv", () => {
  it("dùng dấu ; và bọc ngoặc kép khi ô có ; \" hoặc xuống dòng", () => {
    const root = html(`<table><tr><td>a;b</td><td>nói "x"</td><td>ok</td></tr></table>`);
    const res = elementToCsv(root);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.csv).toBe('"a;b";"nói ""x""";ok');
  });

  it("chặn công thức Excel (=, @) ở đầu ô", () => {
    const root = html(`<table><tr><td>=1+1</td><td>-5</td></tr></table>`);
    const res = elementToCsv(root);
    expect(res.ok && res.csv).toBe("'=1+1;-5");
  });

  it("báo lỗi rõ khi không có bảng nào", () => {
    const res = elementToCsv(html(`<p>không có bảng</p>`));
    expect(res.ok).toBe(false);
  });

  it("từ chối xuất khi DataGrid bị ẩn bớt cột (aria-colcount lớn hơn số ô đang hiển thị)", () => {
    const root = html(`
      <div role="grid" aria-colcount="3" aria-rowcount="2">
        <div role="row"><div role="columnheader">A</div><div role="columnheader">B</div></div>
        <div role="row"><div role="gridcell">1</div><div role="gridcell">2</div></div>
      </div>`);
    const grid = gridToRows(root.querySelector('[role="grid"]') as HTMLElement);
    expect(grid.incomplete).toBe(true);
    expect(elementToCsv(root).ok).toBe(false);
  });

  it("xuất DataGrid đầy đủ", () => {
    const root = html(`
      <div role="grid" aria-colcount="2" aria-rowcount="2">
        <div role="row"><div role="columnheader">Số xe</div><div role="columnheader">Ghi chú</div></div>
        <div role="row"><div role="gridcell">XE-01</div><div role="gridcell">tốt</div></div>
      </div>`);
    const res = elementToCsv(root);
    expect(res.ok && res.csv).toBe("Số xe;Ghi chú\r\nXE-01;tốt");
  });
});
