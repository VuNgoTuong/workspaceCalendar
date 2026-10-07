import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { DatePicker } from 'antd';
import { Avatar } from '@mui/material';
import { AnimatePresence, motion } from 'motion/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CalendarCheck,
  CalendarPlus,
  CalendarSearch,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Hash,
  Info,
  Lock,
  MapPin,
  UserCheck,
} from 'lucide-react';
import {
  scheduleOccurrenceAPI,
  type IBusyCalendarOccurrence,
  type IBusyCalendarUser,
} from '../../../../services/api/scheduleOccurrenceAPI';
import { fromApiDateTime } from '../../../../utils/dateTime';
import {
  MASKED_SCHEDULE_EVENT_THEME,
  SCHEDULE_OCCURRENCE_EVENT_THEME,
} from '../../../../constants/scheduleOccurrenceStatus';
import { cn, resolveAttachmentUrl } from '../../../../utils/helpers';
import { StatusBadge } from '../../../../components/ui';
import { PagedPickerSelect } from '../../../../components/ui/PagedPickerSelect';
import { userAPI, type IExecutiveUser } from '../../../../services/api/userAPI';
import {
  TRACK_HEIGHT,
  HOUR_PX,
  WINDOW_START_MIN,
  WINDOW_END_MIN,
  COMPACT_BLOCK_HEIGHT,
  blockFontSize,
  buildBlocks,
  minutesToTop,
  toTime,
  classifyLeaderOccurrence,
  occurrencesOnDay,
  startOfWeekMonday,
} from '../utils/scheduleComparisonUtils';
import {
  HOUR_MARKS,
  LeaderMonthView,
  LeaderWeekView,
  NoLeaderOverlay,
  REQUESTER_BUSY_HATCH,
  SlotClickLayer,
  TimelineGuides,
  viewRange,
} from './LeaderCalendarGridViews';

type CalendarViewMode = 'day' | 'week' | 'month';

const VIEW_MODES: { key: CalendarViewMode; labelKey: string }[] = [
  { key: 'day', labelKey: 'leadership_schedule.cmp_view_day' },
  { key: 'week', labelKey: 'leadership_schedule.cmp_view_week' },
  { key: 'month', labelKey: 'leadership_schedule.cmp_view_month' },
];

const DATE_PICKER_TYPE: Record<CalendarViewMode, 'date' | 'week' | 'month'> = { day: 'date', week: 'week', month: 'month' };

const formatPeriodLabel = (mode: CalendarViewMode, d: Dayjs) => {
  if (mode === 'day') return d.format('dddd, DD/MM/YYYY');
  if (mode === 'week') {
    const start = startOfWeekMonday(d);
    return `${start.format('DD/MM')} – ${start.add(6, 'day').format('DD/MM/YYYY')}`;
  }
  return d.format('MMMM, YYYY');
};

export interface LeaderScheduleComparisonViewProps {
  requesterId?: string;
  requesterName?: string;
  requesterAvatarUrl?: string | null;
  executiveId?: string;
  executiveName?: string;
  executiveAvatarUrl?: string | null;
  selectedExecutive?: IExecutiveUser | null;
  onExecutiveChange?: (id: string, exec?: IExecutiveUser | null) => void;
  disabledExecutiveSelect?: boolean;
  /** Day the calendar opens on; browsing afterwards is local to the view. */
  date: Dayjs;
  /** Length of the slot previewed / handed to `onSelectSlot` when clicking free time. */
  durationMinutes?: number;
  onSelectSlot?: (date: string, startTime: string, duration?: number) => void;
  onBackToForm?: () => void;
}

const fetchExecutives = async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }) => {
  const res = await userAPI.getExecutiveManagement({ searchKeyword: search, PageNumber: page, PageSize: pageSize });
  return { items: res.items || [], total: res.totalCount || 0 };
};

const initialsOf = (name?: string) =>
  name?.split(' ').filter(Boolean).slice(-2).map((n) => n[0]).join('').toUpperCase() || '?';

const hasRichContent = (html?: string) => !!html && html.replace(/<[^>]*>/g, '').trim().length > 0;

type SelectedDetailType =
  | { type: 'occurrence'; occurrence: IBusyCalendarOccurrence; isLeader: boolean; label: string }
  | null;

export const LeaderScheduleComparisonView: React.FC<LeaderScheduleComparisonViewProps> = ({
  requesterId,
  requesterName,
  requesterAvatarUrl,
  executiveId,
  executiveName,
  executiveAvatarUrl,
  selectedExecutive,
  onExecutiveChange,
  disabledExecutiveSelect,
  date: initialDate,
  durationMinutes = 30,
  onSelectSlot,
  onBackToForm,
}) => {
  const { t } = useTranslation();
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetailType>(null);
  const [now, setNow] = useState(() => dayjs());
  const [dateOpen, setDateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [date, setDate] = useState<Dayjs>(initialDate);

  useEffect(() => {
    const id = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(id);
  }, []);

  const userIds = useMemo(
    () => Array.from(new Set([requesterId, executiveId].filter((id): id is string => !!id))),
    [requesterId, executiveId]
  );

  const dateKey = date.format('YYYY-MM-DD');
  const [rangeStart, rangeEnd] = useMemo(() => viewRange(viewMode, date), [viewMode, dateKey]);

  const { data, isFetching, isPending } = useQuery<IBusyCalendarUser[]>({
    queryKey: ['leader-busy-calendar-comparison', userIds, rangeStart.valueOf(), rangeEnd.valueOf()],
    queryFn: () =>
      scheduleOccurrenceAPI.getBusyCalendar({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
        userIds,
      }),
    enabled: userIds.length > 0,
    placeholderData: keepPreviousData,
  });
  const isInitialLoading = isPending && isFetching;

  const leaderOccurrences = useMemo(() => {
    if (!executiveId) return [];
    return data?.find((u) => u.userId === executiveId)?.scheduleOccurrences ?? [];
  }, [data, executiveId]);

  const requesterOccurrences = useMemo(() => {
    if (!requesterId) return [];
    return data?.find((u) => u.userId === requesterId)?.scheduleOccurrences ?? [];
  }, [data, requesterId]);

  const leaderBlocks = useMemo(() => buildBlocks(leaderOccurrences, date), [leaderOccurrences, dateKey]);
  const requesterBlocks = useMemo(() => buildBlocks(requesterOccurrences, date), [requesterOccurrences, dateKey]);
  const leaderDayOccurrences = useMemo(() => occurrencesOnDay(leaderOccurrences, date), [leaderOccurrences, dateKey]);

  useEffect(() => {
    if (!executiveId) {
      setSelectedDetail(null);
      return;
    }
    if (viewMode !== 'day') return;
    if (leaderBlocks.length > 0) {
      setSelectedDetail({
        type: 'occurrence',
        occurrence: leaderBlocks[0].occurrence,
        isLeader: true,
        label: executiveName || '',
      });
    } else {
      setSelectedDetail(null);
    }
  }, [dateKey, data, executiveId, leaderBlocks, executiveName, viewMode]);

  const selectOccurrence = (occurrence: IBusyCalendarOccurrence, isLeader: boolean) =>
    setSelectedDetail({
      type: 'occurrence',
      occurrence,
      isLeader,
      label: isLeader ? executiveName || '' : requesterName || t('leadership_schedule.busy_calendar_you'),
    });

  const pickSlot = (dateStr: string, startTime: string) => onSelectSlot?.(dateStr, startTime, durationMinutes);

  const stepPeriod = (dir: 1 | -1) => setDate((d) => d.add(dir, viewMode));

  const isToday = date.isSame(dayjs(), 'day');
  const isCurrentPeriod =
    viewMode === 'week' ? startOfWeekMonday(now).isSame(startOfWeekMonday(date), 'day') : now.isSame(date, viewMode);
  const nowMinutes = now.hour() * 60 + now.minute();
  const showNowLine = isToday && nowMinutes >= WINDOW_START_MIN && nowMinutes <= WINDOW_END_MIN;
  const nowTop = minutesToTop(nowMinutes);

  const trackScrollRef = useRef<HTMLDivElement>(null);
  const headerRowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = trackScrollRef.current;
    if (!el || isInitialLoading) return;
    const headerHeight = headerRowRef.current?.offsetHeight ?? 0;
    const firstBlock = [...leaderBlocks, ...requesterBlocks].sort((a, b) => a.topPx - b.topPx)[0];
    el.scrollTop = firstBlock ? headerHeight + Math.max(0, firstBlock.topPx - HOUR_PX) : 0;
  }, [dateKey, data, isInitialLoading, viewMode]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[calc(100vh-64px)] bg-[#FAFBFD] dark:bg-[#070D1E] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B132B]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
              <UserCheck size={13} className="text-[#00529C] dark:text-blue-400" />
              <span>{t('leadership_schedule.leader_label', { defaultValue: 'Lãnh đạo:' })}</span>
            </span>
            <div className="w-[280px] sm:w-[320px]">
              <PagedPickerSelect<IExecutiveUser>
                value={executiveId}
                onChange={(id, record) => {
                  onExecutiveChange?.(id, record);
                }}
                initialRecord={selectedExecutive ?? undefined}
                fetchPage={fetchExecutives}
                getValue={(e) => e.id}
                getLabel={(e) => e.fullname}
                isOptionDisabled={(e) => e.id === requesterId}
                disabled={disabledExecutiveSelect}
                placeholder={t('leadership_schedule.executive_placeholder', { defaultValue: 'Chọn lãnh đạo...' })}
                pageSize={5}
                pageSizeOptions={[5, 10]}
                optionBorderless
                className="!min-h-[36px] !h-[36px] !rounded-xl !border-slate-200/70 dark:!border-slate-700/60 !bg-white dark:!bg-[#0D162E] !py-0 !px-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:!border-[#00529C]/40 transition-all"
                renderOption={(e) => (
                  <div className="flex items-center gap-2.5 py-0.5">
                    <Avatar
                      src={resolveAttachmentUrl(e.avatarUrl)}
                      slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                      className="!h-7 !w-7 shrink-0 border border-slate-200 dark:border-slate-700 !text-[10px] !font-medium !bg-slate-100 dark:!bg-slate-800 !text-slate-600 dark:!text-slate-300"
                    >
                      {initialsOf(e.fullname)}
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-12.5 font-normal text-slate-800 dark:text-slate-100 truncate">{e.fullname}</div>
                      {(e.positionName || e.jobTitleName || e.departmentName) && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{e.positionName || e.jobTitleName || e.departmentName}</div>
                      )}
                    </div>
                  </div>
                )}
                renderSelected={(e) => (
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      src={resolveAttachmentUrl(e.avatarUrl)}
                      slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                      className="!h-5.5 !w-5.5 shrink-0 border border-slate-200 dark:border-slate-700 !text-[9px] !font-medium !bg-[#00529C] !text-white"
                    >
                      {initialsOf(e.fullname)}
                    </Avatar>
                    <span className="text-12.5 font-normal text-slate-800 dark:text-slate-100 truncate">{e.fullname}</span>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Date Picker Buttons */}
          <div
            className={cn(
              'flex items-center gap-0.5 h-[36px] rounded-xl bg-white dark:bg-[#0D162E] border px-1 transition-colors duration-150',
              dateOpen
                ? '!border-[#00529C] dark:!border-[#0066C7] ring-4 ring-[#00529C]/10 dark:ring-[#0066C7]/15 !shadow-[0_2px_8px_rgba(0,82,156,0.08)]'
                : 'border-slate-200/70 dark:border-slate-700/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
            )}
          >
            <button
              type="button"
              onClick={() => stepPeriod(-1)}
              title={t('leadership_schedule.cmp_prev_period')}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <DatePicker
              value={date}
              picker={DATE_PICKER_TYPE[viewMode]}
              onChange={(d) => d && setDate(d)}
              open={dateOpen}
              onOpenChange={setDateOpen}
              allowClear={false}
              inputReadOnly
              variant="borderless"
              format={(v) => formatPeriodLabel(viewMode, v as Dayjs)}
              styles={{ root: { boxShadow: 'none', outline: 'none' } }}
              className="!w-[190px] !h-6 !rounded-lg !text-xs !font-normal !shadow-none !outline-none [&_input]:!text-xs [&_input]:!cursor-pointer [&_input]:!text-slate-700 [&_input]:!outline-none [&_input]:!shadow-none [&_input]:!border-none [&_input]:capitalize dark:[&_input]:!text-slate-200"
            />
            <button
              type="button"
              onClick={() => stepPeriod(1)}
              title={t('leadership_schedule.cmp_next_period')}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {!isCurrentPeriod && (
            <button
              type="button"
              onClick={() => setDate(dayjs())}
              className="px-3 py-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-[#0D162E] text-xs font-normal text-slate-600 dark:text-slate-300 hover:text-[#00529C] hover:border-[#00529C]/40 hover:bg-blue-50/20 transition-all cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
            >
              {t('common.today', { defaultValue: 'Hôm nay' })}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* View mode: Ngày / Tuần / Tháng */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
            {VIEW_MODES.map(({ key, labelKey }) => {
              const isActive = viewMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setViewMode(key);
                    setSelectedDetail(null);
                  }}
                  className={cn(
                    'relative px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-colors duration-200 cursor-pointer select-none',
                    isActive
                      ? 'text-[#00529C] dark:text-blue-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="leader-calendar-view-pill"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                      className="absolute inset-0 rounded-full bg-white dark:bg-slate-900 shadow-xs ring-1 ring-black/5 dark:ring-white/5"
                    />
                  )}
                  <span className="relative">{t(labelKey)}</span>
                </button>
              );
            })}
          </div>

          {/* Back to Form */}
          {onBackToForm && (
            <button
              type="button"
              onClick={onBackToForm}
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00529C] to-[#0072CE] dark:from-blue-600 dark:to-blue-500 px-4 py-2 text-[12px] font-medium text-white shadow-sm shadow-[#00529C]/25 dark:shadow-blue-500/25 transition-all duration-150 hover:shadow-md hover:shadow-[#00529C]/35 hover:-translate-y-0.5 active:scale-[0.98] select-none cursor-pointer focus:outline-none"
            >
              <CalendarPlus size={14} />
              <span>{t('leadership_schedule.go_to_form', { defaultValue: 'Đi đến Form đăng ký' })}</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN BODY: TIMELINE (2 Cột: Lãnh đạo vs Bạn) + DETAIL PANEL */}
      <div className="flex flex-row flex-1 min-h-0">
        {/* TIMELINE AREA */}
        <div className="relative flex-1 min-w-0 min-h-0 flex flex-col">
          {!executiveId && viewMode !== 'day' && <NoLeaderOverlay />}
          {isFetching && !isInitialLoading && (
            <div className="absolute top-0 inset-x-0 z-[25] h-0.5 overflow-hidden pointer-events-none">
              <div className="h-full w-full bg-gradient-to-r from-transparent via-[#00529C] to-transparent dark:via-blue-400 animate-pulse" />
            </div>
          )}
          {isInitialLoading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400 gap-2">
              <Clock size={16} className="animate-spin text-[#00529C]" />
              <span>{t('common.loading', { defaultValue: 'Đang tải lịch làm việc...' })}</span>
            </div>
          ) : viewMode === 'week' ? (
            <LeaderWeekView
              anchor={date}
              leaderOccurrences={leaderOccurrences}
              requesterOccurrences={requesterOccurrences}
              hasLeader={!!executiveId}
              now={now}
              selectedOccurrenceId={selectedDetail?.occurrence.scheduleOccurrenceId}
              onSelectOccurrence={selectOccurrence}
              durationMinutes={durationMinutes}
              onPickSlot={pickSlot}
            />
          ) : viewMode === 'month' ? (
            <LeaderMonthView
              anchor={date}
              leaderOccurrences={leaderOccurrences}
              requesterOccurrences={requesterOccurrences}
              hasLeader={!!executiveId}
              now={now}
              selectedOccurrenceId={selectedDetail?.occurrence.scheduleOccurrenceId}
              onSelectOccurrence={selectOccurrence}
              onOpenDay={(day) => {
                setDate(day);
                setViewMode('day');
              }}
            />
          ) : (
            <div ref={trackScrollRef} className="flex-1 min-h-0 overflow-auto slim-scroll">
              <div className="flex flex-col min-w-[450px] pb-5">
                {/* Sticky Header: Cột Lãnh đạo và Cột Bạn */}
                <div
                  ref={headerRowRef}
                  className="flex items-center h-[58px] sticky top-0 z-10 bg-white/90 dark:bg-[#070D1E]/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-2"
                >
                  <div className="w-14 shrink-0 flex items-center justify-end pr-3">
                    <span className="text-[9.5px] font-normal text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {t('leadership_schedule.cmp_hour_col')}
                    </span>
                  </div>
                  {/* Column 1 Header: Lãnh đạo */}
                  <div className="flex-1 min-w-[200px] px-2">
                    <div
                      className={cn(
                        "flex items-center justify-between gap-2.5 rounded-xl border px-3.5 h-[44px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all",
                        executiveId
                          ? "border-blue-100/80 dark:border-blue-900/40 bg-gradient-to-r from-blue-50/40 via-white to-white dark:from-blue-950/25 dark:via-[#0D162E] dark:to-[#0D162E]"
                          : "border-dashed border-slate-200/80 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30"
                      )}
                    >
                      {executiveId ? (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar
                            src={resolveAttachmentUrl(executiveAvatarUrl)}
                            sx={{ width: 28, height: 28, fontSize: 11, bgcolor: '#00529C', fontWeight: 500 }}
                            className="ring-1 ring-blue-500/20 shadow-2xs"
                          >
                            {initialsOf(executiveName)}
                          </Avatar>
                          <div className="min-w-0 flex flex-col leading-tight">
                            <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate" title={executiveName}>
                              {executiveName || t('leadership_schedule.leader', { defaultValue: 'Lãnh đạo' })}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-center gap-1.5 mt-0.5">
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span>{t('leadership_schedule.schedules_count', { count: leaderBlocks.length, defaultValue: `${leaderBlocks.length} lịch làm việc` })}</span>
                              </span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                            <UserCheck size={14} />
                          </div>
                          <div className="min-w-0 flex flex-col leading-tight">
                            <span className="text-[12.5px] font-normal text-slate-600 dark:text-slate-300 truncate">
                              {t('leadership_schedule.no_leader_selected', { defaultValue: 'Chưa chọn Lãnh đạo' })}
                            </span>
                            <span className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {t('leadership_schedule.select_leader_toolbar_hint', { defaultValue: 'Chọn ở thanh công cụ phía trên' })}
                            </span>
                          </div>
                        </div>
                      )}
                      <span className="text-[11px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-blue-500/10 text-[#00529C] dark:text-blue-300 border border-blue-500/20 shrink-0">
                        {t('leadership_schedule.leader', { defaultValue: 'Lãnh đạo' })}
                      </span>
                    </div>
                  </div>

                  {/* Column 2 Header: Bạn (Người đăng ký) */}
                  <div className="flex-1 min-w-[200px] px-2">
                    <div className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#0D162E] px-3.5 h-[44px] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={resolveAttachmentUrl(requesterAvatarUrl)}
                          sx={{ width: 28, height: 28, fontSize: 11, bgcolor: '#64748B', fontWeight: 500 }}
                          className="ring-2 ring-slate-400/20 shadow-2xs"
                        >
                          {initialsOf(requesterName)}
                        </Avatar>
                        <div className="min-w-0 flex flex-col leading-tight">
                          <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate" title={requesterName}>
                            {requesterName || t('leadership_schedule.your_personal_schedule', { defaultValue: 'Lịch cá nhân của Bạn' })}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            <span>{t('leadership_schedule.personal_schedules_count', { count: requesterBlocks.length, defaultValue: `${requesterBlocks.length} lịch cá nhân` })}</span>
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 shrink-0">
                        {t('leadership_schedule.you_personal', { defaultValue: 'Cá nhân bạn' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline Hour Grid */}
                <div className="flex relative" style={{ height: TRACK_HEIGHT }}>
                  {/* Time Axis */}
                  <div className="w-14 shrink-0 relative border-r border-slate-100 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-900/10 select-none">
                    {HOUR_MARKS.map((mark) => (
                      <span
                        key={mark}
                        className="absolute right-2.5 text-[10.5px] font-normal text-slate-400 dark:text-slate-500 tabular-nums tracking-tight"
                        style={{ top: Math.max(2, minutesToTop(mark) - 7) }}
                      >
                        {toTime(mark)}
                      </span>
                    ))}
                    {showNowLine && (
                      <span
                        className="absolute -translate-y-1/2 left-1 z-[15] rounded-full bg-rose-500 px-1.5 py-0.5 text-[9.5px] font-medium tabular-nums text-white shadow-xs"
                        style={{ top: nowTop }}
                      >
                        {now.format('HH:mm')}
                      </span>
                    )}
                  </div>

                  {/* COLUMN 1: LÃNH ĐẠO */}
                  <div className="relative flex-1 min-w-[200px] border-r border-slate-100 dark:border-slate-800/80">
                    <TimelineGuides />

                    {/* Bấm vào khoảng trống của Lãnh đạo để đăng ký nhanh */}
                    {executiveId && (
                      <SlotClickLayer
                        date={date}
                        leaderOccurrences={leaderDayOccurrences}
                        durationMinutes={durationMinutes}
                        now={now}
                        onPick={pickSlot}
                      />
                    )}

                    {!executiveId ? (
                      /* CHƯA CHỌN LÃNH ĐẠO: Centered Luxury Prompt Card */
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-[5] max-w-[320px] mx-auto pointer-events-none">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-400/20 dark:to-transparent text-[#00529C] dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 mb-3 shadow-[0_2px_10px_-2px_rgba(0,82,156,0.12)]">
                          <UserCheck size={22} />
                        </div>
                        <h4 className="text-[13.5px] font-medium text-slate-800 dark:text-slate-200 tracking-tight mb-1">
                          {t('leadership_schedule.cmp_no_leader_title')}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-0">
                          {t('leadership_schedule.cmp_no_leader_desc')}
                        </p>
                      </div>
                    ) : leaderBlocks.length === 0 ? (
                      /* LÃNH ĐẠO KHÔNG CÓ LỊCH (z thấp hơn lớp bấm chọn giờ để khung xem trước hiện đè lên) */
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-[2] max-w-[320px] mx-auto pointer-events-none">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-400/20 dark:to-transparent text-[#00529C] dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 mb-3 shadow-xs">
                          <CalendarCheck size={22} />
                        </div>
                        <h4 className="text-[13.5px] font-medium text-slate-800 dark:text-slate-200 tracking-tight mb-1">
                          {t('leadership_schedule.cmp_no_busy_title')}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-0">
                          {t('leadership_schedule.cmp_leader_no_schedule')}
                        </p>
                      </div>
                    ) : (
                      leaderBlocks.map((b) => {
                        const occ = b.occurrence;
                        const classification = classifyLeaderOccurrence(occ);
                        const startLabel = fromApiDateTime(occ.startDate).format('HH:mm');
                        const endLabel = fromApiDateTime(occ.endDate).format('HH:mm');
                        const isSelected = selectedDetail?.type === 'occurrence' && selectedDetail.occurrence.scheduleOccurrenceId === occ.scheduleOccurrenceId;
                        const theme = classification.isMasked ? MASKED_SCHEDULE_EVENT_THEME : SCHEDULE_OCCURRENCE_EVENT_THEME[occ.status];
                        const fontPx = blockFontSize(b.heightPx, b.widthPct);
                        const isCompact = b.heightPx < COMPACT_BLOCK_HEIGHT;
                        const titleText = classification.isMasked ? t('leadership_schedule.masked_schedule') : occ.title;

                        return (
                          <button
                            key={occ.scheduleOccurrenceId}
                            type="button"
                            onClick={() =>
                              setSelectedDetail({
                                type: 'occurrence',
                                occurrence: occ,
                                isLeader: true,
                                label: executiveName || '',
                              })
                            }
                            className={cn(
                              'absolute flex flex-col overflow-hidden text-left border transition-all duration-200 cursor-pointer px-2.5 py-1 z-[4] shadow-[0_1px_4px_rgba(0,0,0,0.03)] focus:outline-none',
                              isCompact ? 'rounded-md' : 'rounded-xl',
                              theme.bg,
                              theme.border,
                              isSelected ? 'opacity-100 shadow-md z-[5]' : 'opacity-90 hover:opacity-100 hover:shadow-md hover:-translate-y-0.5'
                            )}
                            style={{
                              top: b.topPx,
                              height: b.heightPx,
                              left: `calc(4px + (100% - 8px) * ${(b.leftPct / 100).toFixed(4)})`,
                              width: `calc((100% - 8px) * ${(b.widthPct / 100).toFixed(4)} - 2px)`,
                            }}
                          >
                            {isCompact ? (
                              <div className="flex items-center gap-1.5 w-full min-w-0">
                                <span className={cn('flex items-center gap-1 text-[10px] font-normal tracking-tight shrink-0', theme.text)}>
                                  <Clock size={9} className="shrink-0" />
                                  <span>{startLabel}-{endLabel}</span>
                                </span>
                                <span className="truncate font-normal text-slate-800 dark:text-slate-100 text-[10.5px] min-w-0">
                                  {titleText}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between gap-1 w-full">
                                  <span className={cn('flex items-center gap-1 text-[10.5px] font-normal tracking-tight truncate', theme.text)}>
                                    <Clock size={9} className="shrink-0" />
                                    <span>{startLabel} - {endLabel}</span>
                                  </span>
                                  <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-white/80 dark:bg-slate-800/90 font-normal text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 shrink-0 shadow-2xs">
                                    {t(classification.categoryLabelKey)}
                                  </span>
                                </div>
                                <span className="truncate font-normal text-slate-800 dark:text-slate-100 leading-snug mt-0.5" style={{ fontSize: fontPx }}>
                                  {titleText}
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* COLUMN 2: BẠN (CÁ NHÂN NGƯỜI ĐĂNG KÝ) */}
                  <div className="relative flex-1 min-w-[200px]">
                    <TimelineGuides />

                    {/* Các sự kiện bận của Bạn */}
                    {requesterBlocks.length === 0 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-[5] max-w-[320px] mx-auto pointer-events-none">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent dark:from-slate-400/20 dark:to-transparent text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800/50 mb-3 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)]">
                          <CalendarCheck size={22} />
                        </div>
                        <h4 className="text-[13.5px] font-medium text-slate-800 dark:text-slate-200 tracking-tight mb-1">
                          {t('leadership_schedule.cmp_no_busy_title')}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-0">
                          {t('leadership_schedule.cmp_you_no_schedule')}
                        </p>
                      </div>
                    ) : (
                      requesterBlocks.map((b) => {
                        const occ = b.occurrence;
                        const startLabel = fromApiDateTime(occ.startDate).format('HH:mm');
                        const endLabel = fromApiDateTime(occ.endDate).format('HH:mm');
                        const isSelected = selectedDetail?.type === 'occurrence' && selectedDetail.occurrence.scheduleOccurrenceId === occ.scheduleOccurrenceId;
                        const theme = SCHEDULE_OCCURRENCE_EVENT_THEME[occ.status] || MASKED_SCHEDULE_EVENT_THEME;
                        const isCompact = b.heightPx < COMPACT_BLOCK_HEIGHT;

                        return (
                          <button
                            key={occ.scheduleOccurrenceId}
                            type="button"
                            onClick={() =>
                              setSelectedDetail({
                                type: 'occurrence',
                                occurrence: occ,
                                isLeader: false,
                                label: requesterName || t('leadership_schedule.busy_calendar_you'),
                              })
                            }
                            className={cn(
                              'absolute flex flex-col overflow-hidden text-left border transition-all duration-200 cursor-pointer px-2.5 py-1 z-[4] shadow-[0_1px_4px_rgba(0,0,0,0.03)] focus:outline-none',
                              isCompact ? 'rounded-md' : 'rounded-xl',
                              theme.bg,
                              theme.border,
                              isSelected ? 'opacity-100 shadow-md z-[5]' : 'opacity-85 hover:opacity-100 hover:shadow-md hover:-translate-y-0.5'
                            )}
                            style={{
                              top: b.topPx,
                              height: b.heightPx,
                              left: `calc(4px + (100% - 8px) * ${(b.leftPct / 100).toFixed(4)})`,
                              width: `calc((100% - 8px) * ${(b.widthPct / 100).toFixed(4)} - 2px)`,
                            }}
                          >
                            {isCompact ? (
                              <div className="flex items-center gap-1.5 w-full min-w-0">
                                <span className={cn('flex items-center gap-1 text-[10px] font-normal tracking-tight shrink-0', theme.text)}>
                                  <Clock size={9} className="shrink-0" />
                                  <span>{startLabel}-{endLabel}</span>
                                </span>
                                <span className="truncate font-normal text-slate-800 dark:text-slate-100 text-[10.5px] min-w-0">
                                  {occ.title}
                                </span>
                              </div>
                            ) : (
                              <>
                                <span className={cn('flex items-center gap-1 text-[10.5px] font-normal tracking-tight truncate', theme.text)}>
                                  <Clock size={9} className="shrink-0" />
                                  <span>{startLabel} - {endLabel}</span>
                                </span>
                                <span className="truncate font-normal text-slate-800 dark:text-slate-100 leading-snug mt-0.5 text-12">
                                  {occ.title}
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Current Time Laser Indicator */}
                  {showNowLine && (
                    <div
                      className="absolute left-14 right-0 z-[12] pointer-events-none flex items-center"
                      style={{ top: nowTop }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-2 ring-rose-500/25 shadow-xs -ml-0.5 shrink-0" />
                      <span className="flex-1 border-t border-dashed border-rose-500/75" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode !== 'day' && (
            <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-[#0B132B]/80 text-[11.5px] text-slate-500 dark:text-slate-400">
              {/* Chú thích */}
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-[4px] border border-[#BAE6FD] bg-[#F0F9FF] dark:border-sky-700 dark:bg-sky-950/40" />
                {t('leadership_schedule.cmp_legend_leader')}
              </span>
              {viewMode === 'week' ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn(REQUESTER_BUSY_HATCH, 'w-3 h-3 rounded-[4px] border border-slate-300/70 dark:border-slate-600')} />
                  {t('leadership_schedule.cmp_legend_you_busy')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  {t('leadership_schedule.cmp_legend_you_busy')}
                </span>
              )}
              {executiveId && (
                <span className="inline-flex items-center gap-1.5 sm:ml-auto">
                  <Info size={13} className="shrink-0 text-[#00529C] dark:text-blue-400" />
                  {viewMode === 'month'
                    ? t('leadership_schedule.cmp_month_hint')
                    : t('leadership_schedule.cmp_slot_click_hint', { count: durationMinutes })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: DETAIL PANEL */}
        <div className="hidden lg:flex w-[380px] xl:w-[420px] border-l border-slate-100 dark:border-slate-800/80 bg-gradient-to-b from-white/90 via-slate-50/30 to-slate-50/60 dark:from-[#0B132B]/80 dark:via-[#0A1125] dark:to-[#080E1F] flex-col shrink-0">
          <div className="h-[50px] px-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-white/70 dark:bg-[#0B132B]/70 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-[#00529C] dark:text-blue-400" />
              <span className="text-[12.5px] font-medium text-slate-800 dark:text-slate-100 tracking-tight">
                {t('leadership_schedule.cmp_detail_title')}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 slim-scroll">
            <AnimatePresence mode="wait">
              {selectedDetail?.type === 'occurrence' ? (
                /* THẺ CHI TIẾT SỰ KIỆN: LUXURY EVENT CARD */
                <motion.div
                  key={selectedDetail.occurrence.scheduleOccurrenceId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex flex-col gap-4"
                >
                  {(() => {
                    const occ = selectedDetail.occurrence;
                    const classification = classifyLeaderOccurrence(occ);
                    const start = fromApiDateTime(occ.startDate);
                    const end = fromApiDateTime(occ.endDate);
                    const whenLabel = start.isSame(end, 'day')
                      ? `${start.format('dddd, DD/MM/YYYY')} · ${start.format('HH:mm')} - ${end.format('HH:mm')}`
                      : `${start.format('HH:mm DD/MM/YYYY')} - ${end.format('HH:mm DD/MM/YYYY')}`;

                    return (
                      <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#0D162E] shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                            {selectedDetail.isLeader
                              ? t('leadership_schedule.schedule_of', { name: selectedDetail.label, defaultValue: `Lịch của ${selectedDetail.label}` })
                              : t('leadership_schedule.your_schedule', { defaultValue: 'Lịch của Bạn' })}
                          </span>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <h4 className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-800 dark:text-slate-100 m-0 leading-snug">
                            {classification.isMasked && <Lock size={13} className="shrink-0 text-slate-400" />}
                            <span>{classification.isMasked ? t('leadership_schedule.masked_schedule', { defaultValue: 'Lịch bảo mật' }) : occ.title || '—'}</span>
                          </h4>
                          <StatusBadge status={String(occ.status)} size="md" className="shrink-0 mt-0.5" />
                        </div>

                        <div className="flex items-center gap-2 text-xs font-medium text-[#00529C] dark:text-blue-400 px-3 py-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100/60 dark:border-blue-900/40">
                          <Clock size={14} />
                          <span className="tabular-nums capitalize">{whenLabel}</span>
                        </div>

                        {occ.location && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-normal">
                            <MapPin size={14} className="text-slate-400 shrink-0" />
                            <span>{occ.location}</span>
                          </div>
                        )}

                        {occ.code && (
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-normal">
                            <Hash size={13} className="text-slate-400 shrink-0" />
                            <span>{t('leadership_schedule.code_label', { defaultValue: 'Mã' })}: {occ.code}</span>
                          </div>
                        )}

                        {hasRichContent(occ.detailContent) && (
                          <div className="mt-1 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-h-[140px] overflow-y-auto slim-scroll">
                            <div dangerouslySetInnerHTML={{ __html: occ.detailContent }} />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </motion.div>
              ) : (
                /* EMPTY STATE */
                <div className="h-full flex flex-col items-center justify-center text-center p-6 min-h-[260px]">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-400/20 dark:to-transparent flex items-center justify-center text-[#00529C] dark:text-blue-400 mb-3 border border-blue-200/50 dark:border-blue-800/50 shadow-xs">
                    <CalendarSearch size={22} />
                  </div>
                  <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 tracking-tight">
                    {executiveId
                      ? t('leadership_schedule.select_event_hint', { defaultValue: 'Chọn một lịch làm việc' })
                      : t('leadership_schedule.no_leader_selected', { defaultValue: 'Chưa chọn Lãnh đạo' })}
                  </span>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 max-w-[230px] leading-relaxed font-normal">
                    {executiveId
                      ? t('leadership_schedule.select_event_sub_hint', { defaultValue: 'Nhấp vào một sự kiện trên timeline để xem thông tin chi tiết.' })
                      : t('leadership_schedule.no_leader_sub_hint', { defaultValue: 'Vui lòng chọn Lãnh đạo ở thanh công cụ phía trên để xem lịch làm việc chi tiết.' })}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
