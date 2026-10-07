import { create } from 'zustand';
import type { User, UserRole } from '../types';
import { authAPI } from '../services/api/authAPI';
import { userAPI } from '../services/api/userAPI';
import { queryClient } from '../services/api/queryClient';
import { CURRENT_USER_QUERY_KEY } from '../hooks/useCurrentUserQuery';
import { setCookie, deleteCookie } from '../utils/cookie';
import { getKeycloak } from '../utils/keycloak';
import { clearAuthCookie, clearAuthSession } from '../utils/common';
import { useActingLeaderStore } from './actingLeaderStore';
import { useSidebarStore } from './sidebarStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (roleOrCredentials: any) => Promise<void>;
  logout: () => void;
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'],
  OPERATOR: ['CREATE', 'READ', 'UPDATE'],
  VIEWER: ['READ'],
};

export const useAuthStore = create<AuthState>((set) => {
  const isAuthInit = localStorage.getItem('is-authenticated') === 'true';
  const savedUserJson = localStorage.getItem('auth-user');
  let userInit = null;
  if (isAuthInit && savedUserJson) {
    try {
      userInit = JSON.parse(savedUserJson);
    } catch (e) {
      console.error(e);
    }
  }

  return {
    user: userInit,
    isAuthenticated: isAuthInit,
    isLoading: false,

    login: async (roleOrCredentials?: any) => {
      set({ isLoading: true });
      try {
        let loggedInUser: User;

        if (!roleOrCredentials || typeof roleOrCredentials !== 'object') {
          throw new Error('Credentials are required for login.');
        }

        const response = await authAPI.login({
          username: roleOrCredentials.username,
          password: roleOrCredentials.password,
          domain: roleOrCredentials.domain,
        });

        const token = response.token;
        const refreshToken = response.refreshToken;

        if (!token) {
          throw new Error('API response did not return a valid token.');
        }

        // Save tokens to cookies
        setCookie('token', token);
        if (refreshToken) {
          setCookie('refreshToken', refreshToken);
        }
        localStorage.setItem('AUTH_METHOD', 'manual');

        // Fetch full user profile to get the fullname
        let userProfile = null;
        try {
          userProfile = await userAPI.getCurrentUser();
          queryClient.setQueryData(CURRENT_USER_QUERY_KEY, userProfile);
        } catch (e) {
          console.error('Failed to fetch user profile:', e);
        }

        let targetRole: UserRole = 'ADMIN';
        if (response.roles && response.roles.length > 0) {
          const firstRole = response.roles[0].toUpperCase();
          if (firstRole === 'ADMIN' || firstRole === 'OPERATOR' || firstRole === 'VIEWER') {
            targetRole = firstRole as UserRole;
          }
        } else if (userProfile?.roles && userProfile.roles.length > 0) {
          const firstRole = userProfile.roles[0].toUpperCase();
          if (firstRole === 'ADMIN' || firstRole === 'OPERATOR' || firstRole === 'VIEWER') {
            targetRole = firstRole as UserRole;
          }
        } else {
          const username = (roleOrCredentials.username || '').toLowerCase();
          if (username.includes('operator')) {
            targetRole = 'OPERATOR';
          } else if (username.includes('viewer')) {
            targetRole = 'VIEWER';
          }
        }

        loggedInUser = {
          id: response.id || userProfile?.id || response.username || 'user',
          name: userProfile?.fullname || response.fullname || response.username || roleOrCredentials.username,
          email: userProfile?.email || response.email || `${roleOrCredentials.username}`,
          role: targetRole,
          roles: response.roles || userProfile?.roles || [],
          permissions: ROLE_PERMISSIONS[targetRole],
          menus: userProfile?.menus || userProfile?.user?.menus || [],
          avatarUrl: userProfile?.avatarUrl || response.avatarUrl,
        };

        // Save userInfo to localStorage to be consistent with AuthGuard restoration
        const info = {
          id: loggedInUser.id,
          username: response.username || roleOrCredentials.username,
          fullname: loggedInUser.name,
          email: loggedInUser.email,
          roles: [targetRole],
          avatarUrl: userProfile?.avatarUrl || response.avatarUrl,
        };
        localStorage.setItem('userInfo', JSON.stringify(info));

        localStorage.setItem('is-authenticated', 'true');
        localStorage.setItem('auth-user', JSON.stringify(loggedInUser));
        useSidebarStore.getState().setCollapsed(false);

        set({
          user: loggedInUser,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: () => {
      const keycloak = getKeycloak();

      window.location.href = '/';

      // Clear cookies and storage
      deleteCookie('token');
      deleteCookie('refreshToken');
      clearAuthCookie();
      clearAuthSession();

      localStorage.removeItem('is-authenticated');
      localStorage.removeItem('auth-user');
      localStorage.removeItem('LOGIN_TYPE');
      localStorage.removeItem('AUTH_METHOD');
      localStorage.removeItem('kc_token');
      localStorage.removeItem('kc_refreshToken');
      localStorage.removeItem('kc_tokenExpiration');
      localStorage.removeItem('userInfo');
      useActingLeaderStore.getState().reset();

      sessionStorage.setItem('LOCAL_LOGOUT', 'true');
      sessionStorage.removeItem('SSO_CHECK_TRIED');

      if (keycloak && keycloak.authenticated) {
        keycloak.clearToken();
      }
    },
  };
});
