import { tokenService } from "./tokenService";

const VITE_API_KONG_URL = import.meta.env.VITE_API_KONG_URL;

export interface AuthResult {
  ok: boolean;
  error?: string;
}

// Module-level lock để chống race condition khi React 18 StrictMode mount useEffect 2 lần
let inFlightAuthPromise: Promise<AuthResult> | null = null;

export const initializeAppAuth = (): Promise<AuthResult> => {
  if (inFlightAuthPromise) {
    console.log("[Auth] Re-using in-flight auth promise...");
    return inFlightAuthPromise;
  }

  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (!code) {
    if (tokenService.hasValidPortalToken()) {
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({ 
      ok: false, 
      error: "Không tìm thấy token. Vui lòng đăng nhập từ Portal." 
    });
  }

  console.log("[Auth] Starting OTC exchange with code:", code);

  // Xóa code khỏi URL ngay lập tức để giữ URL sạch
  params.delete("code");
  const cleanSearch = params.toString();
  const cleanPath =
    window.location.pathname +
    (cleanSearch ? `?${cleanSearch}` : "") +
    window.location.hash;
  window.history.replaceState({}, document.title, cleanPath);

  inFlightAuthPromise = (async () => {
    try {
      const response = await fetch(`${VITE_API_KONG_URL}/auth/exchange-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Exchange failed: ${response.status} - ${body}`);
      }

      const { appToken, refreshToken } = await response.json();
      tokenService.saveTokens(appToken, refreshToken);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Auth] OTC exchange failed:", message);
      tokenService.clear();
      return { ok: false, error: message };
    } finally {
      // Để rỗng để lock promise này suốt đời sống của trang hiện tại 
      // (Nếu reload trang, JS context tải lại sẽ reset về null)
    }
  })();

  return inFlightAuthPromise;
};
