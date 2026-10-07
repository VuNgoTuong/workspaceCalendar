import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '../../../../store/authStore';
import { useActingLeaderStore } from '../../../../store/actingLeaderStore';
import { usePermission } from '../../../../hooks/usePermission';
import { ScheduleCategory } from '../../../../constants/scheduleCategory';
import { ScheduleCalendarType } from '../../../../constants/scheduleCalendarType';
import type { ScheduleOccurrenceStatus } from '../../../../constants/scheduleOccurrenceStatus';
import type { MeetingType } from '../../../../constants/meetingType';
import type { SchedulePriority } from '../../../../constants/schedulePriority';
import { scheduleOccurrenceAPI, getMonthDateRange, type IScheduleOccurrenceStats, type IScheduleOccurrenceCalendarItem } from '../../../../services/api/scheduleOccurrenceAPI';
import { mapOccurrenceToEvent, buildCreateOccurrenceFormData, buildUpdateOccurrenceFormData } from '../utils/occurrenceAdapter';
import type { PersonalScheduleEvent, PersonalScheduleInput } from '../types';

const QUERY_KEY = ['personal-schedule'];

const ADMIN_ROLES = ['administrator', 'admin'];

const useEffectiveUserIdFilter = (overrideUserId?: string) => {
  const actingLeaderId = useActingLeaderStore((s) => s.actingLeader?.id);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { hasRawRole } = usePermission();
  if (actingLeaderId) return actingLeaderId;
  if (overrideUserId) return overrideUserId;
  return hasRawRole(ADMIN_ROLES) ? undefined : currentUserId;
};

export interface PersonalScheduleTableQueryParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: ScheduleOccurrenceStatus;
  meetingType?: MeetingType;
  priority?: SchedulePriority;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
  filterUserId?: string;
}

export interface PersonalScheduleTablePage {
  items: PersonalScheduleEvent[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export const usePersonalScheduleTableQuery = (params: PersonalScheduleTableQueryParams = {}) => {
  const { search, startDate, endDate, status, meetingType, priority, page = 1, pageSize = 20, enabled = true, filterUserId } = params;
  const userId = useEffectiveUserIdFilter(filterUserId);
  return useQuery<PersonalScheduleTablePage>({
    queryKey: [...QUERY_KEY, 'table', { search, startDate, endDate, status, meetingType, priority, page, pageSize, userId }],
    enabled,
    queryFn: async () => {
      const res = await scheduleOccurrenceAPI.getScheduleOccurrences({
        ScheduleCategory: ScheduleCategory.Personal,
        UserId: userId,
        PageNumber: page,
        PageSize: pageSize,
        SortBy: 'StartDate',
        IsAscending: true,
        search: search || undefined,
        StartDate: startDate || undefined,
        EndDate: endDate || undefined,
        Status: status,
        MeetingType: meetingType,
        Priority: priority,
      });
      return {
        items: (res.items || []).map(mapOccurrenceToEvent),
        totalCount: res.totalCount,
        pageNumber: res.pageNumber,
        pageSize: res.pageSize,
        totalPages: res.totalPages,
      };
    },
    placeholderData: keepPreviousData,
  });
};

const CALENDAR_GRID_QUERY_KEY = ['personal-schedule', 'calendar-grid'];

export interface PersonalScheduleCalendarGridQueryParams {
  year: number;
  month: number;
  enabled?: boolean;
  filterUserId?: string;
}

export const usePersonalScheduleCalendarGridQuery = (params: PersonalScheduleCalendarGridQueryParams) => {
  const { year, month, enabled = true, filterUserId } = params;
  const operatingLeaderId = useEffectiveUserIdFilter(filterUserId);
  return useQuery<IScheduleOccurrenceCalendarItem[]>({
    queryKey: [...CALENDAR_GRID_QUERY_KEY, { year, month, operatingLeaderId }],
    enabled,
    queryFn: () =>
      scheduleOccurrenceAPI.getScheduleOccurrencesCalendar({
        ...getMonthDateRange(year, month),
        operatingLeaderId,
        calendarTypes: [ScheduleCalendarType.Personal],
        IsGetCalendarActive: false,
      }),
    placeholderData: keepPreviousData,
  });
};

export interface PersonalScheduleStatsQueryParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  meetingType?: MeetingType;
  priority?: SchedulePriority;
  /** Admin-only "user" filter — see `useEffectiveUserIdFilter`. */
  filterUserId?: string;
}

export const usePersonalScheduleStatsQuery = (params: PersonalScheduleStatsQueryParams = {}) => {
  const { search, startDate, endDate, meetingType, priority, filterUserId } = params;
  const userId = useEffectiveUserIdFilter(filterUserId);
  return useQuery<IScheduleOccurrenceStats>({
    queryKey: [...QUERY_KEY, 'stats', { search, startDate, endDate, meetingType, priority, userId }],
    queryFn: () =>
      scheduleOccurrenceAPI.getScheduleOccurrenceStats({
        ScheduleCategory: ScheduleCategory.Personal,
        UserId: userId,
        search: search || undefined,
        StartDate: startDate || undefined,
        EndDate: endDate || undefined,
        MeetingType: meetingType,
        Priority: priority,
      }),
    placeholderData: keepPreviousData,
  });
};

const DETAIL_QUERY_KEY = ['personal-schedule-detail'];

export const usePersonalScheduleDetailQuery = (id: string | undefined, enabled: boolean) => {
  return useQuery<PersonalScheduleEvent>({
    queryKey: [...DETAIL_QUERY_KEY, id],
    queryFn: async () => mapOccurrenceToEvent(await scheduleOccurrenceAPI.getScheduleOccurrenceById(id!)),
    enabled: enabled && !!id,
  });
};

export type { PersonalScheduleInput };

const invalidatePersonalScheduleQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: DETAIL_QUERY_KEY });
};

export const useCreatePersonalScheduleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, isDraft }: { input: PersonalScheduleInput; isDraft: boolean }) => {
      const ownerUserId = useActingLeaderStore.getState().actingLeader?.id || useAuthStore.getState().user?.id;
      return scheduleOccurrenceAPI.createScheduleOccurrence(
        buildCreateOccurrenceFormData(input, ownerUserId, ScheduleCategory.Personal, isDraft)
      );
    },
    onSuccess: () => invalidatePersonalScheduleQueries(queryClient),
  });
};

export const useUpdatePersonalScheduleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
      isDraft,
      isUpdateSingleDay,
    }: {
      id: string;
      data: PersonalScheduleInput;
      isDraft?: boolean;
      isUpdateSingleDay?: boolean;
    }) => {
      const ownerUserId = useActingLeaderStore.getState().actingLeader?.id || useAuthStore.getState().user?.id;
      return scheduleOccurrenceAPI.updateScheduleOccurrence(
        id,
        buildUpdateOccurrenceFormData(data, ownerUserId, isDraft, isUpdateSingleDay)
      );
    },
    onSuccess: () => invalidatePersonalScheduleQueries(queryClient),
  });
};

export const useDeletePersonalScheduleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduleOccurrenceAPI.deleteScheduleOccurrence(id),
    onSuccess: () => invalidatePersonalScheduleQueries(queryClient),
  });
};

export const useDeletePersonalScheduleGroupMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => scheduleOccurrenceAPI.deleteScheduleOccurrenceGroup(scheduleId),
    onSuccess: () => invalidatePersonalScheduleQueries(queryClient),
  });
};

export const useCancelPersonalScheduleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      scheduleOccurrenceAPI.cancelScheduleOccurrence(id, reason),
    onSuccess: () => invalidatePersonalScheduleQueries(queryClient),
  });
};

export const useApprovePersonalScheduleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scheduleOccurrenceAPI.approveScheduleOccurrences([id]),
    onSuccess: () => invalidatePersonalScheduleQueries(queryClient),
  });
};

export const useRejectPersonalScheduleMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      scheduleOccurrenceAPI.rejectScheduleOccurrences([id], reason),
    onSuccess: () => invalidatePersonalScheduleQueries(queryClient),
  });
};
