export type StatusColorFamily = 'blue' | 'sky' | 'amber' | 'emerald' | 'teal' | 'rose' | 'slate';

export interface StatusColorTokens {
  dot: string;
  text: string;
  bg: string;
  border: string;
  iconGradient: string;
  headerGradient: string;
  footerGradient: string;
  /** Section card look while highlighted (e.g. nav scroll target): stronger border + faint tinted fill. */
  flash: string;
}

export const STATUS_COLOR_PALETTE: Record<StatusColorFamily, StatusColorTokens> = {
  blue: {
    flash: 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/25',
    dot: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200/70 dark:border-blue-900/40',
    iconGradient: 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5)]',
    headerGradient:
      'bg-gradient-to-r from-blue-50 via-blue-50/50 to-white dark:from-blue-950/30 dark:via-blue-950/10 dark:to-slate-900',
    footerGradient:
      'bg-gradient-to-l from-blue-50 via-blue-50/50 to-white dark:from-blue-950/30 dark:via-blue-950/10 dark:to-slate-900',
  },
  sky: {
    flash: 'border-sky-300 dark:border-sky-700 bg-sky-50/50 dark:bg-sky-950/25',
    dot: 'bg-sky-600',
    text: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/30',
    border: 'border-sky-200/70 dark:border-sky-900/40',
    iconGradient: 'bg-gradient-to-br from-[#4BA3E8] to-[#2A7FD0] shadow-[0_4px_10px_-2px_rgba(42,127,208,0.45)]',
    headerGradient:
      'bg-gradient-to-r from-sky-100 via-sky-50/60 to-white dark:from-sky-950/40 dark:via-sky-950/15 dark:to-slate-900',
    footerGradient:
      'bg-gradient-to-l from-sky-100 via-sky-50/60 to-white dark:from-sky-950/40 dark:via-sky-950/15 dark:to-slate-900',
  },
  amber: {
    flash: 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/25',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200/70 dark:border-amber-900/40',
    iconGradient: 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_4px_10px_-2px_rgba(245,158,11,0.5)]',
    headerGradient:
      'bg-gradient-to-r from-amber-50 via-amber-50/50 to-white dark:from-amber-950/30 dark:via-amber-950/10 dark:to-slate-900',
    footerGradient:
      'bg-gradient-to-l from-amber-50 via-amber-50/50 to-white dark:from-amber-950/30 dark:via-amber-950/10 dark:to-slate-900',
  },
  emerald: {
    flash: 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/25',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200/70 dark:border-emerald-900/40',
    iconGradient: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_4px_10px_-2px_rgba(16,185,129,0.5)]',
    headerGradient:
      'bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-white dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-slate-900',
    footerGradient:
      'bg-gradient-to-l from-emerald-50 via-emerald-50/50 to-white dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-slate-900',
  },
  teal: {
    flash: 'border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/25',
    dot: 'bg-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-200/70 dark:border-teal-900/40',
    iconGradient: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-[0_4px_10px_-2px_rgba(16,185,129,0.5)]',
    headerGradient:
      'bg-gradient-to-r from-teal-50 via-emerald-50/50 to-white dark:from-teal-950/30 dark:via-emerald-950/10 dark:to-slate-900',
    footerGradient:
      'bg-gradient-to-l from-teal-50 via-emerald-50/50 to-white dark:from-teal-950/30 dark:via-emerald-950/10 dark:to-slate-900',
  },
  rose: {
    flash: 'border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/25',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200/70 dark:border-rose-900/40',
    iconGradient: 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_4px_10px_-2px_rgba(239,68,68,0.5)]',
    headerGradient:
      'bg-gradient-to-r from-rose-50 via-rose-50/50 to-white dark:from-rose-950/30 dark:via-rose-950/10 dark:to-slate-900',
    footerGradient:
      'bg-gradient-to-l from-rose-50 via-rose-50/50 to-white dark:from-rose-950/30 dark:via-rose-950/10 dark:to-slate-900',
  },
  slate: {
    flash: 'border-slate-300 dark:border-slate-600 bg-slate-100/60 dark:bg-slate-800/40',
    dot: 'bg-slate-400',
    text: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    border: 'border-slate-200/70 dark:border-slate-700/50',
    iconGradient: 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-[0_4px_10px_-2px_rgba(100,116,139,0.5)]',
    headerGradient:
      'bg-gradient-to-r from-slate-100 via-slate-50/60 to-white dark:from-slate-800/50 dark:via-slate-800/20 dark:to-slate-900',
    footerGradient:
      'bg-gradient-to-l from-slate-100 via-slate-50/60 to-white dark:from-slate-800/50 dark:via-slate-800/20 dark:to-slate-900',
  },
};
