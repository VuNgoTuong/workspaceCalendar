export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type MeetingMode = 'offline' | 'online' | 'other';
export type SchedulePriority = 'normal' | 'urgent';
export type ParticipantStatus = 'confirmed' | 'pending' | 'rejected';

export interface ApprovalParticipant {
  id: string;
  code: string;
  name: string;
  email: string;
  department: string;
  rejectReason?: string;
}

export interface Requester {
  id: string;
  name: string;
  department: string;
  avatarUrl?: string;
}

export interface ApprovalRequest {
  id: string;
  /** The leader who must approve it (DTO `leaderUserId`). */
  leaderId?: string;
  ticketNumber: string;
  title: string;
  content?: string;
  /** YYYY-MM-DD */
  date: string;
  startTime: string;
  endTime: string;
  meetingMode: MeetingMode;
  location: string;
  priority: SchedulePriority;
  status: ApprovalStatus;
  rejectReason?: string;
  scheduleTypeId?: string;
  scheduleTypeName?: string;
  requester: Requester;
  participants: Record<ParticipantStatus, ApprovalParticipant[]>;
  decidedAt?: string;
}

export interface ApprovalFilters {
  dateRange: [string, string] | null;
  /** '/ScheduleTypes' id, or 'all' */
  scheduleTypeId: string;
  meetingMode: MeetingMode | 'all';
  priority: SchedulePriority | 'all';
  search: string;
}

export const EMPTY_FILTERS: ApprovalFilters = {
  dateRange: null,
  scheduleTypeId: 'all',
  meetingMode: 'all',
  priority: 'all',
  search: '',
};
