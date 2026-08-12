import React from "react";

interface FormTabNavigationOptions {
  /** Hàm callback được gọi khi Tab/Enter ở ô cuối cùng (để tự động thêm dòng mới) */
  onAddNewRow?: () => void;
  /** Custom CSS selector cho các ô nhập liệu được phép nhảy focus (mặc định chọn input, select, combobox) */
  selector?: string;
}

/**
 * Hook điều hướng con trỏ (focus) giữa các ô nhập liệu bằng phím Tab và Enter.
 * Hỗ trợ Shift + Tab để lùi lại và tự động gọi onAddNewRow khi ở ô cuối cùng.
 */
export function useFormTabNavigation(options?: FormTabNavigationOptions) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" && e.key !== "Enter") return;

    const target = e.target as HTMLElement;

    // Không can thiệp nút bấm (Button) hoặc textarea khi nhấn Enter
    if (
      e.key === "Enter" &&
      (target.tagName === "BUTTON" || target.tagName === "TEXTAREA")
    ) {
      return;
    }

    // ⚠️ QUAN TRỌNG: Select/Combobox (Radix/Base-UI) render dropdown qua Portal ra ngoài
    // DOM nhưng vẫn bubble sự kiện theo cây React lên tới đây. Nếu đang có
    // dropdown mở, phải để dropdown tự xử lý Enter/ArrowDown/ArrowUp để chọn
    // option — không được preventDefault hay tự đẩy focus, nếu không sẽ
    // không chọn được giá trị.
    const hasOpenPopover = document.querySelector(
      '[data-radix-popper-content-wrapper], [data-state="open"][role="listbox"], [cmdk-list], [role="listbox"][data-state="open"], [data-slot="combobox-content"]'
    );
    if (hasOpenPopover) return;

    // Fallback: nếu chính target đang mở dropdown (aria-expanded=true) cũng bỏ qua
    if (target.getAttribute("aria-expanded") === "true") return;

    const container = e.currentTarget;
    const inputSelector =
      options?.selector ||
      [
        'input:not([disabled]):not([readonly]):not([type="hidden"]):not([tabindex="-1"])',
        'select:not([disabled]):not([readonly]):not([tabindex="-1"])',
        'button[role="combobox"]:not([disabled]):not([tabindex="-1"])',
      ].join(", ");

    const dataInputs = Array.from(
      container.querySelectorAll<HTMLElement>(inputSelector),
    ).filter(
      (el) =>
        el.offsetWidth > 0 &&
        el.offsetHeight > 0 &&
        window.getComputedStyle(el).visibility !== "hidden",
    );

    const currentIndex = dataInputs.indexOf(target);

    if (currentIndex !== -1) {
      if (e.key === "Tab" && e.shiftKey) {
        if (currentIndex > 0) {
          e.preventDefault();
          dataInputs[currentIndex - 1].focus();
        }
      } else {
        if (currentIndex < dataInputs.length - 1) {
          e.preventDefault();
          dataInputs[currentIndex + 1].focus();
        } else if (currentIndex === dataInputs.length - 1) {
          e.preventDefault();
          if (options?.onAddNewRow) {
            options.onAddNewRow();
            setTimeout(() => {
              const updated = Array.from(
                container.querySelectorAll<HTMLElement>(inputSelector),
              ).filter(
                (el) =>
                  el.offsetWidth > 0 &&
                  el.offsetHeight > 0 &&
                  window.getComputedStyle(el).visibility !== "hidden",
              );
              if (updated.length > dataInputs.length) {
                updated[dataInputs.length]?.focus();
              }
            }, 80);
          }
        }
      }
    }
  };

  return { handleKeyDown };
}
