import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import { ArrowLeft, Home } from 'lucide-react';
import { useTitle } from '../../hooks';
import { useThemeStore } from '../../store/themeStore';

export const Page404: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark';

  useTitle(`404 - ${t('errors.title_404')}`, true);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 overflow-hidden bg-gradient-to-b from-white via-teal-50/40 to-emerald-50/70 dark:from-[#090d16] dark:via-[#090d16] dark:to-[#090d16] transition-colors duration-300">
      
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div 
          className="absolute inset-0 opacity-[0.3] dark:opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(to right, ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)'} 1px, transparent 1px), 
                              linear-gradient(to bottom, ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)'} 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-teal-500/20 dark:bg-teal-500/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-400/15 dark:bg-teal-900/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center px-4">
        
        <div className="mb-14">
          <img
            src="/images/logo-thaco.png"
            alt="THACO Logo"
            className="h-9 object-contain select-none"
            style={{
              filter: isDark ? 'brightness(0) invert(1)' : 'none'
            }}
          />
        </div>

        <div className="relative mb-6 select-none">
          <span className="absolute inset-0 text-150 sm:text-180 font-black tracking-tighter text-teal-500/5 dark:text-teal-500/5 blur-md">
            404
          </span>
          <h1 className="relative text-140 sm:text-170 font-black tracking-tighter leading-none text-transparent bg-clip-text shimmer-gold-number drop-shadow-[0_4px_20px_rgba(197,168,128,0.25)]">
            404
          </h1>
        </div>

        <div className="max-w-xl flex flex-col items-center">
          <span className="text-13 font-bold tracking-[0.3em] text-teal-700 dark:text-teal-300 uppercase mb-3">
            {t('errors.eyebrow_404')}
          </span>

          <h2 className="py-1 text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-teal-700 to-emerald-500 dark:from-slate-50 dark:via-teal-300 dark:to-emerald-400">
            {t('errors.title_404')}
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-14.5 leading-relaxed mb-10 font-medium">
            {t('errors.desc_404')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
            <Button
              type="default"
              icon={<ArrowLeft size={14} />}
              onClick={() => navigate(-1)}
              className="h-11 px-7 rounded-xl font-semibold border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:text-[#00529C] dark:hover:text-sky-400 hover:border-[#00529C] dark:hover:border-sky-500 flex items-center justify-center gap-2 bg-transparent transition-all duration-200 hover:scale-[1.02]"
            >
              {t('errors.go_back')}
            </Button>
            <Button
              type="primary"
              icon={<Home size={14} />}
              onClick={() => navigate('/')}
              className="h-11 px-7 rounded-xl font-semibold bg-[#00529C] hover:bg-[#0066C7] dark:bg-blue-600 dark:hover:bg-blue-500 border-0 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all duration-200 hover:scale-[1.02]"
            >
              {t('errors.back_home')}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Page404;
