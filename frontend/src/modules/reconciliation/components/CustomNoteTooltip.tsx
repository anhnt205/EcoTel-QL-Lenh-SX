import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageSquare } from "lucide-react";

interface CustomNoteTooltipProps {
  note?: string;
  title?: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/**
 * ponytail: Tooltip tự chế nhẹ nhàng bằng React Portal + Tailwind CSS,
 * không phụ thuộc Shadcn Tooltip, hiển thị ghi chú dạng text thuần túy thanh lịch,
 * không đóng khung bo viền rườm rà.
 */
export const CustomNoteTooltip: React.FC<CustomNoteTooltipProps> = ({
  note,
  title = "Ghi chú từ Thống kê:",
  children,
  side = "top",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 320;

    let left = rect.left + rect.width / 2;
    if (left - tooltipWidth / 2 < 10) {
      left = tooltipWidth / 2 + 10;
    } else if (left + tooltipWidth / 2 > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth / 2 - 10;
    }

    const computedSide = side === "top" && rect.top < 90 ? "bottom" : side;
    const top = computedSide === "top" ? rect.top - 8 : rect.bottom + 8;

    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      updatePosition();
      setIsOpen(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!note) return <>{children}</>;

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-flex items-center ${className}`}
    >
      {children}
      {isOpen &&
        coords &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform:
                side === "top" && coords.top > 90
                  ? "translate(-50%, -100%)"
                  : "translate(-50%, 0)",
              zIndex: 99999,
            }}
            className="w-80 max-w-[90vw] rounded-xl bg-white/98 dark:bg-gray-900/98 backdrop-blur-md px-4 py-3 shadow-2xl border border-gray-200 dark:border-gray-700/80 transition-all pointer-events-none select-none animate-in fade-in-0 zoom-in-95 duration-100"
          >
            <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400 text-sm mb-1.5">
              <MessageSquare className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>{title}</span>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {note}
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
};
