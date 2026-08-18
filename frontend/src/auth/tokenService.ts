export interface StoredToken {
  appToken: string;
  refreshToken: string;
}

const PORTAL_KEY = "token_portal";

export function decodeJwtPayload(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(padLen);
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("[TokenService] Failed to decode JWT payload:", e);
    return null;
  }
}


function parseStoredToken(raw: string | null): StoredToken | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.appToken) return parsed as StoredToken;
  } catch {}
  return null;
}

export const tokenService = {
  saveTokens(appToken: string, refreshToken: string): void {
    sessionStorage.setItem(
      PORTAL_KEY,
      JSON.stringify({ appToken, refreshToken }),
    );
  },

  get(): StoredToken | null {
    return parseStoredToken(sessionStorage.getItem(PORTAL_KEY));
  },

  getAppToken(): string | null {
    return this.get()?.appToken ?? null;
  },

  clear(): void {
    sessionStorage.removeItem(PORTAL_KEY);
  },

  isValid(): boolean {
    const token = this.getAppToken();
    // Ở frontend chỉ cần kiểm tra xem có token hay không. 
    // Nếu token hết hạn, backend sẽ trả về 401 và Axios Interceptor sẽ tự động refresh.
    return !!token;
  },

  hasValidPortalToken(): boolean {
    return this.isValid();
  },
};
