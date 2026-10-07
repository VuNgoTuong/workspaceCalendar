import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useCalendarRangeSync } from '../components/useCalendarRangeSync';
import dayjs, { type Dayjs } from 'dayjs';
import { Box, Paper, Button } from '@mui/material';
import { Modal, DatePicker, Select, Table, Empty, Pagination, Tooltip, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useStatusTabFromNavigation } from '../components/useStatusTabFromNavigation';
import { EventMetaLine } from '../components/EventMetaLine';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { EventContentArg } from '@fullcalendar/core';
import { scheduleOccurrenceAPI } from '../../../services/api/scheduleOccurrenceAPI';
import type { IScheduleOccurrenceCalendarItem } from '../../../services/api/scheduleOccurrenceAPI';
import { fromApiDateTime } from '../../../utils/dateTime';
import { ScheduleCalendarView } from '../../../components/ui/ScheduleCalendarView';
import { signalRService } from '../../../services/signalr/SignalRService';
import type { INotification } from '../../../services/api/notificationAPI';
import { NOTIFICATION_CODES, extractNotificationTargetId, normalizeNotificationCode } from '../../../constants/notificationCodes';
import { ScheduleOccurrenceStatus, SCHEDULE_OCCURRENCE_EVENT_THEME } from '../../../constants/scheduleOccurrenceStatus';
import { mapOccurrenceToInvitation } from './utils/occurrenceAdapter';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarOff,
  CalendarX2,
  CalendarCheck2,
  X,
  Building2,
  Video,
  MoreHorizontal,
  MoreHorizontal as ModeOther,
  Search,
  Users,
  UserPlus,
  Check,
  Clock,
  ListChecks,
  CalendarDays,
  FileText,
  MapPin,
  CalendarClock,
  ArrowRight,
  CalendarSearch,
  Mail,
  Tag,
  Phone,
  StickyNote,
  AlertCircle,
} from 'lucide-react';
import { toast } from '../../../store/toastStore';
import { useDebounce } from '../../../hooks';
import { usePermission } from '../../../hooks/usePermission';
import { StatusBadge } from '../../../components/ui';
import { FormModal, FormModalHeader, FormSectionCard, ReadOnlyField } from '../../../components/ui/FormModal';
import { cn, getApiErrorMessage } from '../../../utils/helpers';
import { withPriorityColor } from '../../../components/ui/PriorityOption';
import { PagedPickerSelect } from '../../../components/ui/PagedPickerSelect';
import { userAPI, type IExecutiveUser } from '../../../services/api/userAPI';
import { useAuthStore } from '../../../store/authStore';
import { useActingLeaderStore } from '../../../store/actingLeaderStore';
import { useScheduleTypesQuery } from '../../categories/meeting-type/hooks/useScheduleTypeQueries';
import { MeetingType } from '../../../constants/meetingType';
import { SchedulePriority as ApiSchedulePriority } from '../../../constants/schedulePriority';
import { ScheduleInvitationFilterStatus, resolveInvitationDisplayStatus } from '../../../constants/participationStatus';
import { STATUS_COLOR_PALETTE, type StatusColorFamily } from '../../../constants/statusColorPalette';
import {
  useInvitationsQuery,
  useInvitationStatsQuery,
  useInvitationCalendarGridQuery,
  useConfirmInvitationMutation,
  useDeclineInvitationMutation,
} from './hooks/useInvitationQueries';
import { useInvitationFilterStore, type InvitationTabKey } from './store/useInvitationFilterStore';
import {
  getMeetingTypeOptions,
  type MeetingInvitation,
  type MeetingMode,
  type SchedulePriority,
  type InvitationStatus,
  type ParticipantStatus,
  type InvitationParticipant,
} from './types';
import { ParticipantDialog } from '../components/ParticipantDialog';
import { ScheduleCountdownCard } from '../../../components/shared/ScheduleCountdownCard';
import { ParticipantsTooltip } from '../components/ParticipantsTooltip';
import { FilterResetButton } from '../components/FilterResetButton';
import { isAutoMonthRange } from '../components/useCalendarRangeSync';
import { PersonAvatar } from '../components/PersonAvatar';

const DetailField: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <span className="text-[11.5px] font-normal text-slate-500 dark:text-slate-400">{label}</span>
    <div className="min-w-0 text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
      {value || <span className="italic font-normal text-slate-300 dark:text-slate-600">—</span>}
    </div>
  </div>
);

const PriorityBadge: React.FC<{ priority: SchedulePriority }> = ({ priority }) => {
  const { t } = useTranslation();
  if (priority !== 'urgent') return null;
  return (
    <Tooltip title={t('priority.urgent')}>
      <AlertCircle size={15} className="text-red-500 dark:text-red-400 shrink-0" />
    </Tooltip>
  );
};

const AvatarWithFallback: React.FC<{
  src?: string | null;
  name: string;
  className?: string;
  size?: number;
}> = ({ src, name, className, size = 38 }) => {
  const [error, setError] = useState(false);
  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .slice(-2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';

  if (src && !error) {
    return (
      <img
        loading="lazy"
        decoding="async"
        src={src}
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
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00529C] to-blue-600 text-white font-medium text-12 shadow-xs',
        className
      )}
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
};

interface ConfirmAttendanceModalProps {
  invitations: MeetingInvitation[];
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  participantName?: string;
}

const ConfirmAttendanceModal: React.FC<ConfirmAttendanceModalProps> = ({ invitations, onCancel, onConfirm, loading, participantName }) => {
  const { t } = useTranslation();
  const single = invitations.length === 1 ? invitations[0] : null;

  const dialogTitle = single
    ? t('meeting_invitations.confirm_dialog_title_single', { title: single.title })
    : invitations.length > 1
    ? t('meeting_invitations.confirm_dialog_title_multi', { count: invitations.length })
    : t('meeting_invitations.confirm_dialog_title') || 'Xác nhận tham dự';

  return (
    <Modal
      open={invitations.length > 0}
      onCancel={onCancel}
      footer={null}
      centered
      // Opened from MUI detail modals (z-index 1300); antd's default 1000 would sit behind them.
      zIndex={1400}
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
            {participantName ? (
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                {t('meeting_invitations.confirm_on_behalf_of', { defaultValue: 'Xác nhận tham dự thay cho:' })}{' '}
                <strong className="text-slate-700 dark:text-slate-200 font-semibold">{participantName}</strong>
              </p>
            ) : (
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                {t('meeting_invitations.confirm_question_sub', {
                  defaultValue: 'Bạn có chắc chắn muốn tham gia lịch làm việc này không?',
                })}
              </p>
            )}
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
                <span>{t('meeting_invitations.confirm_ok', { defaultValue: 'Xác nhận tham dự' })}</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

interface DeclineAttendanceDialogProps {
  invitations: MeetingInvitation[];
  onCancel: () => void;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
  participantName?: string;
}

export const DeclineAttendanceDialog: React.FC<DeclineAttendanceDialogProps> = ({ invitations, onCancel, onConfirm, loading, participantName }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const single = invitations.length === 1 ? invitations[0] : null;

  useEffect(() => {
    if (invitations.length > 0) setReason('');
  }, [invitations]);

  const dialogTitle = single
    ? t('meeting_invitations.decline_dialog_title_single', { title: single.title })
    : invitations.length > 1
    ? t('meeting_invitations.decline_dialog_title_multi', { count: invitations.length })
    : t('meeting_invitations.decline_dialog_title') || 'Từ chối tham dự';

  return (
    <Modal
      open={invitations.length > 0}
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
          <div className="min-w-0 flex-1 pr-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight line-clamp-2">
              {dialogTitle}
            </h3>
            {participantName ? (
              <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">
                {t('meeting_invitations.decline_on_behalf_of', { defaultValue: 'Từ chối tham dự thay cho:' })}{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{participantName}</span>
              </p>
            ) : (
              <p className="text-13 text-slate-500 dark:text-slate-400">
                {t('personal_calendar.cancel_confirm_sub_hint') || 'Vui lòng nhập lý do từ chối bên dưới.'}
              </p>
            )}
          </div>
        </div>

        {/* Reason Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
            <span>
              {t('meeting_invitations.decline_reason_label')} <span className="text-rose-500">*</span>
            </span>
          </label>
          <Input.TextArea
            rows={3.5}
            maxLength={500}
            showCount
            placeholder={t('meeting_invitations.decline_reason_placeholder')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="!rounded-2xl !text-[13.5px] font-normal border-slate-200 dark:border-slate-700 dark:!bg-slate-900 dark:!text-slate-100 focus:border-rose-500 hover:border-rose-400 !p-0 transition-all duration-200"
          />
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
            {t('meeting_invitations.decline_cancel', { defaultValue: 'Hủy' })}
          </Button>
          <Button
            variant="contained"
            onClick={() => onConfirm(reason.trim() || undefined)}
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
                <span>{t('meeting_invitations.decline_ok', { defaultValue: 'Xác nhận từ chối' })}</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const DETAIL_MODE_META: Record<MeetingInvitation['meetingMode'], { icon: React.ReactNode; labelKey: string }> = {
  offline: { icon: <Building2 size={13} />, labelKey: 'meeting_invitations.mode_offline' },
  online: { icon: <Video size={13} />, labelKey: 'meeting_invitations.mode_online' },
  other: { icon: <ModeOther size={13} />, labelKey: 'meeting_invitations.mode_other' },
};

const INVITATION_STATUS_COLOR_FAMILY: Record<InvitationStatus, StatusColorFamily> = {
  pending: 'amber',
  confirmed: 'emerald',
  declined: 'rose',
  cancelled: 'slate',
};

const INVITATION_STATUS_ICON_SM: Record<InvitationStatus, React.ReactNode> = {
  pending: <Clock size={13} />,
  confirmed: <Check size={13} strokeWidth={2.5} />,
  declined: <X size={13} strokeWidth={2.5} />,
  cancelled: <CalendarOff size={13} strokeWidth={2.5} />,
};

interface InvitationNavSection {
  key: 'general' | 'participants' | 'content' | 'timeline';
  number: number;
  labelKey: string;
  defaultLabel: string;
  subtitleKey: string;
  defaultSubtitle: string;
  icon: React.ReactNode;
}

const INVITATION_NAV_SECTIONS: InvitationNavSection[] = [
  {
    key: 'general',
    number: 1,
    labelKey: 'meeting_invitations.section_general',
    defaultLabel: 'Thông tin chung',
    subtitleKey: 'meeting_invitations.section_general_subtitle',
    defaultSubtitle: 'Chi tiết cuộc họp',
    icon: <FileText size={14} />,
  },
  {
    key: 'participants',
    number: 2,
    labelKey: 'meeting_invitations.section_participants',
    defaultLabel: 'Thành phần tham dự',
    subtitleKey: 'meeting_invitations.section_participants_subtitle',
    defaultSubtitle: 'Người được mời tham dự',
    icon: <Users size={14} />,
  },
  {
    key: 'content',
    number: 3,
    labelKey: 'meeting_invitations.section_content',
    defaultLabel: 'Nội dung',
    subtitleKey: 'meeting_invitations.section_content_subtitle',
    defaultSubtitle: 'Thông tin cuộc họp',
    icon: <FileText size={14} />,
  },
  {
    key: 'timeline',
    number: 4,
    labelKey: 'meeting_invitations.timeline_title',
    defaultLabel: 'Các bước xử lý',
    subtitleKey: 'meeting_invitations.timeline_subtitle',
    defaultSubtitle: 'Trạng thái tham dự',
    icon: <ListChecks size={14} />,
  },
];

export interface InvitationDetailModalProps {
  invitation: MeetingInvitation | null;
  onClose: () => void;
  onConfirm?: (invitation: MeetingInvitation) => void;
  onDecline?: (invitation: MeetingInvitation) => void;
  canManageParticipants?: boolean;
  onConfirmParticipant?: (invitation: MeetingInvitation, participant: InvitationParticipant) => void;
  onDeclineParticipant?: (invitation: MeetingInvitation, participant: InvitationParticipant) => void;
  autoCloseCountdown?: number | null;
}



export const InvitationDetailModal: React.FC<InvitationDetailModalProps> = ({
  invitation,
  onClose,
  onConfirm,
  onDecline,
  canManageParticipants,
  onConfirmParticipant,
  onDeclineParticipant,
  autoCloseCountdown = null,
}) => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<InvitationNavSection['key']>('general');
  const [flashSection, setFlashSection] = useState<InvitationNavSection['key'] | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const sectionRefs = React.useRef<Partial<Record<InvitationNavSection['key'], HTMLDivElement | null>>>({});
  const timelineCardRef = React.useRef<HTMLDivElement | null>(null);
  const flashTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isClickingRef = React.useRef(false);
  const clickingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (invitation) {
      setActiveSection('general');
      setFlashSection(null);
    }
  }, [invitation?.id]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!invitation || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickingRef.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const key = (visible[0].target as HTMLElement).dataset.section as InvitationNavSection['key'] | undefined;
          if (key) setActiveSection(key);
        }
      },
      { root, threshold: 0, rootMargin: '-8% 0px -70% 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [invitation?.id]);

  const scrollToSection = (key: InvitationNavSection['key']) => {
    setActiveSection(key);
    setFlashSection(key);

    clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashSection(null), 2000);

    isClickingRef.current = true;
    clearTimeout(clickingTimeoutRef.current);
    clickingTimeoutRef.current = setTimeout(() => {
      isClickingRef.current = false;
    }, 1200);

    const target = key === 'timeline' ? timelineCardRef.current : sectionRefs.current[key];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: key === 'timeline' ? 'nearest' : 'start' });
    }
  };

  useEffect(() => () => {
    clearTimeout(flashTimeoutRef.current);
    clearTimeout(clickingTimeoutRef.current);
  }, []);

  if (!invitation) return null;

  const mode = DETAIL_MODE_META[invitation.meetingMode];
  const meetingTypeLabel = invitation.scheduleTypeName || getMeetingTypeOptions(t).find((o) => o.value === invitation.meetingType)?.label || invitation.meetingType || t('meeting_invitations.default_event_label', { defaultValue: 'Sự kiện' });
  const statusColors = STATUS_COLOR_PALETTE[INVITATION_STATUS_COLOR_FAMILY[invitation.myStatus]];
  // Section card look while it's the nav's scroll target: status-tinted border + fill + soft lift, no halo ring.
  const sectionFlashClass = cn(statusColors.flash, 'shadow-[0_12px_30px_-14px_rgba(15,35,65,0.28)]');
  const heroWeekday = dayjs(invitation.date).format('dddd').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const heroDateText = `${heroWeekday}, ${dayjs(invitation.date).format(t('common.date_long'))}`;
  const statusLabel =
    invitation.myStatus === 'pending'
      ? t('meeting_invitations.status_pending', { defaultValue: 'Chờ duyệt' })
      : invitation.myStatus === 'confirmed'
        ? t('meeting_invitations.status_confirmed', { defaultValue: 'Đã xác nhận' })
        : invitation.myStatus === 'cancelled'
          ? t('meeting_invitations.status_cancelled', { defaultValue: 'Đã hủy' })
          : t('meeting_invitations.status_declined', { defaultValue: 'Đã từ chối' });

  const allParticipants = [
    ...invitation.participants.confirmed.map((p) => ({ participant: p, status: 'confirmed' as ParticipantStatus })),
    ...invitation.participants.pending.map((p) => ({ participant: p, status: 'pending' as ParticipantStatus })),
    ...invitation.participants.declined.map((p) => ({ participant: p, status: 'declined' as ParticipantStatus })),
  ];

  const owner = invitation.ownerUser || {
    id: invitation.organizer.id,
    fullname: invitation.organizer.name || 'N/A',
    employeeCode: invitation.organizer.code,
    avatarUrl: invitation.organizer.avatarUrl,
    email: invitation.organizer.email,
    phoneNumber: invitation.organizer.phone,
    departmentName: invitation.organizer.department,
    positionName: invitation.organizer.position,
  };

  return (
    <FormModal open={!!invitation} onCancel={onClose} width="80vw" centered>
      <FormModalHeader
        title={
          <div className="flex items-center gap-2.5">
            <span className="text-[21px] leading-snug font-semibold text-slate-800 dark:text-slate-100">{invitation.title}</span>
            {invitation.priority === 'urgent' && (
              <StatusBadge priority="urgent" size="sm" />
            )}
          </div>
        }
        icon={<CalendarSearch size={24} className="text-white" />}
        iconClassName={statusColors.iconGradient}
        className={statusColors.headerGradient}
        extra={
          <span
            className={cn(
              'inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3.5 rounded-full border text-12.5 font-medium whitespace-nowrap shadow-2xs',
              statusColors.bg,
              statusColors.border,
              statusColors.text
            )}
          >
            <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white', statusColors.iconGradient)}>
              {INVITATION_STATUS_ICON_SM[invitation.myStatus]}
            </span>
            {statusLabel}
          </span>
        }
        onClose={onClose}
      />

      {autoCloseCountdown !== null && (
        <div className="mx-6 mt-3 mb-1 p-3.5 rounded-2xl border border-red-200 dark:border-red-900/60 bg-gradient-to-r from-red-50/95 via-rose-50/70 to-red-50/95 dark:from-red-950/50 dark:via-slate-900 dark:to-rose-950/30 flex items-center justify-between gap-3 text-red-700 dark:text-red-300 shadow-sm animate-pulse">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/60 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
              <CalendarOff size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-[13.5px] text-red-800 dark:text-red-200">
                {t('meeting_invitations.cancelled_banner_title', { defaultValue: 'Lịch làm việc này đã bị hủy!' })}
              </div>
              <div className="text-[12px] text-red-600 dark:text-red-400 mt-0.5">
                {t('meeting_invitations.cancelled_banner_desc', {
                  defaultValue: 'Màn hình chi tiết sẽ tự động đóng sau {{count}} giây...',
                  count: autoCloseCountdown,
                })}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 px-3.5 py-1.5 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-800 text-12 font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors shadow-2xs"
          >
            {t('common.close_now', { defaultValue: 'Đóng ngay' })}
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-[75vh] bg-slate-50/70 dark:bg-[#05080f]">
        <div className="hidden md:flex w-[235px] shrink-0 flex-col gap-3 border-r border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 px-3 py-5">
          <div className="relative flex flex-col gap-1">

            {INVITATION_NAV_SECTIONS.map((section) => {
              const isActive = activeSection === section.key;
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => scrollToSection(section.key)}
                  aria-current={isActive ? 'true' : undefined}
                  className="group relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-300',
                      isActive ? cn('h-5 opacity-100', statusColors.dot) : 'h-0 opacity-0'
                    )}
                  />
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-all duration-300',
                      isActive
                        ? cn('text-white', statusColors.dot)
                        : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700 group-hover:text-slate-600 group-hover:ring-slate-300 dark:group-hover:text-slate-300'
                    )}
                  >
                    {section.number}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={cn(
                        'text-13 font-medium leading-snug truncate transition-colors',
                        isActive ? statusColors.text : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                      )}
                    >
                      {t(section.labelKey, { defaultValue: section.defaultLabel })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <ScheduleCountdownCard
            date={invitation.date}
            startTime={invitation.startTime}
            endTime={invitation.endTime}
            inactiveLabel={invitation.myStatus === 'cancelled' ? t('schedule_countdown.cancelled') : undefined}
          />
        </div>

        {/* Middle: content */}
        <div ref={scrollRef} className="slim-scroll flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 flex flex-col gap-4">
          {/* Schedule hero: date/time anchor + format/location */}
          <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-gradient-to-r from-white via-[#F7FAFE] to-[#EEF4FC] dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 px-4 sm:px-5 py-3.5 shadow-[0_6px_20px_-10px_rgba(15,35,65,0.18)]">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-[#1273CC] dark:text-blue-400 ring-1 ring-slate-200/70 dark:ring-slate-700 shadow-[0_4px_12px_-4px_rgba(18,115,204,0.25)]">
                <CalendarClock size={20} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-[#1273CC] dark:text-blue-400 truncate">
                  {heroDateText}
                </div>
                <div className="mt-1 flex items-center gap-3 text-[24px] font-semibold leading-none tracking-tight tabular-nums text-slate-800 dark:text-slate-100">
                  {invitation.startTime}
                  <ArrowRight size={18} strokeWidth={1.75} className="shrink-0 text-slate-300 dark:text-slate-600" />
                  {invitation.endTime}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-[12.5px] font-medium ring-1 ring-slate-200/60 dark:ring-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
                  invitation.meetingMode === 'online'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : invitation.meetingMode === 'offline'
                      ? 'text-[#00529C] dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300'
                )}
              >
                {mode.icon}
                {t(mode.labelKey)}
              </span>
              {invitation.location && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-[12.5px] font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-200/60 dark:ring-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <MapPin size={13} className="shrink-0 text-amber-500 dark:text-amber-400" />
                  {invitation.location}
                </span>
              )}
            </div>
          </div>

          {/* Section 1: General Info & Owner Profile */}
          <div
            ref={(el) => { sectionRefs.current.general = el; }}
            data-section="general"
            className="w-full"
          >
            <FormSectionCard
              number={1}
              title={t('meeting_invitations.section_general', { defaultValue: 'Thông tin chung' })}
              icon={<FileText size={15} />}
              className="transition-all duration-300"
              surfaceClassName={flashSection === 'general' ? sectionFlashClass : undefined}
              titleClassName={flashSection === 'general' ? statusColors.text : undefined}
            >
              {/* Owner User Profile Card */}
              {owner.fullname && (
                <div className="mb-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/30 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-800/30 p-3.5 flex items-center gap-3.5">
                  <AvatarWithFallback src={owner.avatarUrl} name={owner.fullname} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-12 text-slate-500 dark:text-slate-600 font-normal">{t('meeting_invitations.created_by_label', { defaultValue: 'Người tạo/đăng ký:' })}</span>
                      <span className="text-14 font-medium text-slate-800 dark:text-slate-100">{owner.fullname}</span>
                      {owner.employeeCode && (
                        <span className="px-2 py-0.5 rounded-full text-11 font-mono font-normal bg-blue-50 dark:bg-blue-950/50 text-[#00529C] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                          {owner.employeeCode}
                        </span>
                      )}
                    </div>
                    <div className="text-12 text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                      {[owner.positionName || owner.jobTitleName, owner.departmentName].filter(Boolean).join(' - ')}
                    </div>
                    {(owner.email || owner.phoneNumber) && (
                      <div className="flex items-center gap-3 text-11.5 text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                        {owner.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail size={11} className="text-sky-500 dark:text-sky-400 shrink-0" />
                            {owner.email}
                          </span>
                        )}
                        {owner.phoneNumber && (
                          <span className="inline-flex items-center gap-1">
                            <Phone size={11} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                            {owner.phoneNumber}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-4">
                <DetailField
                  label={t('meeting_invitations.filter_type_label', { defaultValue: 'Loại lịch' })}
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Tag size={14} className="text-blue-500 shrink-0" />
                      {meetingTypeLabel}
                    </span>
                  }
                />
                <DetailField
                  label={t('meeting_invitations.detail_location')}
                  value={invitation.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} className="text-amber-500 shrink-0" />
                      {invitation.location}
                    </span>
                  )}
                />
                <DetailField
                  label={t('meeting_invitations.detail_mode')}
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      {mode.icon}
                      {invitation.meetingMode === 'other' && invitation.meetingModeOther ? invitation.meetingModeOther : t(mode.labelKey)}
                    </span>
                  }
                />
                <DetailField
                  label={t('meeting_invitations.filter_priority_label', { defaultValue: 'Mức độ ưu tiên' })}
                  value={invitation.priority === 'urgent' ? <StatusBadge priority="urgent" size="sm" /> : t(`priority.${invitation.priority || 'normal'}`)}
                />
                {invitation.isSendEmail !== undefined && (
                  <DetailField
                    label={t('meeting_invitations.field_email_notification', { defaultValue: 'Thông báo Email' })}
                    value={
                      <span className="inline-flex items-center gap-1.5">
                        <Mail size={13} className={invitation.isSendEmail ? 'text-emerald-500' : 'text-slate-400'} />
                        {invitation.isSendEmail
                          ? t('meeting_invitations.email_notification_on', { defaultValue: 'Đã bật gửi email thông báo' })
                          : t('meeting_invitations.email_notification_off', { defaultValue: 'Không gửi email' })}
                      </span>
                    }
                  />
                )}
              </div>
            </FormSectionCard>
          </div>

          {/* Section 2: Participants */}
          <div
            ref={(el) => { sectionRefs.current.participants = el; }}
            data-section="participants"
            className="w-full"
          >
            <FormSectionCard
              number={2}
              title={t('meeting_invitations.section_participants', { defaultValue: 'Thành phần tham dự' })}
              icon={<Users size={15} />}
              className="transition-all duration-300"
              surfaceClassName={flashSection === 'participants' ? sectionFlashClass : undefined}
              titleClassName={flashSection === 'participants' ? statusColors.text : undefined}
            >
              {allParticipants.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {allParticipants.map(({ participant: p, status }, idx) => {
                    const displayName = (p.name && p.name.trim()) || p.code || p.id || 'N/A';
                    return (
                      <div
                        key={p.id || idx}
                        className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-900/90 shadow-2xs hover:border-[#00529C]/40 dark:hover:border-blue-500/40 transition-all"
                      >
                        <AvatarWithFallback src={p.avatarUrl} name={displayName} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-13.5 font-medium text-slate-800 dark:text-slate-100 truncate">{displayName}</span>
                            {p.code && (
                              <span className="shrink-0 text-11 font-mono font-medium px-2 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#00529C] dark:text-blue-400 border border-blue-100/60 dark:border-blue-900/40">
                                {p.code}
                              </span>
                            )}
                          </div>
                          <div className="text-12 text-slate-500 dark:text-slate-400 truncate">
                            {[p.position, p.department].filter(Boolean).join(' - ')}
                          </div>
                          {(p.email || p.phoneNumber) && (
                            <div className="flex items-center gap-3 text-11 text-slate-400 dark:text-slate-500 truncate">
                              {p.email && (
                                <span className="inline-flex items-center gap-1 truncate">
                                  <Mail size={10} className="text-sky-500 dark:text-sky-400 shrink-0" />
                                  {p.email}
                                </span>
                              )}
                              {p.phoneNumber && (
                                <span className="inline-flex items-center gap-1 shrink-0">
                                  <Phone size={10} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                                  {p.phoneNumber}
                                </span>
                              )}
                            </div>
                          )}
                          {status === 'declined' && p.rejectReason && (
                            <div className="mt-1.5 rounded-lg border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/70 dark:bg-rose-950/30 px-2.5 py-1 text-11">
                              <span className="font-semibold text-rose-700 dark:text-rose-300">
                                {t('common.participant_reject_reason_label', { defaultValue: 'Lý do từ chối' })}:
                              </span>{' '}
                              <span className="text-slate-700 dark:text-slate-300">{p.rejectReason}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge status={status} size="sm" />
                          {canManageParticipants && status === 'pending' && invitation.myStatus !== 'cancelled' && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onConfirmParticipant?.(invitation, p)}
                                title={t('meeting_invitations.action_confirm', { defaultValue: 'Xác nhận' })}
                                className={cn(
                                  'h-7 w-7 flex items-center justify-center rounded-full transition-colors cursor-pointer',
                                  STATUS_COLOR_PALETTE.emerald.bg,
                                  STATUS_COLOR_PALETTE.emerald.text,
                                  'hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                )}
                              >
                                <CalendarCheck2 size={14} strokeWidth={2.5} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeclineParticipant?.(invitation, p)}
                                title={t('meeting_invitations.action_decline', { defaultValue: 'Từ chối' })}
                                className={cn(
                                  'h-7 w-7 flex items-center justify-center rounded-full transition-colors cursor-pointer',
                                  STATUS_COLOR_PALETTE.rose.bg,
                                  STATUS_COLOR_PALETTE.rose.text,
                                  'hover:bg-rose-100 dark:hover:bg-rose-900/60'
                                )}
                              >
                                <CalendarX2 size={14} strokeWidth={2.5} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-13 italic text-slate-400 dark:text-slate-500">
                  {t('meeting_invitations.detail_no_participants', { defaultValue: 'Chưa có thành phần tham dự' })}
                </span>
              )}
            </FormSectionCard>
          </div>

          {/* Section 3: Content & Note */}
          <div
            ref={(el) => { sectionRefs.current.content = el; }}
            data-section="content"
            className="w-full"
          >
            <FormSectionCard
              number={3}
              title={t('meeting_invitations.section_content', { defaultValue: 'Nội dung' })}
              icon={<FileText size={15} />}
              className="transition-all duration-300"
              surfaceClassName={flashSection === 'content' ? sectionFlashClass : undefined}
              titleClassName={flashSection === 'content' ? statusColors.text : undefined}
            >
              <div className="flex flex-col gap-3">
                <ReadOnlyField
                  label={t('meeting_invitations.detail_content')}
                  value={
                    invitation.content ? (
                      <div
                        className="text-13.5 leading-relaxed font-normal text-slate-800 dark:text-slate-100 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 max-h-56 overflow-y-auto [&_p]:m-0"
                        dangerouslySetInnerHTML={{ __html: invitation.content }}
                      />
                    ) : (
                      <span className="italic text-13.5 text-slate-400">{t('meeting_invitations.detail_no_content', { defaultValue: 'Chưa có nội dung' })}</span>
                    )
                  }
                />

                {invitation.note && (
                  <ReadOnlyField
                    label={t('meeting_invitations.field_note', { defaultValue: 'Ghi chú' })}
                    value={
                      <div className="flex items-start gap-2 text-13 leading-relaxed bg-amber-50/80 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200">
                        <StickyNote size={14} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>{invitation.note}</span>
                      </div>
                    }
                  />
                )}
              </div>
            </FormSectionCard>
          </div>
        </div>

        {/* Right: status + timeline + help sidebar */}
        <div className="slim-scroll hidden lg:flex w-[305px] shrink-0 flex-col gap-4 border-l border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 px-4 py-4 overflow-y-auto backdrop-blur-md">
          {invitation.myStatus === 'declined' && invitation.declineReason && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 p-4">
              <div className="text-13 font-medium text-rose-800 dark:text-rose-300 mb-1">
                {t('meeting_invitations.decline_reason_label')}
              </div>
              <div className="text-12.5 text-slate-600 dark:text-slate-300 leading-relaxed">{invitation.declineReason}</div>
            </div>
          )}

          {invitation.myStatus === 'cancelled' && invitation.cancelledReason && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/30 p-4">
              <div className="text-13 font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t('meeting_invitations.cancelled_reason_label', { defaultValue: 'Lý do hủy lịch' })}
              </div>
              <div className="text-12.5 text-slate-600 dark:text-slate-300 leading-relaxed">{invitation.cancelledReason}</div>
            </div>
          )}

          {/* Timeline Card */}
          <div
            ref={timelineCardRef}
            className={cn(
              'rounded-2xl border p-4 transition-all duration-300',
              flashSection === 'timeline'
                ? sectionFlashClass
                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
            )}
          >
            <div className="text-13 font-medium text-slate-800 dark:text-slate-100 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span>{t('meeting_invitations.timeline_title', { defaultValue: 'Các bước xử lý' })}</span>
            </div>
            <div className="flex flex-col relative pl-0.5">
              {/* Step 1: Created */}
              <div className="relative flex gap-3 pb-3.5">
                <div className="absolute left-[7.5px] top-[18px] -bottom-0.5 w-px bg-slate-300 dark:bg-slate-700" />
                <span className="relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs">
                  <Check size={10} strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-12.5 font-medium text-slate-700 dark:text-slate-200">
                    {t('meeting_invitations.timeline_created_title', { defaultValue: 'Khởi tạo lịch đăng ký' })}
                  </div>
                  <div className="text-11.5 text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('meeting_invitations.timeline_created_by', { defaultValue: 'Tạo bởi {{name}}', name: owner.fullname })}
                  </div>
                  <div className="text-11 text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                    {dayjs(invitation.createdAt || invitation.date).format('DD/MM/YYYY HH:mm')}
                  </div>
                </div>
              </div>

              {/* Step 2: Approved */}
              <div className="relative flex gap-3 pb-3.5">
                <div className="absolute left-[7.5px] top-[18px] -bottom-0.5 w-px bg-slate-300 dark:bg-slate-700" />
                <span className={cn(
                  'relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white shadow-xs',
                  invitation.approval?.approvedAt ? 'bg-emerald-500' : 'bg-blue-500'
                )}>
                  <Check size={10} strokeWidth={2.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-12.5 font-medium text-slate-700 dark:text-slate-200">
                    {t('meeting_invitations.timeline_approval_title', { defaultValue: 'Phê duyệt lịch họp' })}
                  </div>
                  <div className="text-11.5 text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {invitation.approval?.approvedAt
                      ? t('meeting_invitations.timeline_approved_at', {
                          defaultValue: 'Đã duyệt ({{date}})',
                          date: dayjs(invitation.approval.approvedAt).format('DD/MM/YYYY HH:mm'),
                        })
                      : t('meeting_invitations.timeline_approval_done', { defaultValue: 'Đã hoàn tất phê duyệt' })}
                  </div>
                  {invitation.approval?.rejectReason && (
                    <div className="text-11 italic text-slate-400 dark:text-slate-500 mt-0.5">
                      {t('meeting_invitations.timeline_reject_note', {
                        defaultValue: 'Ghi chú: {{reason}}',
                        reason: invitation.approval.rejectReason,
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Participant RSVP */}
              <div className="relative flex gap-3">
                <span className={cn(
                  'relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white ring-4 transition-all',
                  invitation.myStatus === 'confirmed'
                    ? 'bg-emerald-500 ring-emerald-500/20 shadow-xs'
                    : invitation.myStatus === 'declined'
                      ? 'bg-rose-500 ring-rose-500/20 shadow-xs'
                      : invitation.myStatus === 'cancelled'
                        ? 'bg-slate-400 ring-slate-400/20 shadow-xs'
                        : 'bg-amber-500 ring-amber-500/20 shadow-xs'
                )}>
                  {invitation.myStatus === 'confirmed' ? (
                    <Check size={10} strokeWidth={2.5} />
                  ) : invitation.myStatus === 'declined' ? (
                    <X size={10} strokeWidth={2.5} />
                  ) : invitation.myStatus === 'cancelled' ? (
                    <CalendarOff size={10} strokeWidth={2.5} />
                  ) : (
                    // A 6px lucide <Circle> blurs its 2px stroke into an off-centre blob; a CSS dot stays crisp.
                    <>
                      <span aria-hidden className="absolute inset-0 rounded-full bg-amber-500 opacity-50 animate-ping" />
                      <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
                    </>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-12.5 font-medium text-slate-700 dark:text-slate-200">
                    {invitation.myStatus === 'confirmed'
                      ? t('meeting_invitations.timeline_confirmed', { defaultValue: 'Đã xác nhận' })
                      : invitation.myStatus === 'declined'
                        ? t('meeting_invitations.timeline_declined', { defaultValue: 'Đã từ chối' })
                        : invitation.myStatus === 'cancelled'
                          ? t('meeting_invitations.timeline_cancelled', { defaultValue: 'Lịch đã bị hủy' })
                          : t('meeting_invitations.timeline_pending', { defaultValue: 'Chờ xác nhận' })}
                  </div>
                  <div className="text-11 text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                    {invitation.myStatus === 'pending'
                      ? t('meeting_invitations.timeline_waiting', { defaultValue: 'Đang chờ xác nhận' })
                      : invitation.myStatus === 'cancelled' && invitation.cancelledAt
                        ? dayjs(invitation.cancelledAt).format('DD/MM/YYYY HH:mm')
                        : invitation.respondedAt
                          ? dayjs(invitation.respondedAt).format('DD/MM/YYYY HH:mm')
                          : dayjs().format('DD/MM/YYYY HH:mm')}
                  </div>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>

      {invitation.isViewerParticipant && invitation.myStatus === 'pending' && autoCloseCountdown === null && onConfirm && onDecline && (
        <div className="flex justify-end items-center gap-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5">
          <button
            type="button"
            onClick={() => onDecline(invitation)}
            className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]"
          >
            <CalendarX2 size={14} strokeWidth={2.5} className="transition-transform duration-200 group-hover/btn:scale-110" />
            <span>{t('meeting_invitations.detail_footer_decline')}</span>
          </button>
          <button
            type="button"
            onClick={() => onConfirm(invitation)}
            className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]"
          >
            <CalendarCheck2 size={14} strokeWidth={2.5} className="transition-transform duration-200 group-hover/btn:scale-110" />
            <span>{t('meeting_invitations.detail_footer_confirm')}</span>
          </button>
        </div>
      )}
    </FormModal>
  );
};

const { RangePicker } = DatePicker;

const premiumSelectClass =
  'w-full premium-select h-10 filter-compact !border-[#00529C]/45 dark:!border-blue-500/50 [&_.ant-select-selection-item]:!text-[13px] [&_.ant-select-selection-item]:!font-normal [&_.ant-select-selection-item]:!text-slate-700 dark:[&_.ant-select-selection-item]:!text-slate-200';

interface InvitationFilterBarProps {
  /** The date range is only the calendar's auto-synced month, so it doesn't count as a filter. */
  dateRangeIsAuto?: boolean;
  leaderPicker?: React.ReactNode;
  viewToggle?: React.ReactNode;
  /** Lets the page keep the calendar in step with the picked range; defaults to writing the store. */
  onDateRangeChange?: (range: [Dayjs, Dayjs] | null) => void;
}

const InvitationFilterBar: React.FC<InvitationFilterBarProps> = ({ leaderPicker, viewToggle, onDateRangeChange, dateRangeIsAuto }) => {
  const { t } = useTranslation();
  const filters = useInvitationFilterStore((s) => s.filters);
  const setFilters = useInvitationFilterStore((s) => s.setFilters);
  const resetFilters = useInvitationFilterStore((s) => s.resetFilters);

  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    setFilters({ search: debouncedSearch });
  }, [debouncedSearch]);

  const handleReset = () => {
    resetFilters();
    setSearchInput('');
  };

  const hasActiveFilters =
    !!searchInput || (!!filters.dateRange && !dateRangeIsAuto) || filters.meetingType !== 'all' || filters.meetingMode !== 'all' || filters.priority !== 'all';

  const { data: scheduleTypesData } = useScheduleTypesQuery({ PageSize: 100 });
  const typeOptions: { value: string; label: string }[] = [
    { value: 'all', label: t('meeting_invitations.filter_type_all') },
    ...(scheduleTypesData?.items || []).map((st) => ({ value: st.id, label: st.name })),
  ];

  const modeOptions: { value: MeetingMode | 'all'; label: React.ReactNode }[] = [
    { value: 'all', label: t('meeting_invitations.filter_mode_all') },
    {
      value: 'offline',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Building2 size={13} />
          {t('meeting_invitations.mode_offline')}
        </span>
      ),
    },
    {
      value: 'online',
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Video size={13} />
          {t('meeting_invitations.mode_online')}
        </span>
      ),
    },
  ];

  const priorityOptions = withPriorityColor<{ value: SchedulePriority | 'all'; label: string }>([
    { value: 'all', label: t('meeting_invitations.priority_all') },
    { value: 'normal', label: t('meeting_invitations.priority_normal') },
    { value: 'urgent', label: t('meeting_invitations.priority_urgent') },
  ]);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {leaderPicker && (
        <div className="relative w-full sm:w-[240px]">
          <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
            {t('meeting_invitations.filter_leader_label') || 'Lãnh đạo'}
          </span>
          {leaderPicker}
        </div>
      )}
      <div className="relative w-full sm:w-[280px]">
        <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
          {t('meeting_invitations.filter_search_label') || 'Tìm kiếm'}
        </span>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('meeting_invitations.filter_search_placeholder')}
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border border-[#00529C]/45 dark:border-blue-500/50 bg-white dark:bg-slate-900 dark:text-slate-100 text-[13px] placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 hover:border-[#00529C] focus:border-[#00529C] focus:outline-none focus:ring-4 focus:ring-[#00529C]/10"
          />
        </div>
      </div>

      <div className="relative w-full sm:w-72 shrink-0">
        <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
          {t('meeting_invitations.filter_date_label') || 'Khoảng thời gian'}
        </span>
        <RangePicker
          size="large"
          aria-label={t('meeting_invitations.filter_date_label')}
          className="w-full !h-[38px] !border-[#00529C]/45 dark:!border-blue-500/50 !rounded-xl"
          value={filters.dateRange ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])] : null}
          format="DD/MM/YYYY"
          placeholder={[t('meeting_invitations.filter_date_start_placeholder'), t('meeting_invitations.filter_date_end_placeholder')]}
          allowClear
          onChange={(dates) => {
            const next: [Dayjs, Dayjs] | null = dates && dates[0] && dates[1] ? [dates[0], dates[1]] : null;
            if (onDateRangeChange) return onDateRangeChange(next);
            setFilters({ dateRange: next ? [next[0].format('YYYY-MM-DD'), next[1].format('YYYY-MM-DD')] : null });
          }}
        />
      </div>

      <div className="relative w-full sm:w-[190px]">
        <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
          {t('meeting_invitations.filter_type_label') || 'Loại lịch'}
        </span>
        <Select
          size="large"
          value={filters.meetingType}
          onChange={(v) => setFilters({ meetingType: v })}
          options={typeOptions}
          className={premiumSelectClass}
          classNames={{ popup: { root: 'premium-select-dropdown' } }}
        />
      </div>

      <div className="relative w-full sm:w-[160px]">
        <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
          {t('meeting_invitations.filter_mode_label') || 'Hình thức'}
        </span>
        <Select
          size="large"
          value={filters.meetingMode}
          onChange={(v) => setFilters({ meetingMode: v })}
          options={modeOptions}
          className={premiumSelectClass}
          classNames={{ popup: { root: 'premium-select-dropdown' } }}
        />
      </div>

      <div className="relative w-full sm:w-[175px]">
        <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
          {t('meeting_invitations.filter_priority_label') || 'Mức độ'}
        </span>
        <Select
          size="large"
          value={filters.priority}
          onChange={(v) => setFilters({ priority: v })}
          options={priorityOptions}
          className={premiumSelectClass}
          classNames={{ popup: { root: 'premium-select-dropdown' } }}
        />
      </div>

      {hasActiveFilters && (
        <FilterResetButton onClick={handleReset} />
      )}

      {viewToggle && <div className="w-full sm:w-auto ml-0 sm:ml-auto flex justify-end">{viewToggle}</div>}
    </div>
  );
};

interface InvitationStatusTabsProps {
  counts: Record<InvitationTabKey, number>;
}

interface StatusTabConfig {
  key: InvitationTabKey;
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
    labelKey: 'meeting_invitations.tab_all',
    icon: <ListChecks size={19} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-blue-400 to-blue-500 shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5)]',
    titleColorClass: 'text-[#00529C] dark:text-blue-400 font-medium',
    numColorClass: 'text-[#00529C] dark:text-blue-400',
    activeClass: 'border-[#00529C]/50 dark:border-blue-400/60 bg-blue-50/70 dark:bg-blue-950/25',
    hoverClass: 'hover:bg-blue-50/60 hover:border-blue-200 dark:hover:bg-blue-950/20 dark:hover:border-blue-800/40',
  },
  {
    key: 'pending',
    labelKey: 'meeting_invitations.tab_pending',
    icon: <Clock size={19} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_4px_10px_-2px_rgba(245,158,11,0.5)]',
    titleColorClass: 'text-amber-600 dark:text-amber-400 font-medium',
    numColorClass: 'text-amber-600 dark:text-amber-400',
    activeClass: 'border-amber-400/50 dark:border-amber-500/60 bg-amber-50/70 dark:bg-amber-950/25',
    hoverClass: 'hover:bg-amber-50/60 hover:border-amber-200 dark:hover:bg-amber-950/20 dark:hover:border-amber-800/40',
  },
  {
    key: 'confirmed',
    labelKey: 'meeting_invitations.tab_confirmed',
    icon: <CalendarCheck2 size={19} strokeWidth={2} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_4px_10px_-2px_rgba(16,185,129,0.5)]',
    titleColorClass: 'text-emerald-600 dark:text-emerald-400 font-medium',
    numColorClass: 'text-emerald-600 dark:text-emerald-400',
    activeClass: 'border-emerald-500/50 dark:border-emerald-600/60 bg-emerald-50/70 dark:bg-emerald-950/25',
    hoverClass: 'hover:bg-emerald-50/60 hover:border-emerald-200 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-800/40',
  },
  {
    key: 'declined',
    labelKey: 'meeting_invitations.tab_declined',
    icon: <CalendarX2 size={19} strokeWidth={2} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-[0_4px_10px_-2px_rgba(239,68,68,0.5)]',
    titleColorClass: 'text-rose-600 dark:text-rose-400 font-medium',
    numColorClass: 'text-rose-600 dark:text-rose-400',
    activeClass: 'border-rose-400/50 dark:border-rose-500/60 bg-rose-50/70 dark:bg-rose-950/25',
    hoverClass: 'hover:bg-rose-50/60 hover:border-rose-200 dark:hover:bg-rose-950/20 dark:hover:border-rose-800/40',
  },
  {
    key: 'cancelled',
    labelKey: 'meeting_invitations.tab_cancelled',
    icon: <CalendarOff size={21} className="text-white" />,
    iconBgClass: 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-[0_4px_10px_-2px_rgba(100,116,139,0.45)]',
    titleColorClass: 'text-slate-500 dark:text-slate-400 font-medium',
    numColorClass: 'text-slate-500 dark:text-slate-400',
    activeClass: 'border-slate-400/50 dark:border-slate-500/60 bg-slate-100/80 dark:bg-slate-800/40',
    hoverClass: 'hover:bg-slate-50/60 hover:border-slate-200 dark:hover:bg-slate-800/20 dark:hover:border-slate-700/40',
  },
];

const InvitationStatusTabs: React.FC<InvitationStatusTabsProps> = ({ counts }) => {
  const { t } = useTranslation();
  const activeTab = useInvitationFilterStore((s) => s.activeTab);
  const setActiveTab = useInvitationFilterStore((s) => s.setActiveTab);

  return (
    <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-5 gap-3 flex-1 min-w-0 pt-1">
        {STATUS_TAB_CONFIG.map((tab, idx) => {
          const isActive = activeTab === tab.key;
          return (
            <motion.button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={isActive}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, type: 'spring', stiffness: 400, damping: 30 }}
              whileHover={{ y: -3, transition: { duration: 0.15, ease: 'easeOut' } }}
              whileTap={{ scale: 0.98 }}
              className={`group relative flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-[background-color,border-color,box-shadow] duration-150 text-left hover:shadow-md overflow-hidden ${
                isActive
                  ? tab.activeClass
                  : `bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 ${tab.hoverClass}`
              }`}
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
                    {t('meeting_invitations.tab_unit')}
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
    </div>
  );
};

// -------------------------------------------------------------------------------------------
// View mode toggle (Bảng / Lịch) — mirrors LeadershipScheduleRegistration's / ApprovalStatusTabs'
// pattern so switching between the invitation table and a calendar view feels consistent.
type InvitationViewMode = 'table' | 'calendar';

const InvitationViewModeToggle: React.FC<{ value: InvitationViewMode; onChange: (v: InvitationViewMode) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="relative shrink-0 w-full sm:w-auto">
      <span className="absolute -top-2 left-3.5 px-1.5 bg-white dark:bg-slate-900 text-xs text-[#00529C] dark:text-blue-400 font-semibold z-10 leading-none">
        {t('meeting_invitations.view_mode_label', { defaultValue: 'Chế độ xem' })}
      </span>
      <div className="flex gap-0.5 h-[38px] items-center p-0.5 bg-slate-50 dark:bg-slate-800/40 rounded-full border border-[#00529C]/45 dark:border-blue-500/50">
        {([
          { key: 'table' as const, label: t('meeting_invitations.view_table', { defaultValue: 'Bảng' }), icon: ListChecks },
          { key: 'calendar' as const, label: t('meeting_invitations.view_calendar', { defaultValue: 'Lịch' }), icon: CalendarDays },
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
                  layoutId="invitation-view-mode-pill"
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

const TABLE_MODE_META: Record<MeetingInvitation['meetingMode'], { icon: React.ReactNode; labelKey: string }> = {
  offline: { icon: <Building2 size={12} />, labelKey: 'meeting_invitations.mode_offline' },
  online: { icon: <Video size={12} />, labelKey: 'meeting_invitations.mode_online' },
  other: { icon: <MoreHorizontal size={12} />, labelKey: 'meeting_invitations.mode_other' },
};

interface InvitationTableProps {
  invitations: MeetingInvitation[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenDetail: (invitation: MeetingInvitation) => void;
  onConfirm: (invitation: MeetingInvitation) => void;
  onDecline: (invitation: MeetingInvitation) => void;
  onViewParticipants: (invitation: MeetingInvitation) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
}

const getInvitationRowStatusClass = (invitation: MeetingInvitation): string => {
  if (invitation.priority === 'urgent') {
    return 'row-priority-urgent';
  }
  switch (invitation.myStatus) {
    case 'confirmed':
      return 'row-status-confirmed';
    case 'pending':
      return 'row-status-pending';
    case 'declined':
      return 'row-status-declined';
    case 'cancelled':
      return 'row-status-cancelled';
    default:
      return '';
  }
};

const getInvitationMobileStatusClass = (invitation: MeetingInvitation): string => {
  if (invitation.priority === 'urgent') {
    return 'bg-rose-50/25 dark:bg-rose-950/15 border-rose-200/50 dark:border-rose-900/30';
  }
  switch (invitation.myStatus) {
    case 'confirmed':
      return 'bg-teal-50/25 dark:bg-teal-950/15 border-teal-200/50 dark:border-teal-900/30';
    case 'pending':
      return 'bg-amber-50/25 dark:bg-amber-950/15 border-amber-200/50 dark:border-amber-900/30';
    case 'declined':
      return 'bg-rose-50/25 dark:bg-rose-950/15 border-rose-200/50 dark:border-rose-900/30';
    case 'cancelled':
      return 'bg-slate-100/35 dark:bg-slate-800/20 border-slate-200/50 dark:border-slate-700/30';
    default:
      return 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800';
  }
};

const InvitationTable: React.FC<InvitationTableProps> = React.memo(({
  invitations,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onOpenDetail,
  onConfirm,
  onDecline,
  onViewParticipants,
  selectedIds,
  onSelectedIdsChange,
}) => {
  const { t } = useTranslation();
  const todayStr = dayjs().format('YYYY-MM-DD');
  const nowMin = dayjs().hour() * 60 + dayjs().minute();

  const toMin = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const { data: scheduleTypesData } = useScheduleTypesQuery({ PageSize: 100 });
  const scheduleTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    (scheduleTypesData?.items || []).forEach((st) => map.set(st.id, st.name));
    return map;
  }, [scheduleTypesData]);

  const columns = useMemo(
    () => [
      {
        title: t('schedule_approval.col_stt', { defaultValue: 'STT' }),
        key: 'stt',
        width: 60,
        align: 'center' as const,
        render: (_: unknown, __: MeetingInvitation, index: number) => (
          <span className="text-12 font-medium text-slate-500 dark:text-slate-400">
            {index + 1}
          </span>
        ),
      },
      {
        title: t('meeting_invitations.col_ticket', { defaultValue: 'Mã' }),
        key: 'ticket',
        width: 120,
        render: (_: unknown, record: MeetingInvitation) => (
          <span className="font-mono text-11 font-medium text-[#00529C] dark:text-blue-400 whitespace-nowrap">
            {record.ticketNumber}
          </span>
        ),
      },
      {
        title: t('meeting_invitations.col_title'),
        key: 'title',
        width: 280,
        render: (_: unknown, record: MeetingInvitation) => {
          const categoryName = record.scheduleTypeName || (record.scheduleTypeId ? scheduleTypeMap.get(record.scheduleTypeId) : undefined);
          return (
            <div className="flex flex-col gap-0.5 py-0.5 max-w-[280px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <Tooltip title={record.title} placement="topLeft">
                  <span
                    onClick={() => onOpenDetail(record)}
                    className="font-medium text-[#00529C] dark:text-blue-400 text-[13px] leading-snug line-clamp-2 cursor-pointer"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {record.title}
                  </span>
                </Tooltip>
                {record.priority === 'urgent' && (
                  <Tooltip title={t('meeting_invitations.priority_urgent', { defaultValue: 'Khẩn cấp' })}>
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
        title: t('meeting_invitations.col_requester', { defaultValue: 'Người đăng ký' }),
        key: 'requester',
        width: 170,
        render: (_: unknown, record: MeetingInvitation) => {
          const name = record.organizer?.name || record.ownerUser?.fullname;
          const dept = record.organizer?.department || record.ownerUser?.departmentName;
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
        title: t('meeting_invitations.col_time'),
        key: 'time',
        width: 140,
        render: (_: unknown, record: MeetingInvitation) => {
          const isToday = record.date === todayStr;
          const isInProgress = isToday && nowMin >= toMin(record.startTime) && nowMin < toMin(record.endTime);
          return (
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-12 font-normal text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {dayjs(record.date).format('DD/MM/YYYY')}
                </span>
                {isInProgress ? (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('meeting_invitations.in_progress_label', { defaultValue: 'Đang diễn ra' })}
                  </span>
                ) : isToday ? (
                  <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.2 text-[9.5px] font-semibold text-[#00529C] dark:text-blue-400">
                    {t('meeting_invitations.today_label', { defaultValue: 'Hôm nay' })}
                  </span>
                ) : null}
              </div>
              <span className="text-11.5 font-normal text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {record.startTime} - {record.endTime}
              </span>
            </div>
          );
        },
      },
      {
        title: t('meeting_invitations.col_location') || 'Địa điểm & Hình thức',
        key: 'location',
        width: 160,
        render: (_: unknown, record: MeetingInvitation) => {
          const mode = TABLE_MODE_META[record.meetingMode];
          const displayLocation = record.meetingMode === 'other' && record.meetingModeOther ? record.meetingModeOther : record.location;
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-11.5 font-normal">
                {record.meetingMode === 'online' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    <Video size={12} className="shrink-0" />
                    {t(mode.labelKey)}
                  </span>
                ) : record.meetingMode === 'offline' ? (
                  <span className="inline-flex items-center gap-1 text-[#00529C] dark:text-blue-400 whitespace-nowrap">
                    {mode.icon}
                    {t(mode.labelKey)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {mode.icon}
                    {t(mode.labelKey)}
                  </span>
                )}
              </div>
              {displayLocation ? (
                <span className="text-11.5 font-normal text-slate-500 dark:text-slate-400 whitespace-nowrap truncate max-w-[140px]" title={displayLocation}>
                  {displayLocation}
                </span>
              ) : (
                <span className="text-11.5 font-normal text-slate-400 dark:text-slate-500">—</span>
              )}
            </div>
          );
        },
      },
      {
        title: t('meeting_invitations.col_participants'),
        key: 'participants',
        width: 145,
        align: 'center' as const,
        render: (_: unknown, record: MeetingInvitation) => {
          const allParticipants = [
            ...(record.participants.confirmed || []),
            ...(record.participants.pending || []),
            ...(record.participants.declined || []),
          ];
          const total = allParticipants.length;
          return (
            <ParticipantsTooltip participants={allParticipants}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewParticipants(record);
                }}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full text-12 font-medium bg-[#f0f4f8] dark:bg-slate-800/80 text-[#00529C] dark:text-blue-400 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:bg-blue-50 hover:text-[#00529C] hover:border-blue-300 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 transition-all duration-200 shadow-2xs select-none"
              >
                <Users size={12} className="text-[#00529C] dark:text-blue-400 shrink-0" />
                <span className="font-medium text-12 text-[#00529C] dark:text-blue-400">
                  {t('meeting_invitations.participants_count', { count: total })}
                </span>
              </button>
            </ParticipantsTooltip>
          );
        },
      },
      {
        title: t('meeting_invitations.col_status'),
        key: 'status',
        width: 135,
        align: 'center' as const,
        render: (_: unknown, record: MeetingInvitation) => (
          <StatusBadge status={record.myStatus} />
        ),
      },
      {
        title: t('meeting_invitations.col_actions'),
        key: 'actions',
        width: 165,
        align: 'center' as const,
        fixed: 'right' as const,
        render: (_: unknown, record: MeetingInvitation) => (
          <div className="flex items-center justify-center gap-1.5">
            {record.isViewerParticipant && record.myStatus === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm(record);
                  }}
                  title={t('meeting_invitations.action_confirm', { defaultValue: 'Xác nhận' })}
                  className="group/btn relative inline-flex items-center justify-center gap-1.5 h-7.5 w-[82px] rounded-full text-white text-11 font-normal transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-95 shrink-0 select-none bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]"
                >
                  <CalendarCheck2 size={13} strokeWidth={2.5} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
                  <span>{t('meeting_invitations.action_confirm', { defaultValue: 'Xác nhận' })}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecline(record);
                  }}
                  title={t('meeting_invitations.action_decline', { defaultValue: 'Từ chối' })}
                  className="group/btn relative inline-flex items-center justify-center gap-1.5 h-7.5 w-[82px] rounded-full text-white text-11 font-normal transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-95 shrink-0 select-none bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]"
                >
                  <CalendarX2 size={13} strokeWidth={2.5} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
                  <span>{t('meeting_invitations.action_decline', { defaultValue: 'Từ chối' })}</span>
                </button>
              </>
            )}
          </div>
        ),
      },
    ],
    [t, todayStr, nowMin, onConfirm, onDecline, onViewParticipants, onOpenDetail, scheduleTypeMap]
  );

  return (
    <>
      <div className="hidden md:block">
        <Table
          columns={columns}
          dataSource={invitations}
          rowKey="id"
          loading={loading}
          className="custom-table invitation-table"
          scroll={{ x: 1300 }}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: onPageChange }}
          rowSelection={{
            selectedRowKeys: selectedIds,
            onChange: (keys) => onSelectedIdsChange(keys as string[]),
            getCheckboxProps: (record) => ({ disabled: !record.isViewerParticipant || record.myStatus !== 'pending' }),
          }}
          onRow={(invitation) => ({
            onClick: () => onOpenDetail(invitation),
            className: cn(
              'cursor-pointer',
              getInvitationRowStatusClass(invitation)
            ),
          })}
          locale={{
            emptyText: <Empty />,
          }}
        />
      </div>

      <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70">
        {loading ? (
          <div className="flex flex-col gap-2 p-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[92px] rounded-xl bg-slate-100/70 dark:bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-16">
            <Empty />
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {invitations.map((record) => {
              return (
                <motion.div
                  key={record.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'flex flex-col gap-2 px-4 py-3.5 cursor-pointer rounded-xl border transition-colors',
                    getInvitationMobileStatusClass(record)
                  )}
                  onClick={() => onOpenDetail(record)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <PriorityBadge priority={record.priority} />
                    <StatusBadge status={record.myStatus} />
                  </div>
                  <div className="text-13 font-medium text-slate-800 dark:text-slate-100">{record.title}</div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-11.5 text-slate-400 dark:text-slate-500">
                    <span>{dayjs(record.date).format('DD/MM')} · {record.startTime}–{record.endTime}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span>{record.organizer.name}</span>
                  </div>
                  {record.isViewerParticipant && record.myStatus === 'pending' && (
                    <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onConfirm(record)}
                        className="h-8 flex-1 rounded-lg border-0 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-12.5 font-semibold cursor-pointer"
                      >
                        {t('meeting_invitations.action_confirm')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDecline(record)}
                        className="h-8 flex-1 rounded-lg border-0 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 text-12.5 font-semibold cursor-pointer"
                      >
                        {t('meeting_invitations.action_decline')}
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

const SURFACE =
  '!rounded-2xl !border !border-slate-100 dark:!border-slate-800/80 !shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:!shadow-none !bg-white dark:!bg-slate-900';

const EXECUTIVE_ADMIN_ROLES = ['administrator', 'admin'];

const fetchExecutives = async ({ search, page, pageSize }: { search: string; page: number; pageSize: number }) => {
  const res = await userAPI.getExecutiveManagement({ searchKeyword: search, PageNumber: page, PageSize: pageSize });
  return { items: res.items || [], total: res.totalCount || 0 };
};

const useInvitationLeaderId = () => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  return actingLeaderId || currentUserId;
};

const API_MEETING_TYPE_BY_MODE: Record<MeetingMode, MeetingType> = {
  offline: MeetingType.Offline,
  online: MeetingType.Online,
  other: MeetingType.Other,
};

const API_PRIORITY_BY_UI: Record<SchedulePriority, ApiSchedulePriority> = {
  normal: ApiSchedulePriority.Normal,
  urgent: ApiSchedulePriority.Urgent,
};

const PAGE_SIZE = 10;
const EMPTY_INVITATIONS: MeetingInvitation[] = [];

const STATUS_BY_TAB: Record<InvitationTabKey, ScheduleInvitationFilterStatus | undefined> = {
  all: undefined,
  pending: ScheduleInvitationFilterStatus.Waiting,
  confirmed: ScheduleInvitationFilterStatus.Accepted,
  declined: ScheduleInvitationFilterStatus.Rejected,
  cancelled: ScheduleInvitationFilterStatus.Cancelled,
};

export const MeetingInvitations: React.FC = () => {
  const { t } = useTranslation();
  const { hasRawRole } = usePermission();
  const isExecutiveAdmin = hasRawRole(EXECUTIVE_ADMIN_ROLES);
  const defaultLeaderId = useInvitationLeaderId();
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<IExecutiveUser | null>(null);
  const leaderId = isExecutiveAdmin ? (selectedLeaderId ?? undefined) : defaultLeaderId;

  const activeTab = useInvitationFilterStore((s) => s.activeTab);
  const filters = useInvitationFilterStore((s) => s.filters);
  useStatusTabFromNavigation(
    Object.keys(STATUS_BY_TAB) as InvitationTabKey[],
    useInvitationFilterStore((s) => s.setActiveTab)
  );

  const [viewMode, setViewMode] = useState<InvitationViewMode>('calendar');
  const [calendarDate, setCalendarDate] = useState(() => dayjs());
  const setStoreFilters = useInvitationFilterStore((s) => s.setFilters);
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
      setStoreFilters({ dateRange: range ? [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')] : null }),
  });

  const [detailId, setDetailId] = useState<string | null>(null);
  const [participantsId, setParticipantsId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmTargetIds, setConfirmTargetIds] = useState<string[]>([]);
  const [declineTargetIds, setDeclineTargetIds] = useState<string[]>([]);
  const [participantConfirmTarget, setParticipantConfirmTarget] = useState<{ invitation: MeetingInvitation; participant: InvitationParticipant } | null>(null);
  const [participantDeclineTarget, setParticipantDeclineTarget] = useState<{ invitation: MeetingInvitation; participant: InvitationParticipant } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const confirmMutation = useConfirmInvitationMutation();
  const declineMutation = useDeclineInvitationMutation();

  const handleTablePageChange = useCallback((nextPage: number, nextPageSize: number) => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  }, []);
  const handleOpenDetail = useCallback((i: MeetingInvitation) => setDetailId(i.id), []);
  const handleConfirmOne = useCallback((i: MeetingInvitation) => setConfirmTargetIds([i.id]), []);
  const handleDeclineOne = useCallback((i: MeetingInvitation) => setDeclineTargetIds([i.id]), []);
  const handleViewParticipants = useCallback((i: MeetingInvitation) => setParticipantsId(i.id), []);
  const handleConfirmParticipantOne = useCallback(
    (invitation: MeetingInvitation, participant: InvitationParticipant) => setParticipantConfirmTarget({ invitation, participant }),
    []
  );
  const handleDeclineParticipantOne = useCallback(
    (invitation: MeetingInvitation, participant: InvitationParticipant) => setParticipantDeclineTarget({ invitation, participant }),
    []
  );

  useEffect(() => {
    setDetailId(null);
    setParticipantsId(null);
    setSelectedIds([]);
  }, [leaderId]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, filters, leaderId]);

  const statsParams = useMemo(
    () => ({
      participantId: leaderId,
      StartDate: filters.dateRange ? dayjs(filters.dateRange[0]).startOf('day').toISOString() : undefined,
      EndDate: filters.dateRange ? dayjs(filters.dateRange[1]).endOf('day').toISOString() : undefined,
      ScheduleTypeId: filters.meetingType !== 'all' ? filters.meetingType : undefined,
      MeetingType: filters.meetingMode !== 'all' ? API_MEETING_TYPE_BY_MODE[filters.meetingMode] : undefined,
      Priority: filters.priority !== 'all' ? API_PRIORITY_BY_UI[filters.priority] : undefined,
      search: filters.search || undefined,
    }),
    [leaderId, filters]
  );
  const { data: stats } = useInvitationStatsQuery(statsParams);

  const listParams = useMemo(
    () => ({
      ...statsParams,
      PageNumber: page,
      PageSize: pageSize,
      SortBy: 'StartDate',
      IsAscending: false,
      status: STATUS_BY_TAB[activeTab],
    }),
    [statsParams, activeTab, page, pageSize]
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const urlId = searchParams.get('id') || searchParams.get('occurrenceId');

  useEffect(() => {
    if (urlId) {
      setDetailId(urlId);
    }
  }, [urlId]);

  const queryClient = useQueryClient();

  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);
  const countdownIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const isAutoClosingRef = React.useRef(false);
  const initialStatusRef = React.useRef<string | null>(null);

  const handleCloseDetail = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoCloseCountdown(null);
    isAutoClosingRef.current = false;
    initialStatusRef.current = null;
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

  const triggerAutoCloseDueToCancellation = useCallback(() => {
    if (isAutoClosingRef.current) return;
    isAutoClosingRef.current = true;

    setConfirmTargetIds([]);
    setDeclineTargetIds([]);
    setParticipantConfirmTarget(null);
    setParticipantDeclineTarget(null);

    queryClient.invalidateQueries({ queryKey: ['meeting-invitations'] });
    queryClient.invalidateQueries({ queryKey: ['meeting-invitation-stats'] });
    queryClient.invalidateQueries({ queryKey: ['meeting-invitation-calendar-grid'] });
    queryClient.invalidateQueries({ queryKey: ['single-schedule-occurrence-invitation'] });

    toast.warning(
      t('meeting_invitations.schedule_cancelled_auto_close', {
        defaultValue: 'Lịch làm việc này đã bị hủy. Màn hình chi tiết sẽ tự động đóng sau vài giây...',
      }),
      t('meeting_invitations.schedule_cancelled_title', { defaultValue: 'Lịch đã bị hủy' })
    );

    let count = 3;
    setAutoCloseCountdown(count);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setAutoCloseCountdown(null);
        handleCloseDetail();
      } else {
        setAutoCloseCountdown(count);
      }
    }, 1000);
  }, [handleCloseDetail, queryClient, t]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  const { data, isLoading } = useInvitationsQuery(listParams);
  const invitations = data?.items ?? EMPTY_INVITATIONS;
  const total = data?.total ?? 0;

  const { data: calendarRawItems, isLoading: isCalendarLoading } = useInvitationCalendarGridQuery({
    year: calendarDate.year(),
    month: calendarDate.month() + 1,
    operatingLeaderId: leaderId,
  });

  const calendarItems = useMemo(() => {
    const items = calendarRawItems ?? [];
    const meetingType = filters.meetingMode !== 'all' ? API_MEETING_TYPE_BY_MODE[filters.meetingMode] : undefined;
    const priorityVal = filters.priority !== 'all' ? API_PRIORITY_BY_UI[filters.priority] : undefined;
    const q = (filters.search || '').trim().toLowerCase();

    return items.filter((item) => {
      if (activeTab !== 'all') {
        const pStatus = item.participantStatus;
        if (pStatus != null) {
          if (activeTab === 'pending' && pStatus !== ScheduleInvitationFilterStatus.Waiting) return false;
          if (activeTab === 'confirmed' && pStatus !== ScheduleInvitationFilterStatus.Accepted) return false;
          if (activeTab === 'declined' && pStatus !== ScheduleInvitationFilterStatus.Rejected) return false;
          if (activeTab === 'cancelled' && pStatus !== ScheduleInvitationFilterStatus.Cancelled && item.status !== ScheduleOccurrenceStatus.Cancelled) return false;
        } else {
          if (activeTab === 'pending' && item.status !== ScheduleOccurrenceStatus.Waiting) return false;
          if (activeTab === 'confirmed' && item.status !== ScheduleOccurrenceStatus.Approved) return false;
          if (activeTab === 'declined' && item.status !== ScheduleOccurrenceStatus.Rejected) return false;
          if (activeTab === 'cancelled' && item.status !== ScheduleOccurrenceStatus.Cancelled) return false;
        }
      }
      if (meetingType !== undefined && item.meetingType !== meetingType) return false;
      if (priorityVal !== undefined && item.priority !== priorityVal) return false;
      if (q && !(item.title || '').toLowerCase().includes(q) && !(item.location || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [calendarRawItems, activeTab, filters.meetingMode, filters.priority, filters.search]);

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

    const theme = SCHEDULE_OCCURRENCE_EVENT_THEME[resolveInvitationDisplayStatus(item.status, item.participantStatus)] ?? SCHEDULE_OCCURRENCE_EVENT_THEME[ScheduleOccurrenceStatus.Approved];
    const isTimeGrid = arg.view.type.startsWith('timeGrid');
    const isUrgent = item.priority === ApiSchedulePriority.Urgent;
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

  const activeTargetId = detailId;
  const { data: fetchedOccurrence } = useQuery({
    queryKey: ['single-schedule-occurrence-invitation', activeTargetId],
    queryFn: () => scheduleOccurrenceAPI.getScheduleOccurrenceById(activeTargetId!),
    enabled: !!activeTargetId,
    staleTime: 0,
  });

  const fetchedInvitation = useMemo(
    () => (fetchedOccurrence ? mapOccurrenceToInvitation(fetchedOccurrence, leaderId) : null),
    [fetchedOccurrence, leaderId]
  );

  const detailInvitation = useMemo(
    () => fetchedInvitation ?? invitations.find((i) => i.id === activeTargetId) ?? null,
    [fetchedInvitation, invitations, activeTargetId]
  );

  useEffect(() => {
    if (!detailId) {
      initialStatusRef.current = null;
      isAutoClosingRef.current = false;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setAutoCloseCountdown(null);
      return;
    }

    if (detailInvitation && initialStatusRef.current === null) {
      initialStatusRef.current = detailInvitation.myStatus;
    }

    if (activeTab === 'cancelled') return;

    const isNowCancelled =
      detailInvitation?.myStatus === 'cancelled' ||
      fetchedOccurrence?.status === ScheduleOccurrenceStatus.Cancelled;

    if (isNowCancelled && initialStatusRef.current && initialStatusRef.current !== 'cancelled') {
      triggerAutoCloseDueToCancellation();
    }
  }, [detailId, detailInvitation, fetchedOccurrence?.status, activeTab, triggerAutoCloseDueToCancellation]);

  useEffect(() => {
    const handleNotification = (notification: INotification) => {
      if (!detailId || isAutoClosingRef.current) return;
      if (activeTab === 'cancelled') return;

      const code = normalizeNotificationCode(notification.code);
      const isCancellation =
        code === normalizeNotificationCode(NOTIFICATION_CODES.CancelInvitationSchedule) ||
        code === normalizeNotificationCode(NOTIFICATION_CODES.CancelLeaderRegistrationSchedule) ||
        code === normalizeNotificationCode(NOTIFICATION_CODES.CancelPersonalSchedule) ||
        code === normalizeNotificationCode(NOTIFICATION_CODES.UndoInvitationPersonalSchedule) ||
        code === normalizeNotificationCode(NOTIFICATION_CODES.UndoInvitationLeaderRegistrationSchedule) ||
        code.includes('-cancelled') ||
        code.includes('undo-invited');

      if (!isCancellation) return;

      const targetId = extractNotificationTargetId(notification.content);
      const contentStr =
        typeof notification.content === 'string'
          ? notification.content
          : JSON.stringify(notification.content || {});

      const matchesCurrent =
        (targetId && (targetId === detailId || targetId === detailInvitation?.id)) ||
        contentStr.includes(detailId) ||
        (detailInvitation?.ticketNumber && contentStr.includes(detailInvitation.ticketNumber));

      if (matchesCurrent) {
        triggerAutoCloseDueToCancellation();
      }
    };

    const unsubscribe = signalRService.subscribe(handleNotification);
    return () => {
      unsubscribe();
    };
  }, [detailId, detailInvitation?.id, detailInvitation?.ticketNumber, activeTab, triggerAutoCloseDueToCancellation]);

  const participantsInvitation = useMemo(() => invitations.find((i) => i.id === participantsId) ?? null, [invitations, participantsId]);
  // Include the open detail: an invitation opened from the calendar / upcoming panel may not be on the
  // current table page, and without it the confirm/decline dialogs never opened from the detail.
  const resolveTargets = useCallback(
    (ids: string[]) => {
      const fromList = invitations.filter((i) => ids.includes(i.id));
      if (detailInvitation && ids.includes(detailInvitation.id) && !fromList.some((i) => i.id === detailInvitation.id)) {
        fromList.push(detailInvitation);
      }
      return fromList;
    },
    [invitations, detailInvitation]
  );
  const confirmTargets = useMemo(() => resolveTargets(confirmTargetIds), [resolveTargets, confirmTargetIds]);
  const declineTargets = useMemo(() => resolveTargets(declineTargetIds), [resolveTargets, declineTargetIds]);
  const selectedInvitations = useMemo(() => invitations.filter((i) => selectedIds.includes(i.id)), [invitations, selectedIds]);

  const counts = useMemo<Record<InvitationTabKey, number>>(
    () => ({
      pending: stats?.waiting ?? 0,
      confirmed: stats?.accepted ?? 0,
      declined: stats?.rejected ?? 0,
      cancelled: stats?.cancelled ?? 0,
      all: stats?.total ?? 0,
    }),
    [stats]
  );

  const handleConfirmOk = () => {
    const targetParticipantId = leaderId || defaultLeaderId;
    if (confirmTargets.length === 0 || !targetParticipantId) return;
    const ids = confirmTargets.map((i) => i.id);
    confirmMutation.mutate(
      { ids, participantId: targetParticipantId },
      {
        onSuccess: () => {
          toast.success(
            ids.length > 1
              ? t('meeting_invitations.toast_confirm_bulk_success', { count: ids.length })
              : t('meeting_invitations.toast_confirm_success')
          );
          setConfirmTargetIds([]);
          setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
          if (detailId && ids.includes(detailId)) handleCloseDetail();
        },
        onError: (error: any) => {
          setConfirmTargetIds([]);
          const errorMsg = getApiErrorMessage(error) || '';
          const isStatusError =
            errorMsg.toLowerCase().includes('không hợp lệ') ||
            errorMsg.toLowerCase().includes('hủy') ||
            errorMsg.toLowerCase().includes('trạng thái');

          if (isStatusError && detailId && ids.includes(detailId)) {
            triggerAutoCloseDueToCancellation();
          } else {
            toast.error(errorMsg || t('meeting_invitations.toast_mutation_error'));
          }
        },
      }
    );
  };

  const handleDeclineOk = (reason?: string) => {
    const targetParticipantId = leaderId || defaultLeaderId;
    if (declineTargets.length === 0 || !targetParticipantId) return;
    const ids = declineTargets.map((i) => i.id);
    declineMutation.mutate(
      { ids, participantId: targetParticipantId, reason },
      {
        onSuccess: () => {
          toast.success(
            ids.length > 1
              ? t('meeting_invitations.toast_decline_bulk_success', { count: ids.length })
              : t('meeting_invitations.toast_decline_success')
          );
          setDeclineTargetIds([]);
          setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
          if (detailId && ids.includes(detailId)) handleCloseDetail();
        },
        onError: (error: any) => {
          setDeclineTargetIds([]);
          const errorMsg = getApiErrorMessage(error) || '';
          const isStatusError =
            errorMsg.toLowerCase().includes('không hợp lệ') ||
            errorMsg.toLowerCase().includes('hủy') ||
            errorMsg.toLowerCase().includes('trạng thái');

          if (isStatusError && detailId && ids.includes(detailId)) {
            triggerAutoCloseDueToCancellation();
          } else {
            toast.error(errorMsg || t('meeting_invitations.toast_mutation_error'));
          }
        },
      }
    );
  };

  const handleConfirmParticipantOk = () => {
    if (!participantConfirmTarget) return;
    const { invitation, participant } = participantConfirmTarget;
    confirmMutation.mutate(
      { ids: [invitation.id], participantId: participant.id },
      {
        onSuccess: () => {
          toast.success(t('meeting_invitations.toast_confirm_success'));
          setParticipantConfirmTarget(null);
        },
        onError: (error: any) => {
          setParticipantConfirmTarget(null);
          const errorMsg = getApiErrorMessage(error) || '';
          const isStatusError =
            errorMsg.toLowerCase().includes('không hợp lệ') ||
            errorMsg.toLowerCase().includes('hủy') ||
            errorMsg.toLowerCase().includes('trạng thái');

          if (isStatusError && detailId === invitation.id) {
            triggerAutoCloseDueToCancellation();
          } else {
            toast.error(errorMsg || t('meeting_invitations.toast_mutation_error'));
          }
        },
      }
    );
  };

  const handleDeclineParticipantOk = (reason?: string) => {
    if (!participantDeclineTarget) return;
    const { invitation, participant } = participantDeclineTarget;
    declineMutation.mutate(
      { ids: [invitation.id], participantId: participant.id, reason },
      {
        onSuccess: () => {
          toast.success(t('meeting_invitations.toast_decline_success'));
          setParticipantDeclineTarget(null);
        },
        onError: (error: any) => {
          setParticipantDeclineTarget(null);
          const errorMsg = getApiErrorMessage(error) || '';
          const isStatusError =
            errorMsg.toLowerCase().includes('không hợp lệ') ||
            errorMsg.toLowerCase().includes('hủy') ||
            errorMsg.toLowerCase().includes('trạng thái');

          if (isStatusError && detailId === invitation.id) {
            triggerAutoCloseDueToCancellation();
          } else {
            toast.error(errorMsg || t('meeting_invitations.toast_mutation_error'));
          }
        },
      }
    );
  };

  return (
    <Box className="relative flex flex-col gap-4 pb-4 select-none [&_input]:select-text [&_textarea]:select-text">
      {/* Top Header Card (Image 2 design pattern) */}
      <Paper className={`${SURFACE} !p-5 flex flex-col gap-4 sticky top-0 z-20 shadow-xs backdrop-blur-md bg-white/95 dark:bg-slate-900/95`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <UserPlus size={20} className="text-[#00529C] dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                {t('meeting_invitations.title')}
              </h2>
              <p className="text-11.5 text-slate-500 dark:text-slate-400">{t('meeting_invitations.subtitle')}</p>
            </div>
          </div>
        </div>

        <InvitationStatusTabs counts={counts} />

        <InvitationFilterBar
          dateRangeIsAuto={isAutoMonthRange(dateRangeValue, calendarDate, viewMode === 'calendar')}
          onDateRangeChange={handleDateRangeChange}
          viewToggle={<InvitationViewModeToggle value={viewMode} onChange={setViewMode} />}
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
                placeholder={t('meeting_invitations.select_leader_placeholder')}
              />
            ) : undefined
          }
        />
      </Paper>

      {selectedInvitations.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#00529C]/20 bg-[#00529C]/[0.04] dark:border-blue-500/20 dark:bg-blue-500/[0.06] px-4 py-2.5">
          <span className="text-[12.5px] font-medium text-[#00529C] dark:text-blue-400">
            {t('meeting_invitations.selected_count', { count: selectedInvitations.length })}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="relative inline-flex items-center justify-center h-7.5 px-3.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-11 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 transition-all duration-200 ease-out cursor-pointer shadow-2xs active:scale-95 select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0"
            >
              <span>{t('meeting_invitations.selection_clear')}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmTargetIds(selectedInvitations.map((i) => i.id))}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-7.5 px-3.5 rounded-full text-white text-11 font-medium transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-95 shrink-0 select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0 bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]"
            >
              <CalendarCheck2 size={13} strokeWidth={2.5} className="transition-transform duration-200 group-hover/btn:scale-110" />
              <span>{t('meeting_invitations.action_confirm_all', { defaultValue: 'Xác nhận tất cả' })}</span>
            </button>
            <button
              type="button"
              onClick={() => setDeclineTargetIds(selectedInvitations.map((i) => i.id))}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-7.5 px-3.5 rounded-full text-white text-11 font-medium transition-all duration-200 ease-out cursor-pointer hover:-translate-y-0.5 active:scale-95 shrink-0 select-none before:absolute before:-top-2 before:-bottom-2 before:inset-x-0 bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]"
            >
              <CalendarX2 size={13} strokeWidth={2.5} className="transition-transform duration-200 group-hover/btn:scale-110" />
              <span>{t('meeting_invitations.action_decline_all', { defaultValue: 'Từ chối tất cả' })}</span>
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
        <InvitationTable
          invitations={invitations}
          loading={isLoading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={handleTablePageChange}
          onOpenDetail={handleOpenDetail}
          onConfirm={handleConfirmOne}
          onDecline={handleDeclineOne}
          onViewParticipants={handleViewParticipants}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      </div>

      <InvitationDetailModal
        invitation={detailInvitation}
        onClose={handleCloseDetail}
        onConfirm={(i) => setConfirmTargetIds([i.id])}
        onDecline={(i) => setDeclineTargetIds([i.id])}
        canManageParticipants={isExecutiveAdmin}
        onConfirmParticipant={handleConfirmParticipantOne}
        onDeclineParticipant={handleDeclineParticipantOne}
        autoCloseCountdown={autoCloseCountdown}
      />

      <ParticipantDialog
        open={!!participantsInvitation}
        onClose={() => setParticipantsId(null)}
        participants={
          participantsInvitation
            ? {
                confirmed: participantsInvitation.participants.confirmed,
                pending: participantsInvitation.participants.pending,
                rejected: participantsInvitation.participants.declined,
              }
            : null
        }
        title={participantsInvitation?.title}
      />

      <ConfirmAttendanceModal
        invitations={confirmTargets}
        onCancel={() => setConfirmTargetIds([])}
        onConfirm={handleConfirmOk}
        loading={confirmMutation.isPending}
      />

      <DeclineAttendanceDialog
        invitations={declineTargets}
        onCancel={() => setDeclineTargetIds([])}
        onConfirm={handleDeclineOk}
        loading={declineMutation.isPending}
      />

      <ConfirmAttendanceModal
        invitations={participantConfirmTarget ? [participantConfirmTarget.invitation] : []}
        onCancel={() => setParticipantConfirmTarget(null)}
        onConfirm={handleConfirmParticipantOk}
        loading={confirmMutation.isPending}
        participantName={participantConfirmTarget?.participant.name}
      />

      <DeclineAttendanceDialog
        invitations={participantDeclineTarget ? [participantDeclineTarget.invitation] : []}
        onCancel={() => setParticipantDeclineTarget(null)}
        onConfirm={handleDeclineParticipantOk}
        loading={declineMutation.isPending}
        participantName={participantDeclineTarget?.participant.name}
      />
    </Box>
  );
};

export default MeetingInvitations;
