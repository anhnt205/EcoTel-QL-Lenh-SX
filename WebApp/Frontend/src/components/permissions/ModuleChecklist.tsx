import React from "react";
import { Box, Checkbox, FormControlLabel, FormGroup, Switch, Typography } from "@mui/material";
import { groupModules, useModules } from "../../permissions/useModules";

interface Props {
  /** null/undefined = chưa cấu hình (dùng quyền theo vai trò cũ); mảng = các module được xem */
  value: string[] | null | undefined;
  onChange: (next: string[] | null) => void;
  disabled?: boolean;
}

// Chọn các module (menu/chức năng) mà PHÒNG BAN được nhìn thấy. Chức vụ thuộc phòng ban chỉ chọn quyền
// trong phạm vi này.
const ModuleChecklist = ({ value, onChange, disabled }: Props) => {
  const { data: modules = [] } = useModules();
  const configured = Array.isArray(value);
  const selected = new Set(value || []);
  const groups = groupModules(modules);

  const toggle = (key: string, on: boolean) => {
    const next = new Set(selected);
    on ? next.add(key) : next.delete(key);
    onChange(Array.from(next));
  };
  const toggleGroup = (keys: string[], on: boolean) => {
    const next = new Set(selected);
    keys.forEach((k) => (on ? next.add(k) : next.delete(k)));
    onChange(Array.from(next));
  };

  return (
    <Box sx={{ mt: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={configured}
            disabled={disabled}
            onChange={(_, on) => onChange(on ? modules.map((m) => m.key) : null)}
          />
        }
        label="Giới hạn các chức năng phòng ban này được xem"
      />
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
        {configured
          ? "Chỉ các mục được tick mới hiện trên menu của người thuộc phòng ban (khi chức vụ đã được phân quyền)."
          : "Chưa giới hạn: người dùng vẫn theo quyền vai trò cũ."}
      </Typography>
      {configured &&
        groups.map(({ group, items }) => {
          const keys = items.map((i) => i.key);
          const all = keys.every((k) => selected.has(k));
          const some = keys.some((k) => selected.has(k));
          return (
            <Box key={group} sx={{ mb: 1.5, border: "1px solid #e5e9f0", borderRadius: 1, p: 1.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={all}
                    indeterminate={!all && some}
                    disabled={disabled}
                    onChange={(_, on) => toggleGroup(keys, on)}
                  />
                }
                label={<Typography fontWeight={700}>{group}</Typography>}
              />
              <FormGroup sx={{ pl: 3, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
                {items.map((m) => (
                  <FormControlLabel
                    key={m.key}
                    control={
                      <Checkbox
                        size="small"
                        checked={selected.has(m.key)}
                        disabled={disabled}
                        onChange={(_, on) => toggle(m.key, on)}
                      />
                    }
                    label={m.label}
                  />
                ))}
              </FormGroup>
            </Box>
          );
        })}
    </Box>
  );
};

export default ModuleChecklist;
