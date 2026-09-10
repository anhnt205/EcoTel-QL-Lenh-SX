import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { PositionPermissionItem } from "@/types";
import { PERMISSION_FEATURE_GROUPS, type PermissionFeatureGroup } from "@/constants/permission-features";

/**
 * Bảng ma trận quyền C/R/U/D/A dùng chung cho Chức vụ (`PositionFormModal`)
 * VÀ Tài khoản (`UserFormModal`) — chủ dự án chốt 2026-09-10: tài khoản cần
 * phân quyền chi tiết riêng từng cái (2 tài khoản cùng Chức vụ vẫn có thể
 * set CRUD khác nhau), nên cả 2 modal cùng cần y hệt 1 bảng này — tách ra
 * để không chép tay 2 nơi, sửa 1 nơi quên nơi kia.
 */

export type PermissionAction = keyof Omit<PositionPermissionItem, "resource">;

export const PERMISSION_ACTION_COLUMNS: { key: PermissionAction; label: string }[] = [
  { key: "c", label: "Thêm" },
  { key: "r", label: "Xem" },
  { key: "u", label: "Sửa" },
  { key: "d", label: "Xóa" },
  { key: "a", label: "Duyệt" },
];

export const emptyPermissionItem = (resource: string): PositionPermissionItem => ({
  resource,
  c: false,
  r: false,
  u: false,
  d: false,
  a: false,
});

interface Props {
  /** Tập resource được phép hiện — thường là `department.allowedResources` (khi sửa Chức vụ)
   *  hoặc `position.permissions` đã có (khi sửa Tài khoản, chỉ hiện đúng chức năng Chức vụ đó có). */
  allowedResources: Set<string>;
  permissionMap: Record<string, PositionPermissionItem>;
  onToggle: (resource: string, action: PermissionAction, checked: boolean) => void;
  emptyMessage?: ReactNode;
}

export function PermissionMatrixTable({ allowedResources, permissionMap, onToggle, emptyMessage }: Props) {
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
            colSpan={1 + PERMISSION_ACTION_COLUMNS.length}
            className={depth > 0 ? "px-3 py-1 pl-6 text-xs font-semibold text-muted-foreground" : "px-3 py-1.5 text-sm font-semibold"}
          >
            {group.label}
          </td>
        </tr>
        {visibleItems.map((item, idx) => {
          const perm = permissionMap[item.resource] ?? emptyPermissionItem(item.resource);
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
              {PERMISSION_ACTION_COLUMNS.map((a) => (
                <td key={a.key} className="px-2 py-1.5 text-center">
                  <Checkbox
                    checked={perm[a.key]}
                    onCheckedChange={(v) => onToggle(item.resource, a.key, v === true)}
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

  if (allowedResources.size === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        {emptyMessage ?? "Chưa có chức năng nào để phân quyền."}
      </p>
    );
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-200 dark:bg-gray-800">
          <tr className="border-b border-gray-300 dark:border-gray-700">
            <th className="px-3 py-2 text-left font-semibold">Chức năng</th>
            {PERMISSION_ACTION_COLUMNS.map((a) => (
              <th key={a.key} className="px-2 py-2 text-center font-semibold">
                {a.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{PERMISSION_FEATURE_GROUPS.map((group) => renderGroupRows(group, 0))}</tbody>
      </table>
    </div>
  );
}
