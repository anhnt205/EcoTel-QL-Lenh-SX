import { useMemo, useState } from "react";
import type { MatrixGrid } from "../matrix/matrixService";
import type { FuelNormDataset } from "./fuelNormKeys";

const WIDTH = 420;
const HEIGHT = 150;
const PAD_L = 46;
const PAD_R = 10;
const PAD_T = 10;
const PAD_B = 26;

const LINE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#0d9488"];

/**
 * Biểu đồ nhỏ so sánh các chủng loại xe đang hiển thị trong bảng tổng hợp,
 * tại MỘT mức Độ dốc chọn được — mỗi bộ dữ liệu (Chủng loại xe + Hậu tố)
 * một đường theo Cung độ. Chỉ minh hoạ, không phải nguồn tính chính thức.
 */
export function FuelNormChartPanel({ grid, datasets }: { grid: MatrixGrid; datasets: FuelNormDataset[] }) {
  const [rowKey, setRowKey] = useState<string>(grid.rows[0]?.key ?? "");
  const row = grid.rows.find((r) => r.key === rowKey) ?? grid.rows[0];

  const series = useMemo(() => {
    if (!row) return [];
    return datasets
      .map((ds, idx) => {
        const points = ds.columns
          .map((c) => {
            const v = grid.cells[row.key]?.[c.key];
            return v === undefined ? null : { distance: c.distance, value: v };
          })
          .filter((p): p is { distance: number; value: number } => p !== null)
          .sort((a, b) => a.distance - b.distance);
        return { label: ds.vehicleSuffixKey, color: LINE_COLORS[idx % LINE_COLORS.length], points };
      })
      .filter((s) => s.points.length > 0);
  }, [datasets, grid, row]);

  const allDistances = series.flatMap((s) => s.points.map((p) => p.distance));
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const minDist = allDistances.length > 0 ? Math.min(...allDistances, 0) : 0;
  const maxDist = allDistances.length > 0 ? Math.max(...allDistances, 1) : 1;
  const minVal = allValues.length > 0 ? Math.min(...allValues, 0) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 1) : 1;

  const x = (d: number) => PAD_L + ((d - minDist) / (maxDist - minDist || 1)) * (WIDTH - PAD_L - PAD_R);
  const y = (v: number) => HEIGHT - PAD_B - ((v - minVal) / (maxVal - minVal || 1)) * (HEIGHT - PAD_T - PAD_B);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-medium text-muted-foreground">{grid.rowAxisLabel}</label>
        <select
          value={rowKey}
          onChange={(e) => setRowKey(e.target.value)}
          className="h-6 rounded border bg-transparent px-1 text-[11px]"
        >
          {grid.rows.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-md border bg-card p-1.5">
        {series.length === 0 ? (
          <div className="flex h-[150px] items-center justify-center text-[11px] text-muted-foreground">
            Chưa có dữ liệu ở mức {grid.rowAxisLabel.toLowerCase()} này.
          </div>
        ) : (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[150px] w-full">
            {[0, 0.5, 1].map((t) => (
              <line
                key={t}
                x1={PAD_L}
                x2={WIDTH - PAD_R}
                y1={PAD_T + t * (HEIGHT - PAD_T - PAD_B)}
                y2={PAD_T + t * (HEIGHT - PAD_T - PAD_B)}
                stroke="#e5e7eb"
              />
            ))}
            <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={HEIGHT - PAD_B} stroke="#94a3b8" />
            <line x1={PAD_L} x2={WIDTH - PAD_R} y1={HEIGHT - PAD_B} y2={HEIGHT - PAD_B} stroke="#94a3b8" />
            {series.map((s) => (
              <g key={s.label}>
                <polyline
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  points={s.points.map((p) => `${x(p.distance)},${y(p.value)}`).join(" ")}
                />
                {s.points.map((p) => (
                  <circle key={p.distance} cx={x(p.distance)} cy={y(p.value)} r={2} fill={s.color} />
                ))}
              </g>
            ))}
            <text x={WIDTH / 2} y={HEIGHT - 4} fontSize={9} fill="#475569" textAnchor="middle">
              Cung độ (km)
            </text>
            <text x={2} y={PAD_T + 8} fontSize={9} fill="#475569">
              {grid.valueLabel}
            </text>
          </svg>
        )}
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 px-1 pt-1 text-[10px] text-muted-foreground">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
