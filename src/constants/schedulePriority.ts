import type { BadgeVariant } from '../components/ui/Badge';

export const SchedulePriority = {
  Normal: 1,
  Urgent: 2,
} as const;

export type SchedulePriority = (typeof SchedulePriority)[keyof typeof SchedulePriority];

interface SchedulePriorityConfig {
  label: string;
  variant: BadgeVariant;
  color: string;
}

export const SCHEDULE_PRIORITY_CONFIG: Record<SchedulePriority, SchedulePriorityConfig> = {
  [SchedulePriority.Normal]: { label: 'Thường', variant: 'default', color: '#64748B' },
  [SchedulePriority.Urgent]: { label: 'Khẩn cấp', variant: 'error', color: '#ef4444' },
};

export const SCHEDULE_PRIORITY_OPTIONS: { value: SchedulePriority; label: string; variant: BadgeVariant; color: string }[] =
  Object.entries(SCHEDULE_PRIORITY_CONFIG).map(([value, config]) => ({
    value: Number(value) as SchedulePriority,
    ...config,
  }));

export const getSchedulePriorityConfig = (priority: SchedulePriority): SchedulePriorityConfig =>
  SCHEDULE_PRIORITY_CONFIG[priority];
