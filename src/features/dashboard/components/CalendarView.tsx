import React, { useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DayHeaderContentArg, EventContentArg, EventInput, SlotLabelContentArg } from '@fullcalendar/core';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { Clock, Video, Users } from 'lucide-react';
import { EVENT_COLORS, type ScheduleEvent } from '../../work-schedule/TongHop/calendarTheme';

type CalendarViewKey = 'day' | 'week' | 'month';

const FC_VIEW_MAP: Record<CalendarViewKey, string> = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth',
};

interface CalendarViewProps {
  calendarRef: React.RefObject<FullCalendar | null>;
  view: CalendarViewKey;
  date: Date;
  events: EventInput[];
}

const CustomEvent: React.FC<{ arg: EventContentArg }> = ({ arg }) => {
  const { event, view } = arg;
  const data = event.extendedProps as Pick<ScheduleEvent, 'location' | 'attendeeCount' | 'color'>;
  const theme = EVENT_COLORS[data.color || 'blue'];

  if (view.type === 'dayGridMonth') {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium truncate ${theme.soft}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${theme.dot}`} />
        <span className="truncate">{event.title}</span>
      </div>
    );
  }

  if (event.allDay) {
    return (
      <div className={`text-[11px] font-medium px-2.5 py-0.5 rounded-md truncate ${theme.soft}`}>
        {event.title}
      </div>
    );
  }

  const durationMin = event.start && event.end ? dayjs(event.end).diff(event.start, 'minute') : 0;
  const timeLabel = event.start
    ? durationMin >= 45 && event.end
      ? `${dayjs(event.start).format('HH:mm')} - ${dayjs(event.end).format('HH:mm')}`
      : dayjs(event.start).format('HH:mm')
    : '';

  return (
    <div
      className={`h-full w-full rounded-lg border-l-[3.5px] px-2.5 py-1.5 flex flex-col overflow-hidden gap-0.5 transition-all duration-200 hover:shadow-md hover:brightness-[0.99] ${theme.bg} ${theme.accent}`}
    >
      <span className={`flex items-center gap-1 text-[10px] font-medium leading-snug shrink-0 ${theme.text}`}>
        <Clock size={10} className="shrink-0" />
        {timeLabel}
      </span>
      <span className="text-[12px] font-medium text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
        {event.title}
      </span>
      {durationMin >= 60 && (data.location || !!data.attendeeCount) && (
        <span className="text-[10px] truncate text-slate-500 dark:text-slate-400 leading-snug flex items-center gap-2 mt-auto">
          {data.location && (
            <span className="flex items-center gap-1 truncate font-medium">
              {data.location === 'Online' ? <Video size={10} className="shrink-0 text-blue-500" /> : null}
              {data.location}
            </span>
          )}
          {!!data.attendeeCount && (
            <span className="flex items-center gap-0.5 shrink-0 font-medium">
              <Users size={10} />
              {data.attendeeCount}
            </span>
          )}
        </span>
      )}
    </div>
  );
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  calendarRef,
  view,
  date,
  events,
}) => {
  const { t } = useTranslation();

  // Stable callback identities so FullCalendar doesn't treat these as changed props on every
  // parent re-render — same pattern as work-schedule/TongHop/Overview.tsx.
  const slotLabelContent = useCallback(
    (arg: SlotLabelContentArg) => t('dashboard.hour_suffix', { hour: dayjs(arg.date).format('HH') }),
    [t]
  );

  const dayHeaderContent = useCallback(
    (arg: DayHeaderContentArg) => (
      <span className="flex items-center gap-1.5">
        <span className="capitalize font-medium">{dayjs(arg.date).format('dd')}</span>
        <span className="font-normal opacity-85">{dayjs(arg.date).format('DD/MM')}</span>
      </span>
    ),
    []
  );

  const eventContent = useCallback((arg: EventContentArg) => <CustomEvent arg={arg} />, []);

  return (
    <div className="flex-1 px-4 pb-4 pt-3 h-full min-h-[500px]">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={FC_VIEW_MAP[view]}
        initialDate={date}
        headerToolbar={false}
        events={events}
        allDaySlot
        height="100%"
        expandRows
        nowIndicator
        firstDay={1}
        slotMinTime="07:00:00"
        slotMaxTime="18:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00"
        slotLabelContent={slotLabelContent}
        dayHeaderContent={dayHeaderContent}
        dayMaxEventRows={3}
        eventContent={eventContent}
      />
    </div>
  );
};

export default CalendarView;
