import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Info, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "primary" | "warning";
  icon?: "warning" | "info" | "success";
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "Xác nhận",
    cancelText: "Hủy bỏ",
    variant: "destructive",
    icon: "warning",
    onConfirm: () => {},
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        ...options,
        confirmText: options.confirmText ?? "Xác nhận",
        cancelText: options.cancelText ?? "Hủy bỏ",
        variant: options.variant ?? "destructive",
        icon: options.icon ?? "warning",
        isOpen: true,
        onConfirm: () => {
          setDialogState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setDialogState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (dialogState.onCancel) {
        dialogState.onCancel();
      }
      setDialogState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const renderIcon = () => {
    switch (dialogState.icon) {
      case "info":
        return <Info className="h-6 w-6 text-blue-500 shrink-0" />;
      case "success":
        return <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />;
      case "warning":
      default:
        return (
          <AlertTriangle className="h-6 w-6 text-amber-500 dark:text-amber-400 shrink-0" />
        );
    }
  };

  const iconBgClass =
    dialogState.icon === "info"
      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200/50 dark:border-blue-900/50"
      : dialogState.icon === "success"
      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-900/50"
      : "bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-900/50";

  const ConfirmDialogComponent = (
    <AlertDialog open={dialogState.isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-[440px] rounded-2xl p-6 bg-background border border-border shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl border", iconBgClass)}>
              {renderIcon()}
            </div>
            <AlertDialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              {dialogState.title}
            </AlertDialogTitle>
          </div>
          {dialogState.description && (
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
              {dialogState.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-row items-center justify-end gap-2 sm:gap-3">
          <AlertDialogCancel
            onClick={dialogState.onCancel}
            className="rounded-xl px-4 py-2 text-sm cursor-pointer"
          >
            {dialogState.cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={dialogState.onConfirm}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all shadow-xs cursor-pointer",
              dialogState.variant === "primary" &&
                "bg-blue-600 text-white hover:bg-blue-700",
              dialogState.variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              dialogState.variant === "warning" &&
                "bg-amber-600 text-white hover:bg-amber-700",
            )}
          >
            {dialogState.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return {
    confirm,
    ConfirmDialogComponent,
  };
}

/* Controlled Dialog Component Export */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: "destructive" | "primary" | "warning";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  onConfirm,
  loading = false,
  variant = "destructive",
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[440px] rounded-2xl p-6 bg-background border border-border shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/50">
              <AlertTriangle className="h-6 w-6 text-amber-500 dark:text-amber-400 shrink-0" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </AlertDialogTitle>
          </div>
          {description && (
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed pt-1">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-row items-center justify-end gap-2 sm:gap-3">
          <AlertDialogCancel
            disabled={loading}
            className="rounded-xl px-4 py-2 text-sm"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-all shadow-xs cursor-pointer",
              variant === "destructive" &&
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              variant === "primary" &&
                "bg-primary text-primary-foreground hover:bg-primary/90",
              variant === "warning" &&
                "bg-amber-600 text-white hover:bg-amber-700",
            )}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmDialog;
