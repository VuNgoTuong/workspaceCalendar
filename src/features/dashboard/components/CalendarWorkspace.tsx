import React from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventInput } from '@fullcalendar/core';
import CalendarToolbar from './CalendarToolbar';
import CalendarView from './CalendarView';

type CalendarViewKey = 'day' | 'week' | 'month';

interface CalendarWorkspaceProps {
  calendarRef: React.RefObject<FullCalendar | null>;
  rangeLabel: string;
  view: CalendarViewKey;
  onViewChange: (view: CalendarViewKey) => void;
  date: Date;
  events: EventInput[];
  goToday: () => void;
  goPrev: () => void;
  goNext: () => void;
  activeScope: number;
  onScopeChange: (idx: number) => void;
  scopeTabs: string[];
}

export const CalendarWorkspace: React.FC<CalendarWorkspaceProps> = ({
  calendarRef,
  rangeLabel,
  view,
  onViewChange,
  date,
  events,
  goToday,
  goPrev,
  goNext,
}) => {
  return (
    <div
      id="hero-calendar-container"
      className="!rounded-2xl !border !border-slate-100 dark:!border-slate-800/80 !shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:!shadow-none !bg-white dark:!bg-slate-900 flex flex-col lg:flex-row overflow-hidden min-h-[600px] scroll-mt-6"
    >
      <div className="flex-1 flex flex-col min-w-0">
        <CalendarToolbar
          rangeLabel={rangeLabel}
          view={view}
          onViewChange={onViewChange}
          goToday={goToday}
          goPrev={goPrev}
          goNext={goNext}
        />
        <CalendarView
          calendarRef={calendarRef}
          view={view}
          date={date}
          events={events}
        />
      </div>
    </div>
  );
};

export default CalendarWorkspace;
