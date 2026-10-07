import { useAuthStore } from '../store/authStore';
import type { PermissionAction, UserRole } from '../types';

export const usePermission = () => {
  const user = useAuthStore((s) => s.user);

  const hasPermission = (action: PermissionAction): boolean => {
    if (!user) return false;
    return user.permissions.includes(action);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasRawRole = (roleNames: string[]): boolean => {
    if (!user?.roles?.length) return false;
    const normalized = roleNames.map((r) => r.toLowerCase());
    return user.roles.some((r) => normalized.includes(r.toLowerCase()));
  };

  return {
    hasPermission,
    hasRole,
    hasRawRole,
    role: user?.role || null,
    user,
  };
};
