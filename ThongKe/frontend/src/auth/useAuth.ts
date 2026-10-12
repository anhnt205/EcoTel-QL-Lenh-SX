import { tokenService, decodeJwtPayload } from "./tokenService";

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
  departmentId?: number | null; // ID đơn vị báo cáo của user
  app: string;
  permissions: Record<string, PermissionDto>;
}

function decodeUser(): AppUser | null {
  const token = tokenService.getAppToken();
  if (!token) return null;
  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    return {
      username: payload.username,
      fullName: payload.fullName,
      companyId: payload.companyId ?? null,
      departmentId: payload.departmentId ?? null,
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
