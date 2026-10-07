import dayjs from 'dayjs';
import { baseAPI } from './baseAPI';
import type { MeetingType } from '../../constants/meetingType';
import type { SchedulePriority } from '../../constants/schedulePriority';
import type { ScheduleCategory } from '../../constants/scheduleCategory';
import type { ScheduleOccurrenceStatus } from '../../constants/scheduleOccurrenceStatus';
import type { ScheduleCalendarType } from '../../constants/scheduleCalendarType';
import type { ScheduleInvitationFilterStatus } from '../../constants/participationStatus';

export interface IScheduleAttachment {
  id: string;
  scheduleOccurrenceId: string;
  type: number;
  path?: string | null;
  pathName?: string | null;
  name?: string | null;
}

export interface IScheduleOwnerUser {
  id: string;
  username?: string;
  email?: string;
  fullname?: string;
  employeeCode?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  unitName?: string | null;
  unitFullPathName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  jobTitleName?: string | null;
  positionName?: string | null;
}

export interface IScheduleTypeInfo {
  id: string;
  name: string;
  code?: string;
  isActive?: boolean;
}

export interface IScheduleParticipant {
  id: string;
  scheduleOccurrenceId: string;
  participantId: string;
  status: number;
  processedByUserId?: string | null;
  approvedAt?: string | null;
  rejectReason?: string | null;
  respondedAt?: string | null;
  employeeCodeSnapshot?: string | null;
  fullNameSnapshot?: string | null;
  emailSnapshot?: string | null;
  departmentNameSnapshot?: string | null;
  participant?: IScheduleOwnerUser | null;
}

export interface IScheduleApproval {
  id: string;
  scheduleOccurrenceId: string;
  approverUserId: string;
  processedByUserId?: string | null;
  approvedAt?: string | null;
  rejectReason?: string | null;
}

export interface IScheduleOccurrence {
  id: string;
  ownerUserId: string;
  code?: string | null;
  scheduleId: string;
  scheduleTypeId?: string | null;
  leaderUserId?: string | null;
  leaderUser?: IScheduleOwnerUser | null;
  startDate: string;
  endDate: string;
  createdAt?: string | null;
  title?: string | null;
  location?: string | null;
  meetingType: MeetingType;
  priority: SchedulePriority;
  detailContent?: string | null;
  note?: string | null;
  isSendEmail: boolean;
  isConfidential?: boolean;
  isApprovalRequired?: boolean;
  isGroupSchedule: boolean;
  /** ScheduleOccurrenceStatus */
  status: number;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancelledReason?: string | null;
  rejectReason?: string | null;
  attachments?: IScheduleAttachment[] | null;
  participants?: IScheduleParticipant[] | null;
  /** Backend returns a single approval record per occurrence. */
  approval?: IScheduleApproval | null;
  /** @deprecated Not returned by the API (kept for older/alternate response shapes); prefer `approval`. */
  approvals?: IScheduleApproval[] | null;
  ownerUser?: IScheduleOwnerUser | null;
  scheduleType?: IScheduleTypeInfo | null;
}

export interface IScheduleOccurrenceListParams {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  IsAscending?: boolean;
  search?: string;
  StartDate?: string;
  EndDate?: string;
  ScheduleTypeId?: string;
  MeetingType?: MeetingType;
  Priority?: SchedulePriority;
  ScheduleCategory?: ScheduleCategory;
  Status?: ScheduleOccurrenceStatus;
  UserId?: string;
  LeaderUserId?: string;
}

export interface IScheduleOccurrenceCalendarParams {
  startDate: string;
  endDate: string;
  operatingLeaderId?: string;
  calendarTypes?: ScheduleCalendarType[];
  IsGetCalendarActive: boolean;
}

export const toCalendarDateParam = (date: dayjs.Dayjs) => date.toISOString();

export const getMonthDateRange = (year: number, month: number) => {
  const start = dayjs(new Date(year, month - 1, 1));
  return { startDate: toCalendarDateParam(start.startOf('month')), endDate: toCalendarDateParam(start.endOf('month')) };
};

export interface IScheduleOccurrenceCalendarItem {
  id: string;
  calendarType: ScheduleCalendarType;
  code?: string | null;
  title?: string | null;
  startDate: string;
  endDate: string;
  location?: string | null;
  scheduleTypeId?: string | null;
  scheduleTypeName?: string | null;
  status: ScheduleOccurrenceStatus;
  participantStatus?: ScheduleInvitationFilterStatus | null;
  meetingType: MeetingType;
  priority: SchedulePriority;
}

export interface IScheduleOccurrenceStatsParams {
  search?: string;
  StartDate?: string;
  EndDate?: string;
  ScheduleTypeId?: string;
  MeetingType?: MeetingType;
  Priority?: SchedulePriority;
  ScheduleCategory?: ScheduleCategory;
  UserId?: string;
  LeaderUserId?: string;
}

export interface IScheduleOccurrenceStats {
  total: number;
  draft: number;
  created: number;
  waiting: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export interface IScheduleApprovalStatsParams {
  search?: string;
  StartDate?: string;
  EndDate?: string;
  ScheduleTypeId?: string;
  MeetingType?: MeetingType;
  Priority?: SchedulePriority;
  leaderId?: string;
}

export interface IScheduleApprovalListParams {
  PageNumber?: number;
  PageSize?: number;
  SortBy?: string;
  IsAscending?: boolean;
  search?: string;
  StartDate?: string;
  EndDate?: string;
  ScheduleTypeId?: string;
  MeetingType?: MeetingType;
  Priority?: SchedulePriority;
  leaderId?: string;
  status?: ScheduleOccurrenceStatus;
}

export interface ICheckAvailabilityRequest {
  userIds: string[];
  startDate: string;
  endDate: string;
  excludeScheduleOccurrenceId?: string;
  excludeScheduleId?: string;
}

export interface IAvailabilityTimeRange {
  startDate: string;
  endDate: string;
}

export interface IAvailabilityDay {
  date: string;
  busyTimes: IAvailabilityTimeRange[];
  freeTimes: IAvailabilityTimeRange[];
}

export interface IUserAvailability {
  userId: string;
  fullName: string;
  hasConflict: boolean;
  days: IAvailabilityDay[];
}

export interface IBusyCalendarParams {
  startDate: string;
  endDate: string;
  userIds: string[];
}

export interface IBusyCalendarOccurrence {
  scheduleOccurrenceId: string;
  code: string;
  startDate: string;
  endDate: string;
  isConfidential: boolean;
  canViewDetail: boolean;
  title: string;
  location: string;
  detailContent: string;
  scheduleCategory: number;
  status: ScheduleOccurrenceStatus;
}

export interface IBusyCalendarUser {
  userId: string;
  fullName: string;
  scheduleOccurrences: IBusyCalendarOccurrence[];
}

export interface IScheduleOccurrenceListResponse {
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  items: IScheduleOccurrence[];
}

export interface IApprovalByTokenResponse {
  isSuccess: boolean;
  message?: string | null;
  code?: string | null;
  processedAt?: string | null;
}

export const scheduleOccurrenceAPI = {
  getScheduleOccurrences: (params?: IScheduleOccurrenceListParams): Promise<IScheduleOccurrenceListResponse> =>
    baseAPI.get<IScheduleOccurrenceListResponse>('/ScheduleOccurrences', { params }),

  getScheduleOccurrenceById: (id: string): Promise<IScheduleOccurrence> =>
    baseAPI.get<IScheduleOccurrence>(`/ScheduleOccurrences/${id}`),

  getScheduleOccurrencesCalendar: (params: IScheduleOccurrenceCalendarParams): Promise<IScheduleOccurrenceCalendarItem[]> =>
    baseAPI.get<IScheduleOccurrenceCalendarItem[]>('/ScheduleOccurrences/calendar', { params }),

  createScheduleOccurrence: (formData: FormData): Promise<string> =>
    baseAPI.post<string>('/ScheduleOccurrences', formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
    }),

  updateScheduleOccurrence: (id: string, formData: FormData): Promise<IScheduleOccurrence> =>
    baseAPI.put<IScheduleOccurrence>(`/ScheduleOccurrences/${id}`, formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: (data) => data,
    }),

  deleteScheduleOccurrence: (id: string): Promise<void> => baseAPI.delete<void>(`/ScheduleOccurrences/${id}`),

  deleteScheduleOccurrenceGroup: (scheduleId: string): Promise<void> =>
    baseAPI.delete<void>(`/ScheduleOccurrences/group/${scheduleId}`),

  cancelScheduleOccurrence: (id: string, cancelledReason?: string): Promise<boolean> =>
    baseAPI.post<boolean>(`/ScheduleOccurrences/${id}/cancel`, { cancelledReason }),

  checkAvailability: (payload: ICheckAvailabilityRequest): Promise<IUserAvailability[]> =>
    baseAPI.post<IUserAvailability[]>('/ScheduleOccurrences/check-availability', payload),

  getBusyCalendar: (params: IBusyCalendarParams): Promise<IBusyCalendarUser[]> =>
    baseAPI.get<IBusyCalendarUser[]>('/ScheduleOccurrences/busy-calendar', { params }),

  getScheduleOccurrenceStats: (params?: IScheduleOccurrenceStatsParams): Promise<IScheduleOccurrenceStats> =>
    baseAPI.get<IScheduleOccurrenceStats>('/ScheduleOccurrences/stats', { params }),

  getScheduleApprovals: (params?: IScheduleApprovalListParams): Promise<IScheduleOccurrenceListResponse> =>
    baseAPI.get<IScheduleOccurrenceListResponse>('/ScheduleApprovals', { params }),

  getScheduleApprovalStats: (params?: IScheduleApprovalStatsParams): Promise<IScheduleOccurrenceStats> =>
    baseAPI.get<IScheduleOccurrenceStats>('/ScheduleApprovals/stats', { params }),

  approveScheduleOccurrences: (scheduleOccurrenceIds: string[]): Promise<boolean> =>
    baseAPI.post<boolean>('/ScheduleApprovals/approve', { scheduleOccurrenceIds }),

  rejectScheduleOccurrences: (scheduleOccurrenceIds: string[], rejectReason: string): Promise<boolean> =>
    baseAPI.post<boolean>('/ScheduleApprovals/reject', { scheduleOccurrenceIds, rejectReason }),

  approveScheduleByToken: (token: string): Promise<IApprovalByTokenResponse> =>
    baseAPI.post<IApprovalByTokenResponse>('/ScheduleApprovals/schedule/approve-by-token', { token }),

  rejectScheduleByToken: (token: string, rejectReason?: string): Promise<IApprovalByTokenResponse> =>
    baseAPI.post<IApprovalByTokenResponse>('/ScheduleApprovals/schedule/reject-by-token', { token, rejectReason }),

  downloadAttachmentStream: (id: string, attachmentId: string): Promise<Blob> =>
    baseAPI.get<Blob>(`/ScheduleOccurrences/${id}/attachments/${attachmentId}/stream`, {
      responseType: 'blob',
    }),
};

export const downloadScheduleAttachment = async (
  scheduleOccurrenceId: string,
  attachmentId: string,
  fileName?: string
): Promise<void> => {
  const blob = await scheduleOccurrenceAPI.downloadAttachmentStream(scheduleOccurrenceId, attachmentId);
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName || 'attachment';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
};

export default scheduleOccurrenceAPI;

