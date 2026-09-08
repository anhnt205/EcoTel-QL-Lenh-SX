import React from "react";
import { Plus, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModalFooterActionsProps {
  mode: "add" | "edit";
  sessionsCount: number;
  isSaving?: boolean;
  onCancel: () => void;
  onSaveAndNew: () => void;
  onSave: () => void;
}

export const ModalFooterActions: React.FC<ModalFooterActionsProps> = ({
  mode,
  sessionsCount,
  isSaving = false,
  onCancel,
  onSaveAndNew,
  onSave,
}) => {
  return (
    <>
      <Button
        variant="outline"
        onClick={onCancel}
        className="h-9 text-sm px-4 gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-100"
      >
        <XCircle className="w-4 h-4" />
        Hủy bỏ
      </Button>

      {mode === "add" && (
        <Button
          variant="outline"
          disabled={isSaving}
          onClick={onSaveAndNew}
          className="h-9 text-sm px-4 gap-1.5 border-blue-500 text-blue-700 hover:bg-blue-50 font-semibold"
        >
          <Plus className="w-4 h-4" />
          {isSaving
            ? "Đang lưu..."
            : sessionsCount > 1
              ? `Lưu & Thêm mới (${sessionsCount} bản ghi) (F2)`
              : "Lưu & Thêm mới (F2)"}
        </Button>
      )}

      <Button
        disabled={isSaving}
        onClick={onSave}
        className="h-9 text-sm px-6 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md transition-all"
      >
        <Save className="w-4 h-4" />
        {isSaving
          ? "Đang lưu..."
          : mode === "add"
            ? sessionsCount > 1
              ? `Lưu và gửi (${sessionsCount} bản ghi) (F5)`
              : "Lưu và gửi (F5)"
            : sessionsCount > 1
              ? `Lưu (${sessionsCount} bản ghi) (F5)`
              : "Lưu bản ghi (F5)"}
      </Button>
    </>
  );
};
