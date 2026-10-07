import type { AttachmentFile } from '../../../components/ui/FileAttachmentInput';
import type { ParticipationStatus } from '../../../constants/participationStatus';

export type MeetingFormat = 'offline' | 'online';
export type SchedulePriority = 'normal' | 'urgent';
export type ScheduleStatus = 'draft' | 'created' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ScheduleParticipant {
  id: string;
  name: string;
  email?: string | null;
  code?: string | null;
  department?: string | null;
  positionName?: string | null;
  jobTitleName?: string | null;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  status?: ParticipationStatus;
  rejectReason?: string | null;
}

export interface PersonalScheduleOwnerUser {
  id: string;
  fullname: string;
  email?: string | null;
  phoneNumber?: string | null;
  employeeCode?: string | null;
  departmentName?: string | null;
  positionName?: string | null;
  jobTitleName?: string | null;
  avatarUrl?: string | null;
}

export interface PersonalScheduleEvent {
  id: string;
  scheduleId: string;
  isGroupSchedule: boolean;
  code: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  scheduleTypeId: string;
  scheduleTypeName?: string;
  ownerUserId: string;
  ownerUser?: PersonalScheduleOwnerUser;
  meetingFormat: MeetingFormat;
  priority: SchedulePriority;
  status: ScheduleStatus;
  cancelledReason?: string;
  rejectReason?: string;
  participants: ScheduleParticipant[];
  content: string;
  note?: string;
  attachments: AttachmentFile[];
  link?: string;
  isSendEmail: boolean;
  isConfidential: boolean;
  isApprovalRequired: boolean;
  createdAt?: string;
}

export type PersonalScheduleInput = Omit<PersonalScheduleEvent, 'id' | 'scheduleId' | 'isGroupSchedule' | 'code' | 'createdAt' | 'ownerUserId'> & {
  isSingleDay?: boolean;
  isMultiDay?: boolean;
};
