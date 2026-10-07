import { baseAPI } from './baseAPI';
import type { MeetingType } from '../../constants/meetingType';
import type { SchedulePriority } from '../../constants/schedulePriority';
import type { ScheduleInvitationFilterStatus } from '../../constants/participationStatus';
import type { IScheduleOccurrenceListResponse, IApprovalByTokenResponse } from './scheduleOccurrenceAPI';

export interface IScheduleParticipantStatsParams {
  search?: string;
  StartDate?: string;
  EndDate?: string;
  ScheduleTypeId?: string;
  MeetingType?: MeetingType;
  Priority?: SchedulePriority;
  participantId?: string;
}

export interface IScheduleParticipantStats {
  total: number;
  waiting: number;
  accepted: number;
  rejected: number;
  cancelled: number;
}

export interface IScheduleParticipantListParams {
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
  participantId?: string;
  status?: ScheduleInvitationFilterStatus;
}

export interface IApproveScheduleParticipantsRequest {
  scheduleOccurrenceIds: string[];
  participantId: string;
}

export interface IRejectScheduleParticipantsRequest {
  scheduleOccurrenceIds: string[];
  participantId: string;
  rejectReason?: string;
}

export const scheduleParticipantAPI = {
  getScheduleParticipantStats: (params?: IScheduleParticipantStatsParams): Promise<IScheduleParticipantStats> =>
    baseAPI.get<IScheduleParticipantStats>('/ScheduleParticipants/stats', { params }),

  getScheduleParticipants: (params?: IScheduleParticipantListParams): Promise<IScheduleOccurrenceListResponse> =>
    baseAPI.get<IScheduleOccurrenceListResponse>('/ScheduleParticipants', { params }),

  approveScheduleParticipants: (payload: IApproveScheduleParticipantsRequest): Promise<boolean> =>
    baseAPI.post<boolean>('/ScheduleParticipants/approve', payload),

  rejectScheduleParticipants: (payload: IRejectScheduleParticipantsRequest): Promise<boolean> =>
    baseAPI.post<boolean>('/ScheduleParticipants/reject', payload),

  approveInvitationByToken: (token: string): Promise<IApprovalByTokenResponse> =>
    baseAPI.post<IApprovalByTokenResponse>('/ScheduleParticipants/invitation/approve-by-token', { token }),

  rejectInvitationByToken: (token: string, rejectReason?: string): Promise<IApprovalByTokenResponse> =>
    baseAPI.post<IApprovalByTokenResponse>('/ScheduleParticipants/invitation/reject-by-token', { token, rejectReason }),
};

export default scheduleParticipantAPI;
