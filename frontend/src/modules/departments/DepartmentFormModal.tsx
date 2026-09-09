import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import DepartmentService from "./services/departmentService";
import type { Department } from "@/types";

interface Props {
  open: boolean;
  /** Bản ghi đang sửa; null = đang thêm mới. */
  editing: Department | null;
  onClose: () => void;
  onSaved: () => void;
}

export function DepartmentFormModal({ open, editing, onClose, onSaved }: Props) {
  const isEdit = editing !== null;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { data: availableResources = [] } = useQuery({
    queryKey: ["departments-available-resources"],
    queryFn: () => DepartmentService.getAvailableResources(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setSelectedResources(new Set(editing?.allowedResources ?? []));
  }, [open, editing]);

  const toggleResource = (resource: string, checked: boolean) => {
    setSelectedResources((prev) => {
      const next = new Set(prev);
      if (checked) next.add(resource);
      else next.delete(resource);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error("Vui lòng nhập đủ Mã và Tên phòng ban");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        allowedResources: Array.from(selectedResources),
      };
      if (isEdit && editing?.id) {
        await DepartmentService.update(editing.id, payload);
        toast.success("Đã cập nhật phòng ban");
      } else {
        await DepartmentService.create(payload);
        toast.success("Đã thêm phòng ban");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lưu phòng ban thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl"
        windowTitle={isEdit ? `Sửa phòng ban — ${editing?.name}` : "Thêm phòng ban"}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa phòng ban" : "Thêm phòng ban"}</DialogTitle>
          <DialogDescription>
            Chọn các chức năng phòng ban này được phép dùng — Chức vụ thuộc phòng ban chỉ được
            phân quyền chi tiết trong đúng tập chức năng đã chọn ở đây.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="dept-code">Mã phòng ban *</Label>
            <Input id="dept-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept-name">Tên phòng ban *</Label>
            <Input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dept-desc">Mô tả</Label>
          <Input id="dept-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Chức năng được phép dùng</Label>
          <div className="grid max-h-64 grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-3">
            {availableResources.map((resource) => (
              <label key={resource} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedResources.has(resource)}
                  onCheckedChange={(v) => toggleResource(resource, v === true)}
                />
                <span className="truncate" title={resource}>{resource}</span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
