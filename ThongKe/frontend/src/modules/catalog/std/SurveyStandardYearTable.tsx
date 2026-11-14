import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/config/api.config";
import ViewGrid, { type ViewColumn } from "../design/ViewGrid";
import { buildStdCols, formatVN, STD_VARIANTS, type StdCatalogType } from "./SurveyStandardAddModal";
import type { SurveyStandardResponse } from "./types";
import "@/styles/catalog-design.css";

/**
 * Bảng STD của MỘT NĂM, hiện ngay dưới dòng năm khi bấm Xem (thả xuống, không còn cửa sổ nổi) — cùng cách với Định mức nhiên liệu.
 * Cột Thời gian chỉ hiện khi năm có dòng bị chia khoảng thời gian (không phải trọn 1/1 – 31/12), vì bảng nhập đã bỏ cột này.
 */
export function SurveyStandardYearTable({ records, catalogType }: { records: SurveyStandardResponse[]; catalogType: StdCatalogType }) {
  const variant = STD_VARIANTS[catalogType];

  const { data: seamGroups = [] } = useQuery({
    queryKey: ["seam-groups-all"],
    queryFn: async () => {
      const res = await api.get("/seam-groups", { params: { size: 500 } });
      return (res.data?.data?.content ?? []) as { id: number; code: string; name: string }[];
    },
  });

  const hasSplit = records.some((r) => r.effectiveFrom.slice(5) !== "01-01" || r.effectiveTo.slice(5) !== "12-31");

  const columns = useMemo<ViewColumn[]>(
    () =>
      buildStdCols(variant.earthLabel, variant.hasCoal)
        .filter((c) => hasSplit || c.key !== "time")
        .map((c) => ({
          key: c.key,
          label: c.key === "earthDeviation" || c.key === "coalDeviation" ? "Clech" : c.label,
          align: c.key.startsWith("earth") || c.key.startsWith("coal") ? ("right" as const) : ("left" as const),
          strong: c.key === "key",
        })),
    [variant, hasSplit],
  );

  // Tiêu đề nhóm giống bảng nhập: Nhóm vỉa + Máy xúc, Đất CN/Đất SX (7 cột số), Than SX (7 cột số)
  const columnGroups = useMemo(
    () => [
      // cột Khoá nằm trong nhóm này, để trống tiêu đề con — lọc Khoá ngay ở tiêu đề nhóm (nút ⋮)
      { label: "Nhóm vỉa + Máy xúc", keys: ["seamGroup", "benchGroup", "excavator", "mudMark", "excavationArea", "suffix", "key"], filterKey: "key", blankKeys: ["key"] },
      { label: variant.earthLabel, keys: ["earthM3", "earthDesignVolume", "earthDeviation", "earthTon", "earthHaulDistance", "earthBulkDensity", "earthTkm"] },
      ...(variant.hasCoal ? [{ label: "Than SX", keys: ["coalM3", "coalBulkDensity", "coalTon", "coalDesignVolume", "coalDeviation", "coalHaulDistance", "coalTkm"] }] : []),
    ],
    [variant],
  );

  const textOf = (r: SurveyStandardResponse, k: string): string => {
    switch (k) {
      case "time":
        return `${formatVN(r.effectiveFrom)} – ${formatVN(r.effectiveTo)}`;
      case "seamGroup":
        return seamGroups.find((s) => s.code === r.seamGroup)?.name || r.seamGroup || "";
      case "key":
        return r.seamGroupExcavatorKey;
      default:
        return String((r as unknown as Record<string, unknown>)[k] ?? "");
    }
  };

  return (
    <div className="tkc-modal-overlay vg-inline">
      <ViewGrid
        columns={columns}
        rows={records}
        textOf={textOf}
        storageKey={`view:std-inline-${catalogType}`}
        showCount={false}
        columnGroups={columnGroups}
      />
    </div>
  );
}
