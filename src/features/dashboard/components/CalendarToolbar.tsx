import React from 'react';
import { ToggleButtonGroup, ToggleButton, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CalendarToolbarProps {
  rangeLabel: string;
  view: 'day' | 'week' | 'month';
  onViewChange: (view: 'day' | 'week' | 'month') => void;
  goToday: () => void;
  goPrev: () => void;
  goNext: () => void;
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  rangeLabel,
  view,
  onViewChange,
  goToday,
  goPrev,
  goNext,
}) => {
  const { t } = useTranslation();

  return (
    <div className="shrink-0 flex items-center justify-between gap-3 flex-wrap px-4 py-2 border-b border-slate-100 dark:border-slate-800/70">
      <div className="flex items-center gap-3">
        <Typography className="!text-[16px] !font-semibold !text-slate-800 dark:!text-white capitalize">
          {rangeLabel}
        </Typography>
        <div className="flex items-center gap-1">
          <IconButton
            size="small"
            onClick={goPrev}
            className="!w-7 !h-7 !rounded-lg !text-slate-500 dark:!text-slate-400 hover:!bg-slate-100 dark:hover:!bg-slate-800"
          >
            <ChevronLeft size={15} />
          </IconButton>
          <IconButton
            size="small"
            onClick={goNext}
            className="!w-7 !h-7 !rounded-lg !text-slate-500 dark:!text-slate-400 hover:!bg-slate-100 dark:hover:!bg-slate-800"
          >
            <ChevronRight size={15} />
          </IconButton>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="text-[12px] font-normal text-[#00529C] dark:text-blue-400 px-2.5 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all cursor-pointer border-0 bg-transparent"
        >
          {t('dashboard.today_btn')}
        </button>
      </div>

      <ToggleButtonGroup
        size="small"
        exclusive
        value={view}
        onChange={(_e, v) => v && onViewChange(v)}
        className="dashboard-view-toggle !bg-slate-100/60 dark:!bg-slate-800/40 !rounded-lg !p-0.5 !border-0"
      >
        <ToggleButton
          value="day"
          className="!normal-case !border-0 !rounded-lg !text-xs !font-normal !px-3.5 !py-1"
        >
          {t('dashboard.view_day')}
        </ToggleButton>
        <ToggleButton
          value="week"
          className="!normal-case !border-0 !rounded-lg !text-xs !font-normal !px-3.5 !py-1"
        >
          {t('dashboard.view_week')}
        </ToggleButton>
        <ToggleButton
          value="month"
          className="!normal-case !border-0 !rounded-lg !text-xs !font-normal !px-3.5 !py-1"
        >
          {t('dashboard.view_month')}
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
};

export default CalendarToolbar;
