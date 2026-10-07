import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker, Modal } from 'antd';
import { Avatar } from '@mui/material';
import { AnimatePresence, motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Calendar, CalendarDays, CalendarSearch, ChevronLeft, ChevronRight, Clock, FileText, Hash, Lock, MapPin, Tag, X } from 'lucide-react';
import { scheduleOccurrenceAPI, type IBusyCalendarOccurrence, type IBusyCalendarUser } from '../../../../services/api/scheduleOccurrenceAPI';
import { fromApiDateTime } from '../../../../utils/dateTime';
import { MASKED_SCHEDULE_EVENT_THEME, SCHEDULE_OCCURRENCE_EVENT_THEME } from '../../../../constants/scheduleOccurrenceStatus';
import { ScheduleCategory } from '../../../../constants/scheduleCategory';
import { cn, resolveAttachmentUrl } from '../../../../utils/helpers';
import { StatusBadge } from '../../../../components/ui';

export interface LeaderBusyCalendarModalProps {
  open: boolean;
  onClose: () => void;
  requesterId?: string;
  requesterName?: string;
  requesterAvatarUrl?: string | null;
  executiveId?: string;
  executiveName?: string;
  executiveAvatarUrl?: string | null;
  initialDate?: string;
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const WINDOW_START_MIN = toMinutes('07:00');
const WINDOW_END_MIN = toMinutes('17:30');
const WINDOW_SPAN = WINDOW_END_MIN - WINDOW_START_MIN;
const HOUR_PX = 64;
const TRACK_HEIGHT = (WINDOW_SPAN / 60) * HOUR_PX;
const MIN_BLOCK_HEIGHT = 15;

const HOUR_MARKS = Array.from({ length: Math.floor(WINDOW_SPAN / 60) + 1 }, (_, i) => WINDOW_START_MIN + i * 60);
const HALF_HOUR_MARKS = Array.from({ length: WINDOW_SPAN / 30 }, (_, i) => WINDOW_START_MIN + i * 30).filter((m) => m % 60 !== 0);

const minutesToTop = (minutes: number) => ((minutes - WINDOW_START_MIN) / 60) * HOUR_PX;

const CATEGORY_LABEL_KEYS: Record<number, string> = {
  [ScheduleCategory.Personal]: 'schedule_category.personal',
  [ScheduleCategory.LeaderRegistration]: 'schedule_category.leader_registration',
};

const initialsOf = (name: string) =>
  name?.split(' ').filter(Boolean).slice(-2).map((n) => n[0]).join('').toUpperCase() || '?';

const blockFontSize = (heightPx: number, widthPct: number) => {
  const heightT = Math.min(1, Math.max(0, (heightPx - MIN_BLOCK_HEIGHT) / (100 - MIN_BLOCK_HEIGHT)));
  const base = 10 + heightT * (13.5 - 10);
  const widthFactor = Math.min(1, Math.max(0.8, widthPct / 100));
  return Math.round(base * widthFactor * 10) / 10;
};

interface BusyBlock {
  occurrence: IBusyCalendarOccurrence;
  topPx: number;
  heightPx: number;
  leftPct: number;
  widthPct: number;
}

const layoutOverlappingBlocks = (blocks: { occurrence: IBusyCalendarOccurrence; topPx: number; heightPx: number }[]): BusyBlock[] => {
  const sorted = [...blocks].sort((a, b) => a.topPx - b.topPx || a.heightPx - b.heightPx);
  const result: BusyBlock[] = [];
  let cluster: typeof sorted = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const laneOf: number[] = [];
    cluster.forEach((b) => {
      let lane = laneEnds.findIndex((end) => end <= b.topPx);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(b.topPx + b.heightPx);
      } else {
        laneEnds[lane] = b.topPx + b.heightPx;
      }
      laneOf.push(lane);
    });
    const totalLanes = laneEnds.length;
    cluster.forEach((b, i) => {
      result.push({ ...b, leftPct: (laneOf[i] / totalLanes) * 100, widthPct: 100 / totalLanes });
    });
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const b of sorted) {
    if (cluster.length > 0 && b.topPx >= clusterEnd) flushCluster();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, b.topPx + b.heightPx);
  }
  flushCluster();

  return result;
};

const buildBlocks = (occurrences: IBusyCalendarOccurrence[], date: Dayjs): BusyBlock[] => {
  const winStart = date.startOf('day').add(WINDOW_START_MIN, 'minute');
  const winEnd = date.startOf('day').add(WINDOW_END_MIN, 'minute');

  const raw = occurrences
    .map((occ) => {
      const start = fromApiDateTime(occ.startDate);
      const end = fromApiDateTime(occ.endDate);
      const clippedStart = start.isBefore(winStart) ? winStart : start;
      const clippedEnd = end.isAfter(winEnd) ? winEnd : end;
      if (!clippedEnd.isAfter(clippedStart)) return null;
      const startMin = clippedStart.diff(winStart, 'minute') + WINDOW_START_MIN;
      const endMin = clippedEnd.diff(winStart, 'minute') + WINDOW_START_MIN;
      return {
        occurrence: occ,
        topPx: minutesToTop(startMin),
        heightPx: Math.max(minutesToTop(endMin) - minutesToTop(startMin), MIN_BLOCK_HEIGHT),
      };
    })
    .filter((b): b is { occurrence: IBusyCalendarOccurrence; topPx: number; heightPx: number } => !!b);

  return layoutOverlappingBlocks(raw);
};

const hasRichContent = (html?: string) => !!html && html.replace(/<[^>]*>/g, '').trim().length > 0;

const MetaRow: React.FC<{
  label: string;
  icon: React.ReactNode;
  iconClassName?: string;
  children: React.ReactNode;
}> = ({ label, icon, iconClassName, children }) => (
  <div className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#00529C] dark:bg-blue-900/30 dark:text-blue-400',
        iconClassName
      )}
    >
      {icon}
    </span>
    <div className="min-w-0 flex-1 flex flex-col">
      <span className="text-[12px] font-normal text-slate-500 dark:text-slate-400 leading-none">{label}</span>
      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200 truncate mt-1 leading-snug">
        {children}
      </span>
    </div>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn('text-[13px] font-semibold text-slate-700 dark:text-slate-200 px-0.5', className)}>
    {children}
  </span>
);

export const LeaderBusyCalendarModal: React.FC<LeaderBusyCalendarModalProps> = ({
  open,
  onClose,
  requesterId,
  requesterName,
  requesterAvatarUrl,
  executiveId,
  executiveName,
  executiveAvatarUrl,
  initialDate,
}) => {
  const { t } = useTranslation();
  const [date, setDate] = useState<Dayjs>(() => (initialDate ? dayjs(initialDate) : dayjs()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => dayjs());

  useEffect(() => {
    if (open) setDate(initialDate ? dayjs(initialDate) : dayjs());
  }, [open, initialDate]);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(id);
  }, [open]);

  const userIds = useMemo(
    () => Array.from(new Set([requesterId, executiveId].filter((id): id is string => !!id))),
    [requesterId, executiveId]
  );

  const dateKey = date.format('YYYY-MM-DD');

  const { data, isFetching } = useQuery<IBusyCalendarUser[]>({
    queryKey: ['leader-busy-calendar', userIds, dateKey],
    queryFn: () =>
      scheduleOccurrenceAPI.getBusyCalendar({
        startDate: date.startOf('day').toISOString(),
        endDate: date.endOf('day').toISOString(),
        userIds,
      }),
    enabled: open && userIds.length > 0,
  });

  const rows = useMemo(() => {
    const byId = new Map((data ?? []).map((u) => [u.userId, u]));
    const order: { id: string; label: string; avatarUrl?: string | null; isPrimary: boolean }[] = [];
    if (executiveId) {
      order.push({
        id: executiveId,
        label: executiveName || byId.get(executiveId)?.fullName || '',
        avatarUrl: executiveAvatarUrl,
        isPrimary: true,
      });
    }
    if (requesterId && requesterId !== executiveId) {
      order.push({
        id: requesterId,
        label: requesterName || byId.get(requesterId)?.fullName || t('leadership_schedule.busy_calendar_you', { defaultValue: 'Bạn' }),
        avatarUrl: requesterAvatarUrl,
        isPrimary: false,
      });
    }
    return order.map((o) => ({
      ...o,
      blocks: buildBlocks(byId.get(o.id)?.scheduleOccurrences ?? [], date),
    }));
  }, [data, requesterId, executiveId, requesterName, executiveName, requesterAvatarUrl, executiveAvatarUrl, date, t]);

  const primaryRow = rows.find((r) => r.isPrimary) ?? rows[0];

  const allBlocksSorted = useMemo(
    () => rows.flatMap((row) => row.blocks).sort((a, b) => a.topPx - b.topPx),
    [rows]
  );

  useEffect(() => {
    const candidates = primaryRow?.blocks.length ? primaryRow.blocks : allBlocksSorted;
    setSelectedId((current) => {
      if (current && candidates.some((b) => b.occurrence.scheduleOccurrenceId === current)) return current;
      return candidates[0]?.occurrence.scheduleOccurrenceId ?? null;
    });
  }, [dateKey, data]);

  const selectedBlock = useMemo(() => {
    for (const row of rows) {
      const found = row.blocks.find((b) => b.occurrence.scheduleOccurrenceId === selectedId);
      if (found) return { ...found, row };
    }
    return null;
  }, [rows, selectedId]);

  const selectedOcc = selectedBlock?.occurrence;
  const selectedOccDuration = useMemo(() => {
    if (!selectedOcc) return '';
    const startDayjs = fromApiDateTime(selectedOcc.startDate);
    const endDayjs = fromApiDateTime(selectedOcc.endDate);
    const durationMin = Math.max(0, endDayjs.diff(startDayjs, 'minute'));
    return durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h${durationMin % 60 ? ` ${durationMin % 60}p` : ''}`
      : `${durationMin} ${t('common.minutes', { defaultValue: 'phút' })}`;
  }, [selectedOcc, t]);

  const isToday = date.isSame(dayjs(), 'day');
  const nowMinutes = now.hour() * 60 + now.minute();
  const showNowLine = isToday && nowMinutes >= WINDOW_START_MIN && nowMinutes <= WINDOW_END_MIN;
  const nowTop = minutesToTop(nowMinutes);

  const trackScrollRef = useRef<HTMLDivElement>(null);
  const headerRowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = trackScrollRef.current;
    if (!el || isFetching) return;
    const headerHeight = headerRowRef.current?.offsetHeight ?? 0;
    const target = allBlocksSorted[0];
    el.scrollTop = target ? headerHeight + Math.max(0, target.topPx - HOUR_PX) : 0;
  }, [dateKey, data, isFetching]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      closable={false}
      destroyOnHidden
      zIndex={1400}
      width="min(1440px, calc(100vw - 48px))"
      styles={{ mask: { backgroundColor: 'rgba(15, 23, 42, 0.5)' } }}
      className="[&_.ant-modal-content]:!p-0 [&_.ant-modal-content]:!rounded-[18px] [&_.ant-modal-content]:!overflow-hidden [&_.ant-modal-content]:!border [&_.ant-modal-content]:!border-[#E7ECF2] dark:[&_.ant-modal-content]:!border-slate-800 [&_.ant-modal-content]:!bg-white dark:[&_.ant-modal-content]:!bg-slate-900 [&_.ant-modal-content]:!shadow-[0_28px_70px_-14px_rgba(15,35,65,0.26)]"
    >
      <div className="flex flex-col h-[min(820px,calc(100vh-40px))]">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-0 py-1 pb-2 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white bg-gradient-to-br from-blue-400 to-blue-500 shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5)]">
              <CalendarDays size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {t('leadership_schedule.busy_calendar_title', { defaultValue: 'Lịch làm việc của lãnh đạo' })}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('leadership_schedule.busy_calendar_subtitle', { defaultValue: 'Xem lịch của lãnh đạo để tránh trùng giờ' })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-0.5 h-[38px] rounded-[10px] bg-[#F6F8FB] dark:bg-slate-800/60 border border-[#E5EAF0] dark:border-slate-700 px-1">
              <button
                type="button"
                onClick={() => setDate((d) => d.subtract(1, 'day'))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors duration-150 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <DatePicker
                value={date}
                onChange={(d) => d && setDate(d)}
                allowClear={false}
                inputReadOnly
                suffixIcon={null}
                prefix={
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00529C]/10 dark:bg-blue-500/15 text-[#00529C] dark:text-blue-400 mr-1 pointer-events-none">
                    <Calendar size={14} strokeWidth={2.25} />
                  </span>
                }
                variant="borderless"
                getPopupContainer={() => document.body}
                popupStyle={{ zIndex: 4000 }}
                popupClassName="!z-[4000]"
                format={(value) => (value as Dayjs).format(t('common.date_long_weekday'))}
                className={cn(
                  '!w-[245px] !h-7 !rounded-lg !bg-transparent !border-0 !outline-none !shadow-none !ring-0',
                  '[&.ant-picker]:!border-0 [&.ant-picker]:!outline-none [&.ant-picker]:!shadow-none [&.ant-picker]:!ring-0',
                  '[&.ant-picker:hover]:!border-0 [&.ant-picker:hover]:!outline-none',
                  '[&.ant-picker-focused]:!bg-transparent [&.ant-picker-focused]:!border-0 [&.ant-picker-focused]:!outline-none [&.ant-picker-focused]:!shadow-none [&.ant-picker-focused]:!ring-0',
                  '[&_.ant-picker-input]:!border-0 [&_.ant-picker-input]:!outline-none',
                  '[&_input]:!cursor-pointer [&_input]:!text-left [&_input]:!capitalize [&_input]:!text-[12.5px] [&_input]:!font-medium [&_input]:!py-0 [&_input]:!pl-0 [&_input]:!pr-1 [&_input]:!border-0 [&_input]:!outline-none [&_input]:!ring-0',
                  'transition-colors duration-150 cursor-pointer',
                  isToday ? '[&_input]:!text-[#145EA8] dark:[&_input]:!text-blue-400' : '[&_input]:!text-[#172033] dark:[&_input]:!text-slate-100'
                )}
              />
              <button
                type="button"
                onClick={() => setDate((d) => d.add(1, 'day'))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors duration-150 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 min-h-0">
          {/* LEFT: timeline */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {isFetching ? (
              <div className="flex-1 flex items-center justify-center text-[13px] text-[#94A3B8]">
                {t('common.loading')}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[13px] text-[#94A3B8] px-7 text-center">
                {t('leadership_schedule.busy_calendar_empty', { defaultValue: 'Chưa chọn lãnh đạo để so sánh lịch.' })}
              </div>
            ) : (
              <div ref={trackScrollRef} className="flex-1 min-h-0 overflow-auto slim-scroll">
                <div className="flex flex-col min-w-fit">
                  {/* Sticky column headers */}
                  <div
                    ref={headerRowRef}
                    className="flex items-center h-[76px] sticky top-0 z-10 bg-[#F8FAFC] dark:bg-slate-800/40 border-b border-[#E7ECF2] dark:border-slate-800 px-2"
                  >
                    <div className="w-14 shrink-0" />
                    {rows.map((row) => (
                      <div key={row.id} className="flex-1 min-w-[230px] px-1.5">
                        <div
                          className={cn(
                            'flex items-center gap-2.5 rounded-2xl border px-3.5 h-[56px]',
                            row.isPrimary
                              ? 'bg-white dark:bg-slate-800 border-[#D7E6F5] dark:border-blue-900/40 shadow-[0_1px_4px_rgba(15,35,65,0.06)]'
                              : 'bg-white/70 dark:bg-slate-800/40 border-[#E8EDF3] dark:border-slate-800'
                          )}
                        >
                          <Avatar
                            src={resolveAttachmentUrl(row.avatarUrl)}
                            slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                            className={cn(
                              '!h-9 !w-9 !text-[11.5px] !font-semibold shrink-0 !ring-2 !ring-white dark:!ring-slate-900 !shadow-sm',
                              row.isPrimary
                                ? '!bg-[#EEF4FA] !text-[#145EA8] dark:!bg-blue-500/15 dark:!text-blue-400'
                                : '!bg-[#F1F4F8] !text-[#64748B] dark:!bg-slate-800 dark:!text-slate-400'
                            )}
                          >
                            {initialsOf(row.label)}
                          </Avatar>
                          <div className="min-w-0 flex flex-col gap-0.5 leading-tight">
                            <span
                              className={cn(
                                'truncate text-[#172033] dark:text-slate-100',
                                row.isPrimary ? 'text-[13.5px] font-semibold' : 'text-[12.5px] font-medium'
                              )}
                              title={row.label}
                            >
                              {row.label}
                            </span>
                            <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400">
                              {row.blocks.length} {t('leadership_schedule.unit_schedule', { defaultValue: 'lịch' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Hour grid + events */}
                  <div className="flex" style={{ height: TRACK_HEIGHT }}>
                    <div className="w-14 shrink-0 relative">
                      {HOUR_MARKS.map((mark) => (
                        <span
                          key={mark}
                          className="absolute right-2.5 text-[11px] font-normal text-[#8090A5] dark:text-slate-500"
                          style={{ top: minutesToTop(mark) + 3 }}
                        >
                          {String(Math.floor(mark / 60)).padStart(2, '0')}:00
                        </span>
                      ))}
                      {showNowLine && (
                        <span
                          className="absolute -translate-y-1/2 left-1 z-[8] rounded-full bg-[#ef4444] px-2 py-[3px] text-[11px] font-semibold tabular-nums text-white shadow-[0_2px_8px_rgba(239,68,68,0.35)]"
                          style={{ top: nowTop }}
                        >
                          {now.format('HH:mm')}
                        </span>
                      )}
                    </div>

                    {rows.map((row) => (
                      <div key={row.id} className="relative flex-1 min-w-[230px] border-l border-[#F0F3F7] dark:border-slate-800/80 first:border-l-0">
                        {HOUR_MARKS.filter((mark) => mark !== WINDOW_START_MIN).map((mark) => (
                          <span key={mark} className="absolute left-0 right-0 h-px bg-[#DDE3EA] dark:bg-slate-800" style={{ top: minutesToTop(mark) }} />
                        ))}
                        {HALF_HOUR_MARKS.map((mark) => (
                          <span key={mark} className="absolute left-0 right-0 h-px bg-[#F0F3F7] dark:bg-slate-800/40" style={{ top: minutesToTop(mark) }} />
                        ))}
                        {showNowLine && (
                          <span
                            className="absolute left-0 right-0 border-t border-dashed border-[#ef4444]/85 z-[6]"
                            style={{ top: nowTop }}
                          />
                        )}

                        {row.blocks.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center px-4">
                            <div className="flex flex-col items-center gap-1 text-center rounded-xl bg-[#F1F4F8] dark:bg-slate-800 border border-[#E3E8ED] dark:border-slate-700 shadow-[0_1px_4px_rgba(15,35,65,0.06)] px-6 py-4">
                              <CalendarSearch size={20} className="text-[#D6DEE6] dark:text-slate-600" />
                              <p className="text-[12.5px] font-medium text-[#8090A5] dark:text-slate-400 mt-1">
                                {t('leadership_schedule.busy_calendar_empty_day_title', { defaultValue: 'Không có lịch' })}
                              </p>
                              <p className="text-[11px] text-[#B4BECB] dark:text-slate-500">
                                {t('leadership_schedule.busy_calendar_empty_day_subtitle', { defaultValue: 'Trong ngày này' })}
                              </p>
                            </div>
                          </div>
                        )}

                        {row.blocks.map((b) => {
                          const masked = b.occurrence.isConfidential && !b.occurrence.canViewDetail;
                          const startLabel = fromApiDateTime(b.occurrence.startDate).format('HH:mm');
                          const endLabel = fromApiDateTime(b.occurrence.endDate).format('HH:mm');
                          const isSelected = b.occurrence.scheduleOccurrenceId === selectedId;
                          const tier = b.heightPx >= 65 ? 'full' : b.heightPx >= 46 ? 'compact' : 'thin';
                          const theme = masked ? MASKED_SCHEDULE_EVENT_THEME : SCHEDULE_OCCURRENCE_EVENT_THEME[b.occurrence.status];
                          const fontPx = blockFontSize(b.heightPx, b.widthPct);

                          return (
                            <button
                              key={b.occurrence.scheduleOccurrenceId}
                              type="button"
                              onClick={() => setSelectedId(b.occurrence.scheduleOccurrenceId)}
                              className={cn(
                                'absolute flex flex-col overflow-hidden text-left rounded-[10px] border transition-[filter,opacity] duration-[160ms] ease-out cursor-pointer hover:brightness-[0.97] dark:hover:brightness-110',
                                tier === 'thin' ? 'px-2 py-0.5 justify-center' : 'px-2.5 py-1.5 gap-0.5',
                                theme.bg,
                                theme.border,
                                isSelected ? 'opacity-100 z-[2]' : 'opacity-80'
                              )}
                              style={{
                                top: b.topPx,
                                height: b.heightPx,
                                left: `calc(6px + (100% - 12px) * ${(b.leftPct / 100).toFixed(4)} + 1.5px)`,
                                width: `calc((100% - 12px) * ${(b.widthPct / 100).toFixed(4)} - 3px)`,
                              }}
                            >
                              {masked ? (
                                tier === 'thin' ? (
                                  <Lock size={11} className={cn(theme.text, 'shrink-0')} />
                                ) : (
                                  <>
                                    <span className={cn('flex items-center gap-1 text-[11px] font-medium', theme.text)}>
                                      <Lock size={10} className="shrink-0" />
                                      {t('leadership_schedule.confidential_busy', { defaultValue: 'Lịch bảo mật' })}
                                    </span>
                                    {tier === 'full' && (
                                      <span className="text-[10.5px] tabular-nums text-[#94A3B8] dark:text-slate-500">
                                        {startLabel} - {endLabel}
                                      </span>
                                    )}
                                  </>
                                )
                              ) : tier === 'thin' ? (
                                <span className={cn('flex items-center gap-1 min-w-0', theme.text)} style={{ fontSize: fontPx }}>
                                  <Clock size={9} className="shrink-0 opacity-80" />
                                  <span className="font-medium tabular-nums shrink-0">{startLabel} - {endLabel}</span>
                                  <span className="truncate font-normal text-[#172033] dark:text-slate-100">
                                    {b.occurrence.title}
                                  </span>
                                </span>
                              ) : (
                                <>
                                  <span className={cn('flex items-center gap-1 min-w-0 shrink-0 font-normal tabular-nums', theme.text)} style={{ fontSize: fontPx }}>
                                    <Clock size={9} className="shrink-0 opacity-80" />
                                    <span className="truncate">{startLabel} - {endLabel}</span>
                                  </span>
                                  <span className="min-w-0 shrink-0 font-medium leading-snug truncate text-[#172033] dark:text-slate-100" style={{ fontSize: fontPx }}>
                                    {b.occurrence.title}
                                  </span>
                                  {tier === 'full' && b.occurrence.isConfidential && (
                                    <span className="flex items-center gap-1 min-w-0 shrink-0 text-[10.5px] text-[#8A9AB0] dark:text-slate-500">
                                      <Lock size={9} className="shrink-0" />
                                      <span className="truncate">{t('leadership_schedule.confidential_busy', { defaultValue: 'Lịch bảo mật' })}</span>
                                    </span>
                                  )}
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-[#E8EDF3] dark:bg-slate-800 shrink-0" />

          {/* RIGHT: detail panel */}
          <div className="w-full lg:w-[356px] shrink-0 min-h-0 flex flex-col lg:border-t-0 border-[#E8EDF3] dark:border-slate-800 bg-[#FAFBFD] dark:bg-slate-900/40">
            <div className="h-[76px] px-3.5 border-b border-[#E7ECF2] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/40 flex items-center justify-between shrink-0">
              <div className="w-full h-[56px] flex items-center justify-between rounded-2xl border border-[#E8EDF3] dark:border-slate-800 bg-white dark:bg-slate-800 px-3.5 shadow-[0_1px_4px_rgba(15,35,65,0.06)]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#00529C] dark:text-blue-400">
                    <FileText size={15} strokeWidth={2.2} />
                  </span>
                  <span className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100 truncate">
                    {t('leadership_schedule.busy_calendar_detail_title', { defaultValue: 'Chi tiết lịch' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto slim-scroll p-4">
              <AnimatePresence mode="wait">
                {selectedBlock ? (
                  <motion.div
                    key={selectedBlock.occurrence.scheduleOccurrenceId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex flex-col gap-4"
                  >
                    {(() => {
                      const occ = selectedBlock.occurrence;
                      const masked = occ.isConfidential && !occ.canViewDetail;
                      const startLabel = fromApiDateTime(occ.startDate).format('HH:mm');
                      const endLabel = fromApiDateTime(occ.endDate).format('HH:mm');

                      if (masked) {
                        return (
                          <>
                            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] p-4">
                              <div className="flex flex-col gap-3">
                                {selectedBlock.row && (
                                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Avatar
                                        src={selectedBlock.row.avatarUrl || undefined}
                                        sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#00529C', fontWeight: 600 }}
                                      >
                                        {initialsOf(selectedBlock.row.label)}
                                      </Avatar>
                                      <span className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                                        {selectedBlock.row.label}
                                      </span>
                                    </div>
                                    {selectedBlock.row.isPrimary ? (
                                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#00529C] dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 shrink-0">
                                        {t('leadership_schedule.badge_leader', { defaultValue: 'Lãnh đạo' })}
                                      </span>
                                    ) : (
                                      <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                                        {t('leadership_schedule.busy_calendar_you', { defaultValue: 'Bạn' })}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-800/40">
                                    <Lock size={15} />
                                  </span>
                                  <div className="min-w-0">
                                    <h4 className="text-[14.5px] font-bold text-slate-800 dark:text-slate-100 leading-snug m-0">
                                      {t('leadership_schedule.confidential_busy', { defaultValue: 'Lịch bảo mật' })}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#00529C] dark:text-blue-400 mt-1">
                                      <Clock size={12} className="shrink-0" />
                                      <span>{startLabel} - {endLabel}</span>
                                      {selectedOccDuration && <span>({selectedOccDuration})</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                              <div className="flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                  <Lock size={16} />
                                </span>
                                <div className="min-w-0 flex flex-col gap-1">
                                  <span className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">
                                    {t('leadership_schedule.confidential_busy', { defaultValue: 'Lịch riêng tư' })}
                                  </span>
                                  <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed m-0">
                                    {t('leadership_schedule.busy_calendar_no_permission', {
                                      defaultValue: 'Nội dung chi tiết được bảo mật. Bạn chỉ xem được khung giờ bận để tránh trùng lịch.',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      }

                      return (
                        <>
                          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-[0_2px_10px_-3px_rgba(15,23,42,0.06)] p-4">
                            <div className="flex flex-col gap-3">
                              {selectedBlock.row && (
                                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Avatar
                                      src={selectedBlock.row.avatarUrl || undefined}
                                      sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#00529C', fontWeight: 600 }}
                                    >
                                      {initialsOf(selectedBlock.row.label)}
                                    </Avatar>
                                    <span className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                                      {selectedBlock.row.label}
                                    </span>
                                  </div>
                                  {selectedBlock.row.isPrimary ? (
                                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#00529C] dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/60 shrink-0">
                                      {t('leadership_schedule.badge_leader', { defaultValue: 'Lãnh đạo' })}
                                    </span>
                                  ) : (
                                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                                      {t('leadership_schedule.busy_calendar_you', { defaultValue: 'Bạn' })}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="flex items-start justify-between gap-2.5">
                                <h4 className="text-[15px] font-medium text-[#00529C] dark:text-slate-50 leading-snug break-words m-0">
                                  {occ.title || '—'}
                                </h4>
                                <StatusBadge status={String(occ.status)} size="md" className="shrink-0 mt-0.5" />
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#00529C]/8 text-[#00529C] dark:bg-blue-500/15 dark:text-blue-300 border border-[#00529C]/15 dark:border-blue-500/20">
                                  <Clock size={12.5} className="text-[#00529C] dark:text-blue-400 shrink-0" />
                                  <span>{startLabel} - {endLabel}</span>
                                </span>
                                {selectedOccDuration && (
                                  <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400">
                                    {selectedOccDuration}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <SectionLabel>
                              {t('leadership_schedule.busy_calendar_section_info', { defaultValue: 'Thông tin lịch' })}
                            </SectionLabel>
                            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-[0_1px_4px_rgba(15,23,42,0.04)] divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                              <MetaRow
                                label={t('leadership_schedule.busy_calendar_field_location', { defaultValue: 'Địa điểm' })}
                                icon={<MapPin size={16} />}
                                iconClassName="bg-blue-50/80 text-[#00529C] dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {occ.location || '—'}
                              </MetaRow>
                              <MetaRow
                                label={t('leadership_schedule.busy_calendar_field_code', { defaultValue: 'Mã lịch' })}
                                icon={<Hash size={16} />}
                                iconClassName="bg-blue-50/80 text-[#00529C] dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {occ.code || '—'}
                              </MetaRow>
                              <MetaRow
                                label={t('leadership_schedule.busy_calendar_field_category', { defaultValue: 'Danh mục' })}
                                icon={<Tag size={16} />}
                                iconClassName="bg-blue-50/80 text-[#00529C] dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {CATEGORY_LABEL_KEYS[occ.scheduleCategory] ? t(CATEGORY_LABEL_KEYS[occ.scheduleCategory]) : '—'}
                              </MetaRow>
                            </div>
                          </div>

                          {hasRichContent(occ.detailContent) && (
                            <div className="flex flex-col gap-2">
                              <SectionLabel>
                                {t('leadership_schedule.busy_calendar_section_content', { defaultValue: 'Nội dung' })}
                              </SectionLabel>
                              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-[0_1px_4px_rgba(15,23,42,0.04)] p-3.5 text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200 max-h-[160px] overflow-y-auto slim-scroll">
                                <div
                                  className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1"
                                  dangerouslySetInnerHTML={{ __html: occ.detailContent }}
                                />
                              </div>
                            </div>
                          )}

                          {occ.isConfidential && (
                            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-500/20 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 dark:from-amber-950/30 dark:via-slate-900/60 dark:to-transparent p-3.5 shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
                              <div className="flex items-start gap-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 mt-0.5">
                                  <Lock size={14} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[12px] font-bold text-amber-800 dark:text-amber-300">
                                    {t('leadership_schedule.confidential_busy', { defaultValue: 'Lịch bảo mật' })}
                                  </span>
                                  <p className="text-[11.5px] text-amber-700/80 dark:text-amber-300/70 mt-0.5 leading-relaxed m-0">
                                    {t('leadership_schedule.busy_calendar_has_permission', {
                                      defaultValue: 'Bạn được phép xem nội dung chi tiết của lịch này.',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="h-full min-h-[260px] flex flex-col items-center justify-center px-4 py-8 text-center"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/50 text-[#00529C] dark:text-blue-400 shadow-xs mb-3 border border-blue-100/60 dark:border-slate-700">
                      <CalendarSearch size={20} strokeWidth={2} />
                    </div>
                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 mb-1">
                      {t('leadership_schedule.busy_calendar_detail_title', { defaultValue: 'Chi tiết lịch' })}
                    </span>
                    <p className="text-[12px] text-slate-400 dark:text-slate-500 max-w-[210px] leading-relaxed m-0">
                      {t('leadership_schedule.busy_calendar_select_hint', { defaultValue: 'Chọn một lịch trên timeline để xem chi tiết.' })}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default LeaderBusyCalendarModal;
