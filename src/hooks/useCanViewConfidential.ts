import { useAuthStore } from '../store/authStore';
import { useActingLeaderStore } from '../store/actingLeaderStore';
import { usePermission } from './usePermission';

const CONFIDENTIAL_EXEMPT_ROLES = ['administrator', 'admin'];

export const useCanViewConfidential = () => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const { hasRawRole } = usePermission();
  const isExempt = hasRawRole(CONFIDENTIAL_EXEMPT_ROLES);

  return (ownerUserId?: string | null, otherAuthorizedIds: (string | null | undefined)[] = []) => {
    if (isExempt) return true;
    const viewerIds = [currentUserId, actingLeaderId].filter((id): id is string => !!id);
    if (ownerUserId && viewerIds.includes(ownerUserId)) return true;
    return otherAuthorizedIds.some((id) => id && viewerIds.includes(id));
  };
};
