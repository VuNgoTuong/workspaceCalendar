import React from 'react';
import { cn } from '../../utils/helpers';

export type BadgeVariant =
  | 'default'
  | 'slate'
  | 'neutral'
  | 'blue'
  | 'sky'
  | 'info'
  | 'emerald'
  | 'success'
  | 'amber'
  | 'warning'
  | 'red'
  | 'rose'
  | 'error'
  | 'violet'
  | 'purple'
  | 'cyan';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-slate-50 text-slate-600 border border-slate-200/70 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
  slate: 'bg-slate-50 text-slate-600 border border-slate-200/70 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
  neutral: 'bg-slate-50/80 text-slate-500 border border-slate-200/50 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50',
  blue: 'bg-blue-50/90 text-blue-700 border border-blue-200/60 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50',
  sky: 'bg-sky-50/90 text-[#0284C7] border border-sky-200/60 dark:bg-sky-950/50 dark:text-[#38BDF8] dark:border-sky-800/50',
  info: 'bg-blue-50/90 text-blue-700 border border-blue-200/60 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50',
  emerald: 'bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/30 dark:bg-emerald-950/50 dark:text-[#34D399] dark:border-emerald-800/50',
  success: 'bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/30 dark:bg-emerald-950/50 dark:text-[#34D399] dark:border-emerald-800/50',
  amber: 'bg-amber-50/90 text-amber-700 border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50',
  warning: 'bg-amber-50/90 text-amber-700 border border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50',
  red: 'bg-rose-50/90 text-rose-700 border border-rose-200/60 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50',
  rose: 'bg-rose-50/90 text-rose-700 border border-rose-200/60 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50',
  error: 'bg-rose-50/90 text-rose-700 border border-rose-200/60 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50',
  violet: 'bg-purple-50/90 text-purple-700 border border-purple-200/60 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/50',
  purple: 'bg-purple-50/90 text-purple-700 border border-purple-200/60 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/50',
  cyan: 'bg-cyan-50/90 text-cyan-700 border border-cyan-200/60 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800/50',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: 'px-0 py-0.5 text-[10.5px] gap-1',
  sm: 'px-0 py-0.5 text-[11px] gap-1',
  md: 'px-2 py-0.5 text-[11.5px] gap-1.5',
  lg: 'px-3.5 py-1 text-[12.5px] gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  icon,
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-normal select-none whitespace-nowrap transition-colors',
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.default,
        SIZE_CLASSES[size] || SIZE_CLASSES.md,
        className
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
