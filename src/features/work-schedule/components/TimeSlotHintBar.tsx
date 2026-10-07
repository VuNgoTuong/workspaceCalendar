import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Lightbulb } from 'lucide-react';

export const TimeSlotHintBar: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-11.5 font-medium text-slate-500 dark:text-slate-400">
        <Clock size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />
        {t('common.timezone_vn')}
      </span>
      <span className="hidden h-3.5 w-px bg-slate-200 dark:bg-slate-700 sm:inline-block" />
      <span className="inline-flex items-center gap-1.5 text-11.5 text-slate-500 dark:text-slate-400">
        <Lightbulb size={13} className="shrink-0 text-amber-500 dark:text-amber-400" />
        <span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">{t('common.time_slot_hint_label')}:</span>{' '}
          {t('common.time_slot_hint_desc')}
        </span>
      </span>
    </div>
  );
};

export default TimeSlotHintBar;
