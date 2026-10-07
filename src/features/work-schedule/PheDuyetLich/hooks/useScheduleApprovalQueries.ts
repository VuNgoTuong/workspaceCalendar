import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../../../../store/authStore';
import { useActingLeaderStore } from '../../../../store/actingLeaderStore';
import { scheduleOccurrenceAPI, getMonthDateRange } from '../../../../services/api/scheduleOccurrenceAPI';
import { ScheduleCalendarType } from '../../../../constants/scheduleCalendarType';
import type {
  IScheduleApprovalListParams,
  IScheduleApprovalStatsParams,
  IScheduleOccurrenceStats,
  IScheduleOccurrenceCalendarItem,
} from '../../../../services/api/scheduleOccurrenceAPI';
import { mapOccurrenceToApprovalRequest } from '../utils/occurrenceAdapter';
import { mapOccurrenceToRequest } from '../../DangKyLichLanhDao/utils/occurrenceAdapter';
import type { ApprovalRequest } from '../types';
import type { ScheduleRequest } from '../../DangKyLichLanhDao/types';

const STATS_QUERY_KEY = ['schedule-approval-stats'];
export const APPROVALS_QUERY_KEY = ['schedule-approvals'];

export const useApprovalLeaderId = () => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  return actingLeaderId || currentUserId;
};

export const useApprovalStatsQuery = (params: IScheduleApprovalStatsParams) => {
  return useQuery<IScheduleOccurrenceStats>({
    queryKey: [...STATS_QUERY_KEY, params],
    queryFn: () => scheduleOccurrenceAPI.getScheduleApprovalStats(params),
    placeholderData: keepPreviousData,
  });
};

export interface ApprovalRequestsPage {
  items: ApprovalRequest[];
  requests: ScheduleRequest[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export const useApprovalRequestsQuery = (params: IScheduleApprovalListParams, options: { enabled?: boolean } = {}) => {
  return useQuery<ApprovalRequestsPage>({
    queryKey: [...APPROVALS_QUERY_KEY, params],
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await scheduleOccurrenceAPI.getScheduleApprovals(params);
      return {
        items: (res.items || []).map(mapOccurrenceToApprovalRequest),
        requests: (res.items || []).map(mapOccurrenceToRequest),
        totalCount: res.totalCount,
        pageNumber: res.pageNumber,
        pageSize: res.pageSize,
      };
    },
    placeholderData: keepPreviousData,
  });
};

export interface ApprovalCalendarGridQueryParams {
  year: number;
  month: number;
  operatingLeaderId?: string;
  enabled?: boolean;
}

const CALENDAR_QUERY_KEY = ['schedule-approval-calendar-grid'];

export const useApprovalCalendarGridQuery = (params: ApprovalCalendarGridQueryParams) => {
  const { year, month, operatingLeaderId, enabled = true } = params;
  return useQuery<IScheduleOccurrenceCalendarItem[]>({
    queryKey: [...CALENDAR_QUERY_KEY, { year, month, operatingLeaderId }],
    enabled,
    queryFn: () =>
      scheduleOccurrenceAPI.getScheduleOccurrencesCalendar({
        ...getMonthDateRange(year, month),
        operatingLeaderId,
        calendarTypes: [ScheduleCalendarType.LeaderApproval],
        IsGetCalendarActive: true,
      }),
    placeholderData: keepPreviousData,
  });
};

export const useApproveRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => scheduleOccurrenceAPI.approveScheduleOccurrences(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
};

export const useRejectRequestMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason: string }) =>
      scheduleOccurrenceAPI.rejectScheduleOccurrences(ids, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
};

export const useCancelApprovalMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => scheduleOccurrenceAPI.cancelScheduleOccurrence(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVALS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
    },
  });
};
