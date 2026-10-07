import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Clock, Lock, Plus, UserCheck } from 'lucide-react';
import type { IBusyCalendarOccurrence } from '../../../../services/api/scheduleOccurrenceAPI';
import { fromApiDateTime } from '../../../../utils/dateTime';
import {
  MASKED_SCHEDULE_EVENT_THEME,
  SCHEDULE_OCCURRENCE_EVENT_THEME,
} from '../../../../constants/scheduleOccurrenceStatus';
import { MEETING_WINDOW_END } from '../../../../constants/workingHours';
import { cn } from '../../../../utils/helpers';
import {
  TRACK_HEIGHT,
  HOUR_PX,
  WINDOW_START_MIN,
  WINDOW_END_MIN,
  WINDOW_SPAN,
  COMPACT_BLOCK_HEIGHT,
  minutesToTop,
  toMinutes,
  toTime,
  buildBlocks,
  extractBusyRanges,
  classifyLeaderOccurrence,
  occurrencesOnDay,
  startOfWeekMonday,
} from '../utils/scheduleComparisonUtils';

/** Clicks on the timeline snap to this grid (matches the dashed half-hour guidelines). */
const SLOT_STEP_MIN = 30;
const LATEST_END_MIN = toMinutes(MEETING_WINDOW_END);

export const HOUR_MARKS = Array.from({ length: Math.floor(WINDOW_SPAN / 60) + 1 }, (_, i) => WINDOW_START_MIN + i * 60);
const HALF_HOUR_MARKS = Array.from({ length: WINDOW_SPAN / 30 }, (_, i) => WINDOW_START_MIN + i * 30).filter(
  (m) => m % 60 !== 0
);

/** Diagonal stripes marking the requester's own busy time (week view band + legend swatch). */
export const REQUESTER_BUSY_HATCH =
  'bg-[repeating-linear-gradient(135deg,rgba(148,163,184,0.28)_0px,rgba(148,163,184,0.28)_4px,transparent_4px,transparent_8px)]';

/** Shown over the week / month grid until a leader is picked — otherwise only your own schedule is on screen. */
export const NoLeaderOverlay: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center text-center max-w-[340px] px-6 py-5 rounded-2xl bg-white/95 dark:bg-[#0D162E]/95 border border-blue-200/60 dark:border-blue-800/50 shadow-lg">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#00529C] dark:text-blue-400 mb-2.5">
          <UserCheck size={20} />
        </div>
        <h4 className="text-[13.5px] font-medium text-slate-800 dark:text-slate-200 mb-1">{t('leadership_schedule.cmp_no_leader_title')}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed m-0">{t('leadership_schedule.cmp_no_leader_desc')}</p>
      </div>
    </div>
  );
};

export const TimelineGuides: React.FC = () => (
  <>
    {HOUR_MARKS.map((mark) => (
      <span
        key={mark}
        className="absolute left-0 right-0 h-px bg-slate-100/80 dark:bg-slate-800/40 pointer-events-none"
        style={{ top: minutesToTop(mark) }}
      />
    ))}
    {HALF_HOUR_MARKS.map((mark) => (
      <span
        key={mark}
        className="absolute left-0 right-0 border-t border-dashed border-slate-200/80 dark:border-slate-700/50 pointer-events-none"
        style={{ top: minutesToTop(mark) }}
      />
    ))}
  </>
);

interface SlotClickLayerProps {
  date: Dayjs;
  /** Leader occurrences of this day — a start time inside one of them is not offered. */
  leaderOccurrences: IBusyCalendarOccurrence[];
  durationMinutes: number;
  now: Dayjs;
  onPick: (date: string, startTime: string) => void;
}

/**
 * Transparent layer under the event blocks of one day column: hovering an empty spot previews a
 * `durationMinutes` block, clicking it hands the snapped start time to `onPick`. Past times and times the
 * leader is already busy are not offered.
 */
export const SlotClickLayer: React.FC<SlotClickLayerProps> = ({ date, leaderOccurrences, durationMinutes, now, onPick }) => {
  const { t } = useTranslation();
  const [hoverMin, setHoverMin] = useState<number | null>(null);
  const busyRanges = useMemo(() => extractBusyRanges(leaderOccurrences, date), [leaderOccurrences, date]);

  const isPastDay = date.isBefore(now, 'day');
  const nowMin = date.isSame(now, 'day') ? now.hour() * 60 + now.minute() : -1;

  const pickableStart = (clientY: number, el: HTMLElement): number | null => {
    if (isPastDay) return null;
    const y = clientY - el.getBoundingClientRect().top;
    const raw = WINDOW_START_MIN + Math.floor(((y / HOUR_PX) * 60) / SLOT_STEP_MIN) * SLOT_STEP_MIN;
    // Keep the whole meeting inside the bookable window.
    const start = Math.max(WINDOW_START_MIN, Math.min(raw, LATEST_END_MIN - durationMinutes));
    if (start < nowMin) return null;
    if (busyRanges.some((r) => start >= r.start && start < r.end)) return null;
    return start;
  };

  const ghostEnd = hoverMin !== null ? Math.min(hoverMin + durationMinutes, WINDOW_END_MIN) : 0;

  return (
    <div
      className={cn('absolute inset-0 z-[3]', isPastDay ? 'cursor-default' : hoverMin !== null ? 'cursor-pointer' : 'cursor-not-allowed')}
      onMouseMove={(e) => setHoverMin(pickableStart(e.clientY, e.currentTarget))}
      onMouseLeave={() => setHoverMin(null)}
      onClick={(e) => {
        const start = pickableStart(e.clientY, e.currentTarget);
        if (start !== null) onPick(date.format('YYYY-MM-DD'), toTime(start));
      }}
    >
      {hoverMin !== null && (
        <div
          className="absolute left-1 right-1 rounded-lg border border-dashed border-[#00529C]/60 dark:border-blue-400/60 bg-blue-50/80 dark:bg-blue-950/40 px-2 py-1 pointer-events-none flex items-start gap-1 text-[11px] font-medium text-[#00529C] dark:text-blue-300 overflow-hidden"
          style={{ top: minutesToTop(hoverMin), height: Math.max(minutesToTop(ghostEnd) - minutesToTop(hoverMin), 18) }}
        >
          <Plus size={12} className="shrink-0 mt-px" />
          <span className="truncate tabular-nums">
            {t('leadership_schedule.cmp_register_at', { start: toTime(hoverMin), end: toTime(ghostEnd) })}
          </span>
        </div>
      )}
    </div>
  );
};

interface OccurrenceBlockButtonProps {
  occurrence: IBusyCalendarOccurrence;
  selected: boolean;
  onSelect: () => void;
  style: React.CSSProperties;
  compact: boolean;
}

const OccurrenceBlockButton: React.FC<OccurrenceBlockButtonProps> = ({ occurrence: occ, selected, onSelect, style, compact }) => {
  const { t } = useTranslation();
  const classification = classifyLeaderOccurrence(occ);
  const theme = classification.isMasked ? MASKED_SCHEDULE_EVENT_THEME : SCHEDULE_OCCURRENCE_EVENT_THEME[occ.status];
  const timeLabel = `${fromApiDateTime(occ.startDate).format('HH:mm')} - ${fromApiDateTime(occ.endDate).format('HH:mm')}`;
  const titleText = classification.isMasked ? t('leadership_schedule.masked_schedule') : occ.title;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={`${timeLabel} · ${titleText}`}
      className={cn(
        'absolute flex flex-col overflow-hidden text-left border transition-all duration-200 cursor-pointer px-1.5 py-0.5 z-[4] shadow-[0_1px_4px_rgba(0,0,0,0.03)] focus:outline-none',
        compact ? 'rounded-md' : 'rounded-lg',
        theme.bg,
        theme.border,
        selected ? 'opacity-100 shadow-md ring-2 ring-[#00529C]/30 z-[5]' : 'opacity-90 hover:opacity-100 hover:shadow-md'
      )}
      style={style}
    >
      <span className={cn('flex items-center gap-1 text-[10px] tabular-nums tracking-tight truncate', theme.text)}>
        {classification.isMasked ? <Lock size={9} className="shrink-0" /> : <Clock size={9} className="shrink-0" />}
        <span className="truncate">{timeLabel}</span>
      </span>
      {!compact && (
        <span className="text-[11px] leading-snug text-slate-800 dark:text-slate-100 line-clamp-2 break-words">{titleText}</span>
      )}
    </button>
  );
};

interface GridViewCommonProps {
  /** Any day inside the period to show. */
  anchor: Dayjs;
  leaderOccurrences: IBusyCalendarOccurrence[];
  requesterOccurrences: IBusyCalendarOccurrence[];
  hasLeader: boolean;
  now: Dayjs;
  selectedOccurrenceId?: string;
  onSelectOccurrence: (occ: IBusyCalendarOccurrence, isLeader: boolean) => void;
}

interface LeaderWeekViewProps extends GridViewCommonProps {
  durationMinutes: number;
  onPickSlot: (date: string, startTime: string) => void;
}

export const LeaderWeekView: React.FC<LeaderWeekViewProps> = ({
  anchor,
  leaderOccurrences,
  requesterOccurrences,
  hasLeader,
  now,
  selectedOccurrenceId,
  onSelectOccurrence,
  durationMinutes,
  onPickSlot,
}) => {
  const { t } = useTranslation();
  const weekStartMs = startOfWeekMonday(anchor).valueOf();
  const days = useMemo(() => {
    const weekStart = startOfWeekMonday(anchor);
    return Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  }, [weekStartMs]);

  const columns = useMemo(
    () =>
      days.map((day) => ({
        day,
        leaderDayOccurrences: occurrencesOnDay(leaderOccurrences, day),
        leaderBlocks: buildBlocks(leaderOccurrences, day),
        requesterRanges: extractBusyRanges(requesterOccurrences, day),
      })),
    [days, leaderOccurrences, requesterOccurrences]
  );

  const nowMinutes = now.hour() * 60 + now.minute();
  const showNowLine = nowMinutes >= WINDOW_START_MIN && nowMinutes <= WINDOW_END_MIN;

  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const firstTop = Math.min(Infinity, ...columns.flatMap((c) => c.leaderBlocks.map((b) => b.topPx)));
    el.scrollTop = Number.isFinite(firstTop) ? Math.max(0, firstTop - HOUR_PX) : 0;
  }, [weekStartMs, leaderOccurrences]);

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto slim-scroll">
      <div className="flex flex-col min-w-[860px] pb-5">
        <div className="flex items-center h-[58px] sticky top-0 z-10 bg-white/90 dark:bg-[#070D1E]/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80">
          <div className="w-14 shrink-0 flex items-center justify-end pr-3">
            <span className="text-[9.5px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t('leadership_schedule.cmp_hour_col')}
            </span>
          </div>
          {days.map((day) => {
            const isToday = day.isSame(now, 'day');
            const isPast = day.isBefore(now, 'day');
            return (
              <div key={day.valueOf()} className="flex-1 min-w-[110px] px-1">
                <div
                  className={cn(
                    'flex items-center justify-center gap-2 h-[42px] rounded-xl border transition-colors',
                    isToday
                      ? 'border-blue-200/80 dark:border-blue-800/60 bg-gradient-to-b from-blue-50/90 to-white dark:from-blue-950/40 dark:to-[#0D162E] shadow-[0_1px_3px_rgba(0,82,156,0.08)]'
                      : 'border-transparent'
                  )}
                >
                  <span
                    className={cn(
                      'text-[11.5px] capitalize',
                      isToday
                        ? 'text-[#00529C] dark:text-blue-400 font-medium'
                        : isPast
                          ? 'text-slate-400 dark:text-slate-500'
                          : 'text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {day.format('dddd')}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[12px] tabular-nums font-semibold',
                      isToday
                        ? 'bg-[#00529C] dark:bg-blue-500 text-white shadow-sm shadow-[#00529C]/25'
                        : isPast
                          ? 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    )}
                  >
                    {day.format('DD/MM')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex relative" style={{ height: TRACK_HEIGHT }}>
          <div className="w-14 shrink-0 relative border-r border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10 select-none">
            {HOUR_MARKS.map((mark) => (
              <span
                key={mark}
                className="absolute right-2.5 text-[10.5px] text-slate-400 dark:text-slate-500 tabular-nums tracking-tight"
                style={{ top: Math.max(2, minutesToTop(mark) - 7) }}
              >
                {toTime(mark)}
              </span>
            ))}
          </div>

          {columns.map(({ day, leaderDayOccurrences, leaderBlocks, requesterRanges }) => {
            const isToday = day.isSame(now, 'day');
            const isPast = day.isBefore(now, 'day');
            return (
              <div
                key={day.valueOf()}
                className={cn(
                  'relative flex-1 min-w-[110px] border-l border-slate-100 dark:border-slate-800/80',
                  isToday && 'bg-blue-50/25 dark:bg-blue-950/10',
                  isPast && 'bg-slate-50/70 dark:bg-slate-900/30'
                )}
              >
                <TimelineGuides />

                {hasLeader && (
                  <SlotClickLayer
                    date={day}
                    leaderOccurrences={leaderDayOccurrences}
                    durationMinutes={durationMinutes}
                    now={now}
                    onPick={onPickSlot}
                  />
                )}

                {/* Your own busy time: a hatched band behind the leader's blocks, so mutual free time stands out. */}
                {requesterRanges.map((r, i) => {
                  const height = Math.max(minutesToTop(r.end) - minutesToTop(r.start), 6);
                  return (
                    <span
                      key={i}
                      className={cn(REQUESTER_BUSY_HATCH, 'absolute left-0 right-0 z-[2] pointer-events-none border-y border-slate-300/60 dark:border-slate-600/50 overflow-hidden')}
                      style={{ top: minutesToTop(r.start), height }}
                    >
                      {height >= 18 && (
                        <span className="absolute right-1 top-0.5 text-[9.5px] leading-none text-slate-500 dark:text-slate-400 tabular-nums">
                          {t('leadership_schedule.cmp_you_busy')} {toTime(r.start)}-{toTime(r.end)}
                        </span>
                      )}
                    </span>
                  );
                })}

                {leaderBlocks.map((b) => (
                  <OccurrenceBlockButton
                    key={b.occurrence.scheduleOccurrenceId}
                    occurrence={b.occurrence}
                    selected={selectedOccurrenceId === b.occurrence.scheduleOccurrenceId}
                    onSelect={() => onSelectOccurrence(b.occurrence, true)}
                    compact={b.heightPx < COMPACT_BLOCK_HEIGHT}
                    style={{
                      top: b.topPx,
                      height: b.heightPx,
                      left: `calc(3px + (100% - 10px) * ${(b.leftPct / 100).toFixed(4)})`,
                      width: `calc((100% - 10px) * ${(b.widthPct / 100).toFixed(4)} - 2px)`,
                    }}
                  />
                ))}

                {isToday && showNowLine && (
                  <div className="absolute left-0 right-0 z-[12] pointer-events-none flex items-center" style={{ top: minutesToTop(nowMinutes) }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-rose-500/25 -ml-0.5 shrink-0" />
                    <span className="flex-1 border-t border-dashed border-rose-500/75" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MONTH_CELL_MAX_ITEMS = 3;

interface LeaderMonthViewProps extends GridViewCommonProps {
  onOpenDay: (day: Dayjs) => void;
}

export const LeaderMonthView: React.FC<LeaderMonthViewProps> = ({
  anchor,
  leaderOccurrences,
  requesterOccurrences,
  hasLeader,
  now,
  selectedOccurrenceId,
  onSelectOccurrence,
  onOpenDay,
}) => {
  const { t } = useTranslation();
  const monthStart = anchor.startOf('month');
  const gridStart = startOfWeekMonday(monthStart);
  const weekCount = Math.ceil((monthStart.endOf('month').diff(gridStart, 'day') + 1) / 7);
  const days = useMemo(
    () => Array.from({ length: weekCount * 7 }, (_, i) => gridStart.add(i, 'day')),
    [gridStart.valueOf(), weekCount]
  );
  const weekdayLabels = days.slice(0, 7).map((d) => d.format('dddd'));

  return (
    <div className="flex-1 min-h-0 overflow-auto slim-scroll p-3">
      <div className="min-w-[760px] h-full flex flex-col rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#0B132B] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40">
          {weekdayLabels.map((label) => (
            <div key={label} className="py-2 text-center text-[11.5px] capitalize text-slate-500 dark:text-slate-400">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1" style={{ gridTemplateRows: `repeat(${weekCount}, minmax(112px, 1fr))` }}>
          {days.map((day) => {
            const inMonth = day.isSame(monthStart, 'month');
            const isToday = day.isSame(now, 'day');
            const isPast = day.isBefore(now, 'day');
            const leaderItems = hasLeader ? occurrencesOnDay(leaderOccurrences, day) : [];
            const requesterCount = occurrencesOnDay(requesterOccurrences, day).length;
            const extra = leaderItems.length - MONTH_CELL_MAX_ITEMS;

            return (
              <div
                key={day.valueOf()}
                role="button"
                tabIndex={0}
                onClick={() => onOpenDay(day)}
                onKeyDown={(e) => e.key === 'Enter' && onOpenDay(day)}
                title={t('leadership_schedule.cmp_month_open_day')}
                className={cn(
                  'group flex flex-col gap-1 p-1.5 border-r border-b border-slate-100 dark:border-slate-800/70 cursor-pointer transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20 min-w-0',
                  !inMonth && 'bg-slate-50/60 dark:bg-slate-900/40',
                  isPast && inMonth && 'bg-slate-50/30 dark:bg-slate-900/20'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] tabular-nums',
                      isToday
                        ? 'bg-[#00529C] text-white font-semibold'
                        : inMonth
                          ? 'text-slate-700 dark:text-slate-200 font-medium'
                          : 'text-slate-300 dark:text-slate-600'
                    )}
                  >
                    {day.date()}
                  </span>
                  {hasLeader && inMonth && !isPast && leaderItems.length === 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 opacity-80">
                      {t('leadership_schedule.cmp_free_day')}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  {leaderItems.slice(0, MONTH_CELL_MAX_ITEMS).map((occ) => {
                    const classification = classifyLeaderOccurrence(occ);
                    const theme = classification.isMasked
                      ? MASKED_SCHEDULE_EVENT_THEME
                      : SCHEDULE_OCCURRENCE_EVENT_THEME[occ.status];
                    const titleText = classification.isMasked ? t('leadership_schedule.masked_schedule') : occ.title;
                    const start = fromApiDateTime(occ.startDate);
                    // Multi-day schedules show their start time only on the first day.
                    const timeLabel = start.isSame(day, 'day') ? start.format('HH:mm') : '…';
                    const selected = selectedOccurrenceId === occ.scheduleOccurrenceId;
                    return (
                      <button
                        key={occ.scheduleOccurrenceId}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOccurrence(occ, true);
                        }}
                        title={`${timeLabel} · ${titleText}`}
                        className={cn(
                          'flex items-center gap-1 w-full min-w-0 rounded-md border px-1.5 py-0.5 text-left text-[10.5px] cursor-pointer transition-shadow',
                          theme.bg,
                          theme.border,
                          selected ? 'ring-2 ring-[#00529C]/30 shadow-sm' : 'hover:shadow-sm'
                        )}
                      >
                        <span className={cn('shrink-0 tabular-nums', theme.text)}>{timeLabel}</span>
                        {classification.isMasked && <Lock size={9} className="shrink-0 text-slate-400" />}
                        <span className="truncate text-slate-700 dark:text-slate-200">{titleText}</span>
                      </button>
                    );
                  })}
                  {extra > 0 && (
                    <span className="px-1 text-[10.5px] font-medium text-[#00529C] dark:text-blue-400 group-hover:underline">
                      {t('leadership_schedule.cmp_more_items', { count: extra })}
                    </span>
                  )}
                </div>

                {requesterCount > 0 && (
                  <span className="mt-auto inline-flex items-center gap-1 px-1 text-[10px] text-slate-400 dark:text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    {t('leadership_schedule.cmp_you_count', { count: requesterCount })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** First and last day (inclusive) the given view needs data for. */
export const viewRange = (mode: 'day' | 'week' | 'month', anchor: Dayjs): [Dayjs, Dayjs] => {
  if (mode === 'day') return [anchor.startOf('day'), anchor.endOf('day')];
  if (mode === 'week') {
    const start = startOfWeekMonday(anchor);
    return [start, start.add(6, 'day').endOf('day')];
  }
  const monthStart = anchor.startOf('month');
  const gridStart = startOfWeekMonday(monthStart);
  const gridEnd = startOfWeekMonday(monthStart.endOf('month')).add(6, 'day').endOf('day');
  return [gridStart, gridEnd];
};
