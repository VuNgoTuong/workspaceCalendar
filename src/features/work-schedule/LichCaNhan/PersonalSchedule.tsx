import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCalendarRangeSync } from '../components/useCalendarRangeSync';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import type { EventContentArg } from '@fullcalendar/core';
import { DatePicker, Empty, Input, Modal, Select as AntdSelect, Tooltip } from 'antd';
import { Box, Button, Paper } from '@mui/material';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Check,
  Coffee,
  CalendarClock,
  CalendarDays,
  CircleUser,
  Search,
  Building2,
  Video,
  Users,
  FileEdit,
  CalendarX,
  CalendarOff,
  CalendarX2,
  CalendarCheck2,
  ListChecks,
  AlertCircle,
  CalendarPlus,
  CalendarRange,
  ArrowRight,
  X,
  Plus,
  Tag,
} from 'lucide-react';
import { toast } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { useActingLeaderStore } from '../../../store/actingLeaderStore';
import { usePermission } from '../../../hooks/usePermission';
import { useDebounce, useMinuteTick } from '../../../hooks';
import { cn } from '../../../utils/helpers';
import { withPriorityColor } from '../../../components/ui/PriorityOption';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { CancelScheduleModal } from '../../../components/shared/CancelScheduleModal';
import { PagedPickerSelect } from '../../../components/ui/PagedPickerSelect';
import { userAPI } from '../../../services/api/userAPI';
import type { Employee } from '../../system/types';
import { ParticipantDialog, type ParticipantResponseStatus, type ParticipantEntry } from '../components/ParticipantDialog';
import { EventMetaLine } from '../components/EventMetaLine';
import { MeetingType } from '../../../constants/meetingType';
import { SchedulePriority as ApiSchedulePriority } from '../../../constants/schedulePriority';
import { ParticipationStatus } from '../../../constants/participationStatus';
import { ScheduleOccurrenceStatus, SCHEDULE_OCCURRENCE_EVENT_THEME } from '../../../constants/scheduleOccurrenceStatus';
import { PersonalScheduleModal } from './components/PersonalScheduleModal';
import { PersonalScheduleDetailModal } from './components/PersonalScheduleDetailModal';
import { PersonalScheduleTable } from './components/PersonalScheduleTable';
import { ScheduleCalendarView } from '../../../components/ui/ScheduleCalendarView';
import {
  usePersonalScheduleTableQuery,
  usePersonalScheduleCalendarGridQuery,
  usePersonalScheduleStatsQuery,
  usePersonalScheduleDetailQuery,
  useCreatePersonalScheduleMutation,
  useUpdatePersonalScheduleMutation,
  useDeletePersonalScheduleMutation,
  useDeletePersonalScheduleGroupMutation,
  useCancelPersonalScheduleMutation,
  useApprovePersonalScheduleMutation,
  useRejectPersonalScheduleMutation,
} from './hooks/usePersonalCalendarQueries';
import { mapCalendarItemToEvent } from './utils/occurrenceAdapter';
import { listFreeSlots, isEventActiveOnDay, type FreeSlot } from './utils/conflict';
import type {
  MeetingFormat,
  PersonalScheduleEvent,
  PersonalScheduleInput,
  ScheduleParticipant,
  SchedulePriority,
  ScheduleStatus,
} from './types';
import { ParticipantsTooltip } from '../components/ParticipantsTooltip';
import { FilterResetButton } from '../components/FilterResetButton';
import { PersonAvatar } from '../components/PersonAvatar';
import { isAutoMonthRange } from '../components/useCalendarRangeSync';

const { RangePicker } = DatePicker;

const SURFACE =
  '!rounded-2xl !border !border-slate-100 dark:!border-slate-800/80 !shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:!shadow-none !bg-white dark:!bg-slate-900';

const inRange = (day: string, start: string, end: string) => day >= start && day <= end;

const RESPONSE_STATUS_BY_VALUE: Record<ParticipationStatus, ParticipantResponseStatus> = {
  [ParticipationStatus.Waiting]: 'pending',
  [ParticipationStatus.Accepted]: 'confirmed',
  [ParticipationStatus.Reject]: 'rejected',
};

const groupParticipantsByStatus = (participants: ScheduleParticipant[]) => {
  const result: Record<ParticipantResponseStatus, ParticipantEntry[]> = { confirmed: [], pending: [], rejected: [] };
  participants.forEach((p) => {
    const key = (p.status !== undefined ? RESPONSE_STATUS_BY_VALUE[p.status] : undefined) || 'pending';
    result[key].push(p);
  });
  return result;
};

const EMPTY_EVENTS: PersonalScheduleEvent[] = [];

type StatusTabKey = 'all' | ScheduleStatus;

interface StatusTabConfig {
  key: StatusTabKey;
  labelKey: string;
  icon: React.ReactNode;
  iconBgClass: string;
  titleColorClass: string;
  numColorClass: string;
  activeClass: string;
  hoverClass: string;
}

const STATUS_TAB_CONFIG: StatusTabConfig[] = [
  {
    key: 'all',
    labelKey: 'personal_calendar.status_tab_all',
    icon: <ListChecks size={18} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5)]',
    titleColorClass: 'text-[#00529C] dark:text-blue-400 font-medium',
    numColorClass: 'text-[#00529C] dark:text-blue-400',
    activeClass: 'border-[#00529C]/50 dark:border-blue-400/60 bg-blue-50/70 dark:bg-blue-950/25',
    hoverClass: 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-blue-50/60 hover:border-blue-200 dark:hover:bg-blue-950/20 dark:hover:border-blue-800/40',
  },
  {
    key: 'created',
    labelKey: 'personal_calendar.status_tab_created',
    icon: <Check size={18} strokeWidth={2.5} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-[#4BA3E8] to-[#2A7FD0] shadow-[0_4px_10px_-2px_rgba(42,127,208,0.45)]',
    titleColorClass: 'text-[#0284C7] dark:text-sky-400 font-medium',
    numColorClass: 'text-[#0284C7] dark:text-sky-400',
    activeClass: 'border-[#0284C7]/50 dark:border-sky-400/60 bg-sky-50/70 dark:bg-sky-950/25',
    hoverClass: 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-sky-200 hover:bg-sky-50/30',
  },
  {
    key: 'approved',
    labelKey: 'personal_calendar.status_tab_approved',
    icon: <CalendarCheck2 size={18} strokeWidth={2} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_4px_10px_-2px_rgba(16,185,129,0.5)]',
    titleColorClass: 'text-emerald-600 dark:text-emerald-400 font-medium',
    numColorClass: 'text-emerald-600 dark:text-emerald-400',
    activeClass: 'border-emerald-500/50 dark:border-emerald-600/60 bg-emerald-50/70 dark:bg-emerald-950/25',
    hoverClass: 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-200 hover:bg-emerald-50/30',
  },
  {
    key: 'pending',
    labelKey: 'personal_calendar.status_tab_pending',
    icon: <Clock size={18} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_4px_10px_-2px_rgba(245,158,11,0.5)]',
    titleColorClass: 'text-amber-600 dark:text-amber-400 font-medium',
    numColorClass: 'text-amber-600 dark:text-amber-400',
    activeClass: 'border-amber-400/50 dark:border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/25',
    hoverClass: 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-200 hover:bg-amber-50/30',
  },
  {
    key: 'rejected',
    labelKey: 'personal_calendar.status_tab_rejected',
    icon: <CalendarX2 size={18} strokeWidth={2} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-[0_4px_10px_-2px_rgba(239,68,68,0.5)]',
    titleColorClass: 'text-rose-600 dark:text-rose-400 font-medium',
    numColorClass: 'text-rose-600 dark:text-rose-400',
    activeClass: 'border-rose-400/50 dark:border-rose-500/60 bg-rose-50/70 dark:bg-rose-950/25',
    hoverClass: 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-rose-200 hover:bg-rose-50/30',
  },
  {
    key: 'cancelled',
    labelKey: 'personal_calendar.status_tab_cancelled',
    icon: <CalendarOff size={20} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-[0_4px_10px_-2px_rgba(100,116,139,0.45)]',
    titleColorClass: 'text-slate-500 dark:text-slate-400 font-medium',
    numColorClass: 'text-slate-500 dark:text-slate-400',
    activeClass: 'border-slate-400/50 dark:border-slate-500/60 bg-slate-100/80 dark:bg-slate-800/40',
    hoverClass: 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-200 hover:bg-slate-50/40',
  },
  {
    key: 'draft',
    labelKey: 'personal_calendar.status_tab_draft',
    icon: <FileEdit size={18} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-[0_4px_10px_-2px_rgba(71,85,105,0.5)]',
    titleColorClass: 'text-slate-600 dark:text-slate-400 font-medium',
    numColorClass: 'text-slate-600 dark:text-slate-400',
    activeClass: 'border-slate-400/50 dark:border-slate-500/60 bg-slate-100/80 dark:bg-slate-800/40',
    hoverClass: 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-200 hover:bg-slate-50/60',
  },
];

const STATUS_BY_TAB: Record<StatusTabKey, ScheduleOccurrenceStatus | undefined> = {
  all: undefined,
  created: ScheduleOccurrenceStatus.Created,
  pending: ScheduleOccurrenceStatus.Waiting,
  approved: ScheduleOccurrenceStatus.Approved,
  rejected: ScheduleOccurrenceStatus.Rejected,
  draft: ScheduleOccurrenceStatus.Draft,
  cancelled: ScheduleOccurrenceStatus.Cancelled,
};

const eventStyleForStatus = (status: ScheduleStatus) => {
  const occurrenceStatus = STATUS_BY_TAB[status];
  if (!occurrenceStatus) return '';
  const theme = SCHEDULE_OCCURRENCE_EVENT_THEME[occurrenceStatus];
  return cn('border', theme.bg, theme.text, theme.border);
};

interface AgendaEventCardProps {
  event: PersonalScheduleEvent;
  onClick: (event: PersonalScheduleEvent) => void;
  showDate?: boolean;
  idx?: number;
}

const AgendaEventCard: React.FC<AgendaEventCardProps> = React.memo(({ event, onClick, showDate = false, idx = 0 }) => {
  const { t } = useTranslation();
  const isUrgent = event.priority === 'urgent';

  return (
    <motion.button
      type="button"
      onClick={() => onClick(event)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className={cn(
        'group relative flex flex-col rounded-2xl p-3.5 border transition-all duration-200 cursor-pointer text-left overflow-hidden',
        isUrgent
          ? 'bg-gradient-to-br from-rose-50/80 via-white to-white dark:from-rose-950/25 dark:via-slate-900 dark:to-slate-900 border-rose-200/90 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md hover:-translate-y-0.5'
          : 'bg-gradient-to-br from-blue-50/70 via-white to-white dark:from-blue-950/25 dark:via-slate-900 dark:to-slate-900 border-blue-200/90 dark:border-blue-900/60 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 -ml-0.5 rounded-md text-11 font-normal tabular-nums shrink-0',
              isUrgent
                ? 'bg-rose-100/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                : 'bg-blue-50 dark:bg-blue-950/50 text-[#00529C] dark:text-blue-300'
            )}
          >
            <Clock size={11} className={isUrgent ? 'text-rose-500' : 'text-[#00529C] dark:text-blue-400'} />
            {showDate ? `${dayjs(event.startDate).format('DD/MM')} • ${event.startTime} - ${event.endTime}` : `${event.startTime} - ${event.endTime}`}
          </span>

          {isUrgent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 shrink-0 shadow-xs">
              <AlertCircle size={11} className="text-rose-500 shrink-0" />
              {t('personal_calendar.priority_urgent')}
            </span>
          )}
        </div>
        <h4 className="text-13.5 font-semibold text-[#00529C] dark:text-blue-400 line-clamp-2 my-0.5">
          {event.title}
        </h4>
        {(event.location || event.scheduleTypeName || (event.participants && event.participants.length > 0)) && (
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 pt-0.5 flex-wrap">
            {event.location && (
              <div
                className="inline-flex items-center gap-1 px-2 py-px rounded-full text-[10.5px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-normal max-w-full min-w-0"
                title={event.location}
              >
                <MapPin size={11} className="shrink-0 text-amber-500 dark:text-amber-400" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {event.scheduleTypeName && (
              <div
                className="inline-flex items-center gap-1 px-2 py-px rounded-full text-[10.5px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-[#00529C] dark:text-blue-400 font-normal max-w-[140px] min-w-0"
                title={event.scheduleTypeName}
              >
                <Tag size={10.5} className="shrink-0" />
                <span className="truncate">{event.scheduleTypeName}</span>
              </div>
            )}
            {event.participants && event.participants.length > 0 && (
              <ParticipantsTooltip participants={event.participants}>
                <div className="inline-flex items-center justify-center gap-1 px-2 py-px rounded-full text-[10.5px] font-normal bg-[#f0f4f8] dark:bg-slate-800/80 text-[#00529C] dark:text-blue-400 border border-slate-200/60 dark:border-slate-700/60 ml-auto shrink-0 select-none cursor-pointer">
                  <Users size={10.5} className="shrink-0" />
                  <span className="tabular-nums">{event.participants.length}</span>
                </div>
              </ParticipantsTooltip>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
});

export const PersonalSchedule: React.FC = () => {
  const { t } = useTranslation();
  // The agenda panel always shows today (its day navigation was removed).
  const [agendaDate] = useState<Date>(() => new Date());
  // Side agenda can be folded into a slim rail so the calendar gets the full width; remembered per browser.
  const [agendaCollapsed, setAgendaCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('personal-agenda-collapsed') === '1';
    } catch {
      return false;
    }
  });
  const toggleAgenda = useCallback(() => {
    setAgendaCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('personal-agenda-collapsed', next ? '1' : '0');
      } catch {
        /* storage unavailable */
      }
      return next;
    });
    // FullCalendar sizes itself on window resize; nudge it once the column width has settled.
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
  }, []);

  const [tableSearch, setTableSearch] = useState('');
  const debouncedTableSearch = useDebounce(tableSearch, 300);
  const [tableDateFilter, setTableDateFilter] = useState<[Dayjs, Dayjs] | null>(null);
  const [meetingFormatFilter, setMeetingFormatFilter] = useState<MeetingFormat | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<SchedulePriority | 'all'>('all');
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 10;

  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
  const [calendarDate, setCalendarDate] = useState(() => dayjs());
  const handleTableDateChange = useCalendarRangeSync({
    active: viewMode === 'calendar',
    calendarDate,
    setCalendarDate,
    range: tableDateFilter,
    setRange: setTableDateFilter,
  });

  const [statusTab, setStatusTab] = useState<StatusTabKey>('all');

  const { hasRawRole } = usePermission();
  const isAdmin = hasRawRole(['administrator', 'admin']);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const canFilterByUser = isAdmin && !actingLeaderId;
  const [filterUser, setFilterUser] = useState<Employee | undefined>(undefined);
  const filterUserId = canFilterByUser ? filterUser?.id : undefined;

  useEffect(() => {
    if (!canFilterByUser) setFilterUser(undefined);
  }, [canFilterByUser]);

  const fetchFilterUsers = useCallback(async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }) => {
    const res = await userAPI.getUsers({ searchKeyword: search, PageNumber: page, PageSize: pageSize });
    return { items: (res.items || []) as Employee[], total: res.totalCount || 0 };
  }, []);

  const tableStartDate = tableDateFilter ? tableDateFilter[0].startOf('day').toISOString() : undefined;
  const tableEndDate = tableDateFilter ? tableDateFilter[1].endOf('day').toISOString() : undefined;

  useEffect(() => {
    setTablePage(1);
  }, [debouncedTableSearch, tableStartDate, tableEndDate, statusTab, meetingFormatFilter, priorityFilter, filterUserId]);

  const apiMeetingType = meetingFormatFilter !== 'all'
    ? (meetingFormatFilter === 'offline' ? MeetingType.Offline : MeetingType.Online)
    : undefined;
  const apiPriority = priorityFilter !== 'all'
    ? (priorityFilter === 'urgent' ? ApiSchedulePriority.Urgent : ApiSchedulePriority.Normal)
    : undefined;

  const { data: tablePageData, isLoading: isTableLoading } = usePersonalScheduleTableQuery({
    search: debouncedTableSearch,
    startDate: tableStartDate,
    endDate: tableEndDate,
    status: STATUS_BY_TAB[statusTab],
    meetingType: apiMeetingType,
    priority: apiPriority,
    page: tablePage,
    pageSize: TABLE_PAGE_SIZE,
    filterUserId,
  });

  const { data: calendarRawItems, isLoading: isCalendarLoading } = usePersonalScheduleCalendarGridQuery({
    year: calendarDate.year(),
    month: calendarDate.month() + 1,
    filterUserId,
  });

  const calendarPageItems = useMemo(() => {
    const items = calendarRawItems ?? [];
    const statusValue = STATUS_BY_TAB[statusTab];
    const q = debouncedTableSearch.trim().toLowerCase();
    return items
      .filter((item) => {
        if (statusValue !== undefined && item.status !== statusValue) return false;
        if (apiMeetingType !== undefined && item.meetingType !== apiMeetingType) return false;
        if (apiPriority !== undefined && item.priority !== apiPriority) return false;
        if (q && !(item.title || '').toLowerCase().includes(q) && !(item.location || '').toLowerCase().includes(q)) return false;
        return true;
      })
      .map(mapCalendarItemToEvent);
  }, [calendarRawItems, statusTab, apiMeetingType, apiPriority, debouncedTableSearch]);

  const calendarEvents = useMemo(
    () =>
      calendarPageItems.map((event) => ({
        id: event.id,
        title: event.title,
        start: `${event.startDate}T${event.startTime}:00`,
        end: `${event.endDate}T${event.endTime}:00`,
        extendedProps: { raw: event },
      })),
    [calendarPageItems]
  );

  const renderCalendarEventContent = useCallback((arg: EventContentArg) => {
    const raw = arg.event.extendedProps?.raw as PersonalScheduleEvent | undefined;
    if (!raw) return null;

    const eventStyle = eventStyleForStatus(raw.status);
    const isTimeGrid = arg.view.type.startsWith('timeGrid');

    if (isTimeGrid) {
      const start = arg.event.start;
      const end = arg.event.end;
      const durationMinutes = start && end ? dayjs(end).diff(dayjs(start), 'minute') : 60;
      const isShort = durationMinutes <= 30;
      const isMedium = durationMinutes <= 60;
      const isDayView = arg.view.type === 'timeGridDay';

      if (isDayView) {
        return (
          <div className={cn('flex flex-col justify-center gap-0.5 px-3 py-1 rounded-lg text-[11.5px] h-full overflow-hidden cursor-pointer transition-opacity hover:opacity-85', eventStyle)}>
            <div className="flex items-center gap-1 min-w-0">
              <div className="flex items-center gap-1 font-medium shrink-0">
                <Clock size={11} className="shrink-0" />
                <span>{raw.startTime} - {raw.endTime}:</span>
              </div>
              <span className="font-medium text-[12px] truncate text-slate-800 dark:text-slate-100">{arg.event.title}</span>
            </div>
            {!isShort && <EventMetaLine location={raw.location} online={raw.meetingFormat === 'online'} />}
          </div>
        );
      }

      if (isShort) {
        return (
          <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] h-full overflow-hidden cursor-pointer transition-opacity hover:opacity-85', eventStyle)}>
            <Clock size={10} className="shrink-0" />
            <span className="font-medium shrink-0">{raw.startTime}-{raw.endTime}:</span>
            <span className="truncate font-medium text-slate-800 dark:text-slate-100">{arg.event.title}</span>
          </div>
        );
      }

      return (
        <div className={cn('flex flex-col justify-center gap-0.5 px-2 py-1 rounded-lg text-[11.5px] h-full overflow-hidden cursor-pointer transition-opacity hover:opacity-85', eventStyle)}>
          <div className="flex items-center gap-1 font-medium shrink-0 min-w-0">
            <Clock size={11} className="shrink-0" />
            <span className="truncate whitespace-nowrap">{raw.startTime} - {raw.endTime}</span>
          </div>
          <div className={cn('font-medium text-[12px] leading-snug truncate text-slate-800 dark:text-slate-100', !isMedium && 'line-clamp-2')}>{arg.event.title}</div>
          {!isMedium && raw.location && (
            <div className="flex items-center gap-1 text-[11px] opacity-80 truncate">
              <MapPin size={10} className="shrink-0" />
              <span className="truncate">{raw.location}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={cn('flex items-center gap-1.5 min-w-0 px-1.5 py-0.5 rounded-md text-[11px] leading-tight cursor-pointer overflow-hidden transition-opacity hover:opacity-80', eventStyle)}>
        <Clock size={10} className="shrink-0" />
        <span className="shrink-0 font-medium">{raw.startTime} - {raw.endTime}:</span>
        <span className="truncate font-medium text-slate-800 dark:text-slate-100">{arg.event.title}</span>
      </div>
    );
  }, []);

  const { data: statsData } = usePersonalScheduleStatsQuery({
    search: debouncedTableSearch,
    startDate: tableStartDate,
    endDate: tableEndDate,
    meetingType: apiMeetingType,
    priority: apiPriority,
    filterUserId,
  });

  const data = tablePageData?.items ?? EMPTY_EVENTS;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const createMutation = useCreatePersonalScheduleMutation();
  const updateMutation = useUpdatePersonalScheduleMutation();
  const deleteMutation = useDeletePersonalScheduleMutation();
  const deleteGroupMutation = useDeletePersonalScheduleGroupMutation();
  const cancelMutation = useCancelPersonalScheduleMutation();
  const approveMutation = useApprovePersonalScheduleMutation();
  const rejectMutation = useRejectPersonalScheduleMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PersonalScheduleEvent | null>(null);
  const [duplicateSeed, setDuplicateSeed] = useState<PersonalScheduleEvent | null>(null);
  const [initialSlot, setInitialSlot] = useState<{ date?: Dayjs; startTime?: Dayjs; endTime?: Dayjs } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonalScheduleEvent | null>(null);
  const { data: deleteTargetDetail, isLoading: isDeleteTargetDetailLoading } = usePersonalScheduleDetailQuery(
    deleteTarget?.id,
    !!deleteTarget
  );
  const deleteTargetIsGroup = deleteTargetDetail?.isGroupSchedule ?? false;
  const deleteGroupScheduleId = deleteTargetDetail?.scheduleId ?? deleteTarget?.scheduleId;
  const deleteChoicePending = !!deleteTarget && isDeleteTargetDetailLoading && !deleteTargetDetail;
  const [cancelTarget, setCancelTarget] = useState<PersonalScheduleEvent | null>(null);
  const [approveTarget, setApproveTarget] = useState<PersonalScheduleEvent | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PersonalScheduleEvent | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonTouched, setRejectReasonTouched] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PersonalScheduleEvent | null>(null);

  // Deep link from notifications: /lich-lam-viec/ca-nhan?id=<occurrenceId>
  const [searchParams, setSearchParams] = useSearchParams();
  const urlId = searchParams.get('id') || searchParams.get('occurrenceId');
  const urlSection = searchParams.get('section') === 'participants' ? 'participants' : undefined;
  const { data: urlDetail } = usePersonalScheduleDetailQuery(urlId ?? undefined, !!urlId);
  // Open once per id so refetches after approve/reject don't reopen a closed modal.
  const openedUrlIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!urlId) {
      openedUrlIdRef.current = null;
      return;
    }
    if (urlDetail && urlDetail.id === urlId && openedUrlIdRef.current !== urlId) {
      openedUrlIdRef.current = urlId;
      setDetailTarget(urlDetail);
    }
  }, [urlDetail, urlId]);

  const handleCloseDetail = useCallback(() => {
    setDetailTarget(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('id');
        next.delete('occurrenceId');
        next.delete('section');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const [participantsTarget, setParticipantsTarget] = useState<PersonalScheduleEvent | null>(null);

  useEffect(() => {
    if (rejectTarget) {
      setRejectReason('');
      setRejectReasonTouched(false);
    }
  }, [rejectTarget]);

  const meetingFormatOptions = useMemo(
    () => [
      { value: 'all' as const, label: t('personal_calendar.format_all') },
      {
        value: 'offline' as const,
        label: (
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={13} />
            {t('personal_calendar.format_offline')}
          </span>
        ),
      },
      {
        value: 'online' as const,
        label: (
          <span className="inline-flex items-center gap-1.5">
            <Video size={13} />
            {t('personal_calendar.format_online')}
          </span>
        ),
      },
    ],
    [t]
  );

  const priorityOptions = useMemo(
    () =>
      withPriorityColor([
        { value: 'all', label: t('personal_calendar.priority_all') },
        { value: 'urgent', label: t('personal_calendar.priority_urgent') },
        { value: 'normal', label: t('personal_calendar.priority_normal') },
      ]),
    [t]
  );

  const statusCounts = useMemo(
    () => ({
      all: statsData?.total ?? 0,
      created: statsData?.created ?? 0,
      pending: statsData?.waiting ?? 0,
      approved: statsData?.approved ?? 0,
      rejected: statsData?.rejected ?? 0,
      draft: statsData?.draft ?? 0,
      cancelled: statsData?.cancelled ?? 0,
    }),
    [statsData]
  );

  const todayStr = dayjs().format('YYYY-MM-DD');
  const agendaDateStr = dayjs(agendaDate).format('YYYY-MM-DD');
  const isAgendaToday = agendaDateStr === todayStr;

  const isRangeFilterActive = !!tableDateFilter;

  const agendaEvents = useMemo(
    () =>
      data
        .filter((e) => inRange(agendaDateStr, e.startDate, e.endDate) && isEventActiveOnDay(e, agendaDateStr))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [data, agendaDateStr]
  );

  const rangeFilteredEvents = useMemo(() => {
    if (!tableDateFilter) return [];
    const rangeStart = tableDateFilter[0].format('YYYY-MM-DD');
    const rangeEnd = tableDateFilter[1].format('YYYY-MM-DD');
    return data
      .filter((e) => e.startDate <= rangeEnd && e.endDate >= rangeStart)
      .sort((a, b) => (a.startDate + a.startTime).localeCompare(b.startDate + b.startTime));
  }, [data, tableDateFilter]);

  // Shared by the expanded header and the collapsed rail button so both show the same count/title.
  const agendaCount = isRangeFilterActive ? rangeFilteredEvents.length : agendaEvents.length;
  // Short title + a dated subtitle (weekday included), like the leadership "Lịch trình trong tuần" panel.
  const agendaTitle = !isRangeFilterActive && isAgendaToday
    ? t('personal_calendar.agenda_title_today')
    : t('personal_calendar.agenda_title', { defaultValue: 'Lịch trình' });
  const agendaSubtitle = isRangeFilterActive
    ? `${tableDateFilter![0].format('dd, DD/MM')} – ${tableDateFilter![1].format('dd, DD/MM')}`
    : dayjs(agendaDate).format('dd, DD/MM/YYYY');

  type TimelineRow =
    | { type: 'event'; start: string; event: PersonalScheduleEvent }
    | { type: 'free'; start: string; slot: FreeSlot };

  const nowTick = useMinuteTick();

  const agendaTimeline = useMemo<TimelineRow[]>(() => {
    const freeSlots = listFreeSlots(agendaDateStr, data, 20);
    const rows: TimelineRow[] = [
      ...agendaEvents.map((event) => ({ type: 'event' as const, start: event.startTime, event })),
      ...freeSlots.map((slot) => ({ type: 'free' as const, start: slot.start, slot })),
    ];
    return rows.sort((a, b) => a.start.localeCompare(b.start));
  }, [agendaEvents, data, agendaDateStr, nowTick]);

  const hasTableFilters =
    !!tableSearch ||
    (!!tableDateFilter && !isAutoMonthRange(tableDateFilter, calendarDate, viewMode === 'calendar')) || meetingFormatFilter !== 'all' || priorityFilter !== 'all' || !!filterUser;
  const resetTableFilters = () => {
    setTableSearch('');
    setTableDateFilter(null);
    setMeetingFormatFilter('all');
    setPriorityFilter('all');
    setFilterUser(undefined);
  };

  const openCreateModal = (slot?: { date?: Dayjs; startTime?: Dayjs; endTime?: Dayjs } | null) => {
    setEditingEvent(null);
    setDuplicateSeed(null);
    setInitialSlot(slot || null);
    setIsModalOpen(true);
  };

  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const state = location.state as {
      autoOpenCreate?: boolean;
      prefillSearch?: string;
      slot?: { date?: string; startTime?: string; endTime?: string };
    } | null;
    if (!state?.autoOpenCreate && !state?.prefillSearch) return;
    if (state.autoOpenCreate) {
      const slot = state.slot;
      openCreateModal(
        slot
          ? {
              date: slot.date ? dayjs(slot.date) : undefined,
              startTime: slot.startTime ? dayjs(slot.startTime) : undefined,
              endTime: slot.endTime ? dayjs(slot.endTime) : undefined,
            }
          : null
      );
    }
    if (state.prefillSearch) setTableSearch(state.prefillSearch);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state]);

  const openEditModal = useCallback((record: PersonalScheduleEvent) => {
    setEditingEvent(record);
    setDuplicateSeed(null);
    setIsModalOpen(true);
  }, []);

  const handleDuplicate = useCallback((record: PersonalScheduleEvent) => {
    setEditingEvent(null);
    setDuplicateSeed(record);
    setInitialSlot(null);
    setIsModalOpen(true);
  }, []);

  const openDetailModal = useCallback((record: PersonalScheduleEvent) => {
    setDetailTarget(record);
  }, []);

  const handleSubmit = (input: PersonalScheduleInput, options?: { isDraft?: boolean; isUpdateSingleDay?: boolean }) => {
    if (editingEvent) {
      const isDraft = options?.isDraft;
      updateMutation.mutate(
        { id: editingEvent.id, data: input, isDraft, isUpdateSingleDay: options?.isUpdateSingleDay },
        {
          onSuccess: () => {
            toast.success(isDraft ? t('personal_calendar.toast_draft_success') : t('personal_calendar.toast_update_success'));
            setIsModalOpen(false);
          },
        }
      );
      return;
    }
    const isDraft = options?.isDraft ?? false;
    createMutation.mutate(
      { input, isDraft },
      {
        onSuccess: () => {
          toast.success(isDraft ? t('personal_calendar.toast_draft_success') : t('personal_calendar.toast_create_success'));
          setIsModalOpen(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('personal_calendar.toast_delete_success'));
        if (detailTarget?.id === deleteTarget.id) handleCloseDetail();
        setDeleteTarget(null);
      },
    });
  };

  const handleDeleteGroup = () => {
    if (!deleteTarget || !deleteGroupScheduleId) return;
    deleteGroupMutation.mutate(deleteGroupScheduleId, {
      onSuccess: () => {
        toast.success(t('personal_calendar.toast_delete_group_success'));
        if (detailTarget?.id === deleteTarget.id) handleCloseDetail();
        setDeleteTarget(null);
      },
    });
  };

  const handleCancel = (reason: string) => {
    if (!cancelTarget) return;
    cancelMutation.mutate(
      { id: cancelTarget.id, reason },
      {
        onSuccess: () => {
          toast.success(t('personal_calendar.toast_cancel_success'));
          if (detailTarget?.id === cancelTarget.id) handleCloseDetail();
          setCancelTarget(null);
        },
      }
    );
  };

  const handleApprove = () => {
    if (!approveTarget) return;
    approveMutation.mutate(approveTarget.id, {
      onSuccess: () => {
        toast.success(t('schedule_approval.toast_approve_success'));
        if (detailTarget?.id === approveTarget.id) setDetailTarget(null);
        setApproveTarget(null);
      },
    });
  };

  const handleRejectSubmit = () => {
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectReasonTouched(true);
      return;
    }
    if (!rejectTarget) return;
    rejectMutation.mutate(
      { id: rejectTarget.id, reason: trimmed },
      {
        onSuccess: () => {
          toast.success(t('schedule_approval.toast_reject_success'));
          if (detailTarget?.id === rejectTarget.id) setDetailTarget(null);
          setRejectTarget(null);
        },
      }
    );
  };

  const submitting = createMutation.isPending || updateMutation.isPending;

  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const [stickyHeaderHeight, setStickyHeaderHeight] = useState(0);

  useEffect(() => {
    if (!stickyHeaderRef.current) return;
    const updateHeight = () => {
      if (stickyHeaderRef.current) {
        setStickyHeaderHeight(stickyHeaderRef.current.offsetHeight);
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(stickyHeaderRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <Box className="relative flex flex-col gap-3 pb-4 select-none [&_input]:select-text [&_textarea]:select-text">
      <div className="pointer-events-none absolute -top-32 right-0 -z-10 w-[500px] h-[500px] rounded-full bg-[#00529C]/[0.03] dark:bg-blue-500/[0.04] blur-[120px]" />

      {/* Top Header Card (Title, Filters, and Status Tabs fixed together) */}
      <Paper
        ref={stickyHeaderRef}
        className={`${SURFACE} !p-4 flex flex-col gap-3 md:sticky md:top-0 z-20 shadow-xs backdrop-blur-md bg-white/95 dark:bg-slate-900/95`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <CircleUser size={20} className="text-[#00529C] dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {t('personal_calendar.title')}
              </h2>
              <p className="text-11.5 text-slate-500 dark:text-slate-400">{t('personal_calendar.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-0 bg-gradient-to-b from-[#2E8BE6] to-[#1F78D6] text-white text-[13.5px] font-semibold shadow-[0_1px_2px_rgba(15,60,120,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#2580DC] hover:to-[#196ECB] hover:shadow-[0_4px_10px_-2px_rgba(15,60,120,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            <CalendarPlus size={17} className="shrink-0" />
            <span>{t('personal_calendar.create_btn')}</span>
          </button>
        </div>

        {/* 7 Status Cards in responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-7 gap-2.5 sm:gap-3 pt-1">
          {STATUS_TAB_CONFIG.map((tab, idx) => {
            const isActive = statusTab === tab.key;
            return (
              <motion.button
                key={tab.key}
                type="button"
                onClick={() => setStatusTab(tab.key)}
                aria-pressed={isActive}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 400, damping: 30 }}
                whileHover={{ y: -3, transition: { duration: 0.15, ease: 'easeOut' } }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'group relative flex items-center gap-2.5 xl:gap-3 p-2.5 sm:p-3 xl:p-3.5 rounded-2xl border cursor-pointer transition-[background-color,border-color,box-shadow] duration-150 text-left overflow-hidden select-none hover:shadow-md',
                  isActive ? tab.activeClass : tab.hoverClass
                )}
              >
                <div
                  className={cn(
                    'w-8.5 h-8.5 xl:w-10 xl:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:scale-105',
                    tab.iconBgClass
                  )}
                >
                  {tab.icon}
                </div>
                <div className="min-w-0 flex-1 text-left pr-3.5">
                  <div className={`text-[11.5px] xl:text-[12px] font-medium truncate leading-tight ${tab.titleColorClass}`}>
                    {t(tab.labelKey)}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={`text-[15px] xl:text-[16px] font-semibold leading-none tracking-tight tabular-nums ${tab.numColorClass}`}>
                      {statusCounts[tab.key]}
                    </span>
                    <span className="text-[11px] xl:text-[11.5px] font-normal text-slate-500 dark:text-slate-500 truncate">
                      {t('personal_calendar.status_tab_unit')}
                    </span>
                  </div>
                </div>

                {isActive && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs pointer-events-none"
                    title={t('common.selected')}
                  >
                    <Check size={9} strokeWidth={2.5} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Filter bar + View mode switcher aligned right */}
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1.5">
          <div className="flex flex-wrap items-end gap-3 min-w-0">
            <div className="relative w-full sm:w-96 shrink-0">
              <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
                {t('personal_calendar.filter_search_label')}
              </span>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={t('personal_calendar.filter_search_placeholder')}
                  className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border border-[#00529C]/45 dark:border-blue-500/50 bg-white dark:bg-slate-900 dark:text-slate-100 text-[13px] placeholder:text-13 transition-all duration-200 hover:border-[#00529C] focus:border-[#00529C] focus:outline-none focus:ring-4 focus:ring-[#00529C]/10"
                />
              </div>
            </div>

            <div className="relative w-full sm:w-72 shrink-0">
              <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
                {t('personal_calendar.filter_date_label')}
              </span>
              <RangePicker
                size="large"
                className="w-full !h-[38px] !border-[#00529C]/45 dark:!border-blue-500/50 !rounded-xl"
                value={tableDateFilter}
                format="DD/MM/YYYY"
                placeholder={[
                  t('personal_calendar.filter_date_start_placeholder', { defaultValue: 'Từ ngày' }),
                  t('personal_calendar.filter_date_end_placeholder', { defaultValue: 'Đến ngày' }),
                ]}
                allowClear
                onChange={(range) => handleTableDateChange(range as [Dayjs, Dayjs] | null)}
              />
            </div>

            <div className="relative w-full sm:w-[160px] shrink-0">
              <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
                {t('personal_calendar.filter_format_label') || 'Hình thức'}
              </span>
              <AntdSelect
                size="large"
                className="w-full premium-select h-10 filter-compact !border-[#00529C]/45 dark:!border-blue-500/50 [&_.ant-select-selection-item]:!text-[13px] [&_.ant-select-selection-item]:!font-normal [&_.ant-select-selection-item]:!text-slate-700 dark:[&_.ant-select-selection-item]:!text-slate-200"
                classNames={{ popup: { root: 'premium-select-dropdown' } }}
                value={meetingFormatFilter}
                onChange={setMeetingFormatFilter}
                options={meetingFormatOptions}
              />
            </div>

            <div className="relative w-full sm:w-[175px] shrink-0">
              <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
                {t('personal_calendar.filter_priority_label') || 'Mức độ'}
              </span>
              <AntdSelect
                size="large"
                className="w-full premium-select h-10 filter-compact !border-[#00529C]/45 dark:!border-blue-500/50 [&_.ant-select-selection-item]:!text-[13px] [&_.ant-select-selection-item]:!font-normal [&_.ant-select-selection-item]:!text-slate-700 dark:[&_.ant-select-selection-item]:!text-slate-200"
                classNames={{ popup: { root: 'premium-select-dropdown' } }}
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={priorityOptions}
              />
            </div>

            {canFilterByUser && (
              <div className="relative w-full sm:w-72 shrink-0">
                <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
                  {t('personal_calendar.filter_user_label', { defaultValue: 'Người dùng' })}
                </span>
                <PagedPickerSelect<Employee>
                  value={filterUser?.id}
                  menuMinWidth={400}
                  onChange={(_id, record) => setFilterUser(record)}
                  fetchPage={fetchFilterUsers}
                  getValue={(e) => e.id}
                  getLabel={(e) => e.fullname}
                  renderOption={(e) => {
                    const jobInfo = [e.jobTitleName, e.departmentName].filter(Boolean).join(' · ');
                    return (
                      <div className="flex items-center gap-2.5 min-w-0 py-0.5">
                        <PersonAvatar name={e.fullname} avatarUrl={e.avatarUrl} className="h-8 w-8" textClassName="text-[11px]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-13 font-medium text-slate-800 dark:text-slate-100 truncate">{e.fullname}</span>
                            {e.employeeCode && (
                              <span className="shrink-0 text-[10.5px] font-normal text-[#00529C] dark:text-blue-400">{e.employeeCode}</span>
                            )}
                          </div>
                          {jobInfo && <div className="text-[10.5px] font-normal text-slate-400 dark:text-slate-500 truncate">{jobInfo}</div>}
                        </div>
                      </div>
                    );
                  }}
                  placeholder={t('personal_calendar.filter_user_placeholder', { defaultValue: 'Tất cả người dùng' })}
                  className="!min-h-[38px] !border-[#00529C]/45 dark:!border-blue-500/50"
                />
              </div>
            )}

            {hasTableFilters && (
              <FilterResetButton onClick={resetTableFilters} />
            )}
          </div>

          {/* View mode switcher right aligned in the filter row */}
          <div className="relative shrink-0 w-full sm:w-auto ml-0 sm:ml-auto flex justify-end">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('personal_calendar.view_mode_label', { defaultValue: 'Chế độ xem' })}
            </span>
            <div className="flex gap-0.5 h-[38px] items-center p-0.5 bg-slate-50 dark:bg-slate-800/40 rounded-full border border-[#00529C]/45 dark:border-blue-500/50">
              {([
                { key: 'table' as const, label: t('personal_calendar.view_table', { defaultValue: 'Bảng' }), icon: ListChecks },
                { key: 'calendar' as const, label: t('personal_calendar.view_calendar', { defaultValue: 'Lịch' }), icon: CalendarDays },
              ]).map(({ key, label, icon: Icon }) => {
                const isActive = viewMode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setViewMode(key)}
                    className={cn(
                      'relative flex items-center gap-1.5 h-full px-3.5 rounded-full text-12.5 font-medium transition-colors cursor-pointer',
                      isActive
                        ? 'text-[#00529C] dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="personal-view-mode-pill"
                        className="absolute inset-0 rounded-full bg-white dark:bg-slate-900 shadow-sm"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <Icon size={14} className="relative" />
                    <span className="relative">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Paper>

      <div
        className={cn(
          'grid grid-cols-1 gap-3 items-start transition-[grid-template-columns] duration-300 ease-out',
          agendaCollapsed ? 'md:grid-cols-[1fr_48px]' : 'md:grid-cols-[1fr_360px]'
        )}
      >
        {/* LEFT: management list */}
        <div className="flex flex-col gap-3.5 min-w-0">
          <Paper className={`${SURFACE} !p-4 flex flex-col gap-3 min-w-0 overflow-hidden`}>
            <div className={viewMode === 'table' ? 'block' : 'hidden'}>
              <PersonalScheduleTable
                data={data}
                loading={isTableLoading}
                currentUserId={currentUserId}
                onRowClick={openDetailModal}
                onEdit={openEditModal}
                onDelete={setDeleteTarget}
                onCancel={setCancelTarget}
                onDuplicate={handleDuplicate}
                onApprove={setApproveTarget}
                onReject={setRejectTarget}
                onViewParticipants={setParticipantsTarget}
                page={tablePage}
                pageSize={TABLE_PAGE_SIZE}
                total={tablePageData?.totalCount ?? 0}
                onPageChange={setTablePage}
                scrollY="calc(100vh - 430px)"
              />
            </div>
            <div className={viewMode === 'calendar' ? 'block' : 'hidden'}>
              <ScheduleCalendarView
                visible={viewMode === 'calendar'}
                events={calendarEvents}
                loading={isCalendarLoading}
                date={calendarDate}
                onDateChange={setCalendarDate}
                onSelectSlot={(start, end, allDay) =>
                  openCreateModal(
                    allDay ? { date: dayjs(start) } : { date: dayjs(start), startTime: dayjs(start), endTime: dayjs(end) }
                  )
                }
                onEventClick={(raw: PersonalScheduleEvent) => openDetailModal(raw)}
                renderEventContent={renderCalendarEventContent}
              />
            </div>
          </Paper>
        </div>

        {/* RIGHT: side panel — today's agenda */}
        <div
          className="flex flex-col gap-4 min-w-0 md:sticky md:top-[var(--agenda-top)] z-10"
          style={{ '--agenda-top': `${stickyHeaderHeight ? stickyHeaderHeight + 12 : 12}px` } as React.CSSProperties}
        >
          {agendaCollapsed && (
            <Tooltip title={`${agendaTitle} · ${agendaSubtitle}`} placement="left">
              <button
                type="button"
                onClick={toggleAgenda}
                aria-label={t('dashboard.panel_expand')}
                className="hidden md:flex flex-col items-center gap-3 w-12 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-[#00529C] dark:hover:text-blue-400 hover:border-[#00529C]/30 cursor-pointer transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><ChevronLeft size={14} /></span>
                <span className="relative w-8 h-8 rounded-xl text-white flex items-center justify-center bg-gradient-to-br from-blue-500 to-[#00529C] shadow-[0_4px_10px_-2px_rgba(0,82,156,0.45)]">
                  <CalendarDays size={16} />
                  {agendaCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 text-[10px] font-semibold leading-none tabular-nums text-white">
                      {Math.min(agendaCount, 99)}
                      {agendaCount > 99 && '+'}
                    </span>
                  )}
                </span>
              </button>
            </Tooltip>
          )}
          <Paper
            className={cn(
              `${SURFACE} !p-4 flex flex-col md:max-h-[var(--agenda-max-h)] overflow-hidden`,
              agendaCollapsed && 'md:hidden'
            )}
            style={{
              '--agenda-max-h': stickyHeaderHeight
                ? `calc(100vh - ${stickyHeaderHeight + 150}px)`
                : 'calc(100vh - 360px)',
            } as React.CSSProperties}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between gap-2 mb-3.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Same header treatment as the dashboard's "Cần xử lý ngay": gradient tile + red count badge */}
                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white bg-gradient-to-br from-blue-500 to-[#00529C] shadow-[0_4px_10px_-2px_rgba(0,82,156,0.45)]">
                  <CalendarDays size={17} />
                  {agendaCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 text-[10px] font-semibold leading-none tabular-nums text-white">
                      {Math.min(agendaCount, 99)}
                      {agendaCount > 99 && '+'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex flex-col justify-center">
                  <h2 className="text-13.5 font-medium text-slate-800 dark:text-slate-100 truncate leading-tight">
                    {agendaTitle}
                  </h2>
                  <p className="text-11 text-slate-500 dark:text-slate-500 leading-tight whitespace-nowrap tabular-nums">
                    {agendaSubtitle}
                  </p>
                </div>
              </div>

              <Tooltip title={t('dashboard.panel_collapse')} placement="top">
                <button
                  type="button"
                  onClick={toggleAgenda}
                  aria-label={t('dashboard.panel_collapse')}
                  className="hidden md:flex w-6 h-6 shrink-0 items-center justify-center rounded-full border-0 bg-slate-100 dark:bg-slate-800 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-[#00529C] hover:bg-blue-50 dark:hover:bg-slate-700 dark:hover:text-blue-400 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </Tooltip>
            </div>

            <div className="slim-scroll min-h-0 flex-1 md:overflow-y-auto -mr-2.5 pr-2.5 pt-0.5 pb-1">
              {isRangeFilterActive ? (
                rangeFilteredEvents.length === 0 ? (
                  <div className="py-12">
                    <Empty
                      image={<CalendarClock size={26} strokeWidth={1.5} className="mx-auto text-slate-300 dark:text-slate-600" />}
                      description={<span className="text-13 text-slate-400 dark:text-slate-500">{t('personal_calendar.agenda_empty_range')}</span>}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {rangeFilteredEvents.map((event, idx) => (
                      <AgendaEventCard
                        key={event.id}
                        event={event}
                        onClick={openDetailModal}
                        showDate
                        idx={idx}
                      />
                    ))}
                  </div>
                )
              ) : agendaTimeline.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3">
                  <Empty
                    image={<CalendarClock size={26} strokeWidth={1.5} className="mx-auto text-slate-300 dark:text-slate-600" />}
                    description={<span className="text-13 text-slate-400 dark:text-slate-500">{t('personal_calendar.agenda_empty')}</span>}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {agendaTimeline.map((row, idx) => { 
                    if (row.type === 'free') {
                      const slotDate = dayjs(agendaDateStr, 'YYYY-MM-DD');
                      const slotStart = dayjs(`${agendaDateStr} ${row.slot.start}`, 'YYYY-MM-DD HH:mm');
                      const slotEnd = dayjs(`${agendaDateStr} ${row.slot.end}`, 'YYYY-MM-DD HH:mm');
                      return (
                        <button
                          key={`free-${row.slot.start}`}
                          type="button"
                          onClick={() => openCreateModal({ date: slotDate, startTime: slotStart, endTime: slotEnd })}
                          className="group flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/25 hover:border-[#00529C] dark:hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 text-slate-500 dark:text-slate-400 cursor-pointer transition-all duration-200 text-left w-full select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 group-hover:bg-[#00529C] group-hover:text-white dark:group-hover:bg-blue-500 flex items-center justify-center shrink-0 transition-colors">
                              <Coffee size={11} className="group-hover:hidden" />
                              <Plus size={12} className="hidden group-hover:block" />
                            </div>
                            <span className="text-12 font-medium text-slate-600 dark:text-slate-400 group-hover:text-[#00529C] dark:group-hover:text-blue-400 transition-colors truncate">
                              {t('personal_calendar.agenda_free_slot', { start: row.slot.start, end: row.slot.end })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-[#00529C] dark:group-hover:text-blue-400 transition-colors shrink-0">
                            <span>{t('personal_calendar.agenda_free_badge')}</span>
                            <Plus size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      );
                    }

                    const event = row.event;
                    return (
                      <AgendaEventCard
                        key={event.id}
                        event={event}
                        onClick={openDetailModal}
                        idx={idx}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </Paper>

        </div>
      </div>

      <PersonalScheduleDetailModal
        open={!!detailTarget}
        event={detailTarget}
        initialSection={detailTarget && detailTarget.id === urlId ? urlSection : undefined}
        onClose={handleCloseDetail}
        onApprove={(e) => setApproveTarget(e)}
        onReject={(e) => setRejectTarget(e)}
        onEdit={(e) => {
          handleCloseDetail();
          openEditModal(e);
        }}
        onDuplicate={(e) => {
          handleCloseDetail();
          handleDuplicate(e);
        }}
        onCancel={setCancelTarget}
        onDelete={setDeleteTarget}
      />

      <PersonalScheduleModal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        editing={editingEvent}
        duplicateFrom={duplicateSeed}
        initialSlot={initialSlot}
        existingEvents={data}
        loading={submitting}
      />

      <CancelScheduleModal
        open={!!cancelTarget}
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        loading={cancelMutation.isPending}
        scheduleTitle={cancelTarget?.title?.trim()}
      />

      <ConfirmModal
        open={!!approveTarget}
        onCancel={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        loading={approveMutation.isPending}
        variant="success"
        uppercaseTitle={false}
        title={t('schedule_approval.approve_confirm_title')}
        description={
          <>
            {t('schedule_approval.approve_confirm_desc')}{' '}
            <span className="font-medium text-slate-700 dark:text-slate-200">
              &ldquo;{approveTarget?.title?.trim()}&rdquo;
            </span>
          </>
        }
        confirmText={t('schedule_approval.approve_confirm_ok')}
        cancelText={t('schedule_approval.approve_confirm_cancel')}
      />

      <Modal
        open={!!rejectTarget}
        onCancel={() => setRejectTarget(null)}
        footer={null}
        centered
        zIndex={1400}
        mask={{ closable: false }}
        keyboard={false}
        width={480}
        destroyOnHidden
        closeIcon={<X size={18} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />}
        className="[&_.ant-modal-content]:!p-6 [&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border [&_.ant-modal-content]:!border-slate-100 dark:[&_.ant-modal-content]:!border-slate-800 [&_.ant-modal-content]:!bg-white dark:[&_.ant-modal-content]:!bg-slate-900 [&_.ant-modal-content]:!shadow-2xl"
      >
        <div className="flex flex-col gap-4.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 shrink-0 shadow-xs">
              <CalendarOff size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
                {t('schedule_approval.reject_dialog_title')} &ldquo;{rejectTarget?.title?.trim()}&rdquo;
              </h3>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-200">
              {t('schedule_approval.reject_reason_label')} <span className="text-rose-500">*</span>
            </label>
            <Input.TextArea
              rows={3.5}
              maxLength={500}
              showCount
              placeholder={t('schedule_approval.reject_reason_placeholder')}
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                if (rejectReasonTouched && e.target.value.trim()) setRejectReasonTouched(false);
              }}
              onBlur={() => setRejectReasonTouched(true)}
              className={cn(
                '!rounded-2xl !text-[13.5px] font-normal dark:!bg-slate-900 !p-0 dark:!text-slate-100 transition-all duration-200',
                rejectReasonTouched && !rejectReason.trim()
                  ? '!border-rose-400 dark:!border-rose-500 focus:!border-rose-500'
                  : 'border-slate-200 dark:border-slate-700 hover:border-rose-400 focus:border-rose-500'
              )}
            />
            {rejectReasonTouched && !rejectReason.trim() && (
              <span className="text-xs font-medium text-rose-500 pl-1 mt-0.5">
                {t('schedule_approval.reject_reason_required')}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              variant="outlined"
              onClick={() => setRejectTarget(null)}
              disabled={rejectMutation.isPending}
              className="!h-10 !px-5 !rounded-full !border-slate-300 dark:!border-slate-700 !text-slate-700 dark:!text-slate-200 text-[13.5px] font-medium"
              sx={{ textTransform: 'none' }}
            >
              {t('schedule_approval.reject_confirm_cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={handleRejectSubmit}
              disabled={rejectMutation.isPending}
              className="!h-10 !px-5.5 !rounded-full !bg-gradient-to-b !from-rose-400 !to-rose-500 hover:!from-rose-500 hover:!to-rose-600 !shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)] !text-white text-[13.5px] font-semibold shadow-sm hover:shadow transition-all"
              sx={{ textTransform: 'none' }}
            >
              {rejectMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>{t('common.processing', { defaultValue: 'Đang xử lý...' })}</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CalendarOff size={16} />
                  <span>{t('schedule_approval.reject_confirm_ok')}</span>
                </span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteChoicePending}
        footer={null}
        title={null}
        closeIcon={null}
        width={420}
        centered
        zIndex={1400}
        mask={{ closable: false }}
        keyboard={false}
        styles={{ container: { padding: 0 }, body: { padding: 0 } }}
      >
        <div className="flex items-center justify-center gap-3 p-10 bg-white dark:bg-slate-900 rounded-3xl">
          <span className="inline-block h-5 w-5 border-2 border-slate-300 dark:border-slate-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget && !deleteTargetIsGroup && !deleteChoicePending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
        title={t('personal_calendar.delete_confirm_title', {
          title: deleteTarget?.title?.trim() || t('personal_calendar.detail_untitled'),
        })}
        uppercaseTitle={false}
        description={t('personal_calendar.delete_confirm_desc')}
        confirmText={t('personal_calendar.delete_ok')}
        cancelText={t('personal_calendar.delete_cancel')}
        variant="danger"
      />

      <Modal
        open={!!deleteTarget && deleteTargetIsGroup && !deleteChoicePending}
        onCancel={() => setDeleteTarget(null)}
        footer={null}
        title={null}
        closeIcon={null}
        width={540}
        centered
        zIndex={1400}
        styles={{ container: { padding: 0 }, body: { padding: 0 } }}
      >
        <div className="p-6 relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="absolute top-5 right-5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200/60 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3.5 pr-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50">
              <CalendarX size={22} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 leading-snug tracking-tight">
                {t('personal_calendar.delete_scope_title')}
              </h3>
              <p className="mt-1 text-13 text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('personal_calendar.delete_scope_desc')}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {/* Option 1: Just this day */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending || deleteGroupMutation.isPending}
              className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-red-400/60 dark:hover:border-red-400 hover:shadow-md transition-all duration-200 text-left cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs group-hover:bg-red-50 group-hover:text-red-600 dark:group-hover:text-red-400 group-hover:border-red-200 transition-all duration-200">
                  <CalendarDays size={19} />
                </div>
                <div className="min-w-0">
                  <div className="text-13.5 font-bold text-slate-800 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {t('personal_calendar.delete_scope_single')}
                  </div>
                  <div className="text-12 text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('personal_calendar.delete_scope_single_desc')}
                  </div>
                </div>
              </div>
              {deleteMutation.isPending ? (
                <span className="inline-block h-4 w-4 shrink-0 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-500 group-hover:bg-rose-500 group-hover:text-white transition-all duration-200">
                  <ArrowRight size={14} />
                </div>
              )}
            </button>

            {/* Option 2: Every day */}
            <button
              type="button"
              onClick={handleDeleteGroup}
              disabled={deleteMutation.isPending || deleteGroupMutation.isPending}
              className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-red-200/90 dark:border-red-900/60 bg-gradient-to-r from-red-50/70 via-white to-rose-50/30 dark:from-red-950/30 dark:via-slate-900 dark:to-rose-950/20 hover:border-red-500 dark:hover:border-red-400 hover:shadow-md transition-all duration-200 text-left cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-rose-400 to-rose-500 dark:from-rose-500 dark:to-rose-600 text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                  <CalendarRange size={19} />
                </div>
                <div className="min-w-0">
                  <div className="text-13.5 font-bold text-red-600 dark:text-red-400">
                    {t('personal_calendar.delete_scope_all')}
                  </div>
                  <div className="text-12 text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('personal_calendar.delete_scope_all_desc')}
                  </div>
                </div>
              </div>
              {deleteGroupMutation.isPending ? (
                <span className="inline-block h-4 w-4 shrink-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-rose-400 to-rose-500 dark:from-rose-500 dark:to-rose-600 text-white shadow-xs group-hover:translate-x-0.5 transition-transform duration-200">
                  <ArrowRight size={14} />
                </div>
              )}
            </button>
          </div>

          <div className="mt-5 flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending || deleteGroupMutation.isPending}
              className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-13 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {t('personal_calendar.delete_cancel')}
            </button>
          </div>
        </div>
      </Modal>

      <ParticipantDialog
        open={!!participantsTarget}
        onClose={() => setParticipantsTarget(null)}
        participants={participantsTarget ? groupParticipantsByStatus(participantsTarget.participants) : null}
        title={participantsTarget?.title}
      />
    </Box>
  );
};

export default PersonalSchedule;
