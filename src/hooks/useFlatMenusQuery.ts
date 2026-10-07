import { useQuery } from '@tanstack/react-query';
import { fetchCurrentUser } from './useCurrentUserQuery';
import menuAPI from '../services/api/menuAPI';
import { useAuthStore } from '../store/authStore';

export const normalizeMenuUrl = (url?: string) => {
  if (!url) return '';
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const hasMenuPermission = (menuList: any[], targetPath: string): boolean => {
  if (!Array.isArray(menuList) || menuList.length === 0) return true;
  const normalizedTarget = normalizeMenuUrl(targetPath);
  if (!normalizedTarget) return true;

  return menuList.some((m) => {
    if (!m || m.isActive === false) return false;
    const normUrl = normalizeMenuUrl(m.url);
    if (!normUrl) return false;
    if (normUrl === normalizedTarget) return true;
    // Only allow prefix matching if normUrl is a specific leaf menu route (depth >= 2)
    const isLeafRoute = normUrl.split('/').filter(Boolean).length >= 2;
    return isLeafRoute && normalizedTarget.startsWith(`${normUrl}/`);
  });
};

export const useFlatMenusQuery = () =>
  useQuery<any[]>({
    queryKey: ['menus-flat-list'],
    queryFn: async () => {
      const cachedMenus = useAuthStore.getState().user?.menus;
      if (Array.isArray(cachedMenus) && cachedMenus.length > 0) {
        return cachedMenus;
      }
      try {
        const me = await fetchCurrentUser();
        const userMenus = me?.menus || me?.user?.menus;
        if (Array.isArray(userMenus) && userMenus.length > 0) {
          return userMenus;
        }
      } catch (e) {
        console.warn('Failed to load user menus, trying general menus list', e);
      }
      try {
        const res = await menuAPI.getMenus();
        return Array.isArray(res) ? res : (res?.items || []);
      } catch (e) {
        console.error('Failed to load general menus list', e);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });
