import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import DepartmentService from "@/modules/departments/services/departmentService";
import PositionService from "./services/positionService";
import type { Position, PositionPermissionItem } from "@/types";
import { PERMISSION_FEATURE_GROUPS, type PermissionFeatureGroup } from "@/constants/permission-features";

interface Props {
  open: boolean;
  editing: Position | null;
  onClose: () => void;
  onSaved: () => void;
}

const ACTION_COLUMNS: { key: keyof Omit<PositionPermissionItem, "resource">; label: string }[] = [
  { key: "c", label: "Thêm" },
  { key: "r", label: "Xem" },
  { key: "u", label: "Sửa" },
  { key: "d", label: "Xóa" },
  { key: "a", label: "Duyệt" },
];

type PermissionMap = Record<string, PositionPermissionItem>;

const emptyPermission = (resource: string): PositionPermissionItem => ({
  resource,
  c: false,
  r: false,
  u: false,
  d: false,
  a: false,
});

export function PositionFormModal({ open, editing, onClose, onSaved }: Props) {
  const isEdit = editing !== null;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [permissionMap, setPermissionMap] = useState<PermissionMap>({});
  const [saving, setSaving] = useState(false);

  const { data: departmentsPage } = useQuery({
    queryKey: ["departments-for-position-select"],
    queryFn: () => DepartmentService.getAll({ page: 0, size: 100, sort: "name,ASC" }),
    enabled: open,
    staleTime: 60 * 1000,
  });
  const departments = departmentsPage?.content ?? [];
  const selectedDepartment = departments.find((d) => String(d.id) === departmentId);
  const allowedResources = useMemo(
    () => new Set(selectedDepartment?.allowedResources ?? []),
    [selectedDepartment],
  );

  useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? "");
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setDepartmentId(editing?.departmentId ? String(editing.departmentId) : "");
    const map: PermissionMap = {};
    (editing?.permissions ?? []).forEach((p) => {
      map[p.resource] = p;
    });
    setPermissionMap(map);
  }, [open, editing]);

  // Đổi phòng ban thì bỏ luôn các quyền đã tick cho resource KHÔNG còn nằm
  // trong tập chức năng phòng ban mới cho phép — tránh gửi lên quyền vượt
  // trần, backend sẽ từ chối nếu không lọc trước ở đây.
  const handleDepartmentChange = (value: string) => {
    setDepartmentId(value);
    const dept = departments.find((d) => String(d.id) === value);
    const allowed = new Set(dept?.allowedResources ?? []);
    setPermissionMap((prev) => {
      const next: PermissionMap = {};
      Object.entries(prev).forEach(([resource, perm]) => {
        if (allowed.has(resource)) next[resource] = perm;
      });
      return next;
    });
  };

  const toggleAction = (resource: string, action: keyof Omit<PositionPermissionItem, "resource">, checked: boolean) => {
    setPermissionMap((prev) => {
      const current = prev[resource] ?? emptyPermission(resource);
      return { ...prev, [resource]: { ...current, [action]: checked } };
    });
  };

  const permissionsList = useMemo(
    () => Object.values(permissionMap).filter((p) => p.c || p.r || p.u || p.d || p.a),
    [permissionMap],
  );

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) {
      toast.error("Vui lòng nhập đủ Mã và Tên chức vụ");
      return;
    }
    if (!departmentId) {
      toast.error("Vui lòng chọn Phòng ban");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        departmentId: Number(departmentId),
        permissions: permissionsList,
      };
      if (isEdit && editing?.id) {
        await PositionService.update(editing.id, payload);
        toast.success("Đã cập nhật chức vụ");
      } else {
        await PositionService.create(payload);
        toast.success("Đã thêm chức vụ");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Lưu chức vụ thất bại");
    } finally {
      setSaving(false);
    }
  };

  // Chỉ hiện đúng chức năng Phòng ban chủ quản đã cho phép — nhóm/mục nào
  // không có dòng nào thuộc `allowedResources` thì ẩn hẳn tiêu đề nhóm đó,
  // tránh 1 rừng tiêu đề rỗng không set được gì.
  const hasAnyAllowedItem = (group: PermissionFeatureGroup): boolean =>
    group.items.some((item) => allowedResources.has(item.resource)) ||
    (group.subGroups?.some(hasAnyAllowedItem) ?? false);

  const renderGroupRows = (group: PermissionFeatureGroup, depth: number): ReactNode => {
    if (!hasAnyAllowedItem(group)) return null;
    const visibleItems = group.items.filter((item) => allowedResources.has(item.resource));
    return (
      <>
        <tr key={`h-${depth}-${group.label}`} className="border-t bg-muted/30">
          <td
            colSpan={1 + ACTION_COLUMNS.length}
            className={depth > 0 ? "px-3 py-1 pl-6 text-xs font-semibold text-muted-foreground" : "px-3 py-1.5 text-sm font-semibold"}
          >
            {group.label}
          </td>
        </tr>
        {visibleItems.map((item, idx) => {
          const perm = permissionMap[item.resource] ?? emptyPermission(item.resource);
          return (
            <tr key={`${item.resource}-${idx}`} className="border-t">
              <td className="px-3 py-1.5 pl-6">
                {item.label}
                {item.sharedWith && (
                  <span className="block text-xs text-muted-foreground">
                    (cùng quyền với {item.sharedWith})
                  </span>
                )}
              </td>
              {ACTION_COLUMNS.map((a) => (
                <td key={a.key} className="px-2 py-1.5 text-center">
                  <Checkbox
                    checked={perm[a.key]}
                    onCheckedChange={(v) => toggleAction(item.resource, a.key, v === true)}
                  />
                </td>
              ))}
            </tr>
          );
        })}
        {group.subGroups?.map((sub) => renderGroupRows(sub, depth + 1))}
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-3xl"
        windowTitle={isEdit ? `Sửa chức vụ — ${editing?.name}` : "Thêm chức vụ"}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa chức vụ" : "Thêm chức vụ"}</DialogTitle>
          <DialogDescription>
            Chỉ được set quyền trong đúng tập chức năng mà Phòng ban chủ quản đã cho phép.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pos-code">Mã chức vụ *</Label>
            <Input id="pos-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pos-name">Tên chức vụ *</Label>
            <Input id="pos-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Phòng ban *</Label>
            <Select value={departmentId} onValueChange={handleDepartmentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn phòng ban…" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pos-desc">Mô tả</Label>
            <Input id="pos-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Phân quyền theo chức năng</Label>
          {!departmentId ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Chọn Phòng ban trước để hiện danh sách chức năng có thể phân quyền.
            </p>
          ) : allowedResources.size === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Phòng ban này chưa được cho phép dùng chức năng nào — vào Danh mục Phòng ban để tick trước.
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium">Chức năng</th>
                    {ACTION_COLUMNS.map((a) => (
                      <th key={a.key} className="px-2 py-2 text-center font-medium">
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{PERMISSION_FEATURE_GROUPS.map((group) => renderGroupRows(group, 0))}</tbody>
              </table>
            </div>
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
