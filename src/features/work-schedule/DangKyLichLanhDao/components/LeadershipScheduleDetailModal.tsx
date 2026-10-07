import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  CalendarSearch,
  FileText,
  Users,
  MapPin,
  Building2,
  Video,
  MoreHorizontal,
  CalendarClock,
  Paperclip,
  Link2,
  Mail,
  Download,
  Loader2,
  ListChecks,
  Check,
  CalendarCheck2,
  CalendarX2,
  Pencil,
  UserPlus,
  Phone,
  Tag,
  Lock,
  Clock,
  CalendarOff,
  CheckCheck,
  Send,
  FileEdit,
  X,
  RotateCcw,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import {
  FormModal,
  FormModalHeader,
  ReadOnlyField,
} from '../../../../components/ui/FormModal';
import { StatusBadge } from '../../../../components/ui';
import { resolveAttachmentUrl, cn } from '../../../../utils/helpers';
import { isImageFile, isPreviewableDocFile } from '../../../../utils/fileType';
import { toast } from '../../../../store/toastStore';
import { downloadScheduleAttachment } from '../../../../services/api/scheduleOccurrenceAPI';
import type { AttachmentFile } from '../../../../components/ui/FileAttachmentInput';
import { userAPI, type IExecutiveUser } from '../../../../services/api/userAPI';
import { STATUS_COLOR_PALETTE } from '../../../../constants/statusColorPalette';
import { ParticipationStatus, PARTICIPANT_STATUS_BADGE_KEY } from '../../../../constants/participationStatus';
import type { ScheduleRequest, RequestStatus, TimelineStepKey } from '../types';
import { STATUS_COLOR_FAMILY } from '../statusTheme';
import { execDisplay } from '../LeadershipScheduleRegistration';
import { getDisplayStatus } from '../utils/occurrenceAdapter';
import { useCanViewConfidential } from '../../../../hooks/useCanViewConfidential';
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
}> = ({ src, name, className, size = 38 }) => {
  const [error, setError] = useState(false);
  const resolvedUrl = src ? resolveAttachmentUrl(src) : null;

  useEffect(() => {
    setError(false);
  }, [resolvedUrl]);

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
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00529C] to-blue-600 text-white font-medium text-12 shadow-xs',
        className
      )}
      style={{ width: size, height: size }}
    >
      {initialsOf(name)}
    </div>
  );
};

const DetailField: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex min-w-0 flex-col gap-1.5">
    <span className="text-[11.5px] font-normal text-slate-500 dark:text-slate-400">{label}</span>
    <div className="min-w-0 text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
      {value || <span className="italic font-normal text-slate-300 dark:text-slate-600">—</span>}
    </div>
  </div>
);

const formatFileSize = (bytes: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface StepRow {
  key: TimelineStepKey;
  state: 'done' | 'current' | 'future';
  at?: string;
  variant?: 'default' | 'rose' | 'gray';
}

function buildSteps(request: ScheduleRequest): StepRow[] {
  const findAt = (key: TimelineStepKey) => request.timeline.find((e) => e.key === key)?.at;
  if (request.status === 'draft') {
    return [{ key: 'draft', state: 'current', at: findAt('draft') ?? findAt('created'), variant: 'gray' }];
  }
  const rows: StepRow[] = [
    { key: 'created', state: 'done', at: findAt('created') },
  ];

  if (request.status === 'rejected') {
    rows.push({ key: 'pending', state: 'done', at: findAt('pending') });
    rows.push({ key: 'rejected', state: 'done', at: findAt('rejected'), variant: 'rose' });
    return rows;
  }
  if (request.status === 'cancelled') {
    rows.push({ key: 'pending', state: 'done', at: findAt('pending') });
    rows.push({ key: 'cancelled', state: 'done', at: findAt('cancelled'), variant: 'gray' });
    return rows;
  }
  rows.push({ key: 'pending', state: request.status === 'pending' || request.status === 'submitted' ? 'current' : 'done', at: findAt('pending') });
  rows.push({ key: 'approved', state: request.status === 'approved' ? 'done' : request.status === 'completed' ? 'done' : 'future', at: findAt('approved') });
  rows.push({ key: 'completed', state: request.status === 'completed' ? 'done' : 'future', at: findAt('completed') });
  return rows;
}

const CANCELLABLE: RequestStatus[] = ['submitted', 'pending', 'approved'];
const RESUBMITTABLE: RequestStatus[] = ['rejected', 'cancelled'];

const STATUS_ICON: Record<RequestStatus, React.ReactNode> = {
  draft: <FileEdit size={13} />,
  submitted: <Send size={13} />,
  pending: <Clock size={13} />,
  approved: <Check size={13} strokeWidth={2.5} />,
  rejected: <X size={13} strokeWidth={2.5} />,
  cancelled: <CalendarOff size={13} />,
  completed: <CheckCheck size={13} />,
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
  { key: 'general', number: 1, labelKey: 'leadership_schedule.section_general', defaultLabel: 'Thông tin chung', subtitleKey: 'leadership_schedule.section_general_subtitle', defaultSubtitle: 'Chi tiết cuộc họp', icon: <FileText size={14} /> },
  { key: 'participants', number: 2, labelKey: 'leadership_schedule.section_participants', defaultLabel: 'Thành phần tham dự', subtitleKey: 'leadership_schedule.section_participants_subtitle', defaultSubtitle: 'Thêm người tham dự', icon: <Users size={14} /> },
  { key: 'content', number: 3, labelKey: 'leadership_schedule.section_content', defaultLabel: 'Nội dung & đính kèm', subtitleKey: 'leadership_schedule.section_content_subtitle', defaultSubtitle: 'Thông tin cuộc họp', icon: <FileText size={14} /> },
  { key: 'timeline', number: 4, labelKey: 'leadership_schedule.timeline_title', defaultLabel: 'Các bước xử lý', subtitleKey: 'leadership_schedule.timeline_subtitle', defaultSubtitle: 'Quy trình phê duyệt', icon: <ListChecks size={14} /> },
];

interface LeadershipScheduleDetailModalProps {
  open: boolean;
  request: ScheduleRequest | null;
  executiveById: Map<string, IExecutiveUser>;
  onClose: () => void;
  onCancel?: (request: ScheduleRequest) => void;
  onResubmit?: (request: ScheduleRequest) => void;
  onApprove?: (request: ScheduleRequest) => void;
  onReject?: (request: ScheduleRequest) => void;
  /** Delete a draft — same as the list row's "Xóa nháp". */
  onDelete?: (request: ScheduleRequest) => void;
}

export const LeadershipScheduleDetailModal: React.FC<LeadershipScheduleDetailModalProps> = ({
  open,
  request,
  executiveById,
  onClose,
  onCancel,
  onResubmit,
  onApprove,
  onReject,
  onDelete,
}) => {
  const { t } = useTranslation();
  const canView = useCanViewConfidential();

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

  const { exec, name: execNameFromDir, title: execTitleFromDir } = useMemo(
    () => (request ? execDisplay(executiveById, request.executiveId) : { exec: undefined, name: '', title: '' }),
    [request, executiveById]
  );

  const { data: userProfile } = useQuery({
    queryKey: ['user-detail', request?.executiveId],
    queryFn: () => (request?.executiveId ? userAPI.getUserById(request.executiveId) : null),
    enabled: !!request?.executiveId && !exec?.avatarUrl && !request?.executiveAvatarUrl,
    staleTime: 5 * 60 * 1000,
  });

  const executiveAvatar = request?.executiveAvatarUrl || exec?.avatarUrl || userProfile?.avatarUrl || null;
  const executiveCode = request?.executiveCode || exec?.employeeCode || userProfile?.employeeCode || null;
  const executiveName = request?.executiveName || execNameFromDir || userProfile?.fullname || '';
  const executiveTitle = request?.executiveTitle || execTitleFromDir || userProfile?.positionName || userProfile?.jobTitleName || '';

  const steps = useMemo(() => (request ? buildSteps(request) : []), [request]);

  const imageAttachments = useMemo(
    () => (request?.attachments || []).filter((a) => isImageFile(a.name) || isImageFile(a.url || '')),
    [request]
  );
  const imageSlides = useMemo(
    () => imageAttachments.map((a) => ({ src: resolveAttachmentUrl(a.url), alt: a.name, title: a.name })),
    [imageAttachments]
  );
  const fileAttachments = useMemo(
    () => (request?.attachments || []).filter((a) => !imageAttachments.includes(a)),
    [request, imageAttachments]
  );

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadAttachment = async (a: AttachmentFile) => {
    if (!request?.id || !a.id) {
      if (a.url) {
        window.open(resolveAttachmentUrl(a.url), '_blank');
      }
      return;
    }
    try {
      setDownloadingId(a.id);
      await downloadScheduleAttachment(request.id, a.id, a.name);
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
  }, [open, request?.id]);

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
  }, [open, request?.id]);

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

  useEffect(() => () => {
    clearTimeout(flashTimeoutRef.current);
    clearTimeout(clickingTimeoutRef.current);
  }, []);

  if (!request) return null;

  const sameDay = request.date === request.endDate;
  const heroWeekday = dayjs(request.date).format('dddd').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  const heroDateText = sameDay
    ? `${heroWeekday}, ${dayjs(request.date).format(t('common.date_long'))}`
    : `${dayjs(request.date).format('DD/MM/YYYY')} — ${dayjs(request.endDate).format('DD/MM/YYYY')}`;

  const isMasked = request.isConfidential && !canView(request.requester?.id, [request.executiveId]);
  const plainContent = (request.description || '').replace(/<[^>]*>/g, '').trim();
  const links = (request.link || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const displayTitle = isMasked
    ? t('leadership_schedule.confidential_busy', { defaultValue: 'Lịch bảo mật' })
    : request.title?.trim() || t('leadership_schedule.detail_untitled', { defaultValue: 'Không có tiêu đề' });
  const participants = request.participants || [];
  const displayStatus = getDisplayStatus(request);
  const statusColors = STATUS_COLOR_PALETTE[STATUS_COLOR_FAMILY[displayStatus]];
  // Section card look while it's the nav's scroll target: status-tinted border + fill + soft lift, no halo ring.
  const sectionFlashClass = cn(statusColors.flash, 'shadow-[0_12px_30px_-14px_rgba(15,35,65,0.28)]');
  const statusStyle = { icon: statusColors.iconGradient, header: statusColors.headerGradient };
  const isEditable = !!onResubmit && (request.status === 'draft' || request.status === 'pending' || request.status === 'submitted');

  const editButton = isEditable ? (
    <button
      type="button"
      onClick={() => onResubmit?.(request)}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-12 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer transition-colors hover:border-[#00529C] hover:text-[#00529C] dark:hover:border-blue-400 dark:hover:text-blue-400"
    >
      <Pencil size={12} />
      {t('leadership_schedule.action_edit', { defaultValue: 'Chỉnh sửa' })}
    </button>
  ) : null;

  return (
    <FormModal open={open} onCancel={onClose} width="80vw" centered>
      <FormModalHeader
        title={
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'text-[18px] leading-snug',
                !request.title?.trim()
                  ? 'italic font-normal text-slate-400 dark:text-slate-500'
                  : 'font-semibold text-slate-800 dark:text-slate-100'
              )}
            >
              {displayTitle}
            </span>
            {request.priority === 'urgent' && (
              <StatusBadge priority="urgent" size="sm" />
            )}
          </div>
        }
        icon={<CalendarSearch size={24} className="text-white" />}
        iconClassName={statusStyle.icon}
        className={statusStyle.header}
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
              {STATUS_ICON[displayStatus]}
            </span>
            {t(`leadership_schedule.status_${displayStatus}`, { defaultValue: displayStatus })}
          </span>
        }
        onClose={onClose}
      />

      <div className="flex flex-1 min-h-0 bg-slate-100 dark:bg-[#05080f]">
        {/* Left: section nav */}
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
            date={request.date}
            endDate={request.endDate}
            startTime={request.startTime}
            endTime={request.endTime}
            inactiveLabel={
              request.status === 'cancelled'
                ? t('schedule_countdown.cancelled')
                : request.status === 'rejected'
                  ? t('schedule_countdown.rejected')
                  : undefined
            }
          />
        </div>

        {/* Middle: content */}
        <div ref={scrollRef} className="slim-scroll flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-4 flex flex-col gap-2">
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
                  {request.startTime}
                  <ArrowRight size={18} strokeWidth={1.75} className="shrink-0 text-slate-300 dark:text-slate-600" />
                  {request.endTime}
                </div>
              </div>
            </div>
            {!isMasked && (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-[12.5px] font-medium ring-1 ring-slate-200/60 dark:ring-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
                    request.meetingFormat === 'online'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : request.meetingFormat === 'offline'
                        ? 'text-[#00529C] dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-300'
                  )}
                >
                  {request.meetingFormat === 'online' ? (
                    <Video size={13} className="shrink-0" />
                  ) : request.meetingFormat === 'offline' ? (
                    <Building2 size={13} className="shrink-0" />
                  ) : (
                    <MoreHorizontal size={13} className="shrink-0" />
                  )}
                  {request.meetingFormat === 'online'
                    ? t('leadership_schedule.format_online', { defaultValue: 'Trực tuyến' })
                    : request.meetingFormat === 'offline'
                      ? t('leadership_schedule.format_offline', { defaultValue: 'Trực tiếp' })
                      : t('leadership_schedule.format_other', { defaultValue: 'Khác' })}
                </span>
                {request.location && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-1.5 text-[12.5px] font-medium text-slate-700 dark:text-slate-300 ring-1 ring-slate-200/60 dark:ring-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <MapPin size={13} className="shrink-0 text-amber-500 dark:text-amber-400" />
                    {request.location}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Section 1: General info */}
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
                1. {t('leadership_schedule.section_general', { defaultValue: 'Thông tin chung' })}
              </div>
              {editButton}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-4">

              {/* People column: requester above the leader they registered with */}
              <div className="flex flex-col gap-4 min-w-0 lg:row-span-2">
                {request.requester && (
                  <DetailField
                    label={t('schedule_approval.col_requester', { defaultValue: 'Người đăng ký' })}
                    value={
                      <div className="flex items-center gap-2.5 min-w-0 py-0.5">
                        <AvatarWithFallback src={request.requester.avatarUrl} name={request.requester.name} size={40} />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-13 font-medium text-slate-700 dark:text-slate-200 truncate" title={request.requester.name}>
                              {request.requester.name}
                            </span>
                            {request.requester.code && (
                              <span className="shrink-0 text-11 font-mono font-medium px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-[#00529C] dark:text-blue-400">
                                {request.requester.code}
                              </span>
                            )}
                          </div>
                          {(() => {
                            // "Chức vụ - Phòng ban", same as the Personal schedule detail
                            const subtitle = [request.requester.position, request.requester.department].filter(Boolean).join(' - ');
                            return subtitle ? (
                              <span className="text-11.5 text-slate-500 dark:text-slate-400 font-normal truncate" title={subtitle}>
                                {subtitle}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    }
                  />
                )}
                {executiveName ? (
                  <DetailField
                    label={t('leadership_schedule.detail_executive', { defaultValue: 'Lãnh đạo' })}
                    value={
                      <div className="flex items-center gap-2.5 min-w-0 px-2.5 py-2 -mx-0.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 shadow-xs">
                        <AvatarWithFallback src={executiveAvatar} name={executiveName} size={40} />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-13 font-medium text-[#00529C] dark:text-blue-400 truncate" title={executiveName}>
                              {executiveName}
                            </span>
                            {executiveCode && (
                              <span className="shrink-0 text-11 font-mono font-medium px-1.5 py-0.2 rounded bg-white dark:bg-blue-950/60 text-[#00529C] dark:text-blue-400">
                                {executiveCode}
                              </span>
                            )}
                          </div>
                          {executiveTitle && (
                            <span className="text-11.5 text-slate-500 dark:text-slate-400 font-normal truncate" title={executiveTitle}>
                              {executiveTitle}
                            </span>
                          )}
                        </div>
                      </div>
                    }
                  />
                ) : null}
              </div>

              {request.scheduleTypeName && (
                <DetailField
                  label={t('leadership_schedule.field_category', { defaultValue: 'Loại lịch' })}
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Tag size={14} className="text-blue-500 shrink-0" />
                      {request.scheduleTypeName}
                    </span>
                  }
                />
              )}


              <DetailField
                label={t('leadership_schedule.field_location', { defaultValue: 'Địa điểm' })}
                value={
                  isMasked ? undefined : request.location ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} className="text-amber-500 shrink-0" />
                      {request.location}
                    </span>
                  ) : undefined
                }
              />

              <DetailField
                label={t('leadership_schedule.field_format', { defaultValue: 'Hình thức' })}
                value={
                  <span className="inline-flex items-center gap-1.5">
                    {request.meetingFormat === 'online' ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Video size={14} className="shrink-0" />
                        {t('leadership_schedule.format_online', { defaultValue: 'Trực tuyến' })}
                      </span>
                    ) : request.meetingFormat === 'offline' ? (
                      <span className="inline-flex items-center gap-1.5 text-[#00529C] dark:text-blue-400">
                        <Building2 size={14} className="shrink-0" />
                        {t('leadership_schedule.format_offline', { defaultValue: 'Trực tiếp' })}
                      </span>
                    ) : (
                      <>
                        <MoreHorizontal size={14} className="text-slate-400 shrink-0" />
                        {t('leadership_schedule.format_other', { defaultValue: 'Khác' })}
                      </>
                    )}
                  </span>
                }
              />

              <DetailField
                label={t('leadership_schedule.field_priority_short', { defaultValue: 'Mức độ ưu tiên' })}
                value={request.priority === 'urgent' ? <StatusBadge priority="urgent" size="sm" /> : t(`priority.${request.priority || 'normal'}`)}
              />
            </div>
          </div>

          {/* Section 2: Participants */}
          {!isMasked && (
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
                2. {t('leadership_schedule.section_participants', { defaultValue: 'Thành phần tham dự' })}
              </div>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => onResubmit?.(request)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-12 font-medium text-slate-600 dark:text-slate-300 cursor-pointer transition-colors hover:border-[#00529C] hover:text-[#00529C] dark:hover:border-blue-400 dark:hover:text-blue-400"
                >
                  <UserPlus size={13} />
                  {t('leadership_schedule.action_add_participant', { defaultValue: 'Thêm thành viên' })}
                </button>
              )}
            </div>

            {participants.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {participants.map((p, idx) => {
                  const displayName = (p.name && p.name.trim()) || p.code || p.id || 'N/A';
                  const showRejectReason = p.status === ParticipationStatus.Reject && p.rejectReason;
                  return (
                    <div
                      key={p.id || idx}
                      className="flex flex-col gap-2 px-3.5 py-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/90 dark:bg-slate-900/90 shadow-2xs hover:border-[#00529C]/40 dark:hover:border-blue-500/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <AvatarWithFallback src={p.avatarUrl} name={displayName} size={40} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-13.5 font-medium text-slate-800 dark:text-slate-100 truncate">
                              {displayName}
                            </span>
                            {p.code && (
                              <span className="shrink-0 text-11 font-mono font-medium px-2 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#00529C] dark:text-blue-400">
                                {p.code}
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
                            {[p.position, p.department].filter(Boolean).join(' - ')}
                          </div>
                          {(p.email || p.phone) && (
                            <div className="flex items-center gap-3 text-[11.5px] text-slate-400 dark:text-slate-500 min-w-0">
                              {p.email && (
                                <span className="inline-flex items-center gap-1 min-w-0">
                                  <Mail size={10} className="text-sky-500 dark:text-sky-400 shrink-0" />
                                  <span className="truncate">{p.email}</span>
                                </span>
                              )}
                              {p.phone && (
                                <span className="inline-flex items-center gap-1 shrink-0">
                                  <Phone size={10} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                                  {p.phone}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {p.status !== undefined ? (
                          <StatusBadge status={PARTICIPANT_STATUS_BADGE_KEY[p.status]} size="xs" className="shrink-0" />
                        ) : (
                          <span className="shrink-0 text-12 font-medium text-slate-500 dark:text-slate-400">
                            {t('leadership_schedule.detail_participant_role', { defaultValue: 'Người tham dự' })}
                          </span>
                        )}
                      </div>
                      {showRejectReason && (
                        <div className="ml-[52px] rounded-lg border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 px-2.5 py-2">
                          <div className="text-[10.5px] font-medium text-rose-700 dark:text-rose-300">
                            {t('leadership_schedule.participant_reject_reason_label', { defaultValue: 'Lý do từ chối tham dự' })}
                          </div>
                          <div className="text-11 text-slate-600 dark:text-slate-300 leading-relaxed">
                            {p.rejectReason}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-13 italic text-slate-400 dark:text-slate-500">
                {t('leadership_schedule.detail_no_participants', { defaultValue: 'Chưa có thành phần tham dự' })}
              </span>
            )}
          </div>
          )}

          {/* Section 3: Content & attachments */}
          {isMasked ? (
            <div
              ref={(el) => { sectionRefs.current.content = el; }}
              data-section="content"
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 flex items-center gap-2 text-13 text-slate-500 dark:text-slate-400"
            >
              <Lock size={14} className="shrink-0" />
              {t('leadership_schedule.confidential_notice', { defaultValue: 'Lịch này được đánh dấu Mật — bạn chỉ xem được khung thời gian.' })}
            </div>
          ) : (
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
                3. {t('leadership_schedule.section_content', { defaultValue: 'Nội dung & đính kèm' })}
              </div>
              {editButton}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ReadOnlyField
                label={t('leadership_schedule.field_content', { defaultValue: 'Nội dung chi tiết' })}
                value={
                  plainContent ? (
                    <div
                      className="h-full text-13.5 leading-relaxed font-normal text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto [&_p]:m-0"
                      dangerouslySetInnerHTML={{ __html: request.description || '' }}
                    />
                  ) : (
                    <span className="italic text-13.5 text-slate-400">{t('leadership_schedule.detail_no_content', { defaultValue: 'Chưa có nội dung' })}</span>
                  )
                }
              />

              <ReadOnlyField
                label={t('leadership_schedule.field_note', { defaultValue: 'Ghi chú' })}
                value={
                  request.note ? (
                    <div className="h-full text-13.5 leading-relaxed font-normal text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 max-h-48 overflow-y-auto">
                      {request.note}
                    </div>
                  ) : (
                    <span className="italic text-13.5 text-slate-400">—</span>
                  )
                }
              />

              <ReadOnlyField
                label={t('leadership_schedule.field_attachments', { defaultValue: 'Tài liệu đính kèm' })}
                value={
                  request.attachments && request.attachments.length > 0 ? (
                    <div className="flex flex-col gap-2.5 mt-0.5">
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
                      <span className="text-11.5 italic">
                        {t('leadership_schedule.detail_no_attachments', { defaultValue: 'Chưa có tệp đính kèm' })}
                      </span>
                    </div>
                  )
                }
              />

              <ReadOnlyField
                label={t('leadership_schedule.field_link', { defaultValue: 'Link tham khảo' })}
                value={
                  links.length > 0 ? (
                    <div className="flex flex-col gap-1.5 mt-0.5">
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
          )}
        </div>

        {/* Right: status + timeline + help sidebar */}
        <div className="slim-scroll hidden lg:flex w-[305px] shrink-0 flex-col gap-4 border-l border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 px-4 py-4 overflow-y-auto backdrop-blur-md">
          {/* Timeline card */}
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
              <span
                className={cn(
                  'tracking-wide transition-colors duration-300',
                  flashSection === 'timeline' ? statusColors.text : 'text-slate-800 dark:text-slate-100'
                )}
              >
                {t('leadership_schedule.timeline_title', { defaultValue: 'Các bước xử lý' })}
              </span>
            </div>
            <div className="flex flex-col relative pl-0.5">
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                const isDone = step.state === 'done';
                const isCurrent = step.state === 'current';
                const nextStep = steps[idx + 1];
                const isNextDoneOrCurrent = nextStep && (nextStep.state === 'done' || nextStep.state === 'current');

                const labelMap: Record<string, string> = {
                  draft: 'Lưu nháp',
                  created: 'Khởi tạo',
                  submitted: 'Đã gửi yêu cầu',
                  pending: 'Chờ phê duyệt',
                  approved: 'Đã phê duyệt',
                  rejected: 'Từ chối',
                  cancelled: 'Đã hủy',
                  completed: 'Hoàn thành',
                };
                const stepLabel = t(`leadership_schedule.timeline_${step.key}`, { defaultValue: labelMap[step.key] || step.key });

                return (
                  <div key={step.key} className="relative flex gap-3.5 pb-4 last:pb-0 group">
                    {/* Vertical Connector Line */}
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

                    {/* Step Icon Indicator */}
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

                    {/* Step Content */}
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
                      ) : isDone ? (
                        <div className="text-11 text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                          {t('leadership_schedule.detail_step_completed', { defaultValue: 'Đã hoàn thành' })}
                        </div>
                      ) : isCurrent ? (
                        <div className="text-11 text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                          {t('leadership_schedule.detail_step_current', { defaultValue: 'Đang xử lý' })}
                        </div>
                      ) : (
                        <div className="text-11 text-slate-400 dark:text-slate-500 mt-0.5 italic">
                          {t('leadership_schedule.detail_step_pending', { defaultValue: 'Chưa thực hiện' })}
                        </div>
                      )}
                      {step.key === 'rejected' && (
                        <div className="mt-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 px-2.5 py-2">
                          <div className="text-[10.5px] font-medium text-rose-700 dark:text-rose-300 mb-0.5">
                            {t('leadership_schedule.reject_reason_label', { defaultValue: 'Lý do từ chối' })}
                          </div>
                          <div className="text-11 text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {request.rejectReason || (
                              <span className="italic text-slate-400 dark:text-slate-500">
                                {t('leadership_schedule.reason_not_provided', { defaultValue: 'Không có lý do được cung cấp' })}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {step.key === 'cancelled' && (
                        <div className="mt-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 px-2.5 py-2">
                          <div className="text-11.5 font-medium text-slate-600 dark:text-slate-300">
                            {t('leadership_schedule.cancelled_reason_label', { defaultValue: 'Lý do' })}:
                          </div>
                          <div className="text-13 text-slate-600 dark:text-slate-300 leading-relaxed">
                            {request.cancelledReason || (
                              <span className="italic text-slate-400 dark:text-slate-500">
                                {t('leadership_schedule.reason_not_provided', { defaultValue: 'Không có lý do được cung cấp' })}
                              </span>
                            )}
                          </div>
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

      {((onCancel && CANCELLABLE.includes(request.status)) ||
        (onDelete && request.status === 'draft') ||
        (onResubmit && RESUBMITTABLE.includes(request.status)) ||
        (onApprove && request.status === 'pending') ||
        (onReject && request.status === 'pending')) && (
        <div className="flex justify-end items-center gap-2.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 [&>button]:min-w-[120px]">
          {onDelete && request.status === 'draft' && (
            <button
              type="button"
              onClick={() => onDelete(request)}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]"
            >
              <Trash2 size={14} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110" />
              <span>{t('leadership_schedule.action_delete', { defaultValue: 'Xóa nháp' })}</span>
            </button>
          )}
          {onCancel && CANCELLABLE.includes(request.status) && (
            <button
              type="button"
              onClick={() => onCancel(request)}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-slate-400 to-slate-500 hover:from-slate-500 hover:to-slate-600 shadow-[0_2px_8px_-2px_rgba(100,116,139,0.3)]"
            >
              <CalendarOff size={14} className="shrink-0 transition-transform duration-200 group-hover/btn:scale-110 group-hover/btn:-rotate-12" />
              <span>{t('leadership_schedule.action_cancel', { defaultValue: 'Hủy lịch' })}</span>
            </button>
          )}
          {onResubmit && RESUBMITTABLE.includes(request.status) && (
            <button
              type="button"
              onClick={() => onResubmit(request)}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-[#1A7FDB] to-[#0066C7] hover:from-[#0F72CF] hover:to-[#005AB0] shadow-[0_2px_8px_-2px_rgba(0,102,199,0.3)]"
            >
              <RotateCcw size={14} className="shrink-0 transition-transform duration-500 group-hover/btn:-rotate-180" />
              <span>{t('leadership_schedule.action_resubmit', { defaultValue: 'Đăng ký lại' })}</span>
            </button>
          )}
          {onReject && request.status === 'pending' && (
            <button
              type="button"
              onClick={() => onReject(request)}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-500 hover:to-rose-600 shadow-[0_2px_8px_-2px_rgba(244,63,94,0.3)]"
            >
              <CalendarX2 size={14} strokeWidth={2.5} className="transition-transform duration-200 group-hover/btn:scale-110" />
              <span>{t('schedule_approval.action_reject', { defaultValue: 'Từ chối' })}</span>
            </button>
          )}
          {onApprove && request.status === 'pending' && (
            <button
              type="button"
              onClick={() => onApprove(request)}
              className="group/btn relative inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full text-13.5 font-semibold text-white transition-all duration-200 ease-out cursor-pointer hover:brightness-110 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] shrink-0 select-none bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_2px_8px_-2px_rgba(5,150,105,0.3)]"
            >
              <CalendarCheck2 size={14} strokeWidth={2.5} className="transition-transform duration-200 group-hover/btn:scale-110" />
              <span>{t('schedule_approval.action_approve', { defaultValue: 'Duyệt' })}</span>
            </button>
          )}
        </div>
      )}

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
    </FormModal>
  );
};

export default LeadershipScheduleDetailModal;
