import React from 'react';
import { Layout } from 'antd';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/themeStore';

const { Footer: AntdFooter } = Layout;

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { themeMode } = useThemeStore();

  return (
    <AntdFooter
      className="text-center text-gray-400 dark:text-slate-500 text-xs py-2 bg-white dark:bg-slate-900 select-none transition-all duration-300"
      style={{
        background: themeMode === 'dark' ? '#0f172a' : '#ffffff',
        backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
        borderTop: themeMode === 'dark' ? '1px solid #1e293b' : '1px solid #e2e8f0',
      }}
    >
      THACO &copy; {new Date().getFullYear()} - {t('footer_copyright')}
    </AntdFooter>
  );
};

export default Footer;
