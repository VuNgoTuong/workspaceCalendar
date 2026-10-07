import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import type { PermissionAction, UserRole } from '../../types';

interface PermissionGuardProps {
  children: React.ReactNode;
  action?: PermissionAction;
  roles?: UserRole[];
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  action,
  roles,
  fallback = null,
}) => {
  const { hasPermission, hasRole } = usePermission();

  let allowed = true;

  if (action) {
    allowed = allowed && hasPermission(action);
  }

  if (roles) {
    allowed = allowed && hasRole(roles);
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
export default PermissionGuard;
