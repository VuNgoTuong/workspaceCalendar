import React, { Suspense, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker } from 'antd';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  ChevronRight,
  Hourglass,
  Tag,
  Building2,
  MapPin,
  Timer,
  Video,
  Waypoints,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../../../components/ui';
import { ScheduleCalendarType } from '../../../constants/scheduleCalendarType';
import { ScheduleOccurrenceStatus } from '../../../constants/scheduleOccurrenceStatus';
import { MeetingType } from '../../../constants/meetingType';
import { SchedulePriority } from '../../../constants/schedulePriority';
import { scheduleOccurrenceAPI, toCalendarDateParam, type IScheduleOccurrenceCalendarItem } from '../../../services/api/scheduleOccurrenceAPI';
import { useOverviewLeaderId } from '../../work-schedule/TongHop/hooks/useCalendarOverviewQuery';
import { cn } from '../../../utils/helpers';
import {
  ALL_CALENDAR_TYPES,
  CALENDAR_OVERVIEW_QUERY_KEY,
  EASE_OUT_EXPO,
  SECTION_ICON_BG,
  SPRING,
  SURFACE,
  TYPE_META,
} from '../homeTheme';
import { EmptyState, SectionIcon } from './HomeBits';
import type { ScheduleDetailTarget } from './ScheduleDetailModal';
import { LazyScheduleDetailModal, useMountedOnce } from './lazyDialogs';

const formatDuration = (minutes: number, t: (key: string, opts?: Record<string, unknown>) => string) => {
  const h = Math.floor(Math.max(minutes, 0) / 60);
  const m = Math.max(minutes, 0) % 60;
  if (h && m) return t('dashboard_home.duration_hm', { h, m });
  if (h) return t('dashboard_home.duration_h', { h });
  return t('dashboard_home.duration_m', { m });
};


type Phase = 'past' | 'live' | 'next';

const PhaseBadge: React.FC<{
  phase: Phase;
  start: Dayjs;
  t: (key: string, opts?: Record<string, unknown>) => string;
}> = ({ phase, start, t }) => {
  if (phase === 'live') return null; 
  if (phase === 'past') {
    return (
      <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-11.5 font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/60">
        <span className="w-3 h-3 rounded-full bg-emerald-500 text-white flex items-center justify-center">
          <Check size={8} strokeWidth={3.5} />
        </span> {t('dashboard_home.timeline_ended')}
      </span>
    );
  }
  const mins = start.diff(dayjs(), 'minute');
  const sameDay = start.isSame(dayjs(), 'day');
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-11.5 font-medium text-[#00529C] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 ring-1 ring-inset ring-blue-100 dark:ring-blue-900/60 tabular-nums">
      <Timer size={14} strokeWidth={2.2} />
      {sameDay ? t('dashboard_home.timeline_starts_in', { d: formatDuration(mins, t) }) : t('dashboard_home.timeline_upcoming')}
    </span>
  );
};

type TimelineRow =
  | {
      kind: 'item';
      item: IScheduleOccurrenceCalendarItem;
      start: Dayjs;
      end: Dayjs;
      phase: 'past' | 'live' | 'next';
    }
  | { kind: 'now' };

export const DayTimeline: React.FC = () => {
  const { t } = useTranslation();
  const leaderId = useOverviewLeaderId();
  const [day, setDay] = useState<Dayjs>(() => dayjs().startOf('day'));
  const [detailTarget, setDetailTarget] = useState<ScheduleDetailTarget | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const detailMounted = useMountedOnce(!!detailTarget);

  const dayParams = {
    startDate: toCalendarDateParam(day.subtract(1, 'day').startOf('day')),
    endDate: toCalendarDateParam(day.add(1, 'day').endOf('day')),
    operatingLeaderId: leaderId,
    calendarTypes: ALL_CALENDAR_TYPES,
    IsGetCalendarActive: true,
  };
  const { data: dayItems = [], isLoading } = useQuery({
    queryKey: [...CALENDAR_OVERVIEW_QUERY_KEY, dayParams],
    queryFn: () => scheduleOccurrenceAPI.getScheduleOccurrencesCalendar(dayParams),
    enabled: !!leaderId,
    placeholderData: keepPreviousData,
  });

  const activeItems = useMemo(
    () =>
      dayItems.filter(
        (item) => item.status !== ScheduleOccurrenceStatus.Cancelled && item.status !== ScheduleOccurrenceStatus.Rejected
      ),
    [dayItems]
  );

  const rows = useMemo<TimelineRow[]>(() => {
    const now = dayjs();
    const dayStart = day.startOf('day');
    const dayEnd = day.endOf('day');
    const list: TimelineRow[] = activeItems
      .filter((item) => !dayjs(item.startDate).isAfter(dayEnd) && !dayjs(item.endDate).isBefore(dayStart))
      .sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf())
      .map((item) => {
        const start = dayjs(item.startDate);
        const end = dayjs(item.endDate);
        const phase = end.isBefore(now) ? 'past' : start.isAfter(now) ? 'next' : 'live';
        return { kind: 'item' as const, item, start, end, phase };
      });

    if (day.isSame(now, 'day') && list.length > 0) {
      const idx = list.findIndex((r) => r.kind === 'item' && r.phase !== 'past');
      list.splice(idx === -1 ? list.length : idx, 0, { kind: 'now' });
    }
    return list;
  }, [activeItems, day]);

  const isToday = day.isSame(dayjs(), 'day');

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2, ease: EASE_OUT_EXPO }}
      className={cn(SURFACE, 'p-5 flex flex-col gap-4 h-full min-w-0')}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <SectionIcon icon={Waypoints} className={SECTION_ICON_BG.timeline} />
          <div className="min-w-0">
            <h3 className="text-14.5 font-semibold text-slate-800 dark:text-slate-100 leading-tight">
              {t('dashboard_home.timeline_title')}
            </h3>
            <p className="text-11.5 text-slate-500 dark:text-slate-400 mt-0.5">
              {t('dashboard_home.timeline_subtitle', {
                date: day.format('DD/MM/YYYY'),
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <AnimatePresence initial={false}>
            {!isToday && (
              <motion.button
                key="today"
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={SPRING}
                onClick={() => setDay(dayjs().startOf('day'))}
                className="h-8 px-3 rounded-full text-12 font-medium text-[#00529C] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors cursor-pointer"
              >
                {t('dashboard_home.today')}
              </motion.button>
            )}
          </AnimatePresence>
          <div className="flex items-center h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <Tooltip title={t('dashboard_home.prev_day')}>
              <button
                type="button"
                onClick={() => setDay((d) => d.subtract(1, 'day'))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-[#00529C] hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
            </Tooltip>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2 rounded-full text-12.5 font-medium tabular-nums transition-colors cursor-pointer',
                  pickerOpen
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-[#00529C] dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <CalendarDays size={13} className={pickerOpen ? 'text-[#00529C] dark:text-blue-300' : 'text-slate-400'} />
                {day.format('DD/MM/YYYY')}
              </button>
              <DatePicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                value={day}
                allowClear={false}
                onChange={(v) => {
                  if (v) setDay(v.startOf('day'));
                  setPickerOpen(false);
                }}
                placement="bottomRight"
                tabIndex={-1}
                aria-hidden
                className="!absolute !inset-0 !w-full !min-w-0 !p-0 !opacity-0 !pointer-events-none"
              />
            </div>
            <Tooltip title={t('dashboard_home.next_day')}>
              <button
                type="button"
                onClick={() => setDay((d) => d.add(1, 'day'))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-[#00529C] hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0 max-h-[560px] overflow-y-auto custom-scrollbar -mr-2 pr-2 -mt-1 pt-2 -ml-1 pl-1">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-14 h-9 rounded-md bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
                <div className="flex-1 h-[124px] rounded-2xl bg-slate-50 dark:bg-slate-800/50 animate-pulse" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('dashboard_home.timeline_empty')} />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.ol
              key={day.format('YYYY-MM-DD')}
              className="relative flex flex-col"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.06 } },
              }}
            >
              {rows.map((row, idx) => {
                const isLast = idx === rows.length - 1;
                if (row.kind === 'now') {
                  return (
                    <motion.li
                      key="now"
                      variants={{
                        hidden: { opacity: 0, scaleX: 0.6 },
                        show: { opacity: 1, scaleX: 1, transition: SPRING },
                      }}
                      className="relative flex items-center gap-3.5 py-1.5 origin-left"
                    >
                      <span className="w-14 shrink-0 text-right text-10.5 font-medium text-rose-500 tabular-nums">
                        {dayjs().format('HH:mm')}
                      </span>
                      <span className="relative w-4 shrink-0 flex justify-center">
                        <span className="absolute w-3 h-3 rounded-full bg-rose-500/30 animate-ping" />
                        <span className="relative w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                      </span>
                      <span className="flex-1 flex items-center gap-2">
                        <span className="text-12.5 font-semibold tracking-wide text-rose-500">
                          {t('dashboard_home.timeline_now')}
                        </span>
                        <span className="flex-1 h-px bg-gradient-to-r from-rose-400/70 to-transparent" />
                      </span>
                    </motion.li>
                  );
                }

                const { item, start, end, phase } = row;
                const meta = TYPE_META[item.calendarType] ?? TYPE_META[ScheduleCalendarType.Personal];
                const TypeIcon = meta.icon;

                return (
                  <motion.li
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0, transition: SPRING },
                    }}
                    className={cn('relative flex gap-3.5', phase === 'past' && 'opacity-65 hover:opacity-100 transition-opacity')}
                  >
                    {/* Time column */}
                    <div className="w-14 shrink-0 pt-4 text-right tabular-nums">
                      <div className={cn('text-16 font-semibold leading-none tracking-tight', meta.text)}>{start.format('HH:mm')}</div>
                      <div className="text-11 text-slate-400 dark:text-slate-500 mt-1.5">{end.format('HH:mm')}</div>
                      {/* Items that started on an earlier day (still running) carry their start date. */}
                      {!start.isSame(day, 'day') && (
                        <div className="mt-1.5 inline-block px-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium leading-4 text-slate-500 dark:text-slate-400">
                          {start.format('DD/MM')}
                        </div>
                      )}
                    </div>

                    {/* Rail */}
                    <div className="relative w-4 shrink-0 flex justify-center items-start">
                      {/* Finished stretch of the day turns green, like a progress track already travelled. */}
                      {!isLast && (
                        <span
                          className={cn(
                            'absolute top-7 -bottom-1 w-px',
                            phase === 'past'
                              ? 'w-0.5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-300 dark:from-emerald-500 dark:to-emerald-600/70'
                              : 'bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800'
                          )}
                        />
                      )}
                      <span className="relative mt-[16px] w-[18px] h-[18px] flex items-center justify-center">
                        {phase === 'live' && (
                          <span className={cn('absolute w-5 h-5 rounded-full opacity-40 animate-ping', meta.accent)} />
                        )}
                        {phase === 'past' ? (
                          <span className="relative w-[18px] h-[18px] rounded-full flex items-center justify-center bg-emerald-500 text-white ring-4 ring-white dark:ring-slate-900 shadow-sm">
                            <Check size={10} strokeWidth={3.5} />
                          </span>
                        ) : (
                          <span className={cn('relative w-3.5 h-3.5 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-sm', meta.accent)} />
                        )}
                      </span>
                    </div>

                    {/* Card */}
                    <motion.button
                      type="button"
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onClick={() =>
                        setDetailTarget({
                          id: item.id,
                          calendarType: item.calendarType,
                        })
                      }
                      className={cn(
                        'group relative isolate flex-1 min-w-0 mb-4 rounded-2xl border text-left cursor-pointer overflow-hidden bg-white dark:bg-slate-900 transition-[border-color,box-shadow] duration-200',
                        phase === 'live'
                          ? 'border-transparent ring-1 ring-inset'
                          : 'border-slate-200/80 dark:border-slate-700/70 hover:border-slate-300/80 dark:hover:border-slate-600'
                      )}
                      style={{
                        ...(phase === 'live' ? { '--tw-ring-color': `${meta.hex}66` } : {}),
                        boxShadow: `0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -22px ${meta.hex}66`,
                      } as React.CSSProperties}
                    >
                      {/* Type-tinted corner wash */}
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0 -z-10 opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ background: `radial-gradient(120% 140% at 100% 0%, ${meta.hex}17, transparent 55%)` }}
                      />

                      {/* Head */}
                      <div className="flex items-start gap-3.5 p-4 pb-3">
                        <span
                          className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-105"
                          style={{
                            background: `linear-gradient(135deg, ${meta.hex}b3, ${meta.hex})`,
                            boxShadow: `0 6px 14px -6px ${meta.hex}`,
                          }}
                        >
                          <TypeIcon size={20} strokeWidth={2} />
                        </span>

                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-15 font-semibold leading-snug text-slate-800 dark:text-slate-100 line-clamp-2 group-hover:text-[#00529C] dark:group-hover:text-blue-400 transition-colors">
                              {item.title || t('dashboard_home.untitled')}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-x-2 gap-y-1 flex-wrap text-12 text-slate-500 dark:text-slate-400">
                            <span className={cn('font-medium', meta.text)}>{t(meta.labelKey)}</span>
                            {item.priority === SchedulePriority.Urgent && (
                              <span className="inline-flex items-center gap-0.5 text-10.5 font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-px rounded-md">
                                <AlertCircle size={10} /> {t('dashboard_home.urgent')}
                              </span>
                            )}
                            {item.status === ScheduleOccurrenceStatus.Waiting && (
                              <span className="inline-flex items-center gap-0.5 text-10.5 font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-px rounded-md">
                                <Hourglass size={10} /> {t('dashboard_home.waiting_approval')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 hidden sm:flex items-center">
                          {phase === 'live' ? (
                            <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-11.5 font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/60">
                              <span className="relative flex w-1.5 h-1.5">
                                <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-60 animate-ping" />
                                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              </span>
                              {t('dashboard_home.ongoing')}
                            </span>
                          ) : (
                            <PhaseBadge phase={phase} start={start} t={t} />
                          )}
                        </div>
                      </div>

                      {/* Info strip */}
                      <div className="mx-4 mb-3.5 pt-3 border-t border-dashed border-slate-200/90 dark:border-slate-700/70 flex items-center gap-2 flex-wrap text-12 text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 tabular-nums">
                          <Clock3 size={13} className="shrink-0 text-[#00529C] dark:text-blue-400" />
                          {/* Start/end already sit in the timeline gutter; the pill only adds the duration */}
                          {formatDuration(end.diff(start, 'minute'), t)}
                        </span>
                        {item.meetingType === MeetingType.Online ? (
                          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                            <Video size={13} /> {t('dashboard_home.online')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                            <Building2 size={13} className="shrink-0 text-[#00529C] dark:text-blue-400" /> {t('meeting_format.offline')}
                          </span>
                        )}
                        {item.location && (
                          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 min-w-0 max-w-[260px]" title={item.location}>
                            <MapPin size={13} className="shrink-0 text-amber-500 dark:text-amber-400" />
                            <span className="truncate">{item.location}</span>
                          </span>
                        )}
                        {item.scheduleTypeName && (
                          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-[#00529C] dark:text-blue-400 min-w-0 max-w-[180px]" title={item.scheduleTypeName}>
                            <Tag size={12} className="shrink-0" />
                            <span className="truncate">{item.scheduleTypeName}</span>
                          </span>
                        )}
                        {phase === 'live' && (
                          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 tabular-nums">
                            <Timer size={13} />
                            {t('dashboard_home.timeline_remaining', { d: formatDuration(end.diff(dayjs(), 'minute'), t) })}
                          </span>
                        )}
                        <span className="ml-auto inline-flex items-center gap-1 text-12 font-medium text-[#00529C] dark:text-blue-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                          {t('dashboard_home.timeline_view_detail')}
                          <ArrowRight size={13} />
                        </span>
                      </div>

                      {/* Live progress */}
                      {phase === 'live' && (
                        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-slate-100 dark:bg-slate-800">
                          <span
                            className="block h-full rounded-r-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, (dayjs().diff(start) / Math.max(1, end.diff(start))) * 100))}%`,
                              background: `linear-gradient(90deg, ${meta.hex}99, ${meta.hex})`,
                            }}
                          />
                        </span>
                      )}
                    </motion.button>
                  </motion.li>
                );
              })}
            </motion.ol>
          </AnimatePresence>
        )}
      </div>

      {detailMounted && (
        <Suspense fallback={null}>
          <LazyScheduleDetailModal target={detailTarget} leaderId={leaderId} onClose={() => setDetailTarget(null)} />
        </Suspense>
      )}
    </motion.section>
  );
};

export default DayTimeline;
