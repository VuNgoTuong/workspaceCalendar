import { MeetingType } from '../../../../constants/meetingType';
import { SchedulePriority } from '../../../../constants/schedulePriority';
import { ParticipationStatus } from '../../../../constants/participationStatus';
import { ScheduleOccurrenceStatus } from '../../../../constants/scheduleOccurrenceStatus';
import type { IScheduleOccurrence } from '../../../../services/api/scheduleOccurrenceAPI';
import { fromApiDateTime } from '../../../../utils/dateTime';
import type {
  InvitationParticipant,
  InvitationStatus,
  MeetingInvitation,
  MeetingMode,
  ParticipantStatus,
  SchedulePriority as UiSchedulePriority,
} from '../types';

const MEETING_MODE_BY_TYPE: Record<number, MeetingMode> = {
  [MeetingType.Offline]: 'offline',
  [MeetingType.Online]: 'online',
  [MeetingType.Other]: 'other',
};

const PRIORITY_BY_VALUE: Record<number, UiSchedulePriority> = {
  [SchedulePriority.Normal]: 'normal',
  [SchedulePriority.Urgent]: 'urgent',
};

const MY_STATUS_BY_VALUE: Record<number, InvitationStatus> = {
  [ParticipationStatus.Waiting]: 'pending',
  [ParticipationStatus.Accepted]: 'confirmed',
  [ParticipationStatus.Reject]: 'declined',
};

const PARTICIPANT_BUCKET_BY_VALUE: Record<number, ParticipantStatus> = {
  [ParticipationStatus.Waiting]: 'pending',
  [ParticipationStatus.Accepted]: 'confirmed',
  [ParticipationStatus.Reject]: 'declined',
};

export const mapOccurrenceToInvitation = (dto: IScheduleOccurrence, leaderId?: string | null): MeetingInvitation => {
  const start = fromApiDateTime(dto.startDate);
  const end = fromApiDateTime(dto.endDate);
  const mine = (dto.participants || []).find((p) => p.participantId === leaderId);

  const participants: Record<ParticipantStatus, InvitationParticipant[]> = { confirmed: [], pending: [], declined: [] };
  (dto.participants || []).forEach((p) => {
    const key = PARTICIPANT_BUCKET_BY_VALUE[p.status] || 'pending';
    const user = p.participant;
    participants[key].push({
      id: p.participantId,
      code: p.employeeCodeSnapshot || user?.employeeCode || '',
      name: p.fullNameSnapshot || user?.fullname || user?.username || '',
      email: p.emailSnapshot || user?.email || '',
      department: p.departmentNameSnapshot || user?.departmentName || user?.unitName || user?.unitFullPathName || '',
      position: user?.positionName || user?.jobTitleName || '',
      avatarUrl: user?.avatarUrl || '',
      phoneNumber: user?.phoneNumber || '',
      rejectReason: p.rejectReason || (p as any).declineReason || (p as any).reason || null,
    });
  });

  const owner = dto.ownerUser;

  const isCancelled = dto.status === ScheduleOccurrenceStatus.Cancelled;

  const aggregateStatus: InvitationStatus =
    participants.pending.length > 0 ? 'pending' : participants.declined.length > 0 ? 'declined' : 'confirmed';

  return {
    id: dto.id,
    ticketNumber: dto.code || '',
    title: dto.title || '',
    content: dto.detailContent || undefined,
    note: dto.note || undefined,
    date: start.format('YYYY-MM-DD'),
    startTime: start.format('HH:mm'),
    endTime: end.format('HH:mm'),
    createdAt: dto.createdAt ? fromApiDateTime(dto.createdAt).toISOString() : undefined,
    meetingType: dto.scheduleType?.code || '',
    scheduleTypeId: dto.scheduleTypeId || dto.scheduleType?.id || undefined,
    scheduleTypeName: dto.scheduleType?.name || '',
    meetingMode: MEETING_MODE_BY_TYPE[dto.meetingType] || 'offline',
    location: dto.location || '',
    priority: PRIORITY_BY_VALUE[dto.priority] || 'normal',
    isSendEmail: dto.isSendEmail,
    myStatus: isCancelled ? 'cancelled' : mine ? MY_STATUS_BY_VALUE[mine.status] || 'pending' : aggregateStatus,
    isViewerParticipant: !!mine,
    declineReason: mine?.rejectReason || undefined,
    cancelledAt: dto.cancelledAt ? fromApiDateTime(dto.cancelledAt).toISOString() : undefined,
    cancelledReason: dto.cancelledReason || undefined,
    organizer: {
      id: dto.ownerUserId,
      name: owner?.fullname || '',
      department: owner?.departmentName || '',
      code: owner?.employeeCode || '',
      position: owner?.positionName || owner?.jobTitleName || '',
      avatarUrl: owner?.avatarUrl || '',
      email: owner?.email || '',
      phone: owner?.phoneNumber || '',
    },
    ownerUser: owner
      ? {
          id: owner.id,
          fullname: owner.fullname || '',
          employeeCode: owner.employeeCode,
          avatarUrl: owner.avatarUrl,
          email: owner.email,
          phoneNumber: owner.phoneNumber,
          departmentName: owner.departmentName || undefined,
          positionName: owner.positionName || undefined,
          jobTitleName: owner.jobTitleName || undefined,
        }
      : undefined,
    approval: (() => {
      const a = dto.approval ?? dto.approvals?.[0];
      return a
        ? {
            approvedAt: a.approvedAt ? fromApiDateTime(a.approvedAt).toISOString() : undefined,
            rejectReason: a.rejectReason || undefined,
            approverUserId: a.approverUserId,
          }
        : undefined;
    })(),
    participants,
    respondedAt: mine?.respondedAt ? fromApiDateTime(mine.respondedAt).toISOString() : undefined,
  };
};
