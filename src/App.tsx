import React, { useEffect, useMemo } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntdApp, theme as AntdThemeLib } from 'antd';
import viVN from 'antd/locale/vi_VN';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import { useTranslation } from 'react-i18next';
import AppRouter from './routes';
import { useThemeStore } from './store/themeStore';
import { COLORS } from './constants';
import { queryClient } from './services/api/queryClient';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

import { AuthGuard } from './components/AuthGuard';
import { SignalRProvider } from './providers/SignalRProvider';

dayjs.extend(updateLocale);
dayjs.extend(utc);
dayjs.locale('vi');

dayjs.updateLocale('vi', {
  monthsShort: [
    'Tháng 01', 'Tháng 02', 'Tháng 03', 'Tháng 04', 'Tháng 05', 'Tháng 06',
    'Tháng 07', 'Tháng 08', 'Tháng 09', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ],
  months: [
    'Tháng 01', 'Tháng 02', 'Tháng 03', 'Tháng 04', 'Tháng 05', 'Tháng 06',
    'Tháng 07', 'Tháng 08', 'Tháng 09', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ]
});

export const App: React.FC = () => {
  const { themeMode } = useThemeStore();
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'vi';

  useEffect(() => {
    dayjs.locale(currentLang);
    const appTitle = currentLang === 'en' ? 'THACO Work Schedule' : 'Lịch làm việc THACO';
    if (!document.title || document.title === 'THACO Work Schedule' || document.title === 'Lịch làm việc THACO') {
      document.title = appTitle;
    }
  }, [currentLang]);

  const antTheme = useMemo(() => ({
    token: {
      colorPrimary: COLORS.primary.main,
      colorInfo: COLORS.primary.main,
      colorSuccess: COLORS.status.success.main,
      colorWarning: COLORS.status.warning.main,
      colorError: COLORS.status.error.main,
      colorBgElevated: themeMode === 'dark' ? '#0f172a' : '#ffffff',
      colorBgContainer: themeMode === 'dark' ? '#1e293b' : '#ffffff',
      borderRadius: 12,
      fontFamily: "'Inter Variable', 'Inter', sans-serif",
    },
    algorithm: themeMode === 'dark' ? AntdThemeLib.darkAlgorithm : AntdThemeLib.defaultAlgorithm,
    components: {
      Button: {
        controlHeight: 38,
        fontWeight: 500,
      },
      Input: {
        controlHeight: 38,
      },
      Select: {
        controlHeight: 38,
      },
      Checkbox: {
        borderRadiusSM: 4,
      },
      Table: {
        headerBg: themeMode === 'dark' ? COLORS.theme.dark.border : COLORS.theme.light.bgLayout,
        headerColor: themeMode === 'dark' ? COLORS.theme.dark.textMuted : COLORS.theme.light.textInactive,
        rowHoverBg: themeMode === 'dark' ? '#334155' : '#f1f5f9',
        borderRadius: 0,
        borderRadiusLG: 0,
        tableScrollThumbSize: 6,
      },
      Card: {
        boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      },
      Modal: {
        borderRadiusLG: 20,
      },
    },
  }), [themeMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antTheme} locale={currentLang === 'en' ? enUS : viVN}>
        <AntdApp>
          <ErrorBoundary>
            <BrowserRouter>
              <AuthGuard>
                <SignalRProvider>
                  <AppRouter />
                </SignalRProvider>
              </AuthGuard>
            </BrowserRouter>
          </ErrorBoundary>
          <ToastContainer />
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
