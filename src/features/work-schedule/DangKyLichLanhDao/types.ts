import type { AttachmentFile } from '../../../components/ui/FileAttachmentInput';
import type { ParticipationStatus } from '../../../constants/participationStatus';

export type RequestStatus =
  | 'submitted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'draft';

export interface RequestParticipant {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  code?: string | null;
  avatarUrl?: string | null;
  position?: string | null;
  department?: string | null;
  status?: ParticipationStatus;
  rejectReason?: string | null;
}

export interface RequestRequester {
  id: string;
  name: string;
  department?: string;
  code?: string;
  avatarUrl?: string;
  position?: string;
  email?: string;
  phone?: string;
}

export type TimelineStepKey =
  | 'created'
  | 'submitted'
  | 'pending'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'draft';

export interface RequestTimelineEntry {
  key: TimelineStepKey;
  at: string;
}

export type MeetingFormat = 'offline' | 'online';
export type SchedulePriority = 'urgent' | 'normal';

export interface ScheduleRequest {
  id: string;
  code: string;
  scheduleId: string;
  isGroupSchedule: boolean;
  executiveId: string;
  executiveName?: string;
  executiveTitle?: string;
  executiveAvatarUrl?: string;
  executiveCode?: string;
  executiveDepartment?: string;
  title: string;
  description?: string;
  durationMinutes: number;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  scheduleTypeId?: string;
  scheduleTypeName?: string;
  meetingFormat?: MeetingFormat;
  priority?: SchedulePriority;
  requester?: RequestRequester;
  participants: RequestParticipant[];
  note?: string;
  attachments?: AttachmentFile[];
  link?: string;
  isConfidential: boolean;
  isApprovalRequired: boolean;
  status: RequestStatus;
  cancelledReason?: string;
  rejectReason?: string;
  timeline: RequestTimelineEntry[];
}

export const DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;

export interface OptionItem<T extends string = string> {
  value: T;
  label: string;
}

type Translate = (key: string) => string;

export const getMeetingFormatOptions = (t: Translate): OptionItem<MeetingFormat | 'all'>[] => [
  { value: 'all', label: t('leadership_schedule.format_all') },
  { value: 'offline', label: t('leadership_schedule.format_offline') },
  { value: 'online', label: t('leadership_schedule.format_online') },
];

export const getPriorityOptions = (t: Translate): OptionItem<SchedulePriority | 'all'>[] => [
  { value: 'all', label: t('leadership_schedule.priority_all') },
  { value: 'urgent', label: t('leadership_schedule.priority_urgent') },
  { value: 'normal', label: t('leadership_schedule.priority_normal') },
];
