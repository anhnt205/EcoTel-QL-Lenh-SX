import { tokenService } from "./tokenService";

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const PORTAL_URL = import.meta.env.VITE_PORTAL_URL;

export const initializeAppAuth = async (): Promise<boolean> => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  params.delete("code");
  const cleanSearch = params.toString();
  const cleanPath =
    window.location.pathname +
    (cleanSearch ? `?${cleanSearch}` : "") +
    window.location.hash;
  window.history.replaceState({}, document.title, cleanPath);

  if (!code) {
    return tokenService.hasValidPortalToken();
  }

  try {
    const response = await fetch(`${VITE_API_BASE_URL}/auth/exchange-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      throw new Error(`Exchange failed: ${response.status}`);
    }

    const { appToken, refreshToken } = await response.json();
    tokenService.saveTokens(appToken, refreshToken);
    return true;
  } catch (error) {
    console.error("[Auth] OTC exchange failed:", error);
    tokenService.clear();
    if (PORTAL_URL) {
      window.location.href = PORTAL_URL;
    }
    return false;
  }
};
