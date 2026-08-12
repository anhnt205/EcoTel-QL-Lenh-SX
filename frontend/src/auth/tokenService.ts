export interface StoredToken {
  appToken: string;
  refreshToken: string;
}

const PORTAL_KEY = "token_portal";

function isTokenExpiryValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
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
    return !!token && isTokenExpiryValid(token);
  },

  hasValidPortalToken(): boolean {
    return this.isValid();
  },
};
