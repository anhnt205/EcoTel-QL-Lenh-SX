import { useState, useCallback } from "react";

export function useRowSelection<T extends { id?: string | number }>(rows: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectAll = useCallback(
    (checked?: boolean) => {
      if (
        checked === false ||
        (selectedIds.size === rows.length && rows.length > 0)
      ) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(
          new Set(
            rows
              .map((r) => (r.id != null ? String(r.id) : ""))
              .filter(Boolean),
          ),
        );
      }
    },
    [rows, selectedIds.size],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    toggleSelectAll,
    toggleSelect,
    clearSelection,
  };
}
