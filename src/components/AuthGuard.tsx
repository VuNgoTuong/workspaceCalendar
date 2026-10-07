import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "../store/authStore";
import { initKeycloak } from "../utils/keycloak";
import { deleteCookie, getCookie } from "../utils/cookie";
import { getAuthCookie, saveAuthCookie, setLocalStorage } from "../utils/common";
import { ActingLeaderGate } from "./ActingLeaderGate";
import { delegationAPI } from "../services/api/delegationAPI";

type Props = {
  children: ReactNode;
};

const AuthGuard = ({ children }: Props) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const kc = initKeycloak();
        const authMethod = localStorage.getItem("AUTH_METHOD");
        const manualToken = getCookie("token") || localStorage.getItem("token");
        const isLocalLogout = sessionStorage.getItem("LOCAL_LOGOUT") === "true";
        const isLoginPage = window.location.pathname === "/login";
        const { token: storedToken, refreshToken: storedRefreshToken } = getAuthCookie();

        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        const isCallback =
          urlParams.has("code") ||
          urlParams.has("error") ||
          urlParams.has("state") ||
          hashParams.has("code") ||
          hashParams.has("id_token") ||
          hashParams.has("access_token") ||
          hashParams.has("state");

        if (isLocalLogout || (isLoginPage && !isCallback)) {
          try {
            await kc.init({
              pkceMethod: "S256",
              checkLoginIframe: false,
              token: storedToken || undefined,
              refreshToken: storedRefreshToken || undefined,
            });
          } catch (e) {
            console.error(e);
          }

          if (manualToken) {
            restoreManualAuth(manualToken);
          }

          setReady(true);
          return;
        }

        const ssoCheckTried = sessionStorage.getItem("SSO_CHECK_TRIED") === "true";
        const initOptions: any = {
          checkLoginIframe: false,
          pkceMethod: "S256",
          token: storedToken || undefined,
          refreshToken: storedRefreshToken || undefined,
        };

        if (!isCallback && (authMethod === "sso" || !ssoCheckTried)) {
          initOptions.onLoad = "check-sso";
        }

        try {
          await kc.init(initOptions);
          if (!kc.authenticated) {
            sessionStorage.setItem("SSO_CHECK_TRIED", "true");
          }
        } catch (e) {
          console.error(e);
          sessionStorage.setItem("SSO_CHECK_TRIED", "true");
        }

        if (kc.authenticated) {
          const tokenExpiration = (kc.tokenParsed as any)?.exp
            ? ((kc.tokenParsed as any).exp * 1000).toString()
            : (Date.now() + 3600000).toString();
          saveAuthCookie(kc.token!, kc.refreshToken!, tokenExpiration);
          localStorage.setItem("AUTH_METHOD", "sso");

          deleteCookie("token");
          deleteCookie("refreshToken");
          localStorage.removeItem("is-authenticated");
          localStorage.removeItem("auth-user");

          delegationAPI.prefetchMyLeader().catch(() => {});

          try {
            const profile = await kc.loadUserProfile();
            const info = {
              ...profile,
              username: profile.username || (profile as any).preferred_username || profile.id,
              fullname: (kc.tokenParsed as any)?.name || (profile as any).fullname || `${profile.firstName || ""}`.trim() || profile.username,
              employeeCode: (profile as any).employeeCode || profile.username,
            };
            setLocalStorage("userInfo", info);

            useAuthStore.setState({
              isAuthenticated: true,
              user: {
                id: info.username || 'sso-user',
                name: info.fullname || 'SSO User',
                email: kc.tokenParsed?.email || '',
                role: 'ADMIN',
                permissions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'],
              }
            });
          } catch (e) {
            console.error(e);
            const fallbackInfo = {
              username: kc.tokenParsed?.preferred_username || "",
              fullname: (kc.tokenParsed as any)?.name || kc.tokenParsed?.preferred_username || "",
              email: kc.tokenParsed?.email || "",
            } as any;
            
            useAuthStore.setState({
              isAuthenticated: true,
              user: {
                id: fallbackInfo.username || 'sso-user',
                name: fallbackInfo.fullname || 'SSO User',
                email: fallbackInfo.email || '',
                role: 'ADMIN',
                permissions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'],
              }
            });
          }

          sessionStorage.removeItem("SSO_CHECK_TRIED");
        } else if (manualToken) {
          localStorage.setItem("AUTH_METHOD", "manual");
          restoreManualAuth(manualToken);
          delegationAPI.prefetchMyLeader().catch(() => {});
        }

        setReady(true);
      } catch (error) {
        console.error(error);

        const manualToken = getCookie("token") || localStorage.getItem("token");
        if (manualToken) {
          localStorage.setItem("AUTH_METHOD", "manual");
          restoreManualAuth(manualToken);
        }

        setReady(true);
      }
    };

    const restoreManualAuth = (_token: string) => {
      const savedUserStr = localStorage.getItem("auth-user");
      if (savedUserStr) {
        try {
          useAuthStore.setState({ isAuthenticated: true, user: JSON.parse(savedUserStr) });
          return;
        } catch (e) {
          console.warn(e);
        }
      }

      const userInfoStr = localStorage.getItem("userInfo");
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          useAuthStore.setState({
            isAuthenticated: true,
            user: {
              id: userInfo.id || userInfo.username || "",
              name: userInfo.fullname || "",
              email: userInfo.email || "",
              role: (userInfo.roles && userInfo.roles[0]) || 'ADMIN',
              roles: userInfo.roles || [],
              permissions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT'],
              avatarUrl: userInfo.avatarUrl || undefined,
            }
          });
        } catch (e) {
          console.warn(e);
        }
      }
    };

    initAuth();
  }, []);

  if (!ready) return null;

  return <ActingLeaderGate>{children}</ActingLeaderGate>;
};

export default AuthGuard;
export { AuthGuard };
