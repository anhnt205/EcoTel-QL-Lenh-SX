import React from "react";
import {
  Box,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { emptyRow, PermAction, PermRow, rowsToMap, setAction } from "../../permissions/access";
import { groupModules, useModules } from "../../permissions/useModules";

interface Props {
  value: PermRow[];
  onChange?: (next: PermRow[]) => void;
  /** Chỉ cho chọn các module này (phạm vi phòng ban). null/undefined = tất cả. */
  allowedKeys?: string[] | null;
  readOnly?: boolean;
  maxHeight?: number;
}

const COLS: { key: PermAction; label: string }[] = [
  { key: "c", label: "Thêm" },
  { key: "r", label: "Xem" },
  { key: "u", label: "Sửa" },
  { key: "d", label: "Xoá" },
];

// Bảng tick quyền Thêm/Xem/Sửa/Xoá (C/R/U/D) cho từng chức năng, nhóm theo menu. Bật Thêm/Sửa/Xoá tự bật Xem;
// tắt Xem tắt hết. Chức năng ngoài phạm vi phòng ban bị ẩn.
const PermissionMatrix = ({ value, onChange, allowedKeys, readOnly, maxHeight = 420 }: Props) => {
  const { data: modules = [] } = useModules();
  const map = rowsToMap(value);
  const visible = modules.filter((m) => !Array.isArray(allowedKeys) || allowedKeys.includes(m.key));
  const groups = groupModules(visible);

  const emit = (rows: Record<string, PermRow>) =>
    onChange?.(Object.values(rows).filter((r) => r.c || r.r || r.u || r.d));

  const set = (key: string, action: PermAction, on: boolean) => {
    const next = { ...map, [key]: setAction(map[key] || emptyRow(key), action, on) };
    emit(next);
  };
  const setGroup = (keys: string[], action: PermAction, on: boolean) => {
    const next = { ...map };
    keys.forEach((k) => (next[k] = setAction(next[k] || emptyRow(k), action, on)));
    emit(next);
  };

  if (visible.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Phòng ban chưa được chọn chức năng nào để xem — hãy chọn ở trang Phòng ban.
      </Typography>
    );
  }

  return (
    <Box sx={{ maxHeight, overflow: "auto", border: "1px solid #e5e9f0", borderRadius: 1 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Chức năng</TableCell>
            {COLS.map((c) => (
              <TableCell key={c.key} align="center" sx={{ fontWeight: 700, width: 72 }}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map(({ group, items }) => {
            const keys = items.map((i) => i.key);
            return (
              <React.Fragment key={group}>
                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                  <TableCell sx={{ fontWeight: 700 }}>{group}</TableCell>
                  {COLS.map((c) => {
                    const all = keys.every((k) => map[k]?.[c.key]);
                    const some = keys.some((k) => map[k]?.[c.key]);
                    return (
                      <TableCell key={c.key} align="center" padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={all}
                          indeterminate={!all && some}
                          disabled={readOnly}
                          onChange={(_, on) => setGroup(keys, c.key, on)}
                          inputProps={{ "aria-label": `${group} - ${c.label}` }}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
                {items.map((m) => (
                  <TableRow key={m.key} hover>
                    <TableCell sx={{ pl: 3 }}>{m.label}</TableCell>
                    {COLS.map((c) => (
                      <TableCell key={c.key} align="center" padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={Boolean(map[m.key]?.[c.key])}
                          disabled={readOnly}
                          onChange={(_, on) => set(m.key, c.key, on)}
                          inputProps={{ "aria-label": `${m.label} - ${c.label}` }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};

export default PermissionMatrix;
