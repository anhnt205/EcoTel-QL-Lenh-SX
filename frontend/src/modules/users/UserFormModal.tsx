import { useEffect, useMemo, useState } from "react";
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
import type { PositionPermissionItem, User } from "@/types";
import {
  PermissionMatrixTable,
  emptyPermissionItem,
  type PermissionAction,
} from "@/components/permissions/PermissionMatrixTable";

interface Props {
  open: boolean;
  editing: User | null;
  onClose: () => void;
  onSaved: () => void;
}

type PermissionMap = Record<string, PositionPermissionItem>;

const toPermissionMap = (items: PositionPermissionItem[] | undefined): PermissionMap => {
  const map: PermissionMap = {};
  (items ?? []).forEach((p) => {
    map[p.resource] = p;
  });
  return map;
};

export function UserFormModal({ open, editing, onClose, onSaved }: Props) {
  const isEdit = editing !== null;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [salaryCode, setSalaryCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [positionId, setPositionId] = useState("");
  const [active, setActive] = useState(true);
  const [permissionMap, setPermissionMap] = useState<PermissionMap>({});
  const [saving, setSaving] = useState(false);

  const { data: positionsPage } = useQuery({
    queryKey: ["positions-for-user-select"],
    queryFn: () => PositionService.getAll({ page: 0, size: 200, sort: "name,ASC" }),
    enabled: open,
    staleTime: 60 * 1000,
  });
  const positions = positionsPage?.content ?? [];
  const selectedPosition = positions.find((p) => String(p.id) === positionId);
  // Chọn Chức vụ thì chỉ được phân quyền trong đúng tập chức năng Chức vụ đó
  // ĐÃ CÓ (không phải toàn bộ trần của Phòng ban) — đúng nghĩa "hiện phân
  // quyền của chức vụ ấy ra" rồi mới cho sửa riêng cho tài khoản.
  const allowedResources = useMemo(
    () => new Set((selectedPosition?.permissions ?? []).map((p) => p.resource)),
    [selectedPosition],
  );

  useEffect(() => {
    if (!open) return;
    setUsername(editing?.username ?? "");
    setPassword("");
    setSalaryCode(editing?.salaryCode ?? "");
    setFullName(editing?.fullName ?? "");
    setPositionId(editing?.positionId ? String(editing.positionId) : "");
    setActive(editing?.active ?? true);
    // Sửa tài khoản đã có quyền riêng -> hiện đúng quyền đã lưu. Tạo mới
    // (hoặc tài khoản cũ chưa từng set riêng) -> để trống, chờ effect dưới
    // tự điền theo Chức vụ ngay khi có danh sách Chức vụ.
    setPermissionMap(toPermissionMap(editing?.permissions));
  }, [open, editing]);

  // Chọn/đổi Chức vụ (kể cả lần đầu load form sửa) thì hiện SẴN quyền của
  // Chức vụ đó ra để làm gợi ý — chủ dự án chốt 2026-09-10 (lượt 2): "Khi
  // tạo tài khoản chọn chức vụ thì cho hiện các phân quyền của chức vụ ấy
  // ra". Chỉ tự điền khi tài khoản CHƯA có quyền riêng nào (tạo mới, hoặc
  // sửa tài khoản đang thừa kế) — không ghi đè quyền riêng đã có sẵn của
  // tài khoản đang sửa.
  useEffect(() => {
    if (!open || !selectedPosition) return;
    setPermissionMap((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      return toPermissionMap(selectedPosition.permissions);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedPosition?.id]);

  // Đổi sang Chức vụ khác thì bỏ các quyền đã tick cho resource KHÔNG còn
  // nằm trong tập chức năng Chức vụ mới, và điền sẵn quyền của Chức vụ mới
  // cho các resource chưa từng đụng tới trong phiên sửa này.
  const handlePositionChange = (value: string) => {
    setPositionId(value);
    const pos = positions.find((p) => String(p.id) === value);
    setPermissionMap(toPermissionMap(pos?.permissions));
  };

  const togglePermission = (resource: string, action: PermissionAction, checked: boolean) => {
    setPermissionMap((prev) => {
      const current = prev[resource] ?? emptyPermissionItem(resource);
      return { ...prev, [resource]: { ...current, [action]: checked } };
    });
  };

  const permissionsList = useMemo(
    () => Object.values(permissionMap).filter((p) => p.c || p.r || p.u || p.d || p.a),
    [permissionMap],
  );

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
          permissions: permissionsList,
        });
        toast.success("Đã cập nhật tài khoản");
      } else {
        await UserService.create({
          username: username.trim(),
          password: password.trim(),
          salaryCode: salaryCode.trim(),
          fullName: fullName.trim(),
          positionId: Number(positionId),
          permissions: permissionsList,
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
        className="max-w-3xl"
        windowTitle={isEdit ? `Sửa tài khoản — ${editing?.username}` : "Tạo tài khoản"}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa tài khoản" : "Tạo tài khoản"}</DialogTitle>
          <DialogDescription>
            Chọn Chức vụ — Phòng ban tự suy ra, phân quyền hiện sẵn theo Chức vụ nhưng có thể sửa
            riêng cho tài khoản này (2 tài khoản cùng Chức vụ vẫn có thể có quyền khác nhau).
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
            <Select value={positionId} onValueChange={handlePositionChange}>
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

        <div className="space-y-1.5">
          <Label>Phân quyền theo chức năng</Label>
          {!positionId ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Chọn Chức vụ trước để hiện sẵn phân quyền của Chức vụ đó, có thể sửa riêng cho tài
              khoản này.
            </p>
          ) : (
            <PermissionMatrixTable
              allowedResources={allowedResources}
              permissionMap={permissionMap}
              onToggle={togglePermission}
              emptyMessage="Chức vụ này chưa được set quyền trên chức năng nào — vào Danh mục Chức vụ để set trước."
            />
          )}
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
