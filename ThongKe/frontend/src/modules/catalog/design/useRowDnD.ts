import { useState } from "react";
import type React from "react";

/**
 * Kéo thả để đổi vị trí HÀNG của bảng nhập (HTML5 drag & drop, không thêm thư viện).
 *
 * Dùng:
 *   const dnd = useRowDnD((from, to) => ...đổi chỗ phần tử `from` sang vị trí `to` của mảng nguồn...);
 *   <tr key=… {...dnd.rowProps(index)}> … <span className="dnd-handle" {...dnd.handleProps(index)}><DIcon name="grip" /></span> …</tr>
 *
 * Chỉ kéo được bằng tay nắm (`handleProps`); cả hàng làm "ảnh kéo". Hàng đích hiện vạch xanh ở mép TRÊN (kéo lên) hoặc mép DƯỚI (kéo xuống);
 * hàng đang kéo mờ đi. Class dùng chung: `dnd-handle`, `dnd-dragging`, `dnd-over-before`, `dnd-over-after` (styles/catalog-design.css).
 * `move` có thể đổi tham chiếu mỗi lần render — hook luôn gọi bản mới nhất lúc thả.
 */
export function useRowDnD(move: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const clear = () => {
    setDrag(null);
    setOver(null);
  };

  return {
    /** Tay nắm kéo — đặt trên một phần tử (vd biểu tượng ⋮⋮ ở ô STT). */
    handleProps: (index: number) => ({
      draggable: true as const,
      onDragStart: (e: React.DragEvent<HTMLElement>) => {
        setDrag(index);
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(index));
          const row = (e.currentTarget as HTMLElement).closest("tr");
          if (row) e.dataTransfer.setDragImage(row, 16, 16);
        } catch {
          /* trình duyệt không cho đặt ảnh kéo: dùng ảnh mặc định */
        }
      },
      onDragEnd: clear,
    }),
    /** Thuộc tính của `<tr>` — nhận thả và hiện vạch đích. */
    rowProps: (index: number) => ({
      className:
        [
          drag === index ? "dnd-dragging" : "",
          drag !== null && over === index && drag !== index ? (drag > index ? "dnd-over-before" : "dnd-over-after") : "",
        ]
          .filter(Boolean)
          .join(" ") || undefined,
      onDragOver: (e: React.DragEvent<HTMLElement>) => {
        if (drag === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (over !== index) setOver(index);
      },
      onDrop: (e: React.DragEvent<HTMLElement>) => {
        if (drag === null) return;
        e.preventDefault();
        if (drag !== index) move(drag, index);
        clear();
      },
    }),
    dragging: drag !== null,
  };
}

/** Chuyển phần tử `from` tới vị trí `to` của mảng (không sửa mảng gốc). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}
