import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Khoảng ngày mặc định cho các màn danh sách báo chuyến (Khai thác/Vận
 * tải) — TOÀN BỘ tháng hiện tại (yyyy-MM-01 .. ngày cuối tháng), tính
 * theo giờ máy khách.
 *
 * Trước đây hai màn này để CỨNG "2026-08-01".."2026-08-31" — bản ghi nhập
 * ở tháng bất kỳ khác tháng 8/2026 "biến mất" khỏi danh sách mặc định
 * (không phải lỗi lưu, chỉ là lọc quá hẹp) — chủ dự án báo hiểu nhầm là
 * lưu thất bại, sự cố thật ngày 2026-09-08.
 */
export function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = now.getFullYear()
  const m = now.getMonth() // 0-based
  const lastDay = new Date(y, m + 1, 0).getDate()
  return {
    from: `${y}-${pad(m + 1)}-01`,
    to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
  }
}
