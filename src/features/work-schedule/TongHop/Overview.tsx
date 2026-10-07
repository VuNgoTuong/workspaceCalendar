import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import viLocale from '@fullcalendar/core/locales/vi';
import type {
  EventContentArg,
  EventInput,
  DayHeaderContentArg,
  SlotLabelContentArg,
  EventHoveringArg,
} from '@fullcalendar/core';
import {
  Box,
  Paper,
  IconButton,
} from '@mui/material';
import { Tooltip } from '../../../components/ui';
import { PagedPickerSelect } from '../../../components/ui/PagedPickerSelect';
import { FormModal } from '../../../components/ui/FormModal';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  Video,
  Clock,
  FileCheck,
  Calendar,
  CalendarPlus,
  Mail,
  List,
  CircleUser,
  Users,
  Search,
  X,
  MapPin,
  Sparkles,
  AlertCircle,
  Check,
  Tag,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCalendarOverviewQuery, useOverviewLeaderId } from './hooks/useCalendarOverviewQuery';
import { mapCalendarItemToEvent, type OverviewEvent } from './utils/overviewAdapter';
import { InvitationDetailModal } from '../LichMoiThamDu/MeetingInvitations';
import { mapOccurrenceToInvitation } from '../LichMoiThamDu/utils/occurrenceAdapter';
import { PersonalScheduleDetailModal } from '../LichCaNhan/components/PersonalScheduleDetailModal';
import { mapOccurrenceToEvent as mapOccurrenceToPersonalEvent } from '../LichCaNhan/utils/occurrenceAdapter';
import { LeadershipScheduleDetailModal } from '../DangKyLichLanhDao/components/LeadershipScheduleDetailModal';
import { mapOccurrenceToRequest } from '../DangKyLichLanhDao/utils/occurrenceAdapter';
import { cn } from '../../../utils/helpers';
import { usePermission } from '../../../hooks/usePermission';
import { userAPI, type IExecutiveUser } from '../../../services/api/userAPI';
import { scheduleOccurrenceAPI } from '../../../services/api/scheduleOccurrenceAPI';

import { ScheduleCalendarType } from '../../../constants/scheduleCalendarType';
import { MeetingType, MEETING_TYPE_CONFIG } from '../../../constants/meetingType';
import { SchedulePriority, SCHEDULE_PRIORITY_CONFIG } from '../../../constants/schedulePriority';
import { ScheduleOccurrenceStatus, SCHEDULE_OCCURRENCE_EVENT_THEME } from '../../../constants/scheduleOccurrenceStatus';
import '../../../components/ui/calendar.css';
import { useFcPopoverClamp } from '../../../hooks/useFcPopoverClamp';
import { useDebounce } from '../../../hooks/useDebounce';
import { PersonAvatar } from '../components/PersonAvatar';

const MEETING_TYPE_I18N_KEY: Record<MeetingType, string> = {
  [MeetingType.Offline]: 'meeting_format.offline',
  [MeetingType.Online]: 'meeting_format.online',
  [MeetingType.Other]: 'meeting_format.other',
};

const PRIORITY_I18N_KEY: Record<SchedulePriority, string> = {
  [SchedulePriority.Normal]: 'priority.normal',
  [SchedulePriority.Urgent]: 'priority.urgent',
};

const INVITATION_TOOLTIP_LABEL_KEY: Partial<Record<ScheduleOccurrenceStatus, string>> = {
  [ScheduleOccurrenceStatus.Waiting]: 'meeting_invitations.status_pending',
  [ScheduleOccurrenceStatus.Approved]: 'meeting_invitations.status_confirmed',
  [ScheduleOccurrenceStatus.Rejected]: 'meeting_invitations.status_declined',
  [ScheduleOccurrenceStatus.Cancelled]: 'meeting_invitations.status_cancelled',
};

const getEventTooltipStatusBadge = (event: Pick<OverviewEvent, 'status' | 'displayStatus' | 'participantStatus'>) => {
  const badge = getTooltipStatusBadge(event.displayStatus ?? event.status);
  const invitationLabelKey = event.participantStatus != null ? INVITATION_TOOLTIP_LABEL_KEY[event.displayStatus] : undefined;
  return badge && invitationLabelKey ? { ...badge, labelKey: invitationLabelKey } : badge;
};

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

const EXECUTIVE_ADMIN_ROLES = ['administrator', 'admin'];

const fetchExecutives = async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }) => {
  const res = await userAPI.getExecutiveManagement({ searchKeyword: search, PageNumber: page, PageSize: pageSize });
  return { items: res.items || [], total: res.totalCount || 0 };
};

const CALENDAR_TYPE_TOGGLES: {
  type: ScheduleCalendarType;
  labelKey: string;
  icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number | string }>;
  activeClass: string;
  inactiveClass: string;
  textColor: string;
}[] = [
  {
    type: ScheduleCalendarType.Personal,
    labelKey: 'work_schedule.personal_calendar',
    icon: CircleUser,
    activeClass:
      'bg-[#0284C7] text-white border border-[#0284C7] shadow-xs',
    inactiveClass:
      'bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 hover:border-slate-300 dark:hover:text-slate-300 shadow-none',
    textColor: 'text-[#0284C7] dark:text-[#38BDF8]',
  },
  {
    type: ScheduleCalendarType.LeaderRegistration,
    labelKey: 'work_schedule.leadership_registration',
    icon: CalendarPlus,
    activeClass:
      'bg-rose-500 text-white border border-rose-500 shadow-xs',
    inactiveClass:
      'bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 hover:border-slate-300 dark:hover:text-slate-300 shadow-none',
    textColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    type: ScheduleCalendarType.LeaderApproval,
    labelKey: 'work_schedule.schedule_approval',
    icon: FileCheck,
    activeClass:
      'bg-[#10B981] text-white border border-[#10B981] shadow-xs',
    inactiveClass:
      'bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 hover:border-slate-300 dark:hover:text-slate-300 shadow-none',
    textColor: 'text-[#10B981] dark:text-[#34D399]',
  },
  {
    type: ScheduleCalendarType.Invitation,
    labelKey: 'work_schedule.meeting_invitations',
    icon: Mail,
    activeClass:
      'bg-amber-500 text-white border border-amber-500 shadow-xs',
    inactiveClass:
      'bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 hover:border-slate-300 dark:hover:text-slate-300 shadow-none',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
];

const ALL_CALENDAR_TYPES: ScheduleCalendarType[] = CALENDAR_TYPE_TOGGLES.map((cfg) => cfg.type);

const CALENDAR_TYPE_META: Record<ScheduleCalendarType, { icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number | string }>; labelKey: string; text: string }> =
  Object.fromEntries(
    CALENDAR_TYPE_TOGGLES.map((cfg) => [
      cfg.type,
      { icon: cfg.icon, labelKey: cfg.labelKey, text: cfg.textColor },
    ])
  ) as Record<ScheduleCalendarType, { icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number | string }>; labelKey: string; text: string }>;

const UPCOMING_TYPE_CONFIG: Record<
  ScheduleCalendarType,
  {
    labelKey: string;
    icon: React.ComponentType<{ size?: number | string; className?: string; strokeWidth?: number | string }>;
  }
> = {
  [ScheduleCalendarType.Personal]: {
    labelKey: 'dashboard.upcoming_type_personal',
    icon: CircleUser,
  },
  [ScheduleCalendarType.LeaderRegistration]: {
    labelKey: 'dashboard.upcoming_type_leader',
    icon: CalendarPlus,
  },
  [ScheduleCalendarType.LeaderApproval]: {
    labelKey: 'dashboard.upcoming_type_approval',
    icon: FileCheck,
  },
  [ScheduleCalendarType.Invitation]: {
    labelKey: 'dashboard.upcoming_type_invitation',
    icon: Mail,
  },
};

const TOOLTIP_HALF_WIDTH = 160;

type CalendarViewKey = 'day' | 'week' | 'month';
const VIEW_KEYS: CalendarViewKey[] = ['day', 'week', 'month'];

const FC_PLUGINS = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin];
const FC_EVENT_TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false } as const;
const FC_LIST_DAY_SIDE_FORMAT = { day: '2-digit', month: '2-digit' } as const;

const FC_VIEW_MAP: Record<CalendarViewKey, string> = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth',
};

const FC_LIST_VIEW_MAP: Record<CalendarViewKey, string> = {
  day: 'listDay',
  week: 'listWeek',
  month: 'listMonth',
};

const COMPACT_CALENDAR_BREAKPOINT = 1024;
const UPCOMING_PREVIEW_COUNT = 5;
const UPCOMING_BATCH = 10;

const SURFACE =
  '!rounded-2xl !border !border-slate-100 dark:!border-slate-800/80 !shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:!shadow-none !bg-white dark:!bg-slate-900';

const resolveOverviewStatusTheme = (status: any) => {
  if (typeof status === 'number' && status in SCHEDULE_OCCURRENCE_EVENT_THEME) {
    return SCHEDULE_OCCURRENCE_EVENT_THEME[status as ScheduleOccurrenceStatus];
  }
  if (typeof status === 'string') {
    const s = status.toLowerCase().trim();
    if (s.includes('created') || s.includes('tạo') || s.includes('tao')) {
      return SCHEDULE_OCCURRENCE_EVENT_THEME[ScheduleOccurrenceStatus.Created];
    }
    if (s.includes('approved') || s.includes('completed') || s.includes('duyệt') || s.includes('duyet')) {
      return SCHEDULE_OCCURRENCE_EVENT_THEME[ScheduleOccurrenceStatus.Approved];
    }
    if (s.includes('pending') || s.includes('waiting') || s.includes('submitted') || s.includes('chờ') || s.includes('cho')) {
      return SCHEDULE_OCCURRENCE_EVENT_THEME[ScheduleOccurrenceStatus.Waiting];
    }
    if (s.includes('rejected') || s.includes('declined') || s.includes('từ chối') || s.includes('tu choi')) {
      return SCHEDULE_OCCURRENCE_EVENT_THEME[ScheduleOccurrenceStatus.Rejected];
    }
    if (s.includes('cancelled') || s.includes('hủy') || s.includes('huy')) {
      return SCHEDULE_OCCURRENCE_EVENT_THEME[ScheduleOccurrenceStatus.Cancelled];
    }
    if (s.includes('draft') || s.includes('nháp') || s.includes('nhap')) {
      return SCHEDULE_OCCURRENCE_EVENT_THEME[ScheduleOccurrenceStatus.Draft];
    }
  }
  return SCHEDULE_OCCURRENCE_EVENT_THEME[ScheduleOccurrenceStatus.Approved];
};

const toFcEvent = (e: OverviewEvent): EventInput => ({
  id: e.id,
  title: e.title,
  start: e.start,
  end: e.end,
  extendedProps: {
    location: e.location,
    meetingType: e.meetingType,
    priority: e.priority,
    status: e.status,
    displayStatus: e.displayStatus,
    participantStatus: e.participantStatus,
    calendarType: e.calendarType,
    color: e.color,
    scheduleTypeName: e.scheduleTypeName,
    raw: e.raw,
    rawEvent: e,
  },
});

const CustomEvent: React.FC<{ arg: EventContentArg }> = ({ arg }) => {
  const { t } = useTranslation();
  const { event, view } = arg;
  const data = event.extendedProps as Pick<OverviewEvent, 'location' | 'meetingType' | 'priority' | 'color' | 'status' | 'displayStatus' | 'calendarType'>;
  const statusTheme = resolveOverviewStatusTheme(data.displayStatus ?? data.status);
  const isOnline = data.meetingType === MeetingType.Online;
  const isUrgent = data.priority === SchedulePriority.Urgent;
  const typeMeta = CALENDAR_TYPE_META[data.calendarType];
  const TypeIcon = typeMeta?.icon;
  const typeLabel = typeMeta ? t(typeMeta.labelKey) : undefined;

  const startTime = event.start ? dayjs(event.start).format('HH:mm') : '';
  const endTime = event.end ? dayjs(event.end).format('HH:mm') : '';
  const timeLabel = startTime && endTime ? `${startTime} - ${endTime}` : startTime;

  if (view.type === 'dayGridMonth') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 min-w-0 px-1.5 py-0.5 rounded-md text-[11px] leading-tight cursor-pointer overflow-hidden transition-opacity hover:opacity-80',
          statusTheme.bg,
          statusTheme.text
        )}
      >
        <span className="flex items-center gap-[3px] shrink-0 -mr-0.5">
          {TypeIcon && <TypeIcon size={11} className={cn('shrink-0', typeMeta?.text)} strokeWidth={2} />}
          <Clock size={11} className="shrink-0" />
        </span>
        {timeLabel && <span className="shrink-0 font-medium">{timeLabel}:</span>}
        <span className="truncate font-normal text-slate-800 dark:text-slate-100">{event.title}</span>
        {isUrgent && (
          <AlertCircle size={11} className="shrink-0 text-rose-500 dark:text-rose-400 ml-auto" />
        )}
      </div>
    );
  }

  if (view.type.startsWith('list')) {
    return (
      <div className="flex items-center justify-between gap-3 min-w-0 py-0.5 w-full">
        <div className="flex items-center gap-2 min-w-0">
          {TypeIcon && (
            <span title={typeLabel} className={cn('flex items-center shrink-0', typeMeta?.text)}>
              <TypeIcon size={13} strokeWidth={2} />
            </span>
          )}
          <Clock size={12} className={cn('shrink-0', statusTheme.text)} aria-hidden="true" />
          {timeLabel && (
            <span className={cn('text-[12px] font-medium shrink-0', statusTheme.text)}>
              {timeLabel}
            </span>
          )}
          <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate">
            {event.title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[11px]">
          {isUrgent && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertCircle size={11} className="shrink-0 text-rose-500 dark:text-rose-400" />
              {t('priority.urgent')}
            </span>
          )}
          {data.location && (
            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
              {isOnline ? <Video size={11} className="shrink-0 text-slate-400" /> : <MapPin size={11} className="shrink-0 text-slate-400" />}
              <span className="max-w-[160px] truncate">{data.location}</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  const durationMin = event.start && event.end ? dayjs(event.end).diff(event.start, 'minute') : 0;

  if (durationMin < 45) {
    return (
      <div
        title={`${timeLabel} ${event.title}`}
        className={cn(
          'h-full w-full rounded-lg px-2 flex items-center gap-1.5 min-w-0 overflow-hidden text-[12px] leading-4 hover:brightness-[0.97] dark:hover:brightness-110 transition-[filter] duration-150 cursor-pointer select-none border',
          statusTheme.bg,
          statusTheme.border
        )}
      >
        {TypeIcon && (
          <span title={typeLabel} className={cn('flex items-center shrink-0', typeMeta?.text)}>
            <TypeIcon size={12} strokeWidth={2} />
          </span>
        )}
        <Clock size={12} className={cn('shrink-0 -ml-0.5', statusTheme.text)} />
        <span className={cn('shrink-0 font-medium tabular-nums', statusTheme.text)}>{timeLabel}:</span>
        <span className="truncate text-slate-800 dark:text-slate-100">{event.title}</span>
        {isUrgent && <AlertCircle size={12} className="shrink-0 ml-auto text-rose-500 dark:text-rose-400" />}
      </div>
    );
  }

  return (
    <div
      title={[`${timeLabel} ${event.title}`, data.location].filter(Boolean).join('\n')}
      className={cn(
        'h-full w-full rounded-lg px-2.5 py-1.5 flex flex-col overflow-hidden gap-0.5 hover:brightness-[0.97] dark:hover:brightness-110 transition-[filter] duration-150 cursor-pointer select-none border',
        statusTheme.bg,
        statusTheme.border
      )}
    >
      <div className="flex items-center justify-between gap-1 w-full min-w-0 shrink-0">
        <span className={cn('flex items-center gap-1 min-w-0 text-[10.5px] font-medium leading-none', statusTheme.text)}>
          {TypeIcon && (
            <span title={typeLabel} className={cn('flex items-center shrink-0', typeMeta?.text)}>
              <TypeIcon size={11} strokeWidth={2} />
            </span>
          )}
          <Clock size={10.5} className="shrink-0" />
          <span className="truncate">{timeLabel}</span>
        </span>
        {isUrgent && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
            <AlertCircle size={10} className="shrink-0 text-rose-500 dark:text-rose-400" />
            {t('priority.urgent')}
          </span>
        )}
      </div>
      <span
        className={cn(
          'shrink-0 text-[12px] font-medium text-slate-700 dark:text-slate-100 leading-snug',
          durationMin >= 90 ? 'line-clamp-2' : 'truncate'
        )}
      >
        {event.title}
      </span>
      {durationMin >= 60 && data.location && (
        <span className="shrink-0 text-[11px] truncate text-slate-500 dark:text-slate-400 leading-snug flex items-center gap-1 mt-0.5">
          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 truncate">
            {isOnline ? <Video size={10} className="shrink-0" /> : <MapPin size={10} className="shrink-0" />}
            <span className="truncate">{data.location}</span>
          </span>
        </span>
      )}
    </div>
  );
};

export const Overview: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarViewKey>('day');
  const [viewTab, setViewTab] = useState<CalendarViewKey>('day');
  const [, startViewTransition] = useTransition();
  const changeView = useCallback((next: CalendarViewKey) => {
    setViewTab(next);
    requestAnimationFrame(() => requestAnimationFrame(() => startViewTransition(() => setView(next))));
  }, []);
  const [date, setDate] = useState<Date>(new Date());


  const calendarRef = useRef<FullCalendar>(null);
  const calendarContainerRef = useRef<HTMLDivElement>(null);
  useFcPopoverClamp(calendarContainerRef);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => dayjs(date));
  const datePickerWrapperRef = useRef<HTMLDivElement>(null);

  const nowTimeHostRef = useRef<HTMLDivElement>(null);

  const [manualSidePanelCollapsed, setManualSidePanelCollapsed] = useState<boolean | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    let rafId: number | null = null;
    const handleResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setViewportWidth(window.innerWidth);
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isNarrowViewport = viewportWidth < 1200;
  const sidePanelCollapsed = manualSidePanelCollapsed ?? isNarrowViewport;
  const toggleSidePanel = () => setManualSidePanelCollapsed(!sidePanelCollapsed);

  const [manualListMode, setManualListMode] = useState<boolean | null>(null);
  const isCompactCalendar = viewportWidth <= COMPACT_CALENDAR_BREAKPOINT;

  useEffect(() => {
    const update = () => nowTimeHostRef.current?.style.setProperty('--now-time', `"${dayjs().format('HH:mm')}"`);
    update();
    const timer = setInterval(update, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!datePickerOpen) return;
    setPickerMonth(dayjs(date));
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerWrapperRef.current && !datePickerWrapperRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [datePickerOpen, date]);

  const [activeCalendarTypes, setActiveCalendarTypes] = useState<ScheduleCalendarType[]>(ALL_CALENDAR_TYPES);
  const [hoveredEvent, setHoveredEvent] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; openDown?: boolean; arrowX: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const [selectedEventRef, setSelectedEventRef] = useState<{ id: string; calendarType: ScheduleCalendarType } | null>(null);
  const [slotSelectModal, setSlotSelectModal] = useState<{ start: Date; end: Date } | null>(null);

  const handleEventClick = useCallback((clickInfo: { event: any }) => {
    const id = clickInfo.event.id as string;
    const calendarType = (clickInfo.event.extendedProps?.rawEvent?.calendarType ??
      clickInfo.event.extendedProps?.calendarType) as ScheduleCalendarType | undefined;
    if (id && calendarType) {
      setSelectedEventRef({ id, calendarType });
    }
  }, []);

  const handleDateSelect = useCallback((selectInfo: { start: Date; end: Date }) => {
    setSlotSelectModal({ start: selectInfo.start, end: selectInfo.end });
  }, []);

  const slotLabelContent = useCallback(
    (arg: SlotLabelContentArg) => t('dashboard.hour_suffix', { hour: dayjs(arg.date).format('HH') }),
    [t]
  );

  const dayHeaderContent = useCallback((arg: DayHeaderContentArg) => {
    const isMonthView = arg.view.type === 'dayGridMonth';
    const isDayView = arg.view.type === 'timeGridDay';

    if (isDayView) {
      return (
        <div className="w-full flex items-center justify-center py-0.5 select-none">
          <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 px-3.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-800/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <span className="capitalize font-normal text-[12.5px] text-slate-750 dark:text-slate-350">
              {dayjs(arg.date).format('dddd')}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="text-[12px] font-normal text-[#00529C] dark:text-blue-400">
              {dayjs(arg.date).format('DD/MM/YYYY')}
            </span>
          </div>
        </div>
      );
    }

    if (isMonthView) {
      return (
        <div className="w-full flex items-center justify-center py-0.5 select-none">
          <span className="capitalize font-normal text-[11.5px] text-slate-500 dark:text-slate-400">
            {dayjs(arg.date).format('dddd')}
          </span>
        </div>
      );
    }

    const isToday = arg.isToday;
    if (isToday) {
      return (
        <div className="w-full flex flex-col items-center justify-center gap-0.5 py-0.5 select-none">
          <span className="capitalize text-[11px] font-semibold text-[#00529C] dark:text-blue-400 tracking-wider">
            {dayjs(arg.date).format('dddd')}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-[#00529C] dark:bg-blue-500 text-white text-[11px] font-normal shadow-sm shadow-blue-500/15">
            {dayjs(arg.date).format('DD/MM')}
          </span>
        </div>
      );
    }

    return (
      <div className="w-full flex flex-col items-center justify-center gap-0.5 py-0.5 select-none">
        <span className="capitalize text-[11px] font-normal text-slate-500 dark:text-slate-400 tracking-wider">
          {dayjs(arg.date).format('dddd')}
        </span>
        <span className="text-[11.5px] font-normal text-slate-700 dark:text-slate-350">
          {dayjs(arg.date).format('DD/MM')}
        </span>
      </div>
    );
  }, []);

  const eventContent = useCallback((arg: EventContentArg) => <CustomEvent arg={arg} />, []);

  const eventMouseEnter = useCallback((info: EventHoveringArg) => {
    const rect = info.el.getBoundingClientRect();
    const openDown = rect.top < 220;
    const anchorX = rect.left + rect.width / 2;
    const x = Math.min(Math.max(anchorX, TOOLTIP_HALF_WIDTH + 8), window.innerWidth - TOOLTIP_HALF_WIDTH - 8);
    setHoveredEvent({
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      location: info.event.extendedProps.location,
      meetingType: info.event.extendedProps.meetingType,
      priority: info.event.extendedProps.priority,
      status: info.event.extendedProps.status,
      displayStatus: info.event.extendedProps.displayStatus,
      participantStatus: info.event.extendedProps.participantStatus,
      color: info.event.extendedProps.color || 'blue',
      calendarType: info.event.extendedProps.calendarType,
      scheduleTypeName: info.event.extendedProps.scheduleTypeName,
      raw: info.event.extendedProps.raw,
    });
    setTooltipPos({
      x,
      y: openDown ? rect.bottom + 10 : rect.top - 10,
      openDown,
      arrowX: anchorX - x,
    });
  }, []);

  const eventMouseLeave = useCallback(() => {
    setHoveredEvent(null);
    setTooltipPos(null);
  }, []);

  const handleToggleCalendarType = (type: ScheduleCalendarType) => {
    setActiveCalendarTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const { hasRawRole } = usePermission();
  const isExecutiveAdmin = hasRawRole(EXECUTIVE_ADMIN_ROLES);
  const defaultLeaderId = useOverviewLeaderId();
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<IExecutiveUser | null>(null);
  const leaderId = (isExecutiveAdmin && selectedLeaderId) || defaultLeaderId;

  const { data: selectedOccurrence, isLoading: isSelectedEventLoading } = useQuery({
    queryKey: ['overview-occurrence-detail', selectedEventRef?.id],
    queryFn: () => scheduleOccurrenceAPI.getScheduleOccurrenceById(selectedEventRef!.id),
    enabled: !!selectedEventRef,
  });
  const closeEventDetail = useCallback(() => setSelectedEventRef(null), []);
  const selectedPersonalEvent = useMemo(
    () => (selectedOccurrence && selectedEventRef?.calendarType === ScheduleCalendarType.Personal
      ? mapOccurrenceToPersonalEvent(selectedOccurrence)
      : null),
    [selectedOccurrence, selectedEventRef]
  );
  const selectedLeadershipRequest = useMemo(
    () => (selectedOccurrence &&
      (selectedEventRef?.calendarType === ScheduleCalendarType.LeaderRegistration ||
        selectedEventRef?.calendarType === ScheduleCalendarType.LeaderApproval)
      ? mapOccurrenceToRequest(selectedOccurrence)
      : null),
    [selectedOccurrence, selectedEventRef]
  );
  const selectedInvitation = useMemo(
    () => (selectedOccurrence && selectedEventRef?.calendarType === ScheduleCalendarType.Invitation
      ? mapOccurrenceToInvitation(selectedOccurrence, leaderId)
      : null),
    [selectedOccurrence, selectedEventRef, leaderId]
  );

  const viewYear = dayjs(date).year();
  const viewMonth = dayjs(date).month() + 1;
  const { data: viewCalendarItems = [] } = useCalendarOverviewQuery({
    year: viewYear,
    month: viewMonth,
    operatingLeaderId: leaderId,
    calendarTypes: ALL_CALENDAR_TYPES,
  });
  const viewEvents = useMemo(() => viewCalendarItems.map(mapCalendarItemToEvent), [viewCalendarItems]);

  const now = dayjs();
  const { data: currentMonthItems = [] } = useCalendarOverviewQuery({
    year: now.year(),
    month: now.month() + 1,
    operatingLeaderId: leaderId,
    calendarTypes: ALL_CALENDAR_TYPES,
  });
  const currentMonthEvents = useMemo(() => currentMonthItems.map(mapCalendarItemToEvent), [currentMonthItems]);

  const filteredViewEvents = useMemo(() => {
    let list = viewEvents.filter((e) => activeCalendarTypes.includes(e.calendarType));
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.location && e.location.toLowerCase().includes(q))
      );
    }
    return list;
  }, [viewEvents, activeCalendarTypes, debouncedSearchQuery]);

  const events = useMemo(
    () => filteredViewEvents.map(toFcEvent),
    [filteredViewEvents]
  );

  const listMode = manualListMode ?? isCompactCalendar;
  const toggleListMode = () => setManualListMode(!listMode);

  const unitOf = view;

  const goToday = () => setDate(new Date());
  const goPrev = () => setDate((d) => dayjs(d).subtract(1, unitOf).toDate());
  const goNext = () => setDate((d) => dayjs(d).add(1, unitOf).toDate());

  const pickerDays = useMemo(() => {
    const startOfMonth = pickerMonth.startOf('month');
    const startWeekday = (startOfMonth.day() + 6) % 7; 
    const gridStart = startOfMonth.subtract(startWeekday, 'day');
    return Array.from({ length: 42 }, (_, i) => gridStart.add(i, 'day'));
  }, [pickerMonth]);

  const handlePickDate = (d: dayjs.Dayjs) => {
    setDate(d.toDate());
    setDatePickerOpen(false);
  };

  useEffect(() => {
    calendarRef.current?.getApi().gotoDate(date);
  }, [date]);

  useEffect(() => {
    const targetView = listMode ? FC_LIST_VIEW_MAP[view] : FC_VIEW_MAP[view];
    calendarRef.current?.getApi().changeView(targetView);
  }, [view, listMode]);

  useEffect(() => {
    const container = document.getElementById('hero-calendar-container');
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => {
      calendarRef.current?.getApi().updateSize();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);



  const upcomingSchedule = useMemo(() => {
    return currentMonthEvents
      .filter(
        (e) =>
          e.start.getTime() >= Date.now() &&
          (e.status === ScheduleOccurrenceStatus.Created || e.status === ScheduleOccurrenceStatus.Approved)
      )
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((e) => {
        const isToday = dayjs(e.start).isSame(now, 'day');
        const isTomorrow = dayjs(e.start).isSame(now.add(1, 'day'), 'day');
        const dayOfWeek = dayjs(e.start).day() === 0 ? 'CN' : `T${dayjs(e.start).day() + 1}`;
        const dateTag = isToday
          ? t('dashboard.date_tag_today')
          : isTomorrow
            ? t('dashboard.date_tag_tomorrow')
            : `${dayOfWeek}, ${dayjs(e.start).format('DD/MM')}`;
        const locationText = e.location ? e.location.trim() : '';
        const locationLabel = locationText ? `${dateTag}, ${locationText}` : dateTag;
        return {
          id: e.id,
          title: e.title,
          timeRange: `${dayjs(e.start).format('HH:mm')} - ${dayjs(e.end).format('HH:mm')}`,
          dateTag,
          isToday,
          isTomorrow,
          location: locationText,
          locationLabel,
          meetingType: e.meetingType,
          color: e.color,
          calendarType: e.calendarType,
          status: e.status,
          scheduleTypeName: e.scheduleTypeName,
          start: e.start,
        };
      });
  }, [currentMonthEvents, now, t]);

  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [upcomingPreviewCount, setUpcomingPreviewCount] = useState(UPCOMING_PREVIEW_COUNT);
  const hasMoreUpcoming = upcomingSchedule.length > upcomingPreviewCount;
  const [upcomingRenderCount, setUpcomingRenderCount] = useState(UPCOMING_BATCH);
  useEffect(() => {
    setUpcomingRenderCount(UPCOMING_BATCH);
  }, [showAllUpcoming]);
  const visibleUpcoming = showAllUpcoming
    ? upcomingSchedule.slice(0, Math.max(upcomingRenderCount, upcomingPreviewCount))
    : upcomingSchedule.slice(0, upcomingPreviewCount);
  const upcomingHasMoreToRender = showAllUpcoming && upcomingRenderCount < upcomingSchedule.length;
  const upcomingTotal = upcomingSchedule.length;
  const [upcomingListBox, setUpcomingListBox] = useState<HTMLDivElement | null>(null);
  const upcomingScrollRef = useRef<HTMLDivElement>(null);
  const upcomingSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = upcomingListBox;
    if (!box || showAllUpcoming) return;
    const xl = window.matchMedia('(min-width: 1280px)');
    const measure = () => {
      const card = upcomingScrollRef.current?.firstElementChild as HTMLElement | null | undefined;
      if (!xl.matches || !card) {
        setUpcomingPreviewCount(UPCOMING_PREVIEW_COUNT);
        return;
      }
      const gap = 10; 
      const fit = (height: number) => Math.max(1, Math.floor((height - 4 + gap) / (card.offsetHeight + gap)));
      const all = fit(box.clientHeight);
      setUpcomingPreviewCount(all >= upcomingTotal ? all : fit(box.clientHeight - 40));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    xl.addEventListener('change', measure);
    return () => {
      observer.disconnect();
      xl.removeEventListener('change', measure);
    };
  }, [showAllUpcoming, upcomingListBox, upcomingTotal]);
  useEffect(() => {
    const root = upcomingScrollRef.current;
    const target = upcomingSentinelRef.current;
    if (!upcomingHasMoreToRender || !root || !target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setUpcomingRenderCount((n) => Math.min(n + UPCOMING_BATCH, upcomingSchedule.length));
        }
      },
      { root, rootMargin: '0px 0px 160px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [upcomingHasMoreToRender, upcomingRenderCount, upcomingSchedule.length]);

  const typeCounts = useMemo(() => {
    const counts: Record<ScheduleCalendarType, number> = {
      [ScheduleCalendarType.Personal]: 0,
      [ScheduleCalendarType.LeaderRegistration]: 0,
      [ScheduleCalendarType.LeaderApproval]: 0,
      [ScheduleCalendarType.Invitation]: 0,
    };
    for (const e of viewEvents) {
      if (e.calendarType in counts) {
        counts[e.calendarType as ScheduleCalendarType]++;
      }
    }
    return counts;
  }, [viewEvents]);

  const handleTabClick = useCallback((type: ScheduleCalendarType) => {
    setActiveCalendarTypes((prev) => {
      if (prev.length === 1 && prev[0] === type) {
        return ALL_CALENDAR_TYPES;
      }
      return [type];
    });
  }, []);

  const calendarTypeTabs = useMemo(
    () => [
      {
        type: ScheduleCalendarType.Personal,
        key: 'personal',
        label: t('work_schedule.personal_calendar'),
        value: typeCounts[ScheduleCalendarType.Personal],
        unit: t('dashboard.unit_schedules', { defaultValue: 'lịch' }),
        icon: <CircleUser size={19} className="text-white" />,
        iconBgClass: 'bg-gradient-to-br from-[#0284C7] to-[#0369A1] shadow-[0_4px_10px_-2px_rgba(2,132,199,0.45)]',
        titleColorClass: 'text-[#0284C7] dark:text-[#38BDF8] font-medium',
        numColorClass: 'text-[#0284C7] dark:text-[#38BDF8]',
        activeBorderClass: 'border-[#0284C7]/60 dark:border-sky-400/60 bg-sky-50/70 dark:bg-sky-950/25 shadow-[0_4px_14px_-3px_rgba(2,132,199,0.2)]',
        hoverClass: 'hover:border-sky-300 hover:bg-sky-50/30 dark:hover:border-sky-800 dark:hover:bg-sky-950/20',
        checkBgClass: 'bg-[#0284C7]',
      },
      {
        type: ScheduleCalendarType.LeaderRegistration,
        key: 'leadership_registration',
        label: t('work_schedule.leadership_registration'),
        value: typeCounts[ScheduleCalendarType.LeaderRegistration],
        unit: t('dashboard.unit_schedules', { defaultValue: 'lịch' }),
        icon: <CalendarPlus size={19} className="text-white" />,
        iconBgClass: 'bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_4px_10px_-2px_rgba(244,63,94,0.45)]',
        titleColorClass: 'text-rose-600 dark:text-rose-400 font-medium',
        numColorClass: 'text-rose-600 dark:text-rose-400',
        activeBorderClass: 'border-rose-400/60 dark:border-rose-500/60 bg-rose-50/70 dark:bg-rose-950/25 shadow-[0_4px_14px_-3px_rgba(244,63,94,0.2)]',
        hoverClass: 'hover:border-rose-300 hover:bg-rose-50/30 dark:hover:border-rose-800 dark:hover:bg-rose-950/20',
        checkBgClass: 'bg-rose-500',
      },
      {
        type: ScheduleCalendarType.LeaderApproval,
        key: 'schedule_approval',
        label: t('work_schedule.schedule_approval'),
        value: typeCounts[ScheduleCalendarType.LeaderApproval],
        unit: t('dashboard.unit_schedules', { defaultValue: 'lịch' }),
        icon: <FileCheck size={19} className="text-white" />,
        iconBgClass: 'bg-gradient-to-br from-[#10B981] to-[#059669] shadow-[0_4px_10px_-2px_rgba(16,185,129,0.45)]',
        titleColorClass: 'text-[#10B981] dark:text-[#34D399] font-medium',
        numColorClass: 'text-[#10B981] dark:text-[#34D399]',
        activeBorderClass: 'border-emerald-500/60 dark:border-emerald-600/60 bg-emerald-50/70 dark:bg-emerald-950/25 shadow-[0_4px_14px_-3px_rgba(16,185,129,0.2)]',
        hoverClass: 'hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20',
        checkBgClass: 'bg-[#10B981]',
      },
      {
        type: ScheduleCalendarType.Invitation,
        key: 'meeting_invitations',
        label: t('work_schedule.meeting_invitations'),
        value: typeCounts[ScheduleCalendarType.Invitation],
        unit: t('dashboard.unit_schedules', { defaultValue: 'lịch' }),
        icon: <Mail size={19} className="text-white" />,
        iconBgClass: 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_4px_10px_-2px_rgba(245,158,11,0.45)]',
        titleColorClass: 'text-amber-600 dark:text-amber-400 font-medium',
        numColorClass: 'text-amber-600 dark:text-amber-400',
        activeBorderClass: 'border-amber-400/60 dark:border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/25 shadow-[0_4px_14px_-3px_rgba(245,158,11,0.2)]',
        hoverClass: 'hover:border-amber-300 hover:bg-amber-50/30 dark:hover:border-amber-800 dark:hover:bg-amber-950/20',
        checkBgClass: 'bg-amber-500',
      },
    ],
    [t, typeCounts]
  );

  return (
    <Box
      ref={nowTimeHostRef}
      className="relative flex flex-col xl:h-full xl:min-h-0 select-none [&_input]:select-text [&_textarea]:select-text"
    >
      {/* Ambient background blur accent */}
      <div className="pointer-events-none absolute -top-32 right-0 -z-10 w-[500px] h-[500px] rounded-full bg-[#00529C]/[0.03] dark:bg-blue-500/[0.04] blur-[120px]" />

      {/* Workspace Grid Layout */}
      <Box className="relative flex-1 min-h-0">
      <Box
        className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 xl:h-full xl:min-h-0"
      >

        <Box className="@container flex flex-col gap-2 xl:h-full xl:min-h-0 pb-2">

          <div className="grid grid-cols-2 @min-[640px]:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
            {calendarTypeTabs.map((item, idx) => {
              const isFiltered = activeCalendarTypes.length < ALL_CALENDAR_TYPES.length;
              const isTabActive = activeCalendarTypes.includes(item.type);
              const isIsolated = isFiltered && isTabActive && activeCalendarTypes.length === 1;

              return (
                <Tooltip
                  key={item.key}
                  title={
                    isIsolated
                      ? t('dashboard.click_to_show_all', { defaultValue: 'Nhấp để hiển thị tất cả lịch' })
                      : t('dashboard.click_to_filter', { defaultValue: `Lọc hiển thị ${item.label}` })
                  }
                  placement="top"
                >
                  <motion.button
                    type="button"
                    onClick={() => handleTabClick(item.type)}
                    aria-pressed={isTabActive}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, type: 'spring', stiffness: 400, damping: 30 }}
                    whileHover={{ y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'group relative flex items-center justify-between gap-2.5 xl:gap-3 py-2 px-2.5 xl:py-2.5 xl:px-3 rounded-2xl border cursor-pointer select-none transition-all duration-150 text-left overflow-hidden',
                      isFiltered
                        ? isTabActive
                          ? cn(item.activeBorderClass, 'shadow-xs')
                          : 'opacity-55 hover:opacity-90 bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800'
                        : cn(
                            'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08)]',
                            item.hoverClass
                          )
                    )}
                  >
                    <div className="flex items-center gap-2.5 xl:gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          'w-9 h-9 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:scale-105',
                          item.iconBgClass
                        )}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className={cn('text-[11.5px] xl:text-[12px] truncate leading-tight', item.titleColorClass)}>
                          {item.label}
                        </div>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className={cn('text-[15px] xl:text-[16px] font-semibold leading-none tracking-tight tabular-nums', item.numColorClass)}>
                            {item.value}
                          </span>
                          <span className="text-[11px] xl:text-[11.5px] font-normal text-slate-500 dark:text-slate-400 truncate">
                            {item.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isIsolated && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                          className={cn(
                            'absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center shadow-xs pointer-events-none',
                            item.checkBgClass
                          )}
                          title={t('common.selected', { defaultValue: 'Đang chọn' })}
                        >
                          <Check size={9} strokeWidth={2.5} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </Tooltip>
              );
            })}
          </div>

          {/* 3. HERO CALENDAR: Notion style borderless grid */}
          <Paper
            id="hero-calendar-container"
            ref={calendarContainerRef}
            role="region"
            aria-label={t('nav_work_schedule')}
            className={`${SURFACE} fc-wrapper flex flex-col xl:flex-1 xl:min-h-0 min-h-[550px] overflow-hidden relative`}
          >
            {/* Custom Toolbar */}
            <div className="shrink-0 flex items-center justify-between gap-3 flex-wrap px-4 py-2 border-b border-slate-100 dark:border-slate-800/70">
              <div className="flex items-center gap-3">
                {/* Leader filter — only executive admins can act on behalf of another leader, same
                    as ScheduleApproval / MeetingInvitations. Defaults back to the signed-in user
                    (or the currently acting leader) when nothing's picked. */}
                {isExecutiveAdmin && (
                  <div className="w-[190px] shrink-0">
                    <PagedPickerSelect<IExecutiveUser>
                      value={selectedLeaderId ?? undefined}
                      onChange={(id, record) => {
                        setSelectedLeaderId(id ? id : null);
                        setSelectedLeader(record ?? null);
                      }}
                      className="!min-h-[32px] !rounded-full !border-slate-200 dark:!border-slate-800 !py-1 !px-3.5"
                      initialRecord={selectedLeader ?? undefined}
                      fetchPage={fetchExecutives}
                      getValue={(u) => u.id}
                      getLabel={(u) => u.fullname}
                      renderOption={(u) => (
                        <div className="flex items-center gap-2.5 min-w-0 py-1">
                          <PersonAvatar name={u.fullname} avatarUrl={u.avatarUrl} className="h-8 w-8" textClassName="text-[11px]" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-13 font-medium text-slate-800 dark:text-slate-100 truncate">{u.fullname}</span>
                            {(u.positionName || u.departmentName) && (
                              <span className="text-11 font-normal text-slate-400 dark:text-slate-500 truncate">{u.positionName || u.departmentName}</span>
                            )}
                          </div>
                        </div>
                      )}
                      renderSelected={(u) => (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">
                          <Users size={13} className="shrink-0 text-slate-400" />
                          {u.fullname}
                        </span>
                      )}
                      placeholder={t('work_schedule.select_leader_placeholder')}
                    />
                  </div>
                )}

                {/* Left group: Pill with Hôm nay and navigation chevrons */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-full px-4 py-1.5 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={goToday}
                    className="text-[12px] font-medium text-slate-800 dark:text-slate-100 hover:text-[#00529C] dark:hover:text-blue-400 border-0 bg-transparent cursor-pointer select-none"
                  >
                    {t('dashboard.today_btn')}
                  </button>
                  <span className="text-slate-300 dark:text-slate-700 px-1 text-[11px] font-normal select-none">|</span>
                  <div className="flex items-center gap-1">
                    <IconButton
                      size="small"
                      onClick={goPrev}
                      className="!w-5 !h-5 !rounded-full !text-slate-600 dark:!text-slate-300 hover:!bg-slate-200 dark:hover:!bg-slate-800"
                    >
                      <ChevronLeft size={13} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={goNext}
                      className="!w-5 !h-5 !rounded-full !text-slate-600 dark:!text-slate-300 hover:!bg-slate-200 dark:hover:!bg-slate-800"
                    >
                      <ChevronRight size={13} />
                    </IconButton>
                  </div>
                </div>

                {/* Middle group: click to open a mini calendar and pick a date */}
                <div ref={datePickerWrapperRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen((v) => !v)}
                    className={`flex items-center gap-2 rounded-full px-4 py-1.5 border cursor-pointer transition-colors ${
                      datePickerOpen
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-[#00529C]/30 dark:border-blue-400/30'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Calendar size={13.5} className="text-[#00529C] dark:text-blue-400" />
                    <span className="text-[12px] font-medium text-slate-800 dark:text-slate-100 tracking-wide select-none">
                      {dayjs(date).format('DD/MM/YYYY')}
                    </span>
                  </button>

                  {datePickerOpen && (
                    <div className="absolute top-[calc(100%+8px)] left-0 z-40 w-[280px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <IconButton
                          size="small"
                          onClick={() => setPickerMonth((m) => m.subtract(1, 'month'))}
                          className="!w-7 !h-7 !rounded-full !text-slate-500 dark:!text-slate-400 hover:!bg-slate-100 dark:hover:!bg-slate-800"
                        >
                          <ChevronLeft size={15} />
                        </IconButton>
                        <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 capitalize select-none">
                          {t('dashboard.picker_month_year', { month: pickerMonth.month() + 1, year: pickerMonth.year() })}
                        </span>
                        <IconButton
                          size="small"
                          onClick={() => setPickerMonth((m) => m.add(1, 'month'))}
                          className="!w-7 !h-7 !rounded-full !text-slate-500 dark:!text-slate-400 hover:!bg-slate-100 dark:hover:!bg-slate-800"
                        >
                          <ChevronRight size={15} />
                        </IconButton>
                      </div>

                      <div className="grid grid-cols-7 gap-y-1 px-1 mb-1">
                        {[1, 2, 3, 4, 5, 6, 0].map((weekday) => (
                          <span key={weekday} className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 text-center">
                            {dayjs().day(weekday).format('dd')}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-y-1 px-1">
                        {pickerDays.map((d) => {
                          const isCurrentMonth = d.isSame(pickerMonth, 'month');
                          const isToday = d.isSame(dayjs(), 'day');
                          const isSelected = d.isSame(dayjs(date), 'day');
                          return (
                            <button
                              key={d.format('YYYY-MM-DD')}
                              type="button"
                              onClick={() => handlePickDate(d)}
                              className={`w-9 h-9 mx-auto flex items-center justify-center text-[12px] rounded-full border-0 cursor-pointer transition-colors select-none ${
                                isSelected
                                  ? 'bg-[#00529C] dark:bg-blue-500 text-white font-semibold'
                                  : isToday
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-[#00529C] dark:text-blue-400 font-semibold'
                                    : isCurrentMonth
                                      ? 'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                      : 'bg-transparent text-slate-300 dark:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              {d.date()}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePickDate(dayjs())}
                        className="w-full mt-2 py-1.5 rounded-lg text-[12px] font-semibold text-[#00529C] dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-0 bg-transparent cursor-pointer transition-colors"
                      >
                        {t('dashboard.today_btn')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search box for instant event filtering */}
                <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/40 rounded-full border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 focus-within:border-[#00529C] dark:focus-within:border-blue-400 transition-all">
                  <Search size={14} className="text-slate-400 shrink-0 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('work_schedule.search_placeholder', { defaultValue: 'Tìm lịch làm việc...' })}
                    className="bg-transparent border-none text-[12px] text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none w-44 sm:w-56 focus:w-64 transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1.5 border-0 bg-transparent cursor-pointer flex items-center justify-center"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="relative grid grid-cols-3 p-0.5 bg-slate-50 dark:bg-slate-800/40 rounded-full border border-slate-200 dark:border-slate-700 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                  {/* Sliding pill: a CSS transform transition runs on the compositor, so it stays smooth
                      even while the calendar re-renders on the main thread */}
                  <span
                    aria-hidden
                    className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-full bg-white dark:bg-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-transform duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
                    style={{ transform: `translateX(${VIEW_KEYS.indexOf(viewTab) * 100}%)` }}
                  />
                  {VIEW_KEYS.map((viewKey) => {
                    const isActive = viewTab === viewKey;
                    const labels = { day: t('dashboard.view_day'), week: t('dashboard.view_week'), month: t('dashboard.view_month') };
                    return (
                      <button
                        key={viewKey}
                        type="button"
                        onClick={() => changeView(viewKey)}
                        aria-pressed={isActive}
                        className={cn(
                          'relative z-10 min-w-[64px] h-7.5 px-3.5 text-12.5 font-medium rounded-full border-0 bg-transparent cursor-pointer transition-colors duration-200 select-none',
                          isActive
                            ? 'text-[#00529C] dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
                        )}
                      >
                        {labels[viewKey]}
                      </button>
                    );
                  })}
                </div>

                <Tooltip
                  title={manualListMode === null && isCompactCalendar ? t('dashboard.list_mode_tooltip') : t('dashboard.list_mode_tooltip_manual')}
                  placement="top"
                >
                <button
                  type="button"
                  onClick={toggleListMode}
                  aria-pressed={listMode}
                  aria-label={t('dashboard.list_mode_tooltip_manual')}
                  className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-full border cursor-pointer transition-all select-none',
                    listMode
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-[#00529C]/30 dark:border-blue-400/30 text-[#00529C] dark:text-blue-400 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                      : 'border-slate-200/50 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                >
                  <List size={13.5} />
                </button>
                </Tooltip>

                <span className="w-px h-4 bg-slate-200/70 dark:bg-slate-700/70 mx-0.5" />

                <div className="flex items-center gap-1.5">
                  {CALENDAR_TYPE_TOGGLES.map((cfg) => {
                    const isActive = activeCalendarTypes.includes(cfg.type);
                    return (
                      <Tooltip key={cfg.type} title={t(cfg.labelKey)} placement="top">
                        <motion.button
                          type="button"
                          onClick={() => handleToggleCalendarType(cfg.type)}
                          aria-pressed={isActive}
                          whileHover={{ scale: 1.08, y: -1 }}
                          whileTap={{ scale: 0.92 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.5 }}
                          className={cn(
                            'w-7.5 h-7.5 rounded-full flex items-center justify-center shrink-0 cursor-pointer select-none transition-colors duration-150',
                            isActive ? cfg.activeClass : cfg.inactiveClass
                          )}
                        >
                          <cfg.icon size={13.5} strokeWidth={isActive ? 2 : 1.75} />
                        </motion.button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Calendar Canvas */}
            <div className="flex-1 min-h-0 px-4 pb-4 pt-3 flex flex-col">
              <div className="flex-1 min-h-0 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <FullCalendar
                  ref={calendarRef}
                  plugins={FC_PLUGINS}
                  initialView={listMode ? FC_LIST_VIEW_MAP[view] : FC_VIEW_MAP[view]}
                  initialDate={date}
                  headerToolbar={false}
                  events={events}
                  editable={false}
                  selectable={true}
                  select={handleDateSelect}
                  eventClick={handleEventClick}
                  locale={i18n.language === 'vi' ? viLocale : undefined}
                  noEventsText={t('dashboard.calendar_no_events')}
                  eventTimeFormat={FC_EVENT_TIME_FORMAT}
                  listDaySideFormat={FC_LIST_DAY_SIDE_FORMAT}
                  allDaySlot={false}
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
                  eventMouseEnter={eventMouseEnter}
                  eventMouseLeave={eventMouseLeave}
                />
              </div>
            </div>

            {/* Hover Tooltip/Popover */}
            {hoveredEvent && tooltipPos && (() => {
              const meetingType = hoveredEvent.meetingType as MeetingType | undefined;
              const priority = hoveredEvent.priority as SchedulePriority | undefined;
              const formatLabel = meetingType
                ? t(MEETING_TYPE_I18N_KEY[meetingType], { defaultValue: MEETING_TYPE_CONFIG[meetingType]?.label })
                : undefined;
              const priorityLabel = priority
                ? t(PRIORITY_I18N_KEY[priority], { defaultValue: SCHEDULE_PRIORITY_CONFIG[priority]?.label })
                : undefined;
              const isUrgent = priority === SchedulePriority.Urgent;

              const hostName =
                hoveredEvent.raw?.leaderUser?.fullname ||
                hoveredEvent.raw?.ownerUser?.fullname ||
                (hoveredEvent.raw as any)?.executiveName;

              return createPortal(
                <div
                  className="fixed z-[9999] pointer-events-none"
                  style={{
                    left: `${tooltipPos.x}px`,
                    top: `${tooltipPos.y}px`,
                    transform: `translate(-50%, ${tooltipPos.openDown ? '0' : '-100%'})`,
                  }}
                >
                <motion.div
                  initial={false}
                  className="relative w-[320px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-4 text-left shadow-[0_12px_32px_-4px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.06)]"
                  style={{ transformOrigin: tooltipPos.openDown ? 'top center' : 'bottom center' }}
                >
                  <div
                    className={cn(
                      'absolute left-1/2 w-3 h-3 bg-white dark:bg-slate-900 rotate-45 pointer-events-none',
                      tooltipPos.openDown
                        ? '-top-1.5 border-t border-l border-slate-200/90 dark:border-slate-800'
                        : '-bottom-1.5 border-b border-r border-slate-200/90 dark:border-slate-800'
                    )}
                    style={{ marginLeft: `${tooltipPos.arrowX - 6}px` }}
                  />

                  <div className="flex items-start justify-between gap-2.5">
                    <div className="text-[13.5px] font-semibold text-[#00529C] dark:text-blue-400 leading-snug line-clamp-2">
                      {hoveredEvent.title}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {isUrgent && priorityLabel && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                          {priorityLabel}
                        </span>
                      )}
                      {(() => {
                        const badge = getEventTooltipStatusBadge(hoveredEvent);
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
                    {(hoveredEvent.start || hoveredEvent.end) && (
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                          {t('dashboard.time_label', { defaultValue: 'Thời gian:' })}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-normal">
                          {hoveredEvent.start ? dayjs(hoveredEvent.start).format('HH:mm') : ''} - {hoveredEvent.end ? dayjs(hoveredEvent.end).format('HH:mm') : ''}
                        </span>
                      </div>
                    )}

                    {hoveredEvent.location && (
                      <div className="flex items-baseline gap-1.5 truncate">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                          {t('dashboard.location_label', { defaultValue: 'Địa điểm:' })}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 truncate font-normal">{hoveredEvent.location}</span>
                      </div>
                    )}

                    {hostName && (
                      <div className="flex items-baseline gap-1.5 truncate">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                          {t('dashboard.host_label', { defaultValue: 'Chủ trì:' })}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 truncate font-normal">{hostName}</span>
                      </div>
                    )}

                    {formatLabel && (
                      <div className="flex items-baseline gap-1.5 truncate">
                        <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                          {t('dashboard.meeting_type_label', { defaultValue: 'Hình thức:' })}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 truncate font-normal">{formatLabel}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
                </div>,
                document.body
              );
            })()}
          </Paper>
        </Box>

        <motion.div
          animate={{ width: sidePanelCollapsed ? 56 : 320 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="shrink-0 xl:h-full xl:min-h-0 overflow-hidden"
        >
        <AnimatePresence mode="wait" initial={false}>
        {sidePanelCollapsed ? (
          <motion.div
            key="rail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`${SURFACE} !flex flex-col items-center gap-1 w-14 xl:h-[calc(100%-12px)] mt-1 py-3`}
          >
            <Tooltip title={t('dashboard.panel_expand')} placement="right">
              <IconButton
                size="small"
                onClick={toggleSidePanel}
                className="!text-slate-400 dark:!text-slate-500 hover:!text-[#00529C] dark:hover:!text-blue-400"
              >
                <ChevronLeft size={16} />
              </IconButton>
            </Tooltip>
            <span className="w-6 h-px bg-slate-100 dark:bg-slate-800 my-1" />
            <Tooltip title={t('dashboard.upcoming_title')} placement="right">
              <button
                type="button"
                onClick={toggleSidePanel}
                aria-label={t('dashboard.upcoming_title')}
                className="group mt-1 p-0 border-0 bg-transparent cursor-pointer"
              >
                <span className="relative w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br from-blue-500 to-[#00529C] shadow-[0_4px_10px_-2px_rgba(0,82,156,0.45)] transition-transform group-hover:scale-105">
                  <CalendarDays size={17} />
                  {upcomingSchedule.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 text-[10px] font-semibold leading-none tabular-nums text-white">
                      {upcomingSchedule.length > 99 ? '99+' : upcomingSchedule.length}
                    </span>
                  )}
                </span>
              </button>
            </Tooltip>
          </motion.div>
        ) : (
        <motion.div
          key="expanded"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-3.5 xl:h-full xl:min-h-0 xl:overflow-y-auto pt-1 pb-2 pr-1 custom-scrollbar w-[320px]"
        >

          <Paper className={`${SURFACE} !p-4 xl:flex-1 xl:!flex xl:flex-col xl:min-h-0 transition-all duration-300 hover:shadow-[0_4px_20px_-4px_rgba(0,82,156,0.06)]`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white bg-gradient-to-br from-blue-500 to-[#00529C] shadow-[0_4px_10px_-2px_rgba(0,82,156,0.45)]">
                  <CalendarDays size={17} />
                  {upcomingSchedule.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 text-[10px] font-semibold leading-none tabular-nums text-white">
                      {upcomingSchedule.length > 99 ? '99+' : upcomingSchedule.length}
                    </span>
                  )}
                </div>
                <span className="text-13.5 font-medium text-slate-800 dark:text-slate-100">
                  {t('dashboard.upcoming_title')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Tooltip title={t('dashboard.panel_collapse')} placement="top">
                  <IconButton
                    size="small"
                    onClick={toggleSidePanel}
                    className="!w-6 !h-6 !text-slate-400 dark:!text-slate-500 hover:!text-[#00529C] dark:hover:!text-blue-400 hover:!bg-slate-100 dark:hover:!bg-slate-800"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 rotate-180 transition-transform duration-300" />
                  </IconButton>
                </Tooltip>
              </div>
            </div>

            {/* Content list */}
            <div ref={setUpcomingListBox} className="xl:flex-1 xl:min-h-0 xl:flex xl:flex-col">
              {upcomingSchedule.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-2.5 shadow-xs">
                    <Calendar size={22} className="stroke-[1.6]" />
                  </div>
                  <p className="text-[12.5px] font-medium text-slate-600 dark:text-slate-300 mb-0.5">
                    {t('dashboard.no_upcoming')}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[200px]">
                    {t('dashboard.no_upcoming_desc')}
                  </p>
                </div>
              ) : (
                <div
                  ref={upcomingScrollRef}
                  className="flex flex-col gap-2.5 max-h-[calc(100vh-280px)] xl:max-h-none xl:flex-1 xl:min-h-0 overflow-y-auto custom-scrollbar pr-0.5 pb-1"
                >
                  {visibleUpcoming.map((item) => {
                    const typeCfg =
                      UPCOMING_TYPE_CONFIG[item.calendarType] ||
                      UPCOMING_TYPE_CONFIG[ScheduleCalendarType.Personal];
                    const TypeIcon = typeCfg.icon;

                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedEventRef({ id: item.id, calendarType: item.calendarType })}
                        className="group relative shrink-0 flex flex-col gap-1.5 w-full rounded-2xl p-3 border text-left cursor-pointer overflow-hidden transition-all duration-200 bg-gradient-to-br from-blue-50/70 via-white to-white dark:from-blue-950/25 dark:via-slate-900 dark:to-slate-900 border-blue-200/90 dark:border-blue-900/60 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 -ml-0.5 rounded-md text-11 font-normal tabular-nums shrink-0 bg-blue-50 dark:bg-blue-950/50 text-[#00529C] dark:text-blue-300">
                            <Clock size={11} className="shrink-0" />
                            {item.dateTag} • {item.timeRange}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-1.5 py-px rounded-md text-[10.5px] font-medium shrink-0 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80',
                              CALENDAR_TYPE_META[item.calendarType]?.text ?? 'text-[#0284C7] dark:text-[#38BDF8]'
                            )}
                          >
                            <TypeIcon size={11} strokeWidth={2.2} />
                            <span className="truncate max-w-[75px]">{t(typeCfg.labelKey)}</span>
                          </span>
                        </div>

                        <h4 className="text-13.5 font-semibold text-[#00529C] dark:text-blue-400 line-clamp-2 leading-snug my-0.5">
                          {item.title}
                        </h4>

                        {(item.location || item.meetingType === MeetingType.Online || item.scheduleTypeName) && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            {!item.location && item.meetingType !== MeetingType.Online ? null : item.meetingType === MeetingType.Online && !item.location ? (
                              <span className="inline-flex items-center gap-1 px-2 py-px rounded-full text-[10.5px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-emerald-600 dark:text-emerald-400 font-normal shrink-0">
                                <Video size={11} className="shrink-0" />
                                {t('dashboard.online_meeting')}
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-px rounded-full text-[10.5px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-normal max-w-full min-w-0"
                                title={item.location}
                              >
                                {item.meetingType === MeetingType.Online ? (
                                  <Video size={11} className="shrink-0 text-emerald-500 dark:text-emerald-400" />
                                ) : (
                                  <MapPin size={11} className="shrink-0 text-amber-500 dark:text-amber-400" />
                                )}
                                <span className="truncate">{item.location}</span>
                              </span>
                            )}
                            {item.scheduleTypeName && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-px rounded-full text-[10.5px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-[#00529C] dark:text-blue-400 font-normal max-w-[140px] min-w-0 shrink-0"
                                title={item.scheduleTypeName}
                              >
                                <Tag size={10.5} className="shrink-0" />
                                <span className="truncate">{item.scheduleTypeName}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                  {upcomingHasMoreToRender && (
                    <div
                      ref={upcomingSentinelRef}
                      className="shrink-0 flex items-center justify-center gap-2 py-2 text-11.5 text-slate-400 dark:text-slate-500"
                    >
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-transparent animate-spin" />
                      {t('dashboard_home.inbox_loading_more')}
                    </div>
                  )}
                </div>
              )}
              {hasMoreUpcoming && (
                <motion.button
                  type="button"
                  onClick={() => setShowAllUpcoming((v) => !v)}
                  aria-expanded={showAllUpcoming}
                  whileTap={{ scale: 0.95 }}
                  className="shrink-0 self-center mt-2 flex items-center gap-1.5 h-8 pl-3.5 pr-3 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-12.5 font-medium text-[#00529C] dark:text-blue-300 shadow-[0_10px_28px_-10px_rgba(0,82,156,0.45)] hover:border-[#00529C]/40 dark:hover:border-blue-400/50 cursor-pointer transition-colors"
                >
                  {t(showAllUpcoming ? 'dashboard.show_less' : 'dashboard_home.scroll_more')}
                  <span className={cn('flex', !showAllUpcoming && 'dash-nudge')}>
                    <ChevronsDown size={15} strokeWidth={2.4} className={cn('transition-transform duration-200', showAllUpcoming && 'rotate-180')} />
                  </span>
                </motion.button>
              )}
            </div>
          </Paper>

        </motion.div>
        )}
        </AnimatePresence>
        </motion.div>

      </Box>

      </Box>

      {selectedEventRef?.calendarType === ScheduleCalendarType.Personal && (
        <PersonalScheduleDetailModal
          open={!!selectedEventRef}
          event={isSelectedEventLoading ? null : selectedPersonalEvent}
          onClose={closeEventDetail}
        />
      )}
      {(selectedEventRef?.calendarType === ScheduleCalendarType.LeaderRegistration ||
        selectedEventRef?.calendarType === ScheduleCalendarType.LeaderApproval) && (
        <LeadershipScheduleDetailModal
          open={!!selectedEventRef}
          request={isSelectedEventLoading ? null : selectedLeadershipRequest}
          executiveById={new Map()}
          onClose={closeEventDetail}
        />
      )}
      {selectedEventRef?.calendarType === ScheduleCalendarType.Invitation && (
        <InvitationDetailModal
          invitation={isSelectedEventLoading ? null : selectedInvitation}
          onClose={closeEventDetail}
        />
      )}

      {slotSelectModal && (
        <FormModal open={!!slotSelectModal} onCancel={() => setSlotSelectModal(null)} width={500} centered>
          <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2E8BE6] to-[#1F78D6] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#1F78D6]/30">
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[15.5px] font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    {t('work_schedule.quick_create_title', { defaultValue: 'Tạo lịch làm việc' })}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11.5px] font-medium text-slate-600 dark:text-slate-300 capitalize">
                      <Calendar size={12} className="shrink-0" />
                      {dayjs(slotSelectModal.start).format('dddd, DD/MM/YYYY')}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-[11.5px] font-semibold text-[#1F78D6] dark:text-blue-300 tabular-nums">
                      <Clock size={12} className="shrink-0" />
                      {dayjs(slotSelectModal.start).format('HH:mm')} - {dayjs(slotSelectModal.end).format('HH:mm')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSlotSelectModal(null)}
                className="flex h-7.5 w-7.5 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-slate-100/80 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 pt-0.5">
              <motion.button
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={() => {
                  const { start, end } = slotSelectModal;
                  setSlotSelectModal(null);
                  navigate('/lich-lam-viec/ca-nhan', {
                    state: {
                      autoOpenCreate: true,
                      slot: { date: start.toISOString(), startTime: start.toISOString(), endTime: end.toISOString() },
                    },
                  });
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:border-blue-200 dark:hover:border-blue-900 text-left transition-colors duration-150 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1273CC] to-[#00529C] text-white flex items-center justify-center shrink-0 shadow-sm shadow-[#00529C]/30">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[14px] text-slate-800 dark:text-slate-100 truncate">
                      {t('work_schedule.quick_create_personal_title', { defaultValue: 'Thêm mới lịch Cá nhân' })}
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {t('work_schedule.quick_create_personal_desc', { defaultValue: 'Lịch công tác hoặc cá nhân cá biệt' })}
                    </div>
                  </div>
                </div>
                <ChevronRight size={17} className="text-slate-300 dark:text-slate-600 group-hover:text-[#1F78D6] dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </motion.button>

              <motion.button
                whileHover={{ y: -1.5 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={() => {
                  const { start } = slotSelectModal;
                  setSlotSelectModal(null);
                  navigate('/lich-lam-viec/dang-ky-lich-lanh-dao', {
                    state: {
                      autoOpenCreate: true,
                      slot: { date: dayjs(start).format('YYYY-MM-DD'), startTime: dayjs(start).format('HH:mm') },
                    },
                  });
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 hover:border-amber-200 dark:hover:border-amber-900 text-left transition-colors duration-150 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/30">
                    <CalendarPlus size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[14px] text-slate-800 dark:text-slate-100 truncate">
                      {t('work_schedule.quick_create_leadership_title', { defaultValue: 'Đăng ký Lịch Lãnh đạo' })}
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {t('work_schedule.quick_create_leadership_desc', { defaultValue: 'Đăng ký cuộc họp trình lãnh đạo phê duyệt' })}
                    </div>
                  </div>
                </div>
                <ChevronRight size={17} className="text-slate-300 dark:text-slate-600 group-hover:text-orange-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </motion.button>
            </div>
          </div>
        </FormModal>
      )}

    </Box>
  );
};

export default Overview;
