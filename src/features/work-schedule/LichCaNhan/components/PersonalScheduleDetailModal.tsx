import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@mui/material';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  CalendarSearch,
  CalendarClock,
  ArrowRight,
  CalendarCheck2,
  CalendarX2,
  FileText,
  Users,
  MapPin,
  Building2,
  Video,
  MoreHorizontal,
  Paperclip,
  Link2,
  Mail,
  MailX,
  Download,
  Loader2,
  Phone,
  Lock,
  X,
  ListChecks,
  Check,
  Circle,
  CalendarOff,
  XCircle,
  UserPlus,
  Tag,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react';
import { StatusBadge } from '../../../../components/ui';
import { ParticipationStatus, PARTICIPANT_STATUS_BADGE_KEY } from '../../../../constants/participationStatus';
import { STATUS_COLOR_PALETTE, type StatusColorFamily } from '../../../../constants/statusColorPalette';
import { resolveAttachmentUrl, cn } from '../../../../utils/helpers';
import { isImageFile, isPreviewableDocFile } from '../../../../utils/fileType';
import { usePersonalScheduleDetailQuery } from '../hooks/usePersonalCalendarQueries';
import { useCanViewConfidential } from '../../../../hooks/useCanViewConfidential';
import { useAuthStore } from '../../../../store/authStore';
import { toast } from '../../../../store/toastStore';
import { downloadScheduleAttachment } from '../../../../services/api/scheduleOccurrenceAPI';
import type { AttachmentFile } from '../../../../components/ui/FileAttachmentInput';
import type { MeetingFormat, PersonalScheduleEvent } from '../types';
import { ScheduleCountdownCard } from '../../../../components/shared/ScheduleCountdownCard';

const AppLightbox = lazy(() => import('../../../../components/ui/AppLightbox'));
const FilePreviewModal = lazy(() => import('../../../../components/ui/FilePreviewModal'));

const initialsOf = (name: string) =>
  name?.split(' ').filter(Boolean).slice(-2).map((n) => n[0]).join('').toUpperCase() || '?';

const AvatarWithFallback: React.FC<{
  src?: string | null;
  name: string;
  className?: string;
  size?: number;
}> = ({ src, name, className, size = 36 }) => {
  const [error, setError] = useState(false);

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
      {initialsOf(name)}
    </div>
  );
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Field: React.FC<{ label: string; value?: React.ReactNode; className?: string }> = ({ label, value, className }) => (
  <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
    <span className="text-[11.5px] font-normal text-slate-500 dark:text-slate-400">{label}</span>
    <div className="min-w-0 text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
      {value || <span className="italic font-normal text-slate-300 dark:text-slate-600">—</span>}
    </div>
  </div>
);

const PERSONAL_STATUS_COLOR_FAMILY: Record<PersonalScheduleEvent['status'], StatusColorFamily> = {
  draft: 'slate',
  created: 'sky',
  pending: 'amber',
  approved: 'emerald',
  rejected: 'rose',
  cancelled: 'slate',
};

const PERSONAL_STATUS_ICON: Record<PersonalScheduleEvent['status'], React.ReactNode> = {
  draft: <FileText size={12} />,
  created: <Check size={12} strokeWidth={2.5} />,
  pending: <Circle size={12} />,
  approved: <Check size={12} strokeWidth={2.5} />,
  rejected: <X size={12} strokeWidth={2.5} />,
  cancelled: <CalendarOff size={12} />,
};

const MEETING_FORMAT_INFO: Record<MeetingFormat | 'other', { icon: React.ReactNode; labelKey: string; defaultLabel: string; className: string }> = {
  online: { icon: <Video size={13} className="shrink-0" />, labelKey: 'personal_calendar.format_online', defaultLabel: 'Trực tuyến', className: 'text-emerald-600 dark:text-emerald-400' },
  offline: { icon: <Building2 size={13} className="shrink-0" />, labelKey: 'personal_calendar.format_offline', defaultLabel: 'Trực tiếp', className: 'text-[#00529C] dark:text-blue-400' },
  other: { icon: <MoreHorizontal size={13} className="shrink-0" />, labelKey: 'personal_calendar.format_other', defaultLabel: 'Khác', className: 'text-slate-500 dark:text-slate-400' },
};

interface NavSection {
  key: 'general' | 'participants' | 'content' | 'timeline';
  number: number;
  labelKey: string;
  defaultLabel: string;
  subtitleKey?: string;
  defaultSubtitle?: string;
  icon: React.ReactNode;
}

const NAV_SECTIONS: NavSection[] = [
  { key: 'general', number: 1, labelKey: 'personal_calendar.section_general', defaultLabel: 'Thông tin chung', subtitleKey: 'personal_calendar.section_general_subtitle', defaultSubtitle: 'Thông tin cơ bản về lịch', icon: <FileText size={14} /> },
  { key: 'participants', number: 2, labelKey: 'personal_calendar.section_participants_nav', defaultLabel: 'Thành phần tham dự', subtitleKey: 'personal_calendar.section_participants_subtitle', defaultSubtitle: 'Danh sách người tham dự', icon: <Users size={14} /> },
  { key: 'content', number: 3, labelKey: 'personal_calendar.section_content_nav', defaultLabel: 'Nội dung & đính kèm', subtitleKey: 'personal_calendar.section_content_subtitle', defaultSubtitle: 'Nội dung chi tiết, ghi chú', icon: <FileText size={14} /> },
  { key: 'timeline', number: 4, labelKey: 'personal_calendar.timeline_title', defaultLabel: 'Các bước xử lý', subtitleKey: 'personal_calendar.timeline_subtitle', defaultSubtitle: 'Trạng thái phê duyệt', icon: <ListChecks size={14} /> },
];

type PersonalStepKey ='created' | 'pending' | 'approved' | 'rejected' | 'cancelled';

interface PersonalStepRow {
  key: PersonalStepKey;
  state: 'done' | 'current' | 'future';
  at?: string;
  variant?: 'default' | 'rose' | 'gray';
}

const buildPersonalSteps = (event: PersonalScheduleEvent): PersonalStepRow[] => {
  const rows: PersonalStepRow[] = [{ key: 'created', state: 'done', at: event.createdAt }];

  if (event.status === 'rejected') {
    rows.push({ key: 'pending', state: 'done' });
    rows.push({ key: 'rejected', state: 'done', variant: 'rose' });
    return rows;
  }
  if (event.status === 'cancelled') {
    rows.push({ key: 'cancelled', state: 'done', variant: 'gray' });
    return rows;
  }
  if (!event.isApprovalRequired) {
    return rows;
  }
  rows.push({ key: 'pending', state: event.status === 'pending' ? 'current' : 'done' });
  rows.push({ key: 'approved', state: event.status === 'approved' ? 'done' : 'future' });
  return rows;
};

const PERSONAL_STEP_LABEL: Record<PersonalStepKey, string> = {
  created: 'Đã tạo',
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
};

interface PersonalScheduleDetailModalProps {
  open: boolean;
  event: PersonalScheduleEvent | null;
  onClose: () => void;
  onApprove?: (event: PersonalScheduleEvent) => void;
  onReject?: (event: PersonalScheduleEvent) => void;
  /** Row actions from the list view, so the detail (opened from the calendar / agenda) can act too. */
  onEdit?: (event: PersonalScheduleEvent) => void;
  onCancel?: (event: PersonalScheduleEvent) => void;
  onDelete?: (event: PersonalScheduleEvent) => void;
  onDuplicate?: (event: PersonalScheduleEvent) => void;
  /** Section to scroll to (and flash) once the detail loads, e.g. 'participants' from a decline notification. */
  initialSection?: NavSection['key'];
}

export const PersonalScheduleDetailModal: React.FC<PersonalScheduleDetailModalProps> = ({
  open,
  event,
  onClose,
  onApprove,
  onReject,
  onEdit,
  onCancel,
  onDelete,
  onDuplicate,
  initialSection,
}) => {
  const { t } = useTranslation();
  const canView = useCanViewConfidential();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data: detailData } = usePersonalScheduleDetailQuery(event?.id, open && !!event);
  const detail = detailData && detailData.id === event?.id ? detailData : event;

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentFile | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection['key']>('general');
  const [flashSection, setFlashSection] = useState<NavSection['key'] | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Partial<Record<NavSection['key'], HTMLDivElement | null>>>({});
  const timelineCardRef = useRef<HTMLDivElement | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isClickingRef = useRef(false);
  const clickingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const steps = useMemo(() => (detail ? buildPersonalSteps(detail) : []), [detail]);

  const imageAttachments = useMemo(
    () => (detail?.attachments || []).filter((a) => isImageFile(a.name) || isImageFile(a.url || '')),
    [detail]
  );
  const imageSlides = useMemo(
    () => imageAttachments.map((a) => ({ src: resolveAttachmentUrl(a.url), alt: a.name, title: a.name })),
    [imageAttachments]
  );
  const fileAttachments = useMemo(
    () => (detail?.attachments || []).filter((a) => !imageAttachments.includes(a)),
    [detail, imageAttachments]
  );

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadAttachment = async (a: AttachmentFile) => {
    if (!detail?.id || !a.id) {
      if (a.url) {
        window.open(resolveAttachmentUrl(a.url), '_blank');
      }
      return;
    }
    try {
      setDownloadingId(a.id);
      await downloadScheduleAttachment(detail.id, a.id, a.name);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(t('common.download_error', { defaultValue: 'Tải file thất bại' }));
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    if (!open) return;
    setActiveSection('general');
  }, [open, detail?.id]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!open || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickingRef.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const key = (visible[0].target as HTMLElement).dataset.section as NavSection['key'] | undefined;
          if (key) setActiveSection(key);
        }
      },
      { root, threshold: 0, rootMargin: '-8% 0px -70% 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [open, detail?.id]);

  const scrollToSection = (key: NavSection['key']) => {
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
    target?.scrollIntoView({ behavior: 'smooth', block: key === 'timeline' ? 'nearest' : 'start' });
  };

  const landedForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      landedForIdRef.current = null;
      return;
    }
    if (!initialSection || !detail?.id || landedForIdRef.current === detail.id) return;
    landedForIdRef.current = detail.id;
    const timer = setTimeout(() => scrollToSection(initialSection), 350);
    return () => clearTimeout(timer);
  }, [open, initialSection, detail?.id]);

  useEffect(() => () => {
    clearTimeout(flashTimeoutRef.current);
    clearTimeout(clickingTimeoutRef.current);
  }, []);

  if (!detail) return null;

  const sameDay = detail.startDate === detail.endDate;
  const heroWeekday = dayjs(detail.startDate).format('dddd').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const heroDateText = sameDay
    ? `${heroWeekday}, ${dayjs(detail.startDate).format(t('common.date_long'))}`
    : `${dayjs(detail.startDate).format('DD/MM/YYYY')} — ${dayjs(detail.endDate).format('DD/MM/YYYY')}`;

  const plainContent = (detail.content || '').replace(/<[^>]*>/g, '').trim();
  const links = (detail.link || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const isMasked = detail.isConfidential && !canView(detail.ownerUser?.id);
  const displayTitle = isMasked
    ? t('personal_calendar.confidential_busy', { defaultValue: 'Lịch bảo mật' })
    : detail.title?.trim() || t('personal_calendar.detail_untitled');
  const participants = detail.participants || [];
  const formatInfo = MEETING_FORMAT_INFO[detail.meetingFormat] || MEETING_FORMAT_INFO.other;
  // Same rule as the table's row actions: only the schedule's own owner can approve/reject it
  // while it's pending.
  const canApprovePersonal = detail.status === 'pending' && !!currentUserId && detail.ownerUserId === currentUserId;
  // Same split as the table's actions column: cancelled/rejected schedules can only be duplicated,
  // everything else can be edited, cancelled or deleted.
  const detailStatusStr = String(detail.status || '').toLowerCase();
  const isDuplicateOnly = ['cancelled', '6', 'rejected', '5'].includes(detailStatusStr);
  const hasManageActions = isDuplicateOnly ? !!onDuplicate : !!(onEdit || onCancel || onDelete);
  const hasApproveActions = canApprovePersonal && !!(onApprove || onReject);
  const statusColors = STATUS_COLOR_PALETTE[PERSONAL_STATUS_COLOR_FAMILY[detail.status]];
  // Section card look while it's the nav's scroll target: status-tinted border + fill + soft lift, no halo ring.
  const sectionFlashClass = cn(statusColors.flash, 'shadow-[0_12px_30px_-14px_rgba(15,35,65,0.28)]');

  return (
    <Dialog
      open={open}
      onClose={(_e, reason) => {
        if (reason === 'backdropClick') return;
        onClose();
      }}
      scroll="paper"
      sx={{ '& .MuiDialog-container': { alignItems: 'center' } }}
      slotProps={{
        paper: {
          className: 'animate-page-fade-in overflow-hidden !rounded-[20px] !bg-white dark:!bg-[#0b1329] border border-[rgba(20,50,90,0.16)] dark:border-slate-700',
          style: {
            width: 'min(1480px, 95vw)',
            maxWidth: '94vw',
            boxShadow:
              '0 24px 60px -12px rgba(15,35,65,0.32), 0 10px 24px -8px rgba(15,35,65,0.18), 0 1px 0 rgba(15,35,65,0.05)',
          },
        },
      }}
    >
      <div className="flex min-h-0 flex-col" style={{ maxHeight: '94vh' }}>
        {/* Header */}
        <div
          className={cn(
            'flex shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 px-5 sm:px-7 pt-4 pb-3.5 transition-colors duration-300',
            statusColors.headerGradient
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', statusColors.iconGradient)}>
              <CalendarSearch size={18} strokeWidth={1.75} />
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <h2
                title={displayTitle}
                className={cn(
                  'text-[18px] leading-snug truncate',
                  !detail.title?.trim() && !isMasked
                    ? 'italic font-normal text-slate-400 dark:text-slate-500'
                    : 'font-semibold text-slate-800 dark:text-slate-100'
                )}
              >
                {displayTitle}
              </h2>
              {detail.priority === 'urgent' && <StatusBadge priority="urgent" size="sm" />}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 h-8 pl-2.5 pr-3.5 rounded-full border text-12.5 font-medium whitespace-nowrap shadow-2xs',
              statusColors.bg,
              statusColors.border,
              statusColors.text
            )}
          >
            <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white', statusColors.iconGradient)}>
              {PERSONAL_STATUS_ICON[detail.status]}
            </span>
            {t(`status.${detail.status}`, { defaultValue: detail.status })}
          </span>
          <span aria-hidden className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 bg-slate-100 dark:bg-[#05080f]">
          <div className="hidden md:flex w-[235px] shrink-0 flex-col gap-3 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 px-3 py-5">
            <div className="relative flex flex-col gap-1">

              {NAV_SECTIONS.map((section) => {
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
                          'text-13 leading-snug truncate transition-colors',
                          isActive ? cn('font-medium', statusColors.text) : 'font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
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
              date={dayjs(detail.startDate).format('YYYY-MM-DD')}
              endDate={dayjs(detail.endDate).format('YYYY-MM-DD')}
              startTime={detail.startTime}
              endTime={detail.endTime}
              inactiveLabel={
                detail.status === 'cancelled'
                  ? t('schedule_countdown.cancelled')
                  : detail.status === 'rejected'
                    ? t('schedule_countdown.rejected')
                    : undefined
              }
            />
          </div>

          {/* Middle: scrollable content */}
          <div ref={scrollRef} className="slim-scroll flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-white dark:bg-[#0b1329]">
            {/* Schedule hero: date/time anchor + format/location */}
            <div className="px-3 sm:px-3 pt-4">
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
                      {detail.startTime}
                      <ArrowRight size={18} strokeWidth={1.75} className="shrink-0 text-slate-300 dark:text-slate-600" />
                      {detail.endTime}
                    </div>
                  </div>
                </div>
                {!isMasked && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-[12.5px] font-medium ring-1 ring-slate-200/60 dark:ring-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]', formatInfo.className)}>
                      {formatInfo.icon}
                      {t(formatInfo.labelKey, { defaultValue: formatInfo.defaultLabel })}
                    </span>
                    {detail.location && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-[12.5px] font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-200/60 dark:ring-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                        <MapPin size={13} className="shrink-0 text-amber-500 dark:text-amber-400" />
                        {detail.location}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 px-4 sm:px-3 py-4">
              {detail.status === 'cancelled' && (
                <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', statusColors.bg, statusColors.border)}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white', statusColors.iconGradient)}>
                    <CalendarOff size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className={cn('text-[12.5px] font-semibold', statusColors.text)}>
                      {t('personal_calendar.cancelled_reason_label', { defaultValue: 'Lý do hủy lịch' })}
                    </div>
                    <div className="text-13 font-medium text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {detail.cancelledReason || (
                        <span className="italic font-normal text-slate-400 dark:text-slate-500">
                          {t('personal_calendar.reason_not_provided', { defaultValue: 'Không có lý do được cung cấp' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {detail.status === 'rejected' && (
                <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3', statusColors.bg, statusColors.border)}>
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white', statusColors.iconGradient)}>
                    <XCircle size={16} />
                  </span>
                  <div className="min-w-0">
                    <div className={cn('text-[12.5px] font-semibold', statusColors.text)}>
                      {t('personal_calendar.reject_reason_label', { defaultValue: 'Lý do từ chối' })}
                    </div>
                    <div className="text-13 font-medium text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {detail.rejectReason || (
                        <span className="italic font-normal text-slate-400 dark:text-slate-500">
                          {t('personal_calendar.reason_not_provided', { defaultValue: 'Không có lý do được cung cấp' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {isMasked ? (
                <div
                  ref={(el) => { sectionRefs.current.general = el; }}
                  data-section="general"
                  className="flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-4 py-3.5 text-[13px] text-slate-500 dark:text-slate-400"
                >
                  <Lock size={14} className="shrink-0" />
                  {t('personal_calendar.confidential_notice', { defaultValue: 'Lịch này được đánh dấu Mật — bạn chỉ xem được khung thời gian.' })}
                </div>
              ) : (
                <>
                  <div
                    ref={(el) => { sectionRefs.current.general = el; }}
                    data-section="general"
                    className={cn(
                      'rounded-2xl border p-4 transition-all duration-300',
                      flashSection === 'general'
                        ? sectionFlashClass
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 border-b pb-2.5 mb-3.5 border-slate-100 dark:border-slate-800">
                      <div
                        className={cn(
                          'text-base font-medium transition-colors duration-300',
                          flashSection === 'general' ? statusColors.text : 'text-slate-800 dark:text-slate-200'
                        )}
                      >
                        1. {t('personal_calendar.section_general', { defaultValue: 'Thông tin chung' })}
                      </div>
                    </div>

                    {detail.ownerUser && (
                      <div className="mb-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-r from-slate-50/80 via-white to-blue-50/30 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-800/30 p-3.5 flex items-center gap-3.5">
                        <AvatarWithFallback src={detail.ownerUser.avatarUrl} name={detail.ownerUser.fullname} size={44} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-12 text-slate-500 dark:text-slate-400 font-normal">
                              {t('meeting_invitations.created_by_label', { defaultValue: 'Người tạo/đăng ký:' })}
                            </span>
                            <span className="text-13.5 font-medium text-slate-800 dark:text-slate-100">{detail.ownerUser.fullname}</span>
                            {detail.ownerUser.employeeCode && (
                              <span className="px-2 py-0.5 rounded-full text-11 font-mono font-normal bg-blue-50 dark:bg-blue-950/50 text-[#00529C] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                                {detail.ownerUser.employeeCode}
                              </span>
                            )}
                          </div>
                          {(detail.ownerUser.positionName || detail.ownerUser.jobTitleName || detail.ownerUser.departmentName) && (
                            <div className="text-12 text-slate-600 dark:text-slate-300 truncate">
                              {[detail.ownerUser.positionName || detail.ownerUser.jobTitleName, detail.ownerUser.departmentName].filter(Boolean).join(' - ')}
                            </div>
                          )}
                          {(detail.ownerUser.email || detail.ownerUser.phoneNumber) && (
                            <div className="flex items-center gap-3 text-11.5 text-slate-500 dark:text-slate-400 flex-wrap">
                              {detail.ownerUser.email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail size={11} className="text-sky-500 dark:text-sky-400 shrink-0" />
                                  {detail.ownerUser.email}
                                </span>
                              )}
                              {detail.ownerUser.phoneNumber && (
                                <span className="inline-flex items-center gap-1">
                                  <Phone size={11} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                                  {detail.ownerUser.phoneNumber}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-7 gap-y-4">
                      <Field
                        label={t('personal_calendar.field_category')}
                        value={detail.scheduleTypeName && (
                          <span className="inline-flex items-center gap-1.5">
                            <Tag size={14} className="text-blue-500 shrink-0" />
                            {detail.scheduleTypeName}
                          </span>
                        )}
                      />
                      <Field
                        label={t('personal_calendar.field_location')}
                        value={detail.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={14} className="text-amber-500 shrink-0" />
                            {detail.location}
                          </span>
                        )}
                      />
                      <Field
                        label={t('personal_calendar.field_priority', { defaultValue: 'Mức độ ưu tiên' })}
                        value={detail.priority === 'urgent' ? <StatusBadge priority="urgent" size="sm" /> : t(`priority.${detail.priority || 'normal'}`)}
                      />
                    </div>
                  </div>

                  <div
                    ref={(el) => { sectionRefs.current.participants = el; }}
                    data-section="participants"
                    className={cn(
                      'rounded-2xl border p-4 transition-all duration-300',
                      flashSection === 'participants'
                        ? sectionFlashClass
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 border-b pb-2.5 mb-3.5 border-slate-100 dark:border-slate-800">
                      <div
                        className={cn(
                          'text-base font-medium transition-colors duration-300',
                          flashSection === 'participants' ? statusColors.text : 'text-slate-800 dark:text-slate-200'
                        )}
                      >
                        2. {t('personal_calendar.section_participants')}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-12 font-medium text-slate-400 dark:text-slate-500">
                        <UserPlus size={13} className="shrink-0" />
                        {participants.length} {t('personal_calendar.detail_people_unit', { defaultValue: 'người' })}
                      </span>
                    </div>

                    {participants.length > 0 ? (
                      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70">
                        {participants.map((p, idx) => {
                          const positionLine = [p.positionName || p.jobTitleName, p.department].filter(Boolean).join(' - ');
                          return (
                            <div
                              key={p.id || idx}
                              className="flex flex-col gap-2 py-2 -mx-2 px-2 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            >
                              <div className="flex items-center gap-3">
                              <AvatarWithFallback src={p.avatarUrl} name={p.name || '?'} size={48} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={
                                      p.name?.trim()
                                        ? 'text-[13px] font-medium text-slate-800 dark:text-slate-100 truncate'
                                        : 'text-[13px] italic text-slate-400 dark:text-slate-500 truncate'
                                    }
                                  >
                                    {p.name?.trim() || t('personal_calendar.detail_unnamed_participant')}
                                  </span>
                                  {p.code && (
                                    <span className="shrink-0 px-2 py-0.5 rounded-full text-11 font-mono font-normal bg-blue-50 dark:bg-blue-950/50 text-[#00529C] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                                      {p.code}
                                    </span>
                                  )}
                                </div>
                                {positionLine && (
                                  <div className="text-[12px] text-slate-500 dark:text-slate-400 truncate" title={positionLine}>
                                    {positionLine}
                                  </div>
                                )}
                                <div className="flex items-center gap-3 flex-wrap mt-0.5">
                                  {p.email && (
                                    <div className="flex items-center gap-1 text-11.5 text-slate-500 dark:text-slate-400 truncate">
                                      <Mail size={11} className="text-sky-500 dark:text-sky-400 shrink-0" />
                                      <span className="truncate">{p.email}</span>
                                    </div>
                                  )}
                                  {p.phoneNumber && (
                                    <div className="flex items-center gap-1 text-11.5 text-slate-500 dark:text-slate-400 truncate">
                                      <Phone size={11} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                                      <span className="truncate">{p.phoneNumber}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {p.status != null && (
                                <StatusBadge status={PARTICIPANT_STATUS_BADGE_KEY[p.status]} size="xs" className="shrink-0" />
                              )}
                              </div>
                              {p.status === ParticipationStatus.Reject && p.rejectReason && (
                                <div className="ml-[60px] rounded-lg border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-2.5 py-2">
                                  <div className="text-[10.5px] font-medium text-rose-700 dark:text-rose-300">
                                    {t('personal_calendar.participant_reject_reason_label', { defaultValue: 'Lý do từ chối tham dự' })}
                                  </div>
                                  <div className="text-12 text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                    {p.rejectReason}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="block text-[13px] italic text-slate-400 dark:text-slate-500">
                        {t('personal_calendar.detail_no_participants')}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-slate-400 mt-3">
                      {detail.isSendEmail ? (
                        <>
                          <Mail size={13} className="text-emerald-500 shrink-0" />
                          {t('personal_calendar.detail_send_email_on')}
                        </>
                      ) : (
                        <>
                          <MailX size={13} className="text-slate-400 shrink-0" />
                          {t('personal_calendar.detail_send_email_off')}
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    ref={(el) => { sectionRefs.current.content = el; }}
                    data-section="content"
                    className={cn(
                      'rounded-2xl border p-4 transition-all duration-300',
                      flashSection === 'content'
                        ? sectionFlashClass
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 border-b pb-2.5 mb-3.5 border-slate-100 dark:border-slate-800">
                      <div
                        className={cn(
                          'text-base font-medium transition-colors duration-300',
                          flashSection === 'content' ? statusColors.text : 'text-slate-800 dark:text-slate-200'
                        )}
                      >
                        3. {t('personal_calendar.section_content_nav', { defaultValue: 'Nội dung & đính kèm' })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-7 gap-y-4">
                        <Field
                          label={t('personal_calendar.field_content')}
                          value={
                            plainContent ? (
                              <div
                                className="text-[13px] leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto"
                                dangerouslySetInnerHTML={{ __html: detail.content }}
                              />
                            ) : (
                              <span className="italic font-normal text-slate-400 dark:text-slate-500">{t('personal_calendar.detail_no_content')}</span>
                            )
                          }
                        />

                        <Field
                          label={t('personal_calendar.field_note')}
                          value={
                            detail.note ? (
                              <div className="text-[13px] leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 max-h-40 overflow-y-auto">
                                {detail.note}
                              </div>
                            ) : (
                              <span className="italic font-normal text-slate-400 dark:text-slate-500">—</span>
                            )
                          }
                        />

                        <Field
                          label={t('personal_calendar.field_attachments')}
                          value={
                            detail.attachments && detail.attachments.length > 0 ? (
                              <div className="flex flex-col gap-2.5">
                                {imageAttachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {imageAttachments.map((a, idx) => (
                                      <button
                                        key={a.id || idx}
                                        type="button"
                                        title={a.name}
                                        onClick={() => setLightboxIndex(idx)}
                                        className="group/att relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 p-0"
                                      >
                                        <img loading="lazy" decoding="async" src={resolveAttachmentUrl(a.url)} alt={a.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/att:bg-black/30">
                                          <Eye size={14} className="text-white opacity-0 transition-opacity group-hover/att:opacity-100" />
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                {fileAttachments.map((a, idx) => {
                                  const resolvedUrl = resolveAttachmentUrl(a.url);
                                  const isPreviewable = !!resolvedUrl && isPreviewableDocFile(a.name || a.url || '');

                                  if (isPreviewable) {
                                    return (
                                      <div
                                        key={a.id || idx}
                                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-[#00529C] dark:hover:border-blue-400 transition-colors"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => setPreviewAttachment({ ...a, url: resolvedUrl })}
                                          className="flex flex-1 min-w-0 items-center gap-2.5 cursor-pointer text-left"
                                        >
                                          <Paperclip size={13} className="shrink-0 text-[#00529C] dark:text-blue-400" />
                                          <span className="flex-1 min-w-0 truncate text-12.5 font-medium text-slate-700 dark:text-slate-200">
                                            {a.name}
                                          </span>
                                          {!!a.size && (
                                            <span className="shrink-0 text-11 text-slate-400 dark:text-slate-500">{formatFileSize(a.size)}</span>
                                          )}
                                          <Eye size={13} className="shrink-0 text-slate-400" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadAttachment(a)}
                                          disabled={downloadingId === a.id}
                                          title={t('common.download', { defaultValue: 'Tải về' })}
                                          className="shrink-0 text-slate-400 hover:text-[#00529C] dark:hover:text-blue-400 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                          {downloadingId === a.id ? (
                                            <Loader2 size={13} className="animate-spin text-[#00529C] dark:text-blue-400" />
                                          ) : (
                                            <Download size={13} />
                                          )}
                                        </button>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={a.id || idx}
                                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-[#00529C] dark:hover:border-blue-400 transition-colors"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadAttachment(a)}
                                        className="flex flex-1 min-w-0 items-center gap-2.5 cursor-pointer text-left"
                                      >
                                        <Paperclip size={13} className="shrink-0 text-[#00529C] dark:text-blue-400" />
                                        <span className="flex-1 min-w-0 truncate text-12.5 font-medium text-slate-700 dark:text-slate-200">
                                          {a.name}
                                        </span>
                                        {!!a.size && (
                                          <span className="shrink-0 text-11 text-slate-400 dark:text-slate-500">{formatFileSize(a.size)}</span>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadAttachment(a)}
                                        disabled={downloadingId === a.id}
                                        title={t('common.download', { defaultValue: 'Tải về' })}
                                        className="shrink-0 text-slate-400 hover:text-[#00529C] dark:hover:text-blue-400 transition-colors cursor-pointer disabled:opacity-50"
                                      >
                                        {downloadingId === a.id ? (
                                          <Loader2 size={13} className="animate-spin text-[#00529C] dark:text-blue-400" />
                                        ) : (
                                          <Download size={13} />
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2.5 text-slate-400 dark:text-slate-500">
                                <Paperclip size={14} className="shrink-0" />
                                <span className="text-11.5 italic">{t('personal_calendar.detail_no_attachments')}</span>
                              </div>
                            )
                          }
                        />

                        <Field
                          label={t('personal_calendar.field_link')}
                          value={
                            links.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {links.map((link, idx) => (
                                  <a
                                    key={idx}
                                    href={link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-12.5 font-medium text-[#00529C] dark:text-blue-400 hover:underline truncate"
                                  >
                                    <Link2 size={13} className="shrink-0" />
                                    <span className="truncate">{link}</span>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <></>
                            )
                          }
                        />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="slim-scroll hidden lg:flex w-[305px] shrink-0 flex-col gap-4 border-l border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 px-4 py-4 overflow-y-auto backdrop-blur-md">
            <div
              ref={timelineCardRef}
              className={cn(
                'rounded-2xl border p-4 transition-all duration-300',
                flashSection === 'timeline'
                  ? sectionFlashClass
                  : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
              )}
            >
              <div className="text-13 font-medium text-slate-800 dark:text-slate-100 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                <span
                  className={cn(
                    'tracking-wide transition-colors duration-300',
                    flashSection === 'timeline' ? statusColors.text : 'text-slate-800 dark:text-slate-100'
                  )}
                >
                  {t('personal_calendar.timeline_title', { defaultValue: 'Các bước xử lý' })}
                </span>
              </div>
              <div className="flex flex-col relative pl-0.5">
                {steps.map((step, idx) => {
                  const isLast = idx === steps.length - 1;
                  const isDone = step.state === 'done';
                  const isCurrent = step.state === 'current';
                  const nextStep = steps[idx + 1];
                  const isNextDoneOrCurrent = nextStep && (nextStep.state === 'done' || nextStep.state === 'current');
                  const stepLabel = t(`personal_calendar.timeline_${step.key}`, { defaultValue: PERSONAL_STEP_LABEL[step.key] });

                  return (
                    <div key={step.key} className="relative flex gap-3.5 pb-4 last:pb-0 group">
                      {!isLast && (
                        <div
                          className={cn(
                            'absolute left-[8.5px] top-4.5 -bottom-1.5 w-px rounded-full transition-colors duration-300',
                            isNextDoneOrCurrent
                              ? 'bg-emerald-500/80 dark:bg-emerald-500/60'
                              : isCurrent
                                ? 'bg-gradient-to-b from-[#0066C7] to-slate-200 dark:to-slate-800'
                                : 'bg-slate-200 dark:bg-slate-800'
                          )}
                        />
                      )}

                      <span
                        className={cn(
                          'relative z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition-all duration-200',
                          isDone
                            ? (step.variant === 'rose'
                                ? 'bg-rose-500 text-white shadow-xs'
                                : step.variant === 'gray'
                                  ? 'bg-slate-400 text-white shadow-xs'
                                  : 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-xs')
                            : isCurrent
                              ? 'bg-[#0066C7] dark:bg-blue-500 text-white ring-4 ring-[#0066C7]/20 dark:ring-blue-500/20 shadow-xs'
                              : 'border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-transparent'
                        )}
                      >
                        {isDone && (
                          step.variant === 'rose' ? (
                            <X size={11} strokeWidth={2.5} />
                          ) : step.variant === 'gray' ? (
                            <CalendarOff size={11} />
                          ) : (
                            <Check size={11} strokeWidth={2.5} />
                          )
                        )}
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>

                      <div className="min-w-0 flex-1 pt-0.5">
                        <div
                          className={cn(
                            'text-12.5 leading-snug',
                            isDone || isCurrent
                              ? 'font-medium text-slate-700 dark:text-slate-200'
                              : 'font-normal text-slate-400 dark:text-slate-500'
                          )}
                        >
                          {stepLabel}
                        </div>
                        {step.at ? (
                          <div className="text-11 text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                            {dayjs(step.at).format('DD/MM/YYYY HH:mm')}
                          </div>
                        ) : isDone && (step.key === 'cancelled' || step.key === 'rejected') ? null : isDone ? (
                          <div className="text-11 text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                            {t('personal_calendar.detail_step_completed', { defaultValue: 'Đã hoàn thành' })}
                          </div>
                        ) : isCurrent ? (
                          <div className="text-11 text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                            {t('personal_calendar.detail_step_current', { defaultValue: 'Đang xử lý' })}
                          </div>
                        ) : (
                          <div className="text-11 text-slate-400 dark:text-slate-500 mt-0.5 italic">
                            {t('personal_calendar.detail_step_pending', { defaultValue: 'Chưa thực hiện' })}
                          </div>
                        )}
                        {step.key === 'rejected' && (
                          <div className="mt-1 text-11.5 leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2" title={detail.rejectReason || undefined}>
                            <span>{t('personal_calendar.reject_reason_label', { defaultValue: 'Lý do từ chối' })}: </span>
                            {detail.rejectReason ? (
                              <span className="font-medium text-rose-600 dark:text-rose-400">{detail.rejectReason}</span>
                            ) : (
                              <span className="italic">{t('personal_calendar.reason_not_provided', { defaultValue: 'Không có lý do được cung cấp' })}</span>
                            )}
                          </div>
                        )}
                        {step.key === 'cancelled' && (
                          <div className="mt-1 text-11.5 leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2" title={detail.cancelledReason || undefined}>
                            <span>{t('personal_calendar.cancelled_reason_label', { defaultValue: 'Lý do' })}: </span>
                            {detail.cancelledReason ? (
                              <span className="font-medium text-slate-700 dark:text-slate-200">{detail.cancelledReason}</span>
                            ) : (
                              <span className="italic">{t('personal_calendar.reason_not_provided', { defaultValue: 'Không có lý do được cung cấp' })}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {(hasManageActions || hasApproveActions) && (
          <div className="flex shrink-0 flex-wrap justify-end items-center gap-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 sm:px-7 py-3.5 [&>button]:min-w-[120px]">
            {/* Same set and look as the list row actions / the leadership detail footer. */}
            {!isDuplicateOnly && onDelete && (
              <button type="button" onClick={() => onDelete(detail)} className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]">
                <Trash2 size={14} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
                <span>{t('common.action_delete')}</span>
              </button>
            )}
            {!isDuplicateOnly && onCancel && (
              <button type="button" onClick={() => onCancel(detail)} className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 shadow-[0_2px_8px_-2px_rgba(100,116,139,0.3)]">
                <CalendarOff size={14} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110 group-hover/btn:-rotate-12" />
                <span>{t('personal_calendar.action_cancel')}</span>
              </button>
            )}
            {!isDuplicateOnly && onEdit && (
              <button type="button" onClick={() => onEdit(detail)} className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-[#1A7FDB] to-[#0066C7] hover:from-[#0F72CF] hover:to-[#005AB0] shadow-[0_2px_8px_-2px_rgba(0,102,199,0.3)]">
                <Pencil size={14} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
                <span>{t('common.action_edit')}</span>
              </button>
            )}
            {isDuplicateOnly && onDuplicate && (
              <button type="button" onClick={() => onDuplicate(detail)} className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-[#1A7FDB] to-[#0066C7] hover:from-[#0F72CF] hover:to-[#005AB0] shadow-[0_2px_8px_-2px_rgba(0,102,199,0.3)]">
                <Copy size={14} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
                <span>{t('common.action_duplicate')}</span>
              </button>
            )}
            {hasApproveActions && onReject && (
              <button type="button" onClick={() => onReject(detail)} className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]">
                <CalendarX2 size={14} strokeWidth={2.5} className="transition-transform duration-200 group-hover/btn:scale-110" />
                <span>{t('schedule_approval.action_reject', { defaultValue: 'Từ chối' })}</span>
              </button>
            )}
            {hasApproveActions && onApprove && (
              <button type="button" onClick={() => onApprove(detail)} className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]">
                <CalendarCheck2 size={14} strokeWidth={2.5} className="transition-transform duration-200 group-hover/btn:scale-110" />
                <span>{t('schedule_approval.action_approve', { defaultValue: 'Duyệt' })}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Suspense fallback={null}>
          <AppLightbox index={lightboxIndex} slides={imageSlides} onClose={() => setLightboxIndex(null)} />
        </Suspense>
      )}

      {previewAttachment && (
        <Suspense fallback={null}>
          <FilePreviewModal
            open
            url={previewAttachment.url || ''}
            name={previewAttachment.name}
            onClose={() => setPreviewAttachment(null)}
          />
        </Suspense>
      )}
    </Dialog>
  );
};

export default PersonalScheduleDetailModal;
