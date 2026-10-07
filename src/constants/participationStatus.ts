import type { BadgeVariant } from '../components/ui/Badge';
import { ScheduleOccurrenceStatus } from './scheduleOccurrenceStatus';

export const ParticipationStatus = {
  Waiting: 1,
  Accepted: 2,
  Reject: 3,
} as const;

export type ParticipationStatus = (typeof ParticipationStatus)[keyof typeof ParticipationStatus];

export const ScheduleInvitationFilterStatus = {
  Waiting: 1,
  Accepted: 2,
  Rejected: 3,
  Cancelled: 4,
} as const;

export type ScheduleInvitationFilterStatus = (typeof ScheduleInvitationFilterStatus)[keyof typeof ScheduleInvitationFilterStatus];

interface ParticipationStatusConfig {
  label: string;
  variant: BadgeVariant;
  color: string;
}

export const PARTICIPATION_STATUS_CONFIG: Record<ParticipationStatus, ParticipationStatusConfig> = {
  [ParticipationStatus.Waiting]: { label: 'Đang chờ', variant: 'warning', color: '#F59E0B' },
  [ParticipationStatus.Accepted]: { label: 'Đã xác nhận', variant: 'success', color: '#10B981' },
  [ParticipationStatus.Reject]: { label: 'Từ chối', variant: 'rose', color: '#ef4444' },
};

export const PARTICIPATION_STATUS_LABELS: Record<ParticipationStatus, string> = Object.fromEntries(
  Object.entries(PARTICIPATION_STATUS_CONFIG).map(([value, config]) => [value, config.label])
) as Record<ParticipationStatus, string>;

export const PARTICIPATION_STATUS_OPTIONS: { value: ParticipationStatus; label: string; variant: BadgeVariant; color: string }[] =
  Object.entries(PARTICIPATION_STATUS_CONFIG).map(([value, config]) => ({
    value: Number(value) as ParticipationStatus,
    ...config,
  }));

export const PARTICIPANT_STATUS_BADGE_KEY: Record<ParticipationStatus, string> = {
  [ParticipationStatus.Waiting]: 'pending',
  [ParticipationStatus.Accepted]: 'confirmed',
  [ParticipationStatus.Reject]: 'declined',
};

export const getParticipationStatusConfig = (status: ParticipationStatus): ParticipationStatusConfig =>
  PARTICIPATION_STATUS_CONFIG[status];

const OCCURRENCE_STATUS_BY_INVITATION_STATUS: Record<ScheduleInvitationFilterStatus, ScheduleOccurrenceStatus> = {
  [ScheduleInvitationFilterStatus.Waiting]: ScheduleOccurrenceStatus.Waiting,
  [ScheduleInvitationFilterStatus.Accepted]: ScheduleOccurrenceStatus.Approved,
  [ScheduleInvitationFilterStatus.Rejected]: ScheduleOccurrenceStatus.Rejected,
  [ScheduleInvitationFilterStatus.Cancelled]: ScheduleOccurrenceStatus.Cancelled,
};

export const resolveInvitationDisplayStatus = (
  status: ScheduleOccurrenceStatus,
  participantStatus?: ScheduleInvitationFilterStatus | null
): ScheduleOccurrenceStatus => {
  if (status === ScheduleOccurrenceStatus.Cancelled) return ScheduleOccurrenceStatus.Cancelled;
  if (participantStatus != null) return OCCURRENCE_STATUS_BY_INVITATION_STATUS[participantStatus] ?? status;
  return status;
};
