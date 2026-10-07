import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CheckCircle2, Clock, FileEdit, AlertCircle, AlertTriangle, ShieldCheck, CalendarOff, CalendarX2, X, Flag } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { Badge, type BadgeVariant, type BadgeSize } from './Badge';
import { ScheduleOccurrenceStatus, SCHEDULE_OCCURRENCE_STATUS_CONFIG } from '../../constants/scheduleOccurrenceStatus';

export type StatusType =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'draft'
  | 'alternative_proposed'
  | 'active'
  | 'inactive'
  | 'upcoming'
  | 'expired'
  | 'revoked'
  | 'confirmed'
  | 'declined'
  | 'created'
  | 'urgent'
  | 'high'
  | 'normal'
  | 'low'
  | string;

export interface StatusBadgeProps {
  value?: string;
  status?: StatusType;
  priority?: StatusType;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

interface StatusConfig {
  i18nKey: string;
  defaultLabel: string;
  variant: BadgeVariant;
  defaultIcon?: React.ReactNode;
}

const getIcon = (iconType: string, size: number) => {
  switch (iconType) {
    case 'check':
      return <CheckCircle2 size={size} />;
    case 'check-solid':
      return (
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#10B981] dark:bg-[#10B981]"
          style={{ width: size, height: size }}
        >
          <Check size={Math.round(size * 0.65)} strokeWidth={3} className="text-white" />
        </span>
      );
    case 'check-solid-blue':
      return (
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#0284C7] dark:bg-[#0284C7]"
          style={{ width: size, height: size }}
        >
          <Check size={Math.round(size * 0.65)} strokeWidth={3} className="text-white" />
        </span>
      );
    case 'clock':
      return <Clock size={size} />;
    case 'cancel':
      return <X size={size} strokeWidth={2.5} />;
    case 'calendar-off':
      return <CalendarOff size={size} />;
    case 'calendar-x':
      return <CalendarX2 size={size} />;
    case 'edit':
      return <FileEdit size={size} />;
    case 'urgent':
      return <AlertCircle size={size} />;
    case 'warning':
      return <AlertTriangle size={size} />;
    case 'active':
      return <ShieldCheck size={size} />;
    case 'flag':
      return <Flag size={size} className="fill-current" />;
    default:
      return null;
  }
};

const STATUS_CONFIG_MAP: Record<string, StatusConfig> = {
  pending: { i18nKey: 'status.pending', defaultLabel: 'Chờ duyệt', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Waiting].variant, defaultIcon: getIcon('clock', 13) },
  submitted: { i18nKey: 'status.submitted', defaultLabel: 'Đã gửi', variant: 'blue', defaultIcon: getIcon('clock', 13) },
  approved: { i18nKey: 'status.approved', defaultLabel: 'Đã duyệt', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Approved].variant, defaultIcon: getIcon('check-solid', 13) },
  completed: { i18nKey: 'status.completed', defaultLabel: 'Hoàn thành', variant: 'slate', defaultIcon: getIcon('check', 13) },
  rejected: { i18nKey: 'status.rejected', defaultLabel: 'Từ chối', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Rejected].variant, defaultIcon: getIcon('calendar-x', 13) },
  cancelled: { i18nKey: 'status.cancelled', defaultLabel: 'Đã hủy', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Cancelled].variant, defaultIcon: getIcon('calendar-off', 13) },
  draft: { i18nKey: 'status.draft', defaultLabel: 'Nháp', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Draft].variant, defaultIcon: getIcon('edit', 13) },
  created: { i18nKey: 'status.created', defaultLabel: 'Đã tạo', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Created].variant, defaultIcon: getIcon('check-solid-blue', 13) },
  [ScheduleOccurrenceStatus.Draft]: { i18nKey: 'status.draft', defaultLabel: 'Nháp', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Draft].variant, defaultIcon: getIcon('edit', 13) },
  [ScheduleOccurrenceStatus.Created]: { i18nKey: 'status.created', defaultLabel: 'Đã tạo', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Created].variant, defaultIcon: getIcon('check-solid-blue', 13) },
  [ScheduleOccurrenceStatus.Waiting]: { i18nKey: 'status.pending', defaultLabel: 'Chờ duyệt', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Waiting].variant, defaultIcon: getIcon('clock', 13) },
  [ScheduleOccurrenceStatus.Approved]: { i18nKey: 'status.approved', defaultLabel: 'Đã duyệt', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Approved].variant, defaultIcon: getIcon('check-solid', 13) },
  [ScheduleOccurrenceStatus.Rejected]: { i18nKey: 'status.rejected', defaultLabel: 'Từ chối', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Rejected].variant, defaultIcon: getIcon('calendar-x', 13) },
  [ScheduleOccurrenceStatus.Cancelled]: { i18nKey: 'status.cancelled', defaultLabel: 'Đã hủy', variant: SCHEDULE_OCCURRENCE_STATUS_CONFIG[ScheduleOccurrenceStatus.Cancelled].variant, defaultIcon: getIcon('calendar-off', 13) },
  alternative_proposed: { i18nKey: 'status.alternative_proposed', defaultLabel: 'Đề xuất giờ khác', variant: 'violet', defaultIcon: getIcon('clock', 13) },
  active: { i18nKey: 'status.active', defaultLabel: 'Đang hoạt động', variant: 'success', defaultIcon: getIcon('active', 13) },
  inactive: { i18nKey: 'status.inactive', defaultLabel: 'Ngưng hoạt động', variant: 'error', defaultIcon: getIcon('cancel', 13) },
  upcoming: { i18nKey: 'status.upcoming', defaultLabel: 'Sắp hết hạn', variant: 'info', defaultIcon: getIcon('clock', 13) },
  expired: { i18nKey: 'status.expired', defaultLabel: 'Đã hết hạn', variant: 'warning', defaultIcon: getIcon('clock', 13) },
  revoked: { i18nKey: 'status.revoked', defaultLabel: 'Đã thu hồi', variant: 'rose', defaultIcon: getIcon('cancel', 13) },
  confirmed: { i18nKey: 'status.confirmed', defaultLabel: 'Đã tham gia', variant: 'success', defaultIcon: getIcon('check-solid', 13) },
  declined: { i18nKey: 'status.declined', defaultLabel: 'Từ chối', variant: 'error', defaultIcon: getIcon('calendar-x', 13) },

  // Priority
  urgent: { i18nKey: 'priority.urgent', defaultLabel: 'Khẩn cấp', variant: 'rose', defaultIcon: getIcon('flag', 11) },
  high: { i18nKey: 'priority.high', defaultLabel: 'Ưu tiên cao', variant: 'amber', defaultIcon: getIcon('flag', 11) },
  normal: { i18nKey: 'priority.normal', defaultLabel: 'Thường', variant: 'blue', defaultIcon: getIcon('flag', 11) },
  low: { i18nKey: 'priority.low', defaultLabel: 'Thấp', variant: 'slate' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  value,
  status,
  priority,
  variant,
  size = 'md',
  icon,
  className,
  children,
}) => {
  const { t } = useTranslation();

  const targetKey = (status || priority || value || '').toString().toLowerCase().trim();
  const matchedConfig = STATUS_CONFIG_MAP[targetKey];

  const finalVariant = variant || matchedConfig?.variant || 'default';

  let textContent = children || value;
  if (!textContent && matchedConfig) {
    textContent = t(matchedConfig.i18nKey, { defaultValue: matchedConfig.defaultLabel });
  } else if (!textContent) {
    textContent = (status || priority || '').toString();
  }

  const finalIcon = icon !== undefined ? icon : matchedConfig?.defaultIcon;

  return (
    <Badge
      variant={finalVariant}
      size={size}
      icon={finalIcon}
      className={cn('px-2.5 min-w-[76px] w-auto justify-center', className)}
    >
      {textContent}
    </Badge>
  );
};

export default StatusBadge;
