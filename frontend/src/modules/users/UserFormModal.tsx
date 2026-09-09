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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PositionService from "@/modules/positions/services/positionService";
import UserService from "./services/userService";
import type { User } from "@/types";

interface Props {
  open: boolean;
  editing: User | null;
  onClose: () => void;
  onSaved: () => void;
}

export function UserFormModal({ open, editing, onClose, onSaved }: Props) {
  const isEdit = editing !== null;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [salaryCode, setSalaryCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [positionId, setPositionId] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const { data: positionsPage } = useQuery({
    queryKey: ["positions-for-user-select"],
    queryFn: () => PositionService.getAll({ page: 0, size: 200, sort: "name,ASC" }),
    enabled: open,
    staleTime: 60 * 1000,
  });
  const positions = positionsPage?.content ?? [];
  const selectedPosition = positions.find((p) => String(p.id) === positionId);

  useEffect(() => {
    if (!open) return;
    setUsername(editing?.username ?? "");
    setPassword("");
    setSalaryCode(editing?.salaryCode ?? "");
    setFullName(editing?.fullName ?? "");
    setPositionId(editing?.positionId ? String(editing.positionId) : "");
    setActive(editing?.active ?? true);
  }, [open, editing]);

  const handleSubmit = async () => {
    if (!fullName.trim() || !salaryCode.trim() || !positionId) {
      toast.error("Vui lòng nhập đủ Họ tên, Số thẻ lương và chọn Chức vụ");
      return;
    }
    if (!isEdit && (!username.trim() || !password.trim())) {
      toast.error("Vui lòng nhập đủ Tên đăng nhập và Mật khẩu");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && editing?.id) {
        await UserService.update(editing.id, {
          salaryCode: salaryCode.trim(),
          fullName: fullName.trim(),
          positionId: Number(positionId),
          active,
          password: password.trim() || undefined,
        });
        toast.success("Đã cập nhật tài khoản");
      } else {
        await UserService.create({
          username: username.trim(),
          password: password.trim(),
          salaryCode: salaryCode.trim(),
          fullName: fullName.trim(),
          positionId: Number(positionId),
        });
        toast.success("Đã tạo tài khoản");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lưu tài khoản thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg"
        windowTitle={isEdit ? `Sửa tài khoản — ${editing?.username}` : "Tạo tài khoản"}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa tài khoản" : "Tạo tài khoản"}</DialogTitle>
          <DialogDescription>
            Chọn Chức vụ — Phòng ban sẽ tự suy ra theo Chức vụ, không chọn tay.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-username">Tên đăng nhập *</Label>
            <Input
              id="user-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-password">
              Mật khẩu {isEdit ? "(để trống nếu không đổi)" : "*"}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="user-salary-code">Số thẻ lương *</Label>
            <Input id="user-salary-code" value={salaryCode} onChange={(e) => setSalaryCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-fullname">Họ và tên *</Label>
            <Input id="user-fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Chức vụ *</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn chức vụ…" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Phòng ban</Label>
            <Input value={selectedPosition?.departmentName ?? "—"} disabled />
          </div>
        </div>

        {isEdit && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} />
            Tài khoản đang hoạt động
          </label>
        )}

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
