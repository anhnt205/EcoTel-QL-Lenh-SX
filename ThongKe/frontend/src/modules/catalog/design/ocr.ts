/**
 * Đọc chữ trong ảnh (OCR) bằng tesseract.js — nạp từ CDN jsdelivr khi cần, KHÔNG đóng gói vào ứng dụng
 * (nên máy người dùng cần Internet lần đầu dùng; mất mạng thì báo lỗi rõ ràng). Dùng chung cho mọi cửa sổ "Nhập nhanh".
 */
interface TessWorker {
  setParameters: (p: Record<string, string>) => Promise<unknown>;
  recognize: (img: Blob) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<unknown>;
}
interface TessLib {
  createWorker: (lang: string, oem?: number, opts?: { logger?: (m: { status: string; progress: number }) => void }) => Promise<TessWorker>;
}
declare global {
  interface Window {
    Tesseract?: TessLib;
  }
}

const loadTesseract = () =>
  new Promise<TessLib>((resolve, reject) => {
    if (window.Tesseract) return resolve(window.Tesseract);
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
    s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("Không khởi động được bộ đọc ảnh.")));
    s.onerror = () => reject(new Error("Không tải được bộ đọc ảnh (máy cần có Internet)."));
    document.head.appendChild(s);
  });

/**
 * Đọc ảnh → chữ (giữ khoảng cách giữa các cột). `lang`: "eng" cho khoá chữ-số; "vie" khi có tiếng Việt có dấu.
 * `whitelist`: giới hạn ký tự cho đỡ đọc nhầm (chỉ dùng được với khoá chữ-số). `onStatus` nhận chữ tiến độ để hiện cho người dùng.
 */
export async function recognizeImage(
  img: Blob,
  opts: { lang?: string; whitelist?: string; onStatus?: (s: string) => void } = {},
): Promise<string> {
  opts.onStatus?.("Đang nạp bộ đọc ảnh…");
  const lib = await loadTesseract();
  const worker = await lib.createWorker(opts.lang ?? "eng", 1, {
    logger: (m) => opts.onStatus?.(m.status === "recognizing text" ? `Đang đọc ảnh… ${Math.round(m.progress * 100)}%` : "Đang chuẩn bị bộ đọc ảnh…"),
  });
  try {
    await worker.setParameters({
      ...(opts.whitelist ? { tessedit_char_whitelist: opts.whitelist } : null),
      preserve_interword_spaces: "1",
    });
    const { data } = await worker.recognize(img);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
