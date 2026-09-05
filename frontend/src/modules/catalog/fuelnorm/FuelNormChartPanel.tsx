import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { MatrixGrid } from "../matrix/matrixService";
import { interpolateBilinear, type FuelNormDataset } from "./fuelNormKeys";

const WIDTH = 560;
const HEIGHT = 260;
const PAD_L = 56;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 36;

const LINE_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

/**
 * Biểu đồ minh hoạ định mức theo cung độ, cho một bộ dữ liệu (Chủng loại xe +
 * Hậu tố) — vẽ tay bằng SVG 2D, KHÔNG phải mặt cong 3D thật (mockup gốc cũng
 * chỉ là SVG 2D dù gắn nhãn "Đồ thị 3D").
 *
 * Điểm nội suy dùng `interpolateBilinear` — chỉ để XEM TRƯỚC, không phải
 * nguồn tính chính thức (nguồn thật là `FuelNormInterpolator.java`).
 */
export function FuelNormChartPanel({ grid, dataset }: { grid: MatrixGrid; dataset: FuelNormDataset }) {
  const distances = dataset.columns.map((c) => c.distance);
  const minDist = Math.min(...distances, 0);
  const maxDist = Math.max(...distances, 1);
  const slopes = grid.rows
    .map((r) => r.numericValue)
    .filter((v): v is number => v !== null && v !== undefined)
    .sort((a, b) => a - b);

  const [previewDistance, setPreviewDistance] = useState(String(((minDist + maxDist) / 2).toFixed(2)));
  const [previewSlope, setPreviewSlope] = useState(String(slopes[Math.floor(slopes.length / 2)] ?? 0));

  const result = useMemo(() => {
    const d = Number(previewDistance.replace(",", "."));
    const s = Number(previewSlope.replace(",", "."));
    if (Number.isNaN(d) || Number.isNaN(s)) return null;
    return interpolateBilinear(grid, dataset.vehicleSuffixKey, d, s);
  }, [grid, dataset.vehicleSuffixKey, previewDistance, previewSlope]);

  // Mỗi dòng (độ dốc) vẽ một đường theo cung độ, chỉ nối các ô đã khai.
  const series = grid.rows
    .map((row, idx) => {
      const points = dataset.columns
        .map((c) => {
          const v = grid.cells[row.key]?.[c.key];
          return v === undefined ? null : { distance: c.distance, value: v };
        })
        .filter((p): p is { distance: number; value: number } => p !== null);
      return { label: row.label, color: LINE_COLORS[idx % LINE_COLORS.length], points };
    })
    .filter((s) => s.points.length > 0);

  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const minVal = allValues.length > 0 ? Math.min(...allValues, 0) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 1) : 1;

  const x = (d: number) =>
    PAD_L + ((d - minDist) / (maxDist - minDist || 1)) * (WIDTH - PAD_L - PAD_R);
  const y = (v: number) =>
    HEIGHT - PAD_B - ((v - minVal) / (maxVal - minVal || 1)) * (HEIGHT - PAD_T - PAD_B);

  const previewPoint =
    result && !Number.isNaN(Number(previewDistance))
      ? { x: x(Number(previewDistance.replace(",", "."))), y: y(result.value) }
      : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Cung độ xem trước (km)</label>
          <Input value={previewDistance} onChange={(e) => setPreviewDistance(e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Độ dốc xem trước (‰)</label>
          <Input value={previewSlope} onChange={(e) => setPreviewSlope(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-2">
        {series.length === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            Bộ dữ liệu chưa có ô nào để vẽ biểu đồ.
          </div>
        ) : (
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[260px] w-full">
            {/* lưới */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <line
                key={t}
                x1={PAD_L}
                x2={WIDTH - PAD_R}
                y1={PAD_T + t * (HEIGHT - PAD_T - PAD_B)}
                y2={PAD_T + t * (HEIGHT - PAD_T - PAD_B)}
                stroke="#e5e7eb"
              />
            ))}
            {/* trục */}
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
                  <circle key={p.distance} cx={x(p.distance)} cy={y(p.value)} r={2.5} fill={s.color} />
                ))}
              </g>
            ))}

            {previewPoint && (
              <>
                <line x1={previewPoint.x} x2={previewPoint.x} y1={PAD_T} y2={HEIGHT - PAD_B} stroke="#dc2626" strokeDasharray="4 3" />
                <circle cx={previewPoint.x} cy={previewPoint.y} r={5} fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
              </>
            )}

            <text x={WIDTH / 2} y={HEIGHT - 6} fontSize={11} fill="#475569" textAnchor="middle">
              Cung độ (km)
            </text>
            <text x={14} y={PAD_T + 10} fontSize={11} fill="#475569">
              {grid.valueLabel}
            </text>
          </svg>
        )}
        <div className="flex flex-wrap gap-3 px-2 pb-1 text-[11px] text-muted-foreground">
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {grid.rowAxisLabel} {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border bg-blue-50/50 p-3 text-xs dark:bg-blue-950/10 sm:grid-cols-2">
        {result ? (
          <>
            <div>
              <b>Thông tin chi tiết (tại điểm đang chọn)</b>
              <br />
              Cung độ: <b>{previewDistance} km</b>
              <br />
              Độ dốc: <b>{previewSlope} ‰</b>
              <br />
              Định mức (xem trước): <b>{result.value.toFixed(grid.valueScale)} {grid.valueLabel}</b>
            </div>
            <div>
              Phương pháp: Nội suy song tuyến (chỉ xem trước, không phải số liệu chính thức)
              <br />
              Mốc cung độ: {result.distanceLow ?? "—"} → {result.distanceHigh ?? "—"}
              <br />
              Mốc độ dốc: {result.slopeLow ?? "—"} → {result.slopeHigh ?? "—"}
            </div>
          </>
        ) : (
          <p className="sm:col-span-2">Chưa đủ dữ liệu để nội suy tại điểm này.</p>
        )}
      </div>
    </div>
  );
}
