export type InvitationStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';
export type MeetingMode = 'offline' | 'online' | 'other';
export type SchedulePriority = 'normal' | 'urgent';
export type ParticipantStatus = 'confirmed' | 'pending' | 'declined';

export interface InvitationParticipant {
  id: string;
  code: string;
  name: string;
  email: string;
  department: string;
  position?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  rejectReason?: string | null;
}

export interface Organizer {
  id: string;
  name: string;
  department: string;
  code?: string;
  position?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
}

export interface OwnerUserInfo {
  id: string;
  fullname: string;
  employeeCode?: string;
  avatarUrl?: string;
  email?: string;
  phoneNumber?: string;
  departmentName?: string;
  positionName?: string;
  jobTitleName?: string;
}

export interface ScheduleApprovalInfo {
  approvedAt?: string;
  rejectReason?: string;
  approverUserId?: string;
  processedByUserId?: string;
}

export interface MeetingTypeOption {
  value: string;
  label: string;
}

export const getMeetingTypeOptions = (t: (key: string) => string): MeetingTypeOption[] => [
  { value: 'meeting', label: t('meeting_invitations.type_meeting') },
  { value: 'work', label: t('meeting_invitations.type_work') },
  { value: 'training', label: t('meeting_invitations.type_training') },
  { value: 'discussion', label: t('meeting_invitations.type_discussion') },
  { value: 'other', label: t('meeting_invitations.type_other') },
];

export interface MeetingInvitation {
  id: string;
  ticketNumber: string;
  title: string;
  content?: string;
  note?: string;
  /** YYYY-MM-DD */
  date: string;
  startTime: string;
  endTime: string;
  createdAt?: string;
  meetingType: string;
  scheduleTypeId?: string;
  scheduleTypeName?: string;
  meetingMode: MeetingMode;
  meetingModeOther?: string;
  location: string;
  priority: SchedulePriority;
  isSendEmail?: boolean;
  myStatus: InvitationStatus;
  isViewerParticipant: boolean;
  declineReason?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  organizer: Organizer;
  ownerUser?: OwnerUserInfo;
  approval?: ScheduleApprovalInfo;
  participants: Record<ParticipantStatus, InvitationParticipant[]>;
  respondedAt?: string;
}

export interface InvitationFilters {
  dateRange: [string, string] | null;
  meetingType: string;
  meetingMode: MeetingMode | 'all';
  priority: SchedulePriority | 'all';
  search: string;
}

export const EMPTY_INVITATION_FILTERS: InvitationFilters = {
  dateRange: null,
  meetingType: 'all',
  meetingMode: 'all',
  priority: 'all',
  search: '',
};

