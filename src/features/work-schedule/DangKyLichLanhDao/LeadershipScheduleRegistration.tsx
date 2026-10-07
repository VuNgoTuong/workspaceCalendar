import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCalendarRangeSync } from '../components/useCalendarRangeSync';
import dayjs, { type Dayjs } from 'dayjs';
import type { EventContentArg } from '@fullcalendar/core';
import { Box, Paper } from '@mui/material';
import { DatePicker, Select as AntdSelect, Empty, Modal, Pagination, Spin, Table, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useStatusTabFromNavigation } from '../components/useStatusTabFromNavigation';
import { EventMetaLine } from '../components/EventMetaLine';
import {
  Search,
  Check,
  X,
  RotateCcw,
  ListChecks,
  Clock,
  CalendarX,
  CalendarOff,
  CalendarX2,
  CalendarCheck2,
  FileText,
  Building2,
  Video,
  MapPin,
  Users,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  CalendarRange,
  ArrowRight,
  AlertCircle,
  Lock,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { useActingLeaderStore } from '../../../store/actingLeaderStore';
import { usePermission } from '../../../hooks/usePermission';
import { useDebounce } from '../../../hooks';
import { cn, resolveAttachmentUrl } from '../../../utils/helpers';
import { withPriorityColor } from '../../../components/ui/PriorityOption';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { CancelScheduleModal } from '../../../components/shared/CancelScheduleModal';
import { ActionButton, StatusBadge } from '../../../components/ui';
import { ScheduleCalendarView } from '../../../components/ui/ScheduleCalendarView';
import {
  ScheduleOccurrenceStatus,
  SCHEDULE_OCCURRENCE_EVENT_THEME,
  MASKED_SCHEDULE_EVENT_THEME,
} from '../../../constants/scheduleOccurrenceStatus';
import { userAPI, type IExecutiveUser } from '../../../services/api/userAPI';
import { PagedPickerSelect } from '../../../components/ui/PagedPickerSelect';
import type { IScheduleOccurrenceCalendarItem } from '../../../services/api/scheduleOccurrenceAPI';
import { useCanViewConfidential } from '../../../hooks/useCanViewConfidential';
import { useExecutiveDirectory } from './hooks/useExecutiveDirectory';
import { LeadershipScheduleModal, type RequestFormValues } from './components/LeadershipScheduleModal';
import { LeadershipScheduleDetailModal } from './components/LeadershipScheduleDetailModal';
import { meetingTypeFromFormat, priorityValueFromUi, getDisplayStatus, mapCalendarItemToLeadershipRequest } from './utils/occurrenceAdapter';
import {
  ParticipantDialog,
  type ParticipantResponseStatus,
  type ParticipantEntry,
} from '../components/ParticipantDialog';
import {
  useLeadershipRequestsQuery,
  useLeadershipScheduleCalendarGridQuery,
  useLeadershipRequestDetailQuery,
  useLeadershipStatsQuery,
  useCreateLeadershipRequestMutation,
  useUpdateLeadershipRequestMutation,
  useCancelLeadershipRequestMutation,
  useApproveLeadershipRequestMutation,
  useRejectLeadershipRequestMutation,
  useDeleteLeadershipRequestMutation,
  useDeleteLeadershipRequestGroupMutation,
  type LeadershipRequestInput,
} from './hooks/useLeadershipScheduleQueries';
import {
  type ScheduleRequest,
  type RequestStatus,
  type MeetingFormat,
  type SchedulePriority,
  getMeetingFormatOptions,
  getPriorityOptions,
} from './types';
import { ParticipantsTooltip } from '../components/ParticipantsTooltip';
import { FilterResetButton } from '../components/FilterResetButton';
import { isAutoMonthRange } from '../components/useCalendarRangeSync';
import { PersonAvatar } from '../components/PersonAvatar';

const { RangePicker } = DatePicker;

const SURFACE =
  '!rounded-2xl !border !border-slate-100 dark:!border-slate-800/80 !shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:!shadow-none !bg-white dark:!bg-slate-900';

export const execDisplay = (executiveById: Map<string, IExecutiveUser>, executiveId: string) => {
  const exec = executiveById.get(executiveId);
  return {
    exec,
    name: exec?.fullname ?? '',
    title: exec?.positionName || exec?.jobTitleName || exec?.departmentName || '',
  };
};

const initialsOfName = (name: string) =>
  name ? name.split(' ').filter(Boolean).slice(-2).map((n) => n[0]).join('').toUpperCase() : '?';

const AvatarWithFallback: React.FC<{
  src?: string | null;
  name: string;
  className?: string;
  size?: number;
}> = ({ src, name, className, size = 42 }) => {
  const [error, setError] = useState(false);
  const resolvedUrl = src ? resolveAttachmentUrl(src) : null;

  if (resolvedUrl && !error) {
    return (
      <img
        loading="lazy"
        decoding="async"
        src={resolvedUrl}
        alt={name}
        onError={() => setError(true)}
        referrerPolicy="no-referrer"
        className={cn('rounded-full object-contain bg-white shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-xs', className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00529C] to-blue-600 text-white font-semibold text-13 shadow-xs select-none',
        className
      )}
      style={{ width: size, height: size }}
    >
      {initialsOfName(name)}
    </div>
  );
};

export type StatusTabKey = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'draft' | 'completed';

export const matchesStatusTab = (tab: StatusTabKey, status: RequestStatus): boolean => {
  if (tab === 'all') return true;
  if (tab === 'pending') return status === 'pending' || status === 'submitted';
  if (tab === 'approved') return status === 'approved' || status === 'completed';
  return tab === status;
};

const STATUS_BY_TAB: Partial<Record<StatusTabKey, ScheduleOccurrenceStatus>> = {
  pending: ScheduleOccurrenceStatus.Waiting,
  approved: ScheduleOccurrenceStatus.Approved,
  rejected: ScheduleOccurrenceStatus.Rejected,
  cancelled: ScheduleOccurrenceStatus.Cancelled,
  draft: ScheduleOccurrenceStatus.Draft,
};

const CANCELLABLE: ScheduleRequest['status'][] = ['pending', 'submitted', 'approved'];
const EDIT_IN_PLACE: ScheduleRequest['status'][] = ['draft', 'pending', 'submitted'];
const RESUBMIT_ONLY: ScheduleRequest['status'][] = ['cancelled', 'rejected'];

const REQUEST_STATUS_TO_OCCURRENCE_STATUS: Partial<Record<RequestStatus, ScheduleOccurrenceStatus>> = {
  draft: ScheduleOccurrenceStatus.Draft,
  pending: ScheduleOccurrenceStatus.Waiting,
  submitted: ScheduleOccurrenceStatus.Waiting,
  approved: ScheduleOccurrenceStatus.Approved,
  completed: ScheduleOccurrenceStatus.Approved,
  rejected: ScheduleOccurrenceStatus.Rejected,
  cancelled: ScheduleOccurrenceStatus.Cancelled,
};

const CARD_BASE =
  'bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-none hover:shadow-[0_10px_28px_-14px_rgba(15,23,42,0.28)]';

const CARD_WASH: Partial<Record<RequestStatus, string>> = {
  pending: 'border-amber-200/70 hover:border-amber-300/80 dark:border-amber-900/50 dark:hover:border-amber-800/70 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(245,158,11,0.09),transparent_55%)] hover:bg-[radial-gradient(140%_160%_at_100%_0%,rgba(245,158,11,0.18),transparent_65%)]',
  submitted: 'border-amber-200/70 hover:border-amber-300/80 dark:border-amber-900/50 dark:hover:border-amber-800/70 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(245,158,11,0.09),transparent_55%)] hover:bg-[radial-gradient(140%_160%_at_100%_0%,rgba(245,158,11,0.18),transparent_65%)]',
  approved: 'border-teal-200/70 hover:border-teal-300/80 dark:border-teal-900/50 dark:hover:border-teal-800/70 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(20,184,166,0.09),transparent_55%)] hover:bg-[radial-gradient(140%_160%_at_100%_0%,rgba(20,184,166,0.18),transparent_65%)]',
  completed: 'border-teal-200/70 hover:border-teal-300/80 dark:border-teal-900/50 dark:hover:border-teal-800/70 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(20,184,166,0.09),transparent_55%)] hover:bg-[radial-gradient(140%_160%_at_100%_0%,rgba(20,184,166,0.18),transparent_65%)]',
  rejected: 'border-rose-200/70 hover:border-rose-300/80 dark:border-rose-900/50 dark:hover:border-rose-800/70 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(244,63,94,0.08),transparent_55%)] hover:bg-[radial-gradient(140%_160%_at_100%_0%,rgba(244,63,94,0.16),transparent_65%)]',
  cancelled: 'border-slate-200/90 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(100,116,139,0.08),transparent_55%)] hover:bg-[radial-gradient(140%_160%_at_100%_0%,rgba(100,116,139,0.16),transparent_65%)]',
  draft: 'border-dashed border-slate-300/80 hover:border-slate-400/80 dark:border-slate-700 dark:hover:border-slate-600 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(100,116,139,0.06),transparent_55%)] hover:bg-[radial-gradient(140%_160%_at_100%_0%,rgba(100,116,139,0.12),transparent_65%)]',
};

const cardStyleForStatus = (status: RequestStatus, priority?: string): string => {
  if (priority === 'urgent') {
    return cn(CARD_BASE, 'border-rose-200/80 hover:border-rose-300 dark:border-rose-900/60 dark:hover:border-rose-800/80 bg-[radial-gradient(120%_140%_at_100%_0%,rgba(244,63,94,0.1),transparent_55%)] hover:bg-[radial-gradient(140%_160%_at_100%_0%,rgba(244,63,94,0.2),transparent_65%)]');
  }
  return cn(CARD_BASE, CARD_WASH[status] ?? 'border-slate-200/80 hover:border-slate-300/90 dark:border-slate-800/80 dark:hover:border-slate-700');
};


const eventStyleForStatus = (status: RequestStatus) => {
  const occurrenceStatus = REQUEST_STATUS_TO_OCCURRENCE_STATUS[status];
  const theme = occurrenceStatus ? SCHEDULE_OCCURRENCE_EVENT_THEME[occurrenceStatus] : MASKED_SCHEDULE_EVENT_THEME;
  return cn('border', theme.bg, theme.text, theme.border);
};

const groupRequestParticipants = (participants?: ScheduleRequest['participants']) => {
  const result: Record<ParticipantResponseStatus, ParticipantEntry[]> = { confirmed: [], pending: [], rejected: [] };
  (participants || []).forEach((p: any) => {
    let key: ParticipantResponseStatus = 'confirmed';
    const statusVal = p.status ?? p.participationStatus ?? p.responseStatus;
    if (typeof statusVal === 'string') {
      const s = statusVal.toLowerCase();
      if (s.includes('reject') || s.includes('declin') || s.includes('tu choi')) key = 'rejected';
      else if (s.includes('wait') || s.includes('pend') || s.includes('cho')) key = 'pending';
      else key = 'confirmed';
    } else if (typeof statusVal === 'number') {
      if (statusVal === 3 || statusVal === 2) key = 'rejected';
      else if (statusVal === 0 || statusVal === 4) key = 'pending';
      else key = 'confirmed';
    } else {
      key = 'confirmed';
    }
    result[key].push({
      id: p.id || Math.random().toString(),
      name: p.name || p.fullname || p.fullName || '',
      email: p.email,
      code: p.code || p.employeeCode,
      department: p.department || p.departmentName,
      position: p.position || p.positionName || p.jobTitleName,
      avatarUrl: p.avatarUrl || p.avatar,
      rejectReason: p.rejectReason || p.declineReason || p.reason || null,
    });
  });
  return result;
};

interface ScheduleRequestItemProps {
  request: ScheduleRequest;
  executiveById: Map<string, IExecutiveUser>;
  onOpenDetail: (request: ScheduleRequest) => void;
  onViewParticipants: (request: ScheduleRequest) => void;
  onCancel: (request: ScheduleRequest) => void;
  onResubmit: (request: ScheduleRequest) => void;
  onDelete: (request: ScheduleRequest) => void;
  onApprove?: (request: ScheduleRequest) => void;
  onReject?: (request: ScheduleRequest) => void;
}

const ScheduleRequestItemComponent: React.FC<ScheduleRequestItemProps> = ({
  request,
  executiveById,
  onOpenDetail,
  onViewParticipants,
  onCancel,
  onResubmit,
  onDelete,
  onApprove,
  onReject,
}) => {
  const { t } = useTranslation();
  const canView = useCanViewConfidential();
  const { exec, name: executiveName, title: executiveTitle } = execDisplay(executiveById, request.executiveId);
  const firstParticipant = request.participants?.[0];
  const authorName = executiveName || firstParticipant?.name || request.requester?.name || '';
  const authorTitle = executiveTitle || firstParticipant?.position || firstParticipant?.department || request.requester?.department || '';
  const authorAvatarUrl = request.executiveAvatarUrl || exec?.avatarUrl || firstParticipant?.avatarUrl || null;
  const isMasked = request.isConfidential && !canView(request.requester?.id, [request.executiveId]);

  const isDraft = request.status === 'draft';
  const isEditInPlace = EDIT_IN_PLACE.includes(request.status);
  const isResubmitOnly = RESUBMIT_ONLY.includes(request.status);
  const isResubmittable = isEditInPlace || isResubmitOnly;

  const { hasRawRole } = usePermission();
  const isAdmin = hasRawRole(['administrator', 'admin']);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const effectiveViewerId = actingLeaderId || currentUserId;
  const isRequester = !!currentUserId && (request.requester?.id === currentUserId || request.requester?.id === effectiveViewerId);
  const canActAsLeader = isAdmin || (!!effectiveViewerId && request.executiveId === effectiveViewerId && !isRequester);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={() => onOpenDetail(request)}
      className={cn(
        'group relative flex flex-col gap-0 p-3 sm:p-3 rounded-2xl border transition-[background-color,border-color,box-shadow] duration-200 ease-out cursor-pointer overflow-hidden select-none',
        cardStyleForStatus(getDisplayStatus(request), request.priority)
      )}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 text-[#00529C] dark:text-blue-300 transition-colors">
          <div className="flex items-center gap-1.5 font-medium text-13">
            <Clock size={14} className="shrink-0 text-[#00529C] dark:text-blue-400" />
            <span>{request.startTime} - {request.endTime}</span>
          </div>
          <span className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="flex items-center gap-1.5 font-medium text-12 text-slate-500 dark:text-slate-400">
            <CalendarDays size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />
            <span>{dayjs(request.date).format('DD/MM/YYYY')}</span>
          </div>
        </div>

        {/* Code & Status */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <StatusBadge status={getDisplayStatus(request)} />
        </div>
      </div>

      {/* Main Content Block */}
      <div className="flex flex-col">
        {/* Row 1: Title + Priority Badge */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h3 className="text-base sm:text-[15px] font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#00529C] dark:group-hover:text-blue-400 transition-colors line-clamp-1 m-0 tracking-tight leading-snug">
            {isMasked ? (
              <span className="inline-flex items-center gap-1.5 italic text-slate-400 dark:text-slate-500">
                <Lock size={14} className="shrink-0" />
                {t('leadership_schedule.confidential_busy', { defaultValue: 'Lịch bảo mật' })}
              </span>
            ) : (
              request.title
            )}
          </h3>
          {request.priority === 'urgent' && (
            <Tooltip title={t('leadership_schedule.priority_urgent', { defaultValue: 'Khẩn cấp' })}>
              <AlertCircle size={15} className="text-red-500 dark:text-red-400 shrink-0" />
              
            </Tooltip>
          )}
        </div>

        {/* Row 2: "Đăng ký với lãnh đạo:" + Avatar + Author Name & Position */}
        {authorName && (
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-11.5 font-normal text-slate-600 dark:text-slate-400 shrink-0">
              {t('leadership_schedule.registered_with', { defaultValue: 'Đăng ký với lãnh đạo:' })}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <AvatarWithFallback
                src={authorAvatarUrl}
                name={authorName}
                size={26}
              />
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-12 font-medium text-slate-800 dark:text-slate-100 shrink-0 leading-normal">
                  {authorName}
                </span>
                {authorTitle && (
                  <span className="text-11.5 text-slate-500 dark:text-slate-400 font-normal truncate leading-normal">
                    ({authorTitle})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Row 3: Content / Description with uniform font size, weight and color */}
        {!isMasked && request.description && (
          <div className="text-11.5 font-normal text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
            <span>{t('leadership_schedule.content_label', { defaultValue: 'Nội dung' })}: </span>
            <span>{request.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()}</span>
          </div>
        )}
      </div>

      {/* Footer Row: Metadata chips (Pill style like Image 2) & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/80 text-12 text-slate-600 dark:text-slate-400">
        {/* Left: Metadata chips */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {/* Location Chip */}
          {!isMasked && request.location && (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-medium text-12 max-w-[220px] truncate shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              title={request.location}
            >
              <MapPin size={14} className="text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="truncate">{request.location}</span>
            </div>
          )}

          {/* Format Chip */}
          {request.meetingFormat && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-medium text-12 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              {request.meetingFormat === 'online' ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Video size={14} className="shrink-0" />
                  {t(`leadership_schedule.format_${request.meetingFormat}`)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[#00529C] dark:text-blue-400">
                  <Building2 size={14} className="shrink-0" />
                  {t(`leadership_schedule.format_${request.meetingFormat}`)}
                </span>
              )}
            </div>
          )}

          {/* Attendee Count Chip */}
          <ParticipantsTooltip participants={request.participants}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewParticipants(request);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-12 font-medium hover:bg-blue-50 hover:border-blue-300 dark:hover:bg-blue-950/50 dark:hover:border-blue-700 transition-all duration-200 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)] select-none"
            >
              <Users size={14} className="text-[#00529C] dark:text-blue-400 shrink-0" />
              <span className="font-medium text-12 text-[#00529C] dark:text-blue-400">
                {t('leadership_schedule.participants_count', { count: request.participants?.length || 0 })}
              </span>
            </button>
          </ParticipantsTooltip>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 sm:ml-auto" onClick={(e) => e.stopPropagation()}>
          {/* Primary Action */}
          {isResubmittable && (
            <button
              type="button"
              onClick={() => onResubmit(request)}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full text-white text-12.5 font-semibold transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0 bg-gradient-to-r from-[#0066C7] via-[#0082E6] to-[#0066C7] shadow-sm shadow-[#0066C7]/25 hover:shadow-md hover:shadow-[#0066C7]/35"
            >
              {isEditInPlace ? (
                <Pencil size={13} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
              ) : (
                <RotateCcw size={13} className="shrink-0 transition-transform duration-500 group-hover/btn:-rotate-180" />
              )}
              <span>{t(isEditInPlace ? 'leadership_schedule.action_edit' : 'leadership_schedule.action_resubmit')}</span>
            </button>
          )}

          {/* Delete Draft */}
          {isDraft && (
            <button
              type="button"
              onClick={() => onDelete(request)}
              className="relative inline-flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full border border-red-200 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-12 font-semibold hover:bg-red-100/80 shadow-xs hover:shadow-sm transition-all duration-200 ease-out cursor-pointer active:scale-[0.97] hover:-translate-y-0.5 select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0"
            >
              <Trash2 size={13} className="shrink-0" />
              <span>{t('leadership_schedule.action_delete', { defaultValue: 'Xóa nháp' })}</span>
            </button>
          )}

          {/* Cancel Request */}
          {CANCELLABLE.includes(request.status) && (
            <button
              type="button"
              onClick={() => onCancel(request)}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full text-white text-12.5 font-semibold transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0 bg-gradient-to-br from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 shadow-sm shadow-slate-400/30 hover:shadow-md hover:shadow-slate-400/40"
            >
              <CalendarOff size={13} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110 group-hover/btn:-rotate-12" />
              <span>{t('leadership_schedule.action_cancel', { defaultValue: 'Hủy lịch' })}</span>
            </button>
          )}

          {/* Approve / Reject — only when the viewer is the leader this request was registered for */}
          {canActAsLeader && request.status === 'pending' && onReject && (
            <button
              type="button"
              onClick={() => onReject(request)}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full text-white text-12.5 font-semibold transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0 bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]"
            >
              <CalendarX2 size={13} strokeWidth={2.5} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
              <span>{t('schedule_approval.action_reject', { defaultValue: 'Từ chối' })}</span>
            </button>
          )}
          {canActAsLeader && request.status === 'pending' && onApprove && (
            <button
              type="button"
              onClick={() => onApprove(request)}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full text-white text-12.5 font-semibold transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]"
            >
              <CalendarCheck2 size={13} strokeWidth={2.5} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
              <span>{t('schedule_approval.action_approve', { defaultValue: 'Duyệt' })}</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ScheduleRequestItem = React.memo(ScheduleRequestItemComponent);

interface ScheduleRequestListProps {
  requests: ScheduleRequest[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  executiveById: Map<string, IExecutiveUser>;
  loading?: boolean;
  onOpenDetail: (request: ScheduleRequest) => void;
  onViewParticipants: (request: ScheduleRequest) => void;
  onCancel: (request: ScheduleRequest) => void;
  onResubmit: (request: ScheduleRequest) => void;
  onDelete: (request: ScheduleRequest) => void;
  onApprove?: (request: ScheduleRequest) => void;
  onReject?: (request: ScheduleRequest) => void;
}

const INITIAL_LIMIT = 3;
const BATCH_SIZE = 2;

const ScheduleRequestList: React.FC<ScheduleRequestListProps> = ({
  requests,
  totalCount,
  page,
  pageSize,
  onPageChange,
  executiveById,
  loading,
  onOpenDetail,
  onViewParticipants,
  onCancel,
  onResubmit,
  onDelete,
  onApprove,
  onReject,
}) => {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(INITIAL_LIMIT);
    setIsLoadingMore(false);
  }, [page, requests]);

  useEffect(() => {
    if (visibleCount >= requests.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [first] = entries;
        if (first && first.isIntersecting && !isLoadingMore && visibleCount < requests.length) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, requests.length));
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
      observer.disconnect();
    };
  }, [requests.length, visibleCount, isLoadingMore]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[120px] rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="py-16">
        <Empty />
      </div>
    );
  }

  const visibleRequests = requests.slice(0, visibleCount);
  const hasMoreOnPage = visibleCount < requests.length;

  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {visibleRequests.map((request) => (
          <ScheduleRequestItem
            key={request.id}
            request={request}
            executiveById={executiveById}
            onOpenDetail={onOpenDetail}
            onViewParticipants={onViewParticipants}
            onCancel={onCancel}
            onResubmit={onResubmit}
            onDelete={onDelete}
            onApprove={onApprove}
            onReject={onReject}
          />
        ))}
      </AnimatePresence>

      {/* Skeletons while lazy loading more items on current page */}
      {isLoadingMore && (
        <div className="flex flex-col gap-3 pt-1">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-[120px] rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 animate-pulse flex items-center justify-center">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                {t('leadership_schedule.loading_more', { defaultValue: 'Đang tải thêm...' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Sentinel element to trigger intersection observer for remaining items on page */}
      {hasMoreOnPage && <div ref={sentinelRef} className="h-6 w-full pointer-events-none" />}

      {/* Pagination Footer */}
      {!loading && totalCount > 0 && (
        <div className="custom-table flex justify-end items-center pt-4 pb-2 px-2 border-t border-slate-100 dark:border-slate-800">
          <Pagination
            size="small"
            current={page}
            pageSize={pageSize}
            total={totalCount}
            onChange={onPageChange}
            showSizeChanger
            pageSizeOptions={['5', '10', '20', '50', '100']}
            showTotal={(total, range) => `${range[0]}-${range[1]} / ${total} ${t('leadership_schedule.pagination_unit', { defaultValue: 'yêu cầu' })}`}
          />
        </div>
      )}
    </div>
  );
};

const TABLE_ROW_STATUS_CLASS: Partial<Record<ScheduleRequest['status'], string>> = {
  draft: 'row-status-draft',
  pending: 'row-status-pending',
  submitted: 'row-status-pending',
  approved: 'row-status-approved',
  rejected: 'row-status-rejected',
  cancelled: 'row-status-cancelled',
};

interface LeadershipRequestTableProps {
  requests: ScheduleRequest[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  executiveById: Map<string, IExecutiveUser>;
  loading?: boolean;
  onOpenDetail: (request: ScheduleRequest) => void;
  onViewParticipants: (request: ScheduleRequest) => void;
  onCancel: (request: ScheduleRequest) => void;
  onResubmit: (request: ScheduleRequest) => void;
  onDelete: (request: ScheduleRequest) => void;
  onApprove?: (request: ScheduleRequest) => void;
  onReject?: (request: ScheduleRequest) => void;
}

const LeadershipRequestTable: React.FC<LeadershipRequestTableProps> = React.memo(({
  requests,
  totalCount,
  page,
  pageSize,
  onPageChange,
  executiveById,
  loading,
  onOpenDetail,
  onViewParticipants,
  onCancel,
  onResubmit,
  onDelete,
  onApprove,
  onReject,
}) => {
  const { t } = useTranslation();
  const canView = useCanViewConfidential();
  const { hasRawRole } = usePermission();
  const isAdmin = hasRawRole(['administrator', 'admin']);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const effectiveViewerId = actingLeaderId || currentUserId;
  const todayStr = dayjs().format('YYYY-MM-DD');

  const columns = useMemo(
    () => [
      {
        title: t('common.stt') || 'STT',
        key: 'stt',
        width: 50,
        align: 'center' as const,
        render: (_: unknown, __: ScheduleRequest, index: number) => (
          <span className="text-12 font-medium text-slate-500 dark:text-slate-400">{(page - 1) * pageSize + index + 1}</span>
        ),
      },
      {
        title: t('leadership_schedule.col_code', { defaultValue: 'Mã' }),
        key: 'code',
        width: 120,
        render: (_: unknown, request: ScheduleRequest) => (
          <span className="text-11 font-medium text-[#00529C] dark:text-blue-400 whitespace-nowrap">{request.code || '—'}</span>
        ),
      },
      {
        title: t('leadership_schedule.col_title', { defaultValue: 'Tiêu đề / Nội dung' }),
        key: 'title',
        width: 240,
        render: (_: unknown, request: ScheduleRequest) => {
          const isMasked = request.isConfidential && !canView(request.requester?.id, [request.executiveId]);
          return (
            <div className="flex flex-col gap-0.5 py-0.5 max-w-[240px]">
              <div className="flex items-center gap-1.5 min-w-0">
                {isMasked ? (
                  <span className="inline-flex items-center gap-1.5 italic text-[13px] text-slate-400 dark:text-slate-500">
                    <Lock size={13} className="shrink-0" />
                    {t('leadership_schedule.confidential_busy', { defaultValue: 'Lịch bảo mật' })}
                  </span>
                ) : (
                  <Tooltip title={request.title} placement="topLeft">
                    <span
                      className="font-medium text-[#00529C] dark:text-blue-400 text-[13px] leading-snug line-clamp-2 cursor-pointer"
                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {request.title}
                    </span>
                  </Tooltip>
                )}
                {!isMasked && request.isConfidential && (
                  <Tooltip title={t('leadership_schedule.confidential_busy', { defaultValue: 'Lịch bảo mật' })}>
                    <Lock size={13} className="text-red-500 dark:text-red-400 shrink-0" />
                  </Tooltip>
                )}
                {request.priority === 'urgent' && (
                  <Tooltip title={t('leadership_schedule.priority_urgent', { defaultValue: 'Khẩn cấp' })}>
                    <AlertCircle size={14} className="text-red-500 dark:text-red-400 shrink-0" />
                  </Tooltip>
                )}
              </div>
              {!isMasked && request.scheduleTypeName && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {request.scheduleTypeName}
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: t('leadership_schedule.col_leader', { defaultValue: 'Lãnh đạo' }),
        key: 'leader',
        width: 200,
        render: (_: unknown, request: ScheduleRequest) => {
          const { exec, name, title } = execDisplay(executiveById, request.executiveId);
          const leaderName = name || request.executiveName || '';
          if (!leaderName) return <span className="text-12 text-slate-400">—</span>;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <AvatarWithFallback src={request.executiveAvatarUrl || exec?.avatarUrl || null} name={leaderName} size={28} />
              <div className="flex flex-col min-w-0">
                <span className="text-12.5 font-normal text-slate-700 dark:text-slate-200 truncate" title={leaderName}>
                  {leaderName}
                </span>
                {(title || request.executiveTitle) && (
                  <span className="text-11 text-slate-400 dark:text-slate-500 truncate" title={title || request.executiveTitle}>
                    {title || request.executiveTitle}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        title: t('leadership_schedule.col_time', { defaultValue: 'Thời gian' }),
        key: 'time',
        width: 150,
        render: (_: unknown, request: ScheduleRequest) => (
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-12 font-normal text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {dayjs(request.date).format('DD/MM/YYYY')}
              </span>
              {request.date === todayStr && (
                <span className="shrink-0 whitespace-nowrap rounded-full bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.2 text-[9.5px] font-semibold text-[#00529C] dark:text-blue-400">
                  {t('common.today', { defaultValue: 'Hôm nay' })}
                </span>
              )}
            </div>
            <span className="text-11.5 font-normal text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {request.startTime} - {request.endTime}
            </span>
          </div>
        ),
      },
      {
        title: t('leadership_schedule.col_location', { defaultValue: 'Địa điểm & Hình thức' }),
        key: 'location',
        width: 160,
        render: (_: unknown, request: ScheduleRequest) => {
          const isMasked = request.isConfidential && !canView(request.requester?.id, [request.executiveId]);
          return (
            <div className="flex flex-col gap-0.5">
              {request.meetingFormat && (
                <div className="flex items-center gap-1 text-11.5 font-normal">
                  {request.meetingFormat === 'online' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      <Video size={12} className="shrink-0" />
                      {t('leadership_schedule.format_online')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[#00529C] dark:text-blue-400 whitespace-nowrap">
                      <Building2 size={12} className="shrink-0" />
                      {t(`leadership_schedule.format_${request.meetingFormat}`)}
                    </span>
                  )}
                </div>
              )}
              {!isMasked && request.location ? (
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
        title: t('leadership_schedule.col_participants', { defaultValue: 'Thành phần tham dự' }),
        key: 'participants',
        width: 125,
        align: 'center' as const,
        render: (_: unknown, request: ScheduleRequest) => {
          const count = request.participants?.length || 0;
          if (!count) return <span className="text-11 text-slate-400">—</span>;
          return (
            <ParticipantsTooltip participants={request.participants}>
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
                  {t('leadership_schedule.participants_short', { count, defaultValue: '{{count}} người' })}
                </span>
              </button>
            </ParticipantsTooltip>
          );
        },
      },
      {
        title: t('leadership_schedule.col_status', { defaultValue: 'Trạng thái' }),
        key: 'status',
        width: 130,
        align: 'center' as const,
        render: (_: unknown, request: ScheduleRequest) => <StatusBadge status={getDisplayStatus(request)} size="sm" />,
      },
      {
        title: t('leadership_schedule.col_actions', { defaultValue: 'Hành động' }),
        key: 'actions',
        width: 120,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, request: ScheduleRequest) => {
          const isRequester =
            !!currentUserId && (request.requester?.id === currentUserId || request.requester?.id === effectiveViewerId);
          const canActAsLeader = isAdmin || (!!effectiveViewerId && request.executiveId === effectiveViewerId && !isRequester);
          const isEditInPlace = EDIT_IN_PLACE.includes(request.status);
          const isResubmitOnly = RESUBMIT_ONLY.includes(request.status);
          return (
            <div className="flex items-center justify-center gap-0" onClick={(e) => e.stopPropagation()}>
              {canActAsLeader && request.status === 'pending' && onApprove && (
                <ActionButton type="approve" onClick={() => onApprove(request)} />
              )}
              {canActAsLeader && request.status === 'pending' && onReject && (
                <ActionButton type="reject" onClick={() => onReject(request)} />
              )}
              {isEditInPlace && (
                <ActionButton type="edit" tooltip={t('leadership_schedule.action_edit')} onClick={() => onResubmit(request)} />
              )}
              {isResubmitOnly && <ActionButton type="resubmit" onClick={() => onResubmit(request)} />}
              {CANCELLABLE.includes(request.status) && (
                <ActionButton type="cancel" tooltip={t('leadership_schedule.action_cancel')} onClick={() => onCancel(request)} />
              )}
              {request.status === 'draft' && (
                <ActionButton type="delete" tooltip={t('leadership_schedule.action_delete')} onClick={() => onDelete(request)} />
              )}
            </div>
          );
        },
      },
    ],
    [t, page, pageSize, todayStr, canView, executiveById, isAdmin, currentUserId, effectiveViewerId, onViewParticipants, onApprove, onReject, onResubmit, onCancel, onDelete]
  );

  return (
    <Table
      columns={columns}
      dataSource={requests}
      rowKey="id"
      size="small"
      loading={loading}
      className="custom-table [&_.ant-table-tbody>tr:not(.ant-table-measure-row)>td]:!py-1.5 [&_.ant-table-tbody>tr:not(.ant-table-measure-row)>td]:!px-2.5 [&_.ant-table-tbody>tr.ant-table-measure-row>td]:!p-0 [&_.ant-table-tbody>tr.ant-table-measure-row>td]:!h-0 [&_.ant-table-thead>tr>th]:!py-2.5 [&_.ant-table-thead>tr>th]:!px-2.5"
      scroll={{ x: 'max-content' }}
      onRow={(request) => ({
        onClick: () => onOpenDetail(request),
        className: cn(
          'cursor-pointer',
          request.priority === 'urgent' ? 'row-priority-urgent' : TABLE_ROW_STATUS_CLASS[getDisplayStatus(request)]
        ),
      })}
      // Table is size="small"; keep the pager at default size so the page-size select lines up with the page buttons
      pagination={{ current: page, pageSize, total: totalCount, showSizeChanger: true, size: 'middle', onChange: onPageChange }}
      locale={{ emptyText: <Empty /> }}
    />
  );
});

const SURFACE_SUMMARY =
  '!rounded-2xl !border !border-slate-100 dark:!border-slate-800/80 !shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:!shadow-none !bg-white dark:!bg-slate-900';

/** Monday 00:00 of the week containing `date`. */
export const startOfWeekMonday = (date: Dayjs): Dayjs => {
  const day = date.day();
  return date.add(day === 0 ? -6 : 1 - day, 'day').startOf('day');
};

interface WeeklyAgendaProps {
  weekStart: Dayjs;
  /** Requests overlapping the week, sorted by date/time. */
  requests: ScheduleRequest[];
  loading?: boolean;
  executiveById: Map<string, IExecutiveUser>;
  onOpenDetail: (request: ScheduleRequest) => void;
  /** Folds the panel into a slim rail (desktop only). */
  onCollapse?: () => void;
}

const WeeklyAgenda: React.FC<WeeklyAgendaProps> = ({
  weekStart,
  requests,
  loading,
  executiveById,
  onOpenDetail,
  onCollapse,
}) => {
  const { t } = useTranslation();
  const canView = useCanViewConfidential();

  const weekEnd = weekStart.add(6, 'day');
  const isThisWeek = startOfWeekMonday(dayjs()).isSame(weekStart, 'day');
  const todayStr = dayjs().format('YYYY-MM-DD');

  // A multi-day request is listed under every day of the week it covers.
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const day = weekStart.add(i, 'day');
        const dayStr = day.format('YYYY-MM-DD');
        return {
          day,
          dayStr,
          items: requests.filter((r) => r.date <= dayStr && (r.endDate || r.date) >= dayStr),
        };
      }).filter((d) => d.items.length > 0),
    [weekStart, requests]
  );

  return (
    <Paper className={`${SURFACE_SUMMARY} !p-4 flex flex-col`}>
      {/* Header — the week controls wrap below the title when the panel is too narrow for both. */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0 flex-[1_0_auto]">
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white bg-gradient-to-br from-blue-500 to-[#00529C] shadow-[0_4px_10px_-2px_rgba(0,82,156,0.45)]">
            <CalendarDays size={17} />
            {requests.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 text-[10px] font-semibold leading-none tabular-nums text-white">
                {requests.length > 99 ? '99+' : requests.length}
              </span>
            )}
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h2 className="text-13.5 font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap leading-tight">
              {isThisWeek
                ? t('leadership_schedule.agenda_week_title')
                : t('leadership_schedule.agenda_week_range', {
                    start: weekStart.format('DD/MM'),
                    end: weekEnd.format('DD/MM'),
                  })}
            </h2>
            <p className="text-11 text-slate-500 dark:text-slate-500 leading-tight whitespace-nowrap">
              {isThisWeek && `${weekStart.format('dd, DD/MM')} – ${weekEnd.format('dd, DD/MM')}`}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {onCollapse && (
            <Tooltip title={t('dashboard.panel_collapse')} placement="top">
              <button
                type="button"
                onClick={onCollapse}
                aria-label={t('dashboard.panel_collapse')}
                className="hidden md:flex w-6 h-6 shrink-0 items-center justify-center rounded-full border-0 bg-slate-100 dark:bg-slate-800 cursor-pointer text-slate-500 dark:text-slate-400 hover:text-[#00529C] hover:bg-blue-50 dark:hover:bg-slate-700 dark:hover:text-blue-400 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Content */}
      {loading && requests.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Spin />
        </div>
      ) : days.length === 0 ? (
        <div className="py-10">
          <Empty
            image={<CalendarClock size={26} strokeWidth={1.5} className="mx-auto text-slate-300 dark:text-slate-600" />}
            description={
              <span className="text-13 text-slate-400 dark:text-slate-500">{t('leadership_schedule.agenda_week_empty')}</span>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map(({ day, dayStr, items }) => {
            const isToday = dayStr === todayStr;
            return (
              <div key={dayStr} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-12 font-medium capitalize',
                      isToday ? 'text-[#00529C] dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {day.format('dddd, DD/MM')}
                  </span>
                  {isToday && (
                    <span className="px-1.5 py-px rounded-md text-[10px] font-medium bg-blue-50 dark:bg-blue-950/60 text-[#00529C] dark:text-blue-400">
                      {t('common.today')}
                    </span>
                  )}
                  <span className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                </div>

                {items.map((r) => {
                  const isMasked = r.isConfidential && !canView(r.requester?.id, [r.executiveId]);
                  const displayStatus = getDisplayStatus(r);
                  const execName = r.executiveName || execDisplay(executiveById, r.executiveId).name;
                  return (
                    <button
                      key={`${dayStr}-${r.id}`}
                      type="button"
                      onClick={() => onOpenDetail(r)}
                      className={cn(
                        'group flex flex-col gap-1.5 w-full rounded-2xl p-3.5 border text-left cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
                        isMasked
                          ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/90 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'
                          : r.priority === 'urgent'
                            ? 'bg-gradient-to-br from-rose-50/80 via-white to-white dark:from-rose-950/25 dark:via-slate-900 dark:to-slate-900 border-rose-200/90 dark:border-rose-900/60 hover:border-rose-300 dark:hover:border-rose-700'
                            : 'bg-gradient-to-br from-blue-50/70 via-white to-white dark:from-blue-950/25 dark:via-slate-900 dark:to-slate-900 border-blue-200/90 dark:border-blue-900/60 hover:border-blue-300 dark:hover:border-blue-700'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-1.5 py-0.5 -ml-0.5 rounded-md text-11 font-normal tabular-nums shrink-0',
                            isMasked
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              : r.priority === 'urgent'
                                ? 'bg-rose-100/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                : 'bg-blue-50 dark:bg-blue-950/50 text-[#00529C] dark:text-blue-300'
                          )}
                        >
                          <Clock size={11} className="shrink-0" />
                          {r.startTime} - {r.endTime}
                        </span>
                        <StatusBadge status={displayStatus} />
                      </div>

                      <h4
                        className={cn(
                          'my-0.5 text-13.5 font-semibold leading-snug tracking-tight line-clamp-2 transition-colors',
                          isMasked ? 'text-slate-500 dark:text-slate-400' : 'text-[#00529C] dark:text-blue-400'
                        )}
                      >
                        {isMasked ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Lock size={12} className="shrink-0" />
                            {t('leadership_schedule.confidential_busy', { defaultValue: 'Lịch bảo mật' })}
                          </span>
                        ) : (
                          r.title
                        )}
                      </h4>

                      <div className="flex flex-col gap-0.5 text-11.5 text-slate-500 dark:text-slate-400 min-w-0">
                        {execName && (
                          <div className="flex items-center gap-1 min-w-0">
                            <Users size={12} className="shrink-0 text-slate-500 dark:text-slate-500" />
                            <span className="truncate">{execName}</span>
                          </div>
                        )}
                        {!isMasked && (r.location || r.scheduleTypeName) && (
                          <div className="mt-1 flex items-center gap-2 min-w-0">
                            {r.location && (
                              // Same location chip as the list rows (amber pin, soft pill), sized for the narrow panel.
                              <div
                                className="inline-flex items-center gap-1 px-2 py-px rounded-full text-[10.5px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-normal max-w-full min-w-0"
                                title={r.location}
                              >
                                <MapPin size={11} className="shrink-0 text-amber-500 dark:text-amber-400" />
                                <span className="truncate">{r.location}</span>
                              </div>
                            )}
                            {r.scheduleTypeName && (
                              <div
                                className="inline-flex items-center gap-1 px-2 py-px rounded-full text-[10.5px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-[#00529C] dark:text-blue-400 font-normal max-w-[140px] min-w-0 shrink-0"
                                title={r.scheduleTypeName}
                              >
                                <Tag size={10.5} className="shrink-0" />
                                <span className="truncate">{r.scheduleTypeName}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </Paper>
  );
};

const fetchExecutives = async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }) => {
  const res = await userAPI.getExecutiveManagement({ searchKeyword: search, PageNumber: page, PageSize: pageSize });
  return { items: res.items || [], total: res.totalCount || 0 };
};

export const LeadershipScheduleRegistration: React.FC = () => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<StatusTabKey>('all');
  useStatusTabFromNavigation<StatusTabKey>(
    ['all', 'pending', 'approved', 'rejected', 'cancelled', 'draft', 'completed'],
    setActiveTab
  );
  const [searchKeyword, setSearchKeyword] = useState('');
  const debouncedSearch = useDebounce(searchKeyword, 300);
  const [dateFilter, setDateFilter] = useState<[Dayjs, Dayjs] | null>(null);
  const [meetingFormatFilter, setMeetingFormatFilter] = useState<MeetingFormat | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<SchedulePriority | 'all'>('all');

  const { hasRawRole } = usePermission();
  const isAdmin = hasRawRole(['administrator', 'admin']);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const canFilterByLeader = isAdmin && !actingLeaderId;
  const { byId: executiveById } = useExecutiveDirectory();
  const [filterLeaderId, setFilterLeaderId] = useState<string | undefined>(undefined);
  const [filterLeader, setFilterLeader] = useState<IExecutiveUser | null>(null);

  useEffect(() => {
    if (!canFilterByLeader) {
      setFilterLeaderId(undefined);
      setFilterLeader(null);
    }
  }, [canFilterByLeader]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filterParams = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      StartDate: dateFilter ? dateFilter[0].startOf('day').toISOString() : undefined,
      EndDate: dateFilter ? dateFilter[1].endOf('day').toISOString() : undefined,
      MeetingType: meetingFormatFilter !== 'all' ? meetingTypeFromFormat(meetingFormatFilter) : undefined,
      Priority: priorityFilter !== 'all' ? priorityValueFromUi(priorityFilter) : undefined,
      LeaderUserId: canFilterByLeader ? filterLeaderId : undefined,
    }),
    [debouncedSearch, dateFilter, meetingFormatFilter, priorityFilter, canFilterByLeader, filterLeaderId]
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFilter, meetingFormatFilter, priorityFilter, activeTab, filterLeaderId]);

  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
  const [calendarDate, setCalendarDate] = useState(() => dayjs());
  const handleDateFilterChange = useCalendarRangeSync({
    active: viewMode === 'calendar',
    calendarDate,
    setCalendarDate,
    range: dateFilter,
    setRange: setDateFilter,
  });
  const [createSlot, setCreateSlot] = useState<{ date: string; startTime?: string } | null>(null);

  const { data: pageData, isLoading } = useLeadershipRequestsQuery({
    ...filterParams,
    status: STATUS_BY_TAB[activeTab],
    PageNumber: page,
    PageSize: pageSize,
  });
  const requests = pageData?.items ?? [];
  const totalCount = pageData?.totalCount ?? 0;

  const { data: calendarRawItems, isLoading: isCalendarLoading } = useLeadershipScheduleCalendarGridQuery({
    year: calendarDate.year(),
    month: calendarDate.month() + 1,
    filterUserId: canFilterByLeader ? filterLeaderId : undefined,
  });

  // Same status/format/priority/search filters for the calendar grid and the weekly agenda.
  const matchesCalendarFilters = useMemo(() => {
    const statusValue = STATUS_BY_TAB[activeTab];
    const meetingType = meetingFormatFilter !== 'all' ? meetingTypeFromFormat(meetingFormatFilter) : undefined;
    const priorityVal = priorityFilter !== 'all' ? priorityValueFromUi(priorityFilter) : undefined;
    const q = debouncedSearch.trim().toLowerCase();
    return (item: IScheduleOccurrenceCalendarItem) => {
      if (statusValue !== undefined && item.status !== statusValue) return false;
      if (meetingType !== undefined && item.meetingType !== meetingType) return false;
      if (priorityVal !== undefined && item.priority !== priorityVal) return false;
      if (q && !(item.title || '').toLowerCase().includes(q) && !(item.location || '').toLowerCase().includes(q)) return false;
      return true;
    };
  }, [activeTab, meetingFormatFilter, priorityFilter, debouncedSearch]);

  const calendarRequests = useMemo(
    () => (calendarRawItems ?? []).filter(matchesCalendarFilters).map(mapCalendarItemToLeadershipRequest),
    [calendarRawItems, matchesCalendarFilters]
  );

  // Weekly agenda (right panel): its own week navigation, fed by the month calendar API
  // (not the paginated table rows). A week crossing months needs both months.
  // The weekly agenda always shows the current week (its week navigation was removed).
  const [agendaWeekStart] = useState(() => startOfWeekMonday(dayjs()));
  // Weekly agenda can be folded into a slim rail so the calendar gets the full width; remembered per browser.
  const [agendaCollapsed, setAgendaCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('leadership-agenda-collapsed') === '1';
    } catch {
      return false;
    }
  });
  const toggleAgenda = useCallback(() => {
    setAgendaCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('leadership-agenda-collapsed', next ? '1' : '0');
      } catch {
        /* storage unavailable */
      }
      return next;
    });
    // FullCalendar sizes itself on window resize; nudge it once the column width has settled.
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
  }, []);
  const agendaWeekEnd = agendaWeekStart.add(6, 'day');
  const agendaSpansTwoMonths = agendaWeekStart.month() !== agendaWeekEnd.month();
  const { data: agendaStartMonthItems, isLoading: isAgendaStartLoading } = useLeadershipScheduleCalendarGridQuery({
    year: agendaWeekStart.year(),
    month: agendaWeekStart.month() + 1,
    filterUserId: canFilterByLeader ? filterLeaderId : undefined,
  });
  const { data: agendaEndMonthItems, isLoading: isAgendaEndLoading } = useLeadershipScheduleCalendarGridQuery({
    year: agendaWeekEnd.year(),
    month: agendaWeekEnd.month() + 1,
    filterUserId: canFilterByLeader ? filterLeaderId : undefined,
    enabled: agendaSpansTwoMonths,
  });

  const agendaRequests = useMemo(() => {
    const startStr = agendaWeekStart.format('YYYY-MM-DD');
    const endStr = agendaWeekEnd.format('YYYY-MM-DD');
    const merged = new Map<string, IScheduleOccurrenceCalendarItem>();
    [...(agendaStartMonthItems ?? []), ...(agendaSpansTwoMonths ? agendaEndMonthItems ?? [] : [])].forEach((item) =>
      merged.set(item.id, item)
    );
    return [...merged.values()]
      .filter(matchesCalendarFilters)
      .map(mapCalendarItemToLeadershipRequest)
      .filter((r) => r.date <= endStr && (r.endDate || r.date) >= startStr)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaStartMonthItems, agendaEndMonthItems, agendaSpansTwoMonths, agendaWeekStart, matchesCalendarFilters]);
  const isAgendaLoading = isAgendaStartLoading || (agendaSpansTwoMonths && isAgendaEndLoading);

  const calendarEvents = useMemo(
    () =>
      calendarRequests.map((request) => ({
        id: request.id,
        title: request.title,
        start: `${request.date}T${request.startTime}:00`,
        end: `${request.endDate}T${request.endTime}:00`,
        extendedProps: { raw: request },
      })),
    [calendarRequests]
  );

  const renderCalendarEventContent = useCallback((arg: EventContentArg) => {
    const raw = arg.event.extendedProps?.raw as ScheduleRequest | undefined;
    if (!raw) return null;

    const displayStatus = getDisplayStatus(raw);
    const isTimeGrid = arg.view.type.startsWith('timeGrid');

    const isUrgent = raw.priority === 'urgent';

    if (isTimeGrid) {
      const start = arg.event.start;
      const end = arg.event.end;
      const durationMinutes = start && end ? dayjs(end).diff(dayjs(start), 'minute') : 60;
      const isShort = durationMinutes <= 30;
      const isMedium = durationMinutes <= 60;
      const isDayView = arg.view.type === 'timeGridDay';

      if (isDayView) {
        return (
          <div
            className={cn(
              'flex flex-col justify-center gap-0.5 px-3 py-1 rounded-lg text-[11.5px] h-full overflow-hidden cursor-pointer transition-opacity hover:opacity-85',
              eventStyleForStatus(displayStatus)
            )}
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <div className="flex items-center gap-1 font-medium shrink-0">
                  <Clock size={11} className="shrink-0" />
                  <span>{raw.startTime} - {raw.endTime}:</span>
                </div>
                <span className="font-medium text-[12px] truncate text-slate-800 dark:text-slate-100">{arg.event.title}</span>
              </div>
              {isUrgent && (
                <AlertCircle size={12} className="shrink-0 text-rose-500 dark:text-rose-400" />
              )}
            </div>
            {!isShort && (
              <EventMetaLine
                location={raw.location}
                online={raw.meetingFormat ? raw.meetingFormat === 'online' : undefined}
                host={raw.executiveName}
              />
            )}
          </div>
        );
      }

      if (isShort) {
        return (
          <div
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] h-full overflow-hidden cursor-pointer transition-opacity hover:opacity-80',
              eventStyleForStatus(displayStatus)
            )}
          >
            <Clock size={10} className="shrink-0" />
            <span className="shrink-0 font-medium">{raw.startTime} - {raw.endTime}:</span>
            <span className="truncate font-medium text-slate-800 dark:text-slate-100">{arg.event.title}</span>
            {isUrgent && (
              <AlertCircle size={11} className="shrink-0 text-rose-500 dark:text-rose-400 ml-auto" />
            )}
          </div>
        );
      }

      return (
        <div
          className={cn(
            'flex flex-col justify-center gap-0.5 px-2 py-1 rounded-lg text-[11.5px] h-full overflow-hidden cursor-pointer transition-opacity hover:opacity-85',
            eventStyleForStatus(displayStatus)
          )}
        >
          <div className="flex items-center justify-between gap-1 font-medium shrink-0 min-w-0">
            {/* Keep the time on one line; in a narrow (overlapping) column it truncates instead of wrapping */}
            <div className="flex items-center gap-1 min-w-0">
              <Clock size={11} className="shrink-0" />
              <span className="truncate whitespace-nowrap">{raw.startTime} - {raw.endTime}</span>
            </div>
            {isUrgent && (
              <AlertCircle size={12} className="shrink-0 text-rose-500 dark:text-rose-400" />
            )}
          </div>
          <div className={cn('font-medium text-[12px] leading-snug truncate text-slate-800 dark:text-slate-100', !isMedium && 'line-clamp-2')}>{arg.event.title}</div>
          {!isMedium && raw.executiveName && (
            <div className="text-[11px] opacity-80 truncate">
              {t('leadership_schedule.tooltip_host', { defaultValue: 'Chủ trì' })}: {raw.executiveName}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className={cn(
          'flex items-center gap-1.5 min-w-0 px-1.5 py-0.5 rounded-md text-[11px] leading-tight cursor-pointer overflow-hidden transition-opacity hover:opacity-80',
          eventStyleForStatus(displayStatus)
        )}
      >
        <Clock size={10} className="shrink-0" />
        <span className="shrink-0 font-medium">{raw.startTime} - {raw.endTime}:</span>
        <span className="truncate font-medium text-slate-800 dark:text-slate-100">{arg.event.title}</span>
        {isUrgent && (
          <AlertCircle size={11} className="shrink-0 text-rose-500 dark:text-rose-400 ml-auto" />
        )}
      </div>
    );
  }, [t]);

  const { data: stats } = useLeadershipStatsQuery(filterParams);
  const createMutation = useCreateLeadershipRequestMutation();
  const updateMutation = useUpdateLeadershipRequestMutation();
  const cancelMutation = useCancelLeadershipRequestMutation();
  const approveMutation = useApproveLeadershipRequestMutation();
  const rejectMutation = useRejectLeadershipRequestMutation();
  const deleteMutation = useDeleteLeadershipRequestMutation();
  const deleteGroupMutation = useDeleteLeadershipRequestGroupMutation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [resubmitSeedRow, setResubmitSeedRow] = useState<ScheduleRequest | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [participantsTarget, setParticipantsTarget] = useState<ScheduleRequest | null>(null);

  // Deep link from notifications: /lich-lam-viec/dang-ky-lich-lanh-dao?id=<occurrenceId>
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

  const { data: fetchedDetail } = useLeadershipRequestDetailQuery(detailId);
  const detailRequest = fetchedDetail ?? requests.find((r) => r.id === detailId) ?? null;
  // Fall back to the open detail: a request opened from the calendar / weekly agenda may not be on the
  // current table page, and without this the cancel/delete dialogs silently never opened.
  const cancelTarget = useMemo(
    () => (detailRequest?.id === cancelTargetId ? detailRequest : requests.find((r) => r.id === cancelTargetId)) ?? null,
    [requests, cancelTargetId, detailRequest]
  );
  const approveTarget = useMemo(
    () => (detailRequest?.id === approveTargetId ? detailRequest : requests.find((r) => r.id === approveTargetId)) ?? null,
    [requests, approveTargetId, detailRequest]
  );
  const rejectTarget = useMemo(
    () => (detailRequest?.id === rejectTargetId ? detailRequest : requests.find((r) => r.id === rejectTargetId)) ?? null,
    [requests, rejectTargetId, detailRequest]
  );

  const currentUserId = useAuthStore((s) => s.user?.id);
  const effectiveViewerId = actingLeaderId || currentUserId;
  const isRequesterForDetail = !!detailRequest && !!currentUserId && (detailRequest.requester?.id === currentUserId || detailRequest.requester?.id === effectiveViewerId);
  const canActAsLeaderForDetail = isAdmin || (!!detailRequest && !!effectiveViewerId && detailRequest.executiveId === effectiveViewerId && !isRequesterForDetail);
  const deleteTarget = useMemo(
    () => (detailRequest?.id === deleteTargetId ? detailRequest : requests.find((r) => r.id === deleteTargetId)) ?? null,
    [requests, deleteTargetId, detailRequest]
  );
  const { data: deleteTargetDetail, isLoading: isDeleteTargetDetailLoading } = useLeadershipRequestDetailQuery(deleteTargetId);
  const deleteTargetIsGroup = deleteTargetDetail?.isGroupSchedule ?? false;
  const deleteGroupScheduleId = deleteTargetDetail?.scheduleId ?? deleteTarget?.scheduleId;
  const deleteChoicePending = !!deleteTarget && isDeleteTargetDetailLoading && !deleteTargetDetail;

  const counts = useMemo(
    () =>
      ({
        all: stats?.total ?? 0,
        pending: stats?.waiting ?? 0,
        approved: stats?.approved ?? 0,
        rejected: stats?.rejected ?? 0,
        cancelled: stats?.cancelled ?? 0,
        draft: stats?.draft ?? 0,
      }) as Record<StatusTabKey, number>,
    [stats]
  );

  const statCards: {
    key: StatusTabKey;
    label: string;
    value: number;
    unit: string;
    icon: React.ReactNode;
    iconBgClass: string;
    titleColorClass: string;
    numColorClass: string;
    hoverClass: string;
    activeBorderClass: string;
  }[] = useMemo(
    () => [
      {
        key: 'all',
        label: t('leadership_schedule.tab_all'),
        value: counts.all,
        unit: t('leadership_schedule.unit_request'),
        icon: <ListChecks size={18} className="text-white" />,
        iconBgClass: 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5)]',
        titleColorClass: 'text-[#00529C] dark:text-blue-400 font-medium',
        numColorClass: 'text-[#00529C] dark:text-blue-400',
        hoverClass: 'hover:bg-blue-50/60 hover:border-blue-200 dark:hover:bg-blue-950/20 dark:hover:border-blue-800/40',
        activeBorderClass: 'border-[#00529C]/50 dark:border-blue-400/60 bg-blue-50/70 dark:bg-blue-950/25',
      },
      {
        key: 'pending',
        label: t('leadership_schedule.tab_pending'),
        value: counts.pending,
        unit: t('leadership_schedule.unit_request'),
        icon: <Clock size={18} className="text-white" />,
        iconBgClass: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_4px_10px_-2px_rgba(245,158,11,0.5)]',
        titleColorClass: 'text-amber-600 dark:text-amber-400 font-medium',
        numColorClass: 'text-amber-600 dark:text-amber-400',
        hoverClass: 'hover:bg-amber-50/60 hover:border-amber-200 dark:hover:bg-amber-950/20 dark:hover:border-amber-800/40',
        activeBorderClass: 'border-amber-400/50 dark:border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/25',
      },
      {
        key: 'approved',
        label: t('leadership_schedule.tab_approved'),
        value: counts.approved,
        unit: t('leadership_schedule.unit_request'),
        icon: <CalendarCheck2 size={18} strokeWidth={2} className="text-white" />,
        iconBgClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_4px_10px_-2px_rgba(16,185,129,0.5)]',
        titleColorClass: 'text-emerald-600 dark:text-emerald-400 font-medium',
        numColorClass: 'text-emerald-600 dark:text-emerald-400',
        hoverClass: 'hover:bg-emerald-50/60 hover:border-emerald-200 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-800/40',
        activeBorderClass: 'border-emerald-500/50 dark:border-emerald-600/60 bg-emerald-50/70 dark:bg-emerald-950/25',
      },
      {
        key: 'rejected',
        label: t('leadership_schedule.tab_rejected'),
        value: counts.rejected,
        unit: t('leadership_schedule.unit_request'),
        icon: <CalendarX2 size={18} strokeWidth={2} className="text-white" />,
        iconBgClass: 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-[0_4px_10px_-2px_rgba(239,68,68,0.5)]',
        titleColorClass: 'text-rose-600 dark:text-rose-400 font-medium',
        numColorClass: 'text-rose-600 dark:text-rose-400',
        hoverClass: 'hover:bg-rose-50/60 hover:border-rose-200 dark:hover:bg-rose-950/20 dark:hover:border-rose-800/40',
        activeBorderClass: 'border-rose-400/50 dark:border-rose-500/60 bg-rose-50/70 dark:bg-rose-950/25',
      },
      {
        key: 'cancelled',
        label: t('leadership_schedule.tab_cancelled'),
        value: counts.cancelled,
        unit: t('leadership_schedule.unit_request'),
        icon: <CalendarOff size={20} className="text-white" />,
        iconBgClass: 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-[0_4px_10px_-2px_rgba(100,116,139,0.45)]',
        titleColorClass: 'text-slate-500 dark:text-slate-400 font-medium',
        numColorClass: 'text-slate-500 dark:text-slate-400',
        hoverClass: 'hover:bg-slate-50/40 hover:border-slate-200 dark:hover:bg-slate-950/10 dark:hover:border-slate-800/30',
        activeBorderClass: 'border-slate-400/50 dark:border-slate-500/60 bg-slate-100/80 dark:bg-slate-800/40',
      },
      {
        key: 'draft',
        label: t('leadership_schedule.tab_draft'),
        value: counts.draft,
        unit: t('leadership_schedule.unit_draft'),
        icon: <FileText size={18} className="text-white" />,
        iconBgClass: 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-[0_4px_10px_-2px_rgba(71,85,105,0.5)]',
        titleColorClass: 'text-slate-600 dark:text-slate-400 font-medium',
        numColorClass: 'text-slate-600 dark:text-slate-400',
        hoverClass: 'hover:bg-slate-50/60 hover:border-slate-200 dark:hover:bg-slate-800/20 dark:hover:border-slate-700/40',
        activeBorderClass: 'border-slate-400/50 dark:border-slate-500/60 bg-slate-100/80 dark:bg-slate-800/40',
      },
    ],
    [counts, t]
  );

  const MEETING_FORMAT_ICON: Partial<Record<MeetingFormat, React.ReactNode>> = {
    offline: <Building2 size={13} />,
    online: <Video size={13} />,
  };
  const meetingFormatOptions = useMemo(
    () =>
      getMeetingFormatOptions(t).map((opt) => {
        const icon = MEETING_FORMAT_ICON[opt.value as MeetingFormat];
        return icon
          ? {
              value: opt.value,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {icon}
                  {opt.label}
                </span>
              ),
            }
          : opt;
      }),
    [t]
  );
  const priorityOptions = useMemo(() => getPriorityOptions(t), [t]);
  const priorityOptionsColored = useMemo(() => withPriorityColor(priorityOptions), [priorityOptions]);

  const hasFilters =
    !!searchKeyword ||
    (!!dateFilter && !isAutoMonthRange(dateFilter, calendarDate, viewMode === 'calendar')) ||
    meetingFormatFilter !== 'all' ||
    priorityFilter !== 'all' ||
    !!filterLeaderId;

  const resetFilters = () => {
    setSearchKeyword('');
    setDateFilter(null);
    setMeetingFormatFilter('all');
    setPriorityFilter('all');
    setFilterLeaderId(undefined);
    setFilterLeader(null);
  };

  const openCreateDrawer = useCallback((slot?: { date: string; startTime?: string }) => {
    setResubmitSeedRow(null);
    setCreateSlot(slot ?? null);
    setDrawerOpen(true);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const state = location.state as { autoOpenCreate?: boolean; slot?: { date: string; startTime?: string } } | null;
    if (!state?.autoOpenCreate) return;
    openCreateDrawer(state.slot);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state]);

  const openResubmitDrawer = useCallback((request: ScheduleRequest) => {
    if (request.status === 'approved') return;
    setResubmitSeedRow(request);
    setDetailId(null);
    setDrawerOpen(true);
  }, []);

  const { data: resubmitSeedDetail, isFetching: isResubmitSeedLoading } = useLeadershipRequestDetailQuery(
    resubmitSeedRow?.id ?? null
  );
  const resubmitSeed = resubmitSeedDetail ?? resubmitSeedRow;

  const handleOpenDetail = useCallback((request: ScheduleRequest) => setDetailId(request.id), []);
  const handleCancelRequest = useCallback((request: ScheduleRequest) => setCancelTargetId(request.id), []);
  const handleDeleteRequest = useCallback((request: ScheduleRequest) => setDeleteTargetId(request.id), []);
  const handleApproveRequest = useCallback((request: ScheduleRequest) => setApproveTargetId(request.id), []);
  const handleRejectRequest = useCallback((request: ScheduleRequest) => setRejectTargetId(request.id), []);

  const resubmitInitialValues: Partial<RequestFormValues> | undefined = useMemo(
    () =>
      resubmitSeed
        ? {
            executiveId: resubmitSeed.executiveId,
            title: resubmitSeed.title,
            description: resubmitSeed.description ?? '',
            durationMinutes: resubmitSeed.durationMinutes,
            location: resubmitSeed.location,
            scheduleTypeId: resubmitSeed.scheduleTypeId,
            meetingFormat: resubmitSeed.meetingFormat,
            priority: resubmitSeed.priority,
            participants: resubmitSeed.participants,
            date: resubmitSeed.date,
            endDate: resubmitSeed.endDate,
            startTime: resubmitSeed.startTime,
            note: resubmitSeed.note ?? '',
            attachments: resubmitSeed.attachments ?? [],
            links: resubmitSeed.link ? resubmitSeed.link.split('\n').filter(Boolean) : [''],
            isConfidential: resubmitSeed.isConfidential,
            isApprovalRequired: resubmitSeed.isApprovalRequired,
          }
        : undefined,
    [resubmitSeed]
  );

  const handleCreateSubmit = (input: LeadershipRequestInput, options?: { isDraft?: boolean }) => {
    const isDraft = options?.isDraft ?? false;
    const onSettled = {
      onSuccess: () => {
        toast.success(isDraft ? t('leadership_schedule.toast_draft_success') : t('leadership_schedule.toast_create_success'));
        setDrawerOpen(false);
      },
    };

    if (resubmitSeed && EDIT_IN_PLACE.includes(resubmitSeed.status)) {
      updateMutation.mutate({ id: resubmitSeed.id, input, isDraft }, onSettled);
      return;
    }
    createMutation.mutate({ input, isDraft }, onSettled);
  };

  const handleCancelConfirm = (reason: string) => {
    if (!cancelTarget) return;
    cancelMutation.mutate({ id: cancelTarget.id, reason }, {
      onSuccess: () => {
        toast.success(t('leadership_schedule.toast_cancel_success'));
        setCancelTargetId(null);
        if (detailId === cancelTarget.id) setDetailId(null);
      },
    });
  };

  const handleApproveConfirm = () => {
    if (!approveTarget) return;
    approveMutation.mutate(approveTarget.id, {
      onSuccess: () => {
        toast.success(t('leadership_schedule.toast_approve_success', { defaultValue: 'Đã duyệt yêu cầu' }));
        setApproveTargetId(null);
        if (detailId === approveTarget.id) setDetailId(null);
      },
    });
  };

  const handleRejectConfirm = (reason: string) => {
    if (!rejectTarget) return;
    rejectMutation.mutate({ id: rejectTarget.id, reason }, {
      onSuccess: () => {
        toast.success(t('leadership_schedule.toast_reject_success', { defaultValue: 'Đã từ chối yêu cầu' }));
        setRejectTargetId(null);
        if (detailId === rejectTarget.id) setDetailId(null);
      },
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t('leadership_schedule.toast_delete_success'));
        setDeleteTargetId(null);
        if (detailId === deleteTarget.id) setDetailId(null);
      },
    });
  };

  const handleDeleteGroupConfirm = () => {
    if (!deleteTarget || !deleteGroupScheduleId) return;
    deleteGroupMutation.mutate(deleteGroupScheduleId, {
      onSuccess: () => {
        toast.success(t('leadership_schedule.toast_delete_group_success'));
        setDeleteTargetId(null);
        if (detailId === deleteTarget.id) setDetailId(null);
      },
    });
  };


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
    <Box className="relative flex flex-col gap-4 pb-4 select-none [&_input]:select-text [&_textarea]:select-text">
      <div className="pointer-events-none absolute -top-32 right-0 -z-10 w-[500px] h-[500px] rounded-full bg-[#00529C]/[0.03] dark:bg-blue-500/[0.04] blur-[120px]" />

      {/* Header + Filter Card (full width) */}
      <Paper
        ref={stickyHeaderRef}
        className={`${SURFACE} !p-4 flex flex-col gap-3 md:sticky md:top-0 z-20 shadow-xs backdrop-blur-md bg-white/95 dark:bg-slate-900/95`}
      >
        {/* Header title + create button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <ClipboardCheck size={20} className="text-[#00529C] dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {t('leadership_schedule.title')}
              </h2>
              <p className="text-11.5 text-slate-500 dark:text-slate-400">{t('leadership_schedule.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openCreateDrawer()}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border-0 bg-gradient-to-b from-[#2E8BE6] to-[#1F78D6] text-white text-[13.5px] font-semibold shadow-[0_1px_2px_rgba(15,60,120,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-[#2580DC] hover:to-[#196ECB] hover:shadow-[0_4px_10px_-2px_rgba(15,60,120,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 cursor-pointer"
          >
            <CalendarPlus size={17} className="shrink-0" />
            <span>{t('leadership_schedule.create_btn')}</span>
          </button>
        </div>

        {/* 6 Top Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 pt-1">
          {statCards.map((item, idx) => {
            const isActive = activeTab === item.key;
            return (
              <motion.button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, type: 'spring', stiffness: 400, damping: 30 }}
                whileHover={{ y: -3, transition: { duration: 0.15, ease: 'easeOut' } }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'group relative flex items-center gap-3 p-3.5 rounded-2xl border transition-[background-color,border-color,box-shadow] duration-150 text-left cursor-pointer hover:shadow-md overflow-hidden',
                  isActive
                    ? item.activeBorderClass
                    : `bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 ${item.hoverClass}`
                )}
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:scale-105', item.iconBgClass)}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1 text-left pr-3.5">
                  <div className={cn('text-[12px] truncate', item.titleColorClass)}>
                    {item.label}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={cn('text-[16px] font-semibold leading-none tracking-tight', item.numColorClass)}>
                      {item.value}
                    </span>
                    <span className="text-[11.5px] font-normal text-slate-500 dark:text-slate-500 truncate">
                      {item.unit}
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

        {/* Filter toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
          {/* 1. Tìm kiếm (Input Search) */}
          <div className="relative w-full sm:w-96">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('leadership_schedule.filter_search_label') || 'Tìm kiếm'}
            </span>
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder={t('leadership_schedule.search_placeholder')}
                className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border border-[#00529C]/45 dark:border-blue-500/50 bg-white dark:bg-slate-900 dark:text-slate-100 text-[13px] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 hover:border-[#00529C] focus:border-[#00529C] focus:outline-none focus:ring-4 focus:ring-[#00529C]/10"
              />
            </div>
          </div>

          {/* 2. Thời gian (RangePicker) */}
          <div className="relative w-full sm:w-72 shrink-0">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('leadership_schedule.filter_date_label') || 'Khoảng thời gian'}
            </span>
            <RangePicker
              size="large"
              className="w-full !h-[38px] !border-[#00529C]/45 dark:!border-blue-500/50 !rounded-xl"
              value={dateFilter}
              format="DD/MM/YYYY"
              placeholder={[t('leadership_schedule.filter_date_start_placeholder'), t('leadership_schedule.filter_date_end_placeholder')]}
              allowClear
              onChange={(range) => handleDateFilterChange(range as [Dayjs, Dayjs] | null)}
            />
          </div>

          {/* 4. Hình thức (Select) */}
          <div className="relative w-full sm:w-[160px]">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('leadership_schedule.filter_format_label') || 'Hình thức'}
            </span>
            <AntdSelect
              size="large"
              value={meetingFormatFilter}
              onChange={setMeetingFormatFilter}
              options={meetingFormatOptions}
              className="w-full premium-select h-10 filter-compact !border-[#00529C]/45 dark:!border-blue-500/50 [&_.ant-select-selection-item]:!text-[13px] [&_.ant-select-selection-item]:!font-normal [&_.ant-select-selection-item]:!text-slate-700 dark:[&_.ant-select-selection-item]:!text-slate-200"
              classNames={{ popup: { root: 'premium-select-dropdown' } }}
            />
          </div>

          {/* 5. Mức độ ưu tiên (Select) */}
          <div className="relative w-full sm:w-[175px]">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-medium z-10 leading-none">
              {t('leadership_schedule.filter_priority_label') || 'Mức độ'}
            </span>
            <AntdSelect
              size="large"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={priorityOptionsColored}
              className="w-full premium-select h-10 filter-compact !border-[#00529C]/45 dark:!border-blue-500/50 [&_.ant-select-selection-item]:!text-[13px] [&_.ant-select-selection-item]:!font-normal [&_.ant-select-selection-item]:!text-slate-700 dark:[&_.ant-select-selection-item]:!text-slate-200"
              classNames={{ popup: { root: 'premium-select-dropdown' } }}
            />
          </div>

          {canFilterByLeader && (
            <div className="relative w-full sm:w-[240px] shrink-0">
              <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
                {t('leadership_schedule.filter_leader_label', { defaultValue: 'Lãnh đạo' })}
              </span>
              <PagedPickerSelect<IExecutiveUser>
                value={filterLeaderId}
                onChange={(id, record) => {
                  setFilterLeaderId(id || undefined);
                  setFilterLeader(record ?? null);
                }}
                className="!min-h-[38px] !border-[#00529C]/45 dark:!border-blue-500/50"
                initialRecord={filterLeader ?? undefined}
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
                placeholder={t('leadership_schedule.filter_leader_all', { defaultValue: 'Tất cả lãnh đạo' })}
              />
            </div>
          )}

          {/* Reset button */}
          {hasFilters && (
            <FilterResetButton onClick={resetFilters} />
          )}

          {/* View mode toggle — labeled like the filter fields, pinned to the row's trailing space */}
          <div className="relative shrink-0 w-full sm:w-auto ml-0 sm:ml-auto flex justify-end">
            <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
              {t('leadership_schedule.view_mode_label', { defaultValue: 'Chế độ xem' })}
            </span>
            <div className="flex gap-0.5 h-[38px] items-center p-0.5 bg-slate-50 dark:bg-slate-800/40 rounded-full border border-[#00529C]/45 dark:border-blue-500/50">
              {([
                { key: 'table' as const, label: t('leadership_schedule.view_table', { defaultValue: 'Bảng' }), icon: ListChecks },
                { key: 'calendar' as const, label: t('leadership_schedule.view_calendar', { defaultValue: 'Lịch' }), icon: CalendarDays },
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
                        layoutId="leadership-view-mode-pill"
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
          agendaCollapsed ? 'md:grid-cols-[1fr_48px]' : 'md:grid-cols-[1fr_380px]'
        )}
      >
        {/* Left Column: Request Cards / Calendar View */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* Requests Cards List / Calendar View */}
          <Paper className={`${SURFACE} !p-4 flex flex-col gap-4`}>
            <div className={viewMode === 'calendar' ? 'block' : 'hidden'}>
              <ScheduleCalendarView
                visible={viewMode === 'calendar'}
                events={calendarEvents}
                loading={isCalendarLoading}
                date={calendarDate}
                onDateChange={setCalendarDate}
                onSelectSlot={(start, _end, allDay) =>
                  openCreateDrawer(
                    allDay
                      ? { date: dayjs(start).format('YYYY-MM-DD') }
                      : { date: dayjs(start).format('YYYY-MM-DD'), startTime: dayjs(start).format('HH:mm') }
                  )
                }
                onEventClick={(raw: ScheduleRequest) => handleOpenDetail(raw)}
                renderEventContent={renderCalendarEventContent}
              />
            </div>
            <div className={viewMode === 'table' ? 'hidden md:block' : 'hidden'}>
              <LeadershipRequestTable
                requests={requests}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                onPageChange={(newPage, newSize) => {
                  setPage(newPage);
                  if (newSize !== pageSize) {
                    setPageSize(newSize);
                  }
                }}
                executiveById={executiveById}
                loading={isLoading}
                onOpenDetail={handleOpenDetail}
                onViewParticipants={setParticipantsTarget}
                onCancel={handleCancelRequest}
                onResubmit={openResubmitDrawer}
                onDelete={handleDeleteRequest}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
              />
            </div>
            {/* Narrow screens keep the card list — a 9-column table doesn't fit */}
            <div className={viewMode === 'table' ? 'md:hidden' : 'hidden'}>
              <ScheduleRequestList
                requests={requests}
                totalCount={totalCount}
                page={page}
                pageSize={pageSize}
                onPageChange={(newPage, newSize) => {
                  setPage(newPage);
                  if (newSize !== pageSize) {
                    setPageSize(newSize);
                  }
                }}
                executiveById={executiveById}
                loading={isLoading}
                onOpenDetail={handleOpenDetail}
                onViewParticipants={(r) => setParticipantsTarget(r)}
                onCancel={handleCancelRequest}
                onResubmit={openResubmitDrawer}
                onDelete={handleDeleteRequest}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
              />
            </div>
          </Paper>
        </div>

        {/* Right Column: weekly agenda */}
        <div
          className="hidden md:flex flex-col gap-4 min-w-0 md:sticky md:top-[var(--summary-top)] z-10"
          style={{ '--summary-top': `${stickyHeaderHeight ? stickyHeaderHeight + 16 : 16}px` } as React.CSSProperties}
        >
          {agendaCollapsed && (
            <Tooltip title={t('leadership_schedule.agenda_week_title')} placement="left">
              <button
                type="button"
                onClick={toggleAgenda}
                aria-label={t('dashboard.panel_expand')}
                className="flex flex-col items-center gap-3 w-12 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-[#00529C] dark:hover:text-blue-400 hover:border-[#00529C]/30 cursor-pointer transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <ChevronLeft size={14} />
                </span>
                <span className="relative w-8 h-8 rounded-xl text-white flex items-center justify-center bg-gradient-to-br from-blue-500 to-[#00529C] shadow-[0_4px_10px_-2px_rgba(0,82,156,0.45)]">
                  <CalendarDays size={16} />
                  {agendaRequests.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 text-[10px] font-semibold leading-none tabular-nums text-white">
                      {agendaRequests.length > 99 ? '99+' : agendaRequests.length}
                    </span>
                  )}
                </span>
              </button>
            </Tooltip>
          )}
          <div
            className={cn(
              'flex flex-col gap-4 md:overflow-y-auto slim-scroll pr-0.5 md:max-h-[var(--summary-max-h)]',
              agendaCollapsed && 'hidden'
            )}
            style={{
              '--summary-max-h': stickyHeaderHeight
                ? `calc(100vh - ${stickyHeaderHeight + 150}px)`
                : 'calc(100vh - 360px)',
            } as React.CSSProperties}
          >
            <WeeklyAgenda
              weekStart={agendaWeekStart}
              requests={agendaRequests}
              loading={isAgendaLoading}
              executiveById={executiveById}
              onOpenDetail={(r) => setDetailId(r.id)}
              onCollapse={toggleAgenda}
            />
          </div>
        </div>
      </div>

      <LeadershipScheduleModal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleCreateSubmit}
        loading={createMutation.isPending || updateMutation.isPending || (!!resubmitSeedRow && isResubmitSeedLoading)}
        initialValues={
          resubmitInitialValues ??
          (createSlot ? { date: createSlot.date, endDate: createSlot.date, startTime: createSlot.startTime } : undefined)
        }
        initialExecutive={resubmitSeed ? executiveById.get(resubmitSeed.executiveId) : undefined}
        isResubmit={!!resubmitSeed}
        isDraftEdit={resubmitSeed?.status === 'draft'}
        isPendingEdit={resubmitSeed?.status === 'pending' || resubmitSeed?.status === 'submitted'}
        excludeScheduleOccurrenceId={resubmitSeed?.id}
        excludeScheduleId={resubmitSeed?.scheduleId}
      />

      <LeadershipScheduleDetailModal
        open={!!detailId}
        request={detailRequest}
        executiveById={executiveById}
        onClose={handleCloseDetail}
        onCancel={(r) => setCancelTargetId(r.id)}
        onResubmit={openResubmitDrawer}
        onDelete={(r) => setDeleteTargetId(r.id)}
        onApprove={canActAsLeaderForDetail ? (r) => setApproveTargetId(r.id) : undefined}
        onReject={canActAsLeaderForDetail ? (r) => setRejectTargetId(r.id) : undefined}
      />

      <CancelScheduleModal
        open={!!cancelTarget}
        onCancel={() => setCancelTargetId(null)}
        onConfirm={handleCancelConfirm}
        loading={cancelMutation.isPending}
        scheduleTitle={cancelTarget?.title?.trim()}
        title={t('leadership_schedule.cancel_confirm_title')}
      />

      <ConfirmModal
        open={!!approveTarget}
        onCancel={() => setApproveTargetId(null)}
        onConfirm={handleApproveConfirm}
        loading={approveMutation.isPending}
        title={t('leadership_schedule.approve_confirm_title', { defaultValue: 'Duyệt yêu cầu đăng ký lịch' })}
        description={t('leadership_schedule.approve_confirm_desc', {
          title: approveTarget?.title?.trim() || '',
          defaultValue: 'Xác nhận duyệt yêu cầu "{{title}}"?',
        })}
        confirmText={t('leadership_schedule.approve_ok', { defaultValue: 'Duyệt' })}
        cancelText={t('leadership_schedule.delete_cancel')}
        variant="success"
        uppercaseTitle={false}
      />

      <CancelScheduleModal
        tone="danger"
        open={!!rejectTarget}
        onCancel={() => setRejectTargetId(null)}
        onConfirm={handleRejectConfirm}
        loading={rejectMutation.isPending}
        scheduleTitle={rejectTarget?.title?.trim()}
        title={t('leadership_schedule.reject_confirm_title', { defaultValue: 'Từ chối yêu cầu đăng ký lịch' })}
      />

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
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteMutation.isPending}
        title={t('leadership_schedule.delete_confirm_title')}
        description={t('leadership_schedule.delete_confirm_desc')}
        confirmText={t('leadership_schedule.delete_ok')}
        cancelText={t('leadership_schedule.delete_cancel')}
        variant="danger"
      />

      <Modal
        open={!!deleteTarget && deleteTargetIsGroup && !deleteChoicePending}
        onCancel={() => setDeleteTargetId(null)}
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
            onClick={() => setDeleteTargetId(null)}
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
                {t('leadership_schedule.delete_scope_title')}
              </h3>
              <p className="mt-1 text-13 text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('leadership_schedule.delete_scope_desc')}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {/* Option 1: Just this day */}
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending || deleteGroupMutation.isPending}
              className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-red-400/60 dark:hover:border-red-400 hover:shadow-md transition-all duration-200 text-left cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs group-hover:bg-red-50 group-hover:text-red-600 dark:group-hover:text-red-400 group-hover:border-red-200 transition-all duration-200">
                  <CalendarDays size={19} />
                </div>
                <div className="min-w-0">
                  <div className="text-13.5 font-bold text-slate-800 dark:text-slate-100 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {t('leadership_schedule.delete_scope_single')}
                  </div>
                  <div className="text-12 text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('leadership_schedule.delete_scope_single_desc')}
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
              onClick={handleDeleteGroupConfirm}
              disabled={deleteMutation.isPending || deleteGroupMutation.isPending}
              className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-red-200/90 dark:border-red-900/60 bg-gradient-to-r from-red-50/70 via-white to-rose-50/30 dark:from-red-950/30 dark:via-slate-900 dark:to-rose-950/20 hover:border-red-500 dark:hover:border-red-400 hover:shadow-md transition-all duration-200 text-left cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-rose-400 to-rose-500 dark:from-rose-500 dark:to-rose-600 text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
                  <CalendarRange size={19} />
                </div>
                <div className="min-w-0">
                  <div className="text-13.5 font-bold text-red-600 dark:text-red-400">
                    {t('leadership_schedule.delete_scope_all')}
                  </div>
                  <div className="text-12 text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('leadership_schedule.delete_scope_all_desc')}
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
              onClick={() => setDeleteTargetId(null)}
              disabled={deleteMutation.isPending || deleteGroupMutation.isPending}
              className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-13 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {t('leadership_schedule.delete_cancel')}
            </button>
          </div>
        </div>
      </Modal>

      <ParticipantDialog
        open={!!participantsTarget}
        onClose={() => setParticipantsTarget(null)}
        participants={participantsTarget ? groupRequestParticipants(participantsTarget.participants) : null}
        title={participantsTarget?.title}
      />
    </Box>
  );
};

export default LeadershipScheduleRegistration;
