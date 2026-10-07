import dayjs from 'dayjs';
import { MeetingType } from '../../../../constants/meetingType';
import { SchedulePriority } from '../../../../constants/schedulePriority';
import { ScheduleOccurrenceStatus } from '../../../../constants/scheduleOccurrenceStatus';
import { ParticipationStatus } from '../../../../constants/participationStatus';
import type { IScheduleOccurrence } from '../../../../services/api/scheduleOccurrenceAPI';
import { fromApiDateTime } from '../../../../utils/dateTime';
import type {
  ApprovalParticipant,
  ApprovalRequest,
  ApprovalStatus,
  MeetingMode,
  ParticipantStatus,
  SchedulePriority as UiSchedulePriority,
} from '../types';

export const MEETING_MODE_BY_TYPE: Record<number, MeetingMode> = {
  [MeetingType.Offline]: 'offline',
  [MeetingType.Online]: 'online',
  [MeetingType.Other]: 'other',
};

export const MEETING_TYPE_BY_MODE: Record<MeetingMode, MeetingType> = {
  offline: MeetingType.Offline,
  online: MeetingType.Online,
  other: MeetingType.Other,
};

const PRIORITY_BY_VALUE: Record<number, UiSchedulePriority> = {
  [SchedulePriority.Normal]: 'normal',
  [SchedulePriority.Urgent]: 'urgent',
};

export const PRIORITY_VALUE_BY_UI: Record<UiSchedulePriority, SchedulePriority> = {
  normal: SchedulePriority.Normal,
  urgent: SchedulePriority.Urgent,
};

const STATUS_BY_VALUE: Record<number, ApprovalStatus> = {
  [ScheduleOccurrenceStatus.Waiting]: 'pending',
  [ScheduleOccurrenceStatus.Approved]: 'approved',
  [ScheduleOccurrenceStatus.Rejected]: 'rejected',
  [ScheduleOccurrenceStatus.Cancelled]: 'cancelled',
};

const PARTICIPANT_STATUS_BY_VALUE: Record<number, ParticipantStatus> = {
  [ParticipationStatus.Waiting]: 'pending',
  [ParticipationStatus.Accepted]: 'confirmed',
  [ParticipationStatus.Reject]: 'rejected',
};

export const mapOccurrenceToApprovalRequest = (dto: IScheduleOccurrence): ApprovalRequest => {
  const start = fromApiDateTime(dto.startDate);
  const end = fromApiDateTime(dto.endDate);
  const latestApproval = dto.approval ?? dto.approvals?.[0];

  const participants: Record<ParticipantStatus, ApprovalParticipant[]> = { confirmed: [], pending: [], rejected: [] };
  (dto.participants || []).forEach((p) => {
    const key = PARTICIPANT_STATUS_BY_VALUE[p.status] || 'pending';
    const user = p.participant;
    participants[key].push({
      id: p.participantId,
      code: p.employeeCodeSnapshot || user?.employeeCode || '',
      name: p.fullNameSnapshot || user?.fullname || user?.username || '',
      email: p.emailSnapshot || user?.email || '',
      department: p.departmentNameSnapshot || user?.departmentName || user?.unitName || user?.unitFullPathName || '',
      rejectReason: p.rejectReason || undefined,
    });
  });

  const owner = dto.ownerUser;
  const ownerName = owner?.fullname || owner?.username || '';
  const ownerDept = owner?.departmentName || owner?.unitName || owner?.positionName || owner?.jobTitleName || '';
  const rawContent = dto.detailContent || '';
  const cleanContent = rawContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

  return {
    id: dto.id,
    ticketNumber: dto.code || '',
    title: dto.title || '',
    content: cleanContent || undefined,
    date: start.format('YYYY-MM-DD'),
    startTime: start.format('HH:mm'),
    endTime: end.format('HH:mm'),
    meetingMode: MEETING_MODE_BY_TYPE[dto.meetingType] || 'offline',
    location: dto.location || '',
    priority: PRIORITY_BY_VALUE[dto.priority] || 'normal',
    status: STATUS_BY_VALUE[dto.status] || 'pending',
    rejectReason: dto.rejectReason || latestApproval?.rejectReason || undefined,
    scheduleTypeId: dto.scheduleTypeId || undefined,
    scheduleTypeName: dto.scheduleType?.name || (dto as any).scheduleTypeName || undefined,
    leaderId: dto.leaderUserId || undefined,
    requester: { id: dto.ownerUserId, name: ownerName, department: ownerDept, avatarUrl: owner?.avatarUrl || undefined },
    participants,
    decidedAt: latestApproval?.approvedAt ? fromApiDateTime(latestApproval.approvedAt).toISOString() : undefined,
  };
};

export const getDisplayApprovalStatus = (request: Pick<ApprovalRequest, 'status' | 'date' | 'endTime'>): ApprovalStatus | 'cancelled' => {
  if (request.status !== 'pending') return request.status;
  const end = dayjs(`${request.date} ${request.endTime}`, 'YYYY-MM-DD HH:mm');
  return end.isValid() && dayjs().isAfter(end) ? 'cancelled' : request.status;
};
