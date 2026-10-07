import type { BadgeVariant } from '../components/ui/Badge';

export const ScheduleOccurrenceStatus = {
  Draft: 1,
  Created: 2,
  Waiting: 3,
  Approved: 4,
  Rejected: 5,
  Cancelled: 6,
} as const;

export type ScheduleOccurrenceStatus = (typeof ScheduleOccurrenceStatus)[keyof typeof ScheduleOccurrenceStatus];

interface ScheduleOccurrenceStatusConfig {
  label: string;
  variant: BadgeVariant;
  color: string;
}

export const SCHEDULE_OCCURRENCE_STATUS_CONFIG: Record<ScheduleOccurrenceStatus, ScheduleOccurrenceStatusConfig> = {
  [ScheduleOccurrenceStatus.Draft]: { label: 'Nháp', variant: 'slate', color: '#64748B' },
  [ScheduleOccurrenceStatus.Created]: { label: 'Đã tạo', variant: 'sky', color: '#0284C7' },
  [ScheduleOccurrenceStatus.Waiting]: { label: 'Chờ duyệt', variant: 'warning', color: '#D97706' },
  [ScheduleOccurrenceStatus.Approved]: { label: 'Đã duyệt', variant: 'success', color: '#10B981' },
  [ScheduleOccurrenceStatus.Rejected]: { label: 'Đã từ chối', variant: 'rose', color: '#ef4444' },
  [ScheduleOccurrenceStatus.Cancelled]: { label: 'Đã hủy', variant: 'neutral', color: '#94A3B8' },
};

interface ScheduleOccurrenceEventTheme {
  text: string;
  bg: string;
  border: string;
}

export const SCHEDULE_OCCURRENCE_EVENT_THEME: Record<ScheduleOccurrenceStatus, ScheduleOccurrenceEventTheme> = {
  [ScheduleOccurrenceStatus.Draft]: {
    text: 'text-[#64748B] dark:text-[#94A3B8]',
    bg: 'bg-[#F8FAFC] dark:bg-[rgba(100,116,139,0.15)]',
    border: 'border-[#E2E8F0] dark:border-[rgba(100,116,139,0.3)]',
  },
  [ScheduleOccurrenceStatus.Created]: {
    text: 'text-[#0284C7] dark:text-[#38BDF8]',
    bg: 'bg-[#F0F9FF] dark:bg-[rgba(2,132,199,0.15)]',
    border: 'border-[#BAE6FD] dark:border-[rgba(2,132,199,0.3)]',
  },
  [ScheduleOccurrenceStatus.Waiting]: {
    text: 'text-[#D97706] dark:text-[#FBBF24]',
    bg: 'bg-[#FFFBEB] dark:bg-[rgba(217,119,6,0.15)]',
    border: 'border-[#FDE68A] dark:border-[rgba(217,119,6,0.3)]',
  },
  [ScheduleOccurrenceStatus.Approved]: {
    text: 'text-[#10B981] dark:text-[#34D399]',
    bg: 'bg-[#ECFDF5] dark:bg-[rgba(16,185,129,0.15)]',
    border: 'border-[#A7F3D0] dark:border-[rgba(16,185,129,0.3)]',
  },
  [ScheduleOccurrenceStatus.Rejected]: {
    text: 'text-[#ef4444] dark:text-[#fca5a5]',
    bg: 'bg-[#fef2f2] dark:bg-[rgba(239,68,68,0.15)]',
    border: 'border-[#FECACA] dark:border-[rgba(239,68,68,0.3)]',
  },
  [ScheduleOccurrenceStatus.Cancelled]: {
    text: 'text-[#64748B] dark:text-[#94A3B8]',
    bg: 'bg-[#F1F5F9] dark:bg-[rgba(148,163,184,0.15)]',
    border: 'border-[#E2E8F0] dark:border-[rgba(148,163,184,0.3)]',
  },
};

/** Neutral theme for confidential events the viewer isn't allowed to see the details of. */
export const MASKED_SCHEDULE_EVENT_THEME: ScheduleOccurrenceEventTheme = {
  text: 'text-[#64748B] dark:text-slate-400',
  bg: 'bg-[#F6F8FA] dark:bg-slate-800/70',
  border: 'border-[#E6EBF1] dark:border-slate-700',
};

export const SCHEDULE_OCCURRENCE_STATUS_LABELS: Record<ScheduleOccurrenceStatus, string> = Object.fromEntries(
  Object.entries(SCHEDULE_OCCURRENCE_STATUS_CONFIG).map(([value, config]) => [value, config.label])
) as Record<ScheduleOccurrenceStatus, string>;

export const SCHEDULE_OCCURRENCE_STATUS_OPTIONS: { value: ScheduleOccurrenceStatus; label: string; variant: BadgeVariant; color: string }[] =
  Object.entries(SCHEDULE_OCCURRENCE_STATUS_CONFIG).map(([value, config]) => ({
    value: Number(value) as ScheduleOccurrenceStatus,
    ...config,
  }));

export const getScheduleOccurrenceStatusConfig = (status: ScheduleOccurrenceStatus): ScheduleOccurrenceStatusConfig =>
  SCHEDULE_OCCURRENCE_STATUS_CONFIG[status];
