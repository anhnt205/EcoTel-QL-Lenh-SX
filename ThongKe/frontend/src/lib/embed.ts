/**
 * Chế độ NHÚNG: giao diện Thống kê chạy trong 1 khung (iframe) của phần mềm
 * Điều phối cùng domain — Điều phối vẽ thanh menu, nên ở đây ẩn header + thanh
 * tab của chính Thống kê và nhận lệnh điều hướng qua postMessage.
 *
 * Nhận biết bằng `window.name === "tk-embed"` (Điều phối đặt name cho iframe)
 * chứ KHÔNG dùng "đang nằm trong iframe": Portal cũng nhúng Thống kê trong
 * iframe nhưng cần giữ nguyên header của Thống kê ở đó. `window.name` còn giữ
 * được qua F5/điều hướng trong khung, không rò sang tab khác. `?embed=1` là
 * lối dự phòng khi mở thủ công để thử.
 */
export const EMBED_FRAME_NAME = "tk-embed";

export const isEmbedded = (): boolean => {
  try {
    if (window.name === EMBED_FRAME_NAME) return true;
    return new URLSearchParams(window.location.search).get("embed") === "1";
  } catch {
    return false;
  }
};

/** Tiền tố đường dẫn của router (rỗng khi chạy ở gốc `/`). */
export const routerBasename = (): string => {
  const base = import.meta.env.BASE_URL || "/";
  return base === "/" ? "" : base.replace(/\/+$/, "");
};

/** Thông điệp giữa khung cha (Điều phối) và Thống kê. */
export const MSG_NAVIGATE = "tk:navigate"; // cha -> con: { type, path }
export const MSG_LOCATION = "tk:location"; // con -> cha: { type, path }
/** con -> cha: người dùng lăn chuột trong khung. { type, collapse } — collapse=true: lăn xuống => cha thu banner phần mềm. */
export const MSG_HEADER = "tk:header";
/** con -> cha: chiều cao nội dung trang ({ type, height }; height <= 0 = bỏ) — cha cho khung cao bằng nội dung để chỉ cuộn bằng thanh cuộn của cha. */
export const MSG_HEIGHT = "tk:height";

/** Xin/cấp token qua khung cha (Điều phối) — đăng nhập một lần ở Điều phối. */
export const MSG_REQUEST_TOKEN = "tk:request-token"; // con -> cha: { type }
export const MSG_TOKEN = "tk:token"; // cha -> con: { type, appToken }
export const MSG_TOKEN_ERROR = "tk:token-error"; // cha -> con: { type, message }

const TOKEN_TIMEOUT_MS = 10000;
let inFlightToken: Promise<string> | null = null;

/**
 * Xin token mới từ khung cha (Điều phối đã đăng nhập). Chỉ chạy ở chế độ nhúng.
 * Gộp các lời gọi đồng thời thành 1 (nhiều request 401 cùng lúc chỉ xin 1 lần).
 * Chỉ nhận trả lời từ CHÍNH khung cha và cùng origin.
 */
export function requestParentToken(): Promise<string> {
  if (inFlightToken) return inFlightToken;
  inFlightToken = new Promise<string>((resolve, reject) => {
    if (window.parent === window) {
      reject(new Error("Không có khung cha để xin phiên đăng nhập"));
      return;
    }
    const done = () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      inFlightToken = null;
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || e.origin !== window.location.origin) return;
      if (e.data?.type === MSG_TOKEN && typeof e.data.appToken === "string") {
        done();
        resolve(e.data.appToken);
      } else if (e.data?.type === MSG_TOKEN_ERROR) {
        done();
        reject(new Error(String(e.data.message || "Điều phối không cấp được phiên Thống kê")));
      }
    };
    const timer = window.setTimeout(() => {
      done();
      reject(new Error("Hết thời gian chờ Điều phối cấp phiên đăng nhập"));
    }, TOKEN_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: MSG_REQUEST_TOKEN }, window.location.origin);
  });
  return inFlightToken;
}

/** Xin khung cha (Điều phối) số giờ hoạt động lũy kế theo mã thiết bị — số liệu này chỉ có bên Điều phối (báo cáo ca). */
export const MSG_REQUEST_DEVICE_HOURS = "tk:request-device-hours"; // con -> cha: { type }
export const MSG_DEVICE_HOURS = "tk:device-hours"; // cha -> con: { type, hours: { [maThietBi]: soGio } }

const DEVICE_HOURS_TIMEOUT_MS = 15000;

/**
 * Giờ hoạt động lũy kế của thiết bị theo MÃ (biển số), lấy từ khung cha. Ngoài chế độ nhúng, hết giờ chờ hoặc lỗi thì trả `{}`
 * (cột để trống) — không bao giờ làm hỏng trang.
 */
export function requestDeviceHours(): Promise<Record<string, number>> {
  return new Promise((resolve) => {
    if (window.parent === window) {
      resolve({});
      return;
    }
    const done = (value: Record<string, number>) => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      resolve(value);
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || e.origin !== window.location.origin) return;
      if (e.data?.type === MSG_DEVICE_HOURS) {
        done(e.data.hours && typeof e.data.hours === "object" ? (e.data.hours as Record<string, number>) : {});
      }
    };
    const timer = window.setTimeout(() => done({}), DEVICE_HOURS_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: MSG_REQUEST_DEVICE_HOURS }, window.location.origin);
  });
}
