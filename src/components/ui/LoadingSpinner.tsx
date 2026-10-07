import React from 'react';
import { Loader2 } from 'lucide-react';
import { COLORS } from '../../constants/colors';

interface LoadingSpinnerProps {
  tip?: string;
  fullScreen?: boolean;
  size?: 'small' | 'default' | 'large';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  tip = 'Loading data...',
  fullScreen = false,
  size = 'default',
  className = '',
}) => {
  const sizeMap = {
    small: 20,
    default: 32,
    large: 48,
  };

  const indicator = (
    <Loader2
      size={sizeMap[size]}
      className="animate-spin"
      style={{ color: COLORS.primary.main }}
    />
  );

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 ${className}`}>
      {indicator}
      {tip && (
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 select-none">
          {tip}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/10 dark:bg-slate-950/20 backdrop-blur-xs transition-colors duration-300">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-2xl shadow-xl max-w-xs w-full">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
