import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToastStore, toast } from '../../store/toastStore';
import type { ToastItem } from '../../store/toastStore';

export { toast };

const EXIT_DURATION = 300;

interface ToastItemProps {
  toast: ToastItem;
}

export const ToastItemComponent: React.FC<ToastItemProps> = ({ toast }) => {
  const removeToast = useToastStore((state) => state.removeToast);
  const { t } = useTranslation();
  const [isLeaving, setIsLeaving] = useState(false);

  const dismiss = () => setIsLeaving(true);

  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    const timer = setTimeout(dismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration]);

  useEffect(() => {
    if (!isLeaving) return;
    const timer = setTimeout(() => removeToast(toast.id), EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [isLeaving, removeToast, toast.id]);

  const config = {
    success: {
      icon: CheckCircle2,
      badgeBg: 'bg-emerald-500 text-white dark:bg-emerald-600 dark:text-white ring-4 ring-emerald-500/15',
      borderColor: 'border-emerald-200/80 dark:border-emerald-900/60',
      shadowColor: 'shadow-emerald-500/5',
      title: t('toast.success'),
    },
    error: {
      icon: AlertCircle,
      badgeBg: 'bg-rose-500 text-white dark:bg-rose-600 dark:text-white ring-4 ring-rose-500/15',
      borderColor: 'border-rose-200/80 dark:border-rose-900/60',
      shadowColor: 'shadow-rose-500/5',
      title: t('toast.error'),
    },
    warning: {
      icon: AlertTriangle,
      badgeBg: 'bg-amber-500 text-white dark:bg-amber-600 dark:text-white ring-4 ring-amber-500/15',
      borderColor: 'border-amber-200/80 dark:border-amber-900/60',
      shadowColor: 'shadow-amber-500/5',
      title: t('toast.warning'),
    },
    info: {
      icon: Info,
      badgeBg: 'bg-sky-500 text-white dark:bg-sky-600 dark:text-white ring-4 ring-sky-500/15',
      borderColor: 'border-sky-200/80 dark:border-sky-900/60',
      shadowColor: 'shadow-sky-500/5',
      title: t('toast.info'),
    },
  }[toast.type];

  const IconComponent = config.icon;

  const displayTitle =
    toast.title && !['Success!', 'Error!', 'Warning!', 'Help!'].includes(toast.title)
      ? toast.title
      : config.title;

  return (
    <div
      className={`group relative flex items-start w-[350px] sm:w-[390px] overflow-hidden rounded-2xl border ${config.borderColor} bg-white/95 dark:bg-[#0c1324]/95 backdrop-blur-md p-4 pr-9 gap-3.5 shadow-xl ${config.shadowColor} transition-all duration-200 ${
        isLeaving ? 'animate-slide-out opacity-0 scale-95' : 'animate-slide-in opacity-100 scale-100'
      }`}
    >
      {/* Icon Badge */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${config.badgeBg}`}>
        <IconComponent size={19} strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <h4 className="text-14 font-semibold text-slate-800 dark:text-slate-100 leading-snug">
          {displayTitle}
        </h4>
        {toast.message && (
          <p className="text-12.5 font-normal text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">
            {toast.message}
          </p>
        )}
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3.5 right-3 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-0 bg-transparent cursor-pointer"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 pointer-events-none max-h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastItemComponent toast={item} />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
