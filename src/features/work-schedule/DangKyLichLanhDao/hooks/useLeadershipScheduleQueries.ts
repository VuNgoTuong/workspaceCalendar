import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../../../../store/authStore';
import { useActingLeaderStore } from '../../../../store/actingLeaderStore';
import { usePermission } from '../../../../hooks/usePermission';
import { ScheduleCategory } from '../../../../constants/scheduleCategory';
import { ScheduleCalendarType } from '../../../../constants/scheduleCalendarType';
import type { ScheduleOccurrenceStatus } from '../../../../constants/scheduleOccurrenceStatus';
import {
  scheduleOccurrenceAPI,
  getMonthDateRange,
  type IScheduleOccurrenceStats,
  type IScheduleOccurrenceListParams,
  type IScheduleOccurrenceStatsParams,
  type IScheduleOccurrenceCalendarItem,
} from '../../../../services/api/scheduleOccurrenceAPI';
import { mapOccurrenceToRequest, buildCreateLeadershipOccurrenceFormData, buildUpdateLeadershipOccurrenceFormData } from '../utils/occurrenceAdapter';
import type { AttachmentFile } from '../../../../components/ui/FileAttachmentInput';
import type { RequestParticipant, ScheduleRequest, MeetingFormat, SchedulePriority } from '../types';

const QUERY_KEY = ['leadership-schedule-requests'];

const ADMIN_ROLES = ['administrator', 'admin'];

/** The `UserId` filter sent to the list/stats endpoints — scoped to the effective user, except an
 *  Administrator who isn't currently acting as a specific leader gets no filter at all, so they see
 *  every user's leadership-registration requests instead of only their own. */
const useEffectiveUserIdFilter = () => {
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { hasRawRole } = usePermission();
  if (actingLeaderId) return actingLeaderId;
  return hasRawRole(ADMIN_ROLES) ? undefined : currentUserId;
};

export type LeadershipRequestsQueryParams = Omit<IScheduleOccurrenceListParams, 'ScheduleCategory'> & {
  status?: ScheduleOccurrenceStatus;
  enabled?: boolean;
};

export interface LeadershipSchedulePage {
  items: ScheduleRequest[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export const useLeadershipRequestsQuery = (params: LeadershipRequestsQueryParams = {}) => {
  const { status, PageNumber = 1, PageSize = 5, enabled = true, ...rest } = params as any;
  const userId = useEffectiveUserIdFilter();
  return useQuery<LeadershipSchedulePage>({
    queryKey: [...QUERY_KEY, { ...rest, status, PageNumber, PageSize, userId }],
    enabled,
    queryFn: async () => {
      const res = await scheduleOccurrenceAPI.getScheduleOccurrences({
        PageNumber,
        PageSize,
        SortBy: 'StartDate',
        IsAscending: false,
        ...rest,
        ScheduleCategory: ScheduleCategory.LeaderRegistration,
        Status: status,
        UserId: userId,
      });
      return {
        items: (res.items || []).map(mapOccurrenceToRequest),
        totalCount: res.totalCount || 0,
        pageNumber: res.pageNumber || PageNumber,
        pageSize: res.pageSize || PageSize,
        totalPages: res.totalPages || 1,
      };
    },
    placeholderData: keepPreviousData,
  });
};

export interface LeadershipScheduleCalendarGridQueryParams {
  year: number;
  month: number;
  enabled?: boolean;
  filterUserId?: string;
}

export const useLeadershipScheduleCalendarGridQuery = (params: LeadershipScheduleCalendarGridQueryParams) => {
  const { year, month, enabled = true, filterUserId } = params;
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { hasRawRole } = usePermission();
  const isAdmin = hasRawRole(ADMIN_ROLES);

  const operatingLeaderId = actingLeaderId || filterUserId || (isAdmin ? undefined : currentUserId);

  return useQuery<IScheduleOccurrenceCalendarItem[]>({
    queryKey: ['leadership-schedule-calendar-grid', { year, month, operatingLeaderId }],
    enabled,
    queryFn: () =>
      scheduleOccurrenceAPI.getScheduleOccurrencesCalendar({
        ...getMonthDateRange(year, month),
        operatingLeaderId,
        calendarTypes: [ScheduleCalendarType.LeaderRegistration],
        IsGetCalendarActive: false,
      }),
    placeholderData: keepPreviousData,
  });
};

const DETAIL_QUERY_KEY = ['leadership-schedule-detail'];

export const useLeadershipRequestDetailQuery = (id: string | null) => {
  return useQuery<ScheduleRequest | null>({
    queryKey: [...DETAIL_QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const res = await scheduleOccurrenceAPI.getScheduleOccurrenceById(id);
      return res ? mapOccurrenceToRequest(res) : null;
    },
    enabled: !!id,
  });
};

const STATS_QUERY_KEY = ['leadership-schedule-stats'];

export type LeadershipStatsQueryParams = Omit<IScheduleOccurrenceStatsParams, 'ScheduleCategory'>;

export const useLeadershipStatsQuery = (params: LeadershipStatsQueryParams = {}) => {
  const userId = useEffectiveUserIdFilter();
  return useQuery<IScheduleOccurrenceStats>({
    queryKey: [...STATS_QUERY_KEY, { ...params, userId }],
    queryFn: () =>
      scheduleOccurrenceAPI.getScheduleOccurrenceStats({ ...params, ScheduleCategory: ScheduleCategory.LeaderRegistration, UserId: userId }),
    placeholderData: keepPreviousData,
  });
};

export interface LeadershipRequestInput {
  executiveId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isSingleDay?: boolean;
  isMultiDay?: boolean;
  location: string;
  scheduleTypeId?: string;
  meetingFormat?: MeetingFormat;
  priority?: SchedulePriority;
  participants: RequestParticipant[];
  note?: string;
  attachments?: AttachmentFile[];
  link?: string;
  isConfidential?: boolean;
  isApprovalRequired?: boolean;
}

export const useCreateLeadershipRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, isDraft }: { input: LeadershipRequestInput; isDraft: boolean }) => {
      const ownerUserId = useActingLeaderStore.getState().actingLeader?.id || useAuthStore.getState().user?.id;
      const id = await scheduleOccurrenceAPI.createScheduleOccurrence(
        buildCreateLeadershipOccurrenceFormData(input, ownerUserId, isDraft)
      );
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DETAIL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
};

export const useUpdateLeadershipRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input, isDraft }: { id: string; input: LeadershipRequestInput; isDraft?: boolean }) => {
      const ownerUserId = useActingLeaderStore.getState().actingLeader?.id || useAuthStore.getState().user?.id;
      return scheduleOccurrenceAPI.updateScheduleOccurrence(
        id,
        buildUpdateLeadershipOccurrenceFormData(input, ownerUserId, isDraft)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DETAIL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
};

export const useCancelLeadershipRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      await scheduleOccurrenceAPI.cancelScheduleOccurrence(id, reason);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DETAIL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
};

export const useApproveLeadershipRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await scheduleOccurrenceAPI.approveScheduleOccurrences([id]);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DETAIL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
};

export const useRejectLeadershipRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await scheduleOccurrenceAPI.rejectScheduleOccurrences([id], reason);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DETAIL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
};

export const useDeleteLeadershipRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await scheduleOccurrenceAPI.deleteScheduleOccurrence(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DETAIL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
};

export const useDeleteLeadershipRequestGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      await scheduleOccurrenceAPI.deleteScheduleOccurrenceGroup(scheduleId);
      return scheduleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DETAIL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
};
