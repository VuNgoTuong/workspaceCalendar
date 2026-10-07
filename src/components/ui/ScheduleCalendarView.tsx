import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { useTranslation } from 'react-i18next';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import viLocale from '@fullcalendar/core/locales/vi';
import type { EventContentArg, EventHoveringArg, EventInput, MoreLinkContentArg } from '@fullcalendar/core';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Spin } from 'antd';
import { cn } from '../../utils/helpers';
import { useFcPopoverClamp, useMinuteTick } from '../../hooks';
import './calendar.css';
import { ScheduleOccurrenceStatus } from '../../constants/scheduleOccurrenceStatus';

export type ScheduleCalendarViewKey = 'day' | 'week' | 'month';

const FC_PLUGINS = [dayGridPlugin, timeGridPlugin, interactionPlugin];
const FC_TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false } as const;

const getTooltipStatusBadge = (status: any) => {
  if (status === null || status === undefined) return null;

  const num = typeof status === 'number' ? status : Number(status);
  if (!isNaN(num) && num > 0) {
    switch (num) {
      case ScheduleOccurrenceStatus.Approved:
        return { labelKey: 'status.approved', className: 'bg-[#ECFDF5] text-[#10B981] dark:bg-[rgba(16,185,129,0.15)] dark:text-[#34D399]' };
      case ScheduleOccurrenceStatus.Waiting:
        return { labelKey: 'status.pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300' };
      case ScheduleOccurrenceStatus.Created:
        return { labelKey: 'status.created', className: 'bg-[#F0F9FF] text-[#0284C7] dark:bg-[rgba(2,132,199,0.15)] dark:text-[#38BDF8]' };
      case ScheduleOccurrenceStatus.Rejected:
        return { labelKey: 'status.rejected', className: 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300' };
      case ScheduleOccurrenceStatus.Cancelled:
        return { labelKey: 'status.cancelled', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
      case ScheduleOccurrenceStatus.Draft:
        return { labelKey: 'status.draft', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
    }
  }

  const s = String(status).toLowerCase().trim();
  if (s === 'created' || s.includes('tạo') || s.includes('tao')) {
    return { labelKey: 'status.created', className: 'bg-[#F0F9FF] text-[#0284C7] dark:bg-[rgba(2,132,199,0.15)] dark:text-[#38BDF8]' };
  }
  if (s === 'approved' || s === 'completed' || s.includes('duyệt') || s.includes('duyet')) {
    return { labelKey: 'status.approved', className: 'bg-[#ECFDF5] text-[#10B981] dark:bg-[rgba(16,185,129,0.15)] dark:text-[#34D399]' };
  }
  if (s === 'pending' || s === 'waiting' || s === 'submitted' || s.includes('chờ') || s.includes('cho')) {
    return { labelKey: 'status.pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300' };
  }
  if (s === 'rejected' || s === 'declined' || s.includes('từ chối') || s.includes('tu choi')) {
    return { labelKey: 'status.rejected', className: 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-300' };
  }
  if (s === 'cancelled' || s.includes('hủy') || s.includes('huy')) {
    return { labelKey: 'status.cancelled', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
  }
  if (s === 'draft' || s.includes('nháp') || s.includes('nhap')) {
    return { labelKey: 'status.draft', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
  }

  return null;
};


const FC_VIEW_MAP: Record<ScheduleCalendarViewKey, string> = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth',
};

const VIEW_LABEL_KEY: Record<ScheduleCalendarViewKey, string> = {
  day: 'common.view_day',
  week: 'common.view_week',
  month: 'common.view_month',
};

const defaultEventContent = (arg: EventContentArg) => (
  <div className="flex items-center gap-1.5 min-w-0 px-1.5 py-0.5 rounded-md text-[11px] leading-tight cursor-pointer overflow-hidden transition-opacity hover:opacity-80 bg-blue-50/70 dark:bg-blue-950/15 text-[#00529C]/85 dark:text-blue-300/90">
    <Clock size={10} className="shrink-0" />
    {arg.event.start && arg.event.end && (
      <span className="shrink-0 font-medium">
        {dayjs(arg.event.start).format('HH:mm')} - {dayjs(arg.event.end).format('HH:mm')}
      </span>
    )}
    <span className="truncate font-normal text-slate-800 dark:text-slate-100">{arg.event.title}</span>
  </div>
);

export interface ScheduleCalendarViewProps {
  events: EventInput[];
  loading?: boolean;
  date: Dayjs;
  onDateChange: (date: Dayjs) => void;
  onSelectSlot: (start: Date, end: Date, allDay: boolean) => void;
  onEventClick: (raw: any) => void;
  renderEventContent?: (arg: EventContentArg) => React.ReactNode;
  visible?: boolean;
}

export const ScheduleCalendarView: React.FC<ScheduleCalendarViewProps> = ({
  events,
  loading,
  date,
  onDateChange,
  onSelectSlot,
  onEventClick,
  renderEventContent,
  visible = true,
}) => {
  const { t, i18n } = useTranslation();
  useMinuteTick();
  const currentTime = dayjs().format('HH:mm');
  const [view, setView] = useState<ScheduleCalendarViewKey>('month');
  const calendarRef = useRef<FullCalendar>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useFcPopoverClamp(containerRef);
  const [hovered, setHovered] = useState<{
    title: string;
    start: Date | null;
    end: Date | null;
    location?: string;
    meetingFormat?: string;
    participantNames?: string[];
    status?: any;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; openDown: boolean } | null>(null);

  const onSelectSlotRef = useRef(onSelectSlot);
  const onEventClickRef = useRef(onEventClick);
  onSelectSlotRef.current = onSelectSlot;
  onEventClickRef.current = onEventClick;

  const handleEventMouseEnter = useCallback((info: EventHoveringArg) => {
    const raw = info.event.extendedProps?.raw;
    const participants = (raw?.participants ?? []) as { name?: string }[];
    const status = raw?.status ?? raw?.occurrence?.status ?? (info.event as any).status ?? info.event.extendedProps?.status;
    setHovered({
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      location: raw?.location,
      meetingFormat: raw?.meetingFormat,
      participantNames: participants.map((p) => p.name).filter((name): name is string => !!name),
      status,
    });
    const openDown = info.jsEvent.clientY < 150;
    setTooltipPos({ x: info.jsEvent.clientX, y: info.jsEvent.clientY + (openDown ? 16 : -12), openDown });
  }, []);

  const handleEventMouseLeave = useCallback(() => {
    setHovered(null);
    setTooltipPos(null);
  }, []);

  const renderMoreLinkContent = useCallback(
    (arg: MoreLinkContentArg) => t('common.more_events', { count: arg.num, defaultValue: `+ ${arg.num} sự kiện khác` }),
    [t]
  );

  useEffect(() => {
    calendarRef.current?.getApi().gotoDate(date.toDate());
  }, [date]);

  useEffect(() => {
    calendarRef.current?.getApi().changeView(FC_VIEW_MAP[view]);
  }, [view]);

  useEffect(() => {
    if (visible) {
      const raf = requestAnimationFrame(() => {
        calendarRef.current?.getApi().updateSize();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [visible]);

  const navButtonClass =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-[#00529C] hover:text-[#00529C] dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors cursor-pointer';

  const isVi = i18n.language === 'vi';
  const localized = date.locale(isVi ? 'vi' : 'en');
  const weekStart = date.startOf('week');
  const weekEnd = date.endOf('week');
  const headerLabel =
    view === 'day'
      ? localized.format('dddd, DD/MM/YYYY')
      : view === 'week'
        ? `${weekStart.format(weekStart.year() === weekEnd.year() ? 'DD/MM' : 'DD/MM/YYYY')} – ${weekEnd.format('DD/MM/YYYY')}`
        : isVi
          ? `Tháng ${date.format('M/YYYY')}`
          : localized.format('MMMM YYYY');

  const fcLocale = i18n.language === 'vi' ? viLocale : undefined;
  const calendar = useMemo(
    () => (
      <FullCalendar
        ref={calendarRef}
        plugins={FC_PLUGINS}
        initialView={FC_VIEW_MAP[view]}
        initialDate={date.format('YYYY-MM-DD')}
        headerToolbar={false}
        height="100%"
        locale={fcLocale}
        selectable
        select={(info) => onSelectSlotRef.current(info.start, info.end, info.allDay)}
        eventClick={(info) => onEventClickRef.current(info.event.extendedProps?.raw)}
        eventMouseEnter={handleEventMouseEnter}
        eventMouseLeave={handleEventMouseLeave}
        events={events}
        eventContent={renderEventContent ?? defaultEventContent}
        moreLinkContent={renderMoreLinkContent}
        dayMaxEvents={view === 'month' ? 2 : true}
        slotEventOverlap={false}
        allDaySlot={false}
        nowIndicator
        slotMinTime="07:00:00"
        slotMaxTime="19:00:00"
        scrollTime="07:00:00"
        slotLabelFormat={FC_TIME_FORMAT}
        eventTimeFormat={FC_TIME_FORMAT}
        noEventsText=""
      />
    ),
    [events, renderEventContent, fcLocale, view === 'month', handleEventMouseEnter, handleEventMouseLeave, renderMoreLinkContent]
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onDateChange(date.subtract(1, view))} className={navButtonClass}>
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDateChange(dayjs())}
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-12.5 font-medium text-slate-600 dark:text-slate-300 hover:border-[#00529C] hover:text-[#00529C] dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            {t('common.today', { defaultValue: 'Hôm nay' })}
          </button>
          <button type="button" onClick={() => onDateChange(date.add(1, view))} className={navButtonClass}>
            <ChevronRight size={16} />
          </button>
          <span className="text-[14px] font-medium text-slate-800 dark:text-slate-100 capitalize ml-1">
            {headerLabel}
          </span>
        </div>

        <div className="flex gap-0.5 p-0.5 bg-slate-50 dark:bg-slate-800/40 rounded-full border border-slate-200/50 dark:border-slate-700/50">
          {(['day', 'week', 'month'] as const).map((key) => {
            const isActive = view === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={cn(
                  'h-7.5 px-3.5 rounded-full text-12.5 font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-[#00529C] dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                {t(VIEW_LABEL_KEY[key], { defaultValue: key === 'day' ? 'Ngày' : key === 'week' ? 'Tuần' : 'Tháng' })}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ '--now-time': `"${currentTime}"` } as React.CSSProperties}
        className={cn(
          'fc-wrapper relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900',
          view === 'month' ? 'h-[720px]' : 'h-[600px]'
        )}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-900/60">
            <Spin size="large" />
          </div>
        )}
        {calendar}

      </div>

      {hovered && tooltipPos && (() => {

        return createPortal(
          <div
            className="fixed z-[1100] w-[320px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 text-left pointer-events-none transition-colors duration-150 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.06)]"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: `translate(-50%, ${tooltipPos.openDown ? '0' : '-100%'})`,
            }}
          >
            {/* Arrow pointer */}
            <div
              className={cn(
                'absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-slate-900 rotate-45 pointer-events-none',
                tooltipPos.openDown
                  ? '-top-1.5 border-t border-l border-slate-200/90 dark:border-slate-800'
                  : '-bottom-1.5 border-b border-r border-slate-200/90 dark:border-slate-800'
              )}
            />

            <div className="flex items-start justify-between gap-2.5">
              <div className="text-[13.5px] font-semibold text-[#00529C] dark:text-blue-400 leading-snug line-clamp-2">
                {hovered.title}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                {(() => {
                  const badge = getTooltipStatusBadge(hovered.status);
                  if (!badge) return null;
                  return (
                    <span
                      className={cn(
                        'inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-medium leading-none select-none shrink-0 shadow-none border border-current/25',
                        badge.className
                      )}
                    >
                      {t(badge.labelKey)}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="border-b border-slate-100 dark:border-slate-800/80 my-2.5" />

            <div className="flex flex-col gap-1.5 text-[12px] text-slate-600 dark:text-slate-300">
              {hovered.start && hovered.end && (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                    {t('dashboard.time_label', { defaultValue: 'Thời gian:' })}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 font-normal">
                    {dayjs(hovered.start).format('HH:mm')} - {dayjs(hovered.end).format('HH:mm')}
                  </span>
                </div>
              )}

              {hovered.location && (
                <div className="flex items-baseline gap-1.5 truncate">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                    {t('dashboard.location_label', { defaultValue: 'Địa điểm:' })}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 truncate font-normal">{hovered.location}</span>
                </div>
              )}

              {hovered.meetingFormat && (
                <div className="flex items-baseline gap-1.5 truncate">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                    {t('dashboard.meeting_type_label', { defaultValue: 'Hình thức:' })}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 truncate font-normal">
                    {t(hovered.meetingFormat === 'online' ? 'meeting_format.online' : 'meeting_format.offline')}
                  </span>
                </div>
              )}

              {hovered.participantNames && hovered.participantNames.length > 0 && (
                <div className="flex items-baseline gap-1.5 truncate">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                    {t('dashboard.participants_label', { defaultValue: 'Thành phần:' })}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400 truncate font-normal">
                    {hovered.participantNames.slice(0, 3).join(', ')}
                    {hovered.participantNames.length > 3 &&
                      ` +${hovered.participantNames.length - 3}`}
                  </span>
                </div>
              )}
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};

export default ScheduleCalendarView;
