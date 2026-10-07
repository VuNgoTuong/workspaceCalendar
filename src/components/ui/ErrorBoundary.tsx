import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home } from 'lucide-react';
import i18n from '../../i18n';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }



  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const isDark = typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false;

      return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 overflow-hidden bg-gradient-to-b from-white via-blue-50/40 to-sky-50/70 dark:from-[#090d16] dark:via-[#090d16] dark:to-[#090d16] transition-colors duration-300">
          
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div 
              className="absolute inset-0 opacity-[0.3] dark:opacity-[0.15]"
              style={{
                backgroundImage: `linear-gradient(to right, ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)'} 1px, transparent 1px), 
                                  linear-gradient(to bottom, ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)'} 1px, transparent 1px)`,
                backgroundSize: '48px 48px',
              }}
            />
            
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-500/20 dark:bg-sky-500/10 blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-sky-400/15 dark:bg-blue-900/10 blur-[120px]" />
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
              <span className="absolute inset-0 text-150 sm:text-180 font-black tracking-tighter text-blue-500/5 dark:text-sky-500/5 blur-md">
                503
              </span>
              <h1 className="relative text-140 sm:text-170 font-black tracking-tighter leading-none text-transparent bg-clip-text shimmer-gold-number drop-shadow-[0_4px_20px_rgba(224,169,109,0.25)]">
                503
              </h1>
            </div>

            <div className="max-w-xl flex flex-col items-center">
              <span className="text-13 font-bold tracking-[0.3em] text-[#00529C] dark:text-sky-400 uppercase mb-3">
                {i18n.t('errors.eyebrow_503')}
              </span>

              {/* py-1 keeps Vietnamese diacritics inside the clipped gradient box */}
              <h2 className="py-1 text-2xl sm:text-3xl font-extrabold tracking-tight mb-3 text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-[#00529C] to-sky-500 dark:from-slate-50 dark:via-sky-300 dark:to-sky-500">
                {i18n.t('errors.boundary_title_line1')}{' '}{i18n.t('errors.boundary_title_line2')}
              </h2>

              <p className="text-slate-500 dark:text-slate-400 text-[14.5px] leading-relaxed mb-10 font-normal">
                {i18n.t('errors.boundary_desc')}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="h-11 px-7 rounded-xl font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:text-[#00529C] dark:hover:text-sky-400 hover:border-[#00529C] dark:hover:border-sky-500 flex items-center justify-center gap-2 bg-transparent transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                >
                  <RefreshCw size={14} className="transition-transform duration-500 hover:rotate-180" />
                  {i18n.t('errors.reload_btn')}
                </button>
                <button
                  type="button"
                  onClick={() => { window.location.href = '/'; }}
                  className="h-11 px-7 rounded-xl font-semibold bg-[#00529C] hover:bg-[#0066C7] dark:bg-blue-600 dark:hover:bg-blue-500 border-0 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 text-white transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                >
                  <Home size={14} />
                  {i18n.t('errors.back_home_btn')}
                </button>
              </div>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
