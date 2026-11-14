import { useState } from "react";
import "@/styles/catalog-design.css";

/** Chuẩn hoá một số gõ vào: chấp nhận "0,05"/"0.05"; trả null nếu không phải số không âm. */
export const normNumber = (raw: string): string | null => {
  const t = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return String(Number(t));
};

/**
 * Ô chọn NHIỀU số bằng cách gõ rồi Enter (dạng chip, giống ô Cung độ của Năng suất xe): chấp nhận dấu phẩy thập phân, bỏ trùng theo giá trị số,
 * chèn theo thứ tự tăng dần, Backspace khi ô trống xoá chip cuối; dán nhiều số cách nhau bằng dấu cách/chấm phẩy.
 * Hiện tối đa `maxChips` chip, còn lại gom thành "+N".
 */
export function NumberChipsInput({
  values,
  onChange,
  placeholder,
  maxChips = 5,
  onError,
  readOnly = false,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxChips?: number;
  onError?: (msg: string | null) => void;
  /** Chỉ xem: không thêm/bớt số (dùng khi Chỉnh sửa — sửa dữ liệu đã có, không thêm bớt). */
  readOnly?: boolean;
}) {
  const [text, setText] = useState("");

  const commit = (raw: string) => {
    const tokens = raw.split(/[\s;]+/).filter(Boolean);
    if (tokens.length === 0) return;
    const bad: string[] = [];
    const next = [...values];
    for (const t of tokens) {
      const n = normNumber(t);
      if (n == null) {
        bad.push(t);
        continue;
      }
      if (next.some((d) => Number(d) === Number(n))) continue;
      const at = next.findIndex((d) => Number(d) > Number(n));
      if (at < 0) next.push(n);
      else next.splice(at, 0, n);
    }
    onChange(next);
    onError?.(bad.length ? `Phải là số: ${bad.join(", ")}` : null);
    setText("");
  };

  return (
    <div className="dist-box" onClick={(e) => (e.currentTarget.querySelector("input") as HTMLInputElement | null)?.focus()}>
      {values.slice(0, maxChips).map((d) => (
        <span key={d} className="dist-chip">
          {d}
          {!readOnly && (
            <button type="button" aria-label={`Bỏ ${d}`} onClick={() => onChange(values.filter((x) => x !== d))}>
              ×
            </button>
          )}
        </span>
      ))}
      {values.length > maxChips && <span className="dist-more">+{values.length - maxChips}</span>}
      {!readOnly && (
      <input
        inputMode="decimal"
        value={text}
        placeholder={values.length === 0 ? placeholder : ""}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ";") {
            e.preventDefault();
            commit(text);
          } else if (e.key === "Backspace" && !text && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => commit(text)}
      />
      )}
    </div>
  );
}
