import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MatrixGrid } from "../matrix/matrixService";
import { groupColumnsByVehicleSuffix, interpolateSteps, type InterpolationSteps } from "./fuelNormKeys";
import "@/styles/catalog-design.css";

const toNumber = (raw: string): number | null => {
  const t = raw.trim().replace(",", ".");
  if (t === "" || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
};

const fmt = (v: number | null) => (v === null ? "—" : v.toLocaleString("vi-VN", { maximumFractionDigits: 6 }));

interface StepRow {
  sym: string;
  name: string;
  value: number | null;
  strong?: boolean;
}

const stepRowsOf = (steps: InterpolationSteps): StepRow[] => {
  const all: StepRow[] = [
    { sym: "Hb", name: "Cung độ cận trên", value: steps.hb },
    { sym: "Ha", name: "Cung độ cận dưới", value: steps.ha },
    { sym: "h1", name: "Dốc cận trước", value: steps.h1 },
    { sym: "h2", name: "Dốc cận sau", value: steps.h2 },
    { sym: "Nb-h1", name: "Định mức tại Hb, h1", value: steps.nbH1 },
    { sym: "Nb-h2", name: "Định mức tại Hb, h2", value: steps.nbH2 },
    { sym: "Nb", name: "Nhiên liệu tương ứng Hb", value: steps.nb, strong: true },
    { sym: "Na-h1", name: "Định mức tại Ha, h1", value: steps.naH1 },
    { sym: "Na-h2", name: "Định mức tại Ha, h2", value: steps.naH2 },
    { sym: "Na", name: "Nhiên liệu tương ứng Ha", value: steps.na, strong: true },
    { sym: "Nt", name: "Định mức nhiên liệu tiêu hao cần tìm", value: steps.nt, strong: true },
  ];
  // Cung độ toàn tuyến = 0 thì không cần các bước trung gian
  return steps.zero ? all.filter((r) => r.sym === "Nt") : all;
};

/**
 * "Tính nội suy" — nằm trên bảng định mức của một năm, mặc định thu gọn. Chỉ nhập Cung độ toàn tuyến và Nâng tải toàn tuyến → hiện Nt
 * (nhiên liệu tiêu hao cần tìm) của TỪNG nhóm Chủng loại xe + Phân loại có trong bảng; rê chuột vào ô Nt nào thì bung bảng các bước tính của nhóm đó
 * (Hb/Ha cung độ cận trên/dưới, h1/h2 dốc cận trước/sau, Nb/Na nhiên liệu tại Hb/Ha rồi Nt). Đọc thẳng dữ liệu bảng đang xem; không lưu gì.
 */
export function FuelNormInterpolationPanel({ versions, datasetKeys }: { versions: MatrixGrid[]; datasetKeys: string[] }) {
  const [open, setOpen] = useState(false);
  const [distanceRaw, setDistanceRaw] = useState("");
  const [slopeRaw, setSlopeRaw] = useState("");
  const [hover, setHover] = useState<{ key: string; rect: DOMRect } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [popH, setPopH] = useState(0);
  // đo chiều cao bảng bung ra để dóng dòng Nt của bảng ngang với giữa ô Nt
  useLayoutEffect(() => {
    if (hover && popRef.current) setPopH(popRef.current.offsetHeight);
  }, [hover]);

  const distance = toNumber(distanceRaw);
  const slope = toNumber(slopeRaw);

  /** Mỗi nhóm tính trên khoảng thời gian MỚI NHẤT của năm có nhóm đó. */
  const results = useMemo(() => {
    if (distance === null || slope === null) return [];
    const sorted = [...versions].sort((a, b) => (b.effectiveFrom ?? "").localeCompare(a.effectiveFrom ?? ""));
    return datasetKeys.map((key) => {
      const grid = sorted.find((v) => groupColumnsByVehicleSuffix(v).some((d) => d.vehicleSuffixKey === key)) ?? null;
      return { key, steps: grid ? interpolateSteps(grid, key, distance, slope) : null };
    });
  }, [versions, datasetKeys, distance, slope]);

  const hovered = hover ? results.find((r) => r.key === hover.key)?.steps ?? null : null;
  const shown = hovered ? stepRowsOf(hovered) : [];
  const anyOutside = results.some((r) => r.steps && (r.steps.distanceOutside || r.steps.slopeOutside));

  const border = "1px solid #8fa9cc";
  const cell = { border, padding: "5px 10px", fontSize: 13 } as const;
  // ô của bảng bung ra: thấp hơn để cả bảng vừa khung nhìn, không cần thanh cuộn
  const popCell = { ...cell, padding: "2px 10px", height: 28, boxSizing: "border-box" } as const;

  return (
    <div className="tkc-modal-overlay vg-inline">
      <div className="vg" style={{ paddingBottom: 0 }}>
        <div style={{ border, borderRadius: 10, background: "#f5f9ff" }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, width: "100%", boxSizing: "border-box", padding: "9px 14px", fontWeight: 700, color: "#0954c7" }}
          >
            <span aria-hidden>{open ? "▾" : "▸"}</span>
            Tính nội suy
          </button>

          {open && (
            <div style={{ padding: "4px 14px 14px" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end", marginBottom: 12 }}>
                <div className="form-group" style={{ width: 190 }}>
                  <label>Cung độ toàn tuyến (km)</label>
                  <input className="field" inputMode="decimal" placeholder="vd 4,2" value={distanceRaw} onChange={(e) => setDistanceRaw(e.target.value)} />
                </div>
                <div className="form-group" style={{ width: 190 }}>
                  <label>Nâng tải toàn tuyến (m)</label>
                  <input className="field" inputMode="decimal" placeholder="vd 210" value={slopeRaw} onChange={(e) => setSlopeRaw(e.target.value)} />
                </div>
              </div>

              {versions.length > 1 && <p style={{ margin: "0 0 8px", fontSize: 12, color: "#5b6f8f" }}>Năm này có nhiều khoảng thời gian — mỗi nhóm tính theo khoảng mới nhất có nhóm đó.</p>}
              {datasetKeys.length === 0 && <p style={{ margin: 0 }}>Chưa có dữ liệu định mức để nội suy.</p>}
              {datasetKeys.length > 0 && (distanceRaw.trim() === "" || slopeRaw.trim() === "") && (
                <p style={{ margin: 0, color: "#5b6f8f" }}>Nhập cung độ toàn tuyến và nâng tải toàn tuyến để xem kết quả.</p>
              )}
              {datasetKeys.length > 0 && distanceRaw.trim() !== "" && slopeRaw.trim() !== "" && (distance === null || slope === null) && (
                <p style={{ margin: 0, color: "#d82e40" }}>Cung độ và nâng tải phải là số (dùng dấu phẩy hoặc chấm thập phân).</p>
              )}

              {results.length > 0 && (
                <>
                  {/* mỗi nhóm một ô Nt; rê chuột (hoặc Tab tới) vào ô nào thì bung bảng các bước tính của nhóm đó */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {results.map(({ key, steps }) => (
                      <div
                        key={key}
                        tabIndex={steps ? 0 : -1}
                        title={steps ? undefined : "Nhóm này chưa có đủ cung độ / độ dốc trong bảng để nội suy"}
                        onMouseEnter={(e) => steps && setHover({ key, rect: e.currentTarget.getBoundingClientRect() })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={(e) => steps && setHover({ key, rect: e.currentTarget.getBoundingClientRect() })}
                        onBlur={() => setHover(null)}
                        style={{
                          display: "inline-flex",
                          alignItems: "baseline",
                          gap: 10,
                          border: `2px solid ${steps ? "#0954c7" : "#c3cfe0"}`,
                          borderRadius: 10,
                          background: steps ? "#eef4ff" : "#f4f6f9",
                          padding: "8px 14px",
                          cursor: steps ? "help" : "default",
                          outline: "none",
                        }}
                      >
                        <span style={{ color: "#1a4f9d", fontWeight: 700 }}>{key}</span>
                        <span style={{ color: "#5b6f8f" }}>Nt</span>
                        <span style={{ fontWeight: 400, color: steps ? "#0954c7" : "#8a97ab" }}>{steps ? fmt(steps.nt) : "—"}</span>
                      </div>
                    ))}
                  </div>
                  {anyOutside && (
                    <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b26a00" }}>Có nhóm có cung độ / nâng tải nằm ngoài khoảng của bảng — nhóm đó lấy mốc gần nhất.</p>
                  )}
                  {hover && hovered && (
                    <div
                      ref={popRef}
                      style={{
                        position: "fixed",
                        left: hover.rect.right + 12 + 510 <= window.innerWidth ? hover.rect.right + 12 : Math.max(8, window.innerWidth - 518),
                        top: Math.max(8, Math.min(hover.rect.top + hover.rect.height / 2 - popH + popH / (shown.length + 1) / 2, window.innerHeight - popH - 8)),
                        zIndex: 2000,
                        pointerEvents: "none",
                        background: "#fff",
                        border: "1px solid #8fa9cc",
                        borderRadius: 10,
                        boxShadow: "0 10px 30px rgba(8, 48, 107, .25)",
                      }}
                    >
                      <table style={{ borderCollapse: "collapse", tableLayout: "fixed", width: 90 + 290 + 120, background: "#fff" }}>
                        <thead>
                          <tr style={{ background: "#e8f0fb" }}>
                            <th style={{ ...popCell, width: 90, textAlign: "left" }}>Ký hiệu</th>
                            <th style={{ ...popCell, width: 290, textAlign: "left" }}>Ý nghĩa — {hover.key}</th>
                            <th style={{ ...popCell, width: 120, textAlign: "right" }}>Giá trị</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shown.map((r) => (
                            <tr key={r.sym} style={r.strong ? { background: "#f1f6ff", fontWeight: 700 } : undefined}>
                              <td style={{ ...popCell, color: "#1a4f9d", fontWeight: 700 }}>{r.sym}</td>
                              <td style={popCell}>{r.name}</td>
                              <td style={{ ...popCell, textAlign: "right", color: r.sym === "Nt" ? "#0954c7" : undefined, fontSize: r.sym === "Nt" ? 15 : 13 }}>{fmt(r.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
