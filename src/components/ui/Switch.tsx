import React from 'react';
import { cn } from '../../utils/helpers';

export interface SwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES = {
  sm: { track: 'w-8 h-[18px]', thumb: 'h-3.5 w-3.5', translate: 'translate-x-[15px]', spinner: 'h-2.5 w-2.5 border-[1.5px]' },
  md: { track: 'w-10 h-[22px]', thumb: 'h-4.5 w-4.5', translate: 'translate-x-[19px]', spinner: 'h-3 w-3 border-2' },
};

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  loading = false,
  disabled = false,
  size = 'md',
  className,
}) => {
  const s = SIZES[size];
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={isDisabled}
      onClick={() => !isDisabled && onChange?.(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-full border-0 p-0.5 cursor-pointer transition-colors duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00529C]/30 dark:focus-visible:ring-blue-400/30',
        checked
          ? 'bg-gradient-to-r from-[#00529C] to-[#0066C7] shadow-[0_0_0_1px_rgba(0,82,156,0.15),0_2px_6px_-1px_rgba(0,82,156,0.4)]'
          : 'bg-slate-200 dark:bg-slate-700',
        isDisabled && 'opacity-50 cursor-not-allowed',
        s.track,
        className
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out',
          checked ? s.translate : 'translate-x-0',
          s.thumb
        )}
      >
        {loading && (
          <span
            className={cn(
              'rounded-full border-slate-300 animate-spin',
              checked ? 'border-t-[#00529C]' : 'border-t-slate-500',
              s.spinner
            )}
          />
        )}
      </span>
    </button>
  );
};

export default Switch;
