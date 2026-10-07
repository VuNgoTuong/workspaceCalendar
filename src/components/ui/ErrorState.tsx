import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  className = '',
}) => {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl my-4 max-w-lg mx-auto ${className}`}>
      <div className="p-4 bg-rose-100 dark:bg-rose-950/40 rounded-full mb-4 text-rose-600 dark:text-rose-400">
        <AlertOctagon size={40} />
      </div>
      <h3 className="text-base font-bold text-rose-800 dark:text-rose-300 mb-1">
        {title ?? t('errors.state_title')}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 max-w-sm leading-relaxed">
        {message ?? t('errors.state_desc')}
      </p>
      {onRetry && (
        <Button
          variant="contained"
          color="error"
          disableElevation
          onClick={onRetry}
          className="px-6 rounded-lg font-medium"
          sx={{ textTransform: 'none' }}
        >
          {t('errors.try_again')}
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
