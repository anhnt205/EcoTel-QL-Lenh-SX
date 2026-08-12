import { tokenService } from "./tokenService";

interface PermissionDto {
  c: boolean;
  r: boolean;
  u: boolean;
  d: boolean;
  a: boolean;
}

interface AppUser {
  username: string;
  fullName: string;
  companyId: number | null;
  app: string;
  permissions: Record<string, PermissionDto>;
}

function decodeUser(): AppUser | null {
  const token = tokenService.getAppToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return {
      username: payload.username,
      fullName: payload.fullName,
      companyId: payload.companyId ?? null,
      app: payload.app,
      permissions: payload.permissions ?? {},
    };
  } catch {
    return null;
  }
}

export function useAuth() {
  const user = decodeUser();

  const signOut = () => {
    tokenService.clear();
    const portalUrl = import.meta.env.VITE_PORTAL_URL;
    window.location.href = portalUrl || "/";
  };

  return { user, signOut };
}
