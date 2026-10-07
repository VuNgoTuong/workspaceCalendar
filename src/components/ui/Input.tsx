import React from 'react';
import { cn } from '../../utils/helpers';
import { Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isSearch?: boolean;
  onClear?: () => void;
  showShortcutBadge?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      isSearch = false,
      onClear,
      showShortcutBadge = false,
      disabled,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-13 font-semibold text-slate-700 dark:text-slate-300 select-none">
            {label}
          </label>
        )}

        <div
          className={cn(
            'relative flex items-center w-full bg-white dark:bg-slate-900 border rounded-xl transition-all duration-200 focus-within:ring-4',
            error
              ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/10'
              : 'border-slate-200 dark:border-slate-800 focus-within:border-[#00529C] focus-within:ring-[#00529C]/10',
            disabled && 'bg-slate-50 dark:bg-slate-900/50 opacity-60 pointer-events-none'
          )}
        >
          {/* Left Icon (Search defaults or custom leftIcon) */}
          {isSearch && !leftIcon && (
            <div className="pl-3.5 flex items-center justify-center text-slate-400 dark:text-slate-500">
              <Search size={16} strokeWidth={2} />
            </div>
          )}
          {leftIcon && (
            <div className="pl-3.5 flex items-center justify-center text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}

          {/* Core Input */}
          <input
            ref={inputRef}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={cn(
              'w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border-0 focus:outline-none focus:ring-0',
              (isSearch || !!leftIcon) && 'pl-2',
              (!!rightIcon || !!onClear || !!showShortcutBadge) && 'pr-2',
              className
            )}
            {...props}
          />

          {/* Suffix Elements (Clear Button, Badge, Suffix Icon) */}
          <div className="flex items-center gap-1.5 pr-3">
            {onClear && hasValue && (
              <button
                type="button"
                onClick={onClear}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/80 transition-colors border-0 cursor-pointer"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            )}

            {showShortcutBadge && !hasValue && (
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-10 font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-md select-none">
                <span className="text-9">Ctrl</span>
                <span>K</span>
              </span>
            )}

            {rightIcon && (
              <div className="text-slate-400 dark:text-slate-500 flex items-center justify-center">
                {rightIcon}
              </div>
            )}
          </div>
        </div>

        {/* Error and Helper Text */}
        {error && (
          <span className="text-xs font-medium text-red-500 animate-fade-in pl-1">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span className="text-xs text-slate-400 dark:text-slate-500 pl-1">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
