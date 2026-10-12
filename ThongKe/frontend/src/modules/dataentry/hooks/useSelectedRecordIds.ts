import { useMemo } from "react";

export function getSelectedRecordIds(
  ...idSets: (Set<string | number> | (string | number)[] | null | undefined)[]
): number[] {
  const allIds: (string | number)[] = [];
  for (const s of idSets) {
    if (!s) continue;
    if (s instanceof Set) {
      allIds.push(...Array.from(s));
    } else if (Array.isArray(s)) {
      allIds.push(...s);
    }
  }

  return Array.from(new Set(allIds))
    .map(Number)
    .filter((id) => Boolean(id) && !isNaN(id));
}

export function useSelectedRecordIds(
  ...idSets: (Set<string | number> | (string | number)[] | null | undefined)[]
): number[] {
  return useMemo(
    () => getSelectedRecordIds(...idSets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...idSets.map((s) => (s instanceof Set ? Array.from(s).join(",") : Array.isArray(s) ? s.join(",") : s))],
  );
}
