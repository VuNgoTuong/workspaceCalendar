import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCalendarRangeSync } from '../components/useCalendarRangeSync';
import dayjs, { type Dayjs } from 'dayjs';
import { Box, Paper, Button } from '@mui/material';
import { DatePicker, Select, Modal, Table, Empty, Pagination, Tooltip, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useStatusTabFromNavigation } from '../components/useStatusTabFromNavigation';
import { EventMetaLine } from '../components/EventMetaLine';
import { MeetingType } from '../../../constants/meetingType';
import { useQuery } from '@tanstack/react-query';
import type { EventContentArg } from '@fullcalendar/core';
import { scheduleOccurrenceAPI } from '../../../services/api/scheduleOccurrenceAPI';
import { mapOccurrenceToRequest } from '../DangKyLichLanhDao/utils/occurrenceAdapter';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Search,
  CalendarOff,
  CalendarX2,
  CalendarCheck2,
  CalendarDays,
  FileCheck,
  Building2,
  Video,
  MoreHorizontal as ModeOther,
  Users,
  Clock,
  ListChecks,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { toast } from '../../../store/toastStore';
import { cn } from '../../../utils/helpers';
import { StatusBadge } from '../../../components/ui';
import { CancelScheduleModal } from '../../../components/shared/CancelScheduleModal';
import { withPriorityColor } from '../../../components/ui/PriorityOption';
import { ScheduleCalendarView } from '../../../components/ui/ScheduleCalendarView';
import { useScheduleTypesQuery } from '../../categories/meeting-type/hooks/useScheduleTypeQueries';
import { useDebounce } from '../../../hooks';
import { usePermission } from '../../../hooks/usePermission';
import { PagedPickerSelect } from '../../../components/ui/PagedPickerSelect';
import { userAPI, type IExecutiveUser } from '../../../services/api/userAPI';
import { fromApiDateTime } from '../../../utils/dateTime';
import { ScheduleOccurrenceStatus, SCHEDULE_OCCURRENCE_EVENT_THEME } from '../../../constants/scheduleOccurrenceStatus';
import type { IScheduleApprovalListParams, IScheduleOccurrenceCalendarItem } from '../../../services/api/scheduleOccurrenceAPI';
import {
  useApprovalLeaderId,
  useApprovalRequestsQuery,
  useApprovalStatsQuery,
  useApprovalCalendarGridQuery,
  useApproveRequestMutation,
  useRejectRequestMutation,
  useCancelApprovalMutation,
  type ApprovalRequestsPage,
} from './hooks/useScheduleApprovalQueries';
import { MEETING_TYPE_BY_MODE, PRIORITY_VALUE_BY_UI, getDisplayApprovalStatus } from './utils/occurrenceAdapter';
import {
  EMPTY_FILTERS,
  type ApprovalFilters,
  type MeetingMode,
  type SchedulePriority,
  type ApprovalStatus,
  type ApprovalRequest,
} from './types';
import { ParticipantDialog } from '../components/ParticipantDialog';
import { LeadershipScheduleDetailModal } from '../DangKyLichLanhDao/components/LeadershipScheduleDetailModal';
import { useExecutiveDirectory } from '../DangKyLichLanhDao/hooks/useExecutiveDirectory';
import { ParticipantsTooltip } from '../components/ParticipantsTooltip';
import { FilterResetButton } from '../components/FilterResetButton';
import { isAutoMonthRange } from '../components/useCalendarRangeSync';
import { PersonAvatar } from '../components/PersonAvatar';

const { RangePicker } = DatePicker;

interface ApprovalActionsProps {
  status: ApprovalStatus;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}

const ApprovalActions: React.FC<ApprovalActionsProps> = ({ status, onApprove, onReject, onCancel }) => {
  const { t } = useTranslation();
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      {status === 'pending' && (
        <>
          <button
            type="button"
            onClick={stop(onApprove)}
            title={t('schedule_approval.action_approve')}
            className="group/btn relative inline-flex items-center justify-center gap-1.5 h-7.5 w-[82px] rounded-full text-white text-11 font-normal transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-95 shrink-0 select-none bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]"
          >
            <CalendarCheck2 size={13} strokeWidth={2.5} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
            <span>{t('schedule_approval.action_approve', { defaultValue: 'Duyệt' })}</span>
          </button>

          <button
            type="button"
            onClick={stop(onReject)}
            title={t('schedule_approval.action_reject')}
            className="group/btn relative inline-flex items-center justify-center gap-1.5 h-7.5 w-[82px] rounded-full text-white text-11 font-normal transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-95 shrink-0 select-none bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]"
          >
            <CalendarX2 size={13} strokeWidth={2.5} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
            <span>{t('schedule_approval.action_reject', { defaultValue: 'Từ chối' })}</span>
          </button>
        </>
      )}

      {status === 'approved' && (
        <button
          type="button"
          onClick={stop(onCancel)}
          title={t('schedule_approval.action_cancel')}
          className="group/btn relative inline-flex items-center justify-center gap-1.5 h-7.5 w-[82px] rounded-full text-white text-11 font-medium transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-95 shrink-0 select-none bg-gradient-to-br from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 hover:brightness-110 shadow-sm shadow-slate-400/30 hover:shadow-md hover:shadow-slate-400/40"
        >
          <CalendarOff size={12} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110 group-hover/btn:-rotate-12" />
          <span>{t('schedule_approval.action_cancel', { defaultValue: 'Hủy lịch' })}</span>
        </button>
      )}
    </div>
  );
};

// Filter

interface ApprovalFilterBarProps {
  filters: ApprovalFilters;
  onChange: (patch: Partial<ApprovalFilters>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  leaderPicker?: React.ReactNode;
  viewToggle?: React.ReactNode;
}

const premiumSelectClass =
  'w-full premium-select h-10 filter-compact !border-[#00529C]/45 dark:!border-blue-500/50 [&_.ant-select-selection-item]:!text-[13px] [&_.ant-select-selection-item]:!font-normal [&_.ant-select-selection-item]:!text-slate-700 dark:[&_.ant-select-selection-item]:!text-slate-200';

const ApprovalFilterBar: React.FC<ApprovalFilterBarProps> = ({
  filters,
  onChange,
  onReset,
  hasActiveFilters,
  searchValue,
  onSearchChange,
  leaderPicker,
  viewToggle,
}) => {
  const { t } = useTranslation();

  const { data: scheduleTypesData } = useScheduleTypesQuery({ PageSize: 100 });
  const typeOptions: { value: string; label: string }[] = useMemo(
    () => [
      { value: 'all', label: t('schedule_approval.filter_type_all') },
      ...(scheduleTypesData?.items || []).map((st) => ({ value: st.id, label: st.name })),
    ],
    [t, scheduleTypesData]
  );

  const modeOptions: { value: MeetingMode | 'all'; label: React.ReactNode }[] = useMemo(
    () => [
      { value: 'all', label: t('schedule_approval.filter_mode_all') },
      {
        value: 'offline',
        label: (
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={13} />
            {t('schedule_approval.mode_offline')}
          </span>
        ),
      },
      {
        value: 'online',
        label: (
          <span className="inline-flex items-center gap-1.5">
            <Video size={13} />
            {t('schedule_approval.mode_online')}
          </span>
        ),
      },
    ],
    [t]
  );

  const priorityOptions = useMemo(
    () => withPriorityColor<{ value: SchedulePriority | 'all'; label: string }>([
      { value: 'all', label: t('schedule_approval.priority_all') },
      { value: 'normal', label: t('schedule_approval.priority_normal') },
      { value: 'urgent', label: t('schedule_approval.priority_urgent') },
    ]),
    [t]
  );

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {leaderPicker && (
        <div className="relative w-full sm:w-[240px]">
          <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
            {t('schedule_approval.filter_leader_label') || 'Lãnh đạo'}
          </span>
          {leaderPicker}
        </div>
      )}
      <div className="relative w-full sm:w-[280px]">
        <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
          {t('schedule_approval.filter_search_label') || 'Tìm kiếm'}
        </span>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('schedule_approval.filter_search_placeholder')}
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border border-[#00529C]/45 dark:border-blue-500/50 bg-white dark:bg-slate-900 dark:text-slate-100 text-[13px] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 hover:border-[#00529C] focus:border-[#00529C] focus:outline-none focus:ring-4 focus:ring-[#00529C]/10"
          />
        </div>
      </div>

      <div className="relative w-full sm:w-72 shrink-0">
        <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
          {t('schedule_approval.filter_date_label') || 'Khoảng thời gian'}
        </span>
        <RangePicker
          size="large"
          aria-label={t('schedule_approval.filter_date_label')}
          className="w-full !h-[38px] !border-[#00529C]/45 dark:!border-blue-500/50 !rounded-xl"
          value={filters.dateRange ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])] : null}
          format="DD/MM/YYYY"
          placeholder={[t('schedule_approval.filter_date_start_placeholder'), t('schedule_approval.filter_date_end_placeholder')]}
          allowClear
          onChange={(dates) => {
            if (!dates || !dates[0] || !dates[1]) return onChange({ dateRange: null });
            onChange({ dateRange: [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] });
          }}
        />
      </div>

      <div className="relative w-full sm:w-[190px]">
        <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
          {t('schedule_approval.filter_type_label') || 'Loại lịch'}
        </span>
        <Select
          size="large"
          value={filters.scheduleTypeId}
          onChange={(v) => onChange({ scheduleTypeId: v })}
          options={typeOptions}
          className={premiumSelectClass}
          classNames={{ popup: { root: 'premium-select-dropdown' } }}
        />
      </div>

      <div className="relative w-full sm:w-[160px]">
        <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
          {t('schedule_approval.filter_mode_label') || 'Hình thức'}
        </span>
        <Select
          size="large"
          value={filters.meetingMode}
          onChange={(v) => onChange({ meetingMode: v })}
          options={modeOptions}
          className={premiumSelectClass}
          classNames={{ popup: { root: 'premium-select-dropdown' } }}
        />
      </div>

      <div className="relative w-full sm:w-[175px]">
        <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
          {t('schedule_approval.filter_priority_label') || 'Mức độ'}
        </span>
        <Select
          size="large"
          value={filters.priority}
          onChange={(v) => onChange({ priority: v })}
          options={priorityOptions}
          className={premiumSelectClass}
          classNames={{ popup: { root: 'premium-select-dropdown' } }}
        />
      </div>

      {hasActiveFilters && (
        <FilterResetButton onClick={onReset} />
      )}

      {viewToggle && <div className="w-full sm:w-auto ml-0 sm:ml-auto flex justify-end">{viewToggle}</div>}
    </div>
  );
};

//Status tabs

type ApprovalTabKey = ApprovalStatus | 'all';

interface ApprovalStatusTabsProps {
  active: ApprovalTabKey;
  onChange: (tab: ApprovalTabKey) => void;
  counts: Record<ApprovalTabKey, number>;
  extra?: React.ReactNode;
}

interface StatusTabConfig {
  key: ApprovalTabKey;
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
    labelKey: 'schedule_approval.tab_all',
    icon: <ListChecks size={19} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5)]',
    titleColorClass: 'text-[#00529C] dark:text-blue-400 font-medium',
    numColorClass: 'text-[#00529C] dark:text-blue-400',
    activeClass: 'border-[#00529C]/50 dark:border-blue-400/60 bg-blue-50/70 dark:bg-blue-950/25',
    hoverClass: 'hover:bg-blue-50/60 hover:border-blue-200 dark:hover:bg-blue-950/20 dark:hover:border-blue-800/40',
  },
  {
    key: 'pending',
    labelKey: 'schedule_approval.tab_pending',
    icon: <Clock size={19} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_4px_10px_-2px_rgba(245,158,11,0.5)]',
    titleColorClass: 'text-amber-600 dark:text-amber-400 font-medium',
    numColorClass: 'text-amber-600 dark:text-amber-400',
    activeClass: 'border-amber-400/50 dark:border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/25',
    hoverClass: 'hover:bg-amber-50/60 hover:border-amber-200 dark:hover:bg-amber-950/20 dark:hover:border-amber-800/40',
  },
  {
    key: 'approved',
    labelKey: 'schedule_approval.tab_approved',
    icon: <CalendarCheck2 size={19} strokeWidth={2} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_4px_10px_-2px_rgba(16,185,129,0.5)]',
    titleColorClass: 'text-emerald-600 dark:text-emerald-400 font-medium',
    numColorClass: 'text-emerald-600 dark:text-emerald-400',
    activeClass: 'border-emerald-500/50 dark:border-emerald-600/60 bg-emerald-50/70 dark:bg-emerald-950/25',
    hoverClass: 'hover:bg-emerald-50/60 hover:border-emerald-200 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-800/40',
  },
  {
    key: 'rejected',
    labelKey: 'schedule_approval.tab_rejected',
    icon: <CalendarX2 size={19} strokeWidth={2} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-[0_4px_10px_-2px_rgba(239,68,68,0.5)]',
    titleColorClass: 'text-rose-600 dark:text-rose-400 font-medium',
    numColorClass: 'text-rose-600 dark:text-rose-400',
    activeClass: 'border-rose-400/50 dark:border-rose-500/60 bg-rose-50/70 dark:bg-rose-950/25',
    hoverClass: 'hover:bg-rose-50/60 hover:border-rose-200 dark:hover:bg-rose-950/20 dark:hover:border-rose-800/40',
  },
  {
    key: 'cancelled',
    labelKey: 'schedule_approval.tab_cancelled',
    icon: <CalendarOff size={21} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-[0_4px_10px_-2px_rgba(100,116,139,0.45)]',
    titleColorClass: 'text-slate-500 dark:text-slate-400 font-medium',
    numColorClass: 'text-slate-500 dark:text-slate-400',
    activeClass: 'border-slate-400/50 dark:border-slate-500/60 bg-slate-100/80 dark:bg-slate-800/40',
    hoverClass: 'hover:bg-slate-50/60 hover:border-slate-200 dark:hover:bg-slate-800/20 dark:hover:border-slate-700/40',
  },
];

const ApprovalStatusTabs: React.FC<ApprovalStatusTabsProps> = ({ active, onChange, counts, extra }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-5 gap-3 flex-1 min-w-0 pt-1">
        {STATUS_TAB_CONFIG.map((tab, idx) => {
          const isActive = active === tab.key;
          return (
            <motion.button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              aria-pressed={isActive}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 30 }}
              whileHover={{ y: -3, transition: { duration: 0.15, ease: 'easeOut' } }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'group relative flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-[background-color,border-color,box-shadow] duration-150 text-left hover:shadow-md overflow-hidden',
                isActive
                  ? tab.activeClass
                  : `bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 ${tab.hoverClass}`
              )}
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:scale-105', tab.iconBgClass)}>
                {tab.icon}
              </div>
              <div className="min-w-0 flex-1 text-left pr-3.5">
                <div className={cn('text-[12px] truncate', tab.titleColorClass)}>
                  {t(tab.labelKey)}
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className={cn('text-[16px] font-semibold leading-none tracking-tight tabular-nums', tab.numColorClass)}>
                    {counts[tab.key] ?? 0}
                  </span>
                  <span className="text-[11.5px] font-normal text-slate-500 dark:text-slate-500">
                    {t('schedule_approval.tab_unit')}
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
      {extra}
    </div>
  );
};

// -------------------------------------------------------------------------------------------
// View mode toggle (Bảng / Lịch) — mirrors LeadershipScheduleRegistration's pattern exactly so
// switching between the approval table and a calendar view feels consistent across features.
type ApprovalViewMode = 'table' | 'calendar';

const ApprovalViewModeToggle: React.FC<{ value: ApprovalViewMode; onChange: (v: ApprovalViewMode) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="relative shrink-0 w-full sm:w-auto">
      <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
        {t('schedule_approval.view_mode_label', { defaultValue: 'Chế độ xem' })}
      </span>
      <div className="flex gap-0.5 h-[38px] items-center p-0.5 bg-slate-50 dark:bg-slate-800/40 rounded-full border border-[#00529C]/45 dark:border-blue-500/50">
        {([
          { key: 'table' as const, label: t('schedule_approval.view_table', { defaultValue: 'Bảng' }), icon: ListChecks },
          { key: 'calendar' as const, label: t('schedule_approval.view_calendar', { defaultValue: 'Lịch' }), icon: CalendarDays },
        ]).map(({ key, label, icon: Icon }) => {
          const isActive = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                'relative flex items-center gap-1.5 h-full px-3.5 rounded-full text-12.5 font-medium transition-colors cursor-pointer',
                isActive ? 'text-[#00529C] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="approval-view-mode-pill"
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
  );
};

// Table

const MODE_META: Record<ApprovalRequest['meetingMode'], { icon: React.ReactNode; labelKey: string }> = {
  offline: { icon: <Building2 size={12} />, labelKey: 'schedule_approval.mode_offline' },
  online: { icon: <Video size={12} />, labelKey: 'schedule_approval.mode_online' },
  other: { icon: <ModeOther size={12} />, labelKey: 'schedule_approval.mode_other' },
};

interface ApprovalTableProps {
  requests: ApprovalRequest[];
  loading?: boolean;
  showStatusColumn: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenDetail: (request: ApprovalRequest) => void;
  onApprove: (request: ApprovalRequest) => void;
  onReject: (request: ApprovalRequest) => void;
  onCancel: (request: ApprovalRequest) => void;
  onViewParticipants: (request: ApprovalRequest) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  offsetHeader?: number;
}

const getApprovalRowStatusClass = (request: ApprovalRequest): string => {
  if (request.priority === 'urgent') {
    return 'row-priority-urgent';
  }
  const status = getDisplayApprovalStatus(request);
  switch (status) {
    case 'pending':
      return 'row-status-pending';
    case 'approved':
      return 'row-status-approved';
    case 'rejected':
      return 'row-status-rejected';
    case 'cancelled':
      return 'row-status-cancelled';
    default:
      return '';
  }
};

const getApprovalMobileStatusClass = (request: ApprovalRequest): string => {
  if (request.priority === 'urgent') {
    return 'bg-rose-50/20 dark:bg-rose-950/15 border-rose-200/40 dark:border-rose-900/30';
  }
  const status = getDisplayApprovalStatus(request);
  switch (status) {
    case 'pending':
      return 'bg-amber-50/20 dark:bg-amber-950/15 border-amber-200/40 dark:border-amber-900/30';
    case 'approved':
      return 'bg-teal-50/20 dark:bg-teal-950/15 border-teal-200/40 dark:border-teal-900/30';
    case 'rejected':
      return 'bg-rose-50/20 dark:bg-rose-950/15 border-rose-200/40 dark:border-rose-900/30';
    case 'cancelled':
      return 'bg-slate-100/30 dark:bg-slate-800/20 border-slate-200/40 dark:border-slate-700/30';
    default:
      return 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800';
  }
};

const ApprovalTable: React.FC<ApprovalTableProps> = React.memo(({
  requests,
  loading,
  showStatusColumn,
  page,
  pageSize,
  total,
  onPageChange,
  onOpenDetail,
  onApprove,
  onReject,
  onCancel,
  onViewParticipants,
  selectedIds,
  onSelectedIdsChange,
}) => {
  const { t } = useTranslation();
  const todayStr = dayjs().format('YYYY-MM-DD');

  const { data: scheduleTypesData } = useScheduleTypesQuery({ PageSize: 100 });
  const scheduleTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    (scheduleTypesData?.items || []).forEach((st) => map.set(st.id, st.name));
    return map;
  }, [scheduleTypesData]);

  const columns = useMemo(
    () =>
      [
        {
          title: t('common.stt') || 'STT',
          key: 'stt',
          width: 50,
          align: 'center' as const,
          render: (_: unknown, __: ApprovalRequest, index: number) => (
            <span className="text-12 font-medium text-slate-500 dark:text-slate-400">
              {(page - 1) * pageSize + index + 1}
            </span>
          ),
        },
        {
          title: t('schedule_approval.col_ticket') || 'Mã',
          key: 'ticket',
          width: 120,
          render: (_: unknown, request: ApprovalRequest) => (
            <span className="font-mono text-11 font-medium text-[#00529C] dark:text-blue-400 whitespace-nowrap">
              {request.ticketNumber}
            </span>
          ),
        },
        {
          title: t('schedule_approval.col_title'),
          key: 'title',
          width: 280,
          render: (_: unknown, request: ApprovalRequest) => {
            const categoryName = request.scheduleTypeName || (request.scheduleTypeId ? scheduleTypeMap.get(request.scheduleTypeId) : undefined);
            return (
              <div className="flex flex-col gap-0.5 py-0.5 max-w-[280px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Tooltip title={request.title} placement="topLeft">
                    <span
                      className="font-medium text-[#00529C] dark:text-blue-400 text-[13px] leading-snug line-clamp-2 cursor-pointer"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {request.title}
                    </span>
                  </Tooltip>
                  {request.priority === 'urgent' && (
                    <Tooltip title={t('schedule_approval.priority_urgent', { defaultValue: 'Khẩn cấp' })}>
                      <AlertCircle size={14} className="text-red-500 dark:text-red-400 shrink-0" />
                    </Tooltip>
                  )}
                </div>

                {categoryName && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                      {categoryName}
                    </span>
                  </div>
                )}
              </div>
            );
          },
        },
        {
          title: t('schedule_approval.col_requester') || 'Người đăng ký',
          key: 'requester',
          width: 170,
          render: (_: unknown, request: ApprovalRequest) => {
            const name = request.requester.name;
            const dept = request.requester.department;
            if (!name) return <span className="text-12 text-slate-400">—</span>;

            return (
              <div className="flex flex-col min-w-0">
                <span className="text-12.5 font-normal text-slate-700 dark:text-slate-200 truncate" title={name}>
                  {name}
                </span>
                {dept && (
                  <span className="text-11 text-slate-400 dark:text-slate-500 truncate" title={dept}>
                    {dept}
                  </span>
                )}
              </div>
            );
          },
        },
        {
          title: t('schedule_approval.col_time'),
          key: 'time',
          width: 140,
          render: (_: unknown, request: ApprovalRequest) => {
            const isToday = request.date === todayStr;
            return (
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-12 font-normal text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {dayjs(request.date).format('DD/MM/YYYY')}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.2 text-[9.5px] font-semibold text-[#00529C] dark:text-blue-400">
                      {t('schedule_approval.today_label')}
                    </span>
                  )}
                </div>
                <span className="text-11.5 font-normal text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {request.startTime} - {request.endTime}
                </span>
              </div>
            );
          },
        },
        {
          title: t('schedule_approval.col_location') || 'Địa điểm & Hình thức',
          key: 'location',
          width: 160,
          render: (_: unknown, request: ApprovalRequest) => {
            const mode = MODE_META[request.meetingMode];
            return (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1 text-11.5 font-normal">
                  {request.meetingMode === 'online' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Video size={12} className="shrink-0" />
                      {t(mode.labelKey)}
                    </span>
                  ) : request.meetingMode === 'offline' ? (
                    <span className="inline-flex items-center gap-1 text-[#00529C] dark:text-blue-400">
                      {mode.icon}
                      {t(mode.labelKey)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      {mode.icon}
                      {t(mode.labelKey)}
                    </span>
                  )}
                </div>
                {request.location ? (
                  <span className="text-11.5 font-normal text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={request.location}>
                    {request.location}
                  </span>
                ) : (
                  <span className="text-11.5 font-normal text-slate-400">—</span>
                )}
              </div>
            );
          },
        },
        {
          title: t('schedule_approval.col_participants') || 'Thành phần tham dự',
          key: 'participants',
          width: 125,
          align: 'center' as const,
          render: (_: unknown, request: ApprovalRequest) => {
            const allParticipants = [
              ...(request.participants.confirmed || []),
              ...(request.participants.pending || []),
              ...(request.participants.rejected || []),
            ];
            const total = allParticipants.length;
            return (
              <ParticipantsTooltip participants={allParticipants}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewParticipants(request);
                  }}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-12 font-medium bg-[#f0f4f8] dark:bg-slate-800/80 text-[#00529C] dark:text-blue-400 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-blue-50 hover:text-[#00529C] hover:border-blue-300 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 transition-all duration-200 shadow-2xs select-none"
                >
                  <Users size={12} className="text-[#00529C] dark:text-blue-400 shrink-0" />
                  <span className="font-medium text-12 text-[#00529C] dark:text-blue-400">
                    {t('schedule_approval.participants_count', { count: total })}
                  </span>
                </button>
              </ParticipantsTooltip>
            );
          },
        },
        ...(showStatusColumn
          ? [
              {
                title: t('schedule_approval.col_status'),
                key: 'status',
                width: 120,
                align: 'center' as const,
                render: (_: unknown, request: ApprovalRequest) => <StatusBadge status={getDisplayApprovalStatus(request)} />,
              },
            ]
          : []),
        {
          title: t('schedule_approval.col_actions'),
          key: 'actions',
          width: 165,
          align: 'center' as const,
          fixed: 'right' as const,
          render: (_: unknown, request: ApprovalRequest) => (
            <ApprovalActions
              status={request.status}
              onApprove={() => onApprove(request)}
              onReject={() => onReject(request)}
              onCancel={() => onCancel(request)}
            />
          ),
        },
      ],
    [t, page, pageSize, todayStr, showStatusColumn]
  );

  return (
    <>
      <div className="hidden md:block">
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          className="custom-table approval-table"
          scroll={{ x: 1300 }}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: onPageChange }}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => onSelectedIdsChange(keys as string[]),
            getCheckboxProps: (request) => ({ disabled: request.status !== 'pending' }),
          }}
          onRow={(request) => ({
            onClick: () => onOpenDetail(request),
            className: cn(
              'cursor-pointer',
              getApprovalRowStatusClass(request)
            ),
          })}
          locale={{
            emptyText: (
              <Empty />
            ),
          }}
        />
      </div>

      <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70">
        {loading ? (
          <div className="flex flex-col gap-2 p-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[68px] rounded-xl bg-slate-100/70 dark:bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16">
            <Empty />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {requests.map((request) => {
              return (
                <motion.div
                  key={request.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'flex flex-col gap-2 px-4 py-3.5 cursor-pointer rounded-xl border transition-colors',
                    getApprovalMobileStatusClass(request)
                  )}
                  onClick={() => onOpenDetail(request)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <PriorityIndicator priority={request.priority} />
                    <StatusBadge status={getDisplayApprovalStatus(request)} />
                  </div>
                  <div className="text-[13px] font-medium text-slate-800 dark:text-slate-100">{request.title}</div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-slate-400 dark:text-slate-500">
                    <span>{dayjs(request.date).format('DD/MM')} · {request.startTime}–{request.endTime}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span>{request.requester.name}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <ParticipantSummary participants={request.participants} onClick={() => onViewParticipants(request)} />
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onApprove(request)}
                        className="h-8 flex-1 rounded-lg border-0 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[12.5px] font-semibold cursor-pointer"
                      >
                        {t('schedule_approval.action_approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(request)}
                        className="h-8 flex-1 rounded-lg border-0 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 text-[12.5px] font-semibold cursor-pointer"
                      >
                        {t('schedule_approval.action_reject')}
                      </button>
                    </div>
                  )}
                  {request.status === 'approved' && (
                    <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onCancel(request)}
                        className="h-8 flex-1 rounded-lg border-0 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 text-[12.5px] font-semibold cursor-pointer"
                      >
                        {t('schedule_approval.action_cancel')}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        {!loading && total > pageSize && (
          <div className="custom-table flex justify-center">
            <Pagination
              size="small"
              current={page}
              pageSize={pageSize}
              total={total}
              onChange={onPageChange}
              showSizeChanger={false}
            />
          </div>
        )}
      </div>
    </>
  );
});

//  Approve / reject confirmation dialogs

interface ApproveConfirmModalProps {
  requests: ApprovalRequest[];
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const ApproveConfirmModal: React.FC<ApproveConfirmModalProps> = ({ requests, onCancel, onConfirm, loading }) => {
  const { t } = useTranslation();
  const single = requests.length === 1 ? requests[0] : null;

  const dialogTitle = single
    ? t('schedule_approval.approve_dialog_title_single', { title: single.title })
    : requests.length > 1
    ? t('schedule_approval.approve_dialog_title_multi', { count: requests.length })
    : t('schedule_approval.approve_confirm_title') || 'Phê duyệt lịch';

  return (
    <Modal
      open={requests.length > 0}
      onCancel={onCancel}
      footer={null}
      centered
      mask={{ closable: false }}
      keyboard={false}
      width={460}
      destroyOnHidden
      closeIcon={<X size={18} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />}
      className="[&_.ant-modal-content]:!p-6 [&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border [&_.ant-modal-content]:!border-slate-100 dark:[&_.ant-modal-content]:!border-slate-800 [&_.ant-modal-content]:!bg-white dark:[&_.ant-modal-content]:!bg-slate-900 [&_.ant-modal-content]:!shadow-2xl"
    >
      <div className="flex flex-col gap-5">
        {/* Header section */}
        <div className="flex items-start gap-3.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 shrink-0 shadow-xs mt-0.5">
            <CalendarCheck2 size={22} />
          </div>
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
              {dialogTitle}
            </h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              {requests.length > 1
                ? t('schedule_approval.approve_confirm_bulk_desc', {
                    count: requests.length,
                    defaultValue: `Bạn có chắc chắn muốn phê duyệt ${requests.length} lịch làm việc đã chọn?`,
                  })
                : t('schedule_approval.approve_confirm_desc', {
                    defaultValue: 'Bạn có chắc chắn muốn phê duyệt lịch làm việc này không?',
                  })}
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
            className="!h-10 !px-5 !rounded-full !border-slate-300 dark:!border-slate-700 !text-slate-700 dark:!text-slate-200 text-[13.5px] font-medium hover:!bg-slate-50 dark:hover:!bg-slate-800"
            sx={{ textTransform: 'none' }}
          >
            {t('common.cancel', { defaultValue: 'Hủy' })}
          </Button>
          <Button
            variant="contained"
            onClick={onConfirm}
            disabled={loading}
            className="!h-10 !px-6 !rounded-full !text-white text-[13.5px] font-semibold active:scale-95 transition-all duration-200 !bg-gradient-to-b !from-emerald-500 !to-emerald-600 hover:!from-emerald-600 hover:!to-emerald-700 !shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]"
            sx={{ textTransform: 'none' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>{t('common.processing', { defaultValue: 'Đang xử lý...' })}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CalendarCheck2 size={16} strokeWidth={2.5} />
                <span>{t('schedule_approval.approve_confirm_ok', { defaultValue: 'Xác nhận phê duyệt' })}</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface RejectDialogProps {
  requests: ApprovalRequest[];
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export const RejectDialog: React.FC<RejectDialogProps> = ({ requests, onCancel, onConfirm, loading }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const single = requests.length === 1 ? requests[0] : null;

  useEffect(() => {
    if (requests.length > 0) {
      setReason('');
      setTouched(false);
    }
  }, [requests]);

  const trimmed = reason.trim();
  const hasError = touched && !trimmed;

  const handleSubmit = () => {
    if (!trimmed) {
      setTouched(true);
      return;
    }
    onConfirm(trimmed);
  };

  const dialogTitle = single
    ? t('schedule_approval.reject_dialog_title_single', { title: single.title })
    : requests.length > 1
    ? t('schedule_approval.reject_dialog_title_multi', { count: requests.length })
    : t('schedule_approval.reject_dialog_title') || 'Từ chối lịch';

  return (
    <Modal
      open={requests.length > 0}
      onCancel={onCancel}
      footer={null}
      centered
      // Opened from MUI detail modals (z-index 1300); antd's default 1000 would sit behind them.
      zIndex={1400}
      mask={{ closable: false }}
      keyboard={false}
      width={480}
      destroyOnHidden
      closeIcon={<X size={18} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />}
      className="[&_.ant-modal-content]:!p-6 [&_.ant-modal-content]:!rounded-3xl [&_.ant-modal-content]:!border [&_.ant-modal-content]:!border-slate-100 dark:[&_.ant-modal-content]:!border-slate-800 [&_.ant-modal-content]:!bg-white dark:[&_.ant-modal-content]:!bg-slate-900 [&_.ant-modal-content]:!shadow-2xl"
    >
      <div className="flex flex-col gap-4.5">
        {/* Header section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 shrink-0 shadow-xs">
            <CalendarOff size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
              {dialogTitle}
            </h3>
            <p className="text-13 text-slate-500 dark:text-slate-400">
              {t('personal_calendar.cancel_confirm_sub_hint') || 'Vui lòng nhập lý do từ chối lịch bên dưới.'}
            </p>
          </div>
        </div>

        {/* Reason Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
            <span>
              {t('schedule_approval.reject_reason_label')} <span className="text-rose-500">*</span>
            </span>
          </label>
          <Input.TextArea
            rows={3.5}
            maxLength={500}
            showCount
            placeholder={t('schedule_approval.reject_reason_placeholder')}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (touched && e.target.value.trim()) setTouched(false);
            }}
            onBlur={() => setTouched(true)}
            className={`!rounded-2xl !text-[13.5px] font-normal dark:!bg-slate-900 !p-0 dark:!text-slate-100 transition-all duration-200 ${
              hasError
                ? '!border-rose-400 dark:!border-rose-500 focus:!border-rose-500'
                : 'border-slate-200 dark:border-slate-700 hover:border-rose-400 focus:border-rose-500'
            }`}
          />
          {hasError && (
            <span className="text-xs font-medium text-rose-500 pl-1 mt-0.5">
              {t('schedule_approval.reject_reason_required')}
            </span>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
            className="!h-10 !px-5 !rounded-full !border-slate-300 dark:!border-slate-700 !text-slate-700 dark:!text-slate-200 text-[13.5px] font-medium"
            sx={{ textTransform: 'none' }}
          >
            {t('schedule_approval.reject_confirm_cancel', { defaultValue: 'Hủy' })}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            className="!h-10 !px-5.5 !rounded-full !bg-gradient-to-b !from-rose-400 !to-rose-500 hover:!from-rose-500 hover:!to-rose-600 !shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)] !text-white text-[13.5px] font-semibold shadow-sm hover:shadow transition-all"
            sx={{ textTransform: 'none' }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>{t('common.processing', { defaultValue: 'Đang xử lý...' })}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CalendarOff size={16} />
                <span>{t('schedule_approval.reject_confirm_ok', { defaultValue: 'Xác nhận từ chối' })}</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Participant summary trigger — the dialog itself is the shared ParticipantDialog

interface ParticipantSummaryProps {
  participants: ApprovalRequest['participants'];
  onClick: () => void;
}

const ParticipantSummary: React.FC<ParticipantSummaryProps> = ({ participants, onClick }) => {
  const { t } = useTranslation();
  const total = participants.confirmed.length + participants.pending.length + participants.rejected.length;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border-0 bg-transparent px-1.5 py-1 text-[12.5px] font-medium text-slate-600 dark:text-slate-300 cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#00529C] dark:hover:text-blue-400"
    >
      <Users size={13} className="shrink-0 text-slate-400" />
      {t('schedule_approval.participants_count', { count: total })}
    </button>
  );
};

interface PriorityIndicatorProps {
  priority: SchedulePriority;
}

const PriorityIndicator: React.FC<PriorityIndicatorProps> = ({ priority }) => {
  const { t } = useTranslation();
  if (priority !== 'urgent') return null;
  return (
    <Tooltip title={t('priority.urgent')}>
      <AlertCircle size={15} className="text-red-500 dark:text-red-400 shrink-0" />
    </Tooltip>
  );
};

// Page

const EXECUTIVE_ADMIN_ROLES = ['administrator', 'admin'];

const fetchExecutives = async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }) => {
  const res = await userAPI.getExecutiveManagement({ searchKeyword: search, PageNumber: page, PageSize: pageSize });
  return { items: res.items || [], total: res.totalCount || 0 };
};

const SURFACE =
  '!rounded-2xl !border !border-slate-100 dark:!border-slate-800/80 !shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:!shadow-none !bg-white dark:!bg-slate-900';

const PAGE_SIZE = 10;
const EMPTY_REQUESTS: ApprovalRequestsPage['items'] = [];
const EMPTY_SCHEDULE_REQUESTS: ApprovalRequestsPage['requests'] = [];

const STATUS_BY_TAB: Record<ApprovalTabKey, ScheduleOccurrenceStatus | undefined> = {
  all: undefined,
  pending: ScheduleOccurrenceStatus.Waiting,
  approved: ScheduleOccurrenceStatus.Approved,
  rejected: ScheduleOccurrenceStatus.Rejected,
  cancelled: ScheduleOccurrenceStatus.Cancelled,
};

export const ScheduleApproval: React.FC = () => {
  const { t } = useTranslation();
  const { hasRawRole } = usePermission();
  const isExecutiveAdmin = hasRawRole(EXECUTIVE_ADMIN_ROLES);
  const defaultLeaderId = useApprovalLeaderId();

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

  const [activeTab, setActiveTab] = useState<ApprovalTabKey>('all');
  useStatusTabFromNavigation(Object.keys(STATUS_BY_TAB) as ApprovalTabKey[], setActiveTab);
  const [filters, setFilters] = useState<ApprovalFilters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<ApprovalViewMode>('calendar');
  const [calendarDate, setCalendarDate] = useState(() => dayjs());
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<IExecutiveUser | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [participantsId, setParticipantsId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [approveTargetIds, setApproveTargetIds] = useState<string[]>([]);
  const [rejectTargetIds, setRejectTargetIds] = useState<string[]>([]);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const leaderId = isExecutiveAdmin ? (selectedLeaderId ?? undefined) : defaultLeaderId;

  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [activeTab, filters, debouncedSearch, leaderId]);

  const handleTablePageChange = useCallback((nextPage: number, nextPageSize: number) => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  }, []);
  const handleOpenDetail = useCallback((r: ApprovalRequest) => setDetailId(r.id), []);
  const handleApprove = useCallback((r: ApprovalRequest) => setApproveTargetIds([r.id]), []);
  const handleReject = useCallback((r: ApprovalRequest) => setRejectTargetIds([r.id]), []);
  const handleCancelRequest = useCallback((r: ApprovalRequest) => setCancelTargetId(r.id), []);
  const handleViewParticipants = useCallback((r: ApprovalRequest) => setParticipantsId(r.id), []);

  const filterParams = useMemo(
    () => ({
      leaderId,
      StartDate: filters.dateRange ? dayjs(filters.dateRange[0]).startOf('day').toISOString() : undefined,
      EndDate: filters.dateRange ? dayjs(filters.dateRange[1]).endOf('day').toISOString() : undefined,
      ScheduleTypeId: filters.scheduleTypeId !== 'all' ? filters.scheduleTypeId : undefined,
      MeetingType: filters.meetingMode !== 'all' ? MEETING_TYPE_BY_MODE[filters.meetingMode] : undefined,
      Priority: filters.priority !== 'all' ? PRIORITY_VALUE_BY_UI[filters.priority] : undefined,
      search: debouncedSearch || undefined,
    }),
    [leaderId, filters, debouncedSearch]
  );

  const listParams = useMemo<IScheduleApprovalListParams>(
    () => ({
      ...filterParams,
      PageNumber: page,
      PageSize: pageSize,
      SortBy: 'StartDate',
      IsAscending: false,
      status: STATUS_BY_TAB[activeTab],
    }),
    [filterParams, activeTab, page, pageSize]
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const urlId = searchParams.get('id') || searchParams.get('occurrenceId');

  useEffect(() => {
    if (urlId) {
      setDetailId(urlId);
    }
  }, [urlId]);

  const handleCloseDetail = useCallback(() => {
    setDetailId(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('id');
        next.delete('occurrenceId');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const { data, isLoading } = useApprovalRequestsQuery(listParams);
  const { data: stats } = useApprovalStatsQuery(filterParams);
  const approveMutation = useApproveRequestMutation();
  const rejectMutation = useRejectRequestMutation();
  const cancelMutation = useCancelApprovalMutation();

  const { data: calendarRawItems, isLoading: isCalendarLoading } = useApprovalCalendarGridQuery({
    year: calendarDate.year(),
    month: calendarDate.month() + 1,
    operatingLeaderId: leaderId,
  });

  const calendarItems = useMemo(() => {
    const items = calendarRawItems ?? [];
    const statusValue = STATUS_BY_TAB[activeTab];
    const meetingType = filters.meetingMode !== 'all' ? MEETING_TYPE_BY_MODE[filters.meetingMode] : undefined;
    const priorityVal = filters.priority !== 'all' ? PRIORITY_VALUE_BY_UI[filters.priority] : undefined;
    const q = debouncedSearch.trim().toLowerCase();

    return items.filter((item) => {
      if (statusValue !== undefined && item.status !== statusValue) return false;
      if (meetingType !== undefined && item.meetingType !== meetingType) return false;
      if (priorityVal !== undefined && item.priority !== priorityVal) return false;
      if (q && !(item.title || '').toLowerCase().includes(q) && !(item.location || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [calendarRawItems, activeTab, filters.meetingMode, filters.priority, debouncedSearch]);

  const calendarEvents = useMemo(
    () =>
      calendarItems.map((item) => ({
        id: item.id,
        title: item.title || '',
        start: fromApiDateTime(item.startDate).toDate(),
        end: fromApiDateTime(item.endDate).toDate(),
        extendedProps: { raw: item },
      })),
    [calendarItems]
  );

  const renderCalendarEventContent = useCallback((arg: EventContentArg) => {
    const item = arg.event.extendedProps?.raw as IScheduleOccurrenceCalendarItem | undefined;
    if (!item) return null;

    const theme = SCHEDULE_OCCURRENCE_EVENT_THEME[item.status] ?? SCHEDULE_OCCURRENCE_EVENT_THEME[ScheduleOccurrenceStatus.Waiting];
    const isTimeGrid = arg.view.type.startsWith('timeGrid');
    const isUrgent = item.priority === 2;
    const startTime = dayjs(arg.event.start ?? undefined).format('HH:mm');
    const endTime = dayjs(arg.event.end ?? undefined).format('HH:mm');

    if (isTimeGrid) {
      const durationMinutes = arg.event.start && arg.event.end ? dayjs(arg.event.end).diff(dayjs(arg.event.start), 'minute') : 60;
      const isShort = durationMinutes <= 30;
      const isMedium = durationMinutes <= 60;
      const eventStyle = cn('border', theme.bg, theme.text, theme.border);

      if (arg.view.type === 'timeGridDay') {
        return (
          <div className={cn('flex flex-col justify-center gap-0.5 px-3 py-1 rounded-lg text-[11.5px] h-full overflow-hidden cursor-pointer transition-opacity hover:opacity-85', eventStyle)}>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <div className="flex items-center gap-1 font-medium shrink-0">
                  <Clock size={11} className="shrink-0" />
                  <span>{startTime} - {endTime}:</span>
                </div>
                <span className="font-medium text-[12px] truncate text-slate-800 dark:text-slate-100">{arg.event.title}</span>
              </div>
              {isUrgent && <AlertCircle size={12} className="shrink-0 text-rose-500 dark:text-rose-400" />}
            </div>
            {!isShort && (
              <EventMetaLine
                location={item.location}
                online={item.meetingType === MeetingType.Online ? true : item.meetingType === MeetingType.Offline ? false : undefined}
              />
            )}
          </div>
        );
      }

      if (isShort) {
        return (
          <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] h-full overflow-hidden cursor-pointer transition-opacity hover:opacity-80', eventStyle)}>
            <Clock size={10} className="shrink-0" />
            <span className="shrink-0 font-medium">{startTime} - {endTime}:</span>
            <span className="truncate font-medium text-slate-800 dark:text-slate-100">{arg.event.title}</span>
            {isUrgent && <AlertCircle size={11} className="shrink-0 text-rose-500 dark:text-rose-400 ml-auto" />}
          </div>
        );
      }

      return (
        <div className={cn('flex flex-col justify-center gap-0.5 px-2 py-1 rounded-lg text-[11.5px] h-full overflow-hidden cursor-pointer transition-opacity hover:opacity-85', eventStyle)}>
          <div className="flex items-center justify-between gap-1 font-medium shrink-0 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <Clock size={11} className="shrink-0" />
              <span className="truncate whitespace-nowrap">{startTime} - {endTime}</span>
            </div>
            {isUrgent && <AlertCircle size={12} className="shrink-0 text-rose-500 dark:text-rose-400" />}
          </div>
          <div className={cn('font-medium text-[12px] leading-snug truncate text-slate-800 dark:text-slate-100', !isMedium && 'line-clamp-2')}>{arg.event.title}</div>
          {!isMedium && item.location && (
            <div className="flex items-center gap-1 text-[11px] opacity-80 truncate">
              <MapPin size={10} className="shrink-0" />
              <span className="truncate">{item.location}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={cn('flex items-center gap-1.5 min-w-0 px-1.5 py-0.5 rounded-md text-[11px] leading-tight cursor-pointer overflow-hidden transition-opacity hover:opacity-80', 'border', theme.bg, theme.text, theme.border)}>
        <Clock size={10} className="shrink-0" />
        <span className="shrink-0 font-medium">{startTime} - {endTime}:</span>
        <span className="truncate font-medium text-slate-800 dark:text-slate-100">{arg.event.title}</span>
        {isUrgent && <AlertCircle size={11} className="shrink-0 text-rose-500 dark:text-rose-400 ml-auto" />}
      </div>
    );
  }, []);

  const requests = data?.items ?? EMPTY_REQUESTS;
  const scheduleRequests = data?.requests ?? EMPTY_SCHEDULE_REQUESTS;
  const { byId: executiveById } = useExecutiveDirectory();

  const activeTargetId = detailId;
  const { data: fetchedOccurrence } = useQuery({
    queryKey: ['single-schedule-occurrence-approval', activeTargetId],
    queryFn: () => scheduleOccurrenceAPI.getScheduleOccurrenceById(activeTargetId!),
    enabled: !!activeTargetId && !scheduleRequests.some((r) => r.id === activeTargetId),
  });

  const fetchedRequest = useMemo(
    () => (fetchedOccurrence ? mapOccurrenceToRequest(fetchedOccurrence) : null),
    [fetchedOccurrence]
  );

  const detailRequest = useMemo(
    () => scheduleRequests.find((r) => r.id === activeTargetId) ?? fetchedRequest,
    [scheduleRequests, activeTargetId, fetchedRequest]
  );

  const participantsRequest = useMemo(() => requests.find((r) => r.id === participantsId) ?? null, [requests, participantsId]);
  const approveTargets = useMemo(() => requests.filter((r) => approveTargetIds.includes(r.id)), [requests, approveTargetIds]);
  const rejectTargets = useMemo(() => requests.filter((r) => rejectTargetIds.includes(r.id)), [requests, rejectTargetIds]);
  const cancelTarget = useMemo(() => requests.find((r) => r.id === cancelTargetId) ?? null, [requests, cancelTargetId]);
  const selectedRequests = useMemo(() => requests.filter((r) => selectedIds.includes(r.id)), [requests, selectedIds]);

  const counts = useMemo(
    () => ({
      pending: stats?.waiting ?? 0,
      approved: stats?.approved ?? 0,
      rejected: stats?.rejected ?? 0,
      cancelled: stats?.cancelled ?? 0,
      all: stats?.total ?? 0,
    }),
    [stats]
  );
  const hasActiveFilters =
    !!searchInput ||
    (!!filters.dateRange &&
      !isAutoMonthRange([dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])], calendarDate, viewMode === 'calendar')) ||
    filters.scheduleTypeId !== 'all' || filters.meetingMode !== 'all' || filters.priority !== 'all';

  const dateRangeValue = useMemo<[Dayjs, Dayjs] | null>(
    () => (filters.dateRange ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])] : null),
    [filters.dateRange]
  );
  const handleDateRangeChange = useCalendarRangeSync({
    active: viewMode === 'calendar',
    calendarDate,
    setCalendarDate,
    range: dateRangeValue,
    setRange: (range) =>
      setFilters((prev) => ({
        ...prev,
        dateRange: range ? [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')] : null,
      })),
  });
  const handleFilterChange = (patch: Partial<ApprovalFilters>) => {
    if ('dateRange' in patch) {
      const { dateRange, ...rest } = patch;
      if (Object.keys(rest).length > 0) setFilters((prev) => ({ ...prev, ...rest }));
      handleDateRangeChange(dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null);
      return;
    }
    setFilters((prev) => ({ ...prev, ...patch }));
  };
  const handleFilterReset = () => {
    setFilters(EMPTY_FILTERS);
    setSearchInput('');
  };

  const handleApproveConfirm = () => {
    if (approveTargets.length === 0) return;
    const ids = approveTargets.map((r) => r.id);
    approveMutation.mutate(ids, {
      onSuccess: () => {
        toast.success(
          ids.length > 1
            ? t('schedule_approval.toast_approve_bulk_success', { count: ids.length })
            : t('schedule_approval.toast_approve_success')
        );
        setApproveTargetIds([]);
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      },
      onError: () => toast.error(t('schedule_approval.toast_mutation_error')),
    });
  };

  const handleRejectConfirm = (reason: string) => {
    if (rejectTargets.length === 0) return;
    const ids = rejectTargets.map((r) => r.id);
    rejectMutation.mutate(
      { ids, reason },
      {
        onSuccess: () => {
          toast.success(
            ids.length > 1
              ? t('schedule_approval.toast_reject_bulk_success', { count: ids.length })
              : t('schedule_approval.toast_reject_success')
          );
          setRejectTargetIds([]);
          setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
          if (detailId && ids.includes(detailId)) setDetailId(null);
        },
        onError: () => toast.error(t('schedule_approval.toast_mutation_error')),
      }
    );
  };

  const handleCancelConfirm = (reason: string) => {
    if (!cancelTarget) return;
    cancelMutation.mutate(
      { id: cancelTarget.id, reason },
      {
        onSuccess: () => {
          toast.success(t('schedule_approval.toast_cancel_success'));
          setCancelTargetId(null);
          setSelectedIds((prev) => prev.filter((id) => id !== cancelTarget.id));
          if (detailId === cancelTarget.id) setDetailId(null);
        },
        onError: () => toast.error(t('schedule_approval.toast_mutation_error')),
      }
    );
  };

  return (
    <Box className="relative flex flex-col gap-4 pb-4 select-none [&_input]:select-text [&_textarea]:select-text">
      {/* Top Header Card (Image 2 design pattern) */}
      <Paper
        ref={stickyHeaderRef}
        className={`${SURFACE} !p-5 flex flex-col gap-4 sticky top-0 z-20 shadow-xs backdrop-blur-md bg-white/95 dark:bg-slate-900/95`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <FileCheck size={20} className="text-[#00529C] dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {t('schedule_approval.title')}
              </h2>
              <p className="text-11.5 text-slate-500 dark:text-slate-400">{t('schedule_approval.subtitle')}</p>
            </div>
          </div>
        </div>

        <ApprovalStatusTabs
          active={activeTab}
          onChange={setActiveTab}
          counts={counts}
        />

        <ApprovalFilterBar
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
          hasActiveFilters={hasActiveFilters}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          viewToggle={<ApprovalViewModeToggle value={viewMode} onChange={setViewMode} />}
          leaderPicker={
            isExecutiveAdmin ? (
              <PagedPickerSelect<IExecutiveUser>
                value={selectedLeaderId ?? undefined}
                onChange={(id, record) => {
                  setSelectedLeaderId(id ? id : null);
                  setSelectedLeader(record ?? null);
                }}
                className="!min-h-[38px] !border-[#00529C]/45 dark:!border-blue-500/50"
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
                  <span className="inline-flex items-center gap-1.5 text-13 font-medium text-slate-800 dark:text-slate-100 truncate">
                    <Users size={13} className="shrink-0 text-slate-400" />
                    {u.fullname}
                  </span>
                )}
                placeholder={t('schedule_approval.select_leader_placeholder')}
              />
            ) : undefined
          }
        />
      </Paper>

      {selectedRequests.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/90 px-4 py-2.5 shadow-2xs">
          <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
            {t('schedule_approval.selected_count', { count: selectedRequests.length })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="relative inline-flex items-center justify-center h-7.5 px-3.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-11 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 transition-all duration-200 ease-out cursor-pointer shadow-2xs active:scale-95 select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0"
            >
              <span>{t('schedule_approval.selection_clear')}</span>
            </button>
            <button
              type="button"
              onClick={() => setApproveTargetIds(selectedRequests.map((r) => r.id))}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-7.5 px-3.5 rounded-full text-white text-11 font-medium transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-95 shrink-0 select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]"
            >
              <CalendarCheck2 size={13} strokeWidth={2.5} className="transition-transform duration-200 group-hover/btn:scale-110" />
              <span>{t('schedule_approval.action_approve_all', { defaultValue: 'Duyệt tất cả' })}</span>
            </button>
            <button
              type="button"
              onClick={() => setRejectTargetIds(selectedRequests.map((r) => r.id))}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-7.5 px-3.5 rounded-full text-white text-11 font-medium transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-95 shrink-0 select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0 bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]"
            >
              <CalendarX2 size={13} strokeWidth={2.5} className="transition-transform duration-200 group-hover/btn:scale-110" />
              <span>{t('schedule_approval.action_reject_all', { defaultValue: 'Từ chối tất cả' })}</span>
            </button>
          </div>
        </div>
      )}

      <div className={viewMode === 'calendar' ? 'block' : 'hidden'}>
        <Paper className={`${SURFACE} !p-4`}>
          <ScheduleCalendarView
            visible={viewMode === 'calendar'}
            events={calendarEvents}
            loading={isCalendarLoading}
            date={calendarDate}
            onDateChange={setCalendarDate}
            onSelectSlot={() => {}}
            onEventClick={(raw: IScheduleOccurrenceCalendarItem) => setDetailId(raw.id)}
            renderEventContent={renderCalendarEventContent}
          />
        </Paper>
      </div>

      <div className={viewMode === 'table' ? 'block' : 'hidden'}>
        <ApprovalTable
          requests={requests}
          loading={isLoading}
          showStatusColumn={activeTab === 'all'}
          page={page}
          pageSize={pageSize}
          total={data?.totalCount ?? 0}
          onPageChange={handleTablePageChange}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
          onOpenDetail={handleOpenDetail}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={handleCancelRequest}
          onViewParticipants={handleViewParticipants}
          offsetHeader={stickyHeaderHeight ? stickyHeaderHeight + 12 : 0}
        />
      </div>

      <LeadershipScheduleDetailModal
        open={!!detailRequest}
        request={detailRequest}
        executiveById={executiveById}
        onClose={handleCloseDetail}
        onApprove={(r) => setApproveTargetIds([r.id])}
        onReject={(r) => setRejectTargetIds([r.id])}
        onCancel={(r) => setCancelTargetId(r.id)}
      />

      <ParticipantDialog
        open={!!participantsRequest}
        onClose={() => setParticipantsId(null)}
        participants={participantsRequest?.participants ?? null}
        title={participantsRequest?.title}
      />

      <ApproveConfirmModal
        requests={approveTargets}
        onCancel={() => setApproveTargetIds([])}
        onConfirm={handleApproveConfirm}
        loading={approveMutation.isPending}
      />

      <RejectDialog
        requests={rejectTargets}
        onCancel={() => setRejectTargetIds([])}
        onConfirm={handleRejectConfirm}
        loading={rejectMutation.isPending}
      />

      <CancelScheduleModal
        open={!!cancelTarget}
        onCancel={() => setCancelTargetId(null)}
        onConfirm={handleCancelConfirm}
        loading={cancelMutation.isPending}
        scheduleTitle={cancelTarget?.title}
        title={t('schedule_approval.cancel_confirm_title')}
      />
    </Box>
  );
};

export default ScheduleApproval;
