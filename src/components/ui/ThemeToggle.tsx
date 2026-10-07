import React from 'react';
import { Sun, MoonStar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'antd';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/helpers';

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
  const { t } = useTranslation();
  const { themeMode, toggleTheme } = useThemeStore();

  return (
    <Tooltip
      title={themeMode === 'dark' ? t('theme_light') : t('theme_dark')}
      arrow={false}
      classNames={{
        container:
          '!min-h-0 !bg-white dark:!bg-slate-900 !text-slate-700 dark:!text-slate-200 !border !border-solid !border-slate-200/60 dark:!border-slate-800/85 !shadow-[0_4px_16px_rgba(15,23,42,0.08)] !font-normal !text-[11.5px] !rounded-xl !px-3 !py-1.5',
      }}
    >
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'group relative flex items-center justify-between w-[56px] h-[28px] p-[2px] rounded-full bg-slate-200/80 dark:bg-slate-800/90 border border-slate-300/60 dark:border-slate-700/80 shadow-inner hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer outline-none select-none shrink-0 overflow-hidden',
          className
        )}
        aria-label={t('common.toggle_theme')}
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-amber-400/15 via-transparent to-indigo-500/20 pointer-events-none" />

        <div className="flex items-center justify-center w-[22px] h-[22px] z-0">
          <Sun
            className={`w-3.5 h-3.5 transition-all duration-300 ${
              themeMode === 'dark' ? 'text-slate-400/60' : 'opacity-0 scale-75'
            }`}
          />
        </div>
        <div className="flex items-center justify-center w-[22px] h-[22px] z-0">
          <MoonStar
            className={`w-3.5 h-3.5 transition-all duration-300 ${
              themeMode === 'dark' ? 'opacity-0 scale-75' : 'text-slate-400/60'
            }`}
          />
        </div>

        <div
          className={`absolute top-[2px] left-[2px] w-[22px] h-[22px] rounded-full shadow-md transform transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center z-10 ${
            themeMode === 'dark'
              ? 'translate-x-[28px] border border-indigo-400/40 bg-slate-900 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.4)]'
              : 'translate-x-0 border border-amber-400/50 bg-white text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.35)]'
          }`}
        >
          {themeMode === 'dark' ? (
            <MoonStar className="w-3.5 h-3.5 drop-shadow-[0_0_3px_rgba(129,140,248,0.7)] group-hover:rotate-12 transition-transform duration-300" />
          ) : (
            <Sun className="w-3.5 h-3.5 drop-shadow-[0_0_3px_rgba(245,158,11,0.7)] group-hover:rotate-45 transition-transform duration-300" />
          )}
        </div>
      </button>
    </Tooltip>
  );
};

export default ThemeToggle;
