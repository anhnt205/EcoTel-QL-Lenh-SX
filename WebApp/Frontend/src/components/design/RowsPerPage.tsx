/**
 * "Số dòng: [15 ▾]  Hiển thị 1–15 trong tổng 13350 bản ghi" — phần chọn số dòng + câu thống kê của chân trang, ĐÚNG mẫu bảng Lệnh sản xuất
 * (MUI DataGrid). Dùng chung cho mọi bảng (chân trang mỗi bảng giữ nút chuyển trang riêng). CSS: styles/excel-filter.css (`.rpf*`).
 */
export const ROW_OPTIONS = [15, 20, 50, 100];

export default function RowsPerPage({
  value,
  onChange,
  from,
  to,
  total,
  options = ROW_OPTIONS,
}: {
  value: number;
  onChange: (n: number) => void;
  /** Dòng đầu / cuối đang hiển thị (đếm từ 1); khi không có dữ liệu truyền 0. */
  from: number;
  to: number;
  total: number;
  options?: number[];
}) {
  const opts = options.includes(value) ? options : [...options, value].sort((a, b) => a - b);
  return (
    <span className="rpf">
      <span className="rpf-label">Số dòng:</span>
      <select className="rpf-select" value={value} aria-label="Số dòng mỗi trang" onChange={(e) => onChange(Number(e.target.value))}>
        {opts.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span className="rpf-info">{total > 0 ? `Hiển thị ${from}–${to} trong tổng ${total} bản ghi` : "Không có dữ liệu"}</span>
    </span>
  );
}

/** ‹ › — nút trang trước/sau dạng biểu tượng trần, đúng mẫu chân trang bảng Lệnh sản xuất (không có nút số trang, « »). */
export function PageArrows({
  canPrev,
  canNext,
  onPrev,
  onNext,
  onFirst,
  onLast,
}: {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Có thì hiện thêm nút «  » (trang đầu / trang cuối). */
  onFirst?: () => void;
  onLast?: () => void;
}) {
  const icon = (d: string) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
  return (
    <span className="rpf-nav">
      {onFirst && (
        <button type="button" title="Trang đầu" aria-label="Trang đầu" disabled={!canPrev} onClick={onFirst}>
          {icon("M11 17l-5-5 5-5M18 17l-5-5 5-5")}
        </button>
      )}
      <button type="button" title="Trang trước" aria-label="Trang trước" disabled={!canPrev} onClick={onPrev}>
        {icon("M15 18l-6-6 6-6")}
      </button>
      <button type="button" title="Trang sau" aria-label="Trang sau" disabled={!canNext} onClick={onNext}>
        {icon("M9 18l6-6-6-6")}
      </button>
      {onLast && (
        <button type="button" title="Trang cuối" aria-label="Trang cuối" disabled={!canNext} onClick={onLast}>
          {icon("M13 17l5-5-5-5M6 17l5-5-5-5")}
        </button>
      )}
    </span>
  );
}
