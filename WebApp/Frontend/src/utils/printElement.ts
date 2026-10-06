// In đúng 1 phần tử của trang: tạm ẩn (display:none khi in) mọi phần tử anh em dọc
// theo đường từ phần tử đó lên gốc, rồi gọi window.print(). Người dùng chọn
// "Lưu thành PDF" trong hộp thoại in để xuất PDF.
// Quy tắc CSS đi kèm: [data-print-hide] { display: none } trong @media print
// (khai báo bằng GlobalStyles ở trang dùng hàm này).
export function printElement(el: HTMLElement) {
  const hidden: HTMLElement[] = [];
  let node: HTMLElement | null = el;
  while (node && node.parentElement) {
    const parent: HTMLElement = node.parentElement;
    Array.from(parent.children).forEach((sibling) => {
      if (
        sibling !== node &&
        sibling instanceof HTMLElement &&
        !["SCRIPT", "STYLE", "LINK"].includes(sibling.tagName) &&
        !sibling.hasAttribute("data-print-hide")
      ) {
        sibling.setAttribute("data-print-hide", "1");
        hidden.push(sibling);
      }
    });
    node = parent;
  }

  const cleanup = () => {
    hidden.forEach((h) => h.removeAttribute("data-print-hide"));
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}
