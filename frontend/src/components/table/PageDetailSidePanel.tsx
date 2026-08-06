import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface PageDetailSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  width?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared slide-in side panel for row detail display on table pages.
 * Animates from the right when `isOpen` is true.
 */
export const PageDetailSidePanel: React.FC<PageDetailSidePanelProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 480,
  children,
  className,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          key="side-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className={cn(
            "shrink-0 flex flex-col h-full min-h-0 border-l border-border/60 bg-card shadow-xl overflow-hidden",
            className,
          )}
          style={{ width }}
        >
          <div
            style={{ width }}
            className="flex flex-col h-full min-h-0 shrink-0 overflow-hidden"
          >
            {/* Panel Header */}
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/50 bg-muted/30 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground leading-snug">
                  {title}
                </div>
                {subtitle && (
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {subtitle}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Panel Body */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-4 py-3 space-y-4">{children}</div>
            </ScrollArea>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default PageDetailSidePanel;
