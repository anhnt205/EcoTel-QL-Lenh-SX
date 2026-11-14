import { SCALE_MAX, SCALE_MIN, resetGlobalTableLayout, setGlobalTableLayout, useGlobalTableLayout, type GlobalColPreset, type GlobalRowPreset } from "@/lib/tableGlobalLayout";

/**
 * Phần "Tất cả bảng" trong hộp "Hiển thị bảng" (dùng chung cho cả hai bộ điều chỉnh bảng):
 * tích để áp kiểu cột + chiều cao hàng đang chọn cho MỌI bảng; kéo thanh trượt để đổi cỡ cột của MỌI bảng cùng lúc.
 */
export function GlobalLayoutControls({
  ownColPreset,
  ownRowPreset,
  secClass,
  chipClass,
  hintClass,
}: {
  ownColPreset: GlobalColPreset;
  ownRowPreset: GlobalRowPreset;
  secClass: string;
  chipClass: string;
  hintClass?: string;
}) {
  const g = useGlobalTableLayout();
  return (
    <>
      <div className={secClass}>Tất cả bảng</div>
      <label style={{ display: "flex", alignItems: "center", gap: 9, padding: "3px 2px", cursor: "pointer", fontSize: 13 }}>
        <input
          type="checkbox"
          checked={g.applyAll}
          onChange={(e) =>
            setGlobalTableLayout(e.target.checked ? { applyAll: true, colPreset: ownColPreset, rowPreset: ownRowPreset } : { applyAll: false })
          }
        />
        <span>Áp dụng kiểu cột &amp; chiều cao hàng này cho tất cả bảng</span>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 2px 2px", fontSize: 13 }}>
        <span style={{ flex: "0 0 auto" }}>Kéo cỡ cột:</span>
        <input
          type="range"
          min={SCALE_MIN}
          max={SCALE_MAX}
          step={5}
          value={g.scale}
          aria-label="Cỡ cột của tất cả bảng"
          style={{ flex: "1 1 0", minWidth: 0 }}
          onChange={(e) => setGlobalTableLayout({ scale: Number(e.target.value) })}
        />
        <span style={{ flex: "0 0 44px", textAlign: "right", fontWeight: 700 }}>{g.scale}%</span>
      </div>
      {hintClass && <div className={hintClass}>Thanh trượt đổi độ rộng cột của mọi bảng cùng lúc (100% = nguyên bản).</div>}
      <div style={{ marginTop: 6 }}>
        <button type="button" className={chipClass} onClick={() => resetGlobalTableLayout()}>
          Đặt lại tất cả bảng
        </button>
      </div>
    </>
  );
}
