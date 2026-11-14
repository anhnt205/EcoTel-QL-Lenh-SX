import React from "react";
import { createPortal } from "react-dom";
import "../../styles/catalog-design.css";
import DIcon from "./DIcon";

/**
 * Cửa sổ Thêm mới / Chỉnh sửa theo THIẾT KẾ (nền mờ, bo 14px, tiêu đề + mô tả, chân Hủy / Xác nhận).
 * Nội dung (`children`) là biểu mẫu riêng của từng trang. Vẽ ra `document.body` để không bị menu/banner che.
 */
export default function DesignModal({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  busy,
  wide,
  onClose,
  onConfirm,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
  /** rộng hơn mặc định (biểu mẫu nhiều trường / danh sách chọn) */
  wide?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  // Phóng to / thu nhỏ cửa sổ để nhập liệu thuận tiện; mở lần sau về lại cỡ thường
  const [maxed, setMaxed] = React.useState(false);
  React.useEffect(() => {
    if (!open) setMaxed(false);
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div
      className="tkc-modal-overlay"
      style={maxed ? { padding: 0 } : undefined}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={
          maxed
            ? { width: "100%", height: "100%", maxHeight: "100%", borderRadius: 0 }
            : wide
              ? { width: "min(960px, 100%)" }
              : { width: "min(720px, 100%)" }
        }
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button
            className="close-modal"
            style={{ marginLeft: "auto", marginRight: 6 }}
            aria-label={maxed ? "Thu nhỏ cửa sổ" : "Phóng to cửa sổ"}
            title={maxed ? "Thu nhỏ cửa sổ" : "Phóng to cửa sổ"}
            onClick={() => setMaxed((v) => !v)}
          >
            <DIcon name={maxed ? "minimize" : "maximize"} />
          </button>
          <button className="close-modal" aria-label="Đóng" onClick={onClose}>
            <DIcon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
