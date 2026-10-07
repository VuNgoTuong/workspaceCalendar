import React from 'react';
import dayjs from 'dayjs';
import { Check, CalendarOff, Hourglass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMinuteTick } from '../../hooks/useMinuteTick';
import { cn } from '../../utils/helpers';

const SIZE = 76;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const COUNTDOWN_WINDOW_MIN = 24 * 60;

interface ScheduleCountdownCardProps {
  /** 'YYYY-MM-DD' of the start; `endDate` defaults to it. */
  date: string;
  endDate?: string;
  /** 'HH:mm' */
  startTime: string;
  endTime: string;
  /** When set (cancelled / rejected …), the card shows this instead of a countdown. */
  inactiveLabel?: string;
  className?: string;
}

type Phase = 'upcoming' | 'live' | 'past' | 'inactive';

const PHASE_STYLE: Record<Phase, { ring: string; tint: string; text: string; card: string }> = {
  upcoming: {
    ring: 'stroke-[#1273CC] dark:stroke-blue-400',
    tint: 'text-[#1273CC] dark:text-blue-400',
    text: 'text-[#00529C] dark:text-blue-300',
    card: 'from-white to-blue-50/70 dark:from-slate-900 dark:to-blue-950/30 border-blue-100/80 dark:border-blue-900/40',
  },
  live: {
    ring: 'stroke-emerald-500 dark:stroke-emerald-400',
    tint: 'text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
    card: 'from-white to-emerald-50/70 dark:from-slate-900 dark:to-emerald-950/30 border-emerald-100/80 dark:border-emerald-900/40',
  },
  past: {
    ring: 'stroke-emerald-500/80 dark:stroke-emerald-400/80',
    tint: 'text-emerald-600 dark:text-emerald-400',
    text: 'text-slate-700 dark:text-slate-200',
    card: 'from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/40 border-slate-200/80 dark:border-slate-800',
  },
  inactive: {
    ring: 'stroke-slate-300 dark:stroke-slate-600',
    tint: 'text-slate-400 dark:text-slate-500',
    text: 'text-slate-600 dark:text-slate-300',
    card: 'from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/40 border-slate-200/80 dark:border-slate-800',
  },
};

/**
 * Live "time until / time left / time since" card for a schedule's detail modal (replaces the
 * decorative calendar illustration in the left nav column). Re-renders once a minute.
 */
export const ScheduleCountdownCard: React.FC<ScheduleCountdownCardProps> = ({
  date,
  endDate,
  startTime,
  endTime,
  inactiveLabel,
  className,
}) => {
  const { t } = useTranslation();
  useMinuteTick();

  const start = dayjs(`${date}T${startTime || '00:00'}`);
  let end = dayjs(`${endDate || date}T${endTime || startTime || '00:00'}`);
  if (!end.isAfter(start)) end = dayjs(`${date}T${endTime || '23:59'}`);
  if (!start.isValid() || !end.isValid()) return null;

  const now = dayjs();
  const phase: Phase = inactiveLabel ? 'inactive' : now.isBefore(start) ? 'upcoming' : now.isBefore(end) ? 'live' : 'past';
  const style = PHASE_STYLE[phase];

  const formatSpan = (minutes: number) => {
    const m = Math.max(0, Math.round(minutes));
    if (m >= 48 * 60) return t('schedule_countdown.days', { d: Math.round(m / (24 * 60)) });
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (h && mm) return t('dashboard_home.duration_hm', { h, m: mm });
    if (h) return t('dashboard_home.duration_h', { h });
    return t('dashboard_home.duration_m', { m: Math.max(1, mm) });
  };

  let progress = 0;
  let label = '';
  let value = '';
  if (phase === 'upcoming') {
    const left = start.diff(now, 'minute', true);
    progress = left < COUNTDOWN_WINDOW_MIN ? 1 - left / COUNTDOWN_WINDOW_MIN : 0;
    label = t('schedule_countdown.starts_in');
    value = formatSpan(left);
  } else if (phase === 'live') {
    progress = now.diff(start) / Math.max(1, end.diff(start));
    label = t('schedule_countdown.ongoing');
    value = t('schedule_countdown.remaining', { d: formatSpan(end.diff(now, 'minute', true)) });
  } else if (phase === 'past') {
    progress = 1;
    label = t('schedule_countdown.ended');
    value = t('schedule_countdown.ago', { d: formatSpan(now.diff(end, 'minute', true)) });
  } else {
    label = inactiveLabel ?? '';
  }

  const dayLabel = start.isSame(now, 'day')
    ? t('dashboard_home.today')
    : start.isSame(now.add(1, 'day'), 'day')
      ? t('dashboard_home.tomorrow')
      : start.isSame(now.subtract(1, 'day'), 'day')
        ? t('schedule_countdown.yesterday')
        : start.format('DD/MM/YYYY');

  const CenterIcon = phase === 'past' ? Check : phase === 'inactive' ? CalendarOff : Hourglass;

  return (
    <div
      className={cn(
        'relative mt-auto overflow-hidden rounded-2xl border bg-gradient-to-b p-4 flex flex-col items-center text-center shadow-[0_8px_24px_-14px_rgba(15,35,65,0.22)]',
        style.card,
        className
      )}
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-slate-100 dark:stroke-slate-800" />
          {progress > 0 && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(1, progress))}
              className={cn('transition-[stroke-dashoffset] duration-700 ease-out', style.ring)}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {phase === 'live' ? (
            <span className={cn('text-15 font-semibold tabular-nums', style.tint)}>{Math.round(progress * 100)}%</span>
          ) : (
            <CenterIcon size={22} strokeWidth={phase === 'past' ? 2.75 : 2} className={style.tint} />
          )}
        </div>
      </div>

      <div className="mt-3 text-11.5 font-medium text-slate-500 dark:text-slate-400">{label}</div>
      {value && <div className={cn('mt-0.5 text-15 font-semibold leading-snug tabular-nums', style.text)}>{value}</div>}

      <div className="mt-3 w-full pt-3 border-t border-dashed border-slate-200 dark:border-slate-700/70 text-11.5 text-slate-500 dark:text-slate-400 tabular-nums">
        {startTime} – {endTime} · {dayLabel}
      </div>
    </div>
  );
};

export default ScheduleCountdownCard;
