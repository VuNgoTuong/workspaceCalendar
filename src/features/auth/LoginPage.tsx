import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronDown, LogIn, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select } from 'antd';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { toast } from '../../components/ui/Toast';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { getKeycloak } from '../../utils/keycloak';
import { clearAuthCookie } from '../../utils/common';
import { switchLanguage } from '../../i18n';
import { useTitle } from '../../hooks/useTitle';

const VietnamFlag: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 3 2"
    width="20"
    height="13.3"
    style={{ borderRadius: '2px', display: 'block' }}
  >
    <rect width="3" height="2" fill="#da251d" />
    <polygon
      points="1.5,0.4 1.62,0.85 2.1,0.85 1.71,1.13 1.86,1.6 1.5,1.3 1.14,1.6 1.29,1.13 0.9,0.85 1.38,0.85"
      fill="#ffff00"
    />
  </svg>
);

const UKFlag: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 60 30"
    width="20"
    height="10"
    style={{ borderRadius: '2px', display: 'block' }}
  >
    <rect width="60" height="30" fill="#012169" />
    <path d="M0,0 L60,30 M0,30 L60,0" stroke="#fff" strokeWidth="6" />
    <path d="M0,0 L60,30 M0,30 L60,0" stroke="#c8102e" strokeWidth="4" />
    <path d="M0,15 L60,15 M30,0 L30,30" stroke="#fff" strokeWidth="10" />
    <path d="M0,15 L60,15 M30,0 L30,30" stroke="#c8102e" strokeWidth="6" />
  </svg>
);

const REMEMBERED_LOGIN_KEY = 'REMEMBERED_LOGIN';

const readRememberedLogin = (): { username: string; domain: string } | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(REMEMBERED_LOGIN_KEY) || 'null');
    return parsed && typeof parsed.username === 'string' ? { username: parsed.username, domain: parsed.domain ?? '' } : null;
  } catch {
    return null;
  }
};

const writeRememberedLogin = (value: { username: string; domain: string } | null) => {
  try {
    if (value) localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify(value));
    else localStorage.removeItem(REMEMBERED_LOGIN_KEY);
  } catch {
  }
};

export const LoginPage: React.FC = () => {
  useTitle();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark';

  const [remembered] = useState(readRememberedLogin);
  const [email, setEmail] = useState<string>(remembered?.username ?? '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [domain, setDomain] = useState<string>(remembered ? remembered.domain : 'thaco.com.vn');
  const [rememberMe, setRememberMe] = useState<boolean>(!!remembered);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { isAuthenticated, login, isLoading } = useAuthStore(
    useShallow((s) => ({ isAuthenticated: s.isAuthenticated, login: s.login, isLoading: s.isLoading }))
  );
  const navigate = useNavigate();

  useEffect(() => {
    const isLocalLogout = sessionStorage.getItem('LOCAL_LOGOUT') === 'true';
    if (isAuthenticated && !isLocalLogout && !isLoading && !isSubmitting) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, isLoading, isSubmitting]);

  const handleSSOLogin = () => {
    const kc = getKeycloak();
    if (kc) {
      clearAuthCookie();
      sessionStorage.removeItem('LOCAL_LOGOUT');
      localStorage.setItem('AUTH_METHOD', 'sso');
      localStorage.setItem('LOGIN_TYPE', 'sso');
      kc.login({
        redirectUri: window.location.origin + '/',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.warning(t('login.emailRequired'));
      return;
    }
    if (!password) {
      toast.warning(t('login.passwordRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        username: email,
        password: password,
        domain: domain,
      });

      const loggedInName = useAuthStore.getState().user?.name || email;
      toast.success(t('login.success', { name: loggedInName }));
      sessionStorage.removeItem('LOCAL_LOGOUT');
      localStorage.setItem('LOGIN_TYPE', domain ? 'email' : 'employee_code');
      writeRememberedLogin(rememberMe ? { username: email, domain } : null);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('[LoginPage handleSubmit] Login failed:', error);
      toast.error(t('login.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const domainOptions = useMemo(
    () => [
      { value: 'thaco.com.vn', label: '@thaco.com.vn' },
      { value: 'thagrico.vn', label: '@thagrico.vn' },
      { value: 'thiso.vn', label: '@thiso.vn' },
      { value: 'emart.vn', label: '@emart.vn' },
      { value: 'thilogi.com.vn', label: '@thilogi.com.vn' },
      { value: 'thadico.vn', label: '@thadico.vn' },
      { value: '', label: t('login.employeeCode') },
    ],
    [t]
  );

  const handleLangChange = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    switchLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <div className={`flex w-full min-h-screen flex-col lg:flex-row transition-colors duration-200 ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}>
        
        <div className="hidden lg:flex lg:flex-[1.5] xl:flex-[2] shrink-0 relative bg-gray-200">
          <img
            src="/images/manhinh-1440.webp"
            srcSet="/images/manhinh-960.webp 960w, /images/manhinh-1440.webp 1440w, /images/manhinh-1920.webp 1920w, /images/manhinh-2560.webp 2560w"
            sizes="(min-width: 1280px) max(67vw, 178vh), max(60vw, 178vh)"
            width={1920}
            height={1080}
            fetchPriority="high"
            alt="THACO Headquarters"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-transparent"></div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 sm:px-12 md:px-16 lg:px-20 py-8 sm:py-12 relative">
          
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleLangChange}
              className={`px-2.5 h-[28px] rounded-xl border border-solid transition-all duration-200 hover:-translate-y-0.5 transform flex items-center gap-1.5 cursor-pointer shadow-xs select-none shrink-0 ${
                isDark 
                  ? 'border-slate-800 bg-slate-800 text-gray-200 hover:bg-slate-750 hover:border-slate-700' 
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title={currentLang === 'vi' ? t('login.switchToEnglish') : t('login.switchToVietnamese')}
            >
              {currentLang === 'vi' ? <VietnamFlag /> : <UKFlag />}
              <span className="text-xs font-semibold uppercase leading-none">{currentLang}</span>
            </button>

            <ThemeToggle />
          </div>

          <div className="w-full max-w-[340px]">
            <div className="mb-6 text-left">
              <h1 className={`font-bold text-3xl mb-1 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('login.title')}
              </h1>
              <p className={`text-13 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {t('login.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className={`block font-bold text-sm ${isDark ? 'text-slate-300' : 'text-gray-850'}`}>
                  {t('login.emailLabel')}
                </label>

                <div className={`flex overflow-hidden rounded-xl border border-solid transition-all ${
                  isDark 
                    ? 'border-slate-800 bg-slate-800/80 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500' 
                    : 'border-gray-200 bg-white focus-within:border-[#0054a5] focus-within:ring-1 focus-within:ring-[#0054a5]'
                }`}>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={domain ? t('login.emailPlaceholder') : t('login.employeeCode')}
                      className={`w-full px-3 py-2 outline-none text-13 bg-transparent border-0 ${
                        isDark ? 'text-white placeholder:text-slate-500' : 'text-gray-950 placeholder:text-gray-300'
                      }`}
                    />
                  </div>

                  <div className={`flex items-stretch border-0 border-l border-solid ${isDark ? 'border-slate-800 bg-slate-800/50' : 'border-gray-200 bg-gray-50/50'}`}>
                    <Select
                      variant="borderless"
                      value={domain}
                      onChange={(value) => setDomain(value)}
                      suffixIcon={<ChevronDown size={14} className="text-slate-400" />}
                      className="login-domain-select min-w-[130px] min-h-[36px] flex items-center"
                      popupMatchSelectWidth={false}
                      listHeight={320}
                      options={domainOptions}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`block font-bold text-sm ${isDark ? 'text-slate-300' : 'text-gray-850'}`}>
                  {t('login.passwordLabel')}
                </label>

                <div className={`relative flex items-center overflow-hidden rounded-xl border border-solid transition-all ${
                  isDark 
                    ? 'border-slate-800 bg-slate-800/80 focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500' 
                    : 'border-gray-200 bg-white focus-within:border-[#0054a5] focus-within:ring-1 focus-within:ring-[#0054a5]'
                }`}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('login.passwordPlaceholder')}
                    className={`w-full px-4 py-2 pr-12 outline-none text-13 bg-transparent border-0 ${
                      isDark ? 'text-white placeholder:text-slate-500' : 'text-gray-950 placeholder:text-gray-300'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 p-1 transition-colors bg-transparent border-0 cursor-pointer ${
                      isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-300 hover:text-gray-500'
                    }`}
                  >
                    {showPassword ? (
                      <EyeOff strokeWidth={1.5} className="w-4 h-4" />
                    ) : (
                      <Eye strokeWidth={1.5} className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 w-fit cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={`w-4 h-4 rounded cursor-pointer ${isDark ? 'accent-sky-500' : 'accent-[#0054a5]'}`}
                />
                <span className={`text-13 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{t('login.rememberMe')}</span>
              </label>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full h-10 bg-gradient-to-r from-[#0054a5] via-[#005cb8] to-[#003e7a] hover:from-[#005cb8] hover:to-[#00478c] text-white rounded-xl font-semibold text-sm shadow-md shadow-[#0054a5]/20 hover:shadow-lg hover:shadow-[#0054a5]/35 hover:-translate-y-0.5 transform transition-all duration-200 active:translate-y-0 active:scale-[0.985] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center gap-2 border-0"
                >
                  {isSubmitting || isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('login.loggingIn')}
                    </span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>{t('login.loginBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t border-solid ${isDark ? 'border-slate-800' : 'border-gray-200'}`}></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className={`px-4 transition-colors duration-200 font-medium ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-white text-gray-400'}`}>
                  {t('login.or')}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting || isLoading}
              onClick={handleSSOLogin}
              className={`w-full h-10 border border-solid rounded-xl font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 active:translate-y-0 active:scale-[0.985] ${
                isDark 
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-750 hover:border-slate-600 hover:text-white shadow-xs' 
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-slate-50 hover:border-gray-300 hover:text-gray-900 shadow-xs hover:shadow-sm'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-[#0054a5]" />
              <span>{t('login.ssoBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
