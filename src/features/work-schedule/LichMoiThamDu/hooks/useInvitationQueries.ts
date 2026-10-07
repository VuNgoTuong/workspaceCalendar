import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { scheduleParticipantAPI } from '../../../../services/api/scheduleParticipantAPI';
import { scheduleOccurrenceAPI, getMonthDateRange } from '../../../../services/api/scheduleOccurrenceAPI';
import type {
  IScheduleParticipantListParams,
  IScheduleParticipantStats,
  IScheduleParticipantStatsParams,
} from '../../../../services/api/scheduleParticipantAPI';
import type { IScheduleOccurrenceCalendarItem } from '../../../../services/api/scheduleOccurrenceAPI';
import { ScheduleCalendarType } from '../../../../constants/scheduleCalendarType';
import { mapOccurrenceToInvitation } from '../utils/occurrenceAdapter';
import type { MeetingInvitation } from '../types';

export const INVITATIONS_QUERY_KEY = ['meeting-invitations'];
const QUERY_KEY = INVITATIONS_QUERY_KEY;
const STATS_QUERY_KEY = ['meeting-invitation-stats'];
const CALENDAR_QUERY_KEY = ['meeting-invitation-calendar-grid'];

export const useInvitationStatsQuery = (params: IScheduleParticipantStatsParams) => {
  return useQuery<IScheduleParticipantStats>({
    queryKey: [...STATS_QUERY_KEY, params],
    queryFn: () => scheduleParticipantAPI.getScheduleParticipantStats(params),
    placeholderData: keepPreviousData,
  });
};

export interface InvitationsPage {
  items: MeetingInvitation[];
  total: number;
}

export const useInvitationsQuery = (params: IScheduleParticipantListParams, options: { enabled?: boolean } = {}) => {
  return useQuery<InvitationsPage>({
    queryKey: [...QUERY_KEY, params],
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const res = await scheduleParticipantAPI.getScheduleParticipants(params);
      return {
        items: (res.items || []).map((dto) => mapOccurrenceToInvitation(dto, params.participantId)),
        total: res.totalCount,
      };
    },
    placeholderData: keepPreviousData,
  });
};

export interface InvitationCalendarGridQueryParams {
  year: number;
  month: number;
  operatingLeaderId?: string;
  enabled?: boolean;
}

export const useInvitationCalendarGridQuery = (params: InvitationCalendarGridQueryParams) => {
  const { year, month, operatingLeaderId, enabled = true } = params;
  return useQuery<IScheduleOccurrenceCalendarItem[]>({
    queryKey: [...CALENDAR_QUERY_KEY, { year, month, operatingLeaderId }],
    enabled,
    queryFn: () =>
      scheduleOccurrenceAPI.getScheduleOccurrencesCalendar({
        ...getMonthDateRange(year, month),
        operatingLeaderId,
        calendarTypes: [ScheduleCalendarType.Invitation],
        IsGetCalendarActive: true,
      }),
    placeholderData: keepPreviousData,
  });
};

export const useConfirmInvitationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, participantId }: { ids: string[]; participantId: string }) =>
      scheduleParticipantAPI.approveScheduleParticipants({ scheduleOccurrenceIds: ids, participantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['schedule-calendar-overview'] });
    },
    onError: () => {},
  });
};

export const useDeclineInvitationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, participantId, reason }: { ids: string[]; participantId: string; reason?: string }) =>
      scheduleParticipantAPI.rejectScheduleParticipants({ scheduleOccurrenceIds: ids, participantId, rejectReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CALENDAR_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['schedule-calendar-overview'] });
    },
    onError: () => {},
  });
};
