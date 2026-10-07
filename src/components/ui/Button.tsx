import React from 'react';
import { cn } from '../../utils/helpers';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'relative inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer before:absolute before:-top-2 before:-bottom-2 before:inset-x-0';

    const variants = {
      primary: 'bg-gradient-to-r from-[#0066C7] to-[#0082E6] hover:from-[#007cd8] hover:to-[#0094ff] text-white shadow-[0_4px_14px_rgba(0,102,199,0.25)] dark:shadow-[0_4px_14px_rgba(0,102,199,0.15)] border-0 focus:ring-[#0066C7]/50 dark:focus:ring-offset-slate-900',
      secondary: 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-transparent focus:ring-slate-400/50 dark:focus:ring-offset-slate-900',
      outline: 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 focus:ring-slate-400/50 dark:focus:ring-offset-slate-900',
      ghost: 'bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-0 focus:ring-slate-400/50 dark:focus:ring-offset-slate-900',
      danger: 'bg-gradient-to-r from-[#ef4444] to-[#ef4444] hover:from-[#ef4444] hover:to-[#ff5c75] text-white shadow-[0_4px_14px_rgba(239,68,68,0.25)] border-0 focus:ring-red-500/50 dark:focus:ring-offset-slate-900',
    };

    const sizes = {
      sm: 'px-3.5 py-1.5 text-xs',
      md: 'px-4.5 py-2.5 text-sm',
      lg: 'px-6 py-3.5 text-base',
    };

    return (
      <button
        type={type}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-1 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span className="truncate">{children}</span>
        {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
