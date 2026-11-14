/**
 * Bộ biểu tượng của thiết kế trang danh mục (đường nét lấy nguyên từ file thiết kế
 * "quan_ly_chung_loai_hang_than_cao_son.html"). Kích thước/nét do CSS `.tkc svg` quyết định.
 */
const PATHS: Record<string, React.ReactNode> = {
  home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  "chevrons-left": <path d="m11 6-6 6 6 6m8-12-6 6 6 6" />,
  "chevrons-right": <path d="m5 6 6 6-6 6m8-12 6 6-6 6" />,
  plus: <path d="M12 4v16M4 12h16" />,
  edit: <path d="m15 5 4 4M4 20l4.8-.9L20 7.9a2.1 2.1 0 0 0-4-4L4.8 15z" />,
  trash: <path d="M4 7h16M10 4h4M6 7l1 14h10l1-14M10 11v6M14 11v6" />,
  upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5" />,
  download: <path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4" />,
  refresh: <path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 5 5" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  boxes: <path d="m8 3 4 2 4-2 4 2v5l-4 2-4-2-4 2-4-2V5zM4 14l4-2 4 2v5l-4 2-4-2zM12 14l4-2 4 2v5l-4 2-4-2z" />,
  sort: <path d="m8 9 4-4 4 4m-8 6 4 4 4-4" />,
  check: <path d="m5 12 5 5 9-10" />,
  x: <path d="M5 5l14 14M19 5 5 19" />,
  sliders: <path d="M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6m-6 4v6" />,
  columns: <path d="M4 5h4v14H4zM10 5h4v14h-4zM16 5h4v14h-4z" />,
  maximize: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  minimize: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  "more-vertical": (
    <>
      <circle cx="12" cy="5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" />
    </>
  ),
};

export default function DIcon({ name, className, style }: { name: keyof typeof PATHS | string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
      {PATHS[name]}
    </svg>
  );
}
