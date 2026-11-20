import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";

/** Giá trị lưu là chuỗi "A, B, C" (phân tách `,` hoặc `;`) — đúng định dạng backend đọc ở các danh mục hệ số. */
export const splitPickList = (value: string): string[] =>
  Array.from(new Set((value ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean)));

export const joinPickList = (items: string[]): string => items.join(", ");

/**
 * Ô chọn NHIỀU giá trị từ một danh mục (combobox đa chọn có gõ tìm).
 *
 * Ngoài các giá trị trong danh mục, gõ một mẫu kết thúc bằng dấu `*` (vd `HD465*` = bắt đầu bằng HD465) rồi chọn dòng
 * "Mẫu" hiện ra để thêm — để một điều kiện bao được cả nhóm mà không phải tick từng giá trị.
 */
export function MultiPickCell({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const anchor = useComboboxAnchor();
  const [input, setInput] = useState("");
  const selected = useMemo(() => splitPickList(value), [value]);
  const typedPattern = /\*$/.test(input.trim()) && input.trim().length > 1 ? input.trim() : null;
  const items = useMemo(
    () => Array.from(new Set([...options, ...selected, ...(typedPattern ? [typedPattern] : [])])),
    [options, selected, typedPattern],
  );

  return (
    <Combobox
      items={items}
      multiple
      value={selected}
      onValueChange={(next: string[]) => {
        onChange(joinPickList(next));
        setInput("");
      }}
      inputValue={input}
      onInputValueChange={setInput}
    >
      <ComboboxChips
        ref={anchor}
        title={selected.join(", ")}
        className="min-h-[39px] flex-nowrap overflow-hidden rounded-[8px] border-[#cfdbec] text-sm"
      >
        <ComboboxValue>
          {selected.slice(0, 2).map((v) => (
            <ComboboxChip key={v} className="rounded-full bg-[#b8c6dc] px-2.5 py-0.5 text-xs font-medium text-[#16294a]">
              {v}
            </ComboboxChip>
          ))}
          {selected.length > 2 && (
            <span className="rounded-full bg-[#dde8f7] px-2.5 py-0.5 text-xs font-semibold text-[#16294a]">+{selected.length - 2}</span>
          )}
        </ComboboxValue>
        <ComboboxChipsInput placeholder={selected.length === 0 ? (placeholder ?? "Chọn một hoặc nhiều giá trị...") : ""} className="text-sm" />
      </ComboboxChips>
      <ComboboxContent anchor={anchor} sideOffset={4} align="start" className="z-[220]">
        <ComboboxEmpty className="py-2 text-xs text-gray-400">Không có giá trị — gõ mẫu kết thúc bằng * (vd HD465*)</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item} className="text-sm data-selected:bg-[#dde8f7] data-selected:font-medium">
              {item === typedPattern && !options.includes(item) ? `Mẫu: ${item}` : item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
