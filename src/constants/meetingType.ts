import type { BadgeVariant } from '../components/ui/Badge';

export const MeetingType = {
  Offline: 1,
  Online: 2,
  Other: 3,
} as const;

export type MeetingType = (typeof MeetingType)[keyof typeof MeetingType];

interface MeetingTypeConfig {
  label: string;
  variant: BadgeVariant;
  color: string;
}

export const MEETING_TYPE_CONFIG: Record<MeetingType, MeetingTypeConfig> = {
  [MeetingType.Offline]: { label: 'Trực tiếp', variant: 'blue', color: '#3B82F6' },
  [MeetingType.Online]: { label: 'Trực tuyến', variant: 'success', color: '#10B981' },
  [MeetingType.Other]: { label: 'Khác', variant: 'slate', color: '#64748B' },
};

export const MEETING_TYPE_OPTIONS: { value: MeetingType; label: string; variant: BadgeVariant; color: string }[] =
  Object.entries(MEETING_TYPE_CONFIG).map(([value, config]) => ({
    value: Number(value) as MeetingType,
    ...config,
  }));

export const getMeetingTypeConfig = (type: MeetingType): MeetingTypeConfig => MEETING_TYPE_CONFIG[type];
